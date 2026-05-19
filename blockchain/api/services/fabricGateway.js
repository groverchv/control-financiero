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
let mockLedger = [];

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

        console.log('[Fabric] Conexion establecida con la red Hyperledger Fabric');
        return contract;
    } catch (err) {
        console.warn('[Fabric] Error conectando a Fabric. Habilitando MODO OFFLINE (memoria local):', err.message);
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
    mockLedger.push(sello);
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
    const sellos = mockLedger.filter(s => s.idRegistro === idRegistro);
    if (sellos.length === 0) throw new Error('No existe el sello');
    return sellos[sellos.length - 1];
}

async function obtenerHistorial(idRegistro) {
    try {
        const c = await inicializar();
        if (isOfflineMode) return mockLedger.filter(s => s.idRegistro === idRegistro);
        const resultado = await c.evaluateTransaction('ObtenerHistorial', idRegistro);
        return JSON.parse(resultado.toString());
    } catch (err) {
        console.warn('[Fabric] Error en obtenerHistorial, activando MODO OFFLINE:', err.message);
        isOfflineMode = true;
        return mockLedger.filter(s => s.idRegistro === idRegistro);
    }
}

async function consultarPorTipo(tipoTabla) {
    try {
        const c = await inicializar();
        if (isOfflineMode) return mockLedger.filter(s => s.tipoTabla === tipoTabla);
        const resultado = await c.evaluateTransaction('ConsultarPorTipo', tipoTabla);
        return JSON.parse(resultado.toString());
    } catch (err) {
        console.warn('[Fabric] Error en consultarPorTipo, activando MODO OFFLINE:', err.message);
        isOfflineMode = true;
        return mockLedger.filter(s => s.tipoTabla === tipoTabla);
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
