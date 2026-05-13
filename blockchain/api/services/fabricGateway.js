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

function getFirstFile(dirPath) {
    const files = fs.readdirSync(dirPath);
    if (files.length === 0) throw new Error(`No se encontraron archivos en: ${dirPath}`);
    return path.join(dirPath, files[0]);
}

async function inicializar() {
    if (contract) return contract;

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
}

async function sellarTransaccion(tipoTabla, idRegistro, hashCalculado, idUsuario) {
    const c = await inicializar();
    const resultado = await c.submitTransaction('SellarTransaccion', tipoTabla, idRegistro, hashCalculado, idUsuario);
    return JSON.parse(resultado.toString());
}

async function consultarSello(idRegistro) {
    const c = await inicializar();
    const resultado = await c.evaluateTransaction('ConsultarSello', idRegistro);
    return JSON.parse(resultado.toString());
}

async function obtenerHistorial(idRegistro) {
    const c = await inicializar();
    const resultado = await c.evaluateTransaction('ObtenerHistorial', idRegistro);
    return JSON.parse(resultado.toString());
}

async function consultarPorTipo(tipoTabla) {
    const c = await inicializar();
    const resultado = await c.evaluateTransaction('ConsultarPorTipo', tipoTabla);
    return JSON.parse(resultado.toString());
}

async function verificarIntegridad(idRegistro, hashAVerificar) {
    const c = await inicializar();
    const resultado = await c.evaluateTransaction('VerificarIntegridad', idRegistro, hashAVerificar);
    return JSON.parse(resultado.toString());
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
