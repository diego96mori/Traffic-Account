import { memo } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
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

function TrafficChart({
  data,
  medida = "Gbps",
  variant = "lineas",
  onPeriodoActivo
}) {
  const COLOR_INBOUND = "#7e22ce";
  const COLOR_OUTBOUND = "#0033cc";
  const COLOR_INBOUND_BAR = "#2dd4bf";
  const COLOR_OUTBOUND_BAR = "#60a5fa";

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

  const colorCapacidad = (entry) => {
    const uso = Number(entry.porcentaje_uso);

    if (uso < 50) {
      return "#00c853";
    }

    if (uso >= 50 && uso < 70) {
      return "#ffb300";
    }

    return "#ff1744";
  };

  const gradienteCapacidad = (entry) => {
    const uso = Number(entry.porcentaje_uso);

    if (uso < 50) return "url(#capacidad-verde)";
    if (uso < 70) return "url(#capacidad-amarillo)";
    return "url(#capacidad-rojo)";
  };

  const renderCapacidadLabel = (props) => {
    const {
      x,
      y,
      width,
      value
    } = props;

    const labelX = x + width / 2;
    const labelY = y - 6;

    return (
      <text
        x={labelX}
        y={labelY}
        textAnchor="middle"
        fontSize={13}
        fontWeight="bold"
        fill="#111"
      >
        {formatearNumero(value)}
      </text>
    );
  };

  const renderTrafficLabel = (dataKey) => (props) => {
    const {
      x,
      y,
      width,
      height,
      value,
      index
    } = props;

    const inbound = Number(datosGrafico[index]?.inbound || 0);
    const outbound = Number(datosGrafico[index]?.outbound || 0);
    const valorActual = Number(value || 0);
    const mayorTrafico =
      dataKey === "inbound"
        ? inbound >= outbound
        : outbound > inbound;

    const etiquetaDentro = mayorTrafico && height > 34;
    const labelX =
      x + width / 2 + (!etiquetaDentro && dataKey === "inbound" ? -5 : 0);
    const labelY = etiquetaDentro ? y + 15 : y - 6;

    return (
      <text
        x={labelX}
        y={labelY}
        textAnchor="middle"
        fontSize={13}
        fontWeight="bold"
        fill="#111"
      >
        {formatearNumero(valorActual)}
      </text>
    );
  };

  const leyendaUso = (
    <div
      style={{
        width: "360px",
        padding: "12px 14px",
        border: "1px solid #6b7280",
        borderRadius: "4px",
        background: "#ffffff",
        color: "#111827",
        fontSize: "14px",
        marginTop: "-18px",
        marginBottom: "18px",
        marginLeft: "18px"
      }}
      aria-label="Rangos de uso del enlace"
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", textAlign: "center" }}>
        <span>&lt; 50%</span>
        <span>50% - &lt; 70%</span>
        <span>&ge; 70%</span>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          height: "24px",
          marginTop: "6px",
          border: "1px solid #6b7280"
        }}
      >
        <span style={{ background: "repeating-linear-gradient(to bottom, #00c853 0 8px, #ffffff 8px 16px)" }} />
        <span style={{ background: "repeating-linear-gradient(to bottom, #ffb300 0 8px, #ffffff 8px 16px)" }} />
        <span style={{ background: "repeating-linear-gradient(to bottom, #ff1744 0 8px, #ffffff 8px 16px)" }} />
      </div>
      <div style={{ marginTop: "7px", fontWeight: "bold", textAlign: "center" }}>
        Capacidad de enlace
      </div>
    </div>
  );

  if (variant === "barras") {
    return (
      <div style={{ width: "100%", position: "relative" }}>
        <ResponsiveContainer width="100%" height={560}>
          <BarChart
            data={datosGrafico}
            onMouseMove={(estado) => {
              const indice = Number(estado?.activeTooltipIndex);

              if (Number.isInteger(indice) && datosGrafico[indice]) {
                onPeriodoActivo?.(datosGrafico[indice]);
              }
            }}
            onMouseLeave={() => onPeriodoActivo?.(null)}
            margin={{
              top: 80,
              right: 30,
              left: 20,
              bottom: 140
            }}
            barGap={10}
            barCategoryGap="26%"
          >
            <defs>
              <linearGradient
                id="capacidad-verde"
                x1="0" y1="0" x2="0" y2="20"
                gradientUnits="userSpaceOnUse"
                spreadMethod="repeat"
              >
                <stop offset="0%" stopColor="#00c853" />
                <stop offset="50%" stopColor="#00c853" />
                <stop offset="50%" stopColor="#ffffff" />
                <stop offset="100%" stopColor="#ffffff" />
              </linearGradient>
              <linearGradient
                id="capacidad-amarillo"
                x1="0" y1="0" x2="0" y2="20"
                gradientUnits="userSpaceOnUse"
                spreadMethod="repeat"
              >
                <stop offset="0%" stopColor="#ffb300" />
                <stop offset="50%" stopColor="#ffb300" />
                <stop offset="50%" stopColor="#ffffff" />
                <stop offset="100%" stopColor="#ffffff" />
              </linearGradient>
              <linearGradient
                id="capacidad-rojo"
                x1="0" y1="0" x2="0" y2="20"
                gradientUnits="userSpaceOnUse"
                spreadMethod="repeat"
              >
                <stop offset="0%" stopColor="#ff1744" />
                <stop offset="50%" stopColor="#ff1744" />
                <stop offset="50%" stopColor="#ffffff" />
                <stop offset="100%" stopColor="#ffffff" />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              opacity={0.4}
            />

            <XAxis
              dataKey="periodo_es"
              angle={0}
              textAnchor="middle"
              height={65}
              interval={0}
              tickMargin={20}
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
              cursor={{ fill: "rgba(37, 99, 235, 0.06)" }}
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
              isAnimationActive={false}
              barSize={24}
              radius={[4, 4, 0, 0]}
            >
              {datosGrafico.map((entry, index) => (
                <Cell
                  key={`capacidad-${index}`}
                  fill={gradienteCapacidad(entry)}
                />
              ))}

              <LabelList
                dataKey="capacidad"
                content={renderCapacidadLabel}
              />
            </Bar>

            <Bar
              dataKey="inbound"
              name="Inbound"
              isAnimationActive={false}
              fill={COLOR_INBOUND_BAR}
              barSize={24}
              radius={[4, 4, 0, 0]}
            >
              <LabelList
                dataKey="inbound"
                content={renderTrafficLabel("inbound")}
              />
            </Bar>

            <Bar
              dataKey="outbound"
              name="Outbound"
              isAnimationActive={false}
              fill={COLOR_OUTBOUND_BAR}
              barSize={24}
              radius={[4, 4, 0, 0]}
            >
              <LabelList
                dataKey="outbound"
                content={renderTrafficLabel("outbound")}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {leyendaUso}
      </div>
    );
  }

  return (
    <div style={{ width: "100%", position: "relative" }}>
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

            return (
              <Cell
                key={`cell-${index}`}
                fill={colorCapacidad(entry)}
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
          stroke={COLOR_INBOUND}
          strokeWidth={3}
          dot={{
            r: 4,
            fill: COLOR_INBOUND
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
          stroke={COLOR_OUTBOUND}
          strokeWidth={3}
          dot={{
            r: 4,
            fill: COLOR_OUTBOUND
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

    {leyendaUso}
    </div>
  );
}

export default memo(TrafficChart);
