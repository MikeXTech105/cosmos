import { useCallback, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { ClipboardList, Columns3, LayoutGrid, Plus, RefreshCw } from "lucide-react";
import AppButton from "../../../components/common/AppButton";
import AppInput from "../../../components/common/AppInput";
import AppSelect from "../../../components/common/AppSelect";
import PageHeader from "../../../components/common/PageHeader";
import useCapabilities from "../../../hooks/useCapabilities";
import useProductionRuntime from "../../../hooks/useProductionRuntime";
import productionOrderService from "../../../services/manufacturing/productionOrderService";
import { ManufacturingCard, ManufacturingEmpty, ManufacturingInlineError } from "../ManufacturingShared";
import { Busy, Denied, Notice, OrderPager } from "../orders/OrderShared";
import { useAsyncResource, useItemLabels, useOrderCapabilities } from "../orders/orderHooks";
import { isOrderStatus, normalizeOrderPage, productionError } from "../orders/orderHelpers";
import { assertBusinessDate, dateTimeOffset } from "../../../utils/productionValues";
import OrderCommandModal from "../orders/OrderCommandModal";
import DailyProductionGrid from "./DailyProductionGrid";
import ProductionKanban from "./ProductionKanban";
import { companyClock, completionSeed, lanes, pasteQuantities, setupMessage, transitionAction } from "./deskHelpers";
import { deskText as t } from "./deskText";

export default function ProductionDeskPage() {
  const access = useOrderCapabilities(), runtimeState = useProductionRuntime(), runtime = runtimeState.runtime;
  const reportAccess = useCapabilities({ pageName: "Manufacturing.Reports", route: "/reports/manufacturing", resource: "Manufacturing.Reports" });
  const shipmentAccess = useCapabilities({ pageName: "ShipmentOperations.Shipments", route: "/shipments", resource: "shipments" });
  const configurationAccess = useCapabilities({ pageName: "Manufacturing.Configuration", route: "/manufacturing/configuration", resource: "Manufacturing.Configuration" });
  const [params] = useSearchParams(), location = useLocation(), navigate = useNavigate();
  const view = location.pathname === "/manufacturing/board" || params.get("view") === "board" ? "board" : "grid";
  const tabId = useId();
  const search = params.get("search") || "", status = params.get("status") || "";
  const pageNumber = Number(params.get("pageNumber")) || 1, pageSize = Number(params.get("pageSize")) || 20;
  const [searchInput, setSearchInput] = useState(search), [revision, setRevision] = useState(0);
  const [entryDate, setEntryDate] = useState(null), [entryTime, setEntryTime] = useState(null);
  const suggestedTime = useMemo(() => companyClock(runtime?.browserTimeZone), [runtime?.browserTimeZone]);
  const businessDate = entryDate ?? runtime?.businessDate ?? "", time = entryTime ?? suggestedTime;
  const [drafts, setDrafts] = useState({});
  const selectionScope = JSON.stringify([location.pathname, params.toString(), runtime?.companyKey, access.canView, access.canApprove]);
  const [selectedState, setSelectedState] = useState({ scope: selectionScope, ids: new Set() });
  const selection = selectedState.scope === selectionScope ? selectedState.ids : new Set();
  const setSelection = update => setSelectedState(previous => ({ scope: selectionScope, ids: typeof update === "function" ? update(previous.scope === selectionScope ? previous.ids : new Set()) : update }));
  const [command, setCommand] = useState(null), [opening, setOpening] = useState(false), [error, setError] = useState(""), [success, setSuccess] = useState("");
  const openLock = useRef(false), queue = useRef([]), commandRef = useRef(null);
  const query = JSON.stringify({ search, status, pageNumber, pageSize, revision });
  const load = useCallback(({ signal } = {}) => {
    const filters = JSON.parse(query);
    delete filters.revision;
    return productionOrderService.list(filters, { signal });
  }, [query]);
  const resource = useAsyncResource(load, access.canView && view === "grid" && Boolean(runtime));
  const page = normalizeOrderPage(resource.data), rows = page.items;
  const labels = useItemLabels(access.canView ? rows.map(row => row.itemId) : []);
  const readinessError = runtimeState.error ? setupMessage(runtimeState.error) : runtime && (!runtime.businessDate || !suggestedTime) ? "The company business date or timezone is unavailable. Ask your administrator to complete company setup." : "";
  const locked = opening || Boolean(command) || Boolean(readinessError) || !runtime;
  const readScope = useRef(null), pendingRead = useRef(null);
  const readScopeKey = JSON.stringify([location.pathname, params.toString(), access.canView, access.canApprove, runtime?.companyKey, runtime?.businessDate, runtime?.browserTimeZone, readinessError]);
  useLayoutEffect(() => {
    readScope.current = readScopeKey;
    return () => { readScope.current = null; pendingRead.current?.abort(); queue.current = []; };
  }, [readScopeKey]);
  const patch = changes => {
    if (commandRef.current || openLock.current) { setError(t("An entry is still being reviewed. Finish or recover it before opening another.")); return; }
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([key, value]) => value ? next.set(key, String(value)) : next.delete(key));
    const switching = Object.prototype.hasOwnProperty.call(changes, "view");
    const pathname = switching ? changes.view === "board" ? "/manufacturing/board" : "/manufacturing/daily" : location.pathname;
    if (switching) next.delete("view");
    navigate({ pathname, search: next.toString() }); setSelection(new Set()); setError("");
  };
  const updateDraft = (row, key, value) => setDrafts(previous => ({ ...previous, [row.id]: { goodOutput: "", rejectedOutput: "0", ...previous[row.id], version: previous[row.id]?.version ?? row.version, [key]: value } }));
  const clearRow = row => { setDrafts(previous => { const next = { ...previous }; delete next[row.id]; return next; }); setSelection(previous => { const next = new Set(previous); next.delete(String(row.id)); return next; }); };
  const open = async (row, action, fromGrid = false) => {
    if (openLock.current || commandRef.current || !access.canApprove) return;
    if (!runtime || readinessError) { setError(readinessError || "Load the company setup before recording work."); return; }
    openLock.current = true; setOpening(true); setError(""); setSuccess("");
    const controller = new AbortController(), startedScope = readScope.current;
    pendingRead.current = controller;
    try {
      assertBusinessDate(businessDate, runtime);
      const result = await productionOrderService.context(row.id, { signal: controller.signal });
      if (controller.signal.aborted || startedScope !== readScope.current) return;
      const context = result.data;
      if (!context?.order || String(context.order.id) !== String(row.id)) throw new Error("The selected order context could not be verified.");
      if (row.version && context.order.version !== row.version) throw new Error("This order changed. Refresh and review your entry against the latest remainder.");
      if (action === "release" && !isOrderStatus(context.order, "Draft")) throw new Error("This order is no longer a draft. Refresh its saved status before approval.");
      let initialCompletion;
      if (action === "complete") {
        if (!isOrderStatus(context.order, "Released", "InProgress")) throw new Error("This order is no longer open for production. Refresh its saved status.");
        initialCompletion = fromGrid ? completionSeed(context.order, drafts[row.id], businessDate, time, runtime) : { businessDate, occurredAt: dateTimeOffset(businessDate, time, runtime.browserTimeZone) };
      }
      const next = { action, context, initialCompletion };
      commandRef.current = next; setCommand(next);
    } catch (failure) { queue.current = []; if (!controller.signal.aborted && startedScope === readScope.current) setError(productionError(failure)); }
    finally { if (pendingRead.current === controller) { pendingRead.current = null; openLock.current = false; if (readScope.current !== null) setOpening(false); } }
  };
  const reviewSelected = () => {
    if (locked || !selection.size) return;
    try {
      const selected = rows.filter(row => selection.has(String(row.id)));
      if (!selected.length) throw new Error("Select visible entries to review.");
      selected.forEach(row => completionSeed(row, drafts[row.id], businessDate, time, runtime));
      queue.current = selected.slice(1);
      void open(selected[0], "complete", true);
    } catch (failure) { setError(failure.message); }
  };
  const close = () => { queue.current = []; commandRef.current = null; setCommand(null); };
  const inspect = async () => {
    const id = commandRef.current?.context.order.id;
    if (!id) return null;
    try {
      const current = (await productionOrderService.context(id)).data;
      if (!current?.order || String(current.order.id) !== String(id)) return null;
      return current;
    } catch { return null; }
  };
  const saved = async () => {
    const current = await inspect();
    if (!current) return false;
    if (view === "grid" && !await resource.reload()) return false;
    if (view === "board") setRevision(value => value + 1);
    clearRow(current.order);
    commandRef.current = null; setCommand(null); setSuccess(t("Entry saved. The remaining quantity has been refreshed."));
    const next = queue.current.shift();
    if (next) void open(next, "complete", true);
    return true;
  };
  const move = (row, target) => {
    try { const action = transitionAction(row, target); if (action) void open(row, action); }
    catch (failure) { setError(failure.message); }
  };
  const recover = async () => {
    const current = await inspect();
    if (!current || view === "grid" && !await resource.reload()) return null;
    if (view === "board") setRevision(value => value + 1);
    setSelection(new Set());
    setSuccess("Saved order context has been reloaded. Review its quantities before a new entry.");
    return current;
  };
  const refresh = () => { setError(""); setSelection(new Set()); runtimeState.reload(); setRevision(value => value + 1); };
  if (!access.canView) return <Denied />;
  return <div className="min-w-0 space-y-5">
    <PageHeader icon={view === "board" ? Columns3 : ClipboardList} title={t(view === "board" ? "Production Kanban" : "Daily production")} description={t(view === "board" ? "See work by stage. Move a card to review the next action." : "Record today's work without opening each order. Review actual materials before saving.")} actions={<><AppButton variant="secondary" disabled={locked || resource.busy} onClick={refresh}><RefreshCw className="h-4 w-4" />{t("Refresh")}</AppButton>{access.canCreate && <Link className="inline-flex h-11 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-medium text-white" to="/manufacturing/orders/new"><Plus className="h-4 w-4" />{t("New order")}</Link>}</>} />
    <div className="flex flex-wrap items-center justify-between gap-4"><div role="tablist" aria-label={t("Production views")} className="inline-flex rounded-xl border border-slate-200 bg-white p-1">{[{ key: "grid", label: "Daily entry", Icon: LayoutGrid }, { key: "board", label: "Kanban board", Icon: Columns3 }].map(({ key, label, Icon }) => <button key={key} role="tab" id={`${tabId}-${key}-tab`} aria-controls={`${tabId}-panel`} tabIndex={view === key ? 0 : -1} aria-selected={view === key} disabled={Boolean(command) || opening} onClick={() => patch({ view: key === "grid" ? "" : key })} onKeyDown={event => { if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return; event.preventDefault(); const target = event.key === "Home" ? "grid" : event.key === "End" ? "board" : view === "grid" ? "board" : "grid"; patch({ view: target === "grid" ? "" : target }); document.getElementById(`${tabId}-${target}-tab`)?.focus(); }} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 ${view === key ? "bg-brand/10 text-brand" : "text-slate-500 hover:bg-slate-50"}`}><Icon className="h-4 w-4" />{t(label)}</button>)}</div><div className="flex flex-wrap gap-4 text-sm text-brand"><Link to="/manufacturing/orders">{t("Order register")}</Link><Link to="/manufacturing/planning">{t("Production planning")}</Link>{reportAccess.canView && <Link to="/reports/manufacturing/operations">{t("Stock & reports")}</Link>}{shipmentAccess.canView && <Link to="/shipments">{t("Dispatch")}</Link>}<details className="relative"><summary className="cursor-pointer">{t("More tools")}</summary><div className="absolute right-0 z-10 mt-2 min-w-48 space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-lg">{configurationAccess.canView && <Link className="block" to="/manufacturing/configuration">{t("Configuration")}</Link>}<Link className="block" to="/manufacturing/imports">{t("Import & reconcile")}</Link></div></details></div></div>
    {(runtimeState.loading || readinessError || !access.canApprove) && <Notice tone={readinessError || !access.canApprove ? "amber" : "blue"}><strong>{t(readinessError ? "Company setup needs attention" : !access.canApprove ? "Read-only access" : "Loading orders…")}</strong><p className="mt-1">{readinessError || (!access.canApprove ? t("You can view work. Production approval permission is required to save entries.") : "Loading the company's date and timezone…")}</p>{readinessError && <AppButton className="mt-3" variant="secondary" onClick={runtimeState.reload}>{t("Retry")}</AppButton>}</Notice>}
    <ManufacturingCard><div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-5"><AppInput label={t("Entry date")} type="date" value={businessDate} disabled={Boolean(command) || opening || !runtime} onChange={event => setEntryDate(event.target.value)} /><AppInput label={t("Actual time")} type="time" value={time} disabled={Boolean(command) || opening || !runtime} onChange={event => setEntryTime(event.target.value)} /><div className="flex items-end"><AppButton variant="secondary" disabled={Boolean(command) || opening || !runtime} onClick={() => setEntryTime(companyClock(runtime.browserTimeZone))}>{t("Use current time")}</AppButton></div><form className={`flex items-end gap-2 ${view === "board" ? "xl:col-span-2" : ""}`} onSubmit={event => { event.preventDefault(); patch({ search: searchInput.trim(), pageNumber: 1 }); }}><AppInput label={t("Find an order")} value={searchInput} disabled={Boolean(command) || opening} placeholder={t("Order number or reference")} onChange={event => setSearchInput(event.target.value)} /><AppButton type="submit" variant="secondary" disabled={Boolean(command) || opening}>{t("Search")}</AppButton></form>{view === "grid" && <AppSelect label={t("Show orders")} value={status} disabled={Boolean(command) || opening} onChange={value => patch({ status: value, pageNumber: 1 })} options={[{ value: "", label: t("All orders") }, ...lanes.map(lane => ({ value: String(lane.status), label: t(lane.label) }))]} />}</div>{runtime && <p className="px-5 pb-4 text-xs text-slate-500">{runtime.businessTimeZone} · {t("This is a live work view, not a stock adjustment sheet. Accepted/rejected values are reviewed before any posting.")}</p>}</ManufacturingCard>
    <ManufacturingInlineError message={error || setupMessage(resource.error)} onRetry={resource.error ? resource.reload : undefined} />
    {success && <Notice>{success}</Notice>}
    {opening && <Busy label="Loading the selected order's actual materials…" />}
    <div role="tabpanel" id={`${tabId}-panel`} aria-labelledby={`${tabId}-${view}-tab`}>{!runtime ? <ManufacturingEmpty title={t(runtimeState.loading ? "Loading orders…" : "Company setup needs attention")} description={readinessError || "Load the company's business date and timezone to show daily work."} /> : view === "board" ? <ProductionKanban search={search} revision={revision} canApprove={access.canApprove} locked={locked} onAction={open} onMove={move} /> : <ManufacturingCard title={t("Daily entry")} actions={access.canApprove && <AppButton disabled={locked || resource.busy || Boolean(resource.error) || !selection.size} onClick={reviewSelected}>{t("Review selected")} ({selection.size})</AppButton>}>
      <p className="px-5 py-3 text-xs text-slate-500">{t("Tip: paste accepted/rejected columns from a sheet. Enter moves down; Tab moves across.")}</p>
      {resource.busy ? <Busy /> : resource.error ? <ManufacturingEmpty title={t("Orders could not be loaded")} description={t("Review the setup message, then retry. A failed read does not mean there are no orders.")} /> : !rows.length ? <ManufacturingEmpty title={t("No matching orders")} description={t("Try another status or search. Create an order if work has not been planned yet.")} /> : <DailyProductionGrid rows={rows} drafts={drafts} selected={selection} labels={labels} canApprove={access.canApprove} locked={locked} onChange={updateDraft} onSelect={(row, checked) => setSelection(previous => { const next = new Set(previous); if (checked) next.add(String(row.id)); else next.delete(String(row.id)); return next; })} onReview={row => { queue.current = []; void open(row, "complete", true); }} onRelease={row => { queue.current = []; void open(row, "release"); }} onClear={clearRow} onPaste={(event, row, column) => {
        const text = event.clipboardData.getData("text");
        if (!/[\t\n]/.test(text)) return;
        event.preventDefault();
        try { setDrafts(pasteQuantities(rows, row, column, text, drafts)); setError(""); } catch (failure) { setError(failure.message); }
      }} />}
      {!resource.error && <OrderPager page={{ ...page, pageSize }} disabled={resource.busy || locked} onChange={number => patch({ pageNumber: number })} onPageSizeChange={size => patch({ pageSize: size, pageNumber: 1 })} />}
    </ManufacturingCard>}</div>
    {selection.size > 0 && <p className="text-xs text-slate-500">{selection.size} {t("entries to review")}. {t("Each entry saves separately. If a result is unknown, review it before continuing.")}</p>}
    {command && <OrderCommandModal key={`${command.context.order.id}:${command.action}`} action={command.action} context={command.context} runtime={runtime} initialCompletion={command.initialCompletion} onClose={close} onSaved={saved} onConflict={recover} />}
  </div>;
}
