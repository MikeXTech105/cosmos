import { describe, expect, it } from "vitest";
import { reportDrilldown } from "./reportDrilldown";

describe("report document drilldown", () => {
  const input = { report: { id: "sales-invoices" }, column: { key: "invoiceNumber" }, row: { id: "9223372036854775806" } };
  it("preserves exact document IDs and only links authorized source pages", () => {
    expect(reportDrilldown({ ...input, auth: { roles: [], pages: [] } })).toBeNull();
    expect(reportDrilldown({ ...input, auth: { roles: [], pages: [{ pageName: "Sales.Invoices", route: "/sales/invoices", canView: true }] } })).toBe("/sales/invoices/9223372036854775806");
  });
});
