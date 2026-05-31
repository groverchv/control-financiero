import { useState, useEffect } from 'react';
import { Shield, ShieldCheck, ShieldAlert, Activity, Database, Link2, CheckCircle2, XCircle, AlertTriangle, ChevronRight, RefreshCw, Lock, ChevronLeft, Network, Info } from 'lucide-react';
import { auditoriaApi } from '../api';
import { Button, Spinner, Modal } from '../../../components/ui';

const TABLAS = [
    { key: 'ingreso', label: 'Ingresos', color: 'emerald' },
    { key: 'egreso', label: 'Egresos', color: 'rose' },
    { key: 'activo', label: 'Activos', color: 'blue' },
    { key: 'archivo', label: 'Archivos', color: 'amber' }
];

export const AuditoriaPage = () => {
    const [stats, setStats] = useState(null);
    const [redOnline, setRedOnline] = useState(null);
    const [loading, setLoading] = useState(true);
    const [tablaActiva, setTablaActiva] = useState(null);
    const [verificando, setVerificando] = useState(false);
    const [resultadoCadena, setResultadoCadena] = useState(null);
    const [registros, setRegistros] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;
    const [detalleModal, setDetalleModal] = useState({ open: false, registro: null, resultado: null, loading: false });
    const [redDetallesModal, setRedDetallesModal] = useState(false);

    const cargarDatos = async () => {
        setLoading(true);
        try {
            const [estadisticas, online] = await Promise.all([
                auditoriaApi.obtenerEstadisticas(),
                auditoriaApi.verificarConexion()
            ]);
            setStats(estadisticas);
            setRedOnline(online);
        } catch (err) {
            console.error('Error cargando estadisticas:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        cargarDatos();
    }, []);

    const seleccionarTabla = async (tabla) => {
        setTablaActiva(tabla);
        setResultadoCadena(null);
        setCurrentPage(1);
        try {
            const data = await auditoriaApi.obtenerRegistros(tabla);
            setRegistros(data);
        } catch (err) {
            console.error('Error cargando registros:', err);
        }
    };

    const ejecutarVerificacion = async () => {
        if (!tablaActiva) return;
        setVerificando(true);
        try {
            const resultado = await auditoriaApi.verificarCadena(tablaActiva);
            setResultadoCadena(resultado);
        } catch (err) {
            console.error('Error en verificacion:', err);
        } finally {
            setVerificando(false);
        }
    };

    const verificarRegistroIndividual = async (registro) => {
        setDetalleModal({ open: true, registro, resultado: null, loading: true });
        try {
            const resultado = await auditoriaApi.verificarRegistro(tablaActiva, registro);
            setDetalleModal(prev => ({ ...prev, resultado, loading: false }));
        } catch (err) {
            console.error('Error al verificar registro individual:', err);
            setDetalleModal(prev => ({ ...prev, loading: false }));
        }
    };

    const totalSellados = stats ? Object.values(stats).reduce((sum, s) => sum + s.sellados, 0) : 0;
    const totalRegistros = stats ? Object.values(stats).reduce((sum, s) => sum + s.total, 0) : 0;

    if (loading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <Spinner size="lg" />
                    <p className="text-sm text-slate-500">Conectando con el sistema de auditoria...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <header>
                <div className="flex items-center gap-3 mb-1">
                    <div className="h-10 w-10 rounded-xl bg-slate-900 flex items-center justify-center">
                        <Shield className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-semibold text-slate-900">Auditoria Blockchain</h1>
                        <p className="text-sm text-slate-500">Verificacion de integridad criptografica de registros financieros</p>
                    </div>
                </div>
            </header>

            {/* Estado de la red */}
            <div className="grid gap-4 md:grid-cols-4">
                <div className="rounded-xl bg-white p-5 shadow-sm border border-slate-100 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Red Fabric</span>
                            <div className={`h-2.5 w-2.5 rounded-full ${redOnline ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                        </div>
                        <p className={`text-lg font-bold ${redOnline ? 'text-emerald-700' : 'text-red-600'}`}>
                            {redOnline ? 'Operativa' : 'Desconectada'}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1">Hyperledger Fabric v2.5</p>
                    </div>
                    <button 
                        onClick={() => setRedDetallesModal(true)}
                        className="mt-4 text-[10px] font-bold text-blue-600 uppercase tracking-wider hover:underline flex items-center gap-1 w-fit"
                    >
                        <Network className="h-3 w-3" />
                        Ver detalles y nodos
                    </button>
                </div>

                <div className="rounded-xl bg-white p-5 shadow-sm border border-slate-100">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Registros</span>
                        <Database className="h-4 w-4 text-slate-300" />
                    </div>
                    <p className="text-2xl font-bold text-slate-900">{totalRegistros}</p>
                    <p className="text-[10px] text-slate-400 mt-1">En las 4 tablas protegidas</p>
                </div>

                <div className="rounded-xl bg-white p-5 shadow-sm border border-slate-100">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Sellados</span>
                        <Lock className="h-4 w-4 text-slate-300" />
                    </div>
                    <p className="text-2xl font-bold text-emerald-700">{totalSellados}</p>
                    <p className="text-[10px] text-slate-400 mt-1">Con hash SHA-256 interno</p>
                </div>

                <div className="rounded-xl bg-white p-5 shadow-sm border border-slate-100">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Cobertura</span>
                        <Activity className="h-4 w-4 text-slate-300" />
                    </div>
                    <p className="text-2xl font-bold text-slate-900">
                        {totalRegistros > 0 ? Math.round((totalSellados / totalRegistros) * 100) : 0}%
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">Registros protegidos</p>
                </div>
            </div>

            {/* Detalle por tabla */}
            <div className="grid gap-4 md:grid-cols-4">
                {TABLAS.map(t => {
                    const s = stats?.[t.key] || { total: 0, sellados: 0, enBlockchain: 0 };
                    const activa = tablaActiva === t.key;
                    return (
                        <button
                            key={t.key}
                            onClick={() => seleccionarTabla(t.key)}
                            className={`rounded-xl p-5 text-left transition-all border-2 ${
                                activa
                                    ? 'bg-slate-900 text-white border-slate-900 shadow-lg'
                                    : 'bg-white text-slate-900 border-slate-100 hover:border-slate-300 shadow-sm'
                            }`}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className={`text-xs font-bold uppercase tracking-widest ${activa ? 'text-slate-400' : 'text-slate-400'}`}>
                                    {t.label}
                                </span>
                                <ChevronRight className={`h-4 w-4 transition-transform ${activa ? 'rotate-90 text-white' : 'text-slate-300'}`} />
                            </div>
                            <p className="text-2xl font-bold">{s.total}</p>
                            <div className="flex items-center gap-3 mt-2">
                                <span className={`text-[10px] font-bold ${activa ? 'text-emerald-400' : 'text-emerald-600'}`}>
                                    {s.sellados} sellados
                                </span>
                                {s.enBlockchain > 0 && (
                                    <span className={`text-[10px] font-bold ${activa ? 'text-blue-400' : 'text-blue-600'}`}>
                                        {s.enBlockchain} en blockchain
                                    </span>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Panel de verificacion */}
            {tablaActiva && (
                <section className="rounded-xl bg-white p-6 shadow-sm border border-slate-100">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <Link2 className="h-5 w-5 text-slate-400" />
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">
                                    Cadena de {TABLAS.find(t => t.key === tablaActiva)?.label}
                                </h2>
                                <p className="text-xs text-slate-500">{registros.length} registros encontrados</p>
                            </div>
                        </div>
                        <Button onClick={ejecutarVerificacion} disabled={verificando || registros.length === 0}>
                            <RefreshCw className={`h-4 w-4 ${verificando ? 'animate-spin' : ''}`} />
                            {verificando ? 'Verificando...' : 'Verificar cadena'}
                        </Button>
                    </div>

                    {/* Resultado de verificacion */}
                    {resultadoCadena && (
                        <div className={`mb-6 rounded-xl p-5 border-2 ${
                            resultadoCadena.cadenaIntegra
                                ? 'bg-emerald-50 border-emerald-200'
                                : 'bg-red-50 border-red-200'
                        }`}>
                            <div className="flex items-center gap-3 mb-2">
                                {resultadoCadena.cadenaIntegra
                                    ? <ShieldCheck className="h-6 w-6 text-emerald-600" />
                                    : <ShieldAlert className="h-6 w-6 text-red-600" />
                                }
                                <div>
                                    <p className={`font-bold text-lg ${resultadoCadena.cadenaIntegra ? 'text-emerald-800' : 'text-red-800'}`}>
                                        {resultadoCadena.cadenaIntegra ? 'Cadena Integra' : 'Cadena Comprometida'}
                                    </p>
                                    <p className={`text-sm ${resultadoCadena.cadenaIntegra ? 'text-emerald-600' : 'text-red-600'}`}>
                                        {resultadoCadena.cadenaIntegra
                                            ? `Los ${resultadoCadena.totalBloques} bloques verificados son autenticos.`
                                            : `Se detecto una alteracion en el bloque #${resultadoCadena.bloqueRoto}.`
                                        }
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tabla de bloques */}
                    {resultadoCadena && resultadoCadena.resultados.length > 0 && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                                    <tr>
                                        <th className="px-4 py-3">Bloque</th>
                                        <th className="px-4 py-3">ID Registro</th>
                                        <th className="px-4 py-3">Hash (parcial)</th>
                                        <th className="px-4 py-3">Hash DB</th>
                                        <th className="px-4 py-3">Cadena</th>
                                        <th className="px-4 py-3">Estado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {resultadoCadena.resultados.map(r => (
                                        <tr key={r.id} className={`${r.integro ? 'hover:bg-slate-50' : 'bg-red-50'}`}>
                                            <td className="px-4 py-3 font-mono text-xs font-bold">#{r.bloque}</td>
                                            <td className="px-4 py-3 font-mono text-[10px] text-slate-500">{r.id.substring(0, 8)}...</td>
                                            <td className="px-4 py-3 font-mono text-[10px]">{r.hashRecalculado}</td>
                                            <td className="px-4 py-3">
                                                {r.hashCoincide
                                                    ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                                    : <XCircle className="h-4 w-4 text-red-600" />
                                                }
                                            </td>
                                            <td className="px-4 py-3">
                                                {r.encadenamientoCorrecto
                                                    ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                                    : <XCircle className="h-4 w-4 text-red-600" />
                                                }
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                                                    r.integro ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                                                }`}>
                                                    {r.integro ? 'Valido' : 'Alterado'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Lista de registros sin verificar */}
                    {!resultadoCadena && registros.length > 0 && (
                        <>
                            <div className="space-y-2">
                                {registros.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map(reg => (
                                    <div key={reg.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3 border border-slate-100">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                                                reg.hash_actual ? 'bg-emerald-100' : 'bg-slate-200'
                                            }`}>
                                                {reg.hash_actual
                                                    ? <Lock className="h-3.5 w-3.5 text-emerald-700" />
                                                    : <AlertTriangle className="h-3.5 w-3.5 text-slate-400" />
                                                }
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-bold text-slate-900 truncate">
                                                        {reg.descripcion || reg.concepto || reg.nombre || reg.url?.split('/').pop() || reg.id}
                                                    </p>
                                                    {(reg.monto || reg.costo_total) && (
                                                        <span className="text-xs font-black text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                                                            Bs. {Number(reg.monto || reg.costo_total).toLocaleString('de-DE', { minimumFractionDigits: 2 })}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <p className="text-[10px] text-slate-400 font-mono">{reg.id.substring(0, 18)}...</p>
                                                    {(reg.fecha || reg.fechaAdquisicion) && (
                                                        <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                                            • {new Date((reg.fecha || reg.fechaAdquisicion) + 'T00:00:00').toLocaleDateString('es-ES')}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 shrink-0">
                                            {reg.hash_actual && (
                                                <span className="text-[10px] font-mono text-slate-400">
                                                    {reg.hash_actual.substring(0, 12)}...
                                                </span>
                                            )}
                                            <button
                                                onClick={() => verificarRegistroIndividual(reg)}
                                                className="rounded-lg bg-slate-900 px-3 py-1.5 text-[10px] font-bold text-white uppercase tracking-wider hover:bg-slate-800 transition-colors"
                                            >
                                                Verificar
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {Math.ceil(registros.length / ITEMS_PER_PAGE) > 1 && (
                                <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-4">
                                    <p className="text-xs text-slate-500">
                                        Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} a {Math.min(currentPage * ITEMS_PER_PAGE, registros.length)} de {registros.length} registros
                                    </p>
                                    <div className="flex items-center gap-1">
                                        <Button 
                                            variant="outline" 
                                            className="h-8 px-2 text-xs" 
                                            disabled={currentPage === 1}
                                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        >
                                            <ChevronLeft className="h-4 w-4 mr-1" />
                                            Anterior
                                        </Button>
                                        <Button 
                                            variant="outline" 
                                            className="h-8 px-2 text-xs" 
                                            disabled={currentPage === Math.ceil(registros.length / ITEMS_PER_PAGE)}
                                            onClick={() => setCurrentPage(p => Math.min(Math.ceil(registros.length / ITEMS_PER_PAGE), p + 1))}
                                        >
                                            Siguiente
                                            <ChevronRight className="h-4 w-4 ml-1" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </section>
            )}

            {/* Modal de verificacion individual */}
            <Modal
                isOpen={detalleModal.open}
                onClose={() => setDetalleModal({ open: false, registro: null, resultado: null, loading: false })}
                title="Verificacion de Integridad"
                width="max-w-lg"
            >
                {detalleModal.loading ? (
                    <div className="flex flex-col items-center gap-3 py-8">
                        <Spinner size="lg" />
                        <p className="text-sm text-slate-500">Recalculando hash y verificando...</p>
                    </div>
                ) : detalleModal.resultado && (
                    <div className="space-y-4">
                        <div className={`rounded-xl p-4 border-2 ${
                            detalleModal.resultado.integridadTotal
                                ? 'bg-emerald-50 border-emerald-200'
                                : 'bg-red-50 border-red-200'
                        }`}>
                            <div className="flex items-center gap-3">
                                {detalleModal.resultado.integridadTotal
                                    ? <ShieldCheck className="h-8 w-8 text-emerald-600" />
                                    : <ShieldAlert className="h-8 w-8 text-red-600" />
                                }
                                <div>
                                    <p className={`font-bold ${detalleModal.resultado.integridadTotal ? 'text-emerald-800' : 'text-red-800'}`}>
                                        {detalleModal.resultado.integridadTotal ? 'Registro Autentico' : 'Posible Alteracion'}
                                    </p>
                                    <p className={`text-xs ${detalleModal.resultado.integridadTotal ? 'text-emerald-600' : 'text-red-600'}`}>
                                        {detalleModal.resultado.integridadTotal
                                            ? 'El hash recalculado coincide con el almacenado.'
                                            : 'Los datos actuales no coinciden con el sello original.'
                                        }
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3 text-sm">
                            <div className="rounded-lg bg-slate-50 p-3 border border-slate-100">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Hash Almacenado (BD)</p>
                                <p className="font-mono text-xs text-slate-700 break-all">{detalleModal.resultado.hashAlmacenado || 'Sin hash'}</p>
                            </div>
                            <div className="rounded-lg bg-slate-50 p-3 border border-slate-100">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Hash Recalculado (Local)</p>
                                <p className="font-mono text-xs text-slate-700 break-all">{detalleModal.resultado.hashRecalculado}</p>
                            </div>
                            {detalleModal.resultado.blockchain && (
                                <div className={`rounded-lg p-3 border ${
                                    detalleModal.resultado.blockchain.verificado
                                        ? 'bg-blue-50 border-blue-200'
                                        : 'bg-amber-50 border-amber-200'
                                }`}>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Blockchain (Fabric)</p>
                                    <p className="text-xs font-medium">
                                        {detalleModal.resultado.blockchain.mensaje}
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="pt-2 border-t">
                            <Button
                                onClick={() => setDetalleModal({ open: false, registro: null, resultado: null, loading: false })}
                                className="w-full"
                            >
                                Cerrar
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Modal de Diagnostico de Red */}
            <Modal
                isOpen={redDetallesModal}
                onClose={() => setRedDetallesModal(false)}
                title="Topología y Diagnóstico de Red Fabric"
                width="max-w-2xl"
            >
                <div className="space-y-6">
                    <div className="rounded-xl bg-slate-50 p-4 border border-slate-100 text-sm">
                        <p className="text-slate-600 mb-2">
                            El sistema utiliza una arquitectura de <strong>Blockchain Híbrido</strong>. Las transacciones se almacenan en la base de datos principal (Supabase) y simultáneamente se sellan criptográficamente en una red de <strong>Hyperledger Fabric</strong> para garantizar su inmutabilidad.
                        </p>
                        {redOnline ? (
                            <div className="flex items-center gap-2 text-emerald-700 font-bold bg-emerald-100 px-3 py-2 rounded-lg mt-3">
                                <CheckCircle2 className="h-4 w-4" /> La conexión de la API Gateway con los nodos está establecida correctamente.
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-red-700 font-bold bg-red-100 px-3 py-2 rounded-lg mt-3">
                                <AlertTriangle className="h-4 w-4 shrink-0" /> 
                                <span>La API Gateway está en <strong>MODO OFFLINE</strong> (Fallback en memoria local) debido a la pérdida de conexión con los nodos.</span>
                            </div>
                        )}
                    </div>

                    <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 border-b pb-2 flex items-center gap-2">
                            <Network className="h-4 w-4" /> Parámetros de Conexión
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                                <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">API Gateway Proxy</p>
                                <p className="text-sm font-mono text-slate-800">http://localhost:3001</p>
                                <p className="text-[10px] text-slate-500 mt-1">Intermediario REST hacia Fabric</p>
                            </div>
                            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                                <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Nodo Peer</p>
                                <p className="text-sm font-mono text-slate-800">peer0.org1 (Port: 7051)</p>
                                <p className="text-[10px] text-slate-500 mt-1">Almacena el Ledger y Smart Contracts</p>
                            </div>
                            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                                <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Canal (Channel)</p>
                                <p className="text-sm font-mono text-slate-800">auditchannel</p>
                                <p className="text-[10px] text-slate-500 mt-1">Subred privada de transacciones</p>
                            </div>
                            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                                <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Smart Contract</p>
                                <p className="text-sm font-mono text-slate-800">audit (Chaincode)</p>
                                <p className="text-[10px] text-slate-500 mt-1">Lógica de sellado y verificación</p>
                            </div>
                            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                                <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Identidad (MSP)</p>
                                <p className="text-sm font-mono text-slate-800">Org1MSP</p>
                                <p className="text-[10px] text-slate-500 mt-1">Autoridad criptográfica de validación</p>
                            </div>
                            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                                <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Seguridad gRPC</p>
                                <p className="text-sm font-mono text-emerald-600 font-bold">TLS v1.2 Activo</p>
                                <p className="text-[10px] text-slate-500 mt-1">Comunicación encriptada con certificados</p>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 border-b pb-2 flex items-center gap-2">
                            <Info className="h-4 w-4" /> Guía Rápida de Solución de Fallas
                        </h4>
                        <ul className="text-xs text-slate-600 space-y-3 list-disc pl-5">
                            <li>
                                <strong>La API no responde (Desconectada):</strong> Verifique que el servidor Node.js de la API esté ejecutándose. Abra la terminal y ejecute <code className="bg-slate-100 text-rose-600 px-1 py-0.5 rounded font-mono">npm run dev</code> en el directorio <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">blockchain/api</code>.
                            </li>
                            <li>
                                <strong>Modo Offline Activo:</strong> Si la API se ejecuta pero el estado es offline, los contenedores Docker están caídos. Ejecute <code className="bg-slate-100 text-rose-600 px-1 py-0.5 rounded font-mono">./init-network.sh up</code> en <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">blockchain/scripts</code> para levantar la red Hyperledger Fabric.
                            </li>
                            <li>
                                <strong>Fallo de credenciales (MSP):</strong> Asegúrese de que los certificados criptográficos en <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">blockchain/organizations</code> existan y coincidan con el archivo `.env` de la API Gateway.
                            </li>
                            <li>
                                <strong>Error de CORS:</strong> Verifique que la variable <code className="bg-slate-100 text-rose-600 px-1 py-0.5 rounded font-mono">VITE_BLOCKCHAIN_API_URL</code> exista en su archivo <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">.env.local</code> del frontend.
                            </li>
                        </ul>
                    </div>
                </div>
            </Modal>
        </div>
    );
};
