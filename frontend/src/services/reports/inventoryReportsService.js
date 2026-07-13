import { REPORTS } from "../../api/endpoints";
import { runReport } from "./reportsService";

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

export const inventoryReportsService = {
  getItemMovement,
  getLowStock,
  getStockLedger,
  getStockSummary,
  getStockValuation,
};
