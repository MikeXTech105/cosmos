import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import useCapabilities from "../../../hooks/useCapabilities";
import ConfigurationPage from "./ConfigurationPage";
import ItemProductionConfiguration from "./ItemProductionConfiguration";
import PackagingConversionPanel from "./PackagingConversionPanel";

vi.mock("../../../hooks/useCapabilities", () => ({ default: vi.fn() }));
afterEach(() => vi.unstubAllGlobals());
describe("configuration access and locale states", () => {
  it("blocks master configuration and packaging conversion without view permission", () => {
    useCapabilities.mockReturnValue({ canView: false });
    const master = renderToStaticMarkup(<ConfigurationPage />);
    expect(master).toContain('role="alert"');
    expect(master).not.toContain('role="tablist"');
    expect(master).not.toContain('data-app-button');
    expect(renderToStaticMarkup(<PackagingConversionPanel profileId="12" />)).toBe("");
  });
  it("keeps a view-only item configuration read-only and does not expose mutation controls", () => {
    useCapabilities.mockReturnValue({ canView: true, canCreate: false, canUpdate: false, canApprove: false });
    const html = renderToStaticMarkup(<ItemProductionConfiguration itemId="12" />);
    expect(html).toContain("Production routing");
    expect(html).toContain("Loading item configuration");
    expect(html).not.toContain("Add routing revision");
    expect(html).not.toContain("Add eligibility");
    expect(html).not.toContain("Close effectivity");
  });
  it("renders actual local language copy without hiding the saved-item requirement", () => {
    vi.stubGlobal("localStorage", { getItem: () => "hi-en" });
    useCapabilities.mockReturnValue({ canView: true });
    const html = renderToStaticMarkup(<ItemProductionConfiguration />);
    expect(html).toContain("item pehle save karein");
    expect(html).not.toContain("Add routing revision");
  });
});
