import { WARRANTY_STATUS } from "../../constants/websiteEnums";

export const WARRANTY_STATUS_LABELS = Object.freeze({
  [WARRANTY_STATUS.Submitted]: "Submitted",
  [WARRANTY_STATUS.UnderReview]: "Under review",
  [WARRANTY_STATUS.NeedMoreInformation]: "Need more information",
  [WARRANTY_STATUS.Approved]: "Approved",
  [WARRANTY_STATUS.Rejected]: "Rejected",
  [WARRANTY_STATUS.Completed]: "Completed",
});

export const WARRANTY_STATUS_TONES = Object.freeze({
  [WARRANTY_STATUS.Submitted]: "sky",
  [WARRANTY_STATUS.UnderReview]: "amber",
  [WARRANTY_STATUS.NeedMoreInformation]: "orange",
  [WARRANTY_STATUS.Approved]: "green",
  [WARRANTY_STATUS.Rejected]: "red",
  [WARRANTY_STATUS.Completed]: "emerald",
});

const permitted = (enabled, reason) => ({
  enabled: Boolean(enabled),
  reason: enabled ? "" : reason,
});

const hasResolution = (claim) => {
  const value = String(claim?.resolutionType ?? "").trim();
  return Boolean(value && value.toLowerCase() !== "none");
};

export const getWarrantyStatusLabel = (status) =>
  WARRANTY_STATUS_LABELS[status] ?? String(status || "Unknown");

export const getWarrantyStatusTone = (status) =>
  WARRANTY_STATUS_TONES[status] ?? "slate";

export const getAvailableActions = (claim = {}, capabilities = {}) => {
  const status = claim.status;
  const canEdit = Boolean(capabilities.canEdit || capabilities.canUpdate);
  const canApprove = Boolean(capabilities.canApprove);
  const canCommunicate = Boolean(
    capabilities.canCreate || capabilities.canEdit || capabilities.canUpdate,
  );
  const resolutionRecorded = hasResolution(claim);
  const readOnly = [WARRANTY_STATUS.Rejected, WARRANTY_STATUS.Completed].includes(status);
  const editReason = "This action requires Warranty Claims edit permission.";
  const approvalReason = "This action requires Warranty Claims approve permission.";
  const statusReason = (action) =>
    `${action} is not available while the claim is ${getWarrantyStatusLabel(status).toLowerCase()}.`;

  return {
    assign: permitted(
      canEdit &&
        [
          WARRANTY_STATUS.Submitted,
          WARRANTY_STATUS.UnderReview,
          WARRANTY_STATUS.NeedMoreInformation,
        ].includes(status),
      !canEdit ? editReason : statusReason("Assignment"),
    ),
    startReview: permitted(
      canEdit &&
        [WARRANTY_STATUS.Submitted, WARRANTY_STATUS.NeedMoreInformation].includes(status),
      !canEdit ? editReason : statusReason("Start review"),
    ),
    requestInformation: permitted(
      canEdit && status === WARRANTY_STATUS.UnderReview,
      !canEdit ? editReason : statusReason("Request information"),
    ),
    approve: permitted(
      canApprove && status === WARRANTY_STATUS.UnderReview,
      !canApprove ? approvalReason : statusReason("Approval"),
    ),
    reject: permitted(
      canApprove && status === WARRANTY_STATUS.UnderReview,
      !canApprove ? approvalReason : statusReason("Rejection"),
    ),
    resolve: permitted(
      canEdit && status === WARRANTY_STATUS.Approved && !resolutionRecorded,
      !canEdit
        ? editReason
        : resolutionRecorded
          ? "A resolution is already recorded."
          : statusReason("Resolution"),
    ),
    complete: permitted(
      canEdit && status === WARRANTY_STATUS.Approved && resolutionRecorded,
      !canEdit
        ? editReason
        : !resolutionRecorded
          ? "Record a resolution before completing this claim."
          : statusReason("Completion"),
    ),
    addNote: permitted(
      canCommunicate,
      "Adding internal notes requires Warranty Claims create or edit permission.",
    ),
    addMessage: permitted(
      canCommunicate,
      "Sending customer messages requires Warranty Claims create or edit permission.",
    ),
    readOnly,
  };
};

export { WARRANTY_STATUS };
