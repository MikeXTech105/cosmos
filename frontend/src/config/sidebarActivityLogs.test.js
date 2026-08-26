import { describe, expect, it } from "vitest";

import {
  enabledModules,
  getEnabledSidebarModules,
  sidebarModules,
} from "./sidebar";

describe("Activity Logs sidebar registration", () => {
  it("registers the enabled read-only utility under System", () => {
    expect(enabledModules).toContain("activityLogs");
    expect(sidebarModules.activityLogs).toMatchObject({
      categoryId: "system",
      icon: "activity",
      id: "activityLogs",
      label: "Activity Logs",
      route: "/activity-logs",
      sortOrder: 30,
    });
    expect(getEnabledSidebarModules()).toContainEqual(
      sidebarModules.activityLogs,
    );
  });
});
