import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "../../api/axios";
import { ENDPOINTS as E } from "../../api/endpoints";
import { gstService } from "./gstService";

vi.mock("../../api/axios", () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }));
const result = data => ({ data: { succeeded: true, data, correlationId: "qa-reference" } });

describe("GST service through shared Axios", () => {
  beforeEach(() => { vi.resetAllMocks(); for (const method of Object.values(api)) method.mockResolvedValue(result({})); });
  it("allowlists server log filters and preserves false while capping page size", async () => {
    await gstService.logs({ PageNumber: 2, PageSize: 500, IsSuccess: false, ApiType: "E-Invoice Generate", Search: "trace", accessToken: "secret", CorrelationId: "unsupported-filter" });
    expect(api.get).toHaveBeenCalledWith(E.GST_API_LOGS, expect.objectContaining({ timeout: 90000, params: { PageNumber: 2, PageSize: 200, IsSuccess: false, ApiType: "E-Invoice Generate", Search: "trace" } }));
  });
  it("uses only registration list query fields and forwards cancellation signal", async () => {
    const controller = new AbortController();
    await gstService.registrations({ Status: "Active", StateCode: "24", IsDefault: true }, { signal: controller.signal });
    expect(api.get).toHaveBeenCalledWith(E.GST_REGISTRATIONS, expect.objectContaining({ signal: controller.signal, params: { Status: "Active", StateCode: "24" } }));
  });
  it("encodes identifier paths and unwraps stored records without mutating", async () => {
    api.get.mockResolvedValue(result({ irn: "existing", status: "Generated" }));
    expect(await gstService.invoice("irn/with?#")).toMatchObject({ data: { status: "Generated" }, correlationId: "qa-reference" });
    expect(api.get.mock.calls[0][0]).toBe("/api/v1/gst/e-invoices/irn%2Fwith%3F%23");
    expect(api.post).not.toHaveBeenCalled();
  });
  it.each([
    ["cancelInvoice", E.GST_EINVOICE_CANCEL, { companyGstRegistrationId: 2, irn: "stored-irn", cancelReasonCode: "1", cancelRemark: "Cancellation requested" }],
    ["cancelWayBill", E.GST_EWAY_CANCEL, { companyGstRegistrationId: 2, eWayBillNumber: "123456789012", cancelReasonCode: "1", cancelRemark: "Cancellation requested" }],
    ["refreshInvoice", E.GST_EINVOICE_DETAILS, { companyGstRegistrationId: 2, irn: "stored-irn" }],
    ["refreshWayBill", E.GST_EWAY_DETAILS, { companyGstRegistrationId: 2, eWayBillNumber: "123456789012" }],
  ])("%s sends only verified wrapper fields", async (method, url, body) => {
    await gstService[method]({ ...body, requestJson: '{"secret":"drop"}', accessToken: "drop", salesInvoiceId: 44 });
    expect(api.post).toHaveBeenCalledExactlyOnceWith(url, body, { timeout: 90000 });
  });
  it("propagates provider envelope rejections and timeouts with no automatic replay", async () => {
    api.post.mockResolvedValue({ data: { succeeded: false, message: "Provider rejected cancellation." } });
    await expect(gstService.cancelInvoice({})).rejects.toThrow("Provider rejected cancellation");
    expect(api.post).toHaveBeenCalledTimes(1);
    api.post.mockRejectedValue(Object.assign(new Error("timeout"), { code: "ECONNABORTED" }));
    await expect(gstService.cancelInvoice({})).rejects.toThrow("timeout");
    expect(api.post).toHaveBeenCalledTimes(2);
    expect(gstService).not.toHaveProperty("generateInvoice");
    expect(gstService).not.toHaveProperty("generateWayBill");
  });
  it("sends a Part B update to its own endpoint and never changes an accounting invoice", async () => {
    await gstService.updateVehicle({ companyGstRegistrationId: 2, eWayBillNumber: "123456789012", vehicleNumber: "GJ01AB1234", transportMode: "1", fromPlace: "Surat", fromState: "24", reasonCode: "1", reasonRemark: "Vehicle changed" });
    expect(api.post).toHaveBeenCalledExactlyOnceWith(E.GST_EWAY_VEHICLE, expect.objectContaining({ companyGstRegistrationId: 2, eWayBillNumber: "123456789012", vehicleNumber: "GJ01AB1234", requestJson: expect.any(String) }), { timeout: 90000 });
    expect(api.put).not.toHaveBeenCalled();
  });
  it("uses configuration and cached GSTIN verification contracts without sending credentials", async () => {
    await gstService.configuration();
    expect(api.get).toHaveBeenCalledWith(E.GST_CONFIG_STATUS, { timeout: 90000 });
    await gstService.verifyGstin(" 27abcde1234f1z5 ");
    expect(api.post).toHaveBeenCalledWith(E.GST_VERIFY_GSTIN, { gstin: "27ABCDE1234F1Z5", forceRefresh: false }, { timeout: 90000 });
  });
  it("saves registrations, default changes, verification, deletion and session lookup through their real endpoints", async () => {
    await gstService.saveRegistration(7, { gstin: "27ABCDE1234F1Z5", status: "Active" });
    expect(api.put).toHaveBeenCalledWith(E.GST_REGISTRATION(7), expect.objectContaining({ gstin: "27ABCDE1234F1Z5", status: "Active" }));
    await gstService.defaultRegistration(7, 2);
    expect(api.post).toHaveBeenCalledWith(E.GST_REGISTRATION_DEFAULT(7), { companyId: 2 }, { timeout: 90000 });
    await gstService.verifyRegistration(7);
    expect(api.post).toHaveBeenCalledWith(E.GST_REGISTRATION_VERIFY(7), undefined, { timeout: 90000 });
    await gstService.deleteRegistration(7);
    expect(api.delete).toHaveBeenCalledWith(E.GST_REGISTRATION(7));
    await gstService.session(7);
    expect(api.get).toHaveBeenCalledWith(E.GST_SESSION_STATUS(7), { timeout: 90000 });
  });
});
