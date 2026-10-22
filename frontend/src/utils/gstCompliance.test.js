import { describe, expect, it, vi } from "vitest";
import { canPerformAction } from "./permissionResolver";
import { GST_PAGES, GSTIN_PATTERN, registrationPayload, vehiclePayload, canChangeGstDocument, canManageGstDocument, gstLogFilters, gstLogTimestamp, safeQrImage, safeLogSummary, gstError, createOperationGate } from "./gstCompliance";

describe("GST contract mapping and safety", () => {
  it("preserves editable registration fields without echoing audit or secret fields", () => {
    const body = registrationPayload({ gstin: " 27abcde1234f1z5 ", status: "Active", companyId: "8", addressJson: '{"old":"address"}', gstPortalUsername: "existing-user", isEInvoiceEnabled: true, sandboxToken: "do-not-send", createdBy: 17 });
    expect(body).toMatchObject({ gstin: "27ABCDE1234F1Z5", companyId: 8, branchId: null, addressJson: '{"old":"address"}', gstPortalUsername: "existing-user", isEInvoiceEnabled: true });
    expect(body).not.toHaveProperty("sandboxToken");
    expect(body).not.toHaveProperty("createdBy");
    expect(GSTIN_PATTERN.test(body.gstin)).toBe(true);
    expect(GSTIN_PATTERN.test("invalid")).toBe(false);
  });

  it("maps Part B with exact provider casing, preserving long identifiers as strings", () => {
    const body = vehiclePayload({ companyGstRegistrationId: 3, eWayBillNumber: "123456789012", vehicleNumber: " gj01ab1234 ", fromPlace: " Surat ", fromState: "24", reasonCode: "1", reasonRemark: "Vehicle changed", transportMode: "1", secret: "drop" });
    expect(JSON.parse(body.requestJson)).toEqual({ ewbNo: "123456789012", FromPlace: "Surat", FromState: "24", ReasonCode: "1", ReasonRem: "Vehicle changed", TransMode: "1", VehicleNo: "GJ01AB1234" });
    expect(body.vehicleNumber).toBe("GJ01AB1234");
    expect(body).not.toHaveProperty("secret");
  });

  it.each(["Cancelled", "CNL", "Fetched", "Unknown", "Failed", "", undefined, "0", "1"])("does not enable changes for unverified state %s", status => {
    expect(canChangeGstDocument({ status })).toBe(false);
  });
  it("blocks cancelled records even if their status string is still active", () => {
    expect(canChangeGstDocument({ status: "Generated" })).toBe(true);
    expect(canChangeGstDocument({ status: "ACT" })).toBe(true);
    expect(canChangeGstDocument({ status: "Active", cancelledAt: "2026-10-21" })).toBe(false);
    expect(canChangeGstDocument(null)).toBe(false);
  });

  it("requires provider reconciliation, correct identity and matching document linkage before writes", () => {
    const state = { kind: "invoice", identifier: "irn", stored: { companyGstRegistrationId: 2, irn: "irn", salesInvoiceId: 4, status: "Generated" }, provider: { irn: "irn", status: "ACT" }, contextId: "4", contextKey: "salesInvoiceId", reconciled: true, uncertain: false };
    expect(canManageGstDocument(state)).toBe(true);
    expect(canManageGstDocument({ ...state, reconciled: false })).toBe(false);
    expect(canManageGstDocument({ ...state, uncertain: true })).toBe(false);
    expect(canManageGstDocument({ ...state, contextId: "5" })).toBe(false);
    expect(canManageGstDocument({ ...state, contextId: "0", stored: { ...state.stored, salesInvoiceId: 0 } })).toBe(false);
    expect(canManageGstDocument({ ...state, identifier: "other" })).toBe(false);
    expect(canManageGstDocument({ ...state, provider: { irn: "other", status: "ACT" } })).toBe(false);
    expect(canManageGstDocument({ ...state, provider: { irn: "irn", status: "Cancelled" } })).toBe(false);
    expect(canManageGstDocument({ ...state, stored: { ...state.stored, cancelledAt: "2026-10-21" } })).toBe(false);
  });
  it("keeps E-Invoice and E-Way Bill actions independent during partial failure", () => {
    const wayBill = { kind: "wayBill", identifier: "123456789012", stored: { companyGstRegistrationId: 2, eWayBillNumber: "123456789012", status: "Generated" }, provider: { eWayBillNumber: "123456789012", status: "ACT" }, reconciled: true, uncertain: false };
    expect(canManageGstDocument(wayBill)).toBe(true);
    expect(canManageGstDocument({ ...wayBill, kind: "invoice" })).toBe(false);
    expect(canManageGstDocument({ ...wayBill, uncertain: true })).toBe(false);
    expect(canManageGstDocument(wayBill)).toBe(true);
  });
  it("converts local log date filters to instants and rejects inverted or invalid ranges", () => {
    expect(gstLogFilters({ IsSuccess: "false", FromDate: "2026-10-21T10:00", ToDate: "2026-10-21T11:00" })).toEqual({ IsSuccess: false, FromDate: new Date("2026-10-21T10:00").toISOString(), ToDate: new Date("2026-10-21T11:00").toISOString() });
    expect(() => gstLogFilters({ FromDate: "invalid" })).toThrow("valid filter dates");
    expect(() => gstLogFilters({ FromDate: "2026-10-21T11:00", ToDate: "2026-10-21T10:00" })).toThrow("on or after");
  });
  it("interprets SQL UTC log timestamps without accidentally treating them as local time", () => {
    expect(gstLogTimestamp("2026-10-21T05:00:00")).toBe(new Date("2026-10-21T05:00:00Z").toLocaleString());
    expect(gstLogTimestamp("2026-10-21T05:00:00Z")).toBe(new Date("2026-10-21T05:00:00Z").toLocaleString());
    expect(gstLogTimestamp(null)).toBe("—");
  });

  it("prevents parallel double submits and releases the lock after failure", async () => {
    const gate = createOperationGate();
    let resolve;
    const operation = vi.fn(() => new Promise(done => { resolve = done; }));
    const first = gate(operation);
    expect(await gate(operation)).toBeUndefined();
    expect(operation).toHaveBeenCalledTimes(1);
    resolve("accepted");
    expect(await first).toBe("accepted");
    await expect(gate(() => Promise.reject(new Error("timeout")))).rejects.toThrow("timeout");
    expect(await gate(() => "released")).toBe("released");
  });

  it("never treats signed text, remote URLs or SVGs as QR image sources", () => {
    expect(safeQrImage("data:image/png;base64,YWJj")).toBe("data:image/png;base64,YWJj");
    for (const value of ["eyJhbGciOi...signed", "https://provider.example/qr", "data:image/svg+xml;base64,YWJj", "javascript:alert(1)"]) expect(safeQrImage(value)).toBeNull();
  });
  it("does not disclose provider payloads or personal information through error UI", () => {
    for (const message of ['{"Token":"private"}', "Bearer abc.def", "Failed for person@example.com", "Call 987654321012", "secret password"]) expect(gstError(new Error(message))).not.toContain(message);
    expect(gstError(new Error("Network error - please check your connection."))).toContain("Network error");
    expect(safeLogSummary({ isSuccess: false, statusCode: 504, errorMessage: "private-secret" })).toContain("timeout");
    expect(safeLogSummary({ isSuccess: false, statusCode: 400, errorMessage: "private-secret" })).not.toContain("private-secret");
  });
});

describe("GST permissions", () => {
  it("uses independent GST page grants rather than ordinary invoice permissions", () => {
    const page = GST_PAGES.find(page => page.key === "invoices");
    const auth = { roles: [], user: {}, target: page };
    expect(canPerformAction({ ...auth, action: "view", pages: [{ pageName: "Sales.Invoice", route: "/sales/invoices", canView: true, canDelete: true }] })).toBe(false);
    const pages = [{ pageName: page.pageName, route: page.route, canView: true, canCreate: false, canDelete: false }];
    expect(canPerformAction({ ...auth, pages, action: "view" })).toBe(true);
    expect(canPerformAction({ ...auth, pages, action: "create" })).toBe(false);
    expect(canPerformAction({ ...auth, pages, action: "delete" })).toBe(false);
    expect(canPerformAction({ ...auth, target: GST_PAGES.find(page => page.key === "wayBills"), pages, action: "view" })).toBe(false);
  });
});
