import { describe, expect, it } from "vitest";
import { stringify } from "lossless-json";
import { dispatchShipmentSchema } from "../../pages/shipments/shipmentSchemas";
import { getPackingReconciliation, validateReturnReceiveLine } from "../../utils/shipmentOperations";
import { formatShipmentNumber } from "../../pages/shipments/shipmentDisplay";
import { wireShipmentPayload } from "./shipmentWire";
describe("shipment quantities and identities", () => {
  it("keeps full BIGINT allocation identities and DECIMAL(19,6) quantities from form through JSON", () => {
    const parsed = dispatchShipmentSchema.parse({ allocations: [{ dispatchPlanningAllocationId: "9223372036854775807", plannedQuantity: "9999999999999.999999" }], dispatchPlanningRunId: "9223372036854775806", warehouseId: "9223372036854775805", shipmentDate: "2026-10-28" });
    expect(parsed.allocations[0].plannedQuantity).toBe("9999999999999.999999");
    const wire = stringify(wireShipmentPayload(parsed));
    expect(wire).toContain('"dispatchPlanningAllocationId":9223372036854775807');
    expect(wire).toContain('"plannedQuantity":9999999999999.999999');
    expect(dispatchShipmentSchema.safeParse({ ...parsed, allocations: [{ ...parsed.allocations[0], plannedQuantity: "0.0000001" }] }).success).toBe(false);
  });
  it("detects a one-millionth over-allocation and return split at the large-quantity boundary", () => {
    const [result] = getPackingReconciliation([{ id: "9223372036854775807", plannedQuantity: "9999999999999.999998" }], [{ items: [{ shipmentItemId: "9223372036854775807", quantity: "9999999999999.999998" }] }], [{ shipmentItemId: "9223372036854775807", quantity: "0.000001" }]);
    expect(result.remaining).toBe("-0.000001"); expect(result.isOverAllocated).toBe(true);
    expect(validateReturnReceiveLine({ receivedBackQuantity: "9999999999999.999999", restockableQuantity: "9999999999999.999998", damagedQuantity: "0", nonRestockableQuantity: "0", returnQuantity: "9999999999999.999999" }).isValid).toBe(false);
    expect(formatShipmentNumber("0.000001")).toBe("0.000001");
    expect(formatShipmentNumber(null)).toBe("—");
  });
});
