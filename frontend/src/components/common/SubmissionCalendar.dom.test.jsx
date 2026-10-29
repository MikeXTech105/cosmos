// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import SubmissionCalendar from "./SubmissionCalendar";
afterEach(cleanup);
const base = { month: "2026-10", today: "2026-10-03", onMonthChange: vi.fn(), onSelectDate: vi.fn() };
describe("submission calendar", () => {
  it("exposes saved, empty, current and upcoming dates and opens the selected date", () => {
    const select = vi.fn();
    render(<SubmissionCalendar {...base} onSelectDate={select} complete entries={[{ businessDate: "2026-10-01" }]} selectedDate="2026-10-01" />);
    expect(screen.getByRole("button", { name: /1 October 2026: 1 entry/ }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: /2 October 2026: No entry/ }));
    expect(select).toHaveBeenCalledWith("2026-10-02");
    expect(screen.getByRole("button", { name: /3 October 2026: Due today, today/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Sunday, 4 October 2026: Upcoming" })).toBeTruthy();
  });
  it("keeps unread dates neutral on errors and permits retry", () => {
    const retry = vi.fn();
    render(<SubmissionCalendar {...base} complete error="Records unavailable" onRetry={retry} />);
    expect(screen.getByRole("button", { name: /2 October 2026: Not checked/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /2 October 2026: No entry/ })).toBeNull();
    expect(screen.getByRole("progressbar").hasAttribute("aria-valuenow")).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Retry month" }));
    expect(retry).toHaveBeenCalledOnce();
  });
  it("disables date changes while entries are being reviewed and navigates year boundaries", () => {
    const change = vi.fn();
    render(<SubmissionCalendar {...base} month="2026-12" disabled onMonthChange={change} />);
    expect(screen.getByRole("button", { name: /^Tuesday, 1 December 2026:/ }).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Next month" }));
    expect(change).toHaveBeenCalledWith("2027-01");
  });
});
