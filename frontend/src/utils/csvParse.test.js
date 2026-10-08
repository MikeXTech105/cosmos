import { describe, expect, it } from "vitest";

import { DISPATCH_IMPORT_TYPES } from "../constants/dispatchEnums";
import {
  buildDispatchImportRows,
  parseCsv,
  sha256Hex,
} from "./csvParse";

describe("CSV parsing", () => {
  it("handles quoted fields, commas, embedded quotes, CRLF, and a blank tail", () => {
    const result = parseCsv(
      'Name,Note\r\n"Warehouse, North","Said ""ready"""\r\n\r\n',
    );

    expect(result.headers).toEqual(["Name", "Note"]);
    expect(result.rows).toEqual([["Warehouse, North", 'Said "ready"']]);
    expect(result.errors).toEqual([]);
  });

  it("supports a tab delimiter without changing the CSV default", () => {
    const result = parseCsv('Name\tNote\r\nBox\t"Has\ta tab"\r\n', {
      delimiter: "\t",
    });

    expect(result.headers).toEqual(["Name", "Note"]);
    expect(result.rows).toEqual([["Box", "Has\ta tab"]]);
  });

  it("computes lowercase SHA-256 hex for a known vector", async () => {
    expect(await sha256Hex("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("turns an unresolved warehouse code into a local row error", () => {
    const result = buildDispatchImportRows({
      headers: [
        "RowNumber",
        "WarehouseCode",
        "ChannelSku",
        "PeriodFrom",
        "PeriodTo",
        "SalesQuantity",
      ],
      importType: DISPATCH_IMPORT_TYPES.Sales,
      rows: [["1", "UNKNOWN", "SKU-1", "2026-07-01", "2026-07-02", "5"]],
      warehouses: [{ id: 9, warehouseCode: "KNOWN" }],
    });

    expect(result.rows).toEqual([]);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "WarehouseCode",
          rowNumber: 1,
        }),
      ]),
    );
  });

  it("rejects invalid calendar dates and malformed row numbers", () => {
    const result = buildDispatchImportRows({
      headers: [
        "RowNumber",
        "WarehouseCode",
        "ChannelSku",
        "PeriodFrom",
        "PeriodTo",
        "SalesQuantity",
      ],
      importType: DISPATCH_IMPORT_TYPES.Sales,
      rows: [["row-one", "KNOWN", "SKU-1", "2026-02-31", "2026-03-02", "5"]],
      warehouses: [{ id: 9, warehouseCode: "KNOWN" }],
    });

    expect(result.rows).toEqual([]);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "RowNumber" }),
        expect.objectContaining({ field: "PeriodFrom" }),
      ]),
    );
  });

  it.each([
    [
      DISPATCH_IMPORT_TYPES.Sales,
      ["RowNumber", "WarehouseCode", "ChannelSku", "PeriodFrom", "PeriodTo", "SalesQuantity"],
      (sku, rowNumber) => [String(rowNumber), "WH-1", sku, "2026-10-01", "2026-10-07", "5"],
    ],
    [
      DISPATCH_IMPORT_TYPES.WarehouseStock,
      ["RowNumber", "WarehouseCode", "ChannelSku", "SnapshotDate", "AvailableQuantity", "ReservedQuantity", "DamagedQuantity"],
      (sku, rowNumber) => [String(rowNumber), "WH-1", sku, "2026-10-08", "5", "0", "0"],
    ],
    [
      DISPATCH_IMPORT_TYPES.Inbound,
      ["RowNumber", "WarehouseCode", "ChannelSku", "SnapshotDate", "InboundQuantity", "InboundStatus", "ExpectedArrivalDate", "ReferenceNumber"],
      (sku, rowNumber) => [String(rowNumber), "WH-1", sku, "2026-10-08", "5", "1", "2026-10-09", "REF"],
    ],
  ])("preserves separate exact channel SKUs in import type %i", (importType, headers, makeRow) => {
    const result = buildDispatchImportRows({
      headers,
      importType,
      rows: [makeRow("CHANNEL-SKU-A", 1), makeRow("CHANNEL-SKU-B", 2)],
      warehouses: [{ id: 5, warehouseCode: "WH-1" }],
    });

    expect(result.errors).toEqual([]);
    expect(result.rows.map((row) => row.channelSku)).toEqual([
      "CHANNEL-SKU-A",
      "CHANNEL-SKU-B",
    ]);
    expect(result.rows.map((row) => row.warehouseId)).toEqual([5, 5]);
  });

  it("sends the source channel SKU without replacing or trimming it", () => {
    const result = buildDispatchImportRows({
      headers: ["RowNumber", "WarehouseCode", "ChannelSku", "PeriodFrom", "PeriodTo", "SalesQuantity"],
      importType: DISPATCH_IMPORT_TYPES.Sales,
      rows: [["1", "WH-1", " SKU-X ", "2026-10-01", "2026-10-07", "5"]],
      warehouses: [{ id: 5, warehouseCode: "WH-1" }],
    });

    expect(result.rows[0].channelSku).toBe(" SKU-X ");
  });
});
