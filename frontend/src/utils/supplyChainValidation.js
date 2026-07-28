const toOptionalNumber = (value) => {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
};

export const getEffectiveDateRangeError = (effectiveFrom, effectiveTo) => {
  if (!effectiveFrom || !effectiveTo) {
    return "";
  }

  return effectiveTo < effectiveFrom
    ? "Effective to must be on or after effective from."
    : "";
};

export const getNetVsGrossWeightError = (netWeight, grossWeight) => {
  const net = toOptionalNumber(netWeight);
  const gross = toOptionalNumber(grossWeight);

  if (net === null || gross === null) {
    return "";
  }

  return net > gross ? "Net weight cannot exceed gross weight." : "";
};
