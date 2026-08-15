import { describe, expect, it } from "vitest";

import {
  ACTIVITY_VALUE_UNAVAILABLE,
  formatActivitySnapshotValue,
  getActivityActor,
  getActivityStatusTone,
  parseActivitySnapshot,
} from "./activityLogPresentation";

describe("activity log presentation safety", () => {
  it("uses System when both actor names are missing", () => {
    expect(getActivityActor({ username: null, userDisplayName: null })).toEqual({
      isSystem: true,
      primary: "System",
      secondary: "",
    });
    expect(getActivityActor(null)).toEqual({
      isSystem: true,
      primary: "System",
      secondary: "",
    });
  });

  it("handles object snapshots", () => {
    const snapshot = parseActivitySnapshot({ Name: "New bearing" });

    expect(snapshot.kind).toBe("object");
    expect(snapshot.value).toEqual({ Name: "New bearing" });
    expect(snapshot.raw).toContain("New bearing");
  });

  it("handles plain and JSON string snapshots", () => {
    expect(parseActivitySnapshot("legacy value")).toMatchObject({
      kind: "text",
      value: "legacy value",
    });
    expect(parseActivitySnapshot('{"Name":"Bearing"}')).toMatchObject({
      kind: "object",
      value: { Name: "Bearing" },
    });
  });

  it("degrades null and malformed JSON without throwing", () => {
    expect(() => parseActivitySnapshot('{"Name":')).not.toThrow();
    expect(parseActivitySnapshot(null).kind).toBe("unavailable");
    expect(parseActivitySnapshot('{"Name":').kind).toBe("unavailable");
    expect(ACTIVITY_VALUE_UNAVAILABLE).toBe("Not available for this record");
    expect(formatActivitySnapshotValue(undefined)).toBe("—");
  });

  it("maps 2xx, 4xx, 5xx, and null status tones", () => {
    expect(getActivityStatusTone(204)).toBe("success");
    expect(getActivityStatusTone(404)).toBe("warning");
    expect(getActivityStatusTone(503)).toBe("danger");
    expect(getActivityStatusTone(null)).toBe("neutral");
  });
});
