import { WEBSITE_PUBLISH_STATUS } from "../../../constants/websiteEnums";
import { mapProductBenefitsFromResponse, mapProductBenefitsToRequest, validateProductMedia } from "../../../utils/websiteContent";
import { getPublishStatusName } from "../websiteStatus";

// Limits match SaveWebsiteProductRequestValidator and usp_WebsiteProduct_Save.
export const PRODUCT_TEXT_LIMITS = {
  code: 100, name: 200, description: 4000, currencyCode: 3, badge: 100,
  urgencyText: 300, material: 200, quantityDisplay: 100, warrantyDisplay: 100,
  amazonUrl: 1000, brandName: 200, availabilityText: 100,
};
export const EMPTY_PRODUCT_FORM = {
  amazonUrl: "", availabilityText: "", badge: "", benefits: [], brandName: "", code: "",
  currencyCode: "INR", description: "", displayPrice: "", isActive: true, isRustProof: false,
  isUvResistant: false, isWindTested: false, material: "", media: [], name: "", publishStatus: WEBSITE_PUBLISH_STATUS.Draft,
  quantityDisplay: "", rating: "", reviewCount: "", rowVersion: null, sortOrder: 0, urgencyText: "", warrantyDisplay: "",
};
const text = (value) => String(value ?? "").trim();
const optionalNumber = (value) => text(value) === "" ? null : Number(value);
export const isHttpUrl = (value) => {
  try { return ["http:", "https:"].includes(new URL(value).protocol); } catch { return false; }
};

export const restoreSavedProductMedia = (record, saved) =>
  record?.id != null && saved?.id === record.id && record.rowVersion && saved.rowVersion === record.rowVersion && !Array.isArray(record.media)
    ? { ...record, media: saved.media }
    : record;
export const hasIncompleteProductMedia = (record) => Boolean(record?.primaryImageUrl && !Array.isArray(record.media));

export const toProductForm = (record = {}) => ({
  ...EMPTY_PRODUCT_FORM,
  ...record,
  ...Object.fromEntries(Object.keys(PRODUCT_TEXT_LIMITS).map((key) => [key, record[key] ?? EMPTY_PRODUCT_FORM[key]])),
  displayPrice: record.displayPrice ?? "", rating: record.rating ?? "", reviewCount: record.reviewCount ?? "",
  benefits: mapProductBenefitsFromResponse(record.benefits),
  publishStatus: WEBSITE_PUBLISH_STATUS[getPublishStatusName(record.publishStatus)] ?? WEBSITE_PUBLISH_STATUS.Draft,
  // Current detail API exposes only the primary URL, not the full gallery.
  media: (Array.isArray(record.media) ? record.media : record.primaryImageUrl
    ? [{ publicUrl: record.primaryImageUrl, isPrimary: true }] : [])
    .map((item, index) => ({ ...item, altText: item.altText ?? "", sortOrder: index })),
});

export const validateProductForm = (form) => {
  const errors = validateProductMedia(form.media);
  for (const [key, limit] of Object.entries(PRODUCT_TEXT_LIMITS)) {
    if (text(form[key]).length > limit) errors[key] = `Use ${limit} characters or fewer.`;
  }
  if (!text(form.code)) errors.code = "Code is required.";
  if (!text(form.name)) errors.name = "Name is required.";
  if (text(form.currencyCode) && !/^[A-Z]{3}$/.test(text(form.currencyCode))) errors.currencyCode = "Enter a three-letter currency code, such as INR.";
  if (text(form.amazonUrl) && !isHttpUrl(text(form.amazonUrl))) errors.amazonUrl = "Enter a complete HTTP or HTTPS URL.";
  for (const [key, max, integer] of [["displayPrice", Number.MAX_SAFE_INTEGER / 100, false], ["rating", 5, false], ["reviewCount", 2147483647, true], ["sortOrder", 100000, true]]) {
    if (text(form[key]) === "" && key !== "sortOrder") continue;
    const value = Number(form[key]);
    if (text(form[key]) === "" || !Number.isFinite(value) || value < 0 || value > max || (integer && !Number.isInteger(value))) {
      errors[key] = key === "displayPrice"
        ? "Enter a nonnegative price within the supported range."
        : key === "reviewCount" ? "Enter a whole review count between 0 and 2,147,483,647."
          : `Enter ${integer ? "a whole number" : "a number"} between 0 and ${max}.`;
    } else if (!integer && !/^(?:\d+)(?:\.\d{1,2})?$/.test(text(form[key]))) {
      errors[key] = "Use a number with no more than two decimal places.";
    }
  }
  if (![0, 1, 2].includes(Number(form.publishStatus)) || text(form.publishStatus) === "") errors.publishStatus = "Choose a publish status.";
  form.benefits.forEach((benefit, index) => {
    if (!text(benefit.benefitText)) errors[`benefits.${index}.benefitText`] = "Enter a benefit or remove this row.";
    else if (text(benefit.benefitText).length > 500) errors[`benefits.${index}.benefitText`] = "Use 500 characters or fewer.";
  });
  return errors;
};

export const toProductPayload = (form) => ({
  ...Object.fromEntries(Object.keys(EMPTY_PRODUCT_FORM).map((key) => [key, form[key]])),
  ...Object.fromEntries(Object.keys(PRODUCT_TEXT_LIMITS).map((key) => [key, text(form[key]) || null])),
  currencyCode: text(form.currencyCode) || "INR",
  benefits: mapProductBenefitsToRequest(form.benefits).map((item, sortOrder) => ({ ...item, sortOrder })),
  displayPrice: optionalNumber(form.displayPrice), rating: optionalNumber(form.rating), reviewCount: optionalNumber(form.reviewCount),
  sortOrder: Number(form.sortOrder), publishStatus: Number(form.publishStatus),
  media: form.media.map((item, sortOrder) => ({ publicUrl: text(item.publicUrl), altText: text(item.altText), isPrimary: Boolean(item.isPrimary), sortOrder })),
});
