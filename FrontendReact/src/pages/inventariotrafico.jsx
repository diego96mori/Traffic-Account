import { useEffect, useMemo, useState } from "react";
import Sidebar from "../components/Sidebar";
import api from "../service/api";
import { crearPdfInventario } from "../utils/inventarioPdf";
import { descargarExcelInventario } from "../utils/inventarioExcel";
import { iniciarPollingSeguro } from "../utils/polling";

const MESES = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

const clavePeriodo = (anio, mes) => `${anio}-${String(mes).padStart(2, "0")}`;

function moverMes(periodo, diferencia) {
    const fecha = new Date(periodo.anio, periodo.mes - 1 + diferencia, 1);
    return { anio: fecha.getFullYear(), mes: fecha.getMonth() + 1 };
}

function formatoNumero(valor, decimales = 2) {
    const numero = Number(valor);
    if (!Number.isFinite(numero)) return "—";
    return numero.toLocaleString("es-PE", {
        minimumFractionDigits: decimales,
        maximumFractionDigits: decimales
    });
}

function obtenerDecision(porcentaje) {
    const valor = Number(porcentaje);
    if (!Number.isFinite(valor)) return { texto: "Sin datos", nivel: "neutral" };
    if (valor >= 70) return { texto: "Upgrade", nivel: "upgrade" };
    if (valor >= 50) return { texto: "Revisar", nivel: "revisar" };
    return { texto: "Normal", nivel: "normal" };
}

function numeroOpcional(valor) {
    if (valor == null || valor === "") return null;
    const numero = Number(valor);
    return Number.isFinite(numero) ? numero : null;
}

function normalizarCpu(valor) {
    if (valor == null || String(valor).trim() === "") return null;
    const numero = Number(String(valor).replace(",", "."));
    return Number.isFinite(numero) ? numero : NaN;
}

