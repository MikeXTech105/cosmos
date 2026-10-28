// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CompanyDraftScopeContext } from "../../../hooks/companyDraftScopeContext";
import useCapabilities from "../../../hooks/useCapabilities";
import { productionConfigurationService as service } from "../../../services/manufacturing/productionConfigurationService";
import ConfigurationLookup, { ConfigurationReferenceLabel } from "./ConfigurationLookup";
import { useConfigurationLookups } from "./configurationHooks";
import { lookupOptions, validateRoutingReferences } from "./configurationHelpers";

vi.mock("../../../hooks/useCapabilities", () => ({ default: vi.fn() }));
vi.mock("../../../services/manufacturing/productionConfigurationService", () => ({ productionConfigurationService: { listMasters: vi.fn(), master: vi.fn(), machine: vi.fn(), mould: vi.fn(), hrShift: vi.fn(), unit: vi.fn() } }));
beforeEach(() => { vi.clearAllMocks(); useCapabilities.mockReturnValue({ canView: true }); service.listMasters.mockResolvedValue({ data: { items: [], totalCount: 0 } }); });
afterEach(cleanup);

describe("configuration remote lookup boundary", () => {
  it("loads one bounded page then validates a selected remote operation without losing its rate", async () => {
    const rows = Array.from({ length: 40 }, (_, i) => ({ id: String(i + 1), name: `Operation ${i + 1}`, rateBasis: 2, defaultRate: "0.123456", isActive: true }));
    service.listMasters.mockImplementation(async kind => ({ data: { items: kind === "operations" ? rows : [{ id: "70", name: "Centre", isActive: true }], totalCount: 260, totalPages: 7 } }));
    const { result } = renderHook(() => useConfigurationLookups({ masters: true }));
    await waitFor(() => expect(result.current.operations).toHaveLength(40));
    expect(service.listMasters).toHaveBeenCalledTimes(2);
    for (const call of service.listMasters.mock.calls) expect(call[1]).toEqual({ PageNumber: 1, PageSize: 40 });
    expect(lookupOptions(result.current.operations)[0]).toMatchObject({ id: "1", rateBasis: 2, defaultRate: "0.123456" });
    act(() => result.current.remember("operations", { id: "201", name: "Remote operation", rateBasis: 1, defaultRate: "9.000001", isActive: true }));
    expect(validateRoutingReferences({ steps: [{ operationId: "201", workCentreId: "70" }] }, result.current)).toBe("");
  });

  it("masks selected references immediately on account/company scope change", async () => {
    let scope = "account-a:company-a";
    const wrapper = ({ children }) => <CompanyDraftScopeContext.Provider value={scope}>{children}</CompanyDraftScopeContext.Provider>;
    const { result, rerender } = renderHook(() => useConfigurationLookups(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.remember("operations", { id: "901", name: "Company A secret" }));
    expect(result.current.operations).toHaveLength(1);
    scope = "account-b:company-b"; rerender();
    expect(result.current.operations).toEqual([]);
  });

  it("retains exact inactive by-ID history but never offers it as a new active selection", async () => {
    service.master.mockResolvedValue({ data: { id: "9007199254740993", name: "Historic operation", isActive: false } });
    const change = vi.fn();
    render(<ConfigurationLookup kind="operations" label="Operation" value="9007199254740993" onChange={change} />);
    await waitFor(() => expect(screen.getByRole("combobox").value).toBe("Historic operation"));
    expect(service.master.mock.calls[0][1]).toBe("9007199254740993");
    expect(change).not.toHaveBeenCalled();
  });

  it("does not hydrate or search forbidden machine/unit references", async () => {
    const view = render(<ConfigurationLookup kind="machines" label="Machine" value="99" lookupContext={{ canReadMachines: false }} />);
    expect(screen.getByRole("combobox").disabled).toBe(true);
    fireEvent.focus(screen.getByRole("combobox"));
    await act(async () => {});
    expect(service.machine).not.toHaveBeenCalled();
    view.rerender(<ConfigurationReferenceLabel kind="units" id="88" lookupContext={{ units: [], canReadUnits: false }} />);
    expect(screen.getByText("Restricted resource")).toBeTruthy();
    expect(service.unit).not.toHaveBeenCalled();
  });
});
