import {
  DISPATCH_IMPORT_HEADERS,
  DISPATCH_IMPORT_TYPES,
  DISPATCH_INBOUND_STATUS_LABELS,
} from "../constants/dispatchEnums";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const parseCsv = (source) => {
  const text = String(source ?? "").replace(/^\uFEFF/, "");
  const rows = [];
  let field = "";
  let row = [];
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\r" || character === "\n") {
      row.push(field);
      field = "";
      if (row.some((value) => value !== "")) {
        rows.push(row);
      }
      row = [];
      if (character === "\r" && text[index + 1] === "\n") {
        index += 1;
      }
    } else {
      field += character;
    }
  }

  if (quoted) {
    return {
      errors: [{ field: "File", message: "The CSV contains an unclosed quote." }],
      headers: [],
      rows: [],
    };
  }

  row.push(field);
  if (row.some((value) => value !== "")) {
    rows.push(row);
  }

  const [headers = [], ...dataRows] = rows;

  return { errors: [], headers: headers.map((value) => value.trim()), rows: dataRows };
};

const toArrayBuffer = async (value) => {
  if (typeof value === "string") {
    return new TextEncoder().encode(value);
  }

  if (value instanceof ArrayBuffer || ArrayBuffer.isView(value)) {
    return value;
  }

  if (typeof value?.arrayBuffer === "function") {
    return value.arrayBuffer();
  }

  throw new TypeError("A string, byte array, ArrayBuffer, or File is required.");
};

export const sha256Hex = async (value, cryptoApi = globalThis.crypto) => {
  const bytes = await toArrayBuffer(value);
  const digest = await cryptoApi.subtle.digest("SHA-256", bytes);

  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

const normalizeHeader = (value) => String(value ?? "").trim().toLowerCase();

const buildRecord = (headers, values) =>
  Object.fromEntries(
    headers.map((header, index) => [header, values[index]?.trim?.() ?? ""]),
  );

const parseNumber = (value, field, rowNumber, errors, { optional = false } = {}) => {
  if (value === "" && optional) {
    return 0;
  }

  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    errors.push({
      field,
      message: `${field} must be a non-negative number.`,
      originalValue: value,
      rowNumber,
    });
    return null;
  }

  return number;
};

const parseDate = (value, field, rowNumber, errors, { optional = false } = {}) => {
  if (!value && optional) {
    return null;
  }

  const parsed = ISO_DATE.test(value)
    ? new Date(`${value}T00:00:00Z`)
    : null;
  const canonical =
    parsed && !Number.isNaN(parsed.getTime())
      ? parsed.toISOString().slice(0, 10)
      : "";

  if (!parsed || canonical !== value) {
    errors.push({
      field,
      message: `${field} must use yyyy-MM-dd.`,
      originalValue: value,
      rowNumber,
    });
    return null;
  }

  return value;
};

const getInboundStatus = (value, rowNumber, errors) => {
  const numeric = Number(value);
  if (Number.isInteger(numeric) && DISPATCH_INBOUND_STATUS_LABELS[numeric]) {
    return numeric;
  }

  const normalized = String(value ?? "").replace(/[\s_-]/g, "").toLowerCase();
  const match = Object.entries(DISPATCH_INBOUND_STATUS_LABELS).find(
    ([, label]) => label.replace(/[\s_-]/g, "").toLowerCase() === normalized,
  );

  if (match) {
    return Number(match[0]);
  }

  errors.push({
    field: "InboundStatus",
    message: "InboundStatus is not recognized.",
    originalValue: value,
    rowNumber,
  });
  return null;
};

export const resolveWarehouseCode = (code, warehouses) => {
  const normalized = String(code ?? "").trim().toLowerCase();

  return (
    warehouses.find(
      (warehouse) =>
        String(warehouse.warehouseCode ?? "").trim().toLowerCase() === normalized,
    ) ?? null
  );
};

