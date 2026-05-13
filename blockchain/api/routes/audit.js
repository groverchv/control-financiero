'use strict';

const express = require('express');
const fabricGateway = require('../services/fabricGateway');

const router = express.Router();

/**
 * POST /api/audit/sellar
 * Registra un sello criptografico en el ledger de Fabric.
 * Body: { tipoTabla, idRegistro, hashCalculado, idUsuario }
 */
router.post('/sellar', async (req, res) => {
    const { tipoTabla, idRegistro, hashCalculado, idUsuario } = req.body;

    if (!tipoTabla || !idRegistro || !hashCalculado || !idUsuario) {
        return res.status(400).json({
            error: 'Parametros incompletos',
            detalle: 'Se requiere: tipoTabla, idRegistro, hashCalculado, idUsuario'
        });
    }

    try {
        const resultado = await fabricGateway.sellarTransaccion(tipoTabla, idRegistro, hashCalculado, idUsuario);
        res.status(201).json(resultado);
    } catch (err) {
        console.error('[POST /sellar] Error:', err.message);
        res.status(500).json({ error: 'Error al sellar la transaccion', detalle: err.message });
    }
});

/**
 * GET /api/audit/sello/:idRegistro
 * Obtiene el sello almacenado de un registro.
 */
router.get('/sello/:idRegistro', async (req, res) => {
    try {
        const sello = await fabricGateway.consultarSello(req.params.idRegistro);
        res.json(sello);
    } catch (err) {
        const notFound = err.message.includes('No existe');
        res.status(notFound ? 404 : 500).json({
            error: notFound ? 'Sello no encontrado' : 'Error de consulta',
            detalle: err.message
        });
    }
});

/**
 * GET /api/audit/historial/:idRegistro
 * Obtiene el audit trail completo de un registro.
 */
router.get('/historial/:idRegistro', async (req, res) => {
    try {
        const historial = await fabricGateway.obtenerHistorial(req.params.idRegistro);
        res.json(historial);
    } catch (err) {
        console.error('[GET /historial] Error:', err.message);
        res.status(500).json({ error: 'Error obteniendo historial', detalle: err.message });
    }
});

/**
 * GET /api/audit/tipo/:tipoTabla
 * Lista todos los sellos de una tabla especifica (ingreso, egreso, activo, archivo).
 */
router.get('/tipo/:tipoTabla', async (req, res) => {
    try {
        const sellos = await fabricGateway.consultarPorTipo(req.params.tipoTabla);
        res.json(sellos);
    } catch (err) {
        console.error('[GET /tipo] Error:', err.message);
        res.status(500).json({ error: 'Error consultando por tipo', detalle: err.message });
    }
});

/**
 * POST /api/audit/verificar
 * Verifica la integridad de un registro comparando hashes.
 * Body: { idRegistro, hashRecalculado }
 */
router.post('/verificar', async (req, res) => {
    const { idRegistro, hashRecalculado } = req.body;

    if (!idRegistro || !hashRecalculado) {
        return res.status(400).json({
            error: 'Parametros incompletos',
            detalle: 'Se requiere: idRegistro, hashRecalculado'
        });
    }

    try {
        const resultado = await fabricGateway.verificarIntegridad(idRegistro, hashRecalculado);
        res.json(resultado);
    } catch (err) {
        console.error('[POST /verificar] Error:', err.message);
        res.status(500).json({ error: 'Error en verificacion', detalle: err.message });
    }
});

module.exports = router;
