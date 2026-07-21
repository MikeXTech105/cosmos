import { describe, expect, it } from "vitest";

import {
  clampCommandHighlight,
  filterCommandItems,
} from "./searchCommand";

const items = [
  { label: "Dashboard", route: "/dashboard", modulePath: "Home" },
  { label: "Sales report", route: "/reports/sales", modulePath: "Reports" },
  { label: "Users", route: "/users", modulePath: "Administration" },
];

describe("command search helpers", () => {
  it("searches labels, routes, and module paths", () => {
    expect(filterCommandItems(items, "reports")).toEqual([items[1]]);
    expect(filterCommandItems(items, "/users")).toEqual([items[2]]);
  });

  it("clamps highlight safely", () => {
    expect(clampCommandHighlight(8, 3)).toBe(2);
    expect(clampCommandHighlight(-2, 3)).toBe(0);
    expect(clampCommandHighlight(0, 0)).toBe(-1);
  });
});
