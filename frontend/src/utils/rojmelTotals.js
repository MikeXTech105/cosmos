// Sum in paise so common decimal amounts do not accumulate floating-point noise.
export const sumRojmelMoney = (rows, key, { excludeCancelled = false } = {}) =>
  rows.reduce((total, row) => {
    if (excludeCancelled && (Number(row.status) === 2 || String(row.status).toLowerCase() === "cancelled")) return total;
    const value = Number(row[key]);
    return total + (Number.isFinite(value) ? Math.round(value * 100) : 0);
  }, 0) / 100;
