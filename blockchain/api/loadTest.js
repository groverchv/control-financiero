'use strict';

const http = require('node:http');

const API_URL = 'http://127.0.0.1:3001/api/audit/sellar';
const HEALTH_URL = 'http://127.0.0.1:3001/api/health';
const CONCURRENT_REQUESTS = 300; // Número de transacciones concurrentes a simular
const BATCH_SIZE = 50;           // Tamaño de lotes concurrentes

// Generar una cadena aleatoria
function randomString(length = 8) {
    return Math.random().toString(36).substring(2, 2 + length);
}

// Genera un UUID simulado válido
function mockUUID() {
    return '12345678-1234-4321-8abc-' + Math.random().toString(16).substring(2, 14).padEnd(12, '0');
}

// Genera un hash SHA-256 simulado válido (64 caracteres hexadecimales)
function mockHash() {
    let hash = '';
    while (hash.length < 64) {
        hash += Math.random().toString(16).substring(2);
    }
    return hash.substring(0, 64);
}

// Envía una sola solicitud de sellado
function enviarSello() {
    return new Promise((resolve) => {
        const payload = JSON.stringify({
            tipoTabla: 'ingreso',
            idRegistro: mockUUID(),
            hashCalculado: mockHash(),
            idUsuario: mockUUID()
        });

        const start = Date.now();
        const req = http.request(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                const latency = Date.now() - start;
                if (res.statusCode === 201) {
                    resolve({ success: true, rateLimited: false, latency });
                } else if (res.statusCode === 429) {
                    resolve({ success: false, rateLimited: true, latency, error: `Rate Limited (429): ${data}` });
                } else {
                    resolve({ success: false, rateLimited: false, latency, error: `Status ${res.statusCode}: ${data}` });
                }
            });
        });

        req.on('error', (err) => {
            resolve({ success: false, rateLimited: false, latency: Date.now() - start, error: err.message });
        });

        req.write(payload);
        req.end();
    });
}

// Mide el lag del event loop de Node.js durante la prueba
let maxLag = 0;
let lagInterval;

function startLagMonitoring() {
    let lastTime = Date.now();
    lagInterval = setInterval(() => {
        const now = Date.now();
        const lag = now - lastTime - 100; // Intervalo de 100ms esperado
        if (lag > maxLag) maxLag = lag;
        lastTime = now;
    }, 100);
}

function stopLagMonitoring() {
    clearInterval(lagInterval);
}

async function runLoadTest() {
    console.log('===================================================');
    console.log(' INICIANDO PRUEBA DE CARGA: BLOCKCHAIN API GATEWAY');
    console.log(` Transacciones concurrentes totales: ${CONCURRENT_REQUESTS}`);
    console.log(` Tamaño de lotes concurrentes: ${BATCH_SIZE}`);
    console.log('===================================================\n');

    startLagMonitoring();

    const startTotal = Date.now();
    const results = [];

    // Ejecutar en lotes para no desbordar los sockets locales del OS de inmediato
    for (let i = 0; i < CONCURRENT_REQUESTS; i += BATCH_SIZE) {
        const batchPromise = [];
        const currentBatchSize = Math.min(BATCH_SIZE, CONCURRENT_REQUESTS - i);
        
        console.log(`-> Enviando lote de ${currentBatchSize} peticiones concurrentes...`);
        for (let j = 0; j < currentBatchSize; j++) {
            batchPromise.push(enviarSello());
        }

        const batchResults = await Promise.all(batchPromise);
        results.push(...batchResults);
    }

    const duration = Date.now() - startTotal;
    stopLagMonitoring();

    // Calcular estadísticas
    const successes = results.filter(r => r.success);
    const rateLimited = results.filter(r => r.rateLimited);
    const failures = results.filter(r => !r.success && !r.rateLimited);
    const latencies = results.map(r => r.latency);
    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const minLatency = Math.min(...latencies);
    const maxLatency = Math.max(...latencies);

    console.log('\n===================================================');
    console.log(' RESULTADOS DEL TEST DE CARGA');
    console.log('===================================================');
    console.log(`Total Peticiones : ${CONCURRENT_REQUESTS}`);
    console.log(`Exitosas (201)   : ${successes.length} (${((successes.length / CONCURRENT_REQUESTS) * 100).toFixed(1)}%)`);
    console.log(`Rate Limited (429): ${rateLimited.length} (${((rateLimited.length / CONCURRENT_REQUESTS) * 100).toFixed(1)}%)`);
    console.log(`Fallidas (Otros) : ${failures.length} (${((failures.length / CONCURRENT_REQUESTS) * 100).toFixed(1)}%)`);
    console.log(`Duración Total   : ${(duration / 1000).toFixed(2)} segundos`);
    console.log(`Rendimiento (RPS): ${(CONCURRENT_REQUESTS / (duration / 1000)).toFixed(1)} req/seg`);
    console.log(`Latencia Mínima  : ${minLatency} ms`);
    console.log(`Latencia Máxima  : ${maxLatency} ms`);
    console.log(`Latencia Promedio: ${avgLatency.toFixed(1)} ms`);
    console.log(`Max Event Loop Lag: ${maxLag.toFixed(1)} ms`);
    
    if (maxLag < 50) {
        console.log('Diagnóstico: [EXCELENTE] El Event Loop se mantuvo libre y asíncrono.');
    } else if (maxLag < 150) {
        console.log('Diagnóstico: [ACEPTABLE] Ligera carga en el Event Loop, normal bajo estrés.');
    } else {
        console.log('Diagnóstico: [ADVERTENCIA] Event Loop retrasado. Considere optimizar escrituras a disco.');
    }
    console.log('===================================================\n');

    if (rateLimited.length > 0) {
        console.log('Muestra de peticiones limitadas (Rate Limited):');
        console.log(rateLimited.slice(0, 2).map(r => r.error));
    }

    if (failures.length > 0) {
        console.log('Muestra de otros errores detectados:');
        console.log(failures.slice(0, 3).map(f => f.error));
    }
}

runLoadTest();
