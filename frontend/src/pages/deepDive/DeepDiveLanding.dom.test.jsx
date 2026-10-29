// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ auth: {} }));
vi.mock("react-redux", () => ({ useSelector: selector => selector(state) }));

import DeepDiveLanding from "./DeepDiveLanding";
import { getAvailableDeepDivePages } from "./deepDiveConfig";
import { sourcePermissions } from "./deepDiveData";

function Destination() {
  const location = useLocation();
  return <output>{location.pathname}{location.search}</output>;
}

afterEach(cleanup);

describe("Deep Dive landing navigation", () => {
  it.each([
    ["OEE.ProductionEntries", "/oee/production-entries", "executive-command-center"],
    ["GST.Configuration", "/gst/configuration", "gst-intelligence"],
    ["GST.Registration", "/gst/registrations", "gst-intelligence"],
  ])("opens the first authorized tab for %s and retains the analysis period", async (pageName, route, slug) => {
    state.auth = { pages: [{ pageId: 1, pageName, route, canView: true }] };
    render(<MemoryRouter initialEntries={["/deep-dive-analytics?from=2026-10-01&to=2026-10-29&q=press"]}>
      <Routes>
        <Route path="/deep-dive-analytics" element={<DeepDiveLanding />} />
        <Route path="*" element={<Destination />} />
      </Routes>
    </MemoryRouter>);
    expect((await screen.findByRole("status")).textContent).toBe(`/deep-dive-analytics/${slug}?from=2026-10-01&to=2026-10-29&q=press`);
  });

  it("keeps restricted financial and GST tabs out of an OEE user's navigation", () => {
    const access = sourcePermissions({ pages: [{ pageName: "OEE.ProductionEntries", route: "/oee/production-entries", canView: true }] });
    expect(getAvailableDeepDivePages(access).map(page => page.id)).toEqual(["executive", "oee", "cross"]);
  });

  it("opens the Command Center for superadmins and rejects users without source access", async () => {
    state.auth = { user: { isSuperAdmin: true } };
    expect(getAvailableDeepDivePages(sourcePermissions(state.auth))[0].id).toBe("executive");
    state.auth = { pages: [] };
    render(<MemoryRouter initialEntries={["/deep-dive-analytics?from=2026-10-01"]}>
      <Routes>
        <Route path="/deep-dive-analytics" element={<DeepDiveLanding />} />
        <Route path="*" element={<Destination />} />
      </Routes>
    </MemoryRouter>);
    expect((await screen.findByRole("status")).textContent).toBe("/403");
  });
});
