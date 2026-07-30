import {
  Contact,
  Link2,
  Package,
  ReceiptText,
} from "lucide-react";

import { partyService } from "../../pages/party/partyService";
import { itemService } from "../../services/inventory/itemService";
import { invoiceService } from "../../services/sales/invoiceService";
import { supplyChainItemMappingService } from "../../services/supplyChain/itemMappingService";
import { canPerformAction } from "../../utils/permissionResolver";

const SEARCH_PAGE_SIZE = 5;

const searchParams = (query) => ({
  PageNumber: 1,
  PageSize: SEARCH_PAGE_SIZE,
  Search: query,
});

const text = (...values) =>
  values
    .map((value) => String(value ?? "").trim())
    .find(Boolean) ?? "";

const queryRoute = (pathname, query) => {
  const params = new URLSearchParams({ q: query });

  return `${pathname}?${params.toString()}`;
};

const getPagedItems = (response) => {
  if (!Array.isArray(response?.data?.items)) {
    throw new Error("The search endpoint did not return a paged item list.");
  }

  return response.data.items;
};

export const globalSearchEntities = Object.freeze([
  Object.freeze({
    fetch: (query, { signal } = {}) =>
      itemService.getItems(searchParams(query), { signal }),
    icon: Package,
    id: "items",
    label: "Items",
    mapResult: (item) => {
      const primary = text(item.name, item.itemName, item.itemCode);
      const secondary = text(item.itemCode, item.sku);

      return {
        id: item.id ?? primary,
        primary,
        route: queryRoute("/items", text(item.itemCode, primary)),
        secondary: secondary === primary ? "" : secondary,
      };
    },
    permission: Object.freeze({
      action: "view",
      resource: "items",
      target: Object.freeze({ label: "Items", route: "/items" }),
    }),
  }),
  Object.freeze({
    fetch: (query, { signal } = {}) =>
      partyService.getParties(searchParams(query), { signal }),
    icon: Contact,
    id: "parties",
    label: "Parties",
    mapResult: (party) => {
      const primary = text(
        party.partyName,
        party.tradeName,
        party.legalName,
        party.partyCode,
      );
      const secondary = text(party.gstin, party.partyCode);

      return {
        id: party.id ?? primary,
        primary,
        route: queryRoute(
          "/party",
          text(party.partyCode, party.gstin, primary),
        ),
        secondary: secondary === primary ? "" : secondary,
      };
    },
    permission: Object.freeze({
      action: "view",
      resource: "party",
      target: Object.freeze({ label: "Party Master", route: "/party" }),
    }),
  }),
  Object.freeze({
    fetch: (query, { signal } = {}) =>
      invoiceService.getInvoices(searchParams(query), { signal }),
    icon: ReceiptText,
    id: "sales-invoices",
    label: "Sales invoices",
    mapResult: (invoice) => {
      const primary = text(
        invoice.invoiceNumber,
        invoice.number,
        `Invoice ${invoice.id ?? ""}`,
      );

      return {
        id: invoice.id ?? primary,
        primary,
        route: invoice.id
          ? `/sales/invoices/${invoice.id}`
          : queryRoute("/sales/invoices", primary),
        secondary: text(
          invoice.customerName,
          invoice.partyName,
          invoice.customer?.partyName,
        ),
      };
    },
    permission: Object.freeze({
      action: "view",
      resource: ["saleInvoices", "salesInvoices", "invoices"],
      target: Object.freeze({
        label: "Sale Invoices",
        route: "/sales/invoices",
      }),
    }),
  }),
  Object.freeze({
    fetch: (query, { signal } = {}) =>
      supplyChainItemMappingService.list(searchParams(query), { signal }),
    icon: Link2,
    id: "channel-skus",
    label: "Channel SKUs",
    mapResult: (mapping) => {
      const primary = text(
        mapping.channelSku,
        mapping.externalItemId,
        mapping.itemCode,
      );

      return {
        id: mapping.id ?? primary,
        primary,
        route: queryRoute(
          "/supply-chain/item-mappings",
          text(mapping.channelSku, primary),
        ),
        secondary: text(mapping.itemName, mapping.itemCode),
      };
    },
    permission: Object.freeze({
      action: "view",
      resource: "SupplyChain.ItemMappings",
      target: Object.freeze({
        label: "SupplyChain.ItemMappings",
        route: "/supply-chain/item-mappings",
      }),
    }),
  }),
]);

export const omittedGlobalSearchEntities = Object.freeze([
  Object.freeze({
    id: "users",
    reason: "The RBAC users list has no authoritative Search query contract.",
  }),
  Object.freeze({
    id: "plans",
    reason:
      "The procurement plan-run list has no authoritative Search query contract.",
  }),
]);

export const getPermittedGlobalSearchEntities = (
  entities,
  { pages, roles, user },
) =>
  entities.filter((entity) =>
    canPerformAction({
      ...entity.permission,
      pages,
      roles,
      user,
    }),
  );

export const searchRecordEntities = async ({
  entities,
  isCurrent,
  query,
  requestId,
  signal,
}) => {
  const settled = await Promise.allSettled(
    entities.map((entity) => entity.fetch(query, { signal })),
  );

  if (!isCurrent(requestId)) {
    return { groups: [], requestId, stale: true };
  }

  const groups = entities.flatMap((entity, index) => {
    const result = settled[index];

    if (result.status !== "fulfilled") {
      return [];
    }

    try {
      const items = getPagedItems(result.value)
        .map(entity.mapResult)
        .filter((item) => item.primary && item.route);

      return items.length > 0
        ? [
            {
              icon: entity.icon,
              id: entity.id,
              items,
              label: entity.label,
            },
          ]
        : [];
    } catch {
      return [];
    }
  });

  return { groups, requestId, stale: false };
};
