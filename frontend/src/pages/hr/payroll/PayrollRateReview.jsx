import { formatHrCurrency, formatHrDate } from "../hrHelpers";

export default function PayrollRateReview({ employees = [], rates = [], selections = [], onChange, disabled = false }) {
  const required = employees.filter(employee => employee.requiresRateSelection);
  if (!required.length) return null;
  const update = (employeeId, value) => {
    const remaining = selections.filter(selection => String(selection.employeeId) !== String(employeeId));
    onChange(value ? [...remaining, value] : remaining);
  };
  return <section aria-label="Review payroll period rates" className="space-y-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
    <p className="text-sm text-slate-700">Choose and review one monthly rate for each employee below. That rate applies to payable employed days divided by calendar days in this payroll month. Fixed deductions are applied in full. No rate is selected automatically.</p>
    {required.map(employee => {
      const employeeId = String(employee.employeeId);
      const options = rates.filter(rate => String(rate.employeeId) === employeeId);
      const selection = selections.find(row => String(row.employeeId) === employeeId);
      const chosen = options.find(rate => String(rate.salaryAssignmentId) === String(selection?.salaryAssignmentId) && String(rate.rowVersion) === String(selection?.rowVersion));
      const selectId = `payroll-rate-${employeeId}`;
      return <fieldset key={employeeId} disabled={disabled} className="space-y-3 rounded-lg border border-amber-200 bg-white p-3">
        <legend className="px-1 text-sm font-semibold">{employee.employeeName || `Employee ${employeeId}`}</legend>
        <p className="text-xs text-slate-600">Employed days in period: {employee.employmentDays}</p>
        <label htmlFor={selectId} className="block text-sm font-medium">Monthly rate for {employee.employeeName || employeeId}</label>
        <select id={selectId} value={chosen ? String(chosen.salaryAssignmentId) : ""} onChange={event => {
          const rate = options.find(option => String(option.salaryAssignmentId) === event.target.value);
          update(employeeId, rate ? { employeeId, salaryAssignmentId: String(rate.salaryAssignmentId), rowVersion: String(rate.rowVersion), reviewed: false } : null);
        }} className="w-full rounded-lg border border-slate-300 bg-white p-2 text-sm">
          <option value="">Choose a saved salary assignment</option>
          {options.map(rate => <option key={`${rate.salaryAssignmentId}:${rate.rowVersion}`} value={String(rate.salaryAssignmentId)}>{rate.structureName} · effective {formatHrDate(rate.effectiveDate)}</option>)}
        </select>
        {!options.length && <p role="alert" className="text-sm text-red-700">No eligible saved rate is available. Review salary assignments before processing.</p>}
        {selection && !chosen && <p role="alert" className="text-sm text-amber-800">The previously reviewed rate changed or is unavailable. Choose and review the current assignment again.</p>}
        {chosen && <><dl className="grid grid-cols-2 gap-2 text-sm"><dt>Monthly earnings</dt><dd>{formatHrCurrency(chosen.monthlyEarnings)}</dd><dt>Fixed deductions</dt><dd>{formatHrCurrency(chosen.fixedDeductions)}</dd></dl><label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={selection?.reviewed === true} onChange={event => update(employeeId, { employeeId, salaryAssignmentId: String(chosen.salaryAssignmentId), rowVersion: String(chosen.rowVersion), reviewed: event.target.checked })} />I reviewed this monthly rate and fixed deductions for {employee.employeeName || employeeId}.</label></>}
      </fieldset>;
    })}
  </section>;
}
