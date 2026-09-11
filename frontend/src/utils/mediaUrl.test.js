import { describe, expect, it } from "vitest";

import { getMediaUrl, resolveMediaUrl } from "./mediaUrl";

describe("media URL normalization", () => {
  it("preserves absolute HTTP URLs without upgrading the protocol", () => {
    expect(resolveMediaUrl("http://media.example.com/a.jpg")).toBe(
      "http://media.example.com/a.jpg",
    );
  });

  it("normalizes relative paths and Windows separators", () => {
    expect(resolveMediaUrl("uploads\\items\\a.jpg")).toMatch(
      /^http:\/\/[^/]+\/uploads\/items\/a\.jpg$/,
    );
  });

  it("uses the first populated media field", () => {
    expect(
      getMediaUrl(
        { imagePath: "/uploads/item.png", imageUrl: "" },
        ["imageUrl", "imagePath"],
      ),
    ).toMatch(/\/uploads\/item\.png$/);
  });
});
