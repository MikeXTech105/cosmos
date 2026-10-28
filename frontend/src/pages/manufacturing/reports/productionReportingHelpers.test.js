import { describe, expect, it } from "vitest";
import { reportFieldsFor, sourceDocumentLink } from "./productionReportingHelpers";

describe("operational evidence identities and measures", () => {
  it("drills down through the authoritative document parent, never a completion, return-item or receipt ID", () => {
    expect(sourceDocumentLink({ sourceType: "ProductionCompletion", sourceId: 73, sourceDocumentType: "ProductionOrder", sourceDocumentId: 12 })).toBe("/manufacturing/orders/12");
    expect(sourceDocumentLink({ sourceType: "ShipmentReturn", sourceId: 89, sourceDocumentType: "Shipment", sourceDocumentId: 21 })).toBe("/shipments/work-list/21");
    expect(sourceDocumentLink({ sourceType: "PurchaseReceipt", sourceId: 91, sourceDocumentType: "PurchaseOrder", sourceDocumentId: 30 })).toBe("/purchase/orders/30");
    for (const sourceType of ["ProductionCompletion", "ShipmentReturn", "PurchaseReceipt"]) expect(sourceDocumentLink({ sourceType, sourceId: 999 })).toBeNull();
  });
  it("retains proven direct source links and separates stock, ledger and capacity measures", () => {
    expect(sourceDocumentLink({ sourceType: "ShipmentDispatch", sourceId: 4 })).toBe("/shipments/work-list/4");
    expect(sourceDocumentLink({ sourceType: "CapacityReservation", sourceId: 9 })).toBe("/manufacturing/orders/9");
    expect(reportFieldsFor("stock-as-of")).toContain("availableQuantity");
    expect(reportFieldsFor("ledger")).toContain("signedQuantity");
    expect(reportFieldsFor("capacity")).toEqual(["requiredMinutes"]);
    expect(reportFieldsFor("scorecard")).toContain("rejectedOutput");
  });
});
