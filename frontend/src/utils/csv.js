import { downloadBlob } from "./fileDownload";

const DANGEROUS_FORMULA_PREFIX = /^[\s]*[=+\-@]/;
const NUMERIC_TEXT =
  /^[-+]?(?:(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?|\.\d+)%?$/;

export const sanitizeCsvValue = (value) => {
  const text = String(value ?? "");
  const trimmedText = text.trim();

  if (!DANGEROUS_FORMULA_PREFIX.test(text) || NUMERIC_TEXT.test(trimmedText)) {
    return text;
  }

  return `'${text}`;
};

export const escapeCsvValue = (value) => {
  const text = sanitizeCsvValue(value);

  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export const UTF8_BOM = "\uFEFF";

export const getNestedValue = (record, path) => {
  if (typeof path === "function") {
    return path(record);
  }

  return String(path ?? "")
    .split(".")
    .filter(Boolean)
    .reduce((value, key) => value?.[key], record);
};

const isActionColumn = (column) => {
  const identity = String(
    column?.key ?? column?.accessor ?? column?.type ?? "",
  ).toLowerCase();

  return column?.isAction === true || identity === "action" || identity === "actions";
};

export const buildCsv = (
  rows,
  columns,
  { includeBom = true, onProgress } = {},
) => {
  const exportColumns = (columns ?? []).filter((column) => !isActionColumn(column));
  const lines = [
    exportColumns.map((column) => escapeCsvValue(column.header ?? column.label ?? column.key)).join(","),
  ];

  (rows ?? []).forEach((row, index) => {
    lines.push(
      exportColumns
        .map((column) =>
          escapeCsvValue(
            getNestedValue(
              row,
              column.getValue ?? column.accessor ?? column.path ?? column.key,
            ),
          ),
        )
        .join(","),
    );
    onProgress?.({ completed: index + 1, total: rows.length });
  });

  return `${includeBom ? UTF8_BOM : ""}${lines.join("\r\n")}`;
};

export const downloadCsv = async ({
  columns,
  filename = "export.csv",
  onProgress,
  rows,
}) => {
  const csv = buildCsv(rows, columns, { onProgress });

  downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), filename);
  return filename;
};
