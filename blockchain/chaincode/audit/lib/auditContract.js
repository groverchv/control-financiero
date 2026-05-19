'use strict';

const { Contract } = require('fabric-contract-api');

/**
 * Contrato de Auditoria para el sistema Control Financiero.
 * Implementa el patron Hash-Anchor: solo almacena hashes SHA-256
 * de las transacciones financieras criticas (ingreso, egreso, activo, archivo).
 */
class AuditContract extends Contract {

    /**
     * Inicializa el ledger con un registro genesis.
     * Se invoca una unica vez al desplegar el chaincode.
     */
    async InitLedger(ctx) {
        const genesis = {
            docType: 'sello',
            tipoTabla: 'genesis',
            idRegistro: 'GENESIS',
            hashCalculado: '0000000000000000000000000000000000000000000000000000000000000000',
            idUsuario: 'SYSTEM',
            timestamp: new Date().toISOString(),
            estado: 'sellado'
        };

        await ctx.stub.putState('GENESIS', Buffer.from(JSON.stringify(genesis)));
        return JSON.stringify({ message: 'Ledger inicializado correctamente', txId: ctx.stub.getTxID() });
    }

    /**
     * Registra un nuevo sello criptografico en el ledger.
     * Solo almacena el hash, no los datos operativos completos.
     *
     * @param {Context} ctx - Contexto de la transaccion Fabric
     * @param {string} tipoTabla - Tabla origen: ingreso, egreso, activo, archivo
     * @param {string} idRegistro - UUID del registro en Supabase
     * @param {string} hashCalculado - Hash SHA-256 calculado sobre los campos criticos
     * @param {string} idUsuario - UUID del usuario que origino la operacion
     * @returns {string} JSON con el TxID y timestamp del sellado
     */
    async SellarTransaccion(ctx, tipoTabla, idRegistro, hashCalculado, idUsuario) {
        const tablasPermitidas = ['ingreso', 'egreso', 'activo', 'archivo'];
        if (!tablasPermitidas.includes(tipoTabla)) {
            throw new Error(`Tabla "${tipoTabla}" no esta dentro del alcance de auditoria. Permitidas: ${tablasPermitidas.join(', ')}`);
        }

        if (!idRegistro || !hashCalculado || !idUsuario) {
            throw new Error('Todos los parametros son obligatorios: tipoTabla, idRegistro, hashCalculado, idUsuario');
        }

        if (hashCalculado.length !== 64) {
            throw new Error('El hash debe ser un SHA-256 valido de 64 caracteres hexadecimales');
        }

        const existente = await ctx.stub.getState(idRegistro);
        if (existente && existente.length > 0) {
            throw new Error(`El registro ${idRegistro} ya fue sellado previamente. Los sellos son inmutables.`);
        }

        const sello = {
            docType: 'sello',
            tipoTabla,
            idRegistro,
            hashCalculado,
            idUsuario,
            timestamp: new Date().toISOString(),
            estado: 'sellado'
        };

        await ctx.stub.putState(idRegistro, Buffer.from(JSON.stringify(sello)));

        return JSON.stringify({
            txId: ctx.stub.getTxID(),
            timestamp: sello.timestamp,
            idRegistro,
            estado: 'sellado'
        });
    }

    /**
     * Consulta el sello de un registro especifico.
     *
     * @param {Context} ctx
     * @param {string} idRegistro - UUID del registro a consultar
     * @returns {string} JSON con los datos del sello
     */
    async ConsultarSello(ctx, idRegistro) {
        const selloBytes = await ctx.stub.getState(idRegistro);

        if (!selloBytes || selloBytes.length === 0) {
            throw new Error(`No existe un sello para el registro: ${idRegistro}`);
        }

        return selloBytes.toString();
    }

    /**
     * Obtiene el historial completo de cambios de un registro.
     * Permite trazar cada version y modificacion en el ledger.
     *
     * @param {Context} ctx
     * @param {string} idRegistro
     * @returns {string} JSON array con el historial
     */
    async ObtenerHistorial(ctx, idRegistro) {
        const iterator = await ctx.stub.getHistoryForKey(idRegistro);
        const historial = [];

        let result = await iterator.next();
        while (!result.done) {
            const entry = {
                txId: result.value.txId,
                timestamp: result.value.timestamp
                    ? new Date(result.value.timestamp.seconds.low * 1000).toISOString()
                    : null,
                isDelete: result.value.isDelete
            };

            if (!result.value.isDelete) {
                try {
                    entry.valor = JSON.parse(result.value.value.toString('utf8'));
                } catch (_err) {
                    entry.valor = result.value.value.toString('utf8');
                }
            }

            historial.push(entry);
            result = await iterator.next();
        }
        await iterator.close();

        return JSON.stringify(historial);
    }

    /**
     * Consulta enriquecida por tipo de tabla usando FinanzasDB (CouchDB).
     * Permite obtener todos los sellos de una entidad especifica.
     *
     * @param {Context} ctx
     * @param {string} tipoTabla - ingreso, egreso, activo, archivo
     * @returns {string} JSON array con los sellos encontrados
     */
    async ConsultarPorTipo(ctx, tipoTabla) {
        const query = {
            selector: {
                docType: 'sello',
                tipoTabla: tipoTabla
            },
            sort: [{ timestamp: 'desc' }],
            use_index: ['_design/indexTipoDoc', 'indexTipo']
        };

        const iterator = await ctx.stub.getQueryResult(JSON.stringify(query));
        const resultados = [];

        let result = await iterator.next();
        while (!result.done) {
            try {
                const registro = JSON.parse(result.value.value.toString('utf8'));
                registro.key = result.value.key;
                resultados.push(registro);
            } catch (_err) {
                // Registro corrupto, saltar
            }
            result = await iterator.next();
        }
        await iterator.close();

        return JSON.stringify(resultados);
    }

    /**
     * Verifica si un hash coincide con el almacenado en el ledger.
     * Funcion principal del mecanismo de auditoria.
     *
     * @param {Context} ctx
     * @param {string} idRegistro
     * @param {string} hashAVerificar - Hash recalculado para comparar
     * @returns {string} JSON con el resultado de la verificacion
     */
    async VerificarIntegridad(ctx, idRegistro, hashAVerificar) {
        const selloBytes = await ctx.stub.getState(idRegistro);

        if (!selloBytes || selloBytes.length === 0) {
            return JSON.stringify({
                verificado: false,
                motivo: 'NO_EXISTE_SELLO',
                mensaje: 'No se encontro un sello en el ledger para este registro'
            });
        }

        const sello = JSON.parse(selloBytes.toString());

        const coincide = sello.hashCalculado === hashAVerificar;

        return JSON.stringify({
            verificado: coincide,
            motivo: coincide ? 'INTEGRO' : 'HASH_NO_COINCIDE',
            mensaje: coincide
                ? 'El registro es autentico. El hash de la base de datos coincide con el ledger.'
                : 'ALERTA: El hash recalculado NO coincide con el sello del blockchain. Posible alteracion detectada.',
            hashLedger: sello.hashCalculado,
            hashRecibido: hashAVerificar,
            sellado: sello.timestamp,
            tipoTabla: sello.tipoTabla
        });
    }
}

module.exports = AuditContract;
