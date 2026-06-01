'use strict';

const { createLogger, format, transports } = require('winston');
const path = require('node:path');

// Definición de formatos personalizados para desarrollo
const devFormat = format.combine(
    format.colorize(),
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.printf(({ timestamp, level, message, ...meta }) => {
        const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
        return `[${timestamp}] ${level}: ${message}${metaStr}`;
    })
);

// Formato de producción: JSON estructurado plano y rápido
const prodFormat = format.combine(
    format.timestamp(),
    format.json()
);

const logger = createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.NODE_ENV === 'production' ? prodFormat : devFormat,
    defaultMeta: { servicio: 'blockchain-api' },
    transports: [
        // Consola siempre activa
        new transports.Console(),
        // Persistencia local en archivos
        new transports.File({ 
            filename: path.join(__dirname, '../logs/error.log'), 
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5
        }),
        new transports.File({ 
            filename: path.join(__dirname, '../logs/combined.log'),
            maxsize: 10485760, // 10MB
            maxFiles: 5
        })
    ]
});

module.exports = logger;
