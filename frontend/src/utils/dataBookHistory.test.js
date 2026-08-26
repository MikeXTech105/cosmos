import { describe, expect, it } from "vitest";

import {
  formatDataBookHistoryValue,
  getDataBookHistoryDiff,
  normalizeDataBookChangedFields,
  normalizeDataBookHistoryEntry,
  normalizeDataBookHistoryPayload,
  parseDataBookHistoryJson,
} from "./dataBookHistory";

const updatedRecord = {
  actionType: "Updated",
  changedFields: ["Value"],
  newData: { Value: "erwewefdsasasas" },
  oldData: { Value: "erwewef" },
};

describe("Data Book history normalization", () => {
  it("parses valid legacy JSON strings", () => {
    expect(parseDataBookHistoryJson('{"Name":"Portal"}')).toMatchObject({
      parsed: true,
      value: { Name: "Portal" },
    });
  });

  it("falls back to null for malformed legacy JSON and never throws", () => {
    expect(() => parseDataBookHistoryJson('{"Name":')).not.toThrow();
    expect(parseDataBookHistoryJson('{"Name":')).toEqual({
      parsed: false,
      raw: '{"Name":',
      value: null,
    });
  });

  it("normalizes canonical string fields", () => {
    expect(normalizeDataBookChangedFields(["Value"])).toEqual(["Value"]);
  });

  it("normalizes legacy FieldName objects without coercing objects", () => {
    expect(
      normalizeDataBookChangedFields('[{"FieldName":"Value"}]'),
    ).toEqual(["Value"]);
    expect(normalizeDataBookChangedFields([{}])).toEqual([]);
  });

  it("filters empty fields and deduplicates case-insensitively", () => {
    expect(
      normalizeDataBookChangedFields([
        "Value",
        "value",
        " ",
        { fieldName: "Description" },
      ]),
    ).toEqual(["Value", "Description"]);
  });

  it("prefers canonical properties and falls back to valid legacy properties", () => {
    const result = normalizeDataBookHistoryEntry({
      actionType: "Updated",
      changedFields: [],
      changedFieldsJson: '[{"FieldName":"Value"}]',
      newData: null,
      newDataJson: '{"Value":"new"}',
      oldDataJson: '{"Value":"old"}',
    });

    expect(result.changedFields).toEqual(["Value"]);
    expect(result.oldData).toEqual({ Value: "old" });
    expect(result.newData).toEqual({ Value: "new" });
    expect(result).not.toHaveProperty("changedFieldsJson");
  });

  it("normalizes both array and items response payloads at the API boundary", () => {
    expect(
      normalizeDataBookHistoryPayload([{ changedFields: ["Value"] }]),
    ).toEqual([
      expect.objectContaining({ changedFields: ["Value"] }),
    ]);

    expect(
      normalizeDataBookHistoryPayload({
        items: [{ changedFieldsJson: '[{"FieldName":"Name"}]' }],
      }),
    ).toEqual({
      items: [expect.objectContaining({ changedFields: ["Name"] })],
    });
  });
});

