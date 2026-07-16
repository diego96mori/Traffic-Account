import { useCallback, useEffect, useState } from "react";
import api from "../service/api";
import Sidebar from "../components/Sidebar";
import TrafficChart from "../components/TrafficChart";
import KPICards from "../components/KPICards";
import ReportePDF from "../components/ReportePDF";
import { formatGbps, formatPeriodo } from "../utils/formatters";

const ANILLO_SIN_CLASIFICAR = "SIN ANILLO";

function NodosLima() {

    const [loading, setLoading] = useState(true);
    const [datos, setDatos] = useState([]);
    const [enlaces, setEnlaces] = useState([]);
    const [error, setError] = useState("");

    const [anilloSeleccionado, setAnilloSeleccionado] = useState("");
    const [subgrupoSeleccionado, setSubgrupoSeleccionado] = useState("");
    const [billSeleccionado, setBillSeleccionado] = useState("");
    const [anioSeleccionado, setAnioSeleccionado] = useState("");

    const [mostrarTotal, setMostrarTotal] = useState(false);
    const [periodoActivo, setPeriodoActivo] = useState(null);

    const actualizarPeriodoActivo = useCallback((periodo) => {
        setPeriodoActivo(periodo);
    }, []);

  useEffect(() => {

    const cargarDatos = () => {

        Promise.all([
            api.get("/trafico"),
            api.get("/bills")
        ])
            .then(([traficoResponse, billsResponse]) => {
                setDatos(traficoResponse.data);
                setEnlaces(billsResponse.data);
                setError("");
            })
            .catch((error) => {
                console.log(error);
                setError("No se pudieron cargar los datos de tráfico.");
            })
            .finally(() => setLoading(false));

    };

    cargarDatos();

    const intervalo = setInterval(() => {

        console.log("Actualizando tráfico...");

        cargarDatos();

    }, 180000);

    return () => clearInterval(intervalo);

}, []);

    const datosNodosLima = datos.filter(
        item => item.grupo === "NODOS LIMA"
    );

    const enlacesNodosLima = enlaces.filter(
        item => item.grupo === "NODOS LIMA"
    );

    const obtenerAnillo = (item) =>
        item.anillo || ANILLO_SIN_CLASIFICAR;

    const anillos = [
        ...new Set(
            enlacesNodosLima
                .map(item => obtenerAnillo(item))
                .filter(Boolean)
        )
    ].sort((a, b) => {
        if (a === ANILLO_SIN_CLASIFICAR) return 1;
        if (b === ANILLO_SIN_CLASIFICAR) return -1;
        return a.localeCompare(b);
    });

    useEffect(() => {

        if (
            anillos.length > 0 &&
            !anilloSeleccionado
        ) {

            setAnilloSeleccionado(
                anillos[0]
            );

        }

    }, [anillos, anilloSeleccionado]);

    const subgrupos = [
        ...new Set(
            enlacesNodosLima
                .filter(
                    item =>
                        obtenerAnillo(item) ===
                        anilloSeleccionado
                )
                .map(item => item.subgrupo)
                .filter(Boolean)
        )
    ].sort();

    useEffect(() => {

        if (
            subgrupos.length > 0 &&
            !subgrupoSeleccionado
        ) {

            setSubgrupoSeleccionado(
                subgrupos[0]
            );

        }

    }, [subgrupos, subgrupoSeleccionado]);

    useEffect(() => {

        if (
            subgrupoSeleccionado &&
            !enlacesNodosLima.some(
                item =>
                    item.subgrupo === subgrupoSeleccionado &&
                    obtenerAnillo(item) === anilloSeleccionado
            )
        ) {

            setSubgrupoSeleccionado("");
            setBillSeleccionado("");

        }

    }, [anilloSeleccionado, subgrupoSeleccionado, enlacesNodosLima]);

    const bills = Array.from(
        new Map(
            enlacesNodosLima
                .filter(
                    item =>
                        item.subgrupo === subgrupoSeleccionado &&
                        obtenerAnillo(item) === anilloSeleccionado
                )
                .map(item => [
                    String(item.bill_id),
                    {
                        bill_id: String(item.bill_id),
                        bill_name: item.bill_name
                    }
                ])
        ).values()
    ).sort((a, b) =>
        a.bill_name.localeCompare(b.bill_name) ||
        Number(a.bill_id) - Number(b.bill_id)
    );

    useEffect(() => {

        if (
            bills.length > 0 &&
            !billSeleccionado
        ) {

            setBillSeleccionado(
                bills[0].bill_id
            );

        }

    }, [bills, billSeleccionado]);

    const anios = [
        ...new Set(
            datosNodosLima
                .filter(
                    item =>
                        String(item.bill_id) ===
                        billSeleccionado
                )
                .map(
                    item => item.anio
                )
        )
    ].sort();

   let datosGrafico;

if (!mostrarTotal) {

    datosGrafico = datosNodosLima.filter(item => {

        if (item.subgrupo !== subgrupoSeleccionado)
            return false;

        if (String(item.bill_id) !== billSeleccionado)
            return false;

        if (
            anioSeleccionado &&
            Number(item.anio) !== Number(anioSeleccionado)
        )
            return false;

        return true;

    });

}
else {

    const datosFiltrados = datosNodosLima.filter(item => {

        if (item.subgrupo !== subgrupoSeleccionado)
            return false;

        if (
            anioSeleccionado &&
            Number(item.anio) !== Number(anioSeleccionado)
        )
            return false;

        return true;

    });

    const agrupado = {};

    datosFiltrados.forEach(item => {

        const clave =
            `${item.anio}-${item.mes}`;

        if (!agrupado[clave]) {

            agrupado[clave] = {

                ...item,

                bill_name: `${subgrupoSeleccionado} (TOTAL)`,

                capacidad: 0,
                inbound: 0,
                outbound: 0,
                uso: 0

            };

        }

        agrupado[clave].capacidad += Number(item.capacidad);

        agrupado[clave].inbound += Number(item.inbound);

        agrupado[clave].outbound += Number(item.outbound);

        agrupado[clave].uso += Number(item.uso);

    });

datosGrafico = Object.values(agrupado).map(item => ({

    ...item,

    capacidad: Number(item.capacidad.toFixed(2)),

    inbound: Number(item.inbound.toFixed(2)),

    outbound: Number(item.outbound.toFixed(2)),

    uso: Number(item.uso.toFixed(2)),

    porcentaje_uso:
        item.capacidad > 0
            ? Number(
                (
                    (item.uso / item.capacidad) * 100
                ).toFixed(2)
              )
            : 0

}));

}

           const tieneHistorial = datosGrafico.length > 0;

           const enlaces5070 = datosGrafico.filter(item => {
            const uso = Number(item.porcentaje_uso);
            return uso >= 50 && uso < 70;
            });

            const enlaces70 = datosGrafico.filter(item => {
            return Number(item.porcentaje_uso) >= 70;
            });

    if (error && datos.length === 0) {
        return <div className="load-error">{error}</div>;
    }

    if (
    loading ||
    !anilloSeleccionado ||
    !subgrupoSeleccionado ||
    !billSeleccionado
) {
    return (
        <div
            style={{
                height: "100vh",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                fontSize: "24px",
                fontWeight: "bold"
                }}
            >
                Cargando Nodos Lima...
            </div>
        );
    }

    return (

        <div className="dashboard-layout">

            <Sidebar />

            <main className="dashboard-content">

                <div className="filters-container">

                    <div className="filter-item">

                        <label>Anillo:</label>

                        <select
                            value={anilloSeleccionado}
                            onChange={(e) => {

                                setAnilloSeleccionado(
                                    e.target.value
                                );

                                setSubgrupoSeleccionado("");
                                setBillSeleccionado("");
                            }}
                        >

                            {anillos.map(
                                (anillo) => (

                                    <option
                                        key={anillo}
                                        value={anillo}
                                    >
                                        {anillo}
                                    </option>

                                )
                            )}

                        </select>

                    </div>

                    <div className="filter-item">

                        <label>Nodo:</label>

                        <select
                            value={subgrupoSeleccionado}
                            onChange={(e) => {

                                setSubgrupoSeleccionado(
                                    e.target.value
                                );

                                setBillSeleccionado("");
                            }}
                        >

                            {subgrupos.map(
                                (subgrupo) => (

                                    <option
                                        key={subgrupo}
                                        value={subgrupo}
                                    >
                                        {subgrupo}
                                    </option>

                                )
                            )}

                        </select>

                    </div>

                    <div className="filter-item">

                        <label>Enlace:</label>

                        <select
                            value={billSeleccionado}
                            onChange={(e) =>
                                setBillSeleccionado(
                                    e.target.value
                                )
                            }
                        >

                            {bills.map((bill) => (

                                <option
                                    key={bill.bill_id}
                                    value={bill.bill_id}
                                >
                                    {bill.bill_name}
                                </option>

                            ))}

                        </select>

                    </div>

                    <div className="filter-item">

    <label>Total:</label>

    <input
        type="checkbox"
        checked={mostrarTotal}
        onChange={(e) =>
            setMostrarTotal(e.target.checked)
        }
        style={{
        width: "18px",
        height: "18px",
        cursor: "pointer"
    }}
    />

</div>

                    <div className="filter-item">

                        <label>Año:</label>

                        <select
                            value={anioSeleccionado}
                            onChange={(e) =>
                                setAnioSeleccionado(
                                    e.target.value
                                )
                            }
                        >

                            <option value="">
                                Todos
                            </option>

                            {anios.map((anio) => (

                                <option
                                    key={anio}
                                    value={anio}
                                >
                                    {anio}
                                </option>

                            ))}

                        </select>

                    </div>

                    <div
                        style={{
                            marginLeft: "auto"
                        }}
                    >
                        <ReportePDF
                            datos={datosNodosLima}
                            titulo="Reporte de Trafico - Nodos Lima"
                            nombreArchivo="Reporte_Nodos_Lima"
                            mostrarSubgrupo={true}
                        />
                    </div>

                </div>

                {billSeleccionado && tieneHistorial && (
                    <KPICards data={datosGrafico} periodoActivo={periodoActivo} />
                )}

                {billSeleccionado && tieneHistorial && (

                    <>
                        <h2
                            style={{
                                textAlign: "center",
                                marginTop: "30px",
                                marginBottom: "20px"
                            }}
                        >
                            Inbound - Outbound (Gbps)
                        </h2>

                        <div
                            style={{
                                border: "2px solid black",
                                borderRadius: "4px",
                                padding: "10px",
                                marginBottom: "40px"
                            }}
                        >

                            <TrafficChart
                                data={datosGrafico}
                                variant="barras"
                                onPeriodoActivo={actualizarPeriodoActivo}
                            />

                        </div>

                    </>

                )}

                {billSeleccionado && !tieneHistorial && (
                    <div
                        style={{
                            marginTop: "30px",
                            padding: "24px",
                            textAlign: "center",
                            fontSize: "18px",
                            fontWeight: "bold",
                            background: "#ffffff",
                            border: "1px solid #d1d5db",
                            borderRadius: "8px"
                        }}
                    >
                        Este enlace no tiene historial de tráfico.
                    </div>
                )}

        <div className="table-container">

    {enlaces5070.length > 0 && (
        <>
            <h2>
                Enlaces 50% - 70% (Gbps)
            </h2>

            <table>

                <thead>

                    <tr>
                        <th>Bill</th>
                        <th>Periodo</th>
                        <th>Capacidad</th>
                        <th>Uso</th>
                        <th>% Uso</th>
                    </tr>

                </thead>

                <tbody>

                    {enlaces5070.map((item, index) => (

                        <tr key={index}>

                            <td>{item.bill_name}</td>
                            <td>{formatPeriodo(item.periodo)}</td>
                            <td>{formatGbps(item.capacidad)}</td>
                            <td>{formatGbps(item.uso)}</td>
                            <td>{item.porcentaje_uso}%</td>

                        </tr>

                    ))}

                </tbody>

            </table>

        </>
    )}

    {enlaces70.length > 0 && (
        <>

            <h2
                style={{
                    marginTop: "40px"
                }}
            >
                Enlaces ≥ 70% (Gbps)
            </h2>

            <table>

                <thead>

                    <tr>
                        <th>Bill</th>
                        <th>Periodo</th>
                        <th>Capacidad</th>
                        <th>Uso</th>
                        <th>% Uso</th>
                    </tr>

                </thead>

                <tbody>

                    {enlaces70.map((item, index) => (

                        <tr key={index}>

                            <td>{item.bill_name}</td>
                            <td>{formatPeriodo(item.periodo)}</td>
                            <td>{formatGbps(item.capacidad)}</td>
                            <td>{formatGbps(item.uso)}</td>
                            <td>{item.porcentaje_uso}%</td>

                        </tr>

                    ))}

                </tbody>

            </table>

        </>
    )}

</div>

            </main>

        </div>

    );
}

export default NodosLima;


