import { describe, expect, it } from "vitest";
import { getAlertLink } from "./alertLinks";

describe("contextual alert navigation", () => {
  it("preserves periods and directs GST to compliance", () => {
    expect(getAlertLink("gst", null, { fromDate: "2026-10-01", toDate: "2026-10-28" })).toBe("/gst/configuration?FromDate=2026-10-01&ToDate=2026-10-28&datePreset=custom");
    expect(getAlertLink("receivables", { entityType: "SalesInvoice", entityId: "9223372036854775806" })).toBe("/sales/invoices/9223372036854775806");
  });
  it("rejects external or protocol-relative server links", () => {
    expect(getAlertLink("gst", { relatedRoute: "//external.example/" })).toBe("/gst/configuration");
    expect(getAlertLink("gst", { relatedRoute: "https://external.example/" })).toBe("/gst/configuration");
  });
});
