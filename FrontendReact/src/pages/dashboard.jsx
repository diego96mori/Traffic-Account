import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../service/api";
import Sidebar from "../components/Sidebar";
import TrafficChart from "../components/TrafficChart";
import KPICards from "../components/KPICards";
import ReportePDF from "../components/ReportePDF";
import { formatGbps, formatPeriodo } from "../utils/formatters";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  LabelList
} from "recharts";

function Dashboard() {

    const [loading, setLoading] = useState(true);
    const [datos, setDatos] = useState([]);
    const [billSeleccionado, setBillSeleccionado] = useState("");
    const [anioSeleccionado, setAnioSeleccionado] = useState("");
    const [mostrarModal, setMostrarModal] = useState(false);
    const [error, setError] = useState("");
    const [advertencia, setAdvertencia] = useState("");
    const [periodoActivo, setPeriodoActivo] = useState(null);
    const datosAnillosTotales = [];
    const mesesNombre = [
        "Ene","Feb","Mar","Abr","May","Jun",
        "Jul","Ago","Sep","Oct","Nov","Dic"
    ];

    const actualizarPeriodoActivo = useCallback((periodo) => {
        setPeriodoActivo((periodoActual) => {
            if (!periodo) return periodoActual ? null : periodoActual;

            const esElMismoPeriodo =
                periodoActual?.bill_id === periodo.bill_id &&
                Number(periodoActual?.anio) === Number(periodo.anio) &&
                Number(periodoActual?.mes) === Number(periodo.mes);

            return esElMismoPeriodo ? periodoActual : periodo;
        });
    }, []);

useEffect(() => {
    let activo = true;

    const cargarDatos = async (esCargaInicial = false) => {
        if (esCargaInicial) {
            setError("");
        } else {
            setAdvertencia("");
        }

        try {
            const response = await api.get("/trafico");
            const datosAnillo = response.data.filter(
                item => item.grupo === "TRAFICO POR ANILLO"
            );

            if (!activo) return;

            setDatos(datosAnillo);
            setPeriodoActivo(null);
            setBillSeleccionado((billActual) => {
                const billsDisponibles = [
                    ...new Set(datosAnillo.map(item => item.bill_name))
                ].sort();

                return billsDisponibles.includes(billActual)
                    ? billActual
                    : (billsDisponibles[0] || "");
            });
            setError("");
            setAdvertencia("");
        } catch (errorPeticion) {
            if (!activo) return;
            console.error(errorPeticion);

            if (esCargaInicial) {
                setError("No se pudieron cargar los datos de tráfico.");
            } else {
                setAdvertencia(
                    "No se pudieron actualizar los datos. Se muestran los últimos disponibles."
                );
            }
        } finally {
            if (activo && esCargaInicial) setLoading(false);
        }
    };

    cargarDatos(true);

    const intervalo = setInterval(() => {

        console.log("Actualizando tráfico...");

        cargarDatos();

    }, 180000); // 3 minutos

    return () => {
        activo = false;
        clearInterval(intervalo);
    };

}, []);
    const bills = [
        ...new Set(
            datos.map(item => item.bill_name)
        )
    ].sort();

  const datosGrafico = useMemo(() => datos.filter(item => {

    if (item.bill_name !== billSeleccionado) {
        return false;
    }

    if (
        anioSeleccionado &&
        Number(item.anio) !== Number(anioSeleccionado)
    ) {
        return false;
    }

    return true;
}), [datos, billSeleccionado, anioSeleccionado]);

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

    const anios = [
  ...new Set(
    datos
      .filter(item => item.bill_name === billSeleccionado)
      .map(item => item.anio)
  )
].sort();

//=========================
// ÚLTIMO MES
//=========================

const ultimosTresPeriodos = [
    ...new Map(
        datos
            .map(item => ({
                anio: Number(item.anio),
                mes: Number(item.mes)
            }))
            .filter(periodo =>
                Number.isFinite(periodo.anio) &&
                periodo.mes >= 1 &&
                periodo.mes <= 12
            )
            .map(periodo => [
                `${periodo.anio}-${periodo.mes}`,
                periodo
            ])
    ).values()
]
    .sort((a, b) =>
        a.anio === b.anio
            ? a.mes - b.mes
            : a.anio - b.anio
    )
    .slice(-3);

const resumenUltimosTresMeses = [
    ...new Set(datos.map(item => item.bill_name))
]
    .sort((a, b) => a.localeCompare(b))
    .map(bill => {
        const registrosPorPeriodo = Object.fromEntries(
            datos
                .filter(item => item.bill_name === bill)
                .map(item => [
                    `${Number(item.anio)}-${Number(item.mes)}`,
                    item
                ])
        );
        const ultimoPeriodo = ultimosTresPeriodos.at(-1);
        const ultimoItem = ultimoPeriodo
            ? registrosPorPeriodo[`${ultimoPeriodo.anio}-${ultimoPeriodo.mes}`]
            : null;

        return {
            bill_name: bill,
            capacidad: ultimoItem?.capacidad,
            uso: ultimoItem?.uso,
            porcentaje_uso: ultimoItem?.porcentaje_uso,
            registrosPorPeriodo
        };
    });


const anioComparativo = Math.max(
    ...datos
        .map(item => Number(item.anio))
        .filter(Number.isFinite)
);

const mesesDisponiblesAnioComparativo = [
    ...new Set(
        datos
            .filter(item => Number(item.anio) === anioComparativo)
            .map(item => Number(item.mes))
            .filter(mes => mes >= 1 && mes <= 12)
    )
].sort((a,b) => a - b);

for (const mes of mesesDisponiblesAnioComparativo) {



  const fila = {
    periodo: mesesNombre[mes - 1]
  };

  const centro = datos.find(
    d =>
      d.bill_name === "WIN-ANILLO CENTRO" &&
      Number(d.anio) === anioComparativo &&
      Number(d.mes) === mes
  );

  const oeste = datos.find(
    d =>
      d.bill_name === "WIN-ANILLO CENTRO-OESTE" &&
      Number(d.anio) === anioComparativo &&
      Number(d.mes) === mes
  );

  const este = datos.find(
    d =>
      d.bill_name === "WIN-ANILLO ESTE" &&
      Number(d.anio) === anioComparativo &&
      Number(d.mes) === mes
  );

  const norte = datos.find(
    d =>
      d.bill_name === "WIN-ANILLO NORTE" &&
      Number(d.anio) === anioComparativo &&
      Number(d.mes) === mes
  );

  const sur = datos.find(
    d =>
      d.bill_name === "WIN-ANILLO SUR" &&
      Number(d.anio) === anioComparativo &&
      Number(d.mes) === mes
  );

  fila.centro = Number(centro?.uso || 0);
  fila.oeste = Number(oeste?.uso || 0);
  fila.este = Number(este?.uso || 0);
  fila.norte = Number(norte?.uso || 0);
  fila.sur = Number(sur?.uso || 0);

  datosAnillosTotales.push(fila);
}

  if (loading) {
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
            Cargando Trafico Anillos...
        </div>
    );
}

  if (error || datos.length === 0 || !billSeleccionado) {
    return (
        <div
            style={{
                height: "100vh",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                fontSize: "20px",
                fontWeight: "bold",
                color: error ? "#b91c1c" : "#374151"
            }}
        >
            {error || "No hay datos de tráfico por anillo disponibles."}
        </div>
    );
  }


    return (

        <div className="dashboard-layout">

            <Sidebar />

            <main className="dashboard-content">

                {advertencia && (
                    <div
                        role="alert"
                        style={{
                            marginBottom: "16px",
                            padding: "10px 14px",
                            background: "#fef3c7",
                            color: "#92400e",
                            border: "1px solid #f59e0b",
                            borderRadius: "6px"
                        }}
                    >
                        {advertencia}
                    </div>
                )}

                {/* FILTRO */}

 <div
    style={{
        display: "flex",
        alignItems: "center",
        gap: "20px",
        marginBottom: "20px"
    }}
>

    <div className="filter-item">

        <label>Enlace:</label>

        <select
            value={billSeleccionado}
            onChange={(e) => {
                setBillSeleccionado(e.target.value);
                setAnioSeleccionado("");
                setPeriodoActivo(null);
            }}
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

        <label>Año:</label>

        <select
            value={anioSeleccionado}
            onChange={(e) => {
                setAnioSeleccionado(e.target.value);
                setPeriodoActivo(null);
            }}
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
        marginLeft:"auto",
        display:"flex",
        flexDirection:"column",
        gap:"10px"
    }}
