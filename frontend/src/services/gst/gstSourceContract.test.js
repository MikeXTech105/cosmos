import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { GST_PAGES, GST_REGISTRATION_SORTS, GST_LOG_SORTS } from "../../utils/gstCompliance";
import { getEnabledSidebarModules } from "../../config/sidebar";
import { getDefaultAuthorizedRoute } from "../../utils/authorizedRoute";

const backend = path => readFileSync(new URL(`../../../../backend/${path}`, import.meta.url), "utf8");

describe("GST integration source contracts", () => {
  it("matches every navigation grant and route to the existing SQL permission seeds", () => {
    const sql = [
      backend("database/003_gst_integration_module.sql"),
      backend("database/migrations/20261015_hsn_gst_phase1_foundation.sql"),
    ].join("\n");
    const modules = getEnabledSidebarModules();
    for (const page of GST_PAGES) {
      expect(sql).toContain(`N'${page.pageName}'`);
      expect(sql).toContain(`N'${page.route}'`);
      expect(modules.find(module => module.route === page.route)?.permissionPageName).toBe(page.pageName);
    }
  });
  it("offers only sort columns that the stored procedures actually implement", () => {
    const sql = backend("database/003_gst_integration_module.sql");
    for (const [procedure, columns] of [["sp_GstRegistration_GetList", GST_REGISTRATION_SORTS], ["sp_GstApiLog_GetList", GST_LOG_SORTS]]) {
      const start = sql.indexOf(`CREATE OR ALTER PROCEDURE dbo.${procedure}`);
      expect(start).toBeGreaterThanOrEqual(0);
      const section = sql.slice(start).split(/\r?\nGO/)[0];
      for (const column of columns) expect(section).toContain(`@SortBy = N'${column}'`);
    }
  });
  it("preserves the existing default landing page when GST permissions are added", () => {
    expect(getDefaultAuthorizedRoute({ pages: [{ pageName: "Dashboard", route: "/dashboard", canView: true }, { pageName: "GST.Configuration", route: "/gst/configuration", canView: true }], roles: [], user: {} })).toBe("/dashboard");
  });
  it.each([
    ["EInvoices", "EInvoice"], ["EWayBills", "EWayBill"], ["GstRegistrations", "Registration"], ["GstApiLogs", "Logs"],
  ])("keeps %s authorization tied to its GST permission", (controller, permission) => {
    const source = backend(`src/Cosmos.API/Controllers/${controller}Controller.cs`);
    expect(source).toContain("[Authorize]");
    expect(source).toContain(`GstPermissions.${permission}, PermissionAction.View`);
    if (controller === "EInvoices" || controller === "EWayBills") expect(source).toContain(`GstPermissions.${permission}, PermissionAction.Delete`);
  });
});
