export const formatGbps = (value, decimals = 3) => {
  const number = Number(value || 0);

  if (!Number.isFinite(number)) {
    return "0";
  }

  return number.toFixed(decimals).replace(/\.?0+$/, "");
};
