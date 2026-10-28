import { beforeEach, describe, expect, it, vi } from "vitest";
const client = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn() }));
vi.mock("../../api/axios", () => ({ default: client }));
import { hrSetupService } from "./setupService";
import { hrPayrollService } from "./payrollService";

describe("HR setup client contracts", () => {
  beforeEach(() => { vi.clearAllMocks(); for (const method of Object.values(client)) method.mockResolvedValue({ data: { succeeded: true, data: [] } }); });
  it("uses the real API prefix and writes exact money and long component IDs", async () => {
    await hrSetupService.saveStructure(null, { name: "Exact", components: [{ salaryComponentId: "9007199254740993", amount: "90071992547409.91" }] });
    const [url, body, config] = client.post.mock.calls[0];
    expect(url).toBe("/api/hr/setup/salary-structures");
    expect(config.transformRequest[0](body)).toBe('{"name":"Exact","components":[{"salaryComponentId":9007199254740993,"amount":90071992547409.91}]}');
  });
  it("retains balance row versions and rejects too-precise entitlements before request", async () => {
    await hrSetupService.saveEntitlement({ employeeId: "42", leaveTypeId: "9", openingBalance: "12.50", rowVersion: "AAAAAQ==" });
    const [url, body, config] = client.put.mock.calls[0];
    expect(url).toBe("/api/hr/setup/leave-entitlements");
    expect(config.transformRequest[0](body)).toContain('"rowVersion":"AAAAAQ=="');
    await expect(hrSetupService.saveEntitlement({ employeeId: "42", leaveTypeId: "9", openingBalance: "12.501" })).rejects.toThrow();
    expect(client.put).toHaveBeenCalledTimes(1);
  });
  it("sends an explicitly reviewed period assignment with exact employee identity and version", async () => {
    await hrPayrollService.processPayroll({ payrollMonth: 10, payrollYear: 2026, rateSelections: [{ employeeId: "9007199254740993", salaryAssignmentId: "9007199254740994", rowVersion: "AAAAAAAAAAE=", reviewed: true }] });
    const [, body, config] = client.post.mock.calls[0];
    const json = config.transformRequest[0](body);
    expect(json).toContain('"employeeId":9007199254740993'); expect(json).toContain('"salaryAssignmentId":9007199254740994'); expect(json).toContain('"rowVersion":"AAAAAAAAAAE="'); expect(json).toContain('"reviewed":true');
  });
});
