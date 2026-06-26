'use strict';

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../frontend/.env') });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { rateLimit } = require('express-rate-limit');
const fabricGateway = require('./services/fabricGateway');
const auditRoutes = require('./routes/audit');
const adminRoutes = require('./routes/admin');
const keepAlive = require('./services/keepAlive');
const logger = require('./services/logger');

const app = express();
const PORT = process.env.PORT || 3001;

// ── Rate Limit Store: Soporte Opcional para Redis (Listo para Producción) ─────
let rateLimitStore;
if (process.env.REDIS_URL) {
    try {
        const { RedisStore } = require('rate-limit-redis');
        const { createClient } = require('redis');
        const redisClient = createClient({ url: process.env.REDIS_URL });
        
        redisClient.connect().catch(err => {
            logger.error('Error de conexión a Redis para Rate Limiting distribuido:', { error: err.message });
        });

        rateLimitStore = new RedisStore({
            sendCommand: (...args) => redisClient.sendCommand(args)
        });
        logger.info('Rate limiting configurado con almacenamiento centralizado (Redis)');
    } catch (err) {
        logger.warn('No se pudo inicializar el almacenamiento de Redis. Usando almacenamiento en memoria local:', { error: err.message });
    }
}
// ──────────────────────────────────────────────────────────────────────────────

// ── Rate Limiters ──────────────────────────────────────────────────────────────
// Escrituras: máximo 60 sellos por minuto por IP (operaciones críticas)
const writeRateLimiter = rateLimit({
    windowMs: 60 * 1000,           // Ventana de 1 minuto
    limit: 60,                     // Máximo 60 peticiones por ventana
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    store: rateLimitStore,
    message: { error: 'Demasiadas peticiones de escritura. Intente nuevamente en un minuto.' }
});

// Lecturas: máximo 200 consultas por minuto por IP (operaciones de solo lectura)
const readRateLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 200,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    store: rateLimitStore,
    message: { error: 'Demasiadas peticiones de lectura. Intente nuevamente en un minuto.' }
});
// ──────────────────────────────────────────────────────────────────────────────

// Inicializar Keep-Alive para Supabase
keepAlive.inicializarKeepAlive();

app.use(helmet());
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',')
      : ['http://localhost:5173'],
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '1mb' }));

// Integración de logs HTTP Morgan con Winston
app.use(morgan('combined', {
    stream: { write: (message) => logger.info(message.trim()) }
}));

app.get('/api/health', (_req, res) => {
    res.json({
        servicio: 'Blockchain API Gateway',
        estado: 'operativo',
        timestamp: new Date().toISOString(),
        red: 'Hyperledger Fabric v2.5'
    });
});

// Aplicar limitadores de tasa por tipo de operación
app.use('/api/audit/sellar', writeRateLimiter);
app.use('/api/audit/verificar', writeRateLimiter);
app.use('/api/audit/sello', readRateLimiter);
app.use('/api/audit/historial', readRateLimiter);
app.use('/api/audit/tipo', readRateLimiter);
app.use('/api/audit', auditRoutes);
app.use('/api/admin', writeRateLimiter, adminRoutes);

app.use((_req, res) => {
    res.status(404).json({ error: 'Endpoint no encontrado' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
    logger.error('Error global no manejado en la aplicación', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Error interno del servidor' });
});

let server;

async function iniciar() {
    try {
        await fabricGateway.inicializar();
        server = app.listen(PORT, () => {
            logger.info(`[API Gateway] Servidor escuchando en puerto ${PORT}`);
            logger.info(`[API Gateway] Health check: http://localhost:${PORT}/api/health`);
        });
    } catch (err) {
        logger.warn(`[API Gateway] Fallo al inicializar Fabric: ${err.message}. Iniciando en MODO OFFLINE.`);
        server = app.listen(PORT, () => {
            logger.info(`[API Gateway] Servidor escuchando en puerto ${PORT} (MODO OFFLINE con Ledger Mock)`);
        });
    }
}

// ── Apagado Elegante (Graceful Shutdown) ──────────────────────────────────────
const cerrarConexiones = () => {
    logger.info('[API Gateway] Señal de apagado recibida. Cerrando conexiones activas de forma elegante...');
    
    if (server) {
        server.close(async () => {
            logger.info('[API Gateway] Servidor HTTP cerrado.');
            try {
                await fabricGateway.cerrar();
                logger.info('[API Gateway] Conexiones a la pasarela de blockchain cerradas exitosamente.');
                process.exit(0);
            } catch (err) {
                logger.error('[API Gateway] Error al cerrar conexiones de pasarela:', { error: err.message });
                process.exit(1);
            }
        });
    } else {
        process.exit(0);
    }
};

process.on('SIGINT', cerrarConexiones);
process.on('SIGTERM', cerrarConexiones);
// ──────────────────────────────────────────────────────────────────────────────

iniciar();
