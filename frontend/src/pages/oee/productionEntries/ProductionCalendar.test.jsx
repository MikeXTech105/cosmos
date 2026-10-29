// @vitest-environment jsdom
import { cleanup, configure, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const f = vi.hoisted(() => ({ state: {}, dispatch: vi.fn(), readings: vi.fn(), acknowledgements: vi.fn() }));
vi.mock("react-redux", () => ({ useDispatch: () => f.dispatch, useSelector: selector => selector(f.state) }));
vi.mock("../useOeeCapabilities", () => ({ default: () => ({ canView: true, canCreate: false, canUpdate: false }) }));
vi.mock("../../../hooks/useCreatePermission", () => ({ default: () => false }));
vi.mock("../../../utils/userScope", () => ({ getUserScope: () => "oee-calendar-test" }));
vi.mock("../../../utils/submissionCalendar", async original => ({ ...(await original()), submissionToday: () => "2026-10-29" }));
vi.mock("../../../services/oee/oeeProductionEntryService", () => ({ oeeProductionEntryService: { getProductionEntries: f.readings } }));
vi.mock("../../../services/oee/oeeDayAcknowledgementService", () => ({ oeeDayAcknowledgementService: { list: f.acknowledgements } }));
vi.mock("../../../services/oee/oeeMachineService", () => ({ oeeMachineService: { getMachines: async () => ({ data: { items: [], totalPages: 1 } }) } }));
vi.mock("../../../services/oee/oeeMouldService", () => ({ oeeMouldService: { getMoulds: async () => ({ data: { items: [], totalPages: 1 } }) } }));
vi.mock("../../../services/oee/oeeDowntimeReasonService", () => ({ oeeDowntimeReasonService: { getDowntimeReasons: async () => ({ data: { items: [], totalPages: 1 } }) } }));
vi.mock("./ProductionHistoryByDate", () => ({ default: () => null }));
vi.mock("./OeeStoppedDayPanel", () => ({ default: ({ onSaved }) => <button onClick={onSaved}>Stopped-day save completed</button> }));
vi.mock("../../../components/common/AppLookup", () => ({ default: () => null }));
import OeeProductionEntriesPage from "./OeeProductionEntriesPage";
configure({ asyncUtilTimeout: 5000 });

const page = items => ({ data: { items, totalCount: items.length, totalPages: 1, pageNumber: 1, pageSize: 200 } });
const mount = () => render(<MemoryRouter><OeeProductionEntriesPage /></MemoryRouter>);
const dayName = (day, status) => `${new Date(`2026-10-${day}T12:00:00Z`).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}: ${status}`;

beforeEach(() => {
  f.dispatch.mockReset().mockImplementation(() => Promise.resolve({}));
  f.readings.mockReset().mockResolvedValue(page([{ id: 1, machineId: 7, productionDate: "2026-10-01" }]));
  f.acknowledgements.mockReset().mockResolvedValue(page([
    { id: 2, machineId: 7, productionDate: "2026-10-02", state: "NotRun" },
    { id: 3, machineId: 7, productionDate: "2026-10-03", state: "Withdrawn" },
  ]));
  f.state = { oeeProductionEntries: { filters: { FromDate: "2026-10-01", ToDate: "2026-10-31", MachineId: "7", MouldId: "8", DowntimeReasonId: "9" }, pageNumber: 1, pageSize: 20, bulkSaving: false } };
});
afterEach(cleanup);

describe("OEE submission calendar integration", () => {
  it("counts readings and active stopped-day updates while excluding withdrawn notes", async () => {
    mount();
    const stoppedDay = await screen.findByRole("button", { name: dayName("02", "1 machine update") });
    expect(screen.getByRole("button", { name: dayName("01", "1 machine update") })).toBeTruthy();
    expect(screen.getByRole("button", { name: dayName("03", "No entry") })).toBeTruthy();
    expect(f.acknowledgements.mock.calls[0][0]).toEqual({ FromDate: "2026-10-01", ToDate: "2026-10-31", MachineId: "7", PageNumber: 1, PageSize: 200 });
    expect(f.readings.mock.calls.some(([params]) => params.MachineId === "7" && !params.MouldId && !params.DowntimeReasonId)).toBe(true);
    fireEvent.click(stoppedDay);
    expect(f.dispatch).toHaveBeenCalledWith({ type: "oeeProductionEntries/setOeeProductionEntryFilters", payload: { FromDate: "2026-10-02", ToDate: "2026-10-02" } });
  });

  it("withholds empty-date claims when stopped-day evidence fails and refreshes both sources after a saved note", async () => {
    f.acknowledgements.mockRejectedValueOnce(new Error("Stopped-day month unavailable"));
    mount();
    await screen.findByText("Stopped-day month unavailable");
    expect(screen.getByRole("button", { name: dayName("02", "Not checked") })).toBeTruthy();
    expect(screen.queryByRole("button", { name: dayName("02", "No entry") })).toBeNull();
    const priorReadCount = f.readings.mock.calls.length;
    fireEvent.click(screen.getByRole("button", { name: "Stopped-day save completed" }));
    await screen.findByRole("button", { name: dayName("02", "1 machine update") });
    await waitFor(() => expect(f.readings.mock.calls.length).toBeGreaterThan(priorReadCount));
    expect(f.acknowledgements).toHaveBeenCalledTimes(2);
  });
});
