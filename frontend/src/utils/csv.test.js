import { describe, expect, it } from "vitest";

import {
  buildCsv,
  escapeCsvValue,
  getNestedValue,
  sanitizeCsvValue,
  UTF8_BOM,
} from "./csv";

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

describe("buildCsv", () => {
  it("uses explicit header order, nested values, and excludes actions", () => {
    const csv = buildCsv(
      [{ active: false, amount: 0, customer: { name: 'Acme, "West"' } }],
      [
        { header: "Customer", key: "customer.name" },
        { header: "Amount", key: "amount" },
        { header: "Active", key: "active" },
        { header: "Actions", key: "actions" },
      ],
    );

    expect(csv).toBe(
      `${UTF8_BOM}Customer,Amount,Active\r\n"Acme, ""West""",0,false`,
    );
  });

  it("escapes newlines and reports progress", () => {
    const progress = [];
    const csv = buildCsv(
      [{ note: "line 1\nline 2" }, { note: "done" }],
      [{ header: "Note", key: "note" }],
      { includeBom: false, onProgress: (value) => progress.push(value) },
    );

    expect(csv).toBe('Note\r\n"line 1\nline 2"\r\ndone');
    expect(progress).toEqual([
      { completed: 1, total: 2 },
      { completed: 2, total: 2 },
    ]);
  });

  it("supports function value getters", () => {
    expect(getNestedValue({ value: 2 }, (row) => row.value * 3)).toBe(6);
  });
});
