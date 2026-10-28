import { useCallback, useEffect, useRef, useState } from "react";
import AppButton from "../../components/common/AppButton";
import AppInput from "../../components/common/AppInput";
import AppSelect from "../../components/common/AppSelect";
import useUnsavedChanges from "../../hooks/useUnsavedChanges";
import { hrSetupService } from "../../services/hr/setupService";
import { getApiErrorMessage } from "../../utils/apiError";

const rows = (response) => Array.isArray(response?.data) ? response.data : [];
const emptyType = { leaveCode: "", leaveName: "", annualQuota: "0", isPaidLeave: true, isActive: true };
export const LeaveSetupPanel = ({ capabilities, onTypesChanged }) => {
  const [types, setTypes] = useState([]);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { confirmLeave } = useUnsavedChanges({ when: Boolean(form), message: "Leave-type setup has unsaved changes. Discard them?" });
  const load = useCallback(() => hrSetupService.leaveTypes().then((response) => { setTypes(rows(response)); onTypesChanged?.(rows(response)); setError(""); }).catch((failure) => setError(getApiErrorMessage(failure, "Unable to load leave types."))), [onTypesChanged]);
  useEffect(() => { void Promise.resolve().then(load); }, [load]);
  const patch = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const save = async () => {
    setBusy(true); setError("");
    try { await hrSetupService.saveLeaveType(form.id, form); setForm(null); await load(); }
    catch (failure) { setError(getApiErrorMessage(failure, "Unable to save leave type.")); }
    finally { setBusy(false); }
  };
  return <details className="rounded-xl border border-slate-200 bg-white p-4"><summary className="cursor-pointer font-semibold">Leave types and entitlement policy</summary>
    <p className="my-3 text-sm text-slate-500">Annual quota initializes a new employee's balance. Existing employee balances stay unchanged. Paid/unpaid policy cannot change after applications use a type.</p>
    {error && <p role="alert" className="my-3 text-sm text-red-700">{error} <button type="button" className="underline" onClick={load}>Retry loading</button></p>}
    <div className="flex flex-wrap gap-2">{types.map((type) => <AppButton key={String(type.id)} variant="secondary" disabled={!capabilities.canUpdate || busy} onClick={() => confirmLeave(() => setForm({ ...type, annualQuota: String(type.annualQuota) }))}>{type.leaveName} · {String(type.annualQuota)} days{!type.isActive ? " · inactive" : ""}</AppButton>)}</div>
    {capabilities.canCreate && <AppButton className="mt-3" disabled={busy} onClick={() => confirmLeave(() => setForm({ ...emptyType }))}>Add leave type</AppButton>}
    {form && <fieldset disabled={busy} className="mt-4 space-y-3"><legend className="font-medium">{form.id ? "Edit leave type" : "New leave type"}</legend><div className="grid gap-3 md:grid-cols-3"><AppInput label="Code" required value={form.leaveCode} onChange={(event) => patch("leaveCode", event.target.value)} /><AppInput label="Name" required value={form.leaveName} onChange={(event) => patch("leaveName", event.target.value)} /><AppInput label="Annual quota (days)" inputMode="decimal" value={form.annualQuota} onChange={(event) => patch("annualQuota", event.target.value)} /></div><label className="mr-4 inline-flex gap-2"><input type="checkbox" checked={form.isPaidLeave} onChange={(event) => patch("isPaidLeave", event.target.checked)} />Paid leave</label><label className="inline-flex gap-2"><input type="checkbox" checked={form.isActive} onChange={(event) => patch("isActive", event.target.checked)} />Active for new applications</label><div className="flex gap-2"><AppButton onClick={save} isLoading={busy}>Save leave type</AppButton><AppButton variant="secondary" onClick={() => confirmLeave(() => setForm(null))}>Discard changes</AppButton></div></fieldset>}
  </details>;
};

