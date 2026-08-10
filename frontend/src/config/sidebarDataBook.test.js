import { describe, expect, it } from "vitest";

import {
  enabledModules,
  getEnabledSidebarModules,
  sidebarModules,
} from "./sidebar";

describe("Data Book sidebar placement", () => {
  it("keeps Data Book enabled as a top-level master module", () => {
    expect(enabledModules).toContain("dataBook");
    expect(sidebarModules.dataBook).toMatchObject({
      id: "dataBook",
      label: "Data Book",
      route: "/data-book",
      sortOrder: 45,
    });
    expect(sidebarModules.dataBook).not.toHaveProperty("categoryId");
    expect(getEnabledSidebarModules()).toContainEqual(sidebarModules.dataBook);
  });
});
