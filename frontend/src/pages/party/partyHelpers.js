import { getApiErrorMessage } from "../../utils/apiError";

const ACRONYMS = new Map([
  ["gst", "GST"],
  ["gstin", "GSTIN"],
  ["id", "ID"],
  ["dto", "DTO"],
]);

const humanizePart = (part) => {
  const lowerPart = part.toLowerCase();

  return ACRONYMS.get(lowerPart) ?? part.charAt(0).toUpperCase() + part.slice(1);
};

export const getFieldLabel = (name) => {
  return String(name)
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(" ")
    .map(humanizePart)
    .join(" ");
};

export const getErrorMessage = (error, fallback) => {
  return getApiErrorMessage(error, fallback);
};

const getEmptyValue = (field) => {
  if (field.type === "boolean") {
    return field.name === "isActive";
  }

  if (field.type === "integer" || field.type === "number") {
    return 0;
  }

  return "";
};

export const buildFormValues = (fields, source = {}) => {
  return fields.reduce((values, field) => {
    const sourceValue = source?.[field.name];

    values[field.name] =
      sourceValue === undefined || sourceValue === null
        ? getEmptyValue(field)
        : sourceValue;

    return values;
  }, {});
};

const toNumberValue = (value) => {
  if (value === "" || value === null || value === undefined) {
    return 0;
  }

  const numberValue = Number(value);

  return Number.isNaN(numberValue) ? 0 : numberValue;
};

export const buildApiPayload = (fields, values) => {
  return fields.reduce((payload, field) => {
    const value = values?.[field.name];

    if (field.type === "boolean") {
      payload[field.name] = Boolean(value);
      return payload;
    }

    if (field.type === "integer") {
      payload[field.name] = Math.trunc(toNumberValue(value));
      return payload;
    }

    if (field.type === "number") {
      payload[field.name] = toNumberValue(value);
      return payload;
    }

    const stringValue = String(value ?? "").trim();
    payload[field.name] = field.nullable && !stringValue ? null : stringValue;

    return payload;
  }, {});
};

export const extractPagedParties = (payload) => {
  if (Array.isArray(payload)) {
    return {
      items: payload,
      pageNumber: 1,
      pageSize: payload.length,
      totalCount: payload.length,
      totalPages: 1,
    };
  }

  return {
    items: Array.isArray(payload?.items) ? payload.items : [],
    pageNumber: Number(payload?.pageNumber) || 1,
    pageSize: Number(payload?.pageSize) || 10,
    totalCount: Number(payload?.totalCount) || 0,
    totalPages: Number(payload?.totalPages) || 1,
  };
};

export const extractEntity = (payload) => {
  return payload?.party ?? payload?.item ?? payload?.record ?? payload;
};

export const buildPartyQueryParams = ({ filters, page, pageSize, sort }) => {
  const search = filters.Search?.trim();

  return {
    Search: search || undefined,
    PageNumber: page,
    PageSize: pageSize,
    SortBy: sort.SortBy || undefined,
    SortDirection: sort.SortDirection || undefined,
    IsActive:
      filters.IsActive === "all" ? undefined : filters.IsActive === "active",
  };
};

export const formatDate = (value) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export const formatNumber = (value) => {
  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) {
    return "-";
  }

  return numberValue.toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });
};

export const formatBalance = (party) => {
  const amount = formatNumber(party?.openingBalance);
  const balanceType = Number(party?.openingBalanceType);

  if (amount === "-") {
    return "-";
  }

  if (balanceType === 1) {
    return `${amount} Dr`;
  }

  if (balanceType === 2) {
    return `${amount} Cr`;
  }

  return amount;
};

export const formatValue = (value) => {
  if (value === undefined || value === null || value === "") {
    return "-";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  return String(value);
};

export const getPartyDisplayName = (party) => {
  return party?.partyName || party?.tradeName || party?.legalName || "this party";
};

const normalizeText = (value) => {
  return String(value ?? "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
};

const getPartyTypeSource = (party) => {
  return (
    party?.partyType ??
    party?.type ??
    party?.customerSupplierType ??
    party?.partyCategory ??
    party?.category ??
    party?.accountType
  );
};

export const getPartyType = (party) => {
  const normalizedType = normalizeText(getPartyTypeSource(party));

  if (["customer", "customers", "client", "clients"].includes(normalizedType)) {
    return "customer";
  }

  if (["supplier", "suppliers", "vendor", "vendors"].includes(normalizedType)) {
    return "supplier";
  }

  if (
    [
      "both",
      "customer supplier",
      "supplier customer",
      "customer and supplier",
      "supplier and customer",
    ].includes(normalizedType)
  ) {
    return "both";
  }

  return "both";
};

export const getPartyTypeLabel = (party) => {
  const partyType = getPartyType(party);

  return {
    both: "Both",
    customer: "Customer",
    supplier: "Supplier",
  }[partyType];
};

export const getPartyCity = (party) => {
  return party?.billingCity ?? party?.city ?? party?.shippingCity ?? "";
};

export const getPartyState = (party) => {
  return party?.billingState ?? party?.state ?? party?.shippingState ?? "";
};

export const getPartyGroupCounts = (parties) => {
  const counts = {
    all: parties.length,
    both: 0,
    customers: 0,
    suppliers: 0,
  };

  parties.forEach((party) => {
    const partyType = getPartyType(party);

    if (partyType === "customer") {
      counts.customers += 1;
      return;
    }

    if (partyType === "supplier") {
      counts.suppliers += 1;
      return;
    }

    counts.both += 1;
  });

  return counts;
};

export const filterPartiesForBusinessView = ({
  creditFilter,
  gstFilter,
  group,
  parties,
}) => {
  return parties.filter((party) => {
    const partyType = getPartyType(party);
    const creditLimit = Number(party.creditLimit) || 0;
    const hasGstin = Boolean(String(party.gstin ?? "").trim());

    if (group === "customers" && partyType !== "customer") {
      return false;
    }

    if (group === "suppliers" && partyType !== "supplier") {
      return false;
    }

    if (group === "both" && partyType !== "both") {
      return false;
    }

    if (creditFilter === "with-limit" && creditLimit <= 0) {
      return false;
    }

    if (creditFilter === "without-limit" && creditLimit > 0) {
      return false;
    }

    if (gstFilter === "with-gstin" && !hasGstin) {
      return false;
    }

    if (gstFilter === "without-gstin" && hasGstin) {
      return false;
    }

    return true;
  });
};
