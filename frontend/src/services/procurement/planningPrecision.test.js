import { beforeEach, describe, expect, it, vi } from "vitest";
import axiosInstance from "../../api/axios";
import { planningService } from "./planningService";

vi.mock("../../api/axios", () => ({ default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }));
beforeEach(() => { vi.clearAllMocks(); axiosInstance.patch.mockResolvedValue({ data: { data: {} } }); axiosInstance.post.mockResolvedValue({ data: { data: {} } }); });

describe("procurement quantity precision at the existing planning boundary", () => {
  it("sends the exact six-place edited final quantity as a JSON number", async () => {
    await planningService.adjustLine(7, 8, { finalQuantity: "9999999999999999.999999", adjustmentReason: "Verified source correction" });
    const [, body, config] = axiosInstance.patch.mock.calls[0];
    expect(config.transformRequest[0](body)).toBe('{"finalQuantity":9999999999999999.999999,"adjustmentReason":"Verified source correction"}');
    await expect(planningService.adjustLine(7, 8, { finalQuantity: "0.0000001" })).rejects.toThrow("decimal places");
    expect(axiosInstance.patch).toHaveBeenCalledTimes(1);
  });
  it("opts actual planning preview responses into exact source numeric parsing", async () => {
    await planningService.preview({ fromDate: "2026-10-01", toDate: "2026-10-27" });
    const config = axiosInstance.post.mock.calls[0][2];
    const parsed = config.transformResponse[0]('{"data":{"lines":[{"shortage":0.000001,"finalQuantity":9999999999999999.999999}]}}');
    expect(parsed.data.lines[0]).toEqual({ shortage: "0.000001", finalQuantity: "9999999999999999.999999" });
  });
});
