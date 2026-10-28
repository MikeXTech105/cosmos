import { describe, expect, it } from "vitest";
import { allowedSavedDestinations, allowedWorkspaces } from "./workspaces";

describe("permission-filtered workspaces", () => {
  it("offers only actual granted menu destinations and removes revoked saved links", () => {
    const items = [{ route: "/manufacturing/daily", label: "Daily Production" }, { route: "/manufacturing/orders", label: "Orders" }];
    const spaces = allowedWorkspaces(items);
    expect(spaces.map((space) => space.id)).toEqual(["production"]);
    expect(spaces[0].tasks.map((task) => task.route)).toEqual(["/manufacturing/daily", "/manufacturing/orders"]);
    expect(allowedSavedDestinations(["/hr/payroll", "/manufacturing/daily"], items)).toEqual([items[0]]);
  });
});
