import { describe, expect, it } from "vitest";

import {
  DISPATCH_IMPORT_TYPE_LABELS,
  toDispatchOptions,
} from "../../constants/dispatchEnums";
import {
  getDispatchImportStatusLabel,
  getDispatchImportTypeLabel,
} from "./dispatchDisplay";

describe("Dispatch import display mappings", () => {
  it("maps the persisted committed status", () => {
    expect(getDispatchImportStatusLabel(5)).toBe("Committed");
    expect(getDispatchImportStatusLabel(4)).toBe("Validation failed");
    expect(getDispatchImportStatusLabel(6)).toBe("Cancelled");
  });

  it("maps database import type names returned by the list procedure", () => {
    expect(getDispatchImportTypeLabel("DispatchWarehouseSales")).toBe("Sales");
    expect(getDispatchImportTypeLabel("DispatchWarehouseStock")).toBe("Warehouse stock");
    expect(getDispatchImportTypeLabel("DispatchWarehouseInbound")).toBe("Inbound");
  });

  it("provides each import type once for selectable dropdowns", () => {
    expect(toDispatchOptions(DISPATCH_IMPORT_TYPE_LABELS)).toEqual([
      { label: "Sales", value: 1 },
      { label: "Warehouse stock", value: 2 },
      { label: "Inbound", value: 3 },
    ]);
  });
});
