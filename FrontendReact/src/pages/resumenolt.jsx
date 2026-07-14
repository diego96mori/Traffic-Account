import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../service/api";
import Sidebar from "../components/Sidebar";
import { formatGbps } from "../utils/formatters";

const ANILLO_SIN_CLASIFICAR = "SIN ANILLO";
const MESES = [
    "Ene", "Feb", "Mar", "Abr", "May", "Jun",
    "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"
];
const ALIAS_NODO = {
    CHORRILLOS: "CHORRILLOS II",
    FLAMENGOS: "FLAMENGO"
};

function ResumenOLT() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [datos, setDatos] = useState([]);
    const [anilloSeleccionado, setAnilloSeleccionado] = useState("");
    const [nodoSeleccionado, setNodoSeleccionado] = useState("");
    const [busqueda, setBusqueda] = useState("");
    const [orden, setOrden] = useState({ clave: "enlace", direccion: "asc" });

    useEffect(() => {
        let activo = true;

        const cargarDatos = async () => {
            try {
                const response = await api.get("/trafico");
                if (!activo) return;
                setDatos(response.data);
                setError("");
            } catch (errorPeticion) {
                console.error(errorPeticion);
                if (activo) setError("No se pudieron cargar los datos de tráfico.");
            } finally {
                if (activo) setLoading(false);
            }
        };

        cargarDatos();
        const intervalo = setInterval(cargarDatos, 180000);

        return () => {
            activo = false;
            clearInterval(intervalo);
        };
    }, []);

    const datosOLT = useMemo(
        () => datos.filter(item => item.grupo === "OLT LIMA"),
        [datos]
    );

    const anilloPorNodo = useMemo(
        () => new Map(
            datos
                .filter(item => item.grupo === "NODOS LIMA" && item.anillo)
                .map(item => [item.subgrupo, item.anillo])
        ),
        [datos]
    );

    const obtenerAnillo = useCallback((item) => {
        if (item.anillo) return item.anillo;
        if (item.subgrupo === "ENSENADA") return "NORTE";
        const nodoEquivalente = ALIAS_NODO[item.subgrupo] || item.subgrupo;
        return anilloPorNodo.get(nodoEquivalente) || ANILLO_SIN_CLASIFICAR;
    }, [anilloPorNodo]);

    const anillos = useMemo(() => [
        ...new Set(datosOLT.map(obtenerAnillo))
    ].sort((a, b) => {
        if (a === ANILLO_SIN_CLASIFICAR) return 1;
        if (b === ANILLO_SIN_CLASIFICAR) return -1;
        return a.localeCompare(b);
    }), [datosOLT, obtenerAnillo]);

    useEffect(() => {
        if (anillos.length && !anillos.includes(anilloSeleccionado)) {
            setAnilloSeleccionado(anillos[0]);
            setNodoSeleccionado("");
        }
    }, [anillos, anilloSeleccionado]);

    const nodos = useMemo(() => [
        ...new Set(
            datosOLT
                .filter(item => obtenerAnillo(item) === anilloSeleccionado)
                .map(item => item.subgrupo)
                .filter(Boolean)
        )
    ].sort(), [datosOLT, obtenerAnillo, anilloSeleccionado]);

    useEffect(() => {
        if (nodos.length && !nodos.includes(nodoSeleccionado)) {
            setNodoSeleccionado(nodos[0]);
        }
    }, [nodos, nodoSeleccionado]);

    const datosNodo = useMemo(
        () => datosOLT.filter(item => item.subgrupo === nodoSeleccionado),
        [datosOLT, nodoSeleccionado]
    );

    const ultimosTresPeriodos = useMemo(() => [
        ...new Map(
            datosNodo
                .map(item => ({ anio: Number(item.anio), mes: Number(item.mes) }))
                .filter(periodo =>
                    Number.isFinite(periodo.anio) &&
                    periodo.mes >= 1 && periodo.mes <= 12
                )
                .map(periodo => [`${periodo.anio}-${periodo.mes}`, periodo])
        ).values()
    ]
        .sort((a, b) =>
            a.anio === b.anio ? a.mes - b.mes : a.anio - b.anio
        )
        .slice(-3), [datosNodo]);

    const filas = useMemo(() => [
        ...new Set(datosNodo.map(item => item.bill_name))
    ]
        .sort((a, b) => a.localeCompare(b))
        .map(enlace => {
            const registrosPorPeriodo = Object.fromEntries(
                datosNodo
                    .filter(item => item.bill_name === enlace)
                    .map(item => [
                        `${Number(item.anio)}-${Number(item.mes)}`,
                        item
                    ])
            );
            const ultimoPeriodo = ultimosTresPeriodos.at(-1);
            const ultimoRegistro = ultimoPeriodo
                ? registrosPorPeriodo[`${ultimoPeriodo.anio}-${ultimoPeriodo.mes}`]
                : null;

            return {
                enlace,
                capacidad: ultimoRegistro?.capacidad,
                uso: ultimoRegistro?.uso,
                porcentajeUso: ultimoRegistro?.porcentaje_uso,
                registrosPorPeriodo,
                valoresPeriodo: ultimosTresPeriodos.map(periodo => {
                    const registro = registrosPorPeriodo[`${periodo.anio}-${periodo.mes}`];
                    return registro ? Number(registro.uso) : null;
                })
            };
        }), [datosNodo, ultimosTresPeriodos]);

    const filasVisibles = useMemo(() => {
        const texto = busqueda.trim().toLocaleLowerCase("es");
        const resultado = texto
            ? filas.filter(fila => fila.enlace.toLocaleLowerCase("es").includes(texto))
            : [...filas];

        const valorOrden = (fila) => {
            if (orden.clave.startsWith("periodo-")) {
                return fila.valoresPeriodo[Number(orden.clave.split("-")[1])];
            }
            return fila[orden.clave];
        };

        return resultado.sort((a, b) => {
            const valorA = valorOrden(a);
            const valorB = valorOrden(b);
            if (valorA == null) return 1;
            if (valorB == null) return -1;
            const comparacion = typeof valorA === "string"
                ? valorA.localeCompare(valorB, "es")
                : Number(valorA) - Number(valorB);
            return orden.direccion === "asc" ? comparacion : -comparacion;
        });
    }, [filas, busqueda, orden]);

    const resumen = useMemo(() => {
        const porcentajes = filas
            .map(fila => Number(fila.porcentajeUso))
            .filter(Number.isFinite);
        return {
            enlaces: filas.length,
            capacidad: filas.reduce((total, fila) => total + (Number(fila.capacidad) || 0), 0),
            promedio: porcentajes.length
                ? porcentajes.reduce((total, valor) => total + valor, 0) / porcentajes.length
                : 0,
            alertas: porcentajes.filter(valor => valor >= 70).length
        };
    }, [filas]);

    const cambiarOrden = (clave) => {
        setOrden(actual => ({
            clave,
            direccion: actual.clave === clave && actual.direccion === "asc" ? "desc" : "asc"
        }));
    };

    const indicadorOrden = (clave) =>
        orden.clave === clave ? (orden.direccion === "asc" ? " ▲" : " ▼") : "";

    const mostrarAnio = ultimosTresPeriodos.some(
        periodo => periodo.anio !== ultimosTresPeriodos.at(-1)?.anio
    );

    if (loading) {
        return <div className="load-message">Cargando Resumen OLT...</div>;
    }

    if (error && datos.length === 0) {
        return <div className="load-error">{error}</div>;
    }

    return (
        <div className="dashboard-layout">
            <Sidebar />

            <main className="dashboard-content resumen-olt-page">
                <div className="resumen-olt-heading">
                    <div>
                        <span className="resumen-olt-eyebrow">MONITOREO DE CAPACIDAD</span>
                        <h1>Resumen OLT</h1>
                    </div>
                    <span className="resumen-olt-live"><i /> Datos actualizados</span>
                </div>

                <div className="filters-container resumen-olt-filters">
                    <div className="filter-item">
                        <label>Anillo</label>
                        <select
                            value={anilloSeleccionado}
                            onChange={(event) => {
                                setAnilloSeleccionado(event.target.value);
                                setNodoSeleccionado("");
                                setBusqueda("");
                            }}
                        >
                            {anillos.map(anillo => (
                                <option key={anillo} value={anillo}>{anillo}</option>
                            ))}
                        </select>
                    </div>

                    <div className="filter-item">
                        <label>Nodo</label>
                        <select
                            value={nodoSeleccionado}
                            onChange={(event) => {
                                setNodoSeleccionado(event.target.value);
                                setBusqueda("");
                            }}
                        >
                            {nodos.map(nodo => (
                                <option key={nodo} value={nodo}>{nodo}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <section className="resumen-olt-kpis" aria-label="Indicadores del nodo seleccionado">
                    <article className="resumen-olt-kpi kpi-blue">
                        <span>Enlaces monitoreados</span>
                        <strong>{resumen.enlaces}</strong>
                        <small>Nodo {nodoSeleccionado || "sin seleccionar"}</small>
                    </article>
                    <article className="resumen-olt-kpi kpi-violet">
                        <span>Capacidad total</span>
                        <strong>{formatGbps(resumen.capacidad)}</strong>
                        <small>Gbps disponibles</small>
                    </article>
                    <article className="resumen-olt-kpi kpi-green">
                        <span>Utilización promedio</span>
                        <strong>{resumen.promedio.toFixed(2)}%</strong>
                        <small>Promedio del último periodo</small>
                    </article>
                    <article className={`resumen-olt-kpi ${resumen.alertas ? "kpi-red" : "kpi-green"}`}>
                        <span>Enlaces en alerta</span>
                        <strong>{resumen.alertas}</strong>
                        <small>Utilización igual o mayor a 70%</small>
                    </article>
                </section>

                <div className="table-container resumen-olt-table-card">
                    <div className="resumen-olt-table-header">
                        <div>
                            <h2>Últimos tres meses por enlace</h2>
                            <p>{filasVisibles.length} de {filas.length} enlaces visibles</p>
                        </div>
                        <label className="resumen-olt-search">
                            <span aria-hidden="true">⌕</span>
                            <input
                                type="search"
                                value={busqueda}
                                onChange={(event) => setBusqueda(event.target.value)}
                                placeholder="Buscar enlace..."
                                aria-label="Buscar enlace"
                            />
                        </label>
                    </div>

                    <div className="resumen-olt-table-scroll">
                        <table className="resumen-olt-table">
                            <thead>
                                <tr>
                                    <th><button type="button" onClick={() => cambiarOrden("enlace")}>Enlaces{indicadorOrden("enlace")}</button></th>
                                    <th><button type="button" onClick={() => cambiarOrden("capacidad")}>Capacidad - Gbps{indicadorOrden("capacidad")}</button></th>
                                    {ultimosTresPeriodos.map((periodo, indice) => (
                                        <th key={`${periodo.anio}-${periodo.mes}`}>
                                            <button type="button" onClick={() => cambiarOrden(`periodo-${indice}`)}>
                                                Periodo ({MESES[periodo.mes - 1]}{mostrarAnio ? ` ${periodo.anio}` : ""}) - Gbps
                                                {indicadorOrden(`periodo-${indice}`)}
                                            </button>
                                        </th>
                                    ))}
                                    <th><button type="button" onClick={() => cambiarOrden("uso")}>Uso - Gbps{indicadorOrden("uso")}</button></th>
                                    <th><button type="button" onClick={() => cambiarOrden("porcentajeUso")}>%Uso{indicadorOrden("porcentajeUso")}</button></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filasVisibles.map(fila => {
                                    const valoresValidos = fila.valoresPeriodo.filter(Number.isFinite);
                                    const minimo = valoresValidos.length ? Math.min(...valoresValidos) : null;
                                    const maximo = valoresValidos.length ? Math.max(...valoresValidos) : null;
                                    const actual = fila.valoresPeriodo.at(-1);
                                    const anterior = fila.valoresPeriodo.at(-2);
                                    const tendencia = Number.isFinite(actual) && Number.isFinite(anterior)
                                        ? Math.sign(actual - anterior)
                                        : 0;
                                    const porcentaje = Number(fila.porcentajeUso);
                                    const porcentajeValido = Number.isFinite(porcentaje);
                                    const nivel = porcentaje >= 70 ? "danger" : porcentaje >= 50 ? "warning" : "success";

                                    return <tr key={fila.enlace}>
                                        <td><strong className="resumen-olt-enlace">{fila.enlace}</strong></td>
                                        <td>{formatGbps(fila.capacidad)}</td>
                                        {ultimosTresPeriodos.map((periodo, indice) => {
                                            const registro = fila.registrosPorPeriodo[`${periodo.anio}-${periodo.mes}`];
                                            const valor = fila.valoresPeriodo[indice];
                                            const extremo = valoresValidos.length > 1
                                                ? valor === maximo ? "period-max" : valor === minimo ? "period-min" : ""
                                                : "";
                                            return (
                                                <td className={extremo} key={`${fila.enlace}-${periodo.anio}-${periodo.mes}`}>
                                                    {registro ? formatGbps(registro.uso) : <span className="resumen-olt-no-data">Sin datos</span>}
                                                </td>
                                            );
                                        })}
                                        <td>
                                            <span className={`trend trend-${tendencia > 0 ? "up" : tendencia < 0 ? "down" : "flat"}`}>
                                                {tendencia > 0 ? "↗" : tendencia < 0 ? "↘" : "→"}
                                            </span>
                                            {formatGbps(fila.uso)}
                                        </td>
                                        <td className="resumen-olt-usage-cell">
                                            {porcentajeValido ? <>
                                                <div className="resumen-olt-usage-label">
                                                    <strong>{porcentaje.toFixed(2)}%</strong>
                                                    <span className={`usage-badge usage-${nivel}`}>
                                                        {nivel === "danger" ? "Crítico" : nivel === "warning" ? "Atención" : "Normal"}
                                                    </span>
                                                </div>
                                                <div className="resumen-olt-progress" aria-label={`${porcentaje.toFixed(2)} por ciento`}>
                                                    <span className={`progress-${nivel}`} style={{ width: `${Math.min(Math.max(porcentaje, 0), 100)}%` }} />
                                                </div>
                                            </> : <span className="resumen-olt-no-data">Sin datos</span>}
                                        </td>
                                    </tr>;
                                })}
                            </tbody>
                        </table>
                    </div>

                    {!filasVisibles.length && (
                        <div className="resumen-olt-empty">
                            <strong>No se encontraron enlaces</strong>
                            <span>{busqueda ? "Prueba con otro término de búsqueda." : "No hay datos para el nodo seleccionado."}</span>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

export default ResumenOLT;
