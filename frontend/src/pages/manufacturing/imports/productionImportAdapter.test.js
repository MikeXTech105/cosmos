import { describe, expect, it } from "vitest";
import { columnLetter, parsePositionalCsv, prepareProductionEvidence, rowCanAdvance } from "./productionImportAdapter";

describe("source import positions and guarded transitions", () => {
  const file = (text, name = "source.csv") => ({ name, size: new TextEncoder().encode(text).length, text: async () => text, arrayBuffer: async () => new TextEncoder().encode(text).buffer });
  it("separates identical file bytes from distinct source tabs and retains raw hash and partial-export positions", async () => {
    const source = file("Date,SKU,SKU\n2026-10-26,0.000001,9999999999999999.999999\n,,\n2026-10-25,2,3\n");
    const production = await prepareProductionEvidence({ file: source, tab: "PRODUCTION DATA", firstDataRow: 502 });
    const dispatch = await prepareProductionEvidence({ file: source, tab: "DISPATCH DATA", firstDataRow: 502 });
    expect(production.fileFingerprint).not.toBe(dispatch.fileFingerprint);
    expect(production.rows.map(row => row.row)).toEqual([502, 502, 502, 504, 504, 504]);
    const original = JSON.parse(production.rows[2].originalJson);
    expect(original.value).toBe("9999999999999999.999999"); expect(original.fileSha256).toHaveLength(64);
    expect(original.fileSha256).toBe(JSON.parse(dispatch.rows[2].originalJson).fileSha256);
    expect((await prepareProductionEvidence({ file: source, tab: "PRODUCTION DATA", firstDataRow: 502 })).fileFingerprint).toBe(production.fileFingerprint);
  });
  it("rejects malformed quoted evidence and invalid source positions before staging", async () => {
    expect(() => parsePositionalCsv('A,B\n"actual"changed,1')).toThrow(/quoted field/);
    expect(() => parsePositionalCsv('A,B\n"unclosed,1')).toThrow(/unclosed/);
    await expect(prepareProductionEvidence({ file: file("SKU\n1"), tab: "ADU", firstDataRow: 0 })).rejects.toThrow(/original tab/);
  });
  it("preserves duplicate header positions, empty logical rows and quoted multi-line evidence", () => {
    const source = 'Date,SKU,SKU\r\n2026-10-26,10,"Line one\nLine two"\r\n,,\r\n2026-10-27,20,30\r\n';
    const parsed = parsePositionalCsv(source);
    expect(parsed.headers).toEqual(["Date", "SKU", "SKU"]);
    expect(parsed.rows).toHaveLength(3);
    expect(parsed.rows[0][2]).toBe("Line one\nLine two");
    expect(parsed.rows[1]).toEqual(["", "", ""]);
    expect(parsed.rows[2]).toEqual(["2026-10-27", "20", "30"]);
    expect(columnLetter(26)).toBe("AA");
  });
  it("prevents approved/posted evidence from revalidation while leaving repairable rows independent", () => {
    const row = { disposition: 1, rowStatus: "Mapped", exceptionCode: null };
    expect(rowCanAdvance(row, "validate")).toBe(true);
    expect(rowCanAdvance({ ...row, rowStatus: "Approved" }, "validate")).toBe(false);
    expect(rowCanAdvance({ ...row, rowStatus: "Posted" }, "validate")).toBe(false);
    expect(rowCanAdvance({ ...row, rowStatus: "Validated" }, "reconcile")).toBe(true);
    expect(rowCanAdvance({ ...row, rowStatus: "Reconciled", reconciliationDifference: "0.000001" }, "approve")).toBe(false);
    expect(rowCanAdvance({ ...row, rowStatus: "Reconciled", reconciliationDifference: "0.000000" }, "approve")).toBe(true);
    expect(rowCanAdvance({ ...row, rowStatus: "Approved", exceptionCode: "DUPLICATE_NORMALIZED_EVENT" }, "post")).toBe(false);
  });
});
