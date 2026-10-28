import { describe, expect, it } from "vitest";
import { websiteDateTimeInput, websiteScheduleUtc } from "./websiteScheduling";
describe("website company scheduling", () => {
  it("round-trips India midnight through UTC independently of the workstation zone", () => {
    expect(websiteScheduleUtc("2026-10-28T00:15", "Asia/Kolkata")).toBe("2026-10-27T18:45:00.000Z");
    expect(websiteDateTimeInput("2026-10-27T18:45:00Z", "Asia/Kolkata")).toBe("2026-10-28T00:15");
    expect(websiteDateTimeInput("2026-10-27T18:45:00", "Asia/Kolkata")).toBe("2026-10-28T00:15");
  });
  it("rejects an unconfigured timezone and daylight-saving gaps or ambiguity", () => {
    expect(() => websiteScheduleUtc("2026-10-28T12:00", "")).toThrow();
    expect(() => websiteScheduleUtc("2026-03-08T02:30", "America/New_York")).toThrow();
    expect(() => websiteScheduleUtc("2026-11-01T01:30", "America/New_York")).toThrow();
    expect(websiteDateTimeInput("invalid", "Asia/Kolkata")).toBe("");
  });
});
