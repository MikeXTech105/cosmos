import { sha256Hex } from "../../../utils/csvParse";

export const sourceManifest = [
  ["Form Responses 2", "Positional submitted events; preserve repeated headers"], ["Form Responses 1", "Positional submitted events; preserve repeated headers"], ["DISPATCH DATA", "Historical dispatch evidence"], ["PRODUCTION DATA", "Historical production evidence"], ["CURREENT STOCK", "Opening and daily balance reconciliation"], ["ADU", "Demand period, refresh and pack conversion evidence"], ["FORM_CONFIG", "Master references; inactive history retained"], ["LAST 30 DAYS SALE", "Aggregate demand; no invented individual sales"], ["JUNCTION", "Canonical BOM source and exact output basis"], ["RAW_MATERIAL_MASTER", "Existing Item settings and supplier references"], ["PROCUREMENT_INWARD", "Pending purchase / physical receipt evidence with actual PO and cost"], ["VENDOR_MASTER", "Existing supplier Party references"], ["Sheet6", "Blank source; evidence only"], ["PO_TRACKER", "Pending purchase evidence and promise history"], ["RM_CURRENT_STOCK", "Raw-material stock and purchase reconciliation"], ["PRODUCTION PLANNING", "Canvas dependency: PRODUCTION DATA + ADU"], ["PROCUREMENT PLANNING", "Canvas dependency: RM_CURRENT_STOCK"], ["PURCHASE TRACKER", "Canvas dependency: PO_TRACKER"], ["PURCHASE IN", "Canvas dependency: PROCUREMENT_INWARD"], ["RAW MATERIAL", "Canvas dependency: RAW_MATERIAL_MASTER"], ["VENDORS", "Canvas dependency: VENDOR_MASTER"], ["SCORECARD", "Canvas production + dispatch scorecard; hidden layout unavailable"],
].map(([tab, purpose]) => ({ tab, purpose }));

// Preserve empty logical rows and duplicate header positions. The general CSV adapter
// intentionally removes blank rows, so provenance needs this positional variant.
export function parsePositionalCsv(source, delimiter = ",") {
  if (typeof delimiter !== "string" || delimiter.length !== 1 || /["\r\n]/.test(delimiter)) throw new Error("Use a single CSV or TSV delimiter.");
  const text = String(source).replace(/^\uFEFF/, "");
  const rows = []; let row = [], field = "", quoted = false, closedQuote = false;
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (quoted) { if (char === '"' && text[index + 1] === '"') { field += '"'; index++; } else if (char === '"') { quoted = false; closedQuote = true; } else field += char; }
    else if (char === '"') { if (field) throw new Error("Quote must begin at the start of a CSV field."); quoted = true; }
    else if (char === delimiter) { row.push(field); field = ""; closedQuote = false; }
    else if (char === "\r" || char === "\n") { row.push(field); rows.push(row); row = []; field = ""; closedQuote = false; if (char === "\r" && text[index + 1] === "\n") index++; }
    else if (closedQuote) throw new Error("A quoted field must end at the delimiter or row boundary.");
    else field += char;
  }
  if (quoted) throw new Error("The file has an unclosed quoted field.");
  if (field || row.length) { row.push(field); rows.push(row); }
  return { headers: rows[0] || [], rows: rows.slice(1) };
}
export function columnLetter(position) { let result = "", value = position + 1; while (value) { value--; result = String.fromCharCode(65 + value % 26) + result; value = Math.floor(value / 26); } return result; }
export async function prepareProductionEvidence({ file, tab, delimiter = ",", firstDataRow = 2 }) {
  if (!sourceManifest.some(source => source.tab === tab)) throw new Error("Choose the actual source tab.");
  if (!/\.(csv|tsv)$/i.test(file?.name || "")) throw new Error("Export one source tab as CSV or TSV, keeping its original column order.");
  if (file.size > 5 * 1024 * 1024) throw new Error("Use a source-tab export no larger than 5 MB.");
  const rowStart = Number(firstDataRow);
  if (!Number.isSafeInteger(rowStart) || rowStart < 2 || rowStart > 2147478647) throw new Error("Enter the first data row's actual position in the original tab (at least 2).");
  const text = await file.text(), parsed = parsePositionalCsv(text, delimiter), fileSha256 = await sha256Hex(file);
  // Stage identity includes the original tab/position; identical CSV bytes in
  // different tabs are different evidence. Retain the raw file hash separately.
  const fingerprint = await sha256Hex(JSON.stringify({ adapter: "positional-csv-v2", fileSha256, tab, firstDataRow: rowStart }));
  const rows = []; let evidenceBytes = 0; const encoder = new TextEncoder();
  for (const [offset, values] of parsed.rows.entries()) {
    for (let column = 0; column < Math.max(parsed.headers.length, values.length); column++) {
      const value = values[column] ?? "";
      if (!value.trim()) continue;
      if (rows.length >= 5000) throw new Error("The server accepts up to 5,000 source cells per batch. Export fewer complete rows and retain their original starting row.");
      const original = { fileName: file.name, fileSha256, tab, row: offset + rowStart, column: columnLetter(column), header: parsed.headers[column] ?? "", value, cells: values.map((entry, index) => ({ column: columnLetter(index), header: parsed.headers[index] ?? "", value: entry })) };
      const originalJson = JSON.stringify(original);
      evidenceBytes += encoder.encode(originalJson).length;
      if (evidenceBytes > 8 * 1024 * 1024) throw new Error("This export creates too much positional evidence. Export fewer complete original rows and enter their actual first row number.");
      rows.push({ tab, row: offset + rowStart, column: `${columnLetter(column)}: ${parsed.headers[column] || "Unlabelled"}`.slice(0, 100), eventFingerprint: await sha256Hex(JSON.stringify({ tab, row: original.row, column: original.column, header: original.header, value, cells: original.cells })), originalJson, normalizedJson: null, exceptionCode: "UNMAPPED_SOURCE" });
    }
  }
  if (!rows.length) { const original = { fileName: file.name, fileSha256, tab, row: rowStart - 1, column: "A", header: parsed.headers[0] || "", value: "", blankEvidence: true }; rows.push({ tab, row: rowStart - 1, column: "A: Blank evidence", eventFingerprint: await sha256Hex(JSON.stringify({ tab, row: original.row, blankEvidence: true })), originalJson: JSON.stringify(original), normalizedJson: null, exceptionCode: "BLANK_EVIDENCE_ONLY" }); }
  if (rows.length > 5000) throw new Error("The server accepts up to 5,000 source cells per batch. Use a smaller documented source export preserving original positions.");
  return { fileFingerprint: fingerprint, fileName: file.name, rows, headers: parsed.headers };
}
export const dispositionLabels = { 1: "Historical production", 2: "Historical dispatch", 3: "Demand aggregate", 4: "Start-of-day opening", 5: "Master reference", 6: "Pending purchase evidence", 7: "Evidence only" };
export function sourceEvidence(row) { try { return JSON.parse(row.originalJson); } catch { return { value: "Original evidence could not be read." }; } }
export function rowCanAdvance(row, action) {
  if (action === "validate") return Boolean(row.disposition) && !["Approved", "Posted"].includes(row.rowStatus);
  if (action === "reconcile") return row.rowStatus === "Validated" && !row.exceptionCode;
  if (action === "approve") return row.rowStatus === "Reconciled" && !row.exceptionCode && (row.reconciliationDifference == null || /^[-+]?0(?:\.0*)?$/.test(String(row.reconciliationDifference)));
  return row.rowStatus === "Approved" && !row.exceptionCode;
}
