import { describe, expect, it } from "vitest";
import { getWebsiteSettingMetadata, validateWebsiteSettingValue } from "./websiteSettingMetadata";
describe("website settings metadata", () => {
  it("uses the backend's approved keys and enforces typed values", () => {
    expect(getWebsiteSettingMetadata("PublicCountersEnabled").type).toBe("boolean");
    expect(validateWebsiteSettingValue("PublicCountersEnabled", "yes")).not.toBe("");
    expect(validateWebsiteSettingValue("PublicCountersEnabled", "false")).toBe("");
    expect(validateWebsiteSettingValue("SocialInstagramUrl", "javascript:alert(1)")).not.toBe("");
    expect(validateWebsiteSettingValue("SocialInstagramUrl", "https://example.com/brand")).toBe("");
    expect(validateWebsiteSettingValue("SupportEmail", "invalid")).not.toBe("");
    expect(validateWebsiteSettingValue("SupportEmail", "support@example.com")).toBe("");
  });
});
