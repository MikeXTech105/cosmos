import { describe, expect, it } from "vitest";
import { workReturnPath } from "./workReturnPath";

describe("setup return context", () => {
  const auth = { roles: [], pages: [{ route: "/manufacturing/orders", pageName: "Manufacturing.Orders", canView: true }] };
  it("retains authorized work and query context while rejecting external and revoked destinations", () => {
    expect(workReturnPath("/manufacturing/orders?status=2&pageNumber=3", auth)).toBe("/manufacturing/orders?status=2&pageNumber=3");
    expect(workReturnPath("//external.example/", auth)).toBeNull();
    expect(workReturnPath("/hr/payroll", auth)).toBeNull();
    expect(workReturnPath("/\\external.example/", auth)).toBeNull();
  });
});
