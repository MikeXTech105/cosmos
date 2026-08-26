import { describe, expect, it } from "vitest";

import { DEFAULT_DATA_BOOK_COLUMNS } from "./dataBookColumns";
import {
  isDataBookHeaderRow,
  parseDataBookPaste,
} from "./dataBookPaste";

describe("Data Book TSV paste", () => {
  it("parses tabs, quoted tabs, CRLF, and a trailing blank line", () => {
    const result = parseDataBookPaste(
      'Name\tValue\r\n"White\tBox"\t"140*57*202"\r\n\r\n',
    );

    expect(result.errors).toEqual([]);
    expect(result.matrix).toEqual([
      ["Name", "Value"],
      ["White\tBox", "140*57*202"],
    ]);
  });

  it("detects a matching header row and rejects ordinary data", () => {
    expect(isDataBookHeaderRow(
      ["Name", "Value"],
      DEFAULT_DATA_BOOK_COLUMNS,
    )).toBe(true);
    expect(isDataBookHeaderRow(
      ["WHITE BOX K-55", "140*57*202"],
      DEFAULT_DATA_BOOK_COLUMNS,
    )).toBe(false);
  });
});