function InventarioTrafico() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [trafico, setTrafico] = useState([]);
    const [enlaces, setEnlaces] = useState([]);
    const [cpu, setCpu] = useState({});
    const [nodoSeleccionado, setNodoSeleccionado] = useState("");
    const [mesSeleccionado, setMesSeleccionado] = useState("2026-07");
    const [decisionSeleccionada, setDecisionSeleccionada] = useState("");
    const [filasEnEdicion, setFilasEnEdicion] = useState([]);
    const [filaGuardando, setFilaGuardando] = useState(null);
    const [mensajeGuardado, setMensajeGuardado] = useState("");
    const [generandoExcel, setGenerandoExcel] = useState(false);

    const cargarInventario = async (incluirCpu = false) => {
        try {
            const response = await api.get("/inventario-trafico");
            setTrafico(response.data.trafico || []);
            setEnlaces((response.data.enlaces || []).map(enlace => ({
                billId: Number(enlace.bill_id),
                nombre: enlace.bill_name,
                nodos: enlace.nodos || []
            })));
            if (incluirCpu) {
                const cpuCargado = {};
                (response.data.cpu || []).forEach(item => {
                    const clave = `${item.bill_id}-${clavePeriodo(item.anio, item.mes)}`;
                    cpuCargado[clave] = {
                        maximo: item.cpu_maximo == null ? "" : String(item.cpu_maximo),
                        promedio: item.cpu_promedio == null ? "" : String(item.cpu_promedio)
                    };
                });
                setCpu(cpuCargado);
            }
            setError("");
        } catch (errorPeticion) {
            console.error(errorPeticion);
            setError("No se pudo cargar el inventario de tráfico.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        return iniciarPollingSeguro(cargarInventario);
    }, []);

    const periodos = useMemo(() => {
        const [anio, mes] = mesSeleccionado.split("-").map(Number);
        const actual = { anio, mes };
        return [
            moverMes(actual, -1),
            actual
        ];
    }, [mesSeleccionado]);

    const nodos = useMemo(
        () => [...new Set(enlaces.flatMap(enlace => enlace.nodos))]
            .sort((a, b) => a.localeCompare(b)),
        [enlaces]
    );

    const opcionesMes = useMemo(() => {
        const opciones = new Map();
        trafico.forEach(item => {
            const anio = Number(item.anio);
            const mes = Number(item.mes);
            if (Number.isFinite(anio) && mes >= 1 && mes <= 12) {
                opciones.set(clavePeriodo(anio, mes), { anio, mes });
            }
        });
        Object.keys(cpu).forEach(clave => {
            const partes = clave.split("-");
            const anio = Number(partes[1]);
            const mes = Number(partes[2]);
            if (Number.isFinite(anio) && mes >= 1 && mes <= 12) {
                opciones.set(clavePeriodo(anio, mes), { anio, mes });
            }
        });
        opciones.set("2026-07", { anio: 2026, mes: 7 });
        return [...opciones.values()].sort((a, b) =>
            a.anio === b.anio ? b.mes - a.mes : b.anio - a.anio
        );
    }, [cpu, trafico]);

    const enlacesVisibles = useMemo(
        () => nodoSeleccionado
            ? enlaces.filter(enlace => enlace.nodos.includes(nodoSeleccionado))
            : enlaces,
        [enlaces, nodoSeleccionado]
    );

    const traficoPorEnlacePeriodo = useMemo(() => {
        const mapa = new Map();
        trafico.forEach(item => {
            const clave = `${item.bill_id}-${clavePeriodo(item.anio, item.mes)}`;
            if (!mapa.has(clave)) mapa.set(clave, item);
        });
        return mapa;
    }, [trafico]);

    const cambiarCpu = (billId, periodo, campo, valor) => {
        const clave = `${billId}-${clavePeriodo(periodo.anio, periodo.mes)}`;
        setCpu(actual => ({
            ...actual,
            [clave]: {
                maximo: actual[clave]?.maximo ?? "",
                promedio: actual[clave]?.promedio ?? "",
                [campo]: valor
            }
        }));
        setMensajeGuardado("");
    };

    const filasReporte = useMemo(() => {
        const filas = enlacesVisibles.map(enlace => ({
            billId: enlace.billId,
            nombre: enlace.nombre,
            nodos: [...enlace.nodos].sort((a, b) =>
                a.localeCompare(b, "es", { sensitivity: "base", numeric: true })
            ),
            datosPeriodos: periodos.map(periodo => {
                const periodoClave = clavePeriodo(periodo.anio, periodo.mes);
                const clave = `${enlace.billId}-${periodoClave}`;
                const registro = traficoPorEnlacePeriodo.get(clave);
                const anterior = moverMes(periodo, -1);
                const registroAnterior = traficoPorEnlacePeriodo.get(
                    `${enlace.billId}-${clavePeriodo(anterior.anio, anterior.mes)}`
                );
                const uso = numeroOpcional(registro?.porcentaje_uso);
                const usoAnterior = numeroOpcional(registroAnterior?.porcentaje_uso);

                return {
                    periodo,
                    clave,
                    registro,
                    uso,
                    variacion: uso != null && usoAnterior != null ? uso - usoAnterior : null,
                    decision: obtenerDecision(registro?.porcentaje_uso),
                    valoresCpu: cpu[clave] || { maximo: "", promedio: "" }
                };
            })
        }));

        const filasFiltradas = decisionSeleccionada
            ? filas.filter(fila =>
                fila.datosPeriodos.at(-1)?.decision.nivel === decisionSeleccionada
            )
            : filas;

        return filasFiltradas.sort((a, b) => {
                const nodoA = nodoSeleccionado || a.nodos[0] || "";
                const nodoB = nodoSeleccionado || b.nodos[0] || "";
                const porNodo = nodoA.localeCompare(
                    nodoB,
                    "es",
                    { sensitivity: "base", numeric: true }
                );
                if (porNodo !== 0) return porNodo;
                return a.nombre.localeCompare(
                    b.nombre,
                    "es",
                    { sensitivity: "base", numeric: true }
                );
            });
    }, [
        cpu,
        decisionSeleccionada,
        enlacesVisibles,
        nodoSeleccionado,
        periodos,
        traficoPorEnlacePeriodo
    ]);

    const habilitarEdicion = (billId) => {
        setFilasEnEdicion(actual => actual.includes(billId) ? actual : [...actual, billId]);
        setMensajeGuardado("");
    };

    const guardarCpuFila = async (billId) => {
        const clavesFila = periodos.map(periodo =>
            `${billId}-${clavePeriodo(periodo.anio, periodo.mes)}`
        );
        const registros = clavesFila.map(clave => {
            const [, anio, mes] = clave.split("-").map(Number);
            const valores = cpu[clave] || {};
            return {
                bill_id: billId,
                anio,
                mes,
                cpu_maximo: normalizarCpu(valores.maximo),
                cpu_promedio: normalizarCpu(valores.promedio)
            };
        });

        const invalido = registros.some(registro =>
            [registro.cpu_maximo, registro.cpu_promedio].some(valor =>
                Number.isNaN(valor) || (valor != null && (valor < 0 || valor > 100))
            )
        );
        if (invalido) {
            setMensajeGuardado("Los valores de CPU deben estar entre 0 y 100.");
            return;
        }

        setFilaGuardando(billId);
        setMensajeGuardado("");
        try {
            await api.put("/inventario-trafico/cpu", { registros });
            setFilasEnEdicion(actual => actual.filter(id => id !== billId));
            setMensajeGuardado(`CPU del enlace ${billId} guardado correctamente en el servidor.`);
        } catch (errorPeticion) {
            console.error(errorPeticion);
            setMensajeGuardado("No se pudieron guardar los datos de CPU en el servidor.");
        } finally {
            setFilaGuardando(null);
        }
    };

    const generarReportePdf = () => {
        crearPdfInventario({
            filas: filasReporte,
            periodos,
            meses: MESES,
            nodo: nodoSeleccionado || "TODOS LOS NODOS"
        });
    };

    const generarReporteExcel = async () => {
        setGenerandoExcel(true);
        setMensajeGuardado("");
        try {
            await descargarExcelInventario({
                filas: filasReporte,
                periodos,
                meses: MESES,
                nodo: nodoSeleccionado || "TODOS LOS NODOS",
                decision: decisionSeleccionada
                    ? decisionSeleccionada.charAt(0).toUpperCase() + decisionSeleccionada.slice(1)
                    : "Todas"
            });
            setMensajeGuardado("Reporte Excel generado y descargado correctamente.");
        } catch (errorExcel) {
            console.error(errorExcel);
            setMensajeGuardado("No se pudo generar el reporte Excel.");
        } finally {
            setGenerandoExcel(false);
        }
    };

    if (loading) return <div className="load-message">Cargando Inventario Tráfico...</div>;
    if (error && trafico.length === 0) return <div className="load-error">{error}</div>;

    return (
        <div className="dashboard-layout">
            <Sidebar />
            <main className="dashboard-content inventario-page">
                <header className="inventario-heading">
                    <div>
                        <span>CONTROL DE CAPACIDAD MENSUAL</span>
                        <h1>Inventario Tráfico</h1>
                        <p>{nodoSeleccionado || "Todos los nodos"} · Percentil 95, capacidad, uso y decisión automática</p>
                    </div>
                    <div className="inventario-heading-actions">
                        <div className="inventario-periodo-chip">
                            {MESES[periodos[0].mes - 1]} {periodos[0].anio} — {MESES[periodos[1].mes - 1]} {periodos[1].anio}
                        </div>
                        <button type="button" className="inventario-reporte-btn" onClick={generarReportePdf}>
                            Reporte PDF
                        </button>
                        <button
                            type="button"
                            className="inventario-reporte-btn inventario-reporte-excel-btn"
                            onClick={generarReporteExcel}
                            disabled={generandoExcel}
                        >
                            {generandoExcel ? "Generando Excel..." : "Reporte Excel"}
                        </button>
                    </div>
                </header>

                <section className="inventario-leyenda" aria-label="Reglas de toma de decisión">
                    <strong>Toma de decisión:</strong>
                    <span className="decision-normal">Normal &lt; 50%</span>
                    <span className="decision-revisar">Revisar ≥ 50% y &lt; 70%</span>
                    <span className="decision-upgrade">Upgrade ≥ 70%</span>
                </section>

                <section className="inventario-filtros" aria-label="Filtros del inventario">
                    <label>
                        <span>Nodo</span>
                        <select value={nodoSeleccionado} onChange={event => setNodoSeleccionado(event.target.value)}>
                            <option value="">Todos</option>
                            {nodos.map(nodo => <option key={nodo} value={nodo}>{nodo}</option>)}
                        </select>
                    </label>
                    <label>
                        <span>Mes</span>
                        <select value={mesSeleccionado} onChange={event => setMesSeleccionado(event.target.value)}>
                            {opcionesMes.map(periodo => (
                                <option key={clavePeriodo(periodo.anio, periodo.mes)} value={clavePeriodo(periodo.anio, periodo.mes)}>
                                    {MESES[periodo.mes - 1]} {periodo.anio}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label>
                        <span>Toma de decisi&oacute;n</span>
                        <select
                            value={decisionSeleccionada}
                            onChange={event => setDecisionSeleccionada(event.target.value)}
                        >
                            <option value="">Todos</option>
                            <option value="normal">Normal</option>
                            <option value="revisar">Revisar</option>
                            <option value="upgrade">Upgrade</option>
                        </select>
                    </label>
                </section>

                {mensajeGuardado && (
                    <div className="inventario-resultado-guardado" role="status">{mensajeGuardado}</div>
                )}

                <section className="inventario-card">
                    <div className="inventario-table-scroll">
                        <table className="inventario-table">
                            <thead>
                                <tr className="inventario-group-row">
                                    <th rowSpan="2">Bill ID</th>
                                    <th rowSpan="2" className="inventario-nodo-col">Nodo / Enlace</th>
                                    {periodos.map(periodo => (
                                        <th colSpan="7" key={clavePeriodo(periodo.anio, periodo.mes)}>
                                            {MESES[periodo.mes - 1]} {periodo.anio}
                                        </th>
                                    ))}
                                    <th rowSpan="2" className="inventario-acciones-heading">Acciones</th>
                                </tr>
                                <tr>
                                    {periodos.flatMap(periodo => [
                                        <th key={`${clavePeriodo(periodo.anio, periodo.mes)}-consumo`}>Consumo P95<br />(Gbps)</th>,
                                        <th key={`${clavePeriodo(periodo.anio, periodo.mes)}-max`}>Consumo Máximo<br />CPU (%)</th>,
                                        <th key={`${clavePeriodo(periodo.anio, periodo.mes)}-prom`}>Consumo Promedio<br />CPU (%)</th>,
                                        <th key={`${clavePeriodo(periodo.anio, periodo.mes)}-rate`}>Capacidad de Enlace<br />(Gbps)</th>,
                                        <th key={`${clavePeriodo(periodo.anio, periodo.mes)}-uso`}>Uso<br />(%)</th>,
                                        <th key={`${clavePeriodo(periodo.anio, periodo.mes)}-variacion`}>Variación mes<br />anterior (%)</th>,
                                        <th key={`${clavePeriodo(periodo.anio, periodo.mes)}-decision`}>Toma de Decisión<br />(Rate)</th>
                                    ])}
                                </tr>
                            </thead>
                            <tbody>
                                {filasReporte.map(fila => (
                                    <tr key={fila.billId}>
                                        <td className="inventario-bill-id">{fila.billId}</td>
                                        <td className="inventario-nodo">
                                            <strong>{fila.nombre}</strong>
                                            <small>{fila.nodos.join(" · ")}</small>
                                        </td>
                                        {fila.datosPeriodos.map(({ periodo, clave, registro, uso, variacion, decision, valoresCpu }) => {
                                            return [
                                                <td key={`${clave}-consumo`} className="inventario-numero">{formatoNumero(registro?.consumo, 3)}</td>,
                                                <td key={`${clave}-max`} className="inventario-cpu-cell">
                                                    <input
                                                        value={valoresCpu.maximo}
                                                        onChange={event => cambiarCpu(fila.billId, periodo, "maximo", event.target.value)}
                                                        disabled={!filasEnEdicion.includes(fila.billId)}
                                                        inputMode="decimal"
                                                        aria-label={`CPU máximo de ${fila.nombre} en ${MESES[periodo.mes - 1]}`}
                                                        placeholder="0,00"
                                                    />
                                                </td>,
                                                <td key={`${clave}-prom`} className="inventario-cpu-cell">
                                                    <input
                                                        value={valoresCpu.promedio}
                                                        onChange={event => cambiarCpu(fila.billId, periodo, "promedio", event.target.value)}
                                                        disabled={!filasEnEdicion.includes(fila.billId)}
                                                        inputMode="decimal"
                                                        aria-label={`CPU promedio de ${fila.nombre} en ${MESES[periodo.mes - 1]}`}
                                                        placeholder="0,00"
                                                    />
                                                </td>,
                                                <td key={`${clave}-rate`} className="inventario-numero">{formatoNumero(registro?.capacidad, 3)}</td>,
                                                <td key={`${clave}-uso`} className={`inventario-uso uso-${decision.nivel}`}>
                                                    {uso != null ? `${formatoNumero(uso)}%` : "—"}
                                                </td>,
                                                <td key={`${clave}-variacion`} className={`inventario-variacion ${variacion > 0 ? "sube" : variacion < 0 ? "baja" : ""}`}>
                                                    {Number.isFinite(variacion) ? `${variacion > 0 ? "+" : ""}${formatoNumero(variacion)}%` : "—"}
                                                </td>,
                                                <td key={`${clave}-decision`}>
                                                    <span className={`inventario-decision decision-${decision.nivel}`}>{decision.texto}</span>
                                                </td>
                                            ];
                                        })}
                                        <td className="inventario-acciones-cell">
                                            <button
                                                type="button"
                                                className="inventario-editar-fila"
                                                onClick={() => habilitarEdicion(fila.billId)}
                                                disabled={filasEnEdicion.includes(fila.billId) || filaGuardando === fila.billId}
                                            >
                                                Editar
                                            </button>
                                            <button
                                                type="button"
                                                className="inventario-guardar-fila"
                                                onClick={() => guardarCpuFila(fila.billId)}
                                                disabled={!filasEnEdicion.includes(fila.billId) || filaGuardando === fila.billId}
                                            >
                                                {filaGuardando === fila.billId ? "Guardando..." : "Guardar"}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <footer className="inventario-footer">
                        <span>Los valores manuales de CPU se almacenan en el archivo del servidor.</span>
                        <span>La variación es la resta directa: Uso actual menos Uso del mes anterior.</span>
                    </footer>
                </section>
            </main>
        </div>
    );
}

export default InventarioTrafico;
