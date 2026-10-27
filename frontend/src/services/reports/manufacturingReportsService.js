import axiosInstance from "../../api/axios";
import { normalizeParams, unwrapResponse } from "../apiServiceUtils";

const quantityByUnit = (totals, field) => totals.map((total) => (
  `${total[field] == null ? "Unavailable" : total[field]} ${total.unitName ?? `Unit ${total.unitId}`}`
)).join("; ");

const load = async (kind, params, { signal } = {}) => {
  const response = unwrapResponse(await axiosInstance.get(`/api/v1/manufacturing/reports/${kind}`, {
    params: normalizeParams(params), signal,
  }));
  const page = response.data;
  const totals = Array.isArray(page.summary) ? page.summary : [];
  return {
    ...response,
    data: {
      ...page,
      unitTotals: totals,
      items: page.items.map((row) => ({
        ...row,
        productionDate: row.businessDate,
        productionReference: `${row.sourceType} #${row.sourceId}`,
        referenceNumber: `${row.sourceType} #${row.sourceId}`,
        finishedItemName: kind === "production" ? row.itemName : undefined,
        componentItemName: kind === "materials" ? row.itemName : undefined,
        componentItemCode: kind === "materials" ? row.itemCode : undefined,
        producedQuantity: row.goodOutput,
        unitShortName: row.unitName,
        status: "Posted",
      })),
      reportTitle: kind === "production" ? "Posted Production" : "Actual Material Consumption",
      summary: {
        eventCount: page.totalCount,
        quantityByUnit: quantityByUnit(totals, kind === "production" ? "goodOutput" : "actualConsumedQuantity"),
      },
    },
  };
};

export const manufacturingReportsService = {
  getProductionHistory: (params, options) => load("production", params, options),
  getConsumptionHistory: (params, options) => load("materials", params, options),
};
