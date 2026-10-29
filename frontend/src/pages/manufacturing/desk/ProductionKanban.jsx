import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, GripVertical, Layers3, MousePointer2 } from "lucide-react";
import AppButton from "../../../components/common/AppButton";
import AppSelect from "../../../components/common/AppSelect";
import productionOrderService from "../../../services/manufacturing/productionOrderService";
import { useItemLabels } from "../orders/orderHooks";
import { normalizeOrderPage, productionError } from "../orders/orderHelpers";
import { lanes, primaryAction, setupMessage } from "./deskHelpers";
import { deskText as t } from "./deskText";

const laneColors = { 1: "#94a3b8", 2: "#3b82f6", 3: "#f59e0b", 4: "#10b981", 5: "#64748b", 6: "#f87171" };

function OrderCard({ row, labels, canApprove, locked, onAction, onMove }) {
  const [destination, setDestination] = useState("");
  const action = primaryAction(row);
  const canMove = canApprove && !locked && ![5, 6].includes(Number(row.status));
  const targets = lanes.filter(lane => lane.status !== Number(row.status) && (
    Number(row.status) === 1 && lane.status === 2 || [2, 3].includes(Number(row.status)) && [3, 4].includes(lane.status) || [5, 6].includes(lane.status)
  ));
  return <article draggable={canMove} onDragStart={event => { event.dataTransfer.setData("application/x-cosmos-production-order", JSON.stringify({ id: row.id, status: row.status })); event.dataTransfer.effectAllowed = "move"; }} className="production-kanban-card">
    <div className="production-card-header"><div><span className="production-card-reference">{row.orderNumber}</span><Link className="production-card-item" to={`/manufacturing/orders/${row.id}`}>{labels(row.itemId)}</Link></div>{canMove && <GripVertical size={16} className="shrink-0 text-slate-300" aria-hidden="true" />}</div>
    <div className="production-card-progress"><span>{t("Remaining")}</span><strong>{row.remainingQuantity ?? "—"}<small>{labels.unitLabel?.(row.itemId, row.unitId) ?? ""}</small></strong></div>
    <p className="production-card-due"><CalendarDays size={13} aria-hidden="true" />{t("Due")} {row.dueDate}</p>
    {action && canApprove ? <AppButton className="w-full" disabled={locked} onClick={() => onAction(row, action)}>{t(action === "release" ? "Approve release" : "Record production")}</AppButton> : <Link className="block text-sm text-brand underline" to={`/manufacturing/orders/${row.id}`}>{t("Review order")}</Link>}
    {canMove && <div className="production-card-move"><div><AppSelect label={`${t("Move order")} ${row.orderNumber}`} value={destination} onChange={setDestination} options={[{ value: "", label: t("Move order") }, ...targets.map(lane => ({ value: String(lane.status), label: t(lane.label) }))]} /></div><AppButton variant="secondary" disabled={!destination} onClick={() => { onMove(row, Number(destination)); setDestination(""); }}>{t("Move")}</AppButton></div>}
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
  return <section data-kanban-status={lane.status} aria-label={t(lane.label)} className="production-kanban-lane" style={{ "--lane-color": laneColors[lane.status] }} onDragOver={event => { if (canApprove && !locked && !current.error && !current.busy) event.preventDefault(); }} onDrop={event => {
    event.preventDefault();
    if (!canApprove || locked || current.error || current.busy) return;
    try { const source = JSON.parse(event.dataTransfer.getData("application/x-cosmos-production-order")); if (/^[1-9]\d*$/.test(String(source.id))) onMove(source, lane.status); } catch { /* Ignore unrelated dragged content. */ }
  }}>
    <header className="production-lane-head"><h2 className="production-lane-title">{t(lane.label)}</h2><span className="production-lane-count">{current.error || current.busy && !current.items.length ? "—" : current.totalCount}</span></header>
    <div className="space-y-3 p-3 pt-0">{current.error && <div role="alert" className="space-y-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800"><p>{current.error}</p><AppButton variant="secondary" disabled={current.busy} onClick={() => read(state.attempt || 1)}>{t("Retry")}</AppButton></div>}{current.items.map(row => <OrderCard key={row.id} row={row} labels={labels} canApprove={canApprove} locked={locked || Boolean(current.error) || current.busy} onAction={onAction} onMove={onMove} />)}
      {current.busy && <div role="status" className="space-y-3" aria-label={t("Loading orders…")}>{!current.items.length && [0, 1].map(index => <div key={index} className="h-40 animate-pulse rounded-xl border border-slate-200 bg-white/80" />)}<p className="p-3 text-xs text-slate-500">{t("Loading orders…")}</p></div>}
      {!current.busy && !current.error && !current.items.length && <div className="production-lane-empty"><Layers3 size={22} aria-hidden="true" /><p>{t("No orders in this column")}</p></div>}
      {!current.error && current.items.length > 0 && <p className="px-1 text-xs text-slate-500">{current.items.length} {t("shown of")} {current.totalCount} {t("orders")}</p>}
      {current.items.length < current.totalCount && <AppButton className="w-full" variant="secondary" disabled={current.busy || Boolean(current.error)} onClick={() => read(state.page + 1)}>{t("Load more")}</AppButton>}
    </div>
  </section>;
}

export default function ProductionKanban(props) {
  const board = useRef(null);
  return <div className="min-w-0 space-y-3"><p className="production-kanban-intro"><MousePointer2 size={15} className="shrink-0" aria-hidden="true" />{t("Drag a card or choose Move to review the next action before saving.")}</p><nav aria-label={t("Jump to column")} className="production-kanban-jumps">{lanes.map(lane => <button key={lane.status} type="button" style={{ "--lane-color": laneColors[lane.status] }} onClick={() => board.current?.querySelector(`[data-kanban-status="${lane.status}"]`)?.scrollIntoView({ behavior: globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "nearest", inline: "start" })} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30">{t(lane.label)}</button>)}</nav><div ref={board} className="production-kanban-board" aria-label={t("Kanban board")}>{lanes.map(lane => <KanbanLane key={lane.status} lane={lane} {...props} />)}</div></div>;
}
