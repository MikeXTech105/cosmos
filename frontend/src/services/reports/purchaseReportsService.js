import { REPORTS } from "../../api/endpoints";
import { runReport } from "./reportsService";

export const getPurchaseSummary = (params, options) =>
  runReport(REPORTS.purchase.summary, params, options);

export const getPurchaseBills = (params, options) =>
  runReport(REPORTS.purchase.bills, params, options);

export const getPurchaseBySupplier = (params, options) =>
  runReport(REPORTS.purchase.bySupplier, params, options);

export const getPurchaseByItem = (params, options) =>
  runReport(REPORTS.purchase.byItem, params, options);

export const getPaymentsOut = (params, options) =>
  runReport(REPORTS.purchase.paymentsOut, params, options);

export const getPayables = (params, options) =>
  runReport(REPORTS.purchase.payables, params, options);

export const getPurchaseTaxSummary = (params, options) =>
  runReport(REPORTS.purchase.taxSummary, params, options);

export const purchaseReportsService = {
  getPayables,
  getPaymentsOut,
  getPurchaseBills,
  getPurchaseByItem,
  getPurchaseBySupplier,
  getPurchaseSummary,
  getPurchaseTaxSummary,
};
