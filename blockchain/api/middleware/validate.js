'use strict';

const logger = require('../services/logger');

/**
 * Middleware para validar esquemas de peticiones con Zod
 * @param {object} schemas - Esquemas de validación { body, params, query }
 */
function validate(schemas) {
    return (req, res, next) => {
        try {
            if (schemas.body) {
                req.body = schemas.body.parse(req.body);
            }
            if (schemas.params) {
                req.params = schemas.params.parse(req.params);
            }
            if (schemas.query) {
                req.query = schemas.query.parse(req.query);
            }
            next();
        } catch (err) {
            if (err.name === 'ZodError') {
                const issues = (err.issues || err.errors || []).map(issue => ({
                    campo: issue.path.join('.'),
                    mensaje: issue.message
                }));

                logger.warn('Validacion fallida para peticion', {
                    path: req.originalUrl,
                    metodo: req.method,
                    errores: issues
                });

                return res.status(400).json({
                    error: 'Validación de parámetros fallida',
                    detalles: issues
                });
            }
            
            logger.error('Error inesperado en middleware de validacion', { error: err.message });
            next(err);
        }
    };
}

module.exports = validate;
