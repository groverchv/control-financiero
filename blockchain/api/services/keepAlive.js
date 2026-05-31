'use strict';

const https = require('node:https');
const http = require('node:http');
const url = require('node:url');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

// Realiza ping a la base de datos de Supabase para evitar suspensión por inactividad (cada 12 horas)
function pingSupabase() {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        console.warn('[Keep-Alive] No se configuraron las credenciales de Supabase en el archivo .env. Servicio inactivo.');
        return;
    }

    try {
        const pingUrl = `${SUPABASE_URL}/rest/v1/miembro?limit=1`;
        const parsedUrl = url.parse(pingUrl);

        const options = {
            hostname: parsedUrl.hostname,
            path: parsedUrl.path,
            method: 'GET',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            },
            timeout: 10000 // 10 segundos timeout
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    console.log(`[Keep-Alive] Ping exitoso a Supabase. Estado: ${res.statusCode} OK. Base de datos activa.`);
                } else {
                    console.warn(`[Keep-Alive] Fallo en ping a Supabase. Estado: ${res.statusCode}. Detalle: ${data}`);
                }
            });
        });

        req.on('error', (err) => {
            console.error('[Keep-Alive] Error de red al realizar ping a Supabase:', err.message);
        });

        req.on('timeout', () => {
            req.destroy();
            console.error('[Keep-Alive] Timeout al realizar ping a Supabase.');
        });

        req.end();
    } catch (err) {
        console.error('[Keep-Alive] Error inesperado en el ping a Supabase:', err.message);
    }
}

// Realiza self-ping a la API del Blockchain para evitar suspensión en hostings gratuitos (cada 10 minutos)
function pingSelf() {
    // Detectar URL externa en Render (RENDER_EXTERNAL_URL), o SELF_URL personalizada, o fallback a localhost
    const selfUrl = process.env.RENDER_EXTERNAL_URL || process.env.SELF_URL || `http://localhost:${process.env.PORT || 3001}`;
    
    try {
        const healthUrl = `${selfUrl.replace(/\/$/, '')}/api/health`;
        const parsedUrl = url.parse(healthUrl);
        const protocolHandler = parsedUrl.protocol === 'https:' ? https : http;

        const options = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
            path: parsedUrl.path,
            method: 'GET',
            timeout: 8000 // 8 segundos timeout
        };
        const req = protocolHandler.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    console.log(`[Keep-Alive] Self-ping exitoso a Blockchain API (${healthUrl}). Estado: ${res.statusCode} OK.`);
                } else {
                    console.warn(`[Keep-Alive] Fallo en self-ping a Blockchain API. Estado: ${res.statusCode}. Detalle: ${data}`);
                }
            });
        });

        req.on('error', (err) => {
            console.error(`[Keep-Alive] Error de red en self-ping a Blockchain API (${healthUrl}):`, err.message);
        });

        req.on('timeout', () => {
            req.destroy();
            console.error('[Keep-Alive] Timeout en self-ping a Blockchain API.');
        });

        req.end();
    } catch (err) {
        console.error('[Keep-Alive] Error inesperado en self-ping:', err.message);
    }
}

function inicializarKeepAlive() {
    console.log('[Keep-Alive] Inicializando servicios Keep-Alive...');
    console.log('[Keep-Alive] -> Monitoreo Supabase programado cada 12 horas.');
    console.log('[Keep-Alive] -> Monitoreo Blockchain API programado cada 10 minutos.');
    
    // Pings inmediatos al iniciar el servidor
    pingSupabase();
    pingSelf();

    // Configurar intervalos
    const doceHoras = 12 * 60 * 60 * 1000;
    const diezMinutos = 10 * 60 * 1000;

    setInterval(pingSupabase, doceHoras);
    setInterval(pingSelf, diezMinutos);
}

module.exports = {
    inicializarKeepAlive,
    pingSupabase,
    pingSelf
};
