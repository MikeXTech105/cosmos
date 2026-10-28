import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import AppButton from "../../../components/common/AppButton";
import { hrAttendanceService } from "../../../services/hr/attendanceService";
import { getHrActionError } from "../hrHelpers";

export default function DepartmentAttendancePanel({ date, departmentId, onDrilldown }) {
  const [state, setState] = useState({ rows: null, error: "", loading: false, context: "" });
  const request = useRef(0);
  const context = `${date}:${departmentId}`;
  const load = async () => {
    const current = ++request.current;
    setState((previous) => ({ ...previous, error: "", loading: true }));
    try {
      const response = await hrAttendanceService.getDepartmentReport({ attendanceDate: date, departmentId: departmentId === "all" ? undefined : departmentId });
      if (current === request.current) setState({ rows: Array.isArray(response.data) ? response.data : [], error: "", loading: false, context });
    } catch (error) { if (current === request.current) setState({ rows: null, error: getHrActionError(error, "Unable to load the department attendance report."), loading: false, context }); }
  };
  const stale = state.context !== context;
  return <details className="rounded-xl border border-slate-200 bg-white p-4"><summary className="cursor-pointer font-semibold">Department attendance report</summary><div className="mt-3 flex flex-wrap items-center gap-3"><p className="text-sm text-slate-500">Uses the selected attendance date and department above.</p><AppButton variant="secondary" isLoading={state.loading} onClick={load}>Load department report</AppButton></div>{state.error && <p role="alert" className="mt-3 text-sm text-red-700">{state.error}</p>}{state.rows && !stale && <div className="mt-3 overflow-x-auto"><table className="w-full text-left text-sm"><caption className="sr-only">Department attendance for {date}</caption><thead><tr>{["Department", "Staff", "Present", "Absent", "Leave", "Other"].map((label) => <th className="p-2" key={label}>{label}</th>)}</tr></thead><tbody>{state.rows.map((row) => <tr key={String(row.departmentId)} className="border-t border-slate-100"><th className="p-2" scope="row"><Link onClick={(event) => { if (onDrilldown?.(String(row.departmentId)) === false) event.preventDefault(); }} to={`/hr/attendance?date=${encodeURIComponent(date)}&departmentId=${encodeURIComponent(row.departmentId)}`} className="text-brand underline">{row.departmentName}</Link></th>{[row.employeeCount, row.presentCount, row.absentCount, row.leaveCount, row.otherCount].map((value, index) => <td className="p-2 tabular-nums" key={index}>{String(value ?? "—")}</td>)}</tr>)}</tbody></table>{!state.rows.length && <p className="p-3 text-sm text-slate-500">No departments match this date/filter.</p>}</div>}{state.rows && stale && <p className="mt-3 text-sm text-amber-800">Date or department changed. Reload to see matching results.</p>}</details>;
}
