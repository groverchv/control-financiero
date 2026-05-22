'use strict';

const grpc = require('@grpc/grpc-js');
const { connect, signers } = require('@hyperledger/fabric-gateway');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const CRYPTO_PATH = path.resolve(process.env.CRYPTO_PATH || '../organizations/peerOrganizations/org1.controlfinanciero.com');
const MSP_ID = process.env.MSP_ID || 'Org1MSP';
const CHANNEL_NAME = process.env.CHANNEL_NAME || 'auditchannel';
const CHAINCODE_NAME = process.env.CHAINCODE_NAME || 'audit';
const PEER_ENDPOINT = process.env.PEER_ENDPOINT || 'localhost:7051';
const PEER_HOST_ALIAS = process.env.PEER_HOST_ALIAS || 'peer0.org1.controlfinanciero.com';

const CERT_DIR = path.join(CRYPTO_PATH, 'users', 'User1@org1.controlfinanciero.com', 'msp', 'signcerts');
const KEY_DIR = path.join(CRYPTO_PATH, 'users', 'User1@org1.controlfinanciero.com', 'msp', 'keystore');
const TLS_CERT_PATH = path.join(CRYPTO_PATH, 'peers', 'peer0.org1.controlfinanciero.com', 'tls', 'ca.crt');

let gateway = null;
let contract = null;
let isOfflineMode = false;
const MOCK_LEDGER_FILE = path.join(__dirname, 'mockLedger.json');
let mockLedger = [];

// Mapas de indexación en memoria para búsquedas instantáneas O(1)
const selloCache = new Map();
const historialCache = new Map();
const tipoCache = new Map();

// Reconstruye eficientemente los índices en memoria cuando se carga o muta el ledger
function reconstruirCaches() {
    selloCache.clear();
    historialCache.clear();
    tipoCache.clear();
    
    for (const sello of mockLedger) {
        // Almacenar el último sello de cada registro
        selloCache.set(sello.idRegistro, sello);
        
        // Historial completo por idRegistro
        if (!historialCache.has(sello.idRegistro)) {
            historialCache.set(sello.idRegistro, []);
        }
        historialCache.get(sello.idRegistro).push(sello);
        
        // Agrupación por tipo de tabla
        if (!tipoCache.has(sello.tipoTabla)) {
            tipoCache.set(sello.tipoTabla, []);
        }
        tipoCache.get(sello.tipoTabla).push(sello);
    }
}

try {
    if (fs.existsSync(MOCK_LEDGER_FILE)) {
        mockLedger = JSON.parse(fs.readFileSync(MOCK_LEDGER_FILE, 'utf8'));
        reconstruirCaches();
        console.log(`[Fabric-Mock] Ledger local cargado e indexado en caché O(1) con ${mockLedger.length} transacciones.`);
    }
} catch (err) {
    console.error('[Fabric-Mock] Error cargando ledger local:', err.message);
}

// Cola de escritura asíncrona no bloqueante para proteger el ciclo de eventos (Event Loop)
let isWriting = false;
let pendingWrite = false;

async function guardarMockLedgerAsync() {
    if (isWriting) {
        pendingWrite = true;
        return;
    }
    isWriting = true;
    try {
        const data = JSON.stringify(mockLedger, null, 2);
        await fs.promises.writeFile(MOCK_LEDGER_FILE, data, 'utf8');
    } catch (err) {
        console.error('[Fabric-Mock] Error al persistir ledger local de forma asíncrona:', err.message);
    } finally {
        isWriting = false;
        if (pendingWrite) {
            pendingWrite = false;
            // Ejecutar la escritura acumulada pendiente
            guardarMockLedgerAsync();
        }
    }
}

function getFirstFile(dirPath) {
    const files = fs.readdirSync(dirPath);
    if (files.length === 0) throw new Error(`No se encontraron archivos en: ${dirPath}`);
    return path.join(dirPath, files[0]);
}

async function inicializar() {
    if (contract) return contract;
    if (isOfflineMode) return true;

    try {
        const tlsCert = fs.readFileSync(TLS_CERT_PATH);
        const tlsCredentials = grpc.credentials.createSsl(tlsCert);

        const client = new grpc.Client(PEER_ENDPOINT, tlsCredentials, {
            'grpc.ssl_target_name_override': PEER_HOST_ALIAS,
        });

        const certificate = fs.readFileSync(getFirstFile(CERT_DIR));
        const privateKeyPem = fs.readFileSync(getFirstFile(KEY_DIR));
        const privateKey = crypto.createPrivateKey(privateKeyPem);

        const identity = { mspId: MSP_ID, credentials: certificate };
        const signer = signers.newPrivateKeySigner(privateKey);

        gateway = connect({ client, identity, signer });
        const network = gateway.getNetwork(CHANNEL_NAME);
        contract = network.getContract(CHAINCODE_NAME);

        console.log('[Fabric] Conexión establecida con la red Hyperledger Fabric');
        return contract;
    } catch (err) {
        console.warn('[Fabric] Error conectando a Fabric. Habilitando MODO OFFLINE (persistencia JSON optimizada):', err.message);
        isOfflineMode = true;
        return true;
    }
}

