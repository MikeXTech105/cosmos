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
      summary: [{ UnitId: 2, UnitName: "KG", ActualConsumedQuantity: 800.25 }, { UnitId: 3, UnitName: "ROLL", ActualConsumedQuantity: 12.125 }],
    } } });
    const signal = new AbortController().signal;
    const { data } = await manufacturingReportsService.getConsumptionHistory({ PageNumber: 2 }, { signal });
    expect(axiosInstance.get).toHaveBeenCalledTimes(1);
    expect(axiosInstance.get).toHaveBeenCalledWith("/api/v1/manufacturing/reports/materials", expect.objectContaining({ params: { PageNumber: 2 }, signal }));
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
  it("normalizes the actual Pascal SQL production summary without recomputing all-filter quantities or replacing null measures", async () => {
    const raw = '{"data":{"items":[{"sourceId":1,"goodOutput":0.000001,"rejectedOutput":null}],"pageNumber":2,"pageSize":20,"totalCount":500,"totalPages":25,"summary":[{"UnitId":9223372036854775807,"UnitName":"PCS","RequiredQuantity":null,"ExpectedConsumption":null,"ActualConsumedQuantity":null,"MaterialWasteQuantity":null,"GoodOutput":9999999999999999.999999,"RejectedOutput":null},{"UnitId":2,"UnitName":"ROLL","GoodOutput":0.000001,"RejectedOutput":0},{"UnitId":3,"UnitName":"KG","GoodOutput":null,"RejectedOutput":null}]}}';
    axiosInstance.get.mockImplementationOnce(async (_url, config) => ({ data: config.transformResponse[0](raw) }));
    const { data } = await manufacturingReportsService.getProductionHistory({ PageNumber: 2 });
    expect(axiosInstance.get).toHaveBeenCalledTimes(1);
    expect(data.summary.quantityByUnit).toBe("9999999999999999.999999 PCS; 0.000001 ROLL; Unavailable KG");
    expect(data.unitTotals[0]).toEqual({ unitId: "9223372036854775807", unitName: "PCS", requiredQuantity: null, expectedConsumption: null, actualConsumedQuantity: null, materialWasteQuantity: null, goodOutput: "9999999999999999.999999", rejectedOutput: null });
    expect(data.unitTotals[1]).toMatchObject({ unitId: 2, goodOutput: "0.000001", rejectedOutput: 0 });
    expect(data).toMatchObject({ pageNumber: 2, pageSize: 20, totalCount: 500, totalPages: 25 });
    expect(data.summary.eventCount).toBe(500);
    expect(data.items[0].producedQuantity).toBe("0.000001");
  });
  it("decodes exact numeric JSON once and preserves tiny, upper-bound and unavailable measures with all-filter unit totals", async () => {
    const raw = '{"succeeded":true,"data":{"items":[{"sourceId":9223372036854775807,"sourceType":"ProductionCompletion","requiredQuantity":9999999999999999.999999,"expectedConsumption":0.000001,"actualConsumedQuantity":9999999999999999.999999,"materialWasteQuantity":null,"wastePercent":0.5,"unitName":"KG"}],"pageNumber":3,"pageSize":20,"totalCount":1000,"totalPages":50,"summary":[{"UnitId":2,"UnitName":"KG","ActualConsumedQuantity":9999999999999999.999999},{"UnitId":3,"UnitName":"ROLL","ActualConsumedQuantity":0.000001},{"UnitId":4,"UnitName":"PCS","ActualConsumedQuantity":null}]}}';
    axiosInstance.get.mockImplementationOnce(async (_url, config) => ({ data: config.transformResponse[0](raw) }));
    const { data } = await manufacturingReportsService.getConsumptionHistory({ PageNumber: 3, PageSize: 20 });
    expect(axiosInstance.get).toHaveBeenCalledTimes(1);
    expect(data.items[0]).toMatchObject({ sourceId: "9223372036854775807", requiredQuantity: "9999999999999999.999999", expectedConsumption: "0.000001", actualConsumedQuantity: "9999999999999999.999999", materialWasteQuantity: null, wastePercent: "0.5" });
    expect(data.unitTotals).toHaveLength(3);
    expect(data.summary.quantityByUnit).toBe("9999999999999999.999999 KG; 0.000001 ROLL; Unavailable PCS");
    expect(data.summary.eventCount).toBe(1000);
    expect(data).toMatchObject({ pageNumber: 3, pageSize: 20, totalCount: 1000, totalPages: 50 });
  });
});
