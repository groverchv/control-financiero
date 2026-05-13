'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const fabricGateway = require('./services/fabricGateway');
const auditRoutes = require('./routes/audit');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('combined'));

app.get('/api/health', (_req, res) => {
    res.json({
        servicio: 'Blockchain API Gateway',
        estado: 'operativo',
        timestamp: new Date().toISOString(),
        red: 'Hyperledger Fabric v2.5'
    });
});

app.use('/api/audit', auditRoutes);

app.use((_req, res) => {
    res.status(404).json({ error: 'Endpoint no encontrado' });
});

app.use((err, _req, res, _next) => {
    console.error('[Error global]', err);
    res.status(500).json({ error: 'Error interno del servidor', detalle: err.message });
});

async function iniciar() {
    try {
        await fabricGateway.inicializar();
        app.listen(PORT, () => {
            console.log(`[API Gateway] Escuchando en http://localhost:${PORT}`);
            console.log(`[API Gateway] Health check: http://localhost:${PORT}/api/health`);
        });
    } catch (err) {
        console.error('[API Gateway] Error al iniciar:', err.message);
        console.warn('[API Gateway] Iniciando en modo offline (sin conexion a Fabric)');
        app.listen(PORT, () => {
            console.log(`[API Gateway] Escuchando en http://localhost:${PORT} (MODO OFFLINE)`);
        });
    }
}

process.on('SIGINT', () => {
    console.log('\n[API Gateway] Cerrando conexiones...');
    fabricGateway.cerrar();
    process.exit(0);
});

process.on('SIGTERM', () => {
    fabricGateway.cerrar();
    process.exit(0);
});

iniciar();