async function sellarTransaccion(tipoTabla, idRegistro, hashCalculado, idUsuario) {
    try {
        const c = await inicializar();
        if (isOfflineMode) {
            return sellarMock(tipoTabla, idRegistro, hashCalculado, idUsuario);
        }
        const resultado = await c.submitTransaction('SellarTransaccion', tipoTabla, idRegistro, hashCalculado, idUsuario);
        return JSON.parse(resultado.toString());
    } catch (err) {
        console.warn('[Fabric] Error en sellarTransaccion, activando MODO OFFLINE:', err.message);
        isOfflineMode = true;
        return sellarMock(tipoTabla, idRegistro, hashCalculado, idUsuario);
    }
}

function sellarMock(tipoTabla, idRegistro, hashCalculado, idUsuario) {
    const timestamp = new Date().toISOString();
    const txId = crypto.createHash('sha256').update(timestamp + hashCalculado).digest('hex');
    const sello = { txId, tipoTabla, idRegistro, hashCalculado, idUsuario, timestamp };
    
    // Agregar al arreglo en memoria
    mockLedger.push(sello);
    
    // Actualizar cachés e índices O(1) de manera inmediata
    selloCache.set(idRegistro, sello);
    
    if (!historialCache.has(idRegistro)) {
        historialCache.set(idRegistro, []);
    }
    historialCache.get(idRegistro).push(sello);
    
    if (!tipoCache.has(tipoTabla)) {
        tipoCache.set(tipoTabla, []);
    }
    tipoCache.get(tipoTabla).push(sello);
    
    // Guardar en disco sin bloquear usando la cola asíncrona
    guardarMockLedgerAsync();
    
    return { success: true, txId, timestamp };
}

async function consultarSello(idRegistro) {
    try {
        const c = await inicializar();
        if (isOfflineMode) {
            return consultarSelloMock(idRegistro);
        }
        const resultado = await c.evaluateTransaction('ConsultarSello', idRegistro);
        return JSON.parse(resultado.toString());
    } catch (err) {
        console.warn('[Fabric] Error en consultarSello, activando MODO OFFLINE:', err.message);
        isOfflineMode = true;
        return consultarSelloMock(idRegistro);
    }
}

function consultarSelloMock(idRegistro) {
    const sello = selloCache.get(idRegistro);
    if (!sello) throw new Error('No existe el sello');
    return sello;
}

async function obtenerHistorial(idRegistro) {
    try {
        const c = await inicializar();
        if (isOfflineMode) return historialCache.get(idRegistro) || [];
        const resultado = await c.evaluateTransaction('ObtenerHistorial', idRegistro);
        return JSON.parse(resultado.toString());
    } catch (err) {
        console.warn('[Fabric] Error en obtenerHistorial, activando MODO OFFLINE:', err.message);
        isOfflineMode = true;
        return historialCache.get(idRegistro) || [];
    }
}

async function consultarPorTipo(tipoTabla) {
    try {
        const c = await inicializar();
        if (isOfflineMode) return tipoCache.get(tipoTabla) || [];
        const resultado = await c.evaluateTransaction('ConsultarPorTipo', tipoTabla);
        return JSON.parse(resultado.toString());
    } catch (err) {
        console.warn('[Fabric] Error en consultarPorTipo, activando MODO OFFLINE:', err.message);
        isOfflineMode = true;
        return tipoCache.get(tipoTabla) || [];
    }
}

async function verificarIntegridad(idRegistro, hashAVerificar) {
    try {
        const c = await inicializar();
        if (isOfflineMode) {
            return verificarIntegridadMock(idRegistro, hashAVerificar);
        }
        const resultado = await c.evaluateTransaction('VerificarIntegridad', idRegistro, hashAVerificar);
        return JSON.parse(resultado.toString());
    } catch (err) {
        console.warn('[Fabric] Error en verificarIntegridad, activando MODO OFFLINE:', err.message);
        isOfflineMode = true;
        return verificarIntegridadMock(idRegistro, hashAVerificar);
    }
}

function verificarIntegridadMock(idRegistro, hashAVerificar) {
    try {
        const sello = consultarSelloMock(idRegistro);
        return { 
            esIntegro: sello.hashCalculado === hashAVerificar, 
            hashRegistrado: sello.hashCalculado, 
            hashProporcionado: hashAVerificar 
        };
    } catch {
        return { esIntegro: false, error: 'Sello no encontrado en modo local/offline.' };
    }
}

function cerrar() {
    if (gateway) {
        gateway.close();
        gateway = null;
        contract = null;
        console.log('[Fabric] Conexion cerrada');
    }
}

module.exports = {
    inicializar,
    sellarTransaccion,
    consultarSello,
    obtenerHistorial,
    consultarPorTipo,
    verificarIntegridad,
    cerrar
};