export const PayrollSetupPanel = ({ capabilities, employeeOptions }) => {
  const [catalog, setCatalog] = useState({ components: [], structures: [], assignments: [] });
  const [component, setComponent] = useState({ componentName: "", componentType: 1 });
  const [structure, setStructure] = useState({ name: "", components: [] });
  const [assignment, setAssignment] = useState({ employeeId: "", salaryStructureId: "", effectiveDate: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dirty = Boolean(component.componentName || structure.name || structure.components.length || assignment.employeeId || assignment.salaryStructureId || assignment.effectiveDate);
  const { confirmLeave } = useUnsavedChanges({ when: dirty });
  const load = useCallback(async () => {
    try { const [components, structures, assignments] = await Promise.all([hrSetupService.components(), hrSetupService.structures(), hrSetupService.assignments()]); setCatalog({ components: rows(components), structures: rows(structures), assignments: rows(assignments) }); setError(""); }
    catch (failure) { setError(getApiErrorMessage(failure, "Unable to load payroll setup.")); }
  }, []);
  useEffect(() => { void Promise.resolve().then(load); }, [load]);
  const save = async (operation, clear) => { if (busy) return; setBusy(true); setError(""); try { await operation(); clear(); await load(); } catch (failure) { setError(getApiErrorMessage(failure, "Unable to save payroll setup.")); } finally { setBusy(false); } };
  return <details className="rounded-xl border border-slate-200 bg-white p-4"><summary className="cursor-pointer font-semibold">Salary setup and effective employee assignments</summary>
    <p className="my-3 text-sm text-slate-500">1. Maintain earnings/deduction components. 2. Save a structure with exact amounts. 3. Assign it to an employee from an effective date. An assigned structure is preserved; create a new structure to change pay. A later assignment supersedes the earlier one.</p>
    {error && <p role="alert" className="my-3 text-sm text-red-700">{error} <button type="button" className="underline" onClick={load}>Retry loading</button></p>}
    {capabilities.canUpdate && <div className="my-3 flex flex-wrap gap-2">{catalog.components.map((item) => <AppButton key={String(item.id)} variant="secondary" disabled={busy} onClick={() => confirmLeave(() => setComponent({ ...item }))}>Edit {item.componentName}</AppButton>)}</div>}
    {(capabilities.canCreate || capabilities.canUpdate) && <fieldset disabled={busy} className="space-y-5">
      <div className="grid gap-3 md:grid-cols-[1fr_200px_auto]"><AppInput label="Component name" value={component.componentName} onChange={(event) => setComponent((current) => ({ ...current, componentName: event.target.value }))} /><AppSelect label="Type" value={component.componentType} options={[{ value: 1, label: "Earnings" }, { value: 2, label: "Deduction" }]} onChange={(value) => setComponent((current) => ({ ...current, componentType: value }))} /><AppButton className="self-end" disabled={component.id ? !capabilities.canUpdate : !capabilities.canCreate} onClick={() => save(() => hrSetupService.saveComponent(component.id, component), () => setComponent({ componentName: "", componentType: 1 }))}>Save component</AppButton></div>
      <div className="space-y-3 border-t border-slate-100 pt-4"><AppInput label="New salary structure name" value={structure.name} onChange={(event) => setStructure((current) => ({ ...current, name: event.target.value }))} />{structure.components.map((row, index) => <div className="grid gap-3 md:grid-cols-[1fr_200px_auto]" key={index}><AppSelect label={`Component ${index + 1}`} value={row.salaryComponentId} options={catalog.components.map((item) => ({ value: item.id, label: `${item.componentName} (${Number(item.componentType) === 1 ? "Earnings" : "Deduction"})` }))} onChange={(value) => setStructure((current) => ({ ...current, components: current.components.map((item, position) => position === index ? { ...item, salaryComponentId: value } : item) }))} /><AppInput label="Amount" inputMode="decimal" value={row.amount} onChange={(event) => setStructure((current) => ({ ...current, components: current.components.map((item, position) => position === index ? { ...item, amount: event.target.value } : item) }))} /><AppButton variant="secondary" className="self-end" onClick={() => setStructure((current) => ({ ...current, components: current.components.filter((_, position) => position !== index) }))}>Remove</AppButton></div>)}<div className="flex gap-2"><AppButton variant="secondary" onClick={() => setStructure((current) => ({ ...current, components: [...current.components, { salaryComponentId: "", amount: "" }] }))}>Add component amount</AppButton><AppButton disabled={structure.id ? !capabilities.canUpdate : !capabilities.canCreate} onClick={() => save(() => hrSetupService.saveStructure(structure.id, structure), () => setStructure({ name: "", components: [] }))}>Save structure</AppButton></div></div>
      <div className="grid gap-3 border-t border-slate-100 pt-4 md:grid-cols-4"><AppSelect label="Employee" options={employeeOptions} value={assignment.employeeId} onChange={(value) => setAssignment((current) => ({ ...current, employeeId: value }))} /><AppSelect label="Salary structure" options={catalog.structures.map((item) => ({ label: item.name, value: item.id }))} value={assignment.salaryStructureId} onChange={(value) => setAssignment((current) => ({ ...current, salaryStructureId: value }))} /><AppInput label="Effective from" type="date" value={assignment.effectiveDate} onChange={(event) => setAssignment((current) => ({ ...current, effectiveDate: event.target.value }))} /><AppButton className="self-end" disabled={!capabilities.canCreate} onClick={() => save(() => hrSetupService.assign(assignment), () => setAssignment({ employeeId: "", salaryStructureId: "", effectiveDate: "" }))}>Save assignment</AppButton></div>
    </fieldset>}
    <div className="mt-4 space-y-2">{catalog.structures.map((item) => <details key={String(item.id)} className="rounded-lg bg-slate-50 p-3"><summary>{item.name}</summary><div className="my-2 flex gap-2">{capabilities.canUpdate && <AppButton variant="secondary" disabled={busy} onClick={() => confirmLeave(() => setStructure({ ...item, components: (item.components || []).map((row) => ({ salaryComponentId: row.salaryComponentId, amount: String(row.amount) })) }))}>Edit unassigned structure</AppButton>}{capabilities.canCreate && <AppButton variant="secondary" disabled={busy} onClick={() => confirmLeave(() => setStructure({ name: `${item.name} copy`, components: (item.components || []).map((row) => ({ salaryComponentId: row.salaryComponentId, amount: String(row.amount) })) }))}>Copy as new structure</AppButton>}</div>{item.components?.map((row) => <p key={String(row.salaryComponentId)} className="mt-1 text-sm">{row.componentName}: {String(row.amount)}</p>)}</details>)}</div>
    <h3 className="mt-4 font-medium">Assignment history</h3><div className="mt-2 max-h-64 space-y-2 overflow-auto">{catalog.assignments.length ? catalog.assignments.map((row) => <p className="text-sm" key={String(row.id)}>{row.employeeName} · {row.structureName} · from {String(row.effectiveDate).slice(0, 10)}</p>) : <p className="text-sm text-slate-500">No salary assignments.</p>}</div>
  </details>;
};

export const LeaveEntitlementPanel = ({ capabilities, employeeOptions, leaveTypeOptions }) => {
  const [employeeId, setEmployeeId] = useState("");
  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [balances, setBalances] = useState([]);
  const [openingBalance, setOpeningBalance] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const request = useRef(0);
  const selected = balances.find((row) => String(row.leaveTypeId) === String(leaveTypeId));
  const dirty = openingBalance !== "" && openingBalance !== String(selected?.openingBalance ?? "");
  const { confirmLeave } = useUnsavedChanges({ when: dirty });
  const chooseEmployee = async (value) => {
    if (busy || !confirmLeave(() => {})) return;
    const current = ++request.current;
    setEmployeeId(value); setLeaveTypeId(""); setOpeningBalance(""); setBalances([]); setError("");
    if (!value) return;
    setBusy(true);
    try { const response = await hrSetupService.entitlements(value); if (current === request.current) setBalances(rows(response)); }
    catch (failure) { if (current === request.current) setError(getApiErrorMessage(failure, "Unable to load employee entitlements.")); }
    finally { if (current === request.current) setBusy(false); }
  };
  return <details className="rounded-xl border border-slate-200 bg-white p-4"><summary className="cursor-pointer font-semibold">Employee leave entitlements</summary><p className="my-3 text-sm text-slate-500">Set this employee's total entitlement explicitly. Used leave remains intact; remaining days equal entitlement minus used days. This does not carry leave between years or reset usage.</p>{error && <p role="alert" className="mb-3 text-sm text-red-700">{error}</p>}<div className="grid gap-3 md:grid-cols-4"><AppSelect label="Employee" disabled={busy} options={employeeOptions} value={employeeId} onChange={chooseEmployee} /><AppSelect label="Leave type" disabled={!employeeId || busy} options={leaveTypeOptions} value={leaveTypeId} onChange={(value) => confirmLeave(() => { setLeaveTypeId(value); const saved = balances.find((row) => String(row.leaveTypeId) === String(value)); setOpeningBalance(saved ? String(saved.openingBalance) : ""); })} /><AppInput label="Entitlement (days)" inputMode="decimal" disabled={!leaveTypeId || !capabilities.canUpdate || busy} value={openingBalance} onChange={(event) => setOpeningBalance(event.target.value)} /><AppButton className="self-end" disabled={!employeeId || !leaveTypeId || !dirty || !capabilities.canUpdate} isLoading={busy} onClick={async () => { setBusy(true); setError(""); try { const response = await hrSetupService.saveEntitlement({ employeeId, leaveTypeId, openingBalance, rowVersion: selected?.rowVersion ?? null }); setBalances((current) => [...current.filter((row) => String(row.leaveTypeId) !== String(leaveTypeId)), response.data]); setOpeningBalance(String(response.data.openingBalance)); } catch (failure) { setError(getApiErrorMessage(failure, "Unable to save employee entitlement. Reload after a conflict.")); } finally { setBusy(false); } }}>Save entitlement</AppButton></div>{selected && <p className="mt-3 text-sm">Used: {String(selected.usedBalance)} days · Remaining: {String(selected.remainingBalance)} days</p>}</details>;
};
