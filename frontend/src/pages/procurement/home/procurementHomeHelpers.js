const firstDefined = (record, keys) => {
  for (const key of keys) {
    if (record?.[key] !== undefined && record?.[key] !== null) {
      return record[key];
    }
  }

  return null;
};

const DEFAULT_ORDER_SUMMARY_MESSAGES = {
  materialNeedsOrder: "material needs an order",
  materialsNeedOrder: "materials need an order",
  nothingToOrder: "Nothing to order",
};

export const getOrderSummary = (
  value,
  messages = DEFAULT_ORDER_SUMMARY_MESSAGES,
) => {
  const count = Math.max(0, Math.trunc(Number(value) || 0));

  if (count === 0) {
    return {
      count,
      showCount: false,
      text: messages.nothingToOrder,
    };
  }

  return {
    count,
    showCount: true,
    text:
      count === 1
        ? messages.materialNeedsOrder
        : messages.materialsNeedOrder,
  };
};

export const getPlanningLineToOrder = (line) =>
  Number(
    firstDefined(line, [
      "finalQuantity",
      "toOrderQuantity",
      "calculatedSuggestedQuantity",
      "suggestedQuantity",
    ]),
  ) || 0;

export const getPlanningLineStock = (line) =>
  firstDefined(line, ["physicalStock", "stockTotal", "currentStock"]);

export const getPlanningLineInboundStock = (line) =>
  firstDefined(line, ["inboundStock"]);

export const getPlanningLineProjectedAvailableStock = (line) =>
  firstDefined(line, ["projectedAvailableStock"]);

export const getPlanningLineReorderPoint = (line) =>
  firstDefined(line, ["reorderPoint"]);

export const getPlanningLineShortfall = (line) =>
  Number(firstDefined(line, ["shortage", "shortfall"])) || 0;

export const getPlanningLineCover = (line) =>
  firstDefined(line, [
    "coverDays",
    "stockCoverDays",
    "daysOfCover",
    "inventoryCoverDays",
  ]);

export const getPlanningLineStatus = (line) => {
  const toOrder = getPlanningLineToOrder(line);
  const shortage = getPlanningLineShortfall(line);
  const stock = Number(
    getPlanningLineProjectedAvailableStock(line) ?? getPlanningLineStock(line),
  );
  const reorderPoint = Number(getPlanningLineReorderPoint(line));

  if (toOrder > 0 || shortage > 0) {
    return { label: "Order now", tone: "red", rank: 0 };
  }

  if (
    Number.isFinite(stock) &&
    Number.isFinite(reorderPoint) &&
    reorderPoint > 0 &&
    stock <= reorderPoint * 1.1
  ) {
    return { label: "Watch", tone: "amber", rank: 1 };
  }

  return { label: "OK", tone: "emerald", rank: 2 };
};

export const sortPlanningLines = (lines) =>
  [...lines].sort((first, second) => {
    const statusDifference =
      getPlanningLineStatus(first).rank - getPlanningLineStatus(second).rank;

    if (statusDifference !== 0) {
      return statusDifference;
    }

    const shortageDifference =
      getPlanningLineShortfall(second) - getPlanningLineShortfall(first);

    if (shortageDifference !== 0) {
      return shortageDifference;
    }

    return getPlanningLineToOrder(second) - getPlanningLineToOrder(first);
  });

export const getPlanningCsvRows = (lines) => lines.map((line) => [
  line.materialItemCode ?? "",
  line.materialItemName ?? "",
  line.unitShortName ?? line.unitName ?? "",
  getPlanningLineStock(line),
  getPlanningLineInboundStock(line),
  getPlanningLineProjectedAvailableStock(line),
  getPlanningLineReorderPoint(line),
  getPlanningLineToOrder(line),
  getPlanningLineCover(line),
  getPlanningLineStatus(line).label,
]);

export const getCalculationSteps = (line) => [
  {
    group: "demand",
    key: "usage",
    label: "Avg daily usage",
    value: line?.averageDailyUsage,
  },
  {
    group: "demand",
    key: "lead-time",
    label: "Lead time",
    operatorBefore: "×",
    suffix: "days",
    value: line?.leadTimeDays,
  },
  {
    group: "demand",
    key: "lead-demand",
    label: "Demand during lead time",
    operatorBefore: "=",
    value: line?.leadTimeDemand,
  },
  {
    group: "reorder",
    key: "lead-demand-reorder",
    label: "Lead-time demand",
    value: line?.leadTimeDemand,
  },
  {
    group: "reorder",
    key: "safety",
    label: "Safety stock",
    operatorBefore: "+",
    value: line?.safetyStock,
  },
  {
    group: "reorder",
    key: "reorder",
    label: "Reorder point",
    operatorBefore: "=",
    value: line?.reorderPoint,
  },
  {
    group: "stock",
    key: "physical-stock",
    label: "Physical stock",
    value: getPlanningLineStock(line),
  },
  {
    group: "stock",
    key: "inbound-stock",
    label: "Inbound",
    operatorBefore: "+",
    value: getPlanningLineInboundStock(line),
  },
  {
    group: "stock",
    key: "projected-available",
    label: "Projected available",
    operatorBefore: "=",
    value: getPlanningLineProjectedAvailableStock(line),
  },
  {
    group: "shortage",
    key: "reorder-shortage",
    label: "Reorder point",
    value: line?.reorderPoint,
  },
  {
    group: "shortage",
    key: "projected-shortage",
    label: "Projected available",
    operatorBefore: "−",
    value: getPlanningLineProjectedAvailableStock(line),
  },
  {
    group: "shortage",
    key: "shortage",
    label: "Shortage",
    operatorBefore: "=",
    value: firstDefined(line, ["shortage", "shortfall"]),
  },
  {
    group: "recommendation",
    key: "system",
    label: "System suggestion",
    value: firstDefined(line, [
      "calculatedSuggestedQuantity",
      "suggestedQuantity",
    ]),
  },
  {
    group: "recommendation",
    key: "to-order",
    label: "To order",
    operatorBefore: "→",
    value: getPlanningLineToOrder(line),
  },
];
