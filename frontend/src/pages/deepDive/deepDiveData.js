import { planningService } from "../../services/procurement/planningService";
import { dispatchReportService } from "../../services/dispatch/reportService";
import { rojmelDashboardService } from "../../services/rojmel/dashboardService";
import { rojmelReportService } from "../../services/rojmel/reportService";
import { transactionService } from "../../services/rojmel/transactionService";
import { gstService } from "../../services/gst/gstService";
import { oeeProductionEntryService } from "../../services/oee/oeeProductionEntryService";
import { loadDowntimeEntries } from "../oee/dashboard/downtimeAnalysis";
import { comparisonRange } from "../oee/insights/productionInsights";
import { canPerformAction } from "../../utils/permissionResolver";
import { DEEP_SOURCES } from "./deepDiveConfig";

export function sourcePermissions(auth, action = "view") {
  return Object.fromEntries(
    Object.entries(DEEP_SOURCES).map(([key, target]) => [
      key,
      canPerformAction({
        action,
        target,
        pages: auth.pages || [],
        roles: auth.roles || [],
        user: auth.user,
      }),
    ]),
  );
}

export const validRange = (range) => {
  const prior = comparisonRange(range);
  return Boolean(prior && prior.days <= 366);
};

export function gstRange(range) {
  return {
    FromDate: new Date(`${range.fromDate}T00:00:00+05:30`).toISOString(),
    ToDate: new Date(`${range.toDate}T23:59:59.999+05:30`).toISOString(),
  };
}

export const asRows = (response) => {
  const data = response?.data;
  const rows = Array.isArray(data) ? data : data?.items;
  if (
    Array.isArray(rows) &&
    rows.every((row) => row && typeof row === "object" && !Array.isArray(row))
  )
    return rows;
  throw new Error("The source returned an unexpected collection.");
};
const asObject = (response) => {
  if (
    !response?.data ||
    typeof response.data !== "object" ||
    Array.isArray(response.data)
  )
    throw new Error("The source returned an unexpected summary.");
  return response.data;
};

// A bounded complete load: never turn the first page into an executive total.
export async function completeList(fetchPage, params, signal) {
  const rows = [];
  let total;
  const pageSignatures = new Set();
  for (let page = 1; page <= 25; page++) {
    if (signal?.aborted) throw new Error("Cancelled");
    const response = await fetchPage(
      { ...params, PageNumber: page, PageSize: 200 },
      { signal },
    );
    if (signal?.aborted) throw new Error("Cancelled");
    const batch = asRows(response);
    const count = response.data?.totalCount;
    if (!Number.isInteger(count) || count < 0)
      throw new Error("The source did not supply a reliable record count.");
    if (page === 1) total = count;
    if (total !== count)
      throw new Error("Records changed during loading. Refresh to try again.");
    const signature = JSON.stringify(batch);
    if (batch.length && pageSignatures.has(signature))
      throw new Error("The source repeated a page. Totals are unavailable.");
    pageSignatures.add(signature);
    rows.push(...batch);
    if (rows.length === total) return rows;
    if (!batch.length || rows.length > total)
      throw new Error("The source returned incomplete records.");
  }
  throw new Error(
    "More than 5,000 records. Select a shorter period to analyse the complete result.",
  );
}

export async function loadSource(key, range, signal) {
  const params = { FromDate: range.fromDate, ToDate: range.toDate };
  const options = { signal };
  switch (key) {
    case "production":
      return loadDowntimeEntries(
        oeeProductionEntryService.getProductionEntries,
        params,
        signal,
      );
    case "productionPrior": {
      const prior = comparisonRange(range);
      return loadDowntimeEntries(
        oeeProductionEntryService.getProductionEntries,
        { FromDate: prior.fromDate, ToDate: prior.toDate },
        signal,
      );
    }
    case "planning":
      return completeList(planningService.listRuns, params, signal);
    case "dispatch":
      return completeList(
        dispatchReportService.list,
        { ...params, Status: 4 },
        signal,
      );
    case "summary":
      return validateFinancialSummary(
        asObject(await rojmelDashboardService.getSummary(params, options)),
      );
    case "wallets":
      return asRows(
        await rojmelDashboardService.getWalletBalances({}, options),
      );
    case "transactions":
      return completeList(
        transactionService.getTransactions,
        { ...params, SortBy: "transactionDate", SortDirection: "desc" },
        signal,
      );
    case "cashflow":
      return validateCashflow(
        asRows(await rojmelReportService.getDailyCashFlow(params, options)),
      );
    case "configuration": {
      const config = asObject(await gstService.configuration(options));
      if (
        ["enabledFeatures", "missingSettings"].some(
          (key) =>
            config[key] != null &&
            (!Array.isArray(config[key]) ||
              config[key].some((value) => typeof value !== "string")),
        )
      )
        throw new Error("Unexpected GST configuration response.");
      return config;
    }
    case "registrations":
      return completeList(
        gstService.registrations,
        { SortBy: "CreatedAt", SortDirection: "DESC" },
        signal,
      );
    case "logs":
      return completeList(
        gstService.logs,
        { ...gstRange(range), SortBy: "CreatedAt", SortDirection: "DESC" },
        signal,
      );
    default:
      throw new Error("Unsupported data source.");
  }
}

