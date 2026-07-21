import { describe, expect, it } from "vitest";

import { getFilenameFromContentDisposition } from "./fileDownload";

describe("getFilenameFromContentDisposition", () => {
  it.each([
    ['attachment; filename="parties.csv"', "parties.csv"],
    ["attachment; filename=roles.csv", "roles.csv"],
    ["attachment; filename*=UTF-8''sales%20report.csv", "sales report.csv"],
    ["inline", ""],
  ])("parses %s", (header, expected) => {
    expect(getFilenameFromContentDisposition(header)).toBe(expected);
  });
});
