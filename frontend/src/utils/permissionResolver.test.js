import { describe, expect, it } from "vitest";

import { getDefaultAuthorizedRoute } from "./authorizedRoute";
import { getReportPermissionTarget } from "../pages/reports/reportRegistry";
import {
  canPerformAction,
  findPermissionPage,
  hasPageCapability,
  isSuperAdminAuth,
  normalizeRoute,
} from "./permissionResolver";

describe("normalizeRoute", () => {
  it.each([
    ["dashboard", "/dashboard"],
    ["/dashboard/", "/dashboard"],
    ["//hr//dashboard?tab=summary", "/hr/dashboard"],
    ["/hr/dashboard#stats", "/hr/dashboard"],
  ])("normalizes %s", (route, expected) => {
    expect(normalizeRoute(route)).toBe(expected);
  });
});

describe("report permission targets", () => {
  it.each([
    ["sales", "Reports.Sales", "/reports/sales"],
    ["purchase", "Reports.Purchase", "/reports/purchase"],
    ["inventory", "Reports.Inventory", "/reports/inventory"],
    ["party", "Reports.Parties", "/reports/party"],
    ["expense", "Reports.Expenses", "/reports/expense"],
  ])("maps %s reports to the backend page", (group, pageName, route) => {
    expect(
      getReportPermissionTarget({
        group,
        permission: "LegacyReportPermission",
        route: `${route}/detail`,
        title: "Report",
      }),
    ).toEqual({ label: "Report", pageName, route });
  });

  it("preserves an explicit Rojmel permission target", () => {
    expect(
      getReportPermissionTarget({
        group: "rojmel",
        permission: "Rojmel.Admin",
        permissionRoute: "/rojmel/admin",
        title: "Wallet balances",
      }),
    ).toEqual({
      label: "Wallet balances",
      pageName: "Rojmel.Admin",
      route: "/rojmel/admin",
    });
  });
});

describe("findPermissionPage", () => {
  const pages = [
    {
      displayName: "Dashboard",
      id: "main",
      pageName: "Dashboard",
      route: "/dashboard",
    },
    {
      displayName: "Dashboard",
      id: "hr",
      pageName: "HR.Dashboard",
      route: "/hr/dashboard",
    },
    {
      displayName: "User accounts",
      id: "users",
      pageName: "Users",
      route: "/security/users",
    },
  ];

  it("prioritizes an exact stable ID", () => {
    expect(
      findPermissionPage(pages, {
        id: "hr",
        label: "Users",
        route: "/users",
      }),
    ).toBe(pages[1]);
  });

  it("prioritizes an exact route over a label", () => {
    expect(
      findPermissionPage(pages, {
        label: "Users",
        route: "/hr/dashboard/",
      }),
    ).toBe(pages[1]);
  });

  it("fails closed when duplicate display labels are ambiguous", () => {
    expect(findPermissionPage(pages, { label: "Dashboard" })).toBeNull();
  });

  it("does not use a label to override a failed explicit route", () => {
    expect(
      findPermissionPage(pages, { label: "User accounts", route: "/missing" }),
    ).toBeNull();
  });

  it("falls back to a unique backend page name when the route does not match", () => {
    expect(
      findPermissionPage(pages, { pageName: "Users", route: "/user-list" }),
    ).toBe(pages[2]);
  });

  it("resolves an explicit backend page name without a route", () => {
    expect(findPermissionPage(pages, { pageName: "HR.Dashboard" })).toBe(
      pages[1],
    );
  });

  it("still fails closed when the backend page name is ambiguous", () => {
    const duplicateNames = [
      ...pages,
      { id: "legacy-users", pageName: "Users", route: "/legacy/users" },
    ];

    expect(
      findPermissionPage(duplicateNames, {
        pageName: "Users",
        route: "/missing",
      }),
    ).toBeNull();
  });
});

