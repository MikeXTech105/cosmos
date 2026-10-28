import { describe, expect, it, vi } from "vitest";

import {
  buildClientPartyView,
  buildPartyQueryParams,
  loadPartyFallbackCollection,
  buildFormValues,
  buildApiPayload,
} from "./partyHelpers";
import { PARTY_COMMAND_FIELDS } from "./partyColumns";

describe("Party type create and edit contract", () => {
  it.each(["Customer", "Supplier", "Both"])("retains the explicit %s role through form hydration and request construction", partyType => {
    const values = buildFormValues(PARTY_COMMAND_FIELDS, { partyCode: "TEST", partyName: "Scoped fixture", partyType });
    expect(buildApiPayload(PARTY_COMMAND_FIELDS, values).partyType).toBe(partyType);
  });
  it("uses Both only for a new unspecified party", () => {
    expect(buildApiPayload(PARTY_COMMAND_FIELDS, buildFormValues(PARTY_COMMAND_FIELDS)).partyType).toBe("Both");
  });
});

describe("party query contract", () => {
  it("maps every advanced filter to the backend contract", () => {
    expect(
      buildPartyQueryParams({
        filters: {
          Search: "  acme ",
          IsActive: "inactive",
          creditLimit: "with-limit",
          gst: "without-gstin",
        },
        group: "suppliers",
        page: 2,
        pageSize: 25,
        sort: { SortBy: "partyName", SortDirection: "asc" },
      }),
    ).toEqual({
      HasCreditLimit: true,
      HasGstin: false,
      IsActive: false,
      PageNumber: 2,
      PageSize: 25,
      PartyType: "Supplier",
      Search: "acme",
      SortBy: "partyName",
      SortDirection: "asc",
    });
  });

  it("omits all optional filters in the all state", () => {
    const result = buildPartyQueryParams({
      filters: { Search: "", IsActive: "all", creditLimit: "all", gst: "all" },
      group: "all",
      page: 1,
      pageSize: 10,
      sort: {},
    });

    expect(result).toEqual({ PageNumber: 1, PageSize: 10 });
    expect(result).not.toHaveProperty("SortBy");
  });

  it.each([
    ["customers", "Customer"],
    ["suppliers", "Supplier"],
    ["both", "Both"],
  ])("maps the %s group", (group, PartyType) => {
    expect(
      buildPartyQueryParams({
        filters: { Search: "", IsActive: "all", creditLimit: "all", gst: "all" },
        group,
        page: 1,
        pageSize: 10,
        sort: {},
      }),
    ).toMatchObject({ PartyType });
  });

  it("clamps PageSize to the safe API range", () => {
    const base = {
      filters: { Search: "", IsActive: "all", creditLimit: "all", gst: "all" },
      group: "all",
      page: 1,
      sort: {},
    };

    expect(buildPartyQueryParams({ ...base, pageSize: 500 }).PageSize).toBe(200);
    expect(buildPartyQueryParams({ ...base, pageSize: 0 }).PageSize).toBe(1);
  });
});

describe("party fallback", () => {
  it("loads every page, dedupes, and builds full-scope filtering", async () => {
    const fetchPage = vi.fn(async (pageNumber) => ({
      items:
        pageNumber === 1
          ? [{ id: 1, partyType: "Customer", creditLimit: 100, gstin: "GST" }]
          : [
              { id: 1, partyType: "Customer", creditLimit: 100, gstin: "GST" },
              { id: 2, partyType: "Supplier", creditLimit: 0, gstin: "" },
            ],
      pageNumber,
      pageSize: 1,
      totalCount: 2,
      totalPages: 2,
    }));
    const result = await loadPartyFallbackCollection({ fetchPage, pageSize: 1 });
    const view = buildClientPartyView({
      creditFilter: "all",
      gstFilter: "all",
      group: "suppliers",
      page: 1,
      pageSize: 10,
      parties: result.items,
    });

    expect(result.items).toHaveLength(2);
    expect(view.totalCount).toBe(1);
    expect(view.groupCounts).toMatchObject({ customers: 1, suppliers: 1 });
  });

  it("stops at the safe cap", async () => {
    const result = await loadPartyFallbackCollection({
      fetchPage: async () => ({ items: [{ id: 1 }], totalCount: 5001, totalPages: 26 }),
      maxRecords: 5000,
    });

    expect(result.capped).toBe(true);
    expect(result.totalCount).toBe(5001);
  });
});
