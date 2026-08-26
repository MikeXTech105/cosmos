import { parseCsv } from "../../utils/csvParse";

const normalizeHeader = (value) =>
  String(value ?? "").trim().toLocaleLowerCase();

export const parseDataBookPaste = (source) => {
  const parsed = parseCsv(source, { delimiter: "\t" });

  if (parsed.errors.length > 0) {
    return { errors: parsed.errors, matrix: [] };
  }

  const matrix = parsed.headers.length > 0
    ? [parsed.headers, ...parsed.rows]
    : [];

  return { errors: [], matrix };
};

export const isDataBookHeaderRow = (row, columns, startColumn = 0) => {
  if (!Array.isArray(row) || row.length === 0) return false;

  const expected = [columns.name, columns.value, columns.description]
    .slice(startColumn)
    .slice(0, row.length)
    .map(normalizeHeader);
  const actual = row.map(normalizeHeader);

  return actual.every((value) => value && !/^[-+]?\d+(?:[.,]\d+)?$/.test(value)) &&
    actual.every((value, index) => value === expected[index]);
};

export const getPasteDimensions = (matrix) => ({
  columns: Math.max(0, ...matrix.map((row) => row.length)),
  rows: matrix.length,
});
