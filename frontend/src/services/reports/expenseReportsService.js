import { REPORTS } from "../../api/endpoints";
import { runReport } from "./reportsService";

export const getExpenseSummary = (params, options) =>
  runReport(REPORTS.expenses.summary, params, options);

export const getExpenseByCategory = (params, options) =>
  runReport(REPORTS.expenses.byCategory, params, options);

export const getExpenseByParty = (params, options) =>
  runReport(REPORTS.expenses.byParty, params, options);

export const getExpenseMonthlySummary = (params, options) =>
  runReport(REPORTS.expenses.monthlySummary, params, options);

export const expenseReportsService = {
  getExpenseByCategory,
  getExpenseByParty,
  getExpenseMonthlySummary,
  getExpenseSummary,
};