export const number = (value) =>
  value == null ||
  !["number", "string"].includes(typeof value) ||
  String(value).trim() === "" ||
  !Number.isFinite(Number(value))
    ? null
    : Number(value);
export const formatNumber = (value, digits = 0) =>
  number(value) == null
    ? "—"
    : Number(value).toLocaleString("en-IN", { maximumFractionDigits: digits });
export const money = (value) =>
  number(value) == null
    ? "—"
    : Number(value).toLocaleString("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      });
export const percent = (value) =>
  number(value) == null ? "—" : `${formatNumber(value, 1)}%`;
export function dispatchTotals(rows) {
  const eligible = rows.filter(
    (row) =>
      number(row.recommendedQuantity) > 0 &&
      number(row.allocatedQuantity) !== null &&
      number(row.allocatedQuantity) >= 0,
  );
  const recommended = eligible.reduce(
    (sum, row) => sum + Number(row.recommendedQuantity),
    0,
  );
  const allocated = eligible.reduce(
    (sum, row) => sum + Number(row.allocatedQuantity),
    0,
  );
  return {
    recommended,
    allocated,
    ratio: recommended ? (allocated / recommended) * 100 : null,
    gap: eligible.reduce(
      (sum, row) =>
        sum +
        Math.max(
          0,
          Number(row.recommendedQuantity) - Number(row.allocatedQuantity),
        ),
      0,
    ),
    eligible: eligible.length,
    excluded: rows.length - eligible.length,
  };
}
export function gstOutcome(row) {
  return row.isSuccess === true
    ? "Completed"
    : row.isSuccess === false
      ? "Failed"
      : "Unknown";
}

export function observationTime(value) {
  if (!value || typeof value !== "string") return "Not supplied";
  const date = new Date(
    /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value) ? value : `${value}Z`,
  );
  return Number.isFinite(date.getTime())
    ? date.toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Not supplied";
}

export function validateFinancialSummary(data) {
  if (
    typeof data.isAllWalletView !== "boolean" ||
    [
      "companyWalletBalance",
      "totalWalletBalance",
      "totalIncome",
      "totalExpense",
      "totalTransfers",
    ].some((key) => number(data[key]) === null)
  )
    throw new Error("The source returned an incomplete financial summary.");
  return data;
}
export function validateCashflow(rows) {
  if (
    rows.some(
      (row) =>
        !comparisonRange({
          fromDate: row.transactionDate?.slice(0, 10),
          toDate: row.transactionDate?.slice(0, 10),
        }) ||
        ["income", "expense", "netIncomeExpense"].some(
          (key) => number(row[key]) === null,
        ),
    )
  )
    throw new Error("The source returned incomplete cashflow records.");
  return rows;
}

export function safeSourceError(error) {
  const status = error?.response?.status;
  if (status === 401)
    return "Your session expired. Sign in again to read this source.";
  if (status === 403)
    return "Access denied by the server. Contact your administrator.";
  if (status >= 500)
    return "The source is temporarily unavailable. Refresh to retry.";
  if (error?.code === "ERR_NETWORK")
    return "Connection unavailable. Check your network and refresh.";
  if (error?.code === "ECONNABORTED")
    return "The source timed out. Refresh to retry.";
  // Do not render arbitrary server error text or provider payloads.
  return error?.response
    ? "Unable to read this source. Refresh to retry."
    : error?.message || "Unable to read this source.";
}
