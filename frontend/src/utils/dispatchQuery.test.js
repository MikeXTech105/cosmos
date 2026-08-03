import { describe, expect, it } from "vitest";

import {
  sanitizeDispatchImportParams,
  sanitizeDispatchRecommendationParams,
  sanitizeDispatchReportExportParams,
  sanitizeDispatchSettingParams,
} from "./dispatchQuery";

describe("dispatchQuery", () => {
  it("clamps page size and preserves PascalCase", () => {
    expect(
      sanitizeDispatchSettingParams({
        ChannelId: 4,
        PageNumber: 2,
        PageSize: 500,
        channelId: 9,
      }),
    ).toEqual({
      ChannelId: 4,
      PageNumber: 2,
      PageSize: 200,
    });
  });

  it("omits unsupported and empty sort parameters", () => {
    expect(
      sanitizeDispatchImportParams({
        ImportType: 1,
        PageSize: 20,
        SortBy: "",
        SortDirection: "",
      }),
    ).toEqual({
      ImportType: 1,
      PageNumber: 1,
      PageSize: 20,
    });
  });

  it("keeps recommendation filters unpaged", () => {
    expect(
      sanitizeDispatchRecommendationParams({
        AllocatedOnly: false,
        PageNumber: 3,
        Search: "sku",
        Tier: 2,
      }),
    ).toEqual({
      AllocatedOnly: false,
      Search: "sku",
      Tier: 2,
    });
  });

  it("keeps report export filters but omits list pagination", () => {
    expect(
      sanitizeDispatchReportExportParams({
        ChannelId: 3,
        FromDate: "2026-07-01",
        PageNumber: 2,
        PageSize: 500,
        Status: 4,
      }),
    ).toEqual({
      ChannelId: 3,
      FromDate: "2026-07-01",
      Status: 4,
    });
  });
});
