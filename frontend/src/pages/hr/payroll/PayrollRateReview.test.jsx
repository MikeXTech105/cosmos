// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import PayrollRateReview from "./PayrollRateReview";
afterEach(cleanup);
const employees = [{ employeeId: "9007199254740993", employeeName: "Asha", requiresRateSelection: true, employmentDays: 11 }, { employeeId: "7", employeeName: "Hari", requiresRateSelection: true, employmentDays: 30 }];
const rates = [{ employeeId: employees[0].employeeId, salaryAssignmentId: "9007199254740995", salaryStructureId: "3", structureName: "October rate", effectiveDate: "2026-10-12", rowVersion: "AAAAAAAAAAE=", monthlyEarnings: "90071992547409.91", fixedDeductions: "100.01" }];
describe("explicit payroll rate review", () => {
  it("makes no automatic selection and retains unrelated employee reviews", () => {
    const onChange = vi.fn(), other = { employeeId: "7", salaryAssignmentId: "8", rowVersion: "v", reviewed: true };
    const view = render(<PayrollRateReview employees={employees} rates={rates} selections={[other]} onChange={onChange} />);
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Monthly rate for Asha").value).toBe("");
    fireEvent.change(screen.getByLabelText("Monthly rate for Asha"), { target: { value: "9007199254740995" } });
    const selected = onChange.mock.calls[0][0];
    expect(selected).toEqual([other, { employeeId: "9007199254740993", salaryAssignmentId: "9007199254740995", rowVersion: "AAAAAAAAAAE=", reviewed: false }]);
    view.rerender(<PayrollRateReview employees={employees} rates={rates} selections={selected} onChange={onChange} />);
    expect(screen.getByText("₹9,00,71,99,25,47,409.91")).toBeTruthy();
    expect(screen.getByText("₹100.01")).toBeTruthy();
    fireEvent.click(screen.getByRole("checkbox", { name: /reviewed.*Asha/ }));
    expect(onChange.mock.lastCall[0].find(row => row.employeeId === employees[0].employeeId).reviewed).toBe(true);
    expect(onChange.mock.lastCall[0][0]).toEqual(other);
  });
  it("masks stale reviewed versions and disables all inputs while busy", () => {
    render(<PayrollRateReview employees={[employees[0]]} rates={rates} selections={[{ employeeId: employees[0].employeeId, salaryAssignmentId: rates[0].salaryAssignmentId, rowVersion: "older", reviewed: true }]} onChange={vi.fn()} disabled />);
    expect(screen.getByRole("combobox").value).toBe("");
    expect(screen.getByRole("combobox").closest("fieldset").disabled).toBe(true);
    expect(screen.getByRole("alert").textContent).toMatch(/changed or is unavailable/);
    expect(screen.queryByRole("checkbox")).toBeNull();
  });
});