>

<button
    onClick={() => setMostrarModal(true)}
    style={{
        background:"#f59e0b",
        color:"white",
        border:"none",
        padding:"10px 20px",
        borderRadius:"6px",
        cursor:"pointer",
        fontWeight:"bold"
    }}
>
    Anillos Totales
</button>

<ReportePDF datos={datos}/>

</div>
</div>

                {/* KPI */}

                {billSeleccionado && (

                    <KPICards
                        data={datosGrafico}
                        periodoActivo={periodoActivo}
                    />

                )}

                {/* GRAFICO */}

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
        variant="barras"
        onPeriodoActivo={actualizarPeriodoActivo}
    />
</div>
                    </>

                )}

                             {/* GRILLAS DE UMBRALES */}

                <div className="table-container">

                    {enlaces5070.length > 0 && (
<>

<h2>Enlaces 50% - 70% (Gbps)</h2>

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

<h2 style={{ marginTop: "40px" }}>
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

                {mostrarModal && (

<div
  style={{
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    background: "rgba(0,0,0,0.7)",
    zIndex: 9999
  }}
>

<div
  style={{
    background: "white",
    width: "94%",
    height: "92vh",
    margin: "2vh auto",
    borderRadius: "12px",
    padding: "25px",
    overflowY: "auto"
  }}
>

<h2 style={{ textAlign: "center" }}>
  Comparativo Anillos {anioComparativo}
</h2>

<button
    onClick={() =>
        setMostrarModal(false)
    }
>
    Cerrar
</button>
<div
    style={{
        border: "1px solid #ddd",
        borderRadius: "10px",
        padding: "20px",
        background: "#fafafa"
    }}
>
<ResponsiveContainer
    width="100%"
    height={700}
>
    <LineChart
    data={datosAnillosTotales}
  margin={{
    top:60,
    right:90,
    left:120,
    bottom:40
}}
>

        <CartesianGrid
    stroke="#d1d5db"
    strokeDasharray="4 4"
/>

        <XAxis
    dataKey="periodo"
    tick={{
        fontSize: 14,
        fontWeight: "bold"
    }}
/>

<YAxis
    domain={[
        (min) => Math.floor((min - 40) / 50) * 50,
        (max) => Math.ceil((max + 40) / 50) * 50
    ]}
    tickCount={8}
    allowDecimals={false}
    width={70}
    tickMargin={25}
    tick={{
        fontSize: 14,
        fontWeight: "bold"
    }}
/>
        
  
        <Tooltip
    formatter={(value) => formatGbps(value)}
    contentStyle={{
        background: "#ffffff",
        border: "1px solid #d1d5db",
        borderRadius: "10px",
        boxShadow: "0 4px 12px rgba(0,0,0,.20)"
    }}
/>

       <Legend
    verticalAlign="top"
    align="center"
    wrapperStyle={{
        fontSize: 15,
        fontWeight: "bold",
        paddingBottom: 20
    }}
/>

        <Line
            type="monotone"
            dataKey="centro"
            name="Centro"
            stroke="#2563eb"
            strokeWidth={4}
            dot={{ r: 6 }}
            activeDot={{ r: 9 }}

        >

              <LabelList
            dataKey="centro"
            formatter={formatGbps}
            position="bottom"
            offset={12}
            fontSize={12}
            fontWeight="bold"
             fill="#000"
            />
</Line>
        <Line
            type="monotone"
            dataKey="oeste"
            name="Centro Oeste"
            stroke="#16a34a"
            strokeWidth={4}
            dot={{ r: 6 }}
            activeDot={{ r: 9 }}
        >

              <LabelList
            dataKey="oeste"
            formatter={formatGbps}
            position="bottom"
            offset={12}
            fontSize={12}
            fontWeight="bold"
             fill="#000"
            />
</Line>

        <Line
            type="monotone"
            dataKey="este"
            name="Este"
            stroke="#dc2626"
            strokeWidth={4}
            dot={{ r: 6 }}
            activeDot={{ r: 9 }}

        >

              <LabelList
            dataKey="este"
            formatter={formatGbps}
            position="top"
            offset={12}
            fontSize={12}
            fontWeight="bold"
             fill="#000"
            />
</Line>

        <Line
            type="monotone"
            dataKey="norte"
            name="Norte"
            stroke="#7c3aed"
            strokeWidth={4}
            dot={{ r: 6 }}
            activeDot={{ r: 9 }}

         >

              <LabelList
            dataKey="norte"
            formatter={formatGbps}
            position="top"
            offset={12}
            fontSize={12}
            fontWeight="bold"
             fill="#000"
            />
</Line>

        <Line
            type="monotone"
            dataKey="sur"
            name="Sur"
            stroke="#f59e0b"
            strokeWidth={4}
            dot={{ r: 6 }}
            activeDot={{ r: 9 }}

        >

              <LabelList
            dataKey="sur"
            formatter={formatGbps}
            position="bottom"
            offset={12}
            fontSize={12}
            fontWeight="bold"
             fill="#000"
            />
</Line>

    </LineChart>
</ResponsiveContainer>

<div
    style={{
        marginTop: "30px"
    }}
>

<h3
    style={{
        textAlign: "center",
        marginBottom: "15px"
    }}
>
Resumen de los últimos tres meses
</h3>

<table
    style={{
        width: "100%",
        borderCollapse: "collapse"
    }}
>

<thead>

<tr
    style={{
        background: "#f5f5f5"
    }}
>

<th>Enlace</th>
<th>Capacidad - Gbps</th>
{ultimosTresPeriodos.map(periodo => (
    <th key={`${periodo.anio}-${periodo.mes}`}>
        Periodo ({mesesNombre[periodo.mes - 1]}) - Gbps
    </th>
))}
<th>Uso - Gbps</th>
<th>%Uso</th>

</tr>

</thead>

<tbody>

{resumenUltimosTresMeses.map((item,index)=>(

<tr key={index}>

<td
    style={{
        fontWeight: "bold",
        color:
            item.bill_name === "WIN-ANILLO CENTRO"
                ? "#2563eb"
            : item.bill_name === "WIN-ANILLO CENTRO-OESTE"
                ? "#16a34a"
            : item.bill_name === "WIN-ANILLO ESTE"
                ? "#dc2626"
            : item.bill_name === "WIN-ANILLO NORTE"
                ? "#7c3aed"
            : item.bill_name === "WIN-ANILLO SUR"
                ? "#f59e0b"
            : "#000"
    }}
>
    {item.bill_name}
</td>

<td>{formatGbps(item.capacidad)}</td>

{ultimosTresPeriodos.map(periodo => {
    const registro = item.registrosPorPeriodo[
        `${periodo.anio}-${periodo.mes}`
    ];

    return (
        <td key={`${item.bill_name}-${periodo.anio}-${periodo.mes}`}>
            {registro ? formatGbps(registro.uso) : "-"}
        </td>
    );
})}

<td>{formatGbps(item.uso)}</td>

<td
    style={{
        fontWeight: "bold",
        color:
            item.bill_name === "WIN-ANILLO CENTRO"
                ? "#2563eb"
            : item.bill_name === "WIN-ANILLO CENTRO-OESTE"
                ? "#16a34a"
            : item.bill_name === "WIN-ANILLO ESTE"
                ? "#dc2626"
            : item.bill_name === "WIN-ANILLO NORTE"
                ? "#7c3aed"
            : item.bill_name === "WIN-ANILLO SUR"
                ? "#f59e0b"
            : "#000"
    }}
>
    {Number.isFinite(Number(item.porcentaje_uso))
        ? `${Number(item.porcentaje_uso).toFixed(2)}%`
        : "-"}
</td>

</tr>

))}

</tbody>

</table>

</div>

</div>
</div>
</div>

)}

            </main>

        </div>

    );
}

export default Dashboard;


