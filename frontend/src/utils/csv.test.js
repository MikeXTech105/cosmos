import { describe, expect, it } from "vitest";

import { escapeCsvValue, sanitizeCsvValue } from "./csv";

describe("sanitizeCsvValue", () => {
  it.each(["=SUM(A1:A2)", "+cmd|' /C calc'!A0", "-1+2", "@SUM(A1)"])(
    "neutralizes formula-like text %s",
    (value) => {
      expect(sanitizeCsvValue(value)).toBe(`'${value}`);
    },
  );

  it.each(["-42", "+42.5", "-1,234.50", "12.5%"])(
    "preserves legitimate numeric text %s",
    (value) => {
      expect(sanitizeCsvValue(value)).toBe(value);
    },
  );

  it("sanitizes before applying normal CSV escaping", () => {
    expect(escapeCsvValue('=HYPERLINK("x","y")')).toBe(
      '"\'=HYPERLINK(""x"",""y"")"',
    );
  });

  it("does not mistake malformed signed text for a number", () => {
    expect(sanitizeCsvValue("+1.2.3")).toBe("'+1.2.3");
  });
});
