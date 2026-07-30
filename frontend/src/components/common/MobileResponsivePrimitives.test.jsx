import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import MobileFilterSheet from "./MobileFilterSheet";
import ResponsiveTableRegion from "./ResponsiveTableRegion";

describe("mobile responsive primitives", () => {
  it("renders a filter trigger with the active count and keeps desktop filters", () => {
    const markup = renderToStaticMarkup(
      <MobileFilterSheet activeCount={2}>
        <label>
          Search
          <input name="search" />
        </label>
      </MobileFilterSheet>,
    );

    expect(markup).toContain("Filters (2)");
    expect(markup).toContain("name=\"search\"");
    expect(markup).toContain("hidden md:block");
  });

  it("derives mobile record cards while preserving the desktop table", () => {
    const markup = renderToStaticMarkup(
      <ResponsiveTableRegion
        mobileConfig={{
          fields: ["Stock"],
          serial: "#",
          status: "Status",
          title: "Item",
        }}
      >
        <table>
          <thead>
            <tr>
              <th scope="col" aria-label="Row number"><span aria-hidden="true">#</span></th>
              <th scope="col">Item</th>
              <th scope="col">Stock</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>4</td>
              <td>Steel Clip</td>
              <td>12 pcs</td>
              <td>Active</td>
            </tr>
          </tbody>
        </table>
      </ResponsiveTableRegion>,
    );

    expect(markup).toContain("#4");
    expect(markup).toContain("Steel Clip");
    expect(markup).toContain("12 pcs");
    expect(markup).toContain("grid gap-3 md:hidden");
    expect(markup).toContain("hidden overflow-x-auto md:block");
    expect(markup).toContain('<table aria-label="Records">');
  });
});
