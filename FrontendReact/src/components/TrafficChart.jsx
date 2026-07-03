import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  LabelList,
  Cell
} from "recharts";

function TrafficChart({ data, medida = "Gbps" }) {

  const datosOrdenados = [...data].sort((a, b) => {
    if (a.anio !== b.anio) {
      return a.anio - b.anio;
    }

    return a.mes - b.mes;
  });

 //=========================
  // Meses en español
  //=========================

  const meses = {
    Jan: "Ene",
    Feb: "Feb",
    Mar: "Mar",
    Apr: "Abr",
    May: "May",
    Jun: "Jun",
    Jul: "Jul",
    Aug: "Ago",
    Sep: "Sep",
    Oct: "Oct",
    Nov: "Nov",
    Dec: "Dic"
  };

  const factorMedida = {
    Gbps: 1,
    Mbps: 1000,
    Kbps: 1000000
  };

  const convertirMedida = (valor) => {
    const valorConvertido =
      Number(valor || 0) * (factorMedida[medida] || 1);

    if (medida === "Gbps") {
      return Number(valorConvertido);
    }

    return Number(valorConvertido.toFixed(2));
  };

  const formatearNumero = (valor) => {
    const numero = Number(valor || 0);

    if (Number.isInteger(numero)) {
      return numero.toString();
    }

    return numero.toFixed(2).replace(/\.?0+$/, "");
  };


  const datosGrafico = datosOrdenados.map((item) => {

    const [mes, anio] = item.periodo.split("-");

    return {
      ...item,
      periodo_es: `${meses[mes]}-${anio}`,
      capacidad: convertirMedida(item.capacidad),
      inbound: convertirMedida(item.inbound),
      outbound: convertirMedida(item.outbound),
      uso: convertirMedida(item.uso)
    };

  });


  return (
    <div style={{ width: "100%" }}>
    <ResponsiveContainer width="100%" height={560}>
  <ComposedChart
  data={datosGrafico}
  margin={{
    top: 80,
    right: 30,
    left: 20,
    bottom: 140
  }}
  barGap={8}
>

        <CartesianGrid
          strokeDasharray="3 3"
          opacity={0.4}
        />

<XAxis
  dataKey="periodo_es"
  angle={0}
  textAnchor="middle"
  height={100}
  interval={0}
  tickMargin={55}
  tick={{
    fontSize: 12,
    fontWeight: "bold",
    fill: "#333"
  }}
/>
        <YAxis
          label={{
            value: medida,
            angle: -90,
            position: "insideLeft"
          }}
        />

        <Tooltip
          formatter={(value, name) => [
            `${formatearNumero(value)} ${medida}`,
            name
          ]}
        />

        <Legend
          verticalAlign="top"
          align="left"
          iconType="circle"
          height={50}
          wrapperStyle={{
            left: "10px",
            top: "5px",
            fontWeight: "bold"
          }}
        />

        <Bar
          dataKey="capacidad"
          name="Capacidad del Enlace"
          barSize={50}
          radius={[4, 4, 0, 0]}
        >

          {datosGrafico.map((entry, index) => {

            const uso = Number(entry.porcentaje_uso);

            let color;

            if (uso < 50) {
              color = "#00c853";
            }
            else if (uso >= 50 && uso < 70) {
              color = "#ffb300";
            }
            else {
              color = "#ff1744";
            }

            return (
              <Cell
                key={`cell-${index}`}
                fill={color}
              />
            );

          })}

         <LabelList
            dataKey="capacidad"
            content={(props) => {

            const {
              x,
              y,
              width,
              height,
              value
            } = props;

            return (
              <text
                x={x + width / 2}
                y={y + height + 45}
                textAnchor="middle"
                fontSize={15}
                fontWeight="900"
                fill="black"
              >
                {formatearNumero(value)}
              </text>
        );

      }}
    />
        </Bar>

        <Line
          type="monotone"
          dataKey="inbound"
          name="Inbound"
          stroke="#d81b60"
          strokeWidth={3}
          dot={{
            r: 4,
            fill: "#d81b60"
          }}
          activeDot={{ r: 7 }}
        >

          <LabelList
            dataKey="inbound"
            content={(props) => {

              const {
                x,
                y,
                value,
                index
              } = props;

              const inbound =
                Number(
                  datosGrafico[index]?.inbound || 0
                );

              const outbound =
                Number(
                  datosGrafico[index]?.outbound || 0
                );

              const offset =
                inbound >= outbound
                  ? -12
                  : 25;

              return (
                <text
                  x={x}
                  y={y + offset}
                  textAnchor="middle"
                  fontSize="14"
                  fill="black"
                  fontWeight="bold"
                >
                  {formatearNumero(value)}
                </text>
              );
            }}
          />

        </Line>

        <Line
          type="monotone"
          dataKey="outbound"
          name="Outbound"
          stroke="#0033cc"
          strokeWidth={3}
          dot={{
            r: 4,
            fill: "#0033cc"
          }}
          activeDot={{ r: 7 }}
        >

          <LabelList
            dataKey="outbound"
            content={(props) => {

              const {
                x,
                y,
                value,
                index
              } = props;

              const inbound =
                Number(
                  datosGrafico[index]?.inbound || 0
                );

              const outbound =
                Number(
                  datosGrafico[index]?.outbound || 0
                );

              const offset =
                outbound >= inbound
                  ? -12
                  : 25;

              return (
                <text
                  x={x}
                  y={y + offset}
                  textAnchor="middle"
                  fontSize="14"
                  fill="black"
                  fontWeight="bold"
                >
                  {formatearNumero(value)}
                </text>
              );
            }}
          />

        </Line>

      </ComposedChart>
    </ResponsiveContainer>

    <div
      style={{
        display: "flex",
        justifyContent: "flex-start",
        alignItems: "center",
        gap: "22px",
        marginTop: "-18px",
        marginBottom: "18px",
        marginLeft: "18px",
        fontSize: "17px",
        fontWeight: "bold",
        color: "#333"
      }}
    >
      <span>
        Capacidad de enlace:
      </span>

      <span style={{ display: "flex", alignItems: "center", gap: "7px" }}>
        <span
          style={{
            width: "16px",
            height: "16px",
            borderRadius: "3px",
            background: "#00c853",
            display: "inline-block"
          }}
        />
        Verde &lt; 50%
      </span>

      <span style={{ display: "flex", alignItems: "center", gap: "7px" }}>
        <span
          style={{
            width: "16px",
            height: "16px",
            borderRadius: "3px",
            background: "#ffb300",
            display: "inline-block"
          }}
        />
        Amarillo &gt;= 50% y &lt; 70%
      </span>

      <span style={{ display: "flex", alignItems: "center", gap: "7px" }}>
        <span
          style={{
            width: "16px",
            height: "16px",
            borderRadius: "3px",
            background: "#ff1744",
            display: "inline-block"
          }}
        />
        Rojo &gt;= 70%
      </span>
    </div>
    </div>
  );
}

export default TrafficChart;
