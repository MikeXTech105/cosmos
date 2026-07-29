import { getApiErrorMessage } from "../../utils/apiError";
import {
  EMPTY_VALUE,
  formatDate as formatDisplayDate,
  formatNumber as formatDisplayNumber,
} from "../../utils/format";

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
      summary: null,
    };
  }

  return {
    items: Array.isArray(payload?.items) ? payload.items : [],
    pageNumber: Number(payload?.pageNumber) || 1,
    pageSize: Number(payload?.pageSize) || 10,
    totalCount: Number(payload?.totalCount) || 0,
    totalPages: Number(payload?.totalPages) || 1,
    summary: payload?.summary ?? null,
  };
};

export const extractEntity = (payload) => {
  return payload?.party ?? payload?.item ?? payload?.record ?? payload;
};

const PARTY_TYPE_BY_GROUP = {
  both: "Both",
  customers: "Customer",
  suppliers: "Supplier",
};

export const buildPartyQueryParams = ({ filters, group = "all", page, pageSize, sort }) => {
  const search = filters.Search?.trim();
  const parsedPageSize = Number(pageSize);
  const safePageSize =
    pageSize === undefined || pageSize === null
      ? undefined
      : Math.min(
          200,
          Math.max(1, Number.isFinite(parsedPageSize) ? Math.trunc(parsedPageSize) : 10),
        );

  return Object.fromEntries(
    Object.entries({
      PartyType: PARTY_TYPE_BY_GROUP[group],
      HasGstin:
        filters.gst === "with-gstin"
          ? true
          : filters.gst === "without-gstin"
            ? false
            : undefined,
      HasCreditLimit:
        filters.creditLimit === "with-limit"
          ? true
          : filters.creditLimit === "without-limit"
            ? false
            : undefined,
      Search: search || undefined,
      PageNumber: page,
      PageSize: safePageSize,
      SortBy: sort?.SortBy || undefined,
      SortDirection: sort?.SortDirection || undefined,
      IsActive:
        filters.IsActive === "all" ? undefined : filters.IsActive === "active",
    }).filter(([, value]) => value !== undefined),
  );
};

export const isPartySummary = (summary) => {
  return (
    summary !== null &&
    typeof summary === "object" &&
    ["allCount", "customerCount", "supplierCount", "bothCount"].every(
      (key) => Number.isFinite(Number(summary[key])),
    )
  );
};

export const getPartyGroupCountsFromSummary = (summary) => ({
  all: Number(summary?.allCount) || 0,
  both: Number(summary?.bothCount) || 0,
  customers: Number(summary?.customerCount) || 0,
  suppliers: Number(summary?.supplierCount) || 0,
});

export const dedupeParties = (parties) => {
  const seen = new Set();

  return parties.filter((party, index) => {
    const key = party?.id === undefined || party?.id === null
      ? `index-${index}`
      : String(party.id);

    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export const loadPartyFallbackCollection = async ({
  fetchPage,
  maxRecords = 5000,
  pageSize = 200,
  signal,
}) => {
  const ensureActive = () => {
    if (signal?.aborted) {
      const error = new Error("Request aborted");
      error.name = "AbortError";
      throw error;
    }
  };
  const firstPage = extractPagedParties(await fetchPage(1, pageSize));

  ensureActive();
  if (firstPage.totalCount > maxRecords) {
    return { capped: true, items: firstPage.items, totalCount: firstPage.totalCount };
  }

  const items = [...firstPage.items];
  const totalPages = Math.max(
    firstPage.totalPages,
    Math.ceil(firstPage.totalCount / pageSize),
  );

  for (let pageNumber = 2; pageNumber <= totalPages; pageNumber += 1) {
    ensureActive();
    const nextPage = extractPagedParties(await fetchPage(pageNumber, pageSize));
    items.push(...nextPage.items);
  }

  return {
    capped: false,
    items: dedupeParties(items).slice(0, maxRecords),
    totalCount: firstPage.totalCount,
  };
};

export const formatDate = (value) => {
  return formatDisplayDate(value);
};

export const formatNumber = (value) => {
  return formatDisplayNumber(value);
};

export const formatBalance = (party) => {
  const amount = formatNumber(party?.openingBalance);
  const balanceType = Number(party?.openingBalanceType);

  if (amount === EMPTY_VALUE) {
    return EMPTY_VALUE;
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
    return EMPTY_VALUE;
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

export const buildClientPartyView = ({
  creditFilter,
  gstFilter,
  group,
  page,
  pageSize,
  parties,
}) => {
  const summaryItems = filterPartiesForBusinessView({
    creditFilter,
    group: "all",
    gstFilter,
    parties,
  });
  const filteredItems = filterPartiesForBusinessView({
    creditFilter,
    group,
    gstFilter,
    parties,
  });
  const totalCount = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;

  return {
    groupCounts: getPartyGroupCounts(summaryItems),
    items: filteredItems.slice(start, start + pageSize),
    page: safePage,
    stats: {
      allCount: summaryItems.length,
      customerCount: getPartyGroupCounts(summaryItems).customers,
      supplierCount: getPartyGroupCounts(summaryItems).suppliers,
      bothCount: getPartyGroupCounts(summaryItems).both,
      inactiveCount: summaryItems.filter((party) => !party.isActive).length,
      totalCreditLimit: summaryItems.reduce(
        (total, party) => total + (Number(party.creditLimit) || 0),
        0,
      ),
    },
    totalCount,
    totalPages,
  };
};
