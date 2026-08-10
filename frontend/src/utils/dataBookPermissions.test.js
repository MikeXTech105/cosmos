import { describe, expect, it } from "vitest";

import {
  canDeleteDataBookEntry,
  canEditDataBookEntry,
} from "./dataBookPermissions";

describe("Data Book record gates", () => {
  it.each([
    [false, false, false],
    [false, true, false],
    [true, false, false],
    [true, true, true],
  ])("combines edit permission %s with row flag %s", (permission, row, expected) => {
    expect(canEditDataBookEntry({ canEdit: permission }, { canEdit: row })).toBe(
      expected,
    );
  });

  it.each([
    [false, false, false],
    [false, true, false],
    [true, false, false],
    [true, true, true],
  ])("combines delete permission %s with row flag %s", (permission, row, expected) => {
    expect(
      canDeleteDataBookEntry({ canDelete: permission }, { canDelete: row }),
    ).toBe(expected);
  });
});
