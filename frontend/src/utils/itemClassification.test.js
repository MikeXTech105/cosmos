import { describe, expect, it } from "vitest";

import {
  getItemClassificationLabel,
  normalizeItemClassification,
} from "./itemClassification";

describe("item classification helpers", () => {
  it.each(["", null, undefined])(
    "normalizes empty input %s to null",
    (value) => {
      expect(normalizeItemClassification(value)).toBeNull();
    },
  );

  it("normalizes a numeric string to its enum value", () => {
    expect(normalizeItemClassification("2")).toBe(2);
  });

  it("normalizes an unsupported value to null", () => {
    expect(normalizeItemClassification(9)).toBeNull();
    expect(normalizeItemClassification(0)).toBeNull();
  });

  it("labels an unclassified value consistently", () => {
    expect(getItemClassificationLabel(null)).toBe("Not classified");
  });
});
