import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import AppButton from "../../../components/common/AppButton";
import AppSelect from "../../../components/common/AppSelect";
import productionOrderService from "../../../services/manufacturing/productionOrderService";
import { useItemLabels } from "../orders/orderHooks";
import { normalizeOrderPage, productionError } from "../orders/orderHelpers";
import { lanes, primaryAction, setupMessage } from "./deskHelpers";
import { deskText as t } from "./deskText";

function OrderCard({ row, labels, canApprove, locked, onAction, onMove }) {
  const [destination, setDestination] = useState("");
  const action = primaryAction(row);
  const canMove = canApprove && !locked && ![5, 6].includes(Number(row.status));
  const targets = lanes.filter(lane => lane.status !== Number(row.status) && (
    Number(row.status) === 1 && lane.status === 2 || [2, 3].includes(Number(row.status)) && [3, 4].includes(lane.status) || [5, 6].includes(lane.status)
  ));
  return <article draggable={canMove} onDragStart={event => { event.dataTransfer.setData("application/x-cosmos-production-order", JSON.stringify({ id: row.id, status: row.status })); event.dataTransfer.effectAllowed = "move"; }} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
    <div><Link className="text-sm font-semibold text-slate-900 hover:text-brand" to={`/manufacturing/orders/${row.id}`}>{labels(row.itemId)}</Link><p className="mt-1 text-xs text-slate-500">{row.orderNumber}</p></div>
    <div className="flex items-center justify-between gap-3 text-sm"><span className="text-slate-500">{t("Remaining")}</span><strong className="tabular-nums">{row.remainingQuantity ?? "—"} <span className="text-xs font-normal">{labels.unitLabel?.(row.itemId, row.unitId) ?? ""}</span></strong></div>
    <p className="text-xs text-slate-500">{t("Due")} {row.dueDate}</p>
    {action && canApprove ? <AppButton className="w-full" disabled={locked} onClick={() => onAction(row, action)}>{t(action === "release" ? "Approve release" : "Record production")}</AppButton> : <Link className="block text-sm text-brand underline" to={`/manufacturing/orders/${row.id}`}>{t("Review order")}</Link>}
    {canMove && <div className="flex items-end gap-2 border-t border-slate-100 pt-3"><div className="min-w-0 flex-1"><AppSelect label={`${t("Move order")} ${row.orderNumber}`} value={destination} onChange={setDestination} options={[{ value: "", label: t("Move order") }, ...targets.map(lane => ({ value: String(lane.status), label: t(lane.label) }))]} /></div><AppButton variant="secondary" disabled={!destination} onClick={() => { onMove(row, Number(destination)); setDestination(""); }}>{t("Move")}</AppButton></div>}
  </article>;
}

function KanbanLane({ lane, search, revision, canApprove, locked, onAction, onMove }) {
  const scope = `${lane.status}:${search}:${revision}`;
  const [state, setState] = useState({ scope: "", items: [], totalCount: 0, page: 0, busy: true, error: "" });
  const active = useRef({ sequence: 0, busy: false, controller: null });
  const read = useCallback(async pageNumber => {
    if (active.current.busy) return;
    const token = ++active.current.sequence;
    const controller = new AbortController();
    active.current.controller = controller; active.current.busy = true;
    setState(previous => ({ ...(pageNumber === 1 || previous.scope !== scope ? { items: [], totalCount: 0, page: 0 } : previous), scope, attempt: pageNumber, busy: true, error: "" }));
    try {
      const response = await productionOrderService.list({ status: lane.status, search: search || undefined, pageNumber, pageSize: 12 }, { signal: controller.signal });
      if (token !== active.current.sequence || controller.signal.aborted) return;
      const result = normalizeOrderPage(response);
      setState(previous => {
        const items = pageNumber === 1 ? result.items : [...previous.items, ...result.items];
        return { scope, items: [...new Map(items.map(row => [String(row.id), row])).values()], totalCount: result.totalCount, page: pageNumber, attempt: pageNumber, busy: false, error: "" };
      });
    } catch (error) {
      if (token === active.current.sequence && !controller.signal.aborted) setState(previous => ({ ...previous, scope, busy: false, error: setupMessage(productionError(error)) }));
    } finally { if (token === active.current.sequence) active.current.busy = false; }
  }, [scope, lane.status, search]);
  useEffect(() => {
    void read(1);
    const request = active.current;
    return () => { request.sequence++; request.controller?.abort(); request.busy = false; };
  }, [read]);
  const current = state.scope === scope ? state : { items: [], totalCount: 0, busy: true, error: "" };
  const labels = useItemLabels(current.items.map(row => row.itemId));
  return <section data-kanban-status={lane.status} aria-label={t(lane.label)} className={`w-80 shrink-0 rounded-2xl border border-slate-200 border-t-4 bg-slate-50/80 ${lane.tone}`} onDragOver={event => { if (canApprove && !locked && !current.error && !current.busy) event.preventDefault(); }} onDrop={event => {
    event.preventDefault();
    if (!canApprove || locked || current.error || current.busy) return;
    try { const source = JSON.parse(event.dataTransfer.getData("application/x-cosmos-production-order")); if (/^[1-9]\d*$/.test(String(source.id))) onMove(source, lane.status); } catch { /* Ignore unrelated dragged content. */ }
  }}>
    <header className="flex items-center justify-between gap-3 p-4"><h2 className="font-semibold text-slate-800">{t(lane.label)}</h2><span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">{current.error || current.busy && !current.items.length ? "—" : current.totalCount}</span></header>
    <div className="space-y-3 p-3 pt-0">{current.error && <div role="alert" className="space-y-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800"><p>{current.error}</p><AppButton variant="secondary" disabled={current.busy} onClick={() => read(state.attempt || 1)}>{t("Retry")}</AppButton></div>}{current.items.map(row => <OrderCard key={row.id} row={row} labels={labels} canApprove={canApprove} locked={locked || Boolean(current.error) || current.busy} onAction={onAction} onMove={onMove} />)}
      {current.busy && <p role="status" className="p-3 text-sm text-slate-500">{t("Loading orders…")}</p>}
      {!current.busy && !current.error && !current.items.length && <p className="rounded-xl border border-dashed border-slate-200 p-5 text-center text-sm text-slate-500">{t("No orders in this column")}</p>}
      {!current.error && current.items.length > 0 && <p className="px-1 text-xs text-slate-500">{current.items.length} {t("shown of")} {current.totalCount} {t("orders")}</p>}
      {current.items.length < current.totalCount && <AppButton className="w-full" variant="secondary" disabled={current.busy || Boolean(current.error)} onClick={() => read(state.page + 1)}>{t("Load more")}</AppButton>}
    </div>
  </section>;
}

export default function ProductionKanban(props) {
  const board = useRef(null);
  return <div className="min-w-0 space-y-3"><p className="text-sm text-slate-500">{t("Drag a card or choose Move to open the required review. Columns change only after a successful server read.")}</p><nav aria-label={t("Jump to column")} className="flex flex-wrap gap-2">{lanes.map(lane => <button key={lane.status} type="button" onClick={() => board.current?.querySelector(`[data-kanban-status="${lane.status}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" })} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-brand hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30">{t(lane.label)}</button>)}</nav><div ref={board} className="flex max-w-full gap-4 overflow-x-auto pb-4" aria-label={t("Kanban board")}>{lanes.map(lane => <KanbanLane key={lane.status} lane={lane} {...props} />)}</div></div>;
}
