import { useState, useEffect } from 'react';
import { Shield, ShieldCheck, ShieldAlert, ArrowLeft, RefreshCw, Lock, CheckCircle2, XCircle, Database } from 'lucide-react';
import { Link } from 'react-router-dom';
import { auditoriaApi } from '../api';
import { Spinner } from '../../../components/ui';

const TABLAS = [
    { key: 'ingreso', label: 'Ingresos', desc: 'Cuotas, aportes y donaciones' },
    { key: 'egreso', label: 'Egresos', desc: 'Pagos y gastos operativos' },
    { key: 'activo', label: 'Activos', desc: 'Patrimonio institucional' },
    { key: 'archivo', label: 'Archivos', desc: 'Comprobantes y evidencias digitales' }
];

export const TransparenciaPage = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [tablaActiva, setTablaActiva] = useState(null);
    const [verificando, setVerificando] = useState(false);
    const [resultado, setResultado] = useState(null);

    const cargarEstadisticas = async () => {
        setLoading(true);
        try {
            const data = await auditoriaApi.obtenerEstadisticas();
            setStats(data);
        } catch (err) {
            console.error('Error cargando estadisticas:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargarEstadisticas();
    }, []);

    const ejecutarVerificacion = async (tabla) => {
        setTablaActiva(tabla);
        setVerificando(true);
        setResultado(null);
        try {
            const res = await auditoriaApi.verificarCadena(tabla);
            setResultado(res);
        } catch (err) {
            console.error('Error en verificacion:', err);
        } finally {
            setVerificando(false);
        }
    };

    const totalRegistros = stats ? Object.values(stats).reduce((sum, s) => sum + s.total, 0) : 0;
    const totalSellados = stats ? Object.values(stats).reduce((sum, s) => sum + s.sellados, 0) : 0;

    if (loading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <Spinner size="lg" />
                    <p className="text-sm text-slate-500">Cargando portal de transparencia...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fadeIn pb-20">
            <header>
                <Link to="/inicio" className="inline-flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700 mb-4 transition-colors">
                    <ArrowLeft className="h-4 w-4" /> Volver al inicio
                </Link>
                <div className="flex items-center gap-3 mb-2">
                    <div className="h-12 w-12 rounded-2xl bg-slate-900 flex items-center justify-center">
                        <Shield className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Portal de Transparencia</h1>
                        <p className="text-slate-500 text-sm">Verifica la integridad de los registros financieros de la institucion.</p>
                    </div>
                </div>
            </header>

            {/* Resumen */}
            <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
                    <Database className="h-5 w-5 text-slate-400 mb-3" />
                    <p className="text-3xl font-bold text-slate-900">{totalRegistros}</p>
                    <p className="text-sm text-slate-500 mt-1">Registros financieros</p>
                </div>
                <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
                    <Lock className="h-5 w-5 text-emerald-500 mb-3" />
                    <p className="text-3xl font-bold text-emerald-700">{totalSellados}</p>
                    <p className="text-sm text-slate-500 mt-1">Sellados con SHA-256</p>
                </div>
                <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
                    <ShieldCheck className="h-5 w-5 text-blue-500 mb-3" />
                    <p className="text-3xl font-bold text-slate-900">
                        {totalRegistros > 0 ? Math.round((totalSellados / totalRegistros) * 100) : 0}%
                    </p>
                    <p className="text-sm text-slate-500 mt-1">Cobertura de proteccion</p>
                </div>
            </div>

            {/* Seleccion de tabla */}
            <section className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
                <h2 className="text-lg font-bold text-slate-900 mb-1">Selecciona una categoria para verificar</h2>
                <p className="text-sm text-slate-500 mb-5">
                    El sistema recalculara los hashes de cada registro y comprobara el encadenamiento criptografico.
                </p>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {TABLAS.map(t => {
                        const s = stats?.[t.key] || { total: 0, sellados: 0 };
                        const activa = tablaActiva === t.key;
                        return (
                            <button
                                key={t.key}
                                onClick={() => ejecutarVerificacion(t.key)}
                                disabled={verificando}
                                className={`rounded-xl p-5 text-left border-2 transition-all ${
                                    activa
                                        ? 'bg-slate-900 text-white border-slate-900'
                                        : 'bg-slate-50 text-slate-900 border-slate-100 hover:border-slate-300'
                                } ${verificando ? 'opacity-60 cursor-wait' : ''}`}
                            >
                                <p className="font-bold text-base">{t.label}</p>
                                <p className={`text-xs mt-0.5 ${activa ? 'text-slate-400' : 'text-slate-500'}`}>{t.desc}</p>
                                <div className="flex items-center gap-2 mt-3">
                                    <span className={`text-xs font-bold ${activa ? 'text-emerald-400' : 'text-emerald-600'}`}>
                                        {s.sellados}/{s.total} sellados
                                    </span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </section>

            {/* Resultado */}
            {verificando && (
                <div className="flex flex-col items-center gap-3 py-12">
                    <RefreshCw className="h-8 w-8 text-slate-400 animate-spin" />
                    <p className="text-sm text-slate-500">Verificando la cadena de {TABLAS.find(t => t.key === tablaActiva)?.label}...</p>
                    <p className="text-xs text-slate-400">Recalculando hash SHA-256 de cada bloque</p>
                </div>
            )}

            {resultado && !verificando && (
                <section className="space-y-4">
                    <div className={`rounded-2xl p-6 border-2 ${
                        resultado.cadenaIntegra
                            ? 'bg-emerald-50 border-emerald-200'
                            : 'bg-red-50 border-red-200'
                    }`}>
                        <div className="flex items-center gap-4">
                            {resultado.cadenaIntegra
                                ? <ShieldCheck className="h-10 w-10 text-emerald-600 shrink-0" />
                                : <ShieldAlert className="h-10 w-10 text-red-600 shrink-0" />
                            }
                            <div>
                                <p className={`text-xl font-bold ${resultado.cadenaIntegra ? 'text-emerald-800' : 'text-red-800'}`}>
                                    {resultado.cadenaIntegra ? 'Cadena Verificada' : 'Inconsistencia Detectada'}
                                </p>
                                <p className={`text-sm mt-1 ${resultado.cadenaIntegra ? 'text-emerald-700' : 'text-red-700'}`}>
                                    {resultado.cadenaIntegra
                                        ? `Se verificaron ${resultado.totalBloques} bloques. Todos los registros son autenticos e inalterados.`
                                        : `Se detecto una posible alteracion en el bloque #${resultado.bloqueRoto}. Los datos podrian haber sido modificados.`
                                    }
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Tabla de resultados */}
                    <div className="rounded-2xl bg-white shadow-sm border border-slate-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b">
                                    <tr>
                                        <th className="px-4 py-3">Bloque</th>
                                        <th className="px-4 py-3">ID</th>
                                        <th className="px-4 py-3">Hash Recalculado</th>
                                        <th className="px-4 py-3 text-center">Contenido</th>
                                        <th className="px-4 py-3 text-center">Cadena</th>
                                        <th className="px-4 py-3 text-center">Veredicto</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {resultado.resultados.map(r => (
                                        <tr key={r.id} className={r.integro ? '' : 'bg-red-50'}>
                                            <td className="px-4 py-3 font-mono text-xs font-bold text-slate-700">#{r.bloque}</td>
                                            <td className="px-4 py-3 font-mono text-[10px] text-slate-400">{r.id.substring(0, 8)}...</td>
                                            <td className="px-4 py-3 font-mono text-[10px] text-slate-500">{r.hashRecalculado}</td>
                                            <td className="px-4 py-3 text-center">
                                                {r.hashCoincide
                                                    ? <CheckCircle2 className="h-4 w-4 text-emerald-600 mx-auto" />
                                                    : <XCircle className="h-4 w-4 text-red-600 mx-auto" />
                                                }
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {r.encadenamientoCorrecto
                                                    ? <CheckCircle2 className="h-4 w-4 text-emerald-600 mx-auto" />
                                                    : <XCircle className="h-4 w-4 text-red-600 mx-auto" />
                                                }
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                                                    r.integro ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                                                }`}>
                                                    {r.integro ? 'Integro' : 'Alterado'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>
            )}
        </div>
    );
};
