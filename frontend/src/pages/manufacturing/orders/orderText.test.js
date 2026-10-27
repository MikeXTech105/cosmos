import { afterEach, describe, expect, it, vi } from "vitest";
import english from "./orderMessages.en.json";
import hinglish from "./orderMessages.hi-en.json";
import { orderText } from "./orderText";

afterEach(() => vi.unstubAllGlobals());
describe("production order localized copy", () => {
  it("keeps English and Hinglish catalog keys complete and parallel", () => {
    expect(Object.keys(hinglish).sort()).toEqual(Object.keys(english).sort());
    expect(Object.values(hinglish).every((text) => typeof text === "string" && text.length)).toBe(true);
  });
  it("uses the existing application language preference and preserves unknown server messages", () => {
    vi.stubGlobal("localStorage", { getItem: () => "hi-en" });
    expect(orderText("Save draft")).toBe("Draft save karein");
    expect(orderText("INSUFFICIENT_OWN_ALLOCATION: component #8")).toBe("INSUFFICIENT_OWN_ALLOCATION: component #8");
    vi.stubGlobal("localStorage", { getItem: () => "en" });
    expect(orderText("Save draft")).toBe("Save draft");
  });
});
