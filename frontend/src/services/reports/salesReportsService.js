import { REPORTS } from "../../api/endpoints";
import { runReport } from "./reportsService";

export const getSalesSummary = (params, options) =>
  runReport(REPORTS.sales.summary, params, options);

export const getSalesInvoices = (params, options) =>
  runReport(REPORTS.sales.invoices, params, options);

export const getSalesByParty = (params, options) =>
  runReport(REPORTS.sales.byParty, params, options);

export const getSalesByItem = (params, options) =>
  runReport(REPORTS.sales.byItem, params, options);

export const getPaymentsIn = (params, options) =>
  runReport(REPORTS.sales.paymentsIn, params, options);

export const getSalesReceivables = (params, options) =>
  runReport(REPORTS.sales.receivables, params, options);

export const getSalesTaxSummary = (params, options) =>
  runReport(REPORTS.sales.taxSummary, params, options);

export const salesReportsService = {
  getSalesByItem,
  getSalesByParty,
  getSalesInvoices,
  getSalesReceivables,
  getSalesSummary,
  getSalesTaxSummary,
  getPaymentsIn,
};
