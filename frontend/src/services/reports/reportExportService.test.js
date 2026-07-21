import { describe, expect, it, vi } from "vitest";

import {
  buildReportExportPayload,
  loadReportFallbackRows,
} from "./reportExportService";

describe("report export fallback", () => {
  it("removes pagination from the server export payload", () => {
    expect(
      buildReportExportPayload({
        reportId: "sales-invoices",
        filters: { PageNumber: 3, PageSize: 20, Search: "acme" },
      }),
    ).toEqual({
      filters: { Search: "acme" },
      format: "csv",
      reportId: "sales-invoices",
    });
  });

  it("loads all pages and removes duplicates", async () => {
    const fetcher = vi.fn(async ({ PageNumber }) => ({
      data: {
        items: PageNumber === 1 ? [{ id: 1 }] : [{ id: 1 }, { id: 2 }],
        pageNumber: PageNumber,
        pageSize: 1,
        totalCount: 2,
        totalPages: 2,
      },
    }));
    const rows = await loadReportFallbackRows({
      currentRows: [],
      params: { Search: "" },
      report: { fetcher, paginated: true },
    });

    expect(rows).toEqual([{ id: 1 }, { id: 2 }]);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("requires backend export above the client cap", async () => {
    await expect(
      loadReportFallbackRows({
        currentRows: [],
        maxRows: 10,
        params: {},
        report: {
          paginated: true,
          fetcher: async () => ({ data: { items: [], totalCount: 11 } }),
        },
      }),
    ).rejects.toThrow("Backend report export is required");
  });
});
