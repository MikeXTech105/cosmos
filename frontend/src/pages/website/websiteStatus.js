import {
  WEBSITE_PUBLISH_STATUS,
  WEBSITE_PUBLISH_STATUS_NAMES,
} from "../../constants/websiteEnums";

export const PUBLISH_STATUS_LABELS = Object.freeze({
  Archived: "Archived",
  Draft: "Draft",
  Published: "Published",
});

export const PUBLISH_STATUS_TONES = Object.freeze({
  Archived: "amber",
  Draft: "slate",
  Published: "green",
});

export const PUBLISH_STATUS_OPTIONS = WEBSITE_PUBLISH_STATUS_NAMES.map((name) => ({
  label: PUBLISH_STATUS_LABELS[name],
  value: name,
}));

export const PUBLISH_STATUS_BODY_OPTIONS = WEBSITE_PUBLISH_STATUS_NAMES.map((name) => ({
  label: PUBLISH_STATUS_LABELS[name],
  value: WEBSITE_PUBLISH_STATUS[name],
}));

export const getPublishStatusName = (value) => {
  if (typeof value === "string" && WEBSITE_PUBLISH_STATUS_NAMES.includes(value)) {
    return value;
  }

  return (
    Object.entries(WEBSITE_PUBLISH_STATUS).find(
      ([, numericValue]) => Number(value) === numericValue,
    )?.[0] ?? String(value ?? "")
  );
};

export const getPublishStatusLabel = (value) => {
  const name = getPublishStatusName(value);
  return PUBLISH_STATUS_LABELS[name] ?? (name || "Unknown");
};

export const getPublishStatusTone = (value) =>
  PUBLISH_STATUS_TONES[getPublishStatusName(value)] ?? "slate";

export const getPublishTransitionWarning = ({
  currentStatus,
  name,
  nextStatus,
}) => {
  const current = getPublishStatusName(currentStatus);
  const next = getPublishStatusName(nextStatus);
  const recordName = String(name || "This record");

  if (current !== "Published" && next === "Published") {
    return `This makes "${recordName}" visible on the WEWEL website immediately.`;
  }
  if (current === "Published" && next !== "Published") {
    return `This removes "${recordName}" from the public website.`;
  }
  return "";
};
