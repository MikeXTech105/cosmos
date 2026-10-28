import { describe, expect, it } from "vitest";

import { buildMenuTree } from "./useSidebar";

// Shape mirrors AuthLoginPagePermissionDto returned by /api/auth/login.
const page = (overrides) => ({
  canApprove: false,
  canCreate: false,
  canDelete: false,
  canEdit: false,
  canExport: false,
  canView: true,
  displayName: "Page",
  icon: "app",
  pageId: 1,
  pageName: "Page",
  parentPageId: null,
  route: "/page",
  sortOrder: 0,
  ...overrides,
});

const flattenRoutes = (items) => {
  return items.flatMap((item) => [
    ...(item.route ? [item.route] : []),
    ...flattenRoutes(item.children ?? []),
  ]);
};

const flattenLabels = (items) => {
  return items.flatMap((item) => [
    item.label,
    ...flattenLabels(item.children ?? []),
  ]);
};

describe("buildMenuTree", () => {
  it("shows the daily production shortcut with the existing order read permission and its own identity", () => {
    const granted = page({ pageId: 990, pageName: "Manufacturing.Orders", displayName: "Production Orders", route: "/manufacturing/orders" });
    const production = buildMenuTree([granted], false).find(item => item.label === "Production");
    const desk = production.children.find(item => item.route === "/manufacturing/daily");
    expect(desk.label).toBe("Daily Production");
    expect(desk.id).toBe("productionDaily");
    const board = production.children.find(item => item.route === "/manufacturing/board");
    expect(board.label).toBe("Kanban Board");
    expect(board.id).toBe("productionKanban");
    expect(production.children.map((item) => [item.id, item.label, item.route])).toEqual([
      ["productionDaily", "Daily Production", "/manufacturing/daily"],
      ["productionKanban", "Kanban Board", "/manufacturing/board"],
      ["productionOrders", "Production Orders", "/manufacturing/orders"],
      ["productionPlanning", "Production Planning", "/manufacturing/planning"],
      ["productionImports", "Import & Reconciliation", "/manufacturing/imports"],
    ]);
    expect(new Set(production.children.map((item) => item.id)).size).toBe(5);
    expect(flattenRoutes(buildMenuTree([{ ...granted, canView: false }], false))).not.toContain("/manufacturing/daily");
    expect(flattenRoutes(buildMenuTree([{ ...granted, canView: false }], false))).not.toContain("/manufacturing/board");
  });
  it("groups Deep Dive aliases without granting unrelated financial or GST pages", () => {
    const granted = page({ pageId: 901, pageName: "OEE.ProductionEntries", route: "/oee/production-entries" });
    const tree = buildMenuTree([granted], false);
    const group = tree.find(item => item.label === "Deep Dive");
    expect(flattenRoutes(group.children)).toEqual([
      "/deep-dive-analytics/executive-command-center",
      "/deep-dive-analytics/oee-telemetry",
      "/deep-dive-analytics/cross-module-intelligence",
    ]);
    expect(new Set(group.children.map(item => item.id)).size).toBe(3);
    expect(tree.find(item => item.label === "OEE")).toBeDefined();
    expect(buildMenuTree([], false).some(item => item.label === "Deep Dive")).toBe(false);
  });
  it("exposes Production Insights only with production entry read access, with a distinct label and id", () => {
    const granted = page({
      pageId: 901,
      pageName: "OEE.ProductionEntries",
      displayName: "Production Entries",
      route: "/oee/production-entries",
    });
    const tree = buildMenuTree([granted], false);
    expect(flattenRoutes(tree)).toContain("/oee/insights");
    expect(flattenRoutes(tree)).toContain("/oee/production-entries");
    expect(flattenLabels(tree)).toContain("Production Insights");
    const children = tree.find((item) => item.label === "OEE").children;
    expect(new Set(children.map((item) => item.id)).size).toBe(children.length);
    expect(
      flattenRoutes(buildMenuTree([{ ...granted, canView: false }], false)),
    ).not.toContain("/oee/insights");
  });
  it("does not expose reading-level insights through dashboard-only access", () => {
    const tree = buildMenuTree(
      [
        page({
          pageId: 900,
          pageName: "OEE.Dashboard",
          displayName: "Dashboard",
          route: "/oee/dashboard",
        }),
      ],
      false,
    );
    expect(flattenRoutes(tree)).toContain("/oee/dashboard");
    expect(flattenRoutes(tree)).not.toContain("/oee/insights");
  });
  it("shows exactly the granted pages and nothing else", () => {
    const tree = buildMenuTree(
      [
        page({
          displayName: "Users",
          pageId: 1,
          pageName: "Users",
          route: "/users",
        }),
        page({
          displayName: "Items",
          pageId: 2,
          pageName: "Items",
          route: "/items",
        }),
      ],
      false,
    );
    const routes = flattenRoutes(tree);

    expect(routes).toContain("/users");
    expect(routes).toContain("/items");
    expect(routes).not.toContain("/roles");
    expect(routes).not.toContain("/party");
  });

  it("omits a page the role cannot view", () => {
    const tree = buildMenuTree(
      [
        page({ canView: true, pageId: 1, pageName: "Users", route: "/users" }),
        page({ canView: false, pageId: 2, pageName: "Roles", route: "/roles" }),
      ],
      false,
    );

    expect(flattenRoutes(tree)).toEqual(["/users"]);
  });

  it("still shows a granted page when the backend route differs from the app route", () => {
    const tree = buildMenuTree(
      [
        page({
          displayName: "Wallets",
          pageId: 9,
          pageName: "Rojmel.Wallets",
          route: "/rojmel/wallet-list",
        }),
      ],
      false,
    );

    expect(flattenRoutes(tree)).toContain("/rojmel/wallets");
  });

  it("shows a granted page that no configured module covers", () => {
    const tree = buildMenuTree(
      [
        page({
          displayName: "Custom Register",
          pageId: 77,
          pageName: "Custom.Register",
          route: "/custom-register",
        }),
      ],
      false,
    );

    expect(flattenRoutes(tree)).toContain("/custom-register");
    expect(flattenLabels(tree)).toContain("Custom Register");
  });

  it("keeps a child visible when its parent page was not granted", () => {
    const tree = buildMenuTree(
      [
        page({
          displayName: "Child Register",
          pageId: 120,
          pageName: "Custom.Child",
          parentPageId: 119,
          route: "/custom-child",
        }),
      ],
      false,
    );

    expect(flattenRoutes(tree)).toContain("/custom-child");
  });

  it("groups unmatched pages under their granted parent", () => {
    const tree = buildMenuTree(
      [
        page({
          displayName: "Custom",
          pageId: 200,
          pageName: "Custom",
          route: "",
        }),
        page({
          displayName: "Child A",
          pageId: 201,
          pageName: "Custom.A",
          parentPageId: 200,
          route: "/custom-a",
        }),
      ],
      false,
    );
    const group = tree.find((item) => item.label === "Custom");

    expect(group).toBeDefined();
    expect(flattenRoutes(group.children)).toEqual(["/custom-a"]);
  });

  it("does not add parameterised detail routes to the menu", () => {
    const tree = buildMenuTree(
      [
        page({
          displayName: "Invoice Detail",
          pageId: 300,
          pageName: "Sale Invoice Detail",
          route: "/sales/invoices/:id",
        }),
      ],
      false,
    );

    expect(flattenRoutes(tree)).toEqual([]);
  });

  it("uses the human display name rather than the internal page name", () => {
    const tree = buildMenuTree(
      [
        page({
          displayName: "Dashboard",
          pageId: 5,
          pageName: "Rojmel.Dashboard",
          route: "/rojmel/dashboard",
        }),
      ],
      false,
    );

    expect(flattenLabels(tree)).toContain("Dashboard");
    expect(flattenLabels(tree)).not.toContain("Rojmel.Dashboard");
  });
});
