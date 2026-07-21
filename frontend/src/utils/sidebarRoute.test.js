import { describe, expect, it } from "vitest";

import {
  findLongestSidebarRouteMatch,
  markActiveSidebarItems,
} from "./sidebarRoute";

const menu = [
  {
    id: "reports",
    children: [
      { id: "all-reports", route: "/reports", children: [] },
      { id: "sales-reports", route: "/reports/sales", children: [] },
    ],
  },
  { id: "sales-invoices", route: "/sales/invoices", children: [] },
  { id: "purchase-bills", route: "/purchase/bills", children: [] },
];

const getDirectlyActiveIds = (items) => {
  return items.flatMap((item) => [
    ...(item.isActive ? [item.id] : []),
    ...getDirectlyActiveIds(item.children),
  ]);
};

describe("sidebar route matching", () => {
  it.each([
    ["/reports/sales/summary", "sales-reports"],
    ["/reports", "all-reports"],
    ["/sales/invoices/12", "sales-invoices"],
    ["/purchase/bills/7", "purchase-bills"],
  ])("selects the longest parent for %s", (pathname, expectedId) => {
    expect(findLongestSidebarRouteMatch(menu, pathname)?.id).toBe(expectedId);
    expect(getDirectlyActiveIds(markActiveSidebarItems(menu, pathname))).toEqual([
      expectedId,
    ]);
  });

  it("does not activate an unrelated route", () => {
    expect(findLongestSidebarRouteMatch(menu, "/items")).toBeNull();
    expect(getDirectlyActiveIds(markActiveSidebarItems(menu, "/items"))).toEqual(
      [],
    );
  });

  it("marks only the matched item's ancestors as active parents", () => {
    const result = markActiveSidebarItems(menu, "/reports/sales/summary");

    expect(result[0].hasActiveChild).toBe(true);
    expect(result[0].isActive).toBe(false);
  });
});
