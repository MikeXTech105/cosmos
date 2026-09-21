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
  it("shows exactly the granted pages and nothing else", () => {
    const tree = buildMenuTree(
      [
        page({ displayName: "Users", pageId: 1, pageName: "Users", route: "/users" }),
        page({ displayName: "Items", pageId: 2, pageName: "Items", route: "/items" }),
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