describe("capability evaluation", () => {
  it("does not infer create or delete from view", () => {
    const page = { canView: true };

    expect(hasPageCapability(page, { action: "create", resource: "users" })).toBe(false);
    expect(hasPageCapability(page, { action: "delete", resource: "users" })).toBe(false);
  });

  it("fails closed for missing and empty permission data", () => {
    expect(hasPageCapability(null, { action: "view" })).toBe(false);
    expect(hasPageCapability({}, { action: "create", resource: "users" })).toBe(false);
    expect(
      canPerformAction({
        action: "create",
        pages: [],
        resource: "users",
        target: { route: "/users" },
      }),
    ).toBe(false);
  });

  it("supports string permission arrays", () => {
    const page = { permissions: ["users.create", "users.update"] };

    expect(hasPageCapability(page, { action: "create", resource: "users" })).toBe(true);
    expect(hasPageCapability(page, { action: "update", resource: "users" })).toBe(true);
  });

  it("supports nested and top-level booleans", () => {
    expect(hasPageCapability({ permissions: { canCreate: true } }, { action: "create" })).toBe(true);
    expect(hasPageCapability({ canDelete: true }, { action: "delete" })).toBe(true);
  });

  it("fails closed for contradictory boolean permission shapes", () => {
    expect(
      hasPageCapability(
        { canDelete: true, permissions: { canDelete: false } },
        { action: "delete" },
      ),
    ).toBe(false);
  });

  it("treats edit and update as aliases", () => {
    expect(
      hasPageCapability(
        { permissions: ["users.edit"] },
        { action: "update", resource: "users" },
      ),
    ).toBe(true);
    expect(hasPageCapability({ canUpdate: true }, { action: "edit" })).toBe(true);
  });
});

describe("isSuperAdminAuth", () => {
  it.each([
    "Super Admin",
    "super_admin",
    "SUPER-ADMIN",
    "superadmin",
    "System Owner",
    "system_owner",
    "SYSTEM-OWNER",
    "systemowner",
  ])(
    "accepts exact normalized value %s",
    (role) => {
      expect(isSuperAdminAuth({ roles: [role] })).toBe(true);
    },
  );

  it.each([
    "Not Super Admin",
    "Super Admin Assistant",
    "Former Super Admin",
    "Owner Relations Manager",
    "Former System Owner",
    "Owner",
    "System Owner Assistant",
    "Admin",
  ])("rejects non-exact value %s", (role) => {
    expect(isSuperAdminAuth({ roles: [role] })).toBe(false);
  });

  it("checks user role fields and nested role collections", () => {
    expect(isSuperAdminAuth({ user: { roleName: "System Owner" } })).toBe(true);
    expect(isSuperAdminAuth({ user: { roleCode: "system_owner" } })).toBe(true);
    expect(
      isSuperAdminAuth({ user: { roles: [{ name: "System Owner" }] } }),
    ).toBe(true);
  });

  it("grants every capability to System Owner without permission pages", () => {
    for (const action of ["view", "create", "update", "delete", "export", "approve"]) {
      expect(
        canPerformAction({
          action,
          pages: [],
          roles: [{ name: "System Owner" }],
          target: { route: "/restricted" },
        }),
      ).toBe(true);
    }
  });

  it("supports an explicit backend flag", () => {
    expect(isSuperAdminAuth({ user: { isSuperAdmin: true } })).toBe(true);
  });
});

describe("getDefaultAuthorizedRoute", () => {
  const modules = [
    { id: "dashboard", label: "Dashboard", route: "/dashboard" },
    { id: "users", label: "Users", route: "/users" },
  ];

  it("returns the first authorized route", () => {
    const pages = [
      { canView: false, id: "dashboard", route: "/dashboard" },
      { canView: true, id: "users", route: "/users" },
    ];

    expect(getDefaultAuthorizedRoute({ modules, pages })).toBe("/users");
  });

  it("returns /403 when no page is accessible", () => {
    expect(getDefaultAuthorizedRoute({ modules, pages: [] })).toBe("/403");
  });

  it("falls back to a granted page no configured module covers", () => {
    const pages = [
      { canView: true, id: "data-book", route: "/data-book" },
    ];

    expect(getDefaultAuthorizedRoute({ modules, pages })).toBe("/data-book");
  });

  it("returns dashboard for Super Admin", () => {
    expect(getDefaultAuthorizedRoute({ modules, roles: ["SUPER_ADMIN"] })).toBe(
      "/dashboard",
    );
  });
});
