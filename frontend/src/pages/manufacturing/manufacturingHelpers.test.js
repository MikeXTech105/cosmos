import { describe, expect, it } from "vitest";
import { serializeProductionJson } from "../../services/manufacturing/productionApi";
const wire = value => JSON.parse(serializeProductionJson(value));

import {
  buildBomPayload,
  buildBomUpdatePayload,
  buildProductionPayload,
  buildProductionUpdatePayload,
  calculateRequiredQuantity,
  getBomStatus,
  getStatus,
  isDraftProduction,
  normalizePage,
} from "./manufacturingHelpers";

describe("manufacturing helpers", () => {
  it("keeps legacy stock commands exact above the browser integer limit", () => {
    const payload = buildProductionPayload({finishedItem:{id:"9007199254740993"},bomId:"9007199254740995",plannedQuantity:"9999999999999999.123456",producedQuantity:"0.000001",productionDate:"2026-10-28"});
    const json = serializeProductionJson(payload);
    expect(json).toContain('"finishedItemId":9007199254740993');
    expect(json).toContain('"bomId":9007199254740995');
    expect(json).toContain('"plannedQuantity":9999999999999999.123456');
    expect(json).toContain('"producedQuantity":0.000001');
  });
  it("calculates base plus wastage for the produced quantity", () => {
    expect(calculateRequiredQuantity({ baseQuantity: 2, wastagePercentage: 5 }, 10)).toBe(21);
  });

  it("normalizes envelope and array list responses", () => {
    expect(normalizePage({ data: { items: [{ id: 1 }], totalCount: 1 } }).items).toHaveLength(1);
    expect(normalizePage([{ id: 2 }]).totalCount).toBe(1);
  });

  it("recognizes draft statuses without relying on casing", () => {
    expect(isDraftProduction({ status: "draft" })).toBe(true);
    expect(isDraftProduction({ status: "Posted" })).toBe(false);
    expect(getStatus({ status: 1 })).toBe("Draft");
    expect(getStatus({ status: 3 })).toBe("Cancelled");
    expect(getBomStatus({ status: 2 })).toBe("Active");
  });

  it("serializes BOM lines as JSON numeric quantities", () => {
    expect(wire(buildBomPayload({
      finishedItem: { id: "8" },
      version: " v2 ",
      effectiveFrom: "2026-09-22",
      effectiveTo: "",
      notes: " Standard recipe ",
      isDefault: true,
      components: [{ item: { id: "4", unitId: "2" }, quantity: "2.5", wastagePercentage: "3", notes: " Cut first " }],
    }))).toEqual({
      finishedItemId: 8,
      version: "v2",
      effectiveFrom: "2026-09-22",
      effectiveTo: null,
      notes: "Standard recipe",
      isDefault: true,
      components: [{ componentItemId: 4, quantity: 2.5, unitId: 2, wastagePercentage: 3, notes: "Cut first", sortOrder: 1 }],
    });
  });

  it("serializes planned and produced production quantities", () => {
    const form = {
      bomId: "7",
      finishedItem: { id: "8" },
      notes: " Run A ",
      plannedQuantity: "12",
      producedQuantity: "10",
      productionDate: "2026-09-22",
      referenceNumber: " PR-1 ",
    };
    expect(wire(buildProductionPayload(form))).toEqual({
      bomId: 7,
      finishedItemId: 8,
      notes: "Run A",
      plannedQuantity: 12,
      producedQuantity: 10,
      productionDate: "2026-09-22",
      referenceNumber: "PR-1",
    });
    expect(wire(buildProductionUpdatePayload(form))).toEqual({
      notes: "Run A",
      plannedQuantity: 12,
      producedQuantity: 10,
      productionDate: "2026-09-22",
      referenceNumber: "PR-1",
    });
  });

  it("omits create-only fields when updating a BOM", () => {
    const update = buildBomUpdatePayload({
      components: [{ item: { id: 4 }, notes: "", quantity: 2, unitId: null, wastagePercentage: 0 }],
      effectiveFrom: "2026-09-22",
      effectiveTo: "2026-12-31",
      finishedItem: { id: 8 },
      isDefault: false,
      notes: "Updated",
      version: "v1",
    });
    expect(update).not.toHaveProperty("finishedItemId");
    expect(update).not.toHaveProperty("version");
    expect(wire(update.components[0])).toMatchObject({ quantity: 2, sortOrder: 1 });
  });
});
