// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LeaveBalanceResults, PayslipResults } from "./HrResults";
import { formatHrCurrency } from "./hrHelpers";

describe("operator HR results", () => {
  it("shows entitlement, used and remaining without a raw payload", () => {
    const html = renderToStaticMarkup(<LeaveBalanceResults balance={[{ id: "9007199254740993", leaveName: "Casual leave", openingBalance: "12.50", usedBalance: "2.25", remainingBalance: "10.25" }]} />);
    expect(html).toContain("Casual leave"); expect(html).toContain("12.50"); expect(html).toContain("2.25"); expect(html).toContain("10.25"); expect(html).not.toContain("<pre"); expect(html).not.toContain("9007199254740993");
  });
  it("renders an approved payslip and preserves large exact amounts", () => {
    const html = renderToStaticMarkup(<PayslipResults payslip={{ employeeName: "Employee Example", employeeCode: "E-01", payrollMonth: 10, payrollYear: 2026, payableDays: "30", grossSalary: "90071992547409.91", totalDeduction: "0.01", netSalary: "90071992547409.90", status: 3 }} />);
    expect(html).toContain("Employee Example"); expect(html).toContain("10/2026"); expect(html).toContain("Approved payroll"); expect(html).toContain(".91"); expect(html).toContain(".90"); expect(html).toContain("Print / Save PDF");
    expect(formatHrCurrency("90071992547409.91")).toBe("₹9,00,71,99,25,47,409.91");
    expect(formatHrCurrency(null)).toBe("—");
  });
});
