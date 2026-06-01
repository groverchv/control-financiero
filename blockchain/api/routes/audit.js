'use strict';

const express = require('express');
const { z } = require('zod');
const fabricGateway = require('../services/fabricGateway');
const validate = require('../middleware/validate');
const logger = require('../services/logger');

const router = express.Router();

// ── Esquemas de Validación (Zod) ─────────────────────────────────────────────
const sellarSchema = z.object({
    tipoTabla: z.enum(['ingreso', 'egreso', 'activos', 'archivo', 'actividad'], {
        error_map: () => ({ message: 'tipoTabla debe ser: ingreso, egreso, activos, archivo o actividad' })
    }),
    idRegistro: z.string().uuid({ message: 'idRegistro debe ser un UUID válido' }),
    hashCalculado: z.string().length(64, { message: 'hashCalculado debe ser un hash SHA-256 de 64 caracteres' }),
    idUsuario: z.string().uuid({ message: 'idUsuario debe ser un UUID válido' })
});

const verificarSchema = z.object({
    idRegistro: z.string().uuid({ message: 'idRegistro debe ser un UUID válido' }),
    hashRecalculado: z.string().length(64, { message: 'hashRecalculado debe ser un hash SHA-256 de 64 caracteres' })
});

const uuidParamSchema = z.object({
    idRegistro: z.string().uuid({ message: 'El ID de registro debe ser un UUID válido' })
});

const tipoTablaParamSchema = z.object({
    tipoTabla: z.enum(['ingreso', 'egreso', 'activos', 'archivo', 'actividad'], {
        error_map: () => ({ message: 'tipoTabla debe ser: ingreso, egreso, activos, archivo o actividad' })
    })
});
// ──────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/audit/sellar
 * Registra un sello criptografico en el ledger de Fabric.
 */
router.post('/sellar', validate({ body: sellarSchema }), async (req, res) => {
    const { tipoTabla, idRegistro, hashCalculado, idUsuario } = req.body;

    try {
        logger.info('Procesando solicitud de sellado', { tipoTabla, idRegistro, idUsuario });
        const resultado = await fabricGateway.sellarTransaccion(tipoTabla, idRegistro, hashCalculado, idUsuario);
        if (resultado && resultado.success === false) {
            logger.error('Fallo en el servicio de sellado de transaccion', { idRegistro, resultado });
            return res.status(503).json(resultado);
        }
        logger.info('Sello registrado con éxito en el ledger', { idRegistro, txId: resultado.txId });
        res.status(201).json(resultado);
    } catch (err) {
        logger.error('Error al sellar la transaccion', { idRegistro, error: err.message });
        res.status(500).json({ error: 'Error al sellar la transaccion', detalle: err.message });
    }
});

/**
 * GET /api/audit/sello/:idRegistro
 * Obtiene el sello almacenado de un registro.
 */
router.get('/sello/:idRegistro', validate({ params: uuidParamSchema }), async (req, res) => {
    const { idRegistro } = req.params;
    try {
        logger.info('Consultando sello de registro', { idRegistro });
        const sello = await fabricGateway.consultarSello(idRegistro);
        res.json(sello);
    } catch (err) {
        const notFound = err.message.includes('No existe');
        logger.warn('Resultado de consulta de sello', { idRegistro, encontrado: !notFound, error: err.message });
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
router.get('/historial/:idRegistro', validate({ params: uuidParamSchema }), async (req, res) => {
    const { idRegistro } = req.params;
    try {
        logger.info('Consultando historial de auditoría de registro', { idRegistro });
        const historial = await fabricGateway.obtenerHistorial(idRegistro);
        res.json(historial);
    } catch (err) {
        logger.error('Error obteniendo historial de auditoría', { idRegistro, error: err.message });
        res.status(500).json({ error: 'Error obteniendo historial', detalle: err.message });
    }
});

/**
 * GET /api/audit/tipo/:tipoTabla
 * Lista todos los sellos de una tabla especifica (ingreso, egreso, activo, archivo).
 */
router.get('/tipo/:tipoTabla', validate({ params: tipoTablaParamSchema }), async (req, res) => {
    const { tipoTabla } = req.params;
    try {
        logger.info('Consultando sellos por tipo de tabla', { tipoTabla });
        const sellos = await fabricGateway.consultarPorTipo(tipoTabla);
        res.json(sellos);
    } catch (err) {
        logger.error('Error consultando sellos por tipo de tabla', { tipoTabla, error: err.message });
        res.status(500).json({ error: 'Error consultando por tipo', detalle: err.message });
    }
});

/**
 * POST /api/audit/verificar
 * Verifica la integridad de un registro comparando hashes.
 */
router.post('/verificar', validate({ body: verificarSchema }), async (req, res) => {
    const { idRegistro, hashRecalculado } = req.body;

    try {
        logger.info('Iniciando verificación de integridad criptográfica', { idRegistro });
        const resultado = await fabricGateway.verificarIntegridad(idRegistro, hashRecalculado);
        logger.info('Verificación completada', { idRegistro, integro: resultado.integro });
        res.json(resultado);
    } catch (err) {
        logger.error('Error en verificación de integridad', { idRegistro, error: err.message });
        res.status(500).json({ error: 'Error en verificacion', detalle: err.message });
    }
});

module.exports = router;
