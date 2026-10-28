import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "../../api/axios";
import { organizationService } from "./organizationService";

vi.mock("../../api/axios", () => ({ default: { delete: vi.fn(), get: vi.fn(), post: vi.fn(), put: vi.fn() } }));
const success = { data: { succeeded: true, data: [] } };

describe("organization administration API contract", () => {
  beforeEach(() => vi.clearAllMocks());
  it("uses the Company and Branch collection filters without server pagination", async () => {
    api.get.mockResolvedValue(success);
    await organizationService.companies({ search: "cosmos", activeOnly: true });
    await organizationService.branches({ companyId: 7, search: "north", activeOnly: false });
    expect(api.get).toHaveBeenNthCalledWith(1, "/api/v1/organization/companies", { params: { search: "cosmos", activeOnly: true } });
    expect(api.get).toHaveBeenNthCalledWith(2, "/api/v1/organization/branches", { params: { companyId: 7, search: "north", activeOnly: false } });
  });
  it("uses exact save and scope-assignment request contracts", async () => {
    api.post.mockResolvedValue(success); api.put.mockResolvedValue(success); api.delete.mockResolvedValue(success);
    await organizationService.saveCompany(null, { code: "COS", name: "Cosmos", isActive: true });
    await organizationService.saveBranch(9, { companyId: 4, code: "N", name: "North", isActive: false });
    await organizationService.grant({ userId: 3, companyId: 4, branchId: null });
    await organizationService.revoke(12);
    expect(api.post).toHaveBeenNthCalledWith(1, "/api/v1/organization/companies", { code: "COS", name: "Cosmos", isActive: true });
    expect(api.put).toHaveBeenCalledWith("/api/v1/organization/branches/9", { companyId: 4, code: "N", name: "North", isActive: false });
    expect(api.post).toHaveBeenNthCalledWith(2, "/api/v1/organization/scope-assignments", { userId: 3, companyId: 4, branchId: null });
    expect(api.delete).toHaveBeenCalledWith("/api/v1/organization/scope-assignments/12");
  });
});