describe("Data Book history presentation", () => {
  it("resolves the canonical Updated Value example", () => {
    expect(getDataBookHistoryDiff(updatedRecord)).toMatchObject({
      mode: "diff",
      fields: [
        {
          field: "Value",
          label: "Value",
          newValue: "erwewefdsasasas",
          oldValue: "erwewef",
        },
      ],
    });
  });

  it("resolves legacy object field names against legacy snapshots", () => {
    const result = getDataBookHistoryDiff({
      actionType: "Updated",
      changedFieldsJson: '[{"FieldName":"Value"}]',
      newDataJson: '{"Value":"new"}',
      oldDataJson: '{"Value":"old"}',
    });

    expect(result.fields[0]).toMatchObject({
      field: "Value",
      newValue: "new",
      oldValue: "old",
    });
    expect(JSON.stringify(result)).not.toContain("[object Object]");
  });

  it("shows only declared business fields for Updated records", () => {
    const result = getDataBookHistoryDiff({
      actionType: "Updated",
      changedFields: ["Description"],
      newData: { Description: "new", Name: "same" },
      oldData: { Description: "old", Name: "same" },
    });

    expect(result.fields.map((field) => field.field)).toEqual(["Description"]);
  });

  it("supports multiple changed fields and camelCase snapshots", () => {
    const result = getDataBookHistoryDiff({
      actionType: "Updated",
      changedFields: ["Name", "IsPrivate"],
      newData: { isPrivate: true, name: "New" },
      oldData: { isPrivate: false, name: "Old" },
    });

    expect(result.fields).toEqual([
      expect.objectContaining({ field: "Name", newValue: "New", oldValue: "Old" }),
      expect.objectContaining({
        field: "IsPrivate",
        label: "Privacy",
        newValue: true,
        oldValue: false,
      }),
    ]);
  });

  it("uses the Created new snapshot without fake old values or audit fields", () => {
    const result = getDataBookHistoryDiff({
      actionType: "Created",
      newData: {
        Category: "sd",
        CreatedBy: 3,
        Description: "rwer",
        IsPrivate: false,
        Name: "werw",
        OwnerUserId: 1,
        Value: "erwe",
      },
    });

    expect(result.mode).toBe("snapshot");
    expect(result.fields.map((field) => field.field)).toEqual([
      "Name",
      "Value",
      "Description",
      "Category",
      "IsPrivate",
    ]);
    expect(result.fields.every((field) => field.oldValue === undefined)).toBe(true);
  });

  it("uses relevant prior business values for Deleted records", () => {
    const result = getDataBookHistoryDiff({
      actionType: "Deleted",
      oldData: { Name: "Portal", UpdatedBy: 3, Value: "account" },
    });

    expect(result.mode).toBe("previous");
    expect(result.fields.map((field) => field.field)).toEqual(["Name", "Value"]);
  });

  it("handles malformed JSON and unknown actions without crashing", () => {
    expect(() =>
      getDataBookHistoryDiff({
        actionType: "Archived",
        changedFieldsJson: "[{",
        newDataJson: "{",
        oldDataJson: "{",
      }),
    ).not.toThrow();

    expect(
      getDataBookHistoryDiff({ actionType: "Archived" }).fields,
    ).toEqual([]);
  });
});

describe("Data Book history value formatting", () => {
  it("formats missing old and new values as an em dash", () => {
    expect(formatDataBookHistoryValue("Value", undefined)).toBe("—");
    expect(formatDataBookHistoryValue("Value", null)).toBe("—");
    expect(formatDataBookHistoryValue("Value", "")).toBe("—");
  });

  it("formats privacy booleans as Private and Public", () => {
    expect(formatDataBookHistoryValue("IsPrivate", true)).toBe("Private");
    expect(formatDataBookHistoryValue("isPrivate", false)).toBe("Public");
  });

  it("formats numbers, generic booleans, arrays, and objects safely", () => {
    expect(formatDataBookHistoryValue("Count", 12)).toBe("12");
    expect(formatDataBookHistoryValue("Enabled", false)).toBe("No");
    expect(formatDataBookHistoryValue("Tags", ["a", "b"])).toBe('[\n  "a",\n  "b"\n]');
    expect(formatDataBookHistoryValue("Metadata", { code: "A" })).toBe(
      '{\n  "code": "A"\n}',
    );
    expect(formatDataBookHistoryValue("Metadata", {})).not.toBe("[object Object]");
  });

  it("preserves long and date-looking strings without truncation or timezone guessing", () => {
    const longValue = "x".repeat(2000);
    expect(formatDataBookHistoryValue("Value", longValue)).toBe(longValue);
    expect(formatDataBookHistoryValue("Value", "2026-08-10T05:19:14.307Z")).toBe(
      "2026-08-10T05:19:14.307Z",
    );
  });

  it("handles circular objects without throwing or implicit coercion", () => {
    const circular = {};
    circular.self = circular;
    expect(() => formatDataBookHistoryValue("Metadata", circular)).not.toThrow();
    expect(formatDataBookHistoryValue("Metadata", circular)).toBe("—");
  });
});
