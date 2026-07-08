import { useEffect, useState } from "react";
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
    const datosAnillosTotales = [];
    const mesesNombre = [
        "Ene","Feb","Mar","Abr","May","Jun",
        "Jul","Ago","Sep","Oct","Nov","Dic"
    ];

    useEffect(() => {

    if (datos.length > 0 && !billSeleccionado) {

        const primerBill = [
            ...new Set(
                datos.map(item => item.bill_name)
            )
        ].sort()[0];

        setBillSeleccionado(primerBill);
    }

}, [datos, billSeleccionado]);

useEffect(() => {

    const cargarDatos = () => {

        api.get("/trafico")
            .then((response) => {

                const datosAnillo =
                    response.data.filter(
                        item =>
                            item.grupo ===
                            "TRAFICO POR ANILLO"
                    );

                setDatos(datosAnillo);

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

    }, 180000); // 3 minutos

    return () => clearInterval(intervalo);

}, []);
    const bills = [
        ...new Set(
            datos.map(item => item.bill_name)
        )
    ].sort();

  const datosGrafico = datos.filter(item => {

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

const ultimoRegistro = [...datos]
    .sort((a,b)=>{

        if(a.anio!==b.anio){
            return b.anio-a.anio;
        }

        return b.mes-a.mes;

    })[0];

const ultimoMes = Number(ultimoRegistro?.mes);
const ultimoAnio = Number(ultimoRegistro?.anio);

const resumenUltimoMes = datos
    .filter(item=>

        Number(item.anio)===ultimoAnio &&
        Number(item.mes)===ultimoMes

    )
    .sort((a,b)=>
        a.bill_name.localeCompare(b.bill_name)
    );


const anioActual = new Date().getFullYear();

const mesesDisponiblesAnioActual = [
    ...new Set(
        datos
            .filter(item => Number(item.anio) === anioActual)
            .map(item => Number(item.mes))
            .filter(mes => mes >= 1 && mes <= 12)
    )
].sort((a,b) => a - b);

for (const mes of mesesDisponiblesAnioActual) {



  const fila = {
    periodo: mesesNombre[mes - 1]
  };

  const centro = datos.find(
    d =>
      d.bill_name === "WIN-ANILLO CENTRO" &&
      Number(d.anio) === anioActual &&
      Number(d.mes) === mes
  );

  const oeste = datos.find(
    d =>
      d.bill_name === "WIN-ANILLO CENTRO-OESTE" &&
      Number(d.anio) === anioActual &&
      Number(d.mes) === mes
  );

  const este = datos.find(
    d =>
      d.bill_name === "WIN-ANILLO ESTE" &&
      Number(d.anio) === anioActual &&
      Number(d.mes) === mes
  );

  const norte = datos.find(
    d =>
      d.bill_name === "WIN-ANILLO NORTE" &&
      Number(d.anio) === anioActual &&
      Number(d.mes) === mes
  );

  const sur = datos.find(
    d =>
      d.bill_name === "WIN-ANILLO SUR" &&
      Number(d.anio) === anioActual &&
      Number(d.mes) === mes
  );

  fila.centro = Number(centro?.uso || 0);
  fila.oeste = Number(oeste?.uso || 0);
  fila.este = Number(este?.uso || 0);
  fila.norte = Number(norte?.uso || 0);
  fila.sur = Number(sur?.uso || 0);

  datosAnillosTotales.push(fila);
}

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
            Cargando Trafico Anillos...
        </div>
    );
}


    return (

        <div className="dashboard-layout">

            <Sidebar />

            <main className="dashboard-content">

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
            onChange={(e) =>
                setBillSeleccionado(e.target.value)
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

        <label>Año:</label>

        <select
            value={anioSeleccionado}
            onChange={(e) =>
                setAnioSeleccionado(e.target.value)
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
  Comparativo Anillos {anioActual}
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
Resumen del último mes
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

<th>Bill</th>
<th>Periodo</th>
<th>Capacidad</th>
<th>Uso</th>
<th>% Uso</th>

</tr>

</thead>

<tbody>

{resumenUltimoMes.map((item,index)=>(

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

<td>{formatPeriodo(item.periodo)}</td>

<td>{formatGbps(item.capacidad)}</td>

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
    {Number(item.porcentaje_uso).toFixed(2)}%
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


