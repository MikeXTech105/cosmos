import { useState } from "react";
import { Link } from "react-router-dom";
import AppButton from "../../../components/common/AppButton";
import AppInput from "../../../components/common/AppInput";
import AppSelect from "../../../components/common/AppSelect";
import useCapabilities from "../../../hooks/useCapabilities";
import useProductionRuntime from "../../../hooks/useProductionRuntime";
import useProductionText from "../../../hooks/useProductionText";
import { physicalMessages } from "./physicalMessages";
import { physicalInventoryService as api } from "../../../services/manufacturing/physicalInventoryService";
import { buildProcurementDraft, decimal, lineLabel, quantityCompare, required } from "./physicalHelpers";
import { PhysicalFeedback, PhysicalSection, PhysicalTable } from "./PhysicalShared";
import { reloadPhysical, reviewPhysical, usePhysicalCommand, usePhysicalContext } from "./physicalHooks";
import { SupplierLookup } from "./PhysicalLookup";

export function ProcurementPurchasePanel({ run, lines, onSaved }) {
  const t = useProductionText(physicalMessages);
  const planning = useCapabilities({ actions: ["view", "approve"], pageName: "ProcurementPlanning.PlanningHistory", resource: "ProcurementPlanning.PlanningHistory" });
  const purchase = useCapabilities({ actions: ["view", "create"], pageName: "PurchaseExpense.PurchaseOrder", resource: "PurchaseExpense.PurchaseOrder" });
  const canRecover = planning.canView && purchase.canView;
  const sources = usePhysicalContext(api.purchaseSources, run.id, canRecover);
  const { runtime } = useProductionRuntime();
  const [selected, setSelected] = useState({});
  const [form, setForm] = useState({ supplierId: "", orderDate: "", expectedDate: "", notes: "" });
  const [created, setCreated] = useState(null);
  const command = usePhysicalCommand(async (result) => { setCreated(result); await reloadPhysical(canRecover ? sources.reload : undefined, onSaved); setSelected({}); return true; });
  const converted = new Set((sources.data?.lines ?? []).map((line) => String(line.planningRunLineId)));
  const available = lines.filter((line) => !converted.has(String(line.id)) && quantityCompare(line.finalQuantity ?? line.calculatedSuggestedQuantity ?? "0", "0") > 0);
  const patchLine = (id, patch) => setSelected((current) => ({ ...current, [id]: { price: "", tax: "", source: "", ...current[id], ...patch } }));
  const submit = async () => {
    if (!planning.canApprove || !purchase.canCreate) return;
    try { const payload = buildProcurementDraft(available, selected, { ...form, orderDate: form.orderDate || runtime?.businessDate || "" }); await command.run(`purchase-draft:${run.id}`, payload, (body) => api.purchaseDraft(run.id, body)); } catch (error) { command.fail(error); }
  };
  return <PhysicalSection title={t("integrations.purchaseDraft", { defaultValue: "Create purchase order from finalized lines" })} description={t("Select lines on this snapshot page. Every line needs an explicitly sourced price and tax; missing cost stays unknown. The existing PO draft retains source identities.")}>
    <PhysicalFeedback loading={sources.loading} error={command.error || sources.error} conflict={command.conflict} onReload={() => canRecover ? reviewPhysical(command, sources.reload, onSaved) : command.fail(new Error("Planning and Purchase Order View permissions are required to inspect converted source documents. Keep the identical request for a safe retry."))} />
    {created && <p role="status" className="text-sm text-emerald-800">{t("PO draft created. ")}<Link className="font-semibold underline" to={`/purchase/orders/${created.id}`}>{t("Open purchase order")}</Link></p>}
    {(sources.data?.lines ?? []).length > 0 && <div className="rounded-lg bg-slate-50 p-3 text-sm"><p className="mb-2 font-medium text-slate-800">{t("Already converted source lines")}</p><ul className="space-y-1">{sources.data.lines.map((line) => <li key={line.planningRunLineId}><Link className="text-brand underline" to={`/purchase/orders/${line.purchaseOrderId}`}>{line.purchaseOrderNo}</Link> · {t("Planning line")} {line.planningRunLineId} · {line.quantity} · {line.priceSourceReference}</li>)}</ul></div>}
    <div className="grid gap-4 md:grid-cols-3"><SupplierLookup disabled={command.saving} value={form.supplierId} onChange={(supplierId) => setForm((current) => ({ ...current, supplierId }))} /><AppInput type="date" label={t("Order business date")} value={form.orderDate || runtime?.businessDate || ""} max={runtime?.businessDate} onChange={(event) => setForm((current) => ({ ...current, orderDate: event.target.value }))} /><AppInput type="date" label={t("Expected receipt date (optional)")} value={form.expectedDate} onChange={(event) => setForm((current) => ({ ...current, expectedDate: event.target.value }))} /></div>
    <PhysicalTable headings={[t("Select"), t("Material / purchase quantity"), t("Source price (2 places)"), t("Tax % (4 places)"), t("Price evidence")]}>{available.map((line) => <tr key={line.id}><td><input type="checkbox" aria-label={`Select ${lineLabel(line)}`} checked={Boolean(selected[line.id]?.selected)} onChange={(event) => patchLine(line.id, { selected: event.target.checked })} /></td><td>{lineLabel(line)}<p className="text-xs text-slate-500">{line.finalQuantity ?? line.calculatedSuggestedQuantity} {line.unitName}</p></td><td><AppInput aria-label={`Price for ${lineLabel(line)}`} inputMode="decimal" value={selected[line.id]?.price ?? ""} onChange={(event) => patchLine(line.id, { price: event.target.value })} /></td><td><AppInput aria-label={`Tax for ${lineLabel(line)}`} inputMode="decimal" value={selected[line.id]?.tax ?? ""} onChange={(event) => patchLine(line.id, { tax: event.target.value })} /></td><td><AppInput aria-label={`Price evidence for ${lineLabel(line)}`} value={selected[line.id]?.source ?? ""} onChange={(event) => patchLine(line.id, { source: event.target.value })} /></td></tr>)}</PhysicalTable>
    {!available.length && <p className="text-sm text-slate-500">{t("No positive purchase lines on this page.")}</p>}<AppInput label={t("PO notes (optional)")} maxLength={1000} value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
    <AppButton disabled={!planning.canApprove || !purchase.canCreate || !available.length || command.conflict || sources.loading || Boolean(sources.error)} isLoading={command.saving} onClick={submit}>{t("Create selected PO draft")}</AppButton>{(!planning.canApprove || !purchase.canCreate) && <p className="text-xs text-amber-800">{t("Planning approval and purchase-order create permissions are both required.")}</p>}
  </PhysicalSection>;
}

