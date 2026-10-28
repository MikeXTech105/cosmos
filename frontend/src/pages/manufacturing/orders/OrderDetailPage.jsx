import { orderText as tr } from "./orderText";
import { useCallback, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Factory, RefreshCw } from "lucide-react";
import AppButton from "../../../components/common/AppButton";
import PageHeader from "../../../components/common/PageHeader";
import useProductionRuntime from "../../../hooks/useProductionRuntime";
import productionOrderService from "../../../services/manufacturing/productionOrderService";
import { parseProductionJson } from "../../../services/manufacturing/productionApi";
import { ManufacturingCard, ManufacturingEmpty, ManufacturingInlineError } from "../ManufacturingShared";
import { WorkspaceNav } from "../WorkspaceShared";
import OrderCapacity from "./OrderCapacity";
import OrderCommandModal from "./OrderCommandModal";
import { Busy, Denied, Notice, OrderBackLink, OrderStatus, ReadOnlyField, TableWrap } from "./OrderShared";
import { useAsyncResource, useItemLabels, useOrderCapabilities } from "./orderHooks";
import { formatOrderQuantity, isOrderStatus } from "./orderHelpers";
const parseSnapshot = source => {
  if (!source) return null;
  try {
    return parseProductionJson(source);
  } catch {
    return null;
  }
};
const snapshotValue = (line, key) => line[key] ?? line[key.charAt(0).toUpperCase() + key.slice(1)];
export default function OrderDetailPage() {
  const {
    id
  } = useParams();
  const capabilities = useOrderCapabilities(),
    {
      runtime
    } = useProductionRuntime();
  const load = useCallback(({ signal } = {}) => productionOrderService.context(id, { signal }), [id]);
  const resource = useAsyncResource(load, capabilities.canView);
  const [command, setCommand] = useState(null),
    [rescheduleRequired, setRescheduleRequired] = useState(false);
  const context = resource.data,
    order = context?.order,
    materials = context?.materials ?? [];
  const itemLabel = useItemLabels([order?.itemId, ...materials.map(line => line.itemId)]);
  if (!capabilities.canView) return <Denied />;
  if (resource.busy && !order) return <Busy />;
  if (!order) return <div className="space-y-5"><OrderBackLink /><ManufacturingInlineError message={resource.error || "Order context was not returned."} onRetry={resource.reload} /></div>;
  const open = (action, completion) => {
    if (resource.busy || resource.error || command) return;
    setCommand({ action, completion });
  };
  const saved = async action => {
    const current = await resource.reload();
    if (!current) return false;
    if (action === "amend") setRescheduleRequired(true);
    setCommand(null);
    return true;
  };
  const routes = parseSnapshot(context.routeSnapshotJson);
  const canComplete = capabilities.canApprove && isOrderStatus(order, "Released", "InProgress");
  const canRemainder = capabilities.canApprove && !isOrderStatus(order, "Closed", "Cancelled");
  return <div className="space-y-6"><WorkspaceNav /><OrderBackLink /><PageHeader icon={Factory} title={order.orderNumber || `Production order #${order.id}`} description={`Revision ${order.revision ?? 1} · Frozen material and routing snapshots are preserved with the order.`} actions={<><AppButton variant="secondary" disabled={resource.busy} onClick={resource.reload}><RefreshCw className="h-4 w-4" />{tr("Refresh")}</AppButton>{capabilities.canUpdate && isOrderStatus(order, "Draft") && <Link className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand" to={`/manufacturing/orders/${order.id}/edit`}>{tr("Edit draft")}</Link>}{capabilities.canApprove && isOrderStatus(order, "Draft") && <AppButton onClick={() => open("release")}>{tr("Approve release")}</AppButton>}{canComplete && <AppButton onClick={() => open("complete")}>{tr("Record partial completion")}</AppButton>}{canComplete && <AppButton variant="secondary" onClick={() => open("amend")}>{tr("Amend release")}</AppButton>}{canRemainder && <AppButton variant="secondary" onClick={() => open("close")}>{tr("Short close")}</AppButton>}{canRemainder && <AppButton variant="danger" onClick={() => open("cancel")}>{tr("Cancel remainder")}</AppButton>}</>} />
    <ManufacturingInlineError message={resource.error} onRetry={resource.reload} />
    {resource.busy && <p role="status" className="text-sm text-slate-500">{tr("Refreshing order, material and stock context…")}</p>}
    <ManufacturingCard title={tr("Order context")} actions={<OrderStatus status={order.status} />}><dl className="grid gap-5 p-5 sm:grid-cols-2 lg:grid-cols-4"><ReadOnlyField label={tr("Finished Item")}>{itemLabel.canView ? <Link className="text-brand underline" to={`/inventory/items/${order.itemId}`}>{itemLabel(order.itemId)}</Link> : itemLabel(order.itemId)}</ReadOnlyField><ReadOnlyField label={tr("Base unit")}>{itemLabel.unitLabel?.(order.itemId, order.unitId) ?? tr("Base unit unavailable")}</ReadOnlyField><ReadOnlyField label={tr("Business date")}>{order.businessDate}</ReadOnlyField><ReadOnlyField label={tr("Planned start / due")}>{order.plannedStart} / {order.dueDate}</ReadOnlyField>{[["Planned output", "plannedQuantity"], ["Approved released output", "releasedQuantity"], ["Accepted good output", "completedQuantity"], ["Rejected output", "rejectedQuantity"], ["Remaining released output", "remainingQuantity"]].map(([label, key]) => <ReadOnlyField key={key} label={tr(label)}>{formatOrderQuantity(order[key])}</ReadOnlyField>)}<ReadOnlyField label={tr("BOM / routing")}>{tr("BOM #")}{order.bomId}{tr("/ Route #")}{order.routingId}</ReadOnlyField><ReadOnlyField label={tr("Machine / mould / shift")}>#{order.machineId ?? "—"} / #{order.mouldId ?? "—"} / #{order.shiftId ?? "—"}</ReadOnlyField><ReadOnlyField label={tr("Sales channel")}>{order.channelId ? `Channel #${order.channelId}` : "—"}</ReadOnlyField><ReadOnlyField label={tr("Reference")}>{order.reference || "—"}</ReadOnlyField><ReadOnlyField label={tr("Planning source")}>{order.sourcePlanId ? <Link className="text-brand underline" to={`/manufacturing/planning?snapshot=${encodeURIComponent(order.sourcePlanId)}`}>{order.sourcePlanId}</Link> : "—"}{order.sourceLineId && <div className="mt-1 text-xs">{tr("Line:")}{order.sourceLineId}</div>}</ReadOnlyField><ReadOnlyField label={tr("Current version")}>{order.version}</ReadOnlyField><ReadOnlyField label={tr("Notes")}>{order.notes || "—"}</ReadOnlyField></dl></ManufacturingCard>
    <ManufacturingCard title={tr("Frozen material allocation")} description={tr("Source component/base-output ratios retain audit precision. Posting quantities use six decimal places; actual consumed includes material scrap.")}>{materials.length ? <TableWrap><thead><tr><th>{tr("Component")}</th><th>{tr("Base unit")}</th><th>{tr("Source component / output base")}</th><th>{tr("Quantity per output")}</th><th>{tr("Waste %")}</th><th>{tr("Frozen required")}</th><th>{tr("Actual deducted to date")}</th></tr></thead><tbody>{materials.map(line => <tr key={line.id}><td>{itemLabel(line.itemId)}</td><td>{itemLabel.unitLabel?.(line.itemId, line.unitId) ?? tr("Base unit unavailable")}</td><td>{formatOrderQuantity(line.sourceComponentQuantity)} / {formatOrderQuantity(line.outputBaseQuantity)}</td><td>{formatOrderQuantity(line.quantityPerOutput)}</td><td>{formatOrderQuantity(line.wastePercent)}</td><td>{formatOrderQuantity(line.requiredQuantity)}</td><td>{formatOrderQuantity(line.consumedQuantity)}</td></tr>)}</tbody></TableWrap> : <ManufacturingEmpty title={tr("No released allocation")} description={tr("The complete material allocation is frozen when an approved release succeeds.")} />}</ManufacturingCard>
    {(context.reservations ?? []).length > 0 && <ManufacturingCard title={tr("Current owned reservation and stock")} description={tr("These balances are refreshed from the server after commands. Free stock already excludes all current reservations.")}><TableWrap><thead><tr><th>{tr("Item / base unit")}</th><th>{tr("Originally reserved")}</th><th>{tr("Reservation consumed")}</th><th>{tr("Released remainder")}</th><th>{tr("Owned remainder")}</th><th>{tr("Current on hand")}</th><th>{tr("Current free")}</th></tr></thead><tbody>{context.reservations.map(line => <tr key={line.itemId}><td>{itemLabel(line.itemId)} · {itemLabel.unitLabel?.(line.itemId, line.unitId) ?? tr("Base unit unavailable")}</td>{["reservedQuantity", "consumedQuantity", "releasedQuantity", "remainingQuantity", "onHandQuantity", "freeQuantity"].map(key => <td key={key}>{formatOrderQuantity(line[key])}</td>)}</tr>)}</tbody></TableWrap></ManufacturingCard>}
    <ManufacturingCard title={tr("Frozen routing")} description={tr("Operations are retained from the approved route. Amendment requires explicit capacity scheduling again.")}>{Array.isArray(routes) && routes.length ? <TableWrap><thead><tr><th>{tr("Sequence")}</th><th>{tr("Operation / work centre")}</th><th>{tr("Rate basis / rate")}</th><th>{tr("Setup min / quantity basis")}</th><th>{tr("Machine / mould")}</th><th>{tr("Verified SKU output per shot")}</th></tr></thead><tbody>{routes.map((line, index) => <tr key={snapshotValue(line, "id") ?? index}><td>{snapshotValue(line, "sequence")}</td><td>{tr("Operation #")}{snapshotValue(line, "operationId")}{tr("/ Work centre #")}{snapshotValue(line, "workCentreId")}</td><td>{snapshotValue(line, "rateBasis")} / {formatOrderQuantity(snapshotValue(line, "rate"))}</td><td>{formatOrderQuantity(snapshotValue(line, "setupMinutes"))} / {formatOrderQuantity(snapshotValue(line, "quantityBasis"))}</td><td>{snapshotValue(line, "machineId") ?? "—"} / {snapshotValue(line, "mouldId") ?? "—"}</td><td>{formatOrderQuantity(snapshotValue(line, "skuOutputPerShot"))}</td></tr>)}</tbody></TableWrap> : <ManufacturingEmpty title={tr("No frozen route")} description={tr("The released route snapshot appears after approval.")} />}</ManufacturingCard>
    <OrderCapacity key={`${order.id}-${order.revision ?? 1}`} order={order} canApprove={capabilities.canApprove} rescheduleRequired={rescheduleRequired} onScheduled={async () => {
      const current = await resource.reload();
      if (current) setRescheduleRequired(false);
      return current;
    }} onConflict={resource.reload} />
    <ManufacturingCard title={tr("Completion and correction history")} description={tr("Accepted, rejected and material quantities remain linked to their original events. Reversal never deletes the original posting.")}>{context.completions?.length ? <div className="divide-y divide-slate-100">{context.completions.map(completion => <article className="space-y-4 p-5" key={completion.id} id={`completion-${completion.id}`}><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-sm font-semibold text-slate-900">{completion.reversalOfId ? `Reversal #${completion.id} of completion #${completion.reversalOfId}` : `Completion #${completion.id}`}{completion.reversedById ? ` · Reversed by #${completion.reversedById}` : ""}</h3><p className="mt-1 text-xs text-slate-500">{completion.businessDate} · {completion.occurredAt}{tr("· Machine #")}{completion.machineId}{tr("/ Mould #")}{completion.mouldId}{tr("/ Shift #")}{completion.shiftId}</p></div>{capabilities.canApprove && !completion.reversalOfId && !completion.reversedById && !isOrderStatus(order, "Closed", "Cancelled") && <AppButton variant="danger" onClick={() => open("reverse", completion)}>{tr("Reverse linked completion")}</AppButton>}</div><dl className="grid gap-3 sm:grid-cols-4"><ReadOnlyField label={tr("Accepted good output")}>{formatOrderQuantity(completion.goodOutput)}</ReadOnlyField><ReadOnlyField label={tr("Rejected output")}>{formatOrderQuantity(completion.rejectedOutput)}</ReadOnlyField><ReadOnlyField label={tr("Source reference")}>{completion.sourceReference || "—"}</ReadOnlyField><ReadOnlyField label={tr("Variance / approval reason")}>{completion.varianceReason || "—"}</ReadOnlyField></dl>{completion.materials?.length > 0 && <TableWrap><thead><tr><th>{tr("Component / unit")}</th><th>{tr("Frozen expected partial")}</th><th>{tr("Actual consumed")}</th><th>{tr("Scrap")}</th><th>{tr("Staging returned")}</th></tr></thead><tbody>{completion.materials.map(line => <tr key={line.itemId}><td>{itemLabel(line.itemId)} / {itemLabel.unitLabel?.(line.itemId, line.unitId) ?? tr("Base unit unavailable")}</td>{["expectedQuantity", "consumedQuantity", "scrapQuantity", "returnedQuantity"].map(key => <td key={key}>{formatOrderQuantity(line[key])}</td>)}</tr>)}</tbody></TableWrap>}{completion.reversalOfId && <Notice>{tr("Original quantities are retained on completion")}<a className="underline" href={`#completion-${completion.reversalOfId}`}>#{completion.reversalOfId}</a>{tr(". The linked stock reversal restores only what that event posted.")}</Notice>}</article>)}</div> : <ManufacturingEmpty title={tr("No completion history")} description={tr("Record accepted/rejected partial output and actual material quantities after release.")} />}</ManufacturingCard>
    {command && <OrderCommandModal key={`${command.action}-${command.completion?.id ?? order.id}`} action={command.action} completion={command.completion} context={context} runtime={runtime} onClose={() => setCommand(null)} onSaved={saved} onConflict={resource.reload} />}
  </div>;
}
