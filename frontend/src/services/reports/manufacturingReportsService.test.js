import { beforeEach, describe, expect, it, vi } from "vitest";
import axiosInstance from "../../api/axios";
import { manufacturingReportsService } from "./manufacturingReportsService";

vi.mock("../../api/axios", () => ({ default: { get: vi.fn() } }));

describe("authoritative manufacturing reports", () => {
  beforeEach(() => vi.clearAllMocks());
  it("makes one paged request, keeps actual distinct from required, and preserves missing waste", async () => {
    axiosInstance.get.mockResolvedValue({ data: { succeeded: true, data: {
      items: [{ sourceId: 4, sourceType: "ProductionCompletion", businessDate: "2026-10-27", itemId: 7,
        itemName: "BLACK PP", itemCode: "PP", requiredQuantity: 100, expectedConsumption: 102,
        actualConsumedQuantity: 103.25, materialWasteQuantity: null, wastePercent: null, unitName: "KG" }],
      pageNumber: 2, pageSize: 20, totalCount: 65, totalPages: 4,
      summary: [{ unitId: 2, unitName: "KG", actualConsumedQuantity: 800.25 }, { unitId: 3, unitName: "ROLL", actualConsumedQuantity: 12.125 }],
    } } });
    const signal = new AbortController().signal;
    const { data } = await manufacturingReportsService.getConsumptionHistory({ PageNumber: 2 }, { signal });
    expect(axiosInstance.get).toHaveBeenCalledTimes(1);
    expect(axiosInstance.get).toHaveBeenCalledWith("/api/v1/manufacturing/reports/materials", { params: { PageNumber: 2 }, signal });
    expect(data.totalPages).toBe(4); expect(data.totalCount).toBe(65); expect(data.pageNumber).toBe(2);
    expect(data.items[0].actualConsumedQuantity).toBe(103.25); expect(data.items[0].requiredQuantity).toBe(100);
    expect(data.items[0].wastePercent).toBeNull(); expect(data.items[0].materialWasteQuantity).toBeNull();
    expect(data.summary.quantityByUnit).toBe("800.25 KG; 12.125 ROLL");
    expect(data.summary.eventCount).toBe(65);
  });
  it("uses server all-filter production totals instead of summing one page", async () => {
    axiosInstance.get.mockResolvedValue({ data: { succeeded: true, data: { items: [{ sourceId: 1, goodOutput: 5 }],
      totalCount: 500, pageNumber: 1, pageSize: 20, totalPages: 25,
      summary: [{ unitId: 1, unitName: "PCS", goodOutput: 1000 }] } } });
    const { data } = await manufacturingReportsService.getProductionHistory({});
    expect(data.summary.quantityByUnit).toBe("1000 PCS"); expect(data.summary.eventCount).toBe(500);
  });
});
