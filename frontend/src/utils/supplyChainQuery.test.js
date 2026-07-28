import { describe, expect, it } from "vitest";

import {
  sanitizeSupplyChainChannelParams,
  sanitizeSupplyChainImportParams,
  sanitizeSupplyChainWarehouseDropdownParams,
  sanitizeSupplyChainWarehouseParams,
} from "./supplyChainQuery";

describe("supplyChainQuery", () => {
  it("clamps PageSize and preserves PascalCase list params", () => {
    expect(
      sanitizeSupplyChainWarehouseParams({
        ChannelId: "channel-1",
        PageNumber: 2,
        PageSize: 999,
        Search: "blr",
      }),
    ).toMatchObject({
      ChannelId: "channel-1",
      PageNumber: 2,
      PageSize: 200,
      Search: "blr",
    });
  });

  it("omits empty or invalid sort fields", () => {
    expect(
      sanitizeSupplyChainChannelParams({
        PageSize: 20,
        SortBy: "",
        SortDirection: "",
      }),
    ).not.toHaveProperty("SortBy");
    expect(
      sanitizeSupplyChainChannelParams({
        SortBy: "not-a-field",
        SortDirection: "asc",
      }),
    ).not.toHaveProperty("SortDirection");
  });

  it("honours the camelCase warehouse dropdown quirk", () => {
    expect(
      sanitizeSupplyChainWarehouseDropdownParams({ channelId: "channel-2" }),
    ).toEqual({ channelId: "channel-2" });
    expect(
      sanitizeSupplyChainWarehouseDropdownParams({ ChannelId: "wrong-case" }),
    ).toEqual({});
  });

  it("keeps import list filters PascalCase", () => {
    expect(
      sanitizeSupplyChainImportParams({
        ChannelId: "channel-3",
        ImportType: "ProcurementSales",
        PageSize: 50,
        channelId: "ignored",
      }),
    ).toEqual({
      ChannelId: "channel-3",
      ImportType: "ProcurementSales",
      PageNumber: 1,
      PageSize: 50,
    });
  });
});