export function SupplierPolicyPanel({ itemId, onSaved }) {
  const t = useProductionText(physicalMessages);
  const permission = useCapabilities({ actions: ["view", "update"], pageName: "ProcurementPlanning.Settings", resource: "ProcurementPlanning.Settings" });
  const context = usePhysicalContext(api.supplierPolicy, itemId, permission.canView);
  const [form, setForm] = useState({});
  const command = usePhysicalCommand(async () => { await reloadPhysical(context.reload); const current = (await api.supplierPolicy(itemId)).data; await onSaved?.(current); setForm({}); return true; });
  const value = (key, fallback) => form[key] ?? fallback ?? "";
  const save = async () => {
    if (!permission.canUpdate || !context.data) return;
    try { const payload = { version: context.data.version, leadTime: decimal(value("leadTime", context.data.sourceLeadTime), 3), leadTimeUnit: Number(value("leadTimeUnit", context.data.sourceLeadTimeUnit) || 1), defaultSupplierId: value("supplierId", context.data.defaultSupplierId) || null, sourceReference: required(value("sourceReference", context.data.sourceReference), "Lead source reference", 200) }; await command.run(`supplier-policy:${itemId}`, payload, (body) => api.saveSupplierPolicy(itemId, body)); } catch (error) { command.fail(error); }
  };
  return <PhysicalSection title={t("integrations.supplierPolicy", { defaultValue: "Supplier and typed lead time" })} description={t("Weeks are seven calendar days. This configured source preserves the existing override → history → configured precedence.")}><PhysicalFeedback loading={context.loading} error={command.error || context.error} conflict={command.conflict} onReload={async () => { if (await reviewPhysical(command, context.reload)) setForm({}); }} />{context.data && <><div className="grid gap-4 md:grid-cols-4"><AppInput label={t("Source duration")} inputMode="decimal" value={value("leadTime", context.data.sourceLeadTime)} onChange={(event) => setForm((current) => ({ ...current, leadTime: event.target.value }))} /><AppSelect label={t("Duration unit")} value={value("leadTimeUnit", context.data.sourceLeadTimeUnit) || 1} options={[{ value: 1, label: t("Calendar days") }, { value: 2, label: t("Weeks (7 calendar days)") }]} onChange={(leadTimeUnit) => setForm((current) => ({ ...current, leadTimeUnit }))} /><SupplierLookup value={value("supplierId", context.data.defaultSupplierId)} onChange={(supplierId) => setForm((current) => ({ ...current, supplierId }))} /><AppInput label={t("Lead source reference")} maxLength={200} value={value("sourceReference", context.data.sourceReference)} onChange={(event) => setForm((current) => ({ ...current, sourceReference: event.target.value }))} /></div><p className="text-xs text-slate-500">Configured days from server: {context.data.configuredLeadTimeDays ?? "Unavailable"} · version {context.data.version}</p><AppButton disabled={!permission.canUpdate || command.conflict || context.loading} isLoading={command.saving} onClick={save}>{t("Save supplier policy")}</AppButton></>}</PhysicalSection>;
}
