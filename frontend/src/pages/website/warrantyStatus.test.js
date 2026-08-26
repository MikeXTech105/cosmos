import { describe, expect, it } from "vitest";

import { WARRANTY_STATUS, getAvailableActions } from "./warrantyStatus";

const full = { canApprove: true, canCreate: true, canEdit: true };

describe("warranty action state machine", () => {
  it.each([
    [WARRANTY_STATUS.Submitted, ["assign", "startReview"]],
    [WARRANTY_STATUS.UnderReview, ["assign", "requestInformation", "approve", "reject"]],
    [WARRANTY_STATUS.NeedMoreInformation, ["assign", "startReview"]],
    [WARRANTY_STATUS.Approved, ["resolve"]],
    [WARRANTY_STATUS.Rejected, []],
    [WARRANTY_STATUS.Completed, []],
  ])("enables only valid transitions from %s", (status, enabled) => {
    const actions = getAvailableActions({ status }, full);
    const transitions = Object.entries(actions).filter(([name, value]) => name !== "readOnly" && !["addNote", "addMessage"].includes(name) && value.enabled).map(([name]) => name);
    expect(transitions).toEqual(enabled);
    expect(actions.addNote.enabled).toBe(true);
    expect(actions.addMessage.enabled).toBe(true);
  });

  it("enables complete only after an approved claim has a resolution", () => {
    const actions = getAvailableActions({ status: WARRANTY_STATUS.Approved, resolutionType: "Refund" }, full);
    expect(actions.resolve.enabled).toBe(false);
    expect(actions.complete.enabled).toBe(true);
  });

  it("gates approve and reject independently on approve permission", () => {
    const actions = getAvailableActions({ status: WARRANTY_STATUS.UnderReview }, { canCreate: true, canEdit: true, canApprove: false });
    expect(actions.approve).toMatchObject({ enabled: false, reason: expect.stringContaining("approve permission") });
    expect(actions.reject.enabled).toBe(false);
    expect(actions.assign.enabled).toBe(true);
  });

  it.each(Object.values(WARRANTY_STATUS))("returns an explanatory reason for every disabled control in %s", (status) => {
    const actions = getAvailableActions({ status }, {});
    Object.entries(actions).filter(([name]) => name !== "readOnly").forEach(([, action]) => {
      expect(action.enabled).toBe(false);
      expect(action.reason).toBeTruthy();
    });
  });
});
