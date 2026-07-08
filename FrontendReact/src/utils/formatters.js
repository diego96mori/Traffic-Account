export const formatGbps = (value, decimals = 3) => {
  const number = Number(value || 0);

  if (!Number.isFinite(number)) {
    return "0";
  }

  return number.toFixed(decimals).replace(/\.?0+$/, "");
};

const MESES_ES = {
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

export const formatPeriodo = (periodo = "") => {
  const [mes, anio] = String(periodo).split("-");

  if (!mes || !anio) {
    return periodo;
  }

  return `${MESES_ES[mes] || mes}-${anio}`;
};
