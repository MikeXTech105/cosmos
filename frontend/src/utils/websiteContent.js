import { WARRANTY_RESOLUTION_TYPE } from "../constants/websiteEnums";

export const slugifyWebsiteTitle = (value) =>
  String(value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

export const updateGeneratedSlug = ({ slug, slugTouched, title }) => ({
  slug: slugTouched ? slug : slugifyWebsiteTitle(title),
  slugTouched,
  title,
});

export const mapProductBenefitsFromResponse = (benefits = []) =>
  (Array.isArray(benefits) ? benefits : []).map((benefit, index) => ({
    benefitText:
      typeof benefit === "string" ? benefit : String(benefit?.benefitText ?? ""),
    sortOrder:
      typeof benefit === "string" ? index : Number(benefit?.sortOrder ?? index),
  }));

export const mapProductBenefitsToRequest = (benefits = []) =>
  (Array.isArray(benefits) ? benefits : [])
    .map((benefit, index) => ({
      benefitText: String(benefit?.benefitText ?? "").trim(),
      sortOrder: Number(benefit?.sortOrder ?? index),
    }))
    .filter((benefit) => benefit.benefitText);

export const getAnnouncementLiveState = (announcement, now = new Date()) => {
  if (!announcement?.isActive) {
    return { isLive: false, reason: "Inactive" };
  }

  const current = now instanceof Date ? now : new Date(now);
  const starts = announcement?.startsAtUtc
    ? new Date(announcement.startsAtUtc)
    : null;
  const ends = announcement?.endsAtUtc ? new Date(announcement.endsAtUtc) : null;

  if (starts && starts > current) {
    const days = Math.max(1, Math.ceil((starts - current) / 86400000));
    return { isLive: false, reason: `Starts in ${days} day${days === 1 ? "" : "s"}` };
  }
  if (ends && ends < current) {
    return {
      isLive: false,
      reason: `Ended ${new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "short",
      }).format(ends)}`,
    };
  }
  return { isLive: true, reason: "Active and within its display window" };
};

export const sortWebsiteAnnouncements = (items = []) =>
  [...items].sort(
    (left, right) =>
      Number(right?.priority || 0) - Number(left?.priority || 0) ||
      Number(left?.sortOrder || 0) - Number(right?.sortOrder || 0) ||
      Number(left?.id || 0) - Number(right?.id || 0),
  );

export const bumpDismissalVersion = (value) => {
  const text = String(value ?? "").trim();
  if (!text) return "1";
  const match = text.match(/^(.*?)(\d+)$/);
  return match ? `${match[1]}${Number(match[2]) + 1}` : `${text}-2`;
};

export const validateWarrantyResolution = (form = {}) => {
  const errors = {};
  const type = Number(form.resolutionType);
  if (!Number.isFinite(type) || type === WARRANTY_RESOLUTION_TYPE.None) {
    errors.resolutionType = "Choose a resolution type.";
  }
  if (type === WARRANTY_RESOLUTION_TYPE.Refund) {
    if (!(Number(form.refundAmount) > 0)) {
      errors.refundAmount = "Refund amount must be greater than zero.";
    }
    if (!String(form.refundReference ?? "").trim()) {
      errors.refundReference = "Refund reference is required.";
    }
  }
  if (
    type === WARRANTY_RESOLUTION_TYPE.Replacement &&
    !String(form.replacementReference ?? "").trim()
  ) {
    errors.replacementReference = "Replacement reference is required.";
  }
  if (
    type === WARRANTY_RESOLUTION_TYPE.Repair &&
    !String(form.repairReference ?? "").trim()
  ) {
    errors.repairReference = "Repair reference is required.";
  }
  return errors;
};

export const validateProductMedia = (media = []) => {
  const errors = {};
  const populated = media.filter((item) => String(item?.publicUrl ?? "").trim());
  media.forEach((item, index) => {
    const url = String(item?.publicUrl ?? "").trim();
    let validUrl = url.startsWith("/uploads/");
    try { validUrl ||= ["http:", "https:"].includes(new URL(url).protocol); } catch { /* relative upload paths are allowed */ }
    if (!url) errors[`media.${index}.publicUrl`] = "Upload an image or remove this row.";
    else if (!validUrl || url.length > 1000) errors[`media.${index}.publicUrl`] = "Use an HTTP/HTTPS image URL or /uploads/ path (maximum 1000 characters).";
    if (String(item?.altText ?? "").length > 500) {
      errors[`media.${index}.altText`] = "Alt text cannot exceed 500 characters.";
    }
  });
  if (populated.length > 0 && populated.filter((item) => item.isPrimary).length !== 1) {
    errors.media = "Choose exactly one primary image.";
  }
  return errors;
};
