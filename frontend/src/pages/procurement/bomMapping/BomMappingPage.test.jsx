import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { manufacturingBomService } from "../../../services/manufacturing/manufacturingService";
import { bomService } from "../../../services/procurement/bomService";
import {
  ApplicableBomView, ManufacturingBomListRow,
} from "./BomMappingPage";
import { issueRemediation, legacyBomConflictMessage, loadApplicableBom } from "./bomMappingHelpers";

const row = { id: 7, bomNumber: "B-7", finishedItemCode: "P-1", finishedItemName: "Product", version: "1", status: 1, isActive: false, effectiveFrom: "2026-10-01", effectiveTo: null, componentCount: 0 };
const render = (component) => renderToStaticMarkup(<MemoryRouter>{component}</MemoryRouter>);

describe("Manufacturing BOM procurement display", () => {
  it("does not show Default when isDefault is false", () => {
    expect(render(<ManufacturingBomListRow bom={{ ...row, isDefault: false }} />)).not.toContain("Default");
  });

  it("shows Default only when isDefault is true", () => {
    expect(render(<ManufacturingBomListRow bom={{ ...row, isDefault: true }} />)).toContain("Default");
  });

  it("displays componentCount including zero", () => {
    expect(render(<ManufacturingBomListRow bom={{ ...row, componentCount: 0, components: [{ id: 1 }] }} />)).toContain("0 raw materials");
  });

  it("renders the components returned by the applicable endpoint", async () => {
    const spy = vi.spyOn(manufacturingBomService, "applicable").mockResolvedValue({ data: { id: 7, components: [{ componentItemName: "Steel", quantity: 3 }] } });
    try {
      const result = await loadApplicableBom(12, "2026-10-06");
      expect(spy).toHaveBeenCalledWith(12, "2026-10-06");
      expect(render(<ApplicableBomView {...result} />)).toContain("Steel · 3");
    } finally { spy.mockRestore(); }
  });

  it("shows a missing effective BOM on applicable 404", async () => {
    const spy = vi.spyOn(manufacturingBomService, "applicable").mockRejectedValue({ response: { status: 404 } });
    try {
      const result = await loadApplicableBom(12, "2026-10-06");
      expect(render(<ApplicableBomView {...result} />)).toContain("No active effective Manufacturing BOM");
    } finally { spy.mockRestore(); }
  });

  it("has no legacy save method and explains a legacy 409", () => {
    expect(bomService.saveProductBom).toBeUndefined();
    expect(legacyBomConflictMessage({ response: { status: 409 } })).toContain("moved to Manufacturing");
  });

  it("keeps the three issue remediations distinct", () => {
    expect(issueRemediation({ issueType: "MISSING_BOM" }).action).toContain("Create or activate");
    expect(issueRemediation({ issueType: "BOM_HAS_NO_COMPONENTS" }).action).toContain("Edit BOM components");
    expect(issueRemediation({ issueType: "INACTIVE_COMPONENT" }).title).toBe("Inactive component");
  });
});
