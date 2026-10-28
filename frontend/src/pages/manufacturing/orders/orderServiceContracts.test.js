import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("../../../api/axios", () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn() } }));
import axios from "../../../api/axios";
import service from "../../../services/manufacturing/productionOrderService";

beforeEach(() => vi.clearAllMocks());
describe("production order actual transport contracts", () => {
  it("reads selected Item/resource identities exactly through existing endpoints", async () => {
    axios.get.mockImplementation(async (_url, config) => ({ data: config.transformResponse[0]('{"succeeded":true,"data":{"id":9007199254740993,"unitId":9223372036854775807,"currentStock":1234567890123456.000001}}') }));
    const result = await service.item("9007199254740993");
    expect(axios.get.mock.calls[0][0]).toBe("/api/items/9007199254740993");
    expect(result.data).toEqual({ id: "9007199254740993", unitId: "9223372036854775807", currentStock: "1234567890123456.000001" });
    await service.machines({ PageNumber: 2, PageSize: 200 });
    await service.moulds({ PageNumber: 2, PageSize: 200 });
    await service.shifts({ PageNumber: 2, PageSize: 200 });
    await service.channels({ PageNumber: 2, PageSize: 200 });
    expect(axios.get.mock.calls.slice(1).map(([url]) => url)).toEqual(["/api/v1/oee/machines", "/api/v1/oee/moulds", "/api/hr/shifts", "/api/v1/supply-chain/channels"]);
  });

  it("writes exact posting numbers while retaining source-line text and the completion resource/offset contract", async () => {
    axios.post.mockResolvedValue({ data: { succeeded: true, data: { id: 7, version: "0x0000000000000011" } } });
    await service.complete(7, { version: "0x0000000000000010", idempotencyKey: "one-intent", businessDate: "2026-10-28", occurredAt: "2026-10-27T20:00:00Z", goodOutput: "0.000001", rejectedOutput: "0", machineId: "9007199254740993", mouldId: 3, shiftId: 4, materials: [{ itemId: "9007199254740994", unitId: 5, consumedQuantity: "1234567890123456.000001", scrapQuantity: "0", returnedQuantity: "1" }] });
    const [url, payload, config] = axios.post.mock.calls[0];
    expect(url).toBe("/api/v1/manufacturing/orders/7/completions");
    const json = config.transformRequest[0](payload);
    expect(json).toContain('"machineId":9007199254740993');
    expect(json).toContain('"consumedQuantity":1234567890123456.000001');
    expect(json).toContain('"goodOutput":0.000001');
    expect(json).toContain('"occurredAt":"2026-10-27T20:00:00Z"');
    await service.create({ itemId: "9007199254740993", bomId: 1, routingId: 2, machineId: 3, mouldId: 4, shiftId: 5, plannedQuantity: "0.000001", sourcePlanId: "11111111-2222-3333-4444-555555555555", sourceLineId: "9007199254740993" });
    const [, body, transform] = axios.post.mock.calls[1];
    expect(transform.transformRequest[0](body)).toContain('"sourceLineId":"9007199254740993"');
  });
});
