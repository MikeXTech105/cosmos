import { describe, expect, it } from "vitest";

import {
  buildDashboardApiParams,
  normalizeDashboardFilters,
  PARTY_TYPE_OPTIONS,
} from "./dashboardHelpers";

describe("dashboard party type filters", () => {
  it("only exposes values accepted by the API", () => {
    expect(PARTY_TYPE_OPTIONS.map((option) => option.value)).toEqual([
      "Customer",
      "Supplier",
    ]);
  });

  it("migrates stale Both filters to a valid customer request", () => {
    expect(normalizeDashboardFilters({ partyType: "Both" }).partyType).toBe(
      "Customer",
    );
    expect(buildDashboardApiParams.topParties({ partyType: "Both" }).PartyType).toBe(
      "Customer",
    );
  });
});
