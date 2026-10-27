import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const itemFormSource = readFileSync(
  fileURLToPath(new URL("./ItemFormPage.jsx", import.meta.url)),
  "utf8",
);

describe("Item form tax UI", () => {
  it("keeps the canonical tax fields and has no HSN/SAC classification UI", () => {
    expect(itemFormSource).toContain('title="Taxes"');
    expect(itemFormSource).toContain('label="HSN Code"');
    expect(itemFormSource).toContain('label="GST Rate"');
    expect(itemFormSource).not.toContain("HSN/SAC classification");
    expect(itemFormSource).not.toContain("Save HSN/SAC");
    expect(itemFormSource).not.toContain("Search active HSN/SAC");
  });
});
