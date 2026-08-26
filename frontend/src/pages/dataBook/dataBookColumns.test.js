import { describe, expect, it } from "vitest";

import {
  DEFAULT_DATA_BOOK_COLUMNS,
  getDataBookColumns,
  getDataBookColumnsStorageKey,
  saveDataBookColumns,
} from "./dataBookColumns";

const createStorage = (initial = {}) => {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
};

describe("Data Book column preferences", () => {
  it("falls back to defaults when storage is missing", () => {
    expect(getDataBookColumns("White Box Data", createStorage())).toEqual(
      DEFAULT_DATA_BOOK_COLUMNS,
    );
  });

  it("falls back safely when the stored JSON is corrupt", () => {
    const key = getDataBookColumnsStorageKey("White Box Data");
    const storage = createStorage({ [key]: "{not-json" });

    expect(getDataBookColumns("White Box Data", storage)).toEqual(
      DEFAULT_DATA_BOOK_COLUMNS,
    );
  });

  it("persists renamed headers per category", () => {
    const storage = createStorage();
    saveDataBookColumns("White Box Data", {
      ...DEFAULT_DATA_BOOK_COLUMNS,
      value: "Size in mm",
    }, storage);

    expect(getDataBookColumns("White Box Data", storage).value).toBe("Size in mm");
    expect(getDataBookColumns("Another Sheet", storage).value).toBe("Value");
  });
});
