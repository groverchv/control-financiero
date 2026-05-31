import { supabase } from './supabase';

const BLOCKCHAIN_API = import.meta.env.VITE_BLOCKCHAIN_API_URL || 'http://localhost:3001';

/**
 * Cliente HTTP para comunicarse con la API Gateway del blockchain.
 * Actua como proxy entre el frontend React y Hyperledger Fabric.
 */
async function request(endpoint, options = {}) {
    const url = `${BLOCKCHAIN_API}/api/audit${endpoint}`;
    const config = {
        headers: { 'Content-Type': 'application/json' },
        ...options,
    };

    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.detalle || data.error || 'Error en la API del blockchain');
    }

    return data;
}

export const blockchainService = {
    /**
     * Verifica si la API del blockchain esta disponible.
     */
    healthCheck: async () => {
        try {
            const res = await fetch(`${BLOCKCHAIN_API}/api/health`);
            return res.ok;
        } catch {
            return false;
        }
    },

    /**
     * Envia un hash al ledger de Fabric para sellarlo.
     */
    sellar: async (tipoTabla, idRegistro, hashCalculado, idUsuario) => {
        return request('/sellar', {
            method: 'POST',
            body: JSON.stringify({ tipoTabla, idRegistro, hashCalculado, idUsuario })
        });
    },

    /**
     * Obtiene el sello de un registro desde el ledger.
     */
    consultarSello: async (idRegistro) => {
        return request(`/sello/${idRegistro}`);
    },

    /**
     * Obtiene el historial completo de un registro en el ledger.
     */
    obtenerHistorial: async (idRegistro) => {
        return request(`/historial/${idRegistro}`);
    },

    /**
     * Lista todos los sellos de un tipo de tabla.
     */
    consultarPorTipo: async (tipoTabla) => {
        return request(`/tipo/${tipoTabla}`);
    },

    /**
     * Verifica la integridad de un registro comparando hashes.
     */
    verificar: async (idRegistro, hashRecalculado) => {
        return request('/verificar', {
            method: 'POST',
            body: JSON.stringify({ idRegistro, hashRecalculado })
        });
    },

    /**
     * Orquestador: Sella en Blockchain y actualiza Supabase.
     */
    sellarYActualizar: async (tipoTabla, registro, idUsuario) => {
        try {
            const { id, hash_actual } = registro;
            if (!hash_actual) {
                return null;
            }

            // 1. Sellar en Fabric
            const resultado = await blockchainService.sellar(tipoTabla, id, hash_actual, idUsuario);
            
            // R12: Si no hay txId (el servidor no respondió con éxito), no marcar como sellado
            if (!resultado || !resultado.txId) {
                return null;
            }

            const txId = resultado.txId;

            // 2. Actualizar Supabase con el TxID
            const tablaSupabase = tipoTabla === 'activo' ? 'activos' : tipoTabla;
            const { error } = await supabase
                .from(tablaSupabase)
                .update({ blockchain_tx_id: txId })
                .eq('id', id);

            if (error) throw error;

            return txId;
        } catch {
            return null;
        }
    },

    /**
     * R12: Sellar todos los registros pendientes de una tabla.
     * Útil para procesos de auto-recuperación de sellados fallidos.
     */
    sellarPendientes: async (tipoTabla) => {
        try {
            const tablaSupabase = tipoTabla === 'activo' ? 'activos' : tipoTabla;
            const { data: pendientes, error } = await supabase
                .from(tablaSupabase)
                .select('*')
                .is('blockchain_tx_id', null)
                .not('hash_actual', 'is', null);

            if (error) throw error;
            
            const resultados = [];
            for (const reg of pendientes) {
                const txId = await blockchainService.sellarYActualizar(tipoTabla, reg, 'sistema-auto');
                if (txId) resultados.push({ id: reg.id, txId });
            }
            
            return resultados;
        } catch {
            return [];
        }
    }
};
