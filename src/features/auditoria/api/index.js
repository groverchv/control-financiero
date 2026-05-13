import { supabase } from '../../../services/supabase';
import { blockchainService } from '../../../services/blockchain';
import { calcularHashRegistro } from '../utils/hashCalculator';

/**
 * API del modulo de auditoria.
 * Conecta Supabase (datos operativos) con la red Blockchain (sellos inmutables).
 */
export const auditoriaApi = {

    /**
     * Obtiene el estado de conexion con la red Blockchain.
     */
    verificarConexion: async () => {
        return blockchainService.healthCheck();
    },

    /**
     * Obtiene los registros de una tabla con sus hashes internos.
     */
    obtenerRegistros: async (tabla, limite = 50) => {
        let query;

        switch (tabla) {
            case 'ingreso':
                query = supabase
                    .from('ingreso')
                    .select('id, monto, fecha, descripcion, estado, hash_anterior, hash_actual, blockchain_tx_id, creacion, miembro:miembro_id(nombre)')
                    .order('creacion', { ascending: false })
                    .limit(limite);
                break;
            case 'egreso':
                query = supabase
                    .from('egreso')
                    .select('id, monto, fecha, concepto, descripcion, hash_anterior, hash_actual, blockchain_tx_id, creacion, miembro:miembro_id(nombre)')
                    .order('creacion', { ascending: false })
                    .limit(limite);
                break;
            case 'activo':
                query = supabase
                    .from('activos')
                    .select('id, nombre, costo_total, "fechaAdquisicion", estado, hash_anterior, hash_actual, blockchain_tx_id, creacion')
                    .order('creacion', { ascending: false })
                    .limit(limite);
                break;
            case 'archivo':
                query = supabase
                    .from('archivo')
                    .select('id, url, tipo, estado, egreso_id, ingreso_id, activo_id, actividad_id, miembro_id, hash_anterior, hash_actual, blockchain_tx_id, creacion')
                    .order('creacion', { ascending: false })
                    .limit(limite);
                break;
            default:
                throw new Error(`Tabla no soportada: ${tabla}`);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    },

    /**
     * Verifica la integridad de un registro individual.
     * 1. Recalcula el hash con los datos actuales de Supabase.
     * 2. Compara con el hash almacenado en la BD.
     * 3. Si la red Fabric esta disponible, compara contra el ledger.
     */
    verificarRegistro: async (tabla, registro) => {
        const hashRecalculado = await calcularHashRegistro(tabla, registro);
        const hashCoincideDB = hashRecalculado === registro.hash_actual;

        let verificacionBlockchain = null;

        if (registro.blockchain_tx_id) {
            try {
                verificacionBlockchain = await blockchainService.verificar(registro.id, hashRecalculado);
            } catch (err) {
                verificacionBlockchain = {
                    verificado: false,
                    motivo: 'RED_NO_DISPONIBLE',
                    mensaje: 'No se pudo conectar con la red Blockchain para verificacion cruzada.'
                };
            }
        }

        return {
            id: registro.id,
            hashRecalculado,
            hashAlmacenado: registro.hash_actual,
            integridadDB: hashCoincideDB,
            blockchain: verificacionBlockchain,
            integridadTotal: hashCoincideDB && (verificacionBlockchain ? verificacionBlockchain.verificado : true)
        };
    },

    /**
     * Ejecuta una verificacion masiva de toda la cadena de una tabla.
     * Recorre secuencialmente y verifica el encadenamiento hash.
     */
    verificarCadena: async (tabla) => {
        const registros = await auditoriaApi.obtenerRegistros(tabla, 500);
        const ordenados = registros.sort((a, b) => new Date(a.creacion) - new Date(b.creacion));

        const resultados = [];
        let cadenaRota = false;
        let bloqueRoto = null;

        for (let i = 0; i < ordenados.length; i++) {
            const reg = ordenados[i];
            const hashRecalculado = await calcularHashRegistro(tabla, reg);
            const hashCoincide = hashRecalculado === reg.hash_actual;

            let encadenamientoCorrecto = true;
            if (i > 0) {
                encadenamientoCorrecto = reg.hash_anterior === ordenados[i - 1].hash_actual;
            } else {
                encadenamientoCorrecto = reg.hash_anterior === 'genesis' || reg.hash_anterior === ordenados[0]?.hash_anterior;
            }

            const integro = hashCoincide && encadenamientoCorrecto;

            if (!integro && !cadenaRota) {
                cadenaRota = true;
                bloqueRoto = i + 1;
            }

            resultados.push({
                bloque: i + 1,
                id: reg.id,
                hashCoincide,
                encadenamientoCorrecto,
                integro,
                hashAlmacenado: reg.hash_actual?.substring(0, 16) + '...',
                hashRecalculado: hashRecalculado.substring(0, 16) + '...'
            });
        }

        return {
            tabla,
            totalBloques: ordenados.length,
            cadenaIntegra: !cadenaRota,
            bloqueRoto,
            resultados
        };
    },

    /**
     * Obtiene estadisticas generales de auditoria.
     */
    obtenerEstadisticas: async () => {
        const [ingresos, egresos, activos, archivos] = await Promise.all([
            supabase.from('ingreso').select('id, hash_actual, blockchain_tx_id', { count: 'exact' }),
            supabase.from('egreso').select('id, hash_actual, blockchain_tx_id', { count: 'exact' }),
            supabase.from('activos').select('id, hash_actual, blockchain_tx_id', { count: 'exact' }),
            supabase.from('archivo').select('id, hash_actual, blockchain_tx_id', { count: 'exact' })
        ]);

        const contar = (resultado) => {
            const data = resultado.data || [];
            return {
                total: data.length,
                sellados: data.filter(r => r.hash_actual).length,
                enBlockchain: data.filter(r => r.blockchain_tx_id).length
            };
        };

        return {
            ingreso: contar(ingresos),
            egreso: contar(egresos),
            activo: contar(activos),
            archivo: contar(archivos)
        };
    }
};
