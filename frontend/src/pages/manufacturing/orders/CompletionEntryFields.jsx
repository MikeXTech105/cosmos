import AppInput from "../../../components/common/AppInput";
import { Notice, TableWrap } from "./OrderShared";
import { formatOrderQuantity } from "./orderHelpers";
import { orderText as tr } from "./orderText";

export default function CompletionEntryFields({ simple, form, order, materials, materialPreview, runtime, itemLabel, fields, busy, set, setMaterial, physicalDeduction }) {
  const metadata = <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    <AppInput label={tr("Actual business date")} type="date" required disabled={busy} value={form.businessDate} error={fields.businessDate} onChange={event => set("businessDate", event.target.value)} />
    <AppInput className="sm:col-span-2" label={tr("Actual timestamp with UTC offset")} placeholder={tr("2026-10-27T09:30:00+05:30")} required disabled={busy} value={form.occurredAt} error={fields.occurredAt} onChange={event => set("occurredAt", event.target.value)} helperText={`Must match the business date in ${runtime?.businessTimeZone ?? "the configured company timezone"}.`} />
    <AppInput label={tr("Source reference (optional)")} maxLength={100} value={form.sourceReference} disabled={busy} error={fields.sourceReference} onChange={event => set("sourceReference", event.target.value)} />
    <AppInput label={tr("Released machine")} readOnly value={`Machine #${order.machineId ?? "unavailable"}`} />
    <AppInput label={tr("Released mould")} readOnly value={`Mould #${order.mouldId ?? "unavailable"}`} />
    <AppInput label={tr("Released HR shift")} readOnly value={`Shift #${order.shiftId ?? "unavailable"}`} />
  </div>;
  return <>
    <Notice>{tr(simple ? "Accepted output increases finished stock. Actual consumption plus scrap reduces material stock." : "Accepted output adds sellable stock; rejected output does not. The physical material deduction is actual consumed plus material scrap. Staging returned was never consumed, so it does not create another stock-in.")}</Notice>
    <div className="grid gap-4 sm:grid-cols-2">
      <AppInput label={tr("Accepted good output")} inputMode="decimal" required disabled={busy} value={form.goodOutput} error={fields.goodOutput} onChange={event => set("goodOutput", event.target.value)} helperText={`Remaining released output: ${formatOrderQuantity(order.remainingQuantity)} · ${itemLabel.unitLabel?.(order.itemId, order.unitId) ?? `Unit #${order.unitId}`}`} />
      <AppInput label={tr("Rejected output")} inputMode="decimal" required disabled={busy} value={form.rejectedOutput} error={fields.rejectedOutput} onChange={event => set("rejectedOutput", event.target.value)} />
    </div>
    {simple ? <><p className="text-sm text-slate-600">{form.businessDate} · {form.occurredAt?.slice(11, 16)} · {runtime?.businessTimeZone}</p><details className="rounded-xl border border-slate-200 p-4"><summary className="cursor-pointer text-sm font-medium text-slate-600">{tr("Time, resources & reference")}</summary><div className="mt-4">{metadata}</div></details></> : <>{metadata}<p className="text-xs leading-5 text-slate-500">{tr("Actual resources must match the released assignment. Every frozen component and its base unit is included. The server allocates cumulative partial rounding and protects other orders' reservations.")}</p></>}
    <TableWrap><thead><tr><th>{tr(simple ? "Material / unit" : "Frozen component / unit")}</th>{!simple && <th>{tr("Full frozen requirement")}</th>}<th>{tr(simple ? "Expected" : "Expected partial allocation preview")}</th><th>{tr("Actual consumed")}</th><th>{tr("Material scrap")}</th><th>{tr("Staging returned")}</th><th>{tr("Physical deduction")}</th></tr></thead>
      <tbody>{materials.map((line, index) => <tr key={line.id}><td>{itemLabel(line.itemId)}<div className="text-xs text-slate-500">{itemLabel.unitLabel?.(line.itemId, line.unitId) ?? tr("Base unit unavailable")}</div></td>{!simple && <td>{formatOrderQuantity(line.requiredQuantity)}<div className="text-xs text-slate-500">{tr("To date:")}{formatOrderQuantity(line.consumedQuantity)}</div></td>}<td>{formatOrderQuantity(materialPreview[index]?.expectedQuantity)}{materialPreview[index]?.overConsumption && <p className="text-xs text-amber-700">{tr("Variance reason required")}</p>}</td>{["consumedQuantity", "scrapQuantity", "returnedQuantity"].map(key => <td key={key}><AppInput label={`${tr({ consumedQuantity: "Consumed", scrapQuantity: "Scrap", returnedQuantity: "Returned" }[key])} · Item #${line.itemId}`} className="min-w-32" inputMode="decimal" required disabled={busy} value={form.materials[index]?.[key] ?? ""} error={fields[`materials.${index}.${key}`]} onChange={event => setMaterial(index, key, event.target.value)} /></td>)}<td>{physicalDeduction(form.materials[index] ?? {})}</td></tr>)}</tbody>
    </TableWrap>
    <AppInput label={tr("Variance reason / authority")} maxLength={1000} disabled={busy} value={form.varianceReason} error={fields.varianceReason} onChange={event => set("varianceReason", event.target.value)} helperText={tr(simple ? "Explain extra material usage when actual consumption plus scrap exceeds expected." : "Required by the server for over-consumption; posting requires Approve permission. Include the operational explanation and approval reference.")} />
  </>;
}
