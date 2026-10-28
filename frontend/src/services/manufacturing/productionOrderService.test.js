import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn() }));
vi.mock("./productionApi", () => ({ default: api }));
import { stringify } from "lossless-json";
import { productionOrderService as service } from "./productionOrderService";

describe("production order transport", () => {
  beforeEach(() => {
    Object.values(api).forEach((mock) => mock.mockReset().mockResolvedValue({ data: { succeeded: true, data: { id: 41, version: "0x0000000000000002" } } }));
  });
  it("uses server paging/filtering, signal and separate context/capacity reads", async () => {
    const signal = new AbortController().signal;
    await service.list({ pageNumber: 3, pageSize: 20, status: 3, search: "" }, { signal });
    expect(api.get).toHaveBeenCalledWith("/api/v1/manufacturing/orders", { params: { pageNumber: 3, pageSize: 20, status: 3 }, signal });
    await service.context(41); await service.capacity(41, "2026-10-27");
    expect(api.get.mock.calls[1][0]).toBe("/api/v1/manufacturing/orders/41/context");
    expect(api.get.mock.calls[2]).toEqual(["/api/v1/manufacturing/orders/41/capacity", { params: { businessDate: "2026-10-27" }, signal: undefined }]);
  });
  it("writes DECIMAL(22,6) and bigint IDs without Number coercion", async () => {
    await service.create({ itemId: "9223372036854775807", plannedQuantity: "9999999999999999.999999", machineId: "4", channelId: null });
    const [url, body] = api.post.mock.calls[0];
    expect(url).toBe("/api/v1/manufacturing/orders");
    expect(stringify(body)).toBe('{"itemId":9223372036854775807,"plannedQuantity":9999999999999999.999999,"machineId":4,"channelId":null}');
  });
  it("sends distinct good, rejected, consumed, scrap and staging return fields", async () => {
    await service.complete(41, { version: "v1", idempotencyKey: "same-key", goodOutput: "3.000001", rejectedOutput: "1", materials: [{ itemId: "4", unitId: "2", consumedQuantity: "7", scrapQuantity: "0.5", returnedQuantity: "2" }] });
    const [url, body] = api.post.mock.calls[0];
    expect(url).toBe("/api/v1/manufacturing/orders/41/completions");
    expect(JSON.parse(stringify(body))).toEqual({ version: "v1", idempotencyKey: "same-key", goodOutput: 3.000001, rejectedOutput: 1, materials: [{ itemId: 4, unitId: 2, consumedQuantity: 7, scrapQuantity: 0.5, returnedQuantity: 2 }] });
  });
  it("retains version, reason and key on release/amend/close/cancel/reversal and scheduling", async () => {
    const body = { version: "v9", reason: "Approved correction", idempotencyKey: "retry-key" };
    await service.release(41, { ...body, quantity: "2.5" });
    await service.amend(41, { ...body, releasedQuantity: "5" });
    await service.close(41, body); await service.cancel(41, body); await service.reverseCompletion(91, body);
    await service.schedule(41, { ...body, businessDate: "2026-10-27", bookings: [{ routingStepId: "8", from: "2026-10-27T22:00:00+05:30", to: "2026-10-28T02:00:00+05:30" }] });
    expect(api.post.mock.calls.map(([url]) => url)).toEqual(["/api/v1/manufacturing/orders/41/release", "/api/v1/manufacturing/orders/41/amend", "/api/v1/manufacturing/orders/41/close", "/api/v1/manufacturing/orders/41/cancel", "/api/v1/manufacturing/orders/completions/91/reverse", "/api/v1/manufacturing/orders/41/schedule"]);
    for (const [, sent] of api.post.mock.calls) expect(sent).toMatchObject(body);
    expect(stringify(api.post.mock.calls.at(-1)[1])).toContain('"routingStepId":8');
  });
  it("passes backend conflicts through for authoritative refresh, with no retry or fabricated success", async () => {
    const conflict = { response: { status: 409, data: { message: "INSUFFICIENT_FREE_STOCK" } } };
    api.post.mockRejectedValueOnce(conflict);
    await expect(service.release(41, { quantity: "1", version: "v1", idempotencyKey: "key" })).rejects.toBe(conflict);
    expect(api.post).toHaveBeenCalledTimes(1);
  });
  it("rejects over-precision before sending a posting command", async () => {
    await expect(service.release(41, { quantity: "0.0000001" })).rejects.toThrow("decimal places");
    expect(api.post).not.toHaveBeenCalled();
  });
});
