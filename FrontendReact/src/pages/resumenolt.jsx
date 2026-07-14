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
                registrosPorPeriodo
            };
        }), [datosNodo, ultimosTresPeriodos]);

    if (loading) {
        return <div className="load-message">Cargando Resumen OLT...</div>;
    }

    if (error && datos.length === 0) {
        return <div className="load-error">{error}</div>;
    }

    return (
        <div className="dashboard-layout">
            <Sidebar />

            <main className="dashboard-content">
                <h1>Resumen OLT</h1>

                <div className="filters-container">
                    <div className="filter-item">
                        <label>Anillo:</label>
                        <select
                            value={anilloSeleccionado}
                            onChange={(event) => {
                                setAnilloSeleccionado(event.target.value);
                                setNodoSeleccionado("");
                            }}
                        >
                            {anillos.map(anillo => (
                                <option key={anillo} value={anillo}>{anillo}</option>
                            ))}
                        </select>
                    </div>

                    <div className="filter-item">
                        <label>Nodo:</label>
                        <select
                            value={nodoSeleccionado}
                            onChange={(event) => setNodoSeleccionado(event.target.value)}
                        >
                            {nodos.map(nodo => (
                                <option key={nodo} value={nodo}>{nodo}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="table-container">
                    <h2>Últimos tres meses por enlace</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>Enlaces</th>
                                <th>Capacidad - Gbps</th>
                                {ultimosTresPeriodos.map(periodo => (
                                    <th key={`${periodo.anio}-${periodo.mes}`}>
                                        Periodo ({MESES[periodo.mes - 1]}) - Gbps
                                    </th>
                                ))}
                                <th>Uso - Gbps</th>
                                <th>%Uso</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filas.map(fila => (
                                <tr key={fila.enlace}>
                                    <td style={{ fontWeight: "bold" }}>{fila.enlace}</td>
                                    <td>{formatGbps(fila.capacidad)}</td>
                                    {ultimosTresPeriodos.map(periodo => {
                                        const registro = fila.registrosPorPeriodo[
                                            `${periodo.anio}-${periodo.mes}`
                                        ];
                                        return (
                                            <td key={`${fila.enlace}-${periodo.anio}-${periodo.mes}`}>
                                                {registro ? formatGbps(registro.uso) : "-"}
                                            </td>
                                        );
                                    })}
                                    <td>{formatGbps(fila.uso)}</td>
                                    <td>
                                        {Number.isFinite(Number(fila.porcentajeUso))
                                            ? `${Number(fila.porcentajeUso).toFixed(2)}%`
                                            : "-"}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {!filas.length && <p>No hay datos para el nodo seleccionado.</p>}
                </div>
            </main>
        </div>
    );
}

export default ResumenOLT;