export const buildDispatchImportRows = ({
  headers,
  importType,
  rows,
  warehouses,
}) => {
  const expected = DISPATCH_IMPORT_HEADERS[importType] ?? [];
  const normalizedHeaders = headers.map(normalizeHeader);
  const missingHeaders = expected.filter(
    (header) => !normalizedHeaders.includes(normalizeHeader(header)),
  );
  const extraHeaders = headers.filter(
    (header) => !expected.some((value) => normalizeHeader(value) === normalizeHeader(header)),
  );
  const errors = [];

  if (missingHeaders.length > 0 || extraHeaders.length > 0) {
    return {
      errors: [{
        field: "Header",
        message: [
          missingHeaders.length ? `Missing: ${missingHeaders.join(", ")}.` : "",
          extraHeaders.length ? `Unexpected: ${extraHeaders.join(", ")}.` : "",
        ].filter(Boolean).join(" "),
        originalValue: headers.join(","),
        rowNumber: 1,
      }],
      rows: [],
    };
  }

  const output = rows.map((values, index) => {
    const record = buildRecord(headers, values);
    const parsedRowNumber = Number(record.RowNumber);
    const rowNumber =
      Number.isInteger(parsedRowNumber) && parsedRowNumber > 0
        ? parsedRowNumber
        : index + 2;
    if (!Number.isInteger(parsedRowNumber) || parsedRowNumber <= 0) {
      errors.push({
        field: "RowNumber",
        message: "RowNumber must be a positive whole number.",
        originalValue: record.RowNumber,
        rowNumber,
      });
    }
    const warehouse = resolveWarehouseCode(record.WarehouseCode, warehouses);

    if (!warehouse) {
      errors.push({
        field: "WarehouseCode",
        message: "Warehouse code does not resolve for the selected channel.",
        originalValue: record.WarehouseCode,
        rowNumber,
      });
    }
    if (!record.ChannelSku) {
      errors.push({
        field: "ChannelSku",
        message: "ChannelSku is required.",
        originalValue: record.ChannelSku,
        rowNumber,
      });
    }

    const base = {
      channelSku: record.ChannelSku,
      rowNumber,
      warehouseId: warehouse?.id ?? null,
    };

    if (importType === DISPATCH_IMPORT_TYPES.Sales) {
      return {
        ...base,
        periodFrom: parseDate(record.PeriodFrom, "PeriodFrom", rowNumber, errors),
        periodTo: parseDate(record.PeriodTo, "PeriodTo", rowNumber, errors),
        salesQuantity: parseNumber(
          record.SalesQuantity,
          "SalesQuantity",
          rowNumber,
          errors,
        ),
      };
    }

    if (importType === DISPATCH_IMPORT_TYPES.WarehouseStock) {
      return {
        ...base,
        availableQuantity: parseNumber(
          record.AvailableQuantity,
          "AvailableQuantity",
          rowNumber,
          errors,
        ),
        damagedQuantity: parseNumber(
          record.DamagedQuantity,
          "DamagedQuantity",
          rowNumber,
          errors,
          { optional: true },
        ),
        reservedQuantity: parseNumber(
          record.ReservedQuantity,
          "ReservedQuantity",
          rowNumber,
          errors,
          { optional: true },
        ),
        snapshotDate: parseDate(
          record.SnapshotDate,
          "SnapshotDate",
          rowNumber,
          errors,
        ),
      };
    }

    return {
      ...base,
      expectedArrivalDate: parseDate(
        record.ExpectedArrivalDate,
        "ExpectedArrivalDate",
        rowNumber,
        errors,
        { optional: true },
      ),
      inboundQuantity: parseNumber(
        record.InboundQuantity,
        "InboundQuantity",
        rowNumber,
        errors,
      ),
      inboundStatus: getInboundStatus(
        record.InboundStatus,
        rowNumber,
        errors,
      ),
      referenceNumber: record.ReferenceNumber || null,
      snapshotDate: parseDate(
        record.SnapshotDate,
        "SnapshotDate",
        rowNumber,
        errors,
      ),
    };
  });

  const invalidRows = new Set(errors.map((error) => error.rowNumber));

  return {
    errors,
    rows: output.filter(
      (row) => row.warehouseId !== null && !invalidRows.has(row.rowNumber),
    ),
  };
};
