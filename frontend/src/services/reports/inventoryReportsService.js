import { REPORTS } from "../../api/endpoints";
import { runReport } from "./reportsService";

const omitItemLedgerPathParams = (params = {}) => {
  const queryParams = { ...params };

  delete queryParams.itemId;

  return queryParams;
};

export const getStockSummary = (params, options) =>
  runReport(REPORTS.inventory.stockSummary, params, options);

export const getStockLedger = (params, options) =>
  runReport(REPORTS.inventory.stockLedger, params, options);

export const getItemMovement = (params, options) =>
  runReport(REPORTS.inventory.itemMovement, params, options);

export const getLowStock = (params, options) =>
  runReport(REPORTS.inventory.lowStock, params, options);

export const getStockValuation = (params, options) =>
  runReport(REPORTS.inventory.stockValuation, params, options);

export const getNegativeStock = (params, options) =>
  runReport(REPORTS.inventory.negativeStock, params, options);

export const getStockMovements = (params, options) =>
  runReport(REPORTS.inventory.stockMovements, params, options);

export const getItemLedger = (itemId, params, options) =>
  runReport(
    REPORTS.inventory.itemLedger(itemId),
    omitItemLedgerPathParams(params),
    options,
  );

export const getDeadStock = (params, options) =>
  runReport(REPORTS.inventory.deadStock, params, options);

export const getFastMovingItems = (params, options) =>
  runReport(REPORTS.inventory.fastMovingItems, params, options);

export const getSlowMovingItems = (params, options) =>
  runReport(REPORTS.inventory.slowMovingItems, params, options);

export const inventoryReportsService = {
  getDeadStock,
  getFastMovingItems,
  getItemLedger,
  getItemMovement,
  getLowStock,
  getNegativeStock,
  getSlowMovingItems,
  getStockLedger,
  getStockMovements,
  getStockSummary,
  getStockValuation,
};
