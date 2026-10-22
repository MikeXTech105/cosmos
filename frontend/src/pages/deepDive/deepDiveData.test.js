import { describe, expect, it, vi } from "vitest";
import {
  asRows,
  completeList,
  dispatchTotals,
  gstOutcome,
  gstRange,
  loadSource,
  money,
  number,
  safeSourceError,
  sourcePermissions,
  validRange,
  validateCashflow,
  validateFinancialSummary,
} from "./deepDiveData";
import { rojmelReportService } from "../../services/rojmel/reportService";
import { transactionService } from "../../services/rojmel/transactionService";
import { gstService } from "../../services/gst/gstService";
import { oeeProductionEntryService } from "../../services/oee/oeeProductionEntryService";
import { sumRojmelMoney } from "../../utils/rojmelTotals";

const granted = (pageName, route, extra = {}) => ({
  pageId: 1,
  pageName,
  route,
  canView: true,
  canExport: false,
  ...extra,
});
describe("Deep Dive source permissions", () => {
  it("does not grant finance, tax or planning through OEE access", () => {
    const auth = {
      pages: [granted("OEE.ProductionEntries", "/oee/production-entries")],
    };
    expect(
      Object.entries(sourcePermissions(auth))
        .filter(([, allowed]) => allowed)
        .map(([key]) => key),
    ).toEqual(["production", "productionPrior"]);
    expect(Object.values(sourcePermissions(auth, "export"))).not.toContain(
      true,
    );
  });
  it("keeps finance reports and dashboard permissions independent", () => {
    const access = sourcePermissions({
      pages: [
        granted("Rojmel.Reports", "/rojmel/reports", { canExport: true }),
      ],
    });
    expect(access.cashflow).toBe(true);
    expect(access.summary).toBe(false);
    expect(access.wallets).toBe(false);
    expect(access.transactions).toBe(false);
  });
  it("denies absent and revoked grants and honors existing superadmin", () => {
    expect(Object.values(sourcePermissions({}))).not.toContain(true);
    expect(
      sourcePermissions({
        pages: [granted("GST.Logs", "/gst/api-logs", { canView: false })],
      }).logs,
    ).toBe(false);
    expect(
      Object.values(sourcePermissions({ user: { isSuperAdmin: true } })),
    ).not.toContain(false);
  });
});
describe("Deep Dive aggregation boundaries", () => {
  it("weights allocations by recommended units and excludes invalid quantities", () => {
    expect(
      dispatchTotals([
        { recommendedQuantity: 6, allocatedQuantity: 6 },
        { recommendedQuantity: 24, allocatedQuantity: 14 },
        { recommendedQuantity: 100, allocatedQuantity: null },
        { recommendedQuantity: 0, allocatedQuantity: 10 },
      ]),
    ).toEqual({
      recommended: 30,
      allocated: 20,
      ratio: (20 / 30) * 100,
      gap: 10,
      eligible: 2,
      excluded: 2,
    });
    expect(dispatchTotals([]).ratio).toBeNull();
    expect(
      dispatchTotals([{ recommendedQuantity: 10, allocatedQuantity: 0 }]).ratio,
    ).toBe(0);
  });
  it("does not turn missing or nonnumeric values into zero", () => {
    [null, undefined, "", " ", false, "NaN", Infinity].forEach((value) =>
      expect(number(value)).toBeNull(),
    );
    expect(money(null)).toBe("—");
    expect(number("0")).toBe(0);
  });
  it("retains unknown GST outcomes and never treats success as a filing", () => {
    expect(gstOutcome({ isSuccess: true })).toBe("Completed");
    expect(gstOutcome({ isSuccess: false })).toBe("Failed");
    expect(gstOutcome({})).toBe("Unknown");
    expect(gstOutcome({ isSuccess: "false" })).toBe("Unknown");
  });
  it("validates dates and inclusive IST boundaries", () => {
    expect(validRange({ fromDate: "2026-02-30", toDate: "2026-03-05" })).toBe(
      false,
    );
    expect(validRange({ fromDate: "2025-01-01", toDate: "2026-10-22" })).toBe(
      false,
    );
    expect(validRange({ fromDate: "2026-10-22", toDate: "2026-10-22" })).toBe(
      true,
    );
    expect(gstRange({ fromDate: "2026-10-01", toDate: "2026-10-22" })).toEqual({
      FromDate: "2026-09-30T18:30:00.000Z",
      ToDate: "2026-10-22T18:29:59.999Z",
    });
  });
  it("rejects malformed financial collections and summaries instead of showing zero", () => {
    expect(() => asRows({ data: {} })).toThrow();
    expect(() => asRows({ data: [null] })).toThrow();
    expect(() =>
      validateFinancialSummary({ totalWalletBalance: 99 }),
    ).toThrow();
    expect(() =>
      validateCashflow([{ transactionDate: "2026-10-01", income: 0 }]),
    ).toThrow();
    const rows = [
      {
        transactionDate: "2026-10-01",
        income: 0.1,
        expense: 0,
        netIncomeExpense: 0.1,
      },
      {
        transactionDate: "2026-10-02",
        income: 0.2,
        expense: 0,
        netIncomeExpense: 0.2,
      },
    ];
    expect(validateCashflow(rows)).toBe(rows);
    expect(sumRojmelMoney(rows, "income")).toBe(0.3);
  });
  it("does not expose server error payloads", () => {
    const error = {
      response: { status: 500, data: { token: "private" } },
      message: "private",
    };
    expect(safeSourceError(error)).not.toContain("private");
    expect(safeSourceError({ response: { status: 403 } })).toContain(
      "Access denied",
    );
  });
});
describe("Complete paged sources", () => {
  it("loads every page before returning totals", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce({ data: { items: [{ id: 1 }], totalCount: 2 } })
      .mockResolvedValueOnce({ data: { items: [{ id: 2 }], totalCount: 2 } });
    expect(await completeList(fetch, { FromDate: "2026-10-01" })).toHaveLength(
      2,
    );
    expect(fetch.mock.calls[1][0]).toMatchObject({
      PageNumber: 2,
      PageSize: 200,
      FromDate: "2026-10-01",
    });
  });
  it("rejects changing, missing, truncated and repeated pages", async () => {
    for (const next of [
      { items: [{ id: 2 }], totalCount: 3 },
      { items: [], totalCount: 2 },
      { items: [{ id: 1 }], totalCount: 2 },
    ]) {
      const fetch = vi
        .fn()
        .mockResolvedValueOnce({ data: { items: [{ id: 1 }], totalCount: 2 } })
        .mockResolvedValueOnce({ data: next });
      await expect(completeList(fetch, {})).rejects.toThrow();
    }
    await expect(
      completeList(async () => ({ data: { items: [] } }), {}),
    ).rejects.toThrow("count");
  });
  it("caps work and stops obsolete requests", async () => {
    const fetch = vi.fn(async ({ PageNumber }) => ({
      data: { items: [{ id: PageNumber }], totalCount: 100 },
    }));
    await expect(completeList(fetch, {})).rejects.toThrow("shorter period");
    expect(fetch).toHaveBeenCalledTimes(25);
    const controller = new AbortController();
    controller.abort();
    fetch.mockClear();
    await expect(completeList(fetch, {}, controller.signal)).rejects.toThrow(
      "Cancelled",
    );
    expect(fetch).not.toHaveBeenCalled();
  });
});
describe("Verified service contracts", () => {
  it("uses the date-filtered transaction register rather than the date-ignoring recent endpoint", async () => {
    const spy = vi
      .spyOn(transactionService, "getTransactions")
      .mockResolvedValue({ data: { items: [], totalCount: 0 } });
    await loadSource("transactions", {
      fromDate: "2026-09-23",
      toDate: "2026-10-22",
    });
    expect(spy.mock.calls[0][0]).toMatchObject({
      FromDate: "2026-09-23",
      ToDate: "2026-10-22",
      PageNumber: 1,
      PageSize: 200,
      SortBy: "transactionDate",
      SortDirection: "desc",
    });
    spy.mockRestore();
  });
  it("uses authoritative daily income/expense instead of transaction totals", async () => {
    const spy = vi
      .spyOn(rojmelReportService, "getDailyCashFlow")
      .mockResolvedValue({
        data: [
          {
            transactionDate: "2026-10-01",
            income: 10,
            expense: 3,
            netIncomeExpense: 7,
          },
        ],
      });
    const result = await loadSource("cashflow", {
      fromDate: "2026-10-01",
      toDate: "2026-10-22",
    });
    expect(spy).toHaveBeenCalledWith(
      { FromDate: "2026-10-01", ToDate: "2026-10-22" },
      { signal: undefined },
    );
    expect(result[0].netIncomeExpense).toBe(7);
    spy.mockRestore();
  });
  it("uses the equal preceding period for production comparison", async () => {
    const spy = vi
      .spyOn(oeeProductionEntryService, "getProductionEntries")
      .mockResolvedValue({ data: { items: [], totalCount: 0, totalPages: 0 } });
    await loadSource("productionPrior", {
      fromDate: "2026-09-23",
      toDate: "2026-10-22",
    });
    expect(spy.mock.calls[0][0]).toMatchObject({
      FromDate: "2026-08-24",
      ToDate: "2026-09-22",
    });
    spy.mockRestore();
  });
  it("reads stored GST observations with a complete IST period", async () => {
    const spy = vi
      .spyOn(gstService, "logs")
      .mockResolvedValue({ data: { items: [], totalCount: 0 } });
    await loadSource("logs", { fromDate: "2026-10-01", toDate: "2026-10-22" });
    expect(spy.mock.calls[0][0]).toMatchObject({
      FromDate: "2026-09-30T18:30:00.000Z",
      ToDate: "2026-10-22T18:29:59.999Z",
      PageSize: 200,
    });
    spy.mockRestore();
  });
});
