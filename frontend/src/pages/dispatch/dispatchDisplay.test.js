import { describe, expect, it } from "vitest";

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
});
