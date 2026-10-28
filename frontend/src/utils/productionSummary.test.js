import { describe, expect, it } from "vitest";
import { normalizeProductionRead, normalizeProductionSummary } from "./productionSummary";
import { parseProductionJson } from "../services/manufacturing/productionApi";

describe("SQL object summaries in typed API pages", () => {
  it("adapts actual SQL Pascal summary aliases without rounding quantity, replacing null or summing unlike units", () => {
    const page = parseProductionJson('{"items":[{"itemId":19,"signedQuantity":0.000001}],"totalCount":101,"summary":{"QuantityTotals":[{"UnitId":7,"UnitName":"KG","OnHandQuantity":9999999999999999.999999,"ReservedQuantity":null},{"UnitId":8,"UnitName":"PCS","OnHandQuantity":0}],"DataQualityRows":1,"OnTimeDenominator":0,"CalculationVersion":"ledger-v1"}}');
    const result = normalizeProductionRead(page);
    expect(result.summary.quantityTotals).toEqual([{ unitId: 7, unitName: "KG", onHandQuantity: "9999999999999999.999999", reservedQuantity: null }, { unitId: 8, unitName: "PCS", onHandQuantity: 0 }]);
    expect(result.items).toBe(page.items); expect(result.totalCount).toBe(101);
    expect(result.summary.onTimeDenominator).toBe(0); expect(page.summary).toHaveProperty("QuantityTotals");
  });
  it("normalizes import/snapshot nested page summaries while leaving source evidence exactly untouched", () => {
    const originalJson = '{"UnitId":"original header","SKU":"source evidence"}';
    const result = normalizeProductionRead({ batchId: "batch", rows: { items: [{ originalJson }], summary: { Rows: 20, UnresolvedRows: 3 } } });
    expect(result.rows.summary).toEqual({ rows: 20, unresolvedRows: 3 });
    expect(result.rows.items[0].originalJson).toBe(originalJson);
    expect(normalizeProductionSummary([{ UnitId: 7, ActualConsumedQuantity: null }])).toEqual([{ unitId: 7, actualConsumedQuantity: null }]);
  });
});
