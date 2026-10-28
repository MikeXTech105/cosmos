import { describe, expect, it } from "vitest";

import { SHIPMENT_STATUS } from "../../constants/shipmentEnums";
import {
  getAvailableTransitions,
  getShipmentActions,
} from "./shipmentStatus";

const fullCapabilities = {
  canCancel: true,
  canManageAppointments: true,
  canManageDockets: true,
  canManageFreight: true,
  canManagePacking: true,
  canManageReceipts: true,
  canManageReturns: true,
  canManageTracking: true,
  canTransition: true,
  canUpdate: true,
};

describe("shipment status lifecycle", () => {
  it("defines transition results for every named status", () => {
    const statuses = Object.values(SHIPMENT_STATUS);

    expect(statuses).toHaveLength(16);
    statuses.forEach((status) => {
      expect(Array.isArray(getAvailableTransitions(status))).toBe(true);
    });
  });

  it("keeps Cancelled and Closed terminal", () => {
    expect(getAvailableTransitions(SHIPMENT_STATUS.Cancelled)).toEqual([]);
    expect(getAvailableTransitions(SHIPMENT_STATUS.Closed)).toEqual([]);
  });

  it("offers the stock-moving dispatch transition from ReadyForDispatch", () => {
    expect(
      getAvailableTransitions(SHIPMENT_STATUS.ReadyForDispatch),
    ).toContain(SHIPMENT_STATUS.Dispatched);
  });
});

describe("getShipmentActions", () => {
  it("reopens undispatched packed work through reviewed repack but protects dispatched stock and approved freight", () => {
    const packed = getShipmentActions({ status: SHIPMENT_STATUS.Packed }, fullCapabilities);
    expect(packed.pack.enabled).toBe(false); expect(packed.pack.canRepack).toBe(true);
    expect(getShipmentActions({ status: SHIPMENT_STATUS.Dispatched, dispatchedAtUtc: "2026-10-28T10:00:00Z" }, fullCapabilities).pack.canRepack).toBe(false);
    const approved = getShipmentActions({ status: SHIPMENT_STATUS.Packed, freightCharges: [{ status: "Approved" }] }, fullCapabilities);
    expect(approved.pack.canRepack).toBe(false); expect(approved.pack.repackReason).toContain("Accounts");
  });
  it.each([
    ["pack", "canManagePacking"],
    ["docket", "canManageDockets"],
    ["appointment", "canManageAppointments"],
    ["tracking", "canManageTracking"],
    ["receipt", "canManageReceipts"],
    ["return", "canManageReturns"],
    ["freight", "canManageFreight"],
    ["cancel", "canCancel"],
  ])("gates %s on its capability", (action, capability) => {
    const denied = getShipmentActions(
      { status: SHIPMENT_STATUS.Draft },
      { ...fullCapabilities, [capability]: false },
    );
    const allowed = getShipmentActions(
      { status: SHIPMENT_STATUS.Draft },
      fullCapabilities,
    );

    expect(denied[action].enabled).toBe(false);
    expect(denied[action].reason).toBeTruthy();
    expect(allowed[action].enabled).toBe(true);
  });

  it("gates transitions on update capability", () => {
    const denied = getShipmentActions(
      { status: SHIPMENT_STATUS.ReadyForDispatch },
      { ...fullCapabilities, canTransition: false, canUpdate: false },
    );

    expect(denied.transition).not.toHaveLength(0);
    expect(
      denied.transition.every(
        (transition) => !transition.enabled && transition.reason,
      ),
    ).toBe(true);
  });

  it.each([SHIPMENT_STATUS.Cancelled, SHIPMENT_STATUS.Closed])(
    "makes %s fully read only even with every capability",
    (status) => {
      const actions = getShipmentActions({ status }, fullCapabilities);

      expect(actions.terminal).toBe(true);
      expect(actions.transition).toEqual([]);
      expect(
        [
          actions.appointment,
          actions.cancel,
          actions.deliveryAttempt,
          actions.docket,
          actions.freight,
          actions.pack,
          actions.receipt,
          actions.return,
          actions.tracking,
        ].every((action) => !action.enabled && action.reason),
      ).toBe(true);
    },
  );
});

