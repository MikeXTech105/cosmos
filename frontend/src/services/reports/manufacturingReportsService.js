import { manufacturingProductionService } from "../manufacturing/manufacturingService";

const pageOf = (response) => {
  const data = response?.data ?? response ?? {};
  const items = Array.isArray(data) ? data : data.items ?? data.records ?? [];
  return {
    items,
    pageNumber: Number(data.pageNumber ?? 1),
    pageSize: Number(data.pageSize ?? items.length ?? 20),
    totalCount: Number(data.totalCount ?? items.length),
    totalPages: Math.max(1, Number(data.totalPages ?? 1)),
  };
};

const statusOf = (record) => {
  const value = record?.statusName ?? record?.status ?? "Draft";
  return typeof value === "number"
    ? ({ 1: "Draft", 2: "Posted", 3: "Cancelled" }[value] ?? String(value))
    : String(value);
};

const summaryOf = (items) => items.reduce((summary, record) => {
  const status = statusOf(record).toLowerCase();
  summary.totalProducedQuantity += Number(record.producedQuantity ?? record.quantity ?? 0);
  if (status === "posted") summary.postedCount += 1;
  if (status === "cancelled" || status === "canceled") summary.cancelledCount += 1;
  return summary;
}, { cancelledCount: 0, postedCount: 0, totalProducedQuantity: 0 });

export const manufacturingReportsService = {
  getProductionHistory: async (params, options = {}) => {
    const page = pageOf(await manufacturingProductionService.list(params, options));
    return {
      data: {
        ...page,
        reportTitle: "Manufacturing History",
        summary: { ...summaryOf(page.items), productionCount: page.totalCount },
      },
    };
  },

  getConsumptionHistory: async (params, options = {}) => {
    const page = pageOf(await manufacturingProductionService.list(params, options));
    const details = await Promise.all(page.items.map(async (record) => {
      const id = record.id ?? record.productionId ?? record.productionRecordId;
      if (!id) return record;
      const response = await manufacturingProductionService.getById(id);
      return response?.data ?? response;
    }));
    const items = details.flatMap((record) => {
      const lines = record.materialSnapshots ?? record.materials ?? record.components ?? [];
      return lines.map((line) => ({
        componentItemCode: line.componentItemCode ?? line.itemCode,
        componentItemName: line.componentItemName ?? line.itemName ?? line.item?.name,
        productionDate: record.productionDate,
        productionReference: record.referenceNumber ?? record.referenceNo,
        producedItemName: record.finishedItemName ?? record.itemName ?? record.finishedItem?.name,
        producedQuantity: record.producedQuantity ?? record.quantity,
        requiredQuantity: line.totalRequiredQuantity ?? line.requiredQuantity ?? line.consumedQuantity,
        status: statusOf(record),
        unitName: line.unitShortName ?? line.unitName,
        wastagePercentage: line.wastagePercentage ?? line.wastagePercent ?? 0,
      }));
    });
    return {
      data: {
        items,
        pageNumber: 1,
        pageSize: items.length || 20,
        reportTitle: "Raw Material Consumption",
        summary: {
          materialLineCount: items.length,
          productionCount: page.totalCount,
          totalConsumedQuantity: items.reduce((total, line) => total + Number(line.requiredQuantity ?? 0), 0),
        },
        totalCount: items.length,
        totalPages: 1,
      },
    };
  },
};
