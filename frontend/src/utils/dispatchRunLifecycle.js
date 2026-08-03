import {
  DISPATCH_RUN_STATUS,
  DISPATCH_RUN_STATUS_LABELS,
} from "../constants/dispatchEnums";

export const normalizeDispatchRunStatus = (value) => {
  const numeric = Number(value);
  if (DISPATCH_RUN_STATUS_LABELS[numeric]) return numeric;

  const normalized = String(value ?? "").trim().toLowerCase();
  const match = Object.entries(DISPATCH_RUN_STATUS_LABELS).find(
    ([, label]) => label.toLowerCase() === normalized,
  );

  return match ? Number(match[0]) : null;
};

export const getRunActions = (statusValue, capabilities = {}) => {
  const status = normalizeDispatchRunStatus(statusValue);
  const immutable =
    status === DISPATCH_RUN_STATUS.Finalized ||
    status === DISPATCH_RUN_STATUS.Cancelled;
  const reasons = {
    allocate:
      status !== DISPATCH_RUN_STATUS.Calculated
        ? status === DISPATCH_RUN_STATUS.Draft
          ? "Calculate before allocating."
          : "Allocation is available only once on a calculated run."
        : !capabilities.canAllocate
          ? "Allocation requires Dispatch Planning Allocation edit permission."
          : "",
    calculate:
      status !== DISPATCH_RUN_STATUS.Draft
        ? "Only draft runs can be calculated."
        : !capabilities.canCreate
          ? "Calculation requires Planning Runs create permission."
          : "",
    cancel: immutable
      ? status === DISPATCH_RUN_STATUS.Finalized
        ? "Finalized runs are immutable."
        : "Cancelled runs are read only."
      : !capabilities.canDelete
        ? "Cancelling requires Planning Runs delete permission."
        : "",
    finalize:
      status !== DISPATCH_RUN_STATUS.Allocated
        ? status === DISPATCH_RUN_STATUS.Calculated
          ? "Allocate before finalizing."
          : "Only allocated runs can be finalized."
        : !capabilities.canApprove
          ? "Finalizing requires Planning Runs approval permission."
          : "",
    override:
      status !== DISPATCH_RUN_STATUS.Calculated
        ? status === DISPATCH_RUN_STATUS.Allocated
          ? "Overrides are locked after allocation."
          : "Overrides are available only on calculated runs."
        : !capabilities.canEdit
          ? "Overriding requires Planning Runs edit permission."
          : "",
  };

  return {
    allocate: !reasons.allocate,
    calculate: !reasons.calculate,
    cancel: !reasons.cancel,
    finalize: !reasons.finalize,
    immutable,
    override: !reasons.override,
    reasons,
    status,
  };
};
