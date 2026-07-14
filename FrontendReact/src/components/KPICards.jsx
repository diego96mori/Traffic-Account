import { useCallback, useMemo } from "react";

const FACTOR_MEDIDA = {
  Gbps: 1,
  Mbps: 1000,
  Kbps: 1000000
};

function KPICards({ data, medida = "Gbps", periodoActivo = null }) {

  const convertirMedida = useCallback((valor) => {
    const valorConvertido =
      Number(valor || 0) * (FACTOR_MEDIDA[medida] || 1);

    return valorConvertido.toFixed(2);
  }, [medida]);

  const resumen = useMemo(() => {

    if (!data || data.length === 0) {
      return {
        uso: 0,
        libre: 0,
        usoMedida: "0.00",
        libreMedida: "0.00",
        mayor70: 0,
        mayor50: 0
      };
    }

    const ordenado = [...data].sort((a, b) => {

      if (a.anio !== b.anio) {
        return a.anio - b.anio;
      }

      return a.mes - b.mes;

    });

    const periodoActualizado = periodoActivo
      ? ordenado.find(item =>
          item.bill_id === periodoActivo.bill_id &&
          Number(item.anio) === Number(periodoActivo.anio) &&
          Number(item.mes) === Number(periodoActivo.mes)
        )
      : null;

    const ultimo = periodoActualizado || ordenado[ordenado.length - 1];

    const usoGbps =
      Number(ultimo.uso || 0);

    const capacidadGbps =
      Number(ultimo.capacidad || 0);

    const libreGbps = Math.max(
      0,
      capacidadGbps - usoGbps
    );

    const uso =
      Number(ultimo.porcentaje_uso || 0);

    const libre = Math.max(
      0,
      100 - uso
    );

    const mayor70 = ordenado.filter(
      item =>
        Number(item.porcentaje_uso) >= 70
    ).length;

    const mayor50 = ordenado.filter(
      item => {

        const uso =
          Number(item.porcentaje_uso);

        return (
          uso >= 50 &&
          uso < 70
        );

      }
    ).length;

    return {
      uso: uso.toFixed(2),
      libre: libre.toFixed(2),
      usoMedida: convertirMedida(usoGbps),
      libreMedida: convertirMedida(libreGbps),
      mayor70,
      mayor50
    };

  }, [data, convertirMedida, periodoActivo]);

  return (

    <div className="kpi-container">

      {/* % USO */}

      <div className="kpi-card">

        <h3>% Uso</h3>

        <h1 className="kpi-number">
          {resumen.uso}%
        </h1>

        <p className="kpi-detail">
          {medida} usados: {resumen.usoMedida}
        </p>

      </div>

      {/* % LIBRE */}

      <div className="kpi-card">

        <h3>% Libre</h3>

        <h1 className="kpi-number">
          {resumen.libre}%
        </h1>

        <p className="kpi-detail">
          {medida} libres: {resumen.libreMedida}
        </p>

      </div>

{/* 50%-70% */}

<div className="kpi-card">

  <h3 className="kpi-title-months">
    Meses 50% - 70%
  </h3>

  <h1 className="kpi-counter">
    {resumen.mayor50}
  </h1>

</div>

{/* >70% */}

<div className="kpi-card">

  <h3 className="kpi-title-months">
    Meses &ge; 70%
  </h3>

  <h1 className="kpi-counter">
    {resumen.mayor70}
  </h1>

</div>

    </div>

  );

}

export default KPICards;
