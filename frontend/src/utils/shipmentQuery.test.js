import { describe, expect, it } from "vitest";

import {
  sanitizeShipmentDashboardParams,
  sanitizeShipmentImportParams,
  sanitizeShipmentListParams,
  sanitizeShipmentPackingParams,
  sanitizeShipmentReportParams,
  sanitizeShipmentTransporterParams,
} from "./shipmentQuery";

describe("shipment query sanitizers", () => {
  it("keeps shipment and report statuses as named strings", () => {
    expect(
      sanitizeShipmentListParams({
        PageNumber: 1,
        PageSize: 999,
        Status: "Dispatched",
      }),
    ).toEqual({
      PageNumber: 1,
      PageSize: 200,
      Status: "Dispatched",
    });
    expect(
      sanitizeShipmentReportParams({
        PageNumber: 1,
        PageSize: 20,
        Status: "ReturnInProgress",
      }).Status,
    ).toBe("ReturnInProgress");
  });

  it("converts only import batch status to an integer", () => {
    const result = sanitizeShipmentImportParams({
      PageNumber: 1,
      PageSize: 20,
      Status: "3",
    });

    expect(result.Status).toBe(3);
    expect(
      sanitizeShipmentImportParams({
        PageNumber: 1,
        PageSize: 20,
        Status: "Committed",
      }),
    ).not.toHaveProperty("Status");
  });

  it("honours lowercase transporter search", () => {
    expect(
      sanitizeShipmentTransporterParams({
        Search: "ignored",
        search: "Fast Logistics",
      }),
    ).toEqual({ search: "Fast Logistics" });
  });

  it("honours camelCase dashboard asOfDate", () => {
    expect(
      sanitizeShipmentDashboardParams({
        AsOfDate: "ignored",
        asOfDate: "2026-07-30",
      }),
    ).toEqual({ asOfDate: "2026-07-30" });
  });

  it("preserves false packing flags with PascalCase names", () => {
    expect(
      sanitizeShipmentPackingParams({
        AllowMixedPackages: false,
        IncludeLoosePackage: true,
      }),
    ).toEqual({
      AllowMixedPackages: false,
      IncludeLoosePackage: true,
    });
  });
});

