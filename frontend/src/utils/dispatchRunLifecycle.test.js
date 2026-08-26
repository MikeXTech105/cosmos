import { describe, expect, it } from "vitest";

import { DISPATCH_RUN_STATUS } from "../constants/dispatchEnums";
import { getRunActions } from "./dispatchRunLifecycle";

const full = {
  canAllocate: true,
  canApprove: true,
  canCreate: true,
  canDelete: true,
  canEdit: true,
};

describe("getRunActions", () => {
  const statuses = Object.values(DISPATCH_RUN_STATUS);
  const capabilityCases = [
    ["canCreate", "calculate", DISPATCH_RUN_STATUS.Draft],
    ["canEdit", "override", DISPATCH_RUN_STATUS.Calculated],
    ["canAllocate", "allocate", DISPATCH_RUN_STATUS.Calculated],
    ["canApprove", "finalize", DISPATCH_RUN_STATUS.Allocated],
    [
      "canDelete",
      "cancel",
      [
        DISPATCH_RUN_STATUS.Draft,
        DISPATCH_RUN_STATUS.Calculated,
        DISPATCH_RUN_STATUS.Allocated,
      ],
    ],
  ];

  it.each([
    [DISPATCH_RUN_STATUS.Draft, "calculate"],
    [DISPATCH_RUN_STATUS.Calculated, "allocate"],
    [DISPATCH_RUN_STATUS.Calculated, "override"],
    [DISPATCH_RUN_STATUS.Allocated, "finalize"],
  ])("allows status %s action %s", (status, action) => {
    expect(getRunActions(status, full)[action]).toBe(true);
  });

  it.each([
    DISPATCH_RUN_STATUS.Draft,
    DISPATCH_RUN_STATUS.Calculated,
    DISPATCH_RUN_STATUS.Allocated,
  ])("allows cancellation before finalization for status %s", (status) => {
    expect(getRunActions(status, full).cancel).toBe(true);
  });

  it.each([
    DISPATCH_RUN_STATUS.Finalized,
    DISPATCH_RUN_STATUS.Cancelled,
  ])("makes terminal status %s immutable", (status) => {
    const actions = getRunActions(status, full);
    expect(actions.immutable).toBe(true);
    expect(actions.cancel).toBe(false);
    expect(actions.override).toBe(false);
  });

  it.each([
    ["calculate", "canCreate", DISPATCH_RUN_STATUS.Draft],
    ["override", "canEdit", DISPATCH_RUN_STATUS.Calculated],
    ["allocate", "canAllocate", DISPATCH_RUN_STATUS.Calculated],
    ["finalize", "canApprove", DISPATCH_RUN_STATUS.Allocated],
    ["cancel", "canDelete", DISPATCH_RUN_STATUS.Draft],
  ])("blocks %s when %s is missing", (action, capability, status) => {
    expect(
      getRunActions(status, { ...full, [capability]: false })[action],
    ).toBe(false);
  });

  it.each(
    statuses.flatMap((status) =>
      capabilityCases.map(([capability, action, allowedStatus]) => [
        status,
        capability,
        action,
        Array.isArray(allowedStatus)
          ? allowedStatus.includes(status)
          : status === allowedStatus,
      ]),
    ),
  )(
    "evaluates status %s against missing %s for %s",
    (status, capability, action, statusAllowsAction) => {
      const withPermission = getRunActions(status, full);
      const withoutPermission = getRunActions(status, {
        ...full,
        [capability]: false,
      });

      expect(withPermission[action]).toBe(statusAllowsAction);
      expect(withoutPermission[action]).toBe(false);
    },
  );
});
