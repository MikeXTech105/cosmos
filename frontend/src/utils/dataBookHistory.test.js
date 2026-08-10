import { describe, expect, it } from "vitest";

import {
  getDataBookHistoryDiff,
  parseDataBookHistoryJson,
} from "./dataBookHistory";

describe("Data Book history parsing", () => {
  it("parses valid JSON strings", () => {
    expect(parseDataBookHistoryJson('{"name":"Portal"}')).toMatchObject({
      parsed: true,
      value: { name: "Portal" },
    });
  });

  it("returns malformed JSON as raw text and never throws", () => {
    expect(() => parseDataBookHistoryJson('{"name":')).not.toThrow();
    expect(parseDataBookHistoryJson('{"name":')).toEqual({
      parsed: false,
      raw: '{"name":',
      value: '{"name":',
    });
  });

  it("keeps malformed record parts available to the UI", () => {
    const result = getDataBookHistoryDiff({
      changedFieldsJson: '["name"]',
      newDataJson: '{"name":',
      oldDataJson: '{"name":"Old"}',
    });

    expect(result.raw).toHaveLength(1);
    expect(result.raw[0].raw).toBe('{"name":');
  });
});
