import { useEffect, useState } from "react";
import api from "../service/api";
import Sidebar from "../components/Sidebar";
import TrafficChart from "../components/TrafficChart";
import KPICards from "../components/KPICards";
import ReportePDF from "../components/ReportePDF";
import { formatGbps } from "../utils/formatters";

function ProveedoresInternacionales() {

    const [loading, setLoading] = useState(true);
    const [datos, setDatos] = useState([]);
    const [billSeleccionado, setBillSeleccionado] = useState("");
    const [anioSeleccionado, setAnioSeleccionado] = useState("");

    useEffect(() => {

    const cargarDatos = () => {

        api.get("/trafico")
            .then((response) => {
                setDatos(response.data);
            })
            .catch((error) => {
                console.log(error);
            });

    };

    setLoading(true);

    cargarDatos();

    setLoading(false);

    const intervalo = setInterval(() => {

        console.log("Actualizando tráfico...");

        cargarDatos();

    }, 180000);

    return () => clearInterval(intervalo);

}, []);

    const datosInternacionales = datos.filter(
        item => item.grupo === "PROVEEDORES INTERNACIONALES"
    );

    useEffect(() => {

        if (
            datosInternacionales.length > 0 &&
            !billSeleccionado
        ) {

            const primerBill = [
                ...new Set(
                    datosInternacionales.map(
                        item => item.bill_name
                    )
                )
            ].sort()[0];

            setBillSeleccionado(primerBill);
        }

    }, [datosInternacionales, billSeleccionado]);

    const bills = [
        ...new Set(
            datosInternacionales.map(
                item => item.bill_name
            )
        )
    ].sort();

    const anios = [
        ...new Set(
            datosInternacionales
                .filter(
                    item =>
                        item.bill_name === billSeleccionado
                )
                .map(item => item.anio)
        )
    ].sort();

    const datosGrafico = datosInternacionales.filter(item => {

        if (
            item.bill_name !== billSeleccionado
        ) {
            return false;
        }

        if (
            anioSeleccionado &&
            Number(item.anio) !== Number(anioSeleccionado)
        ) {
            return false;
        }

        return true;
    });

    //==================================
// TABLAS DINÁMICAS
//==================================

const enlaces5070 = datosGrafico.filter(item => {

    const uso = Number(item.porcentaje_uso);

    return (
        uso >= 50 &&
        uso < 70
    );

});

const enlaces70 = datosGrafico.filter(item => {

    return Number(item.porcentaje_uso) >= 70;

});

//==================================

    if (
    loading ||
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
                Cargando Proveedores Internacionales...
            </div>
        );
    }

    return (

        <div className="dashboard-layout">

            <Sidebar />

            <main className="dashboard-content">

                <div className="filters-container">

                    <div className="filter-item">

                        <label>
                            Enlace:
                        </label>

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
                                    key={bill}
                                    value={bill}
                                >
                                    {bill}
                                </option>

                            ))}

                        </select>

                    </div>

                    <div className="filter-item">

                        <label>
                            Año:
                        </label>

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
                            datos={datosInternacionales}
                            titulo="Reporte de Trafico - Proveedores Internacionales"
                            nombreArchivo="Reporte_Proveedores_Internacionales"
                        />
                    </div>

                </div>

                {billSeleccionado && (

                    <KPICards
                        data={datosGrafico}
                    />

                )}

                {billSeleccionado && (

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
                            />

                        </div>

                    </>

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
                                <th>Capacidad (Gbps)</th>
                                <th>Uso</th>
                                <th>% Uso</th>
                            </tr>

                        </thead>

                        <tbody>

                            {enlaces5070.map((item, index) => (

                                    <tr key={index}>

                                        <td>
                                            {item.bill_name}
                                        </td>

                                        <td>
                                            {item.periodo}
                                        </td>

                                        <td>
                                            {formatGbps(item.capacidad)}
                                        </td>

                                        <td>
                                            {formatGbps(item.uso)}
                                        </td>

                                        <td>
                                            {item.porcentaje_uso}%
                                        </td>

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
                                <th>Capacidad (Gbps)</th>
                                <th>Uso</th>
                                <th>% Uso</th>
                            </tr>

                        </thead>

                        <tbody>

                           {enlaces70.map((item, index) => (

                                    <tr key={index}>

                                        <td>
                                            {item.bill_name}
                                        </td>

                                        <td>
                                            {item.periodo}
                                        </td>

                                        <td>
                                            {formatGbps(item.capacidad)}
                                        </td>

                                        <td>
                                            {formatGbps(item.uso)}
                                        </td>

                                        <td>
                                            {item.porcentaje_uso}%
                                        </td>

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

export default ProveedoresInternacionales;


