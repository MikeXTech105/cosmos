import AppButton from "../../components/common/AppButton";
import { formatHrCurrency } from "./hrHelpers";

const getLeaveBalanceRows = (value) => Array.isArray(value)
  ? value : Array.isArray(value?.items) ? value.items : [];

export const LeaveBalanceResults = ({ balance }) => {
  const rows = getLeaveBalanceRows(balance);
  if (!balance) return <p className="mt-4 text-sm text-slate-500">Select an employee and load their balance.</p>;
  if (!rows.length) return <p className="mt-4 text-sm text-slate-500">No leave balances are set up for this employee.</p>;
  return <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm">
    <caption className="sr-only">Employee leave balances in days</caption>
    <thead><tr>{["Leave type", "Entitlement", "Used", "Remaining"].map((label) => <th className="p-2" key={label}>{label}</th>)}</tr></thead>
    <tbody>{rows.map((row) => <tr className="border-t border-slate-100" key={String(row.id ?? row.leaveTypeId)}>
      <th scope="row" className="p-2 font-medium">{row.leaveName || row.leaveCode || "Leave"}</th>
      <td className="p-2 tabular-nums">{String(row.openingBalance ?? "—")}</td>
      <td className="p-2 tabular-nums">{String(row.usedBalance ?? "—")}</td>
      <td className="p-2 font-semibold tabular-nums">{String(row.remainingBalance ?? "—")}</td>
    </tr>)}</tbody>
  </table></div>;
};

export const PayslipResults = ({ payslip }) => {
  if (!payslip) return <p className="mt-3 text-sm text-slate-500">Select an employee and period, then load a payslip.</p>;
  const print = () => {
    const target = window.open("", "_blank", "width=800,height=900");
    if (!target) return;
    // Copy text through DOM nodes, never interpolate employee data into HTML.
    target.document.title = "Employee payslip";
    const heading = target.document.createElement("h1");
    heading.textContent = "Payslip";
    target.document.body.append(heading);
    for (const [label, value] of [
      ["Employee", payslip.employeeName], ["Employee code", payslip.employeeCode],
      ["Period", `${payslip.payrollMonth}/${payslip.payrollYear}`],
      ["Payable days", payslip.payableDays], ["Gross earnings", formatHrCurrency(payslip.grossSalary)],
      ["Deductions", formatHrCurrency(payslip.totalDeduction)], ["Net pay", formatHrCurrency(payslip.netSalary)],
      ["Status", Number(payslip.status) === 3 ? "Approved" : "Processed — awaiting approval"],
    ]) {
      const line = target.document.createElement("p");
      line.textContent = `${label}: ${value ?? "—"}`;
      target.document.body.append(line);
    }
    target.document.close();
    target.focus();
    target.print();
  };
  return <article className="mt-3 space-y-4 rounded-xl border border-slate-200 p-4" aria-label="Employee payslip">
    <div><p className="font-semibold text-slate-900">{payslip.employeeName}</p><p className="text-sm text-slate-500">{payslip.employeeCode} · {payslip.payrollMonth}/{payslip.payrollYear}</p></div>
    <dl className="space-y-2 text-sm">{[
      ["Payable days", String(payslip.payableDays ?? "—")],
      ["Gross earnings", formatHrCurrency(payslip.grossSalary)],
      ["Deductions", formatHrCurrency(payslip.totalDeduction)],
      ["Net pay", formatHrCurrency(payslip.netSalary)],
    ].map(([label, value]) => <div className="flex justify-between gap-4" key={label}><dt>{label}</dt><dd className="font-semibold tabular-nums">{value}</dd></div>)}</dl>
    <p className="text-xs text-slate-500">{Number(payslip.status) === 3 ? "Approved payroll" : "Processed payroll — awaiting approval"}. Component breakdown is not included in this payslip.</p>
    <AppButton variant="secondary" onClick={print}>Print / Save PDF</AppButton>
  </article>;
};
