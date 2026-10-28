export const WEBSITE_SETTING_METADATA = {
  SupportEmail: { label: "Customer support email", type: "email", example: "support@example.com", group: "Contact" },
  ManufacturingLocation: { label: "Manufacturing location", type: "text", example: "City, state", group: "Contact" },
  WhatsAppNumber: { label: "WhatsApp contact number", type: "tel", example: "+91 followed by the contact number", group: "Contact" },
  WhatsAppDefaultMessage: { label: "WhatsApp opening message", type: "text", example: "Hello, I need help with…", group: "Contact" },
  DefaultSeoTitle: { label: "Default search result title", type: "text", example: "Brand and a short description", group: "Search and sharing" },
  DefaultSeoDescription: { label: "Default search result description", type: "text", example: "A concise summary of the website", group: "Search and sharing" },
  DefaultSeoImage: { label: "Default sharing image", type: "url", example: "https://example.com/image.jpg", group: "Search and sharing" },
  PublicCountersEnabled: { label: "Show public website counters", type: "boolean", group: "Public visibility" },
  WarrantyStatisticsVisible: { label: "Show warranty statistics publicly", type: "boolean", group: "Public visibility" },
  ...Object.fromEntries(["Instagram", "Facebook", "Youtube", "LinkedIn"].map((name) => [`Social${name}Url`, { label: `${name} page URL`, type: "url", example: "https://…", group: "Social links" }])),
};
export const getWebsiteSettingMetadata = (key) => WEBSITE_SETTING_METADATA[key] || { label: String(key).replace(/([a-z])([A-Z])/g, "$1 $2"), type: "text", group: "Other approved settings" };
export const validateWebsiteSettingValue = (key, value) => {
  const text = String(value ?? "").trim();
  const { type } = getWebsiteSettingMetadata(key);
  if (type === "boolean" && !/^(true|false)$/i.test(text)) return "Choose Yes or No.";
  if (text && type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) return "Enter a valid email address.";
  if (text && type === "url") { try { if (!["https:", "http:"].includes(new URL(text).protocol)) return "Use a complete HTTP or HTTPS URL."; } catch { return "Use a complete HTTP or HTTPS URL."; } }
  return "";
};
