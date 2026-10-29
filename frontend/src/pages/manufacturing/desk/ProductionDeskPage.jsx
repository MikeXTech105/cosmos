import { useCallback, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { CalendarDays, CheckCheck, ClipboardList, Clock3, Columns3, Keyboard, LayoutGrid, Plus, RefreshCw, Search } from "lucide-react";
import AppButton from "../../../components/common/AppButton";
import AppInput from "../../../components/common/AppInput";
import AppSelect from "../../../components/common/AppSelect";
import PageHeader from "../../../components/common/PageHeader";
import SubmissionCalendar from "../../../components/common/SubmissionCalendar";
import useCapabilities from "../../../hooks/useCapabilities";
import useProductionRuntime from "../../../hooks/useProductionRuntime";
import useScopedDraft from "../../../hooks/useScopedDraft";
import useUnsavedChanges from "../../../hooks/useUnsavedChanges";
import useSubmissionMonth from "../../../hooks/useSubmissionMonth";
import { getUserScope } from "../../../utils/userScope";
import productionOrderService from "../../../services/manufacturing/productionOrderService";
import { manufacturingReportsService } from "../../../services/reports/manufacturingReportsService";
import { submissionToday, validSubmissionDate } from "../../../utils/submissionCalendar";
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
import "../productionWorkspace.css";

const loadMonthlyProduction = async ({ signal, ...query }) => (await manufacturingReportsService.getProductionHistory(query, { signal })).data;

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
  const [entryDate, setEntryDate] = useState(null), [entryTime, setEntryTime] = useState(null), [entryContextRevision, setEntryContextRevision] = useState(0);
  const suggestedTime = useMemo(() => companyClock(runtime?.browserTimeZone), [runtime?.browserTimeZone]);
  const businessDate = entryDate ?? runtime?.businessDate ?? "", time = entryTime ?? suggestedTime;
  const [chosenMonth, setChosenMonth] = useState(null);
  const calendarMonth = chosenMonth ?? runtime?.businessDate?.slice(0, 7) ?? submissionToday().slice(0, 7);
  const calendar = useSubmissionMonth({ month: calendarMonth, loadPage: loadMonthlyProduction, enabled: access.canView && reportAccess.canView && Boolean(runtime) && view === "grid", scope: `${getUserScope() ?? ""}:${runtime?.companyKey ?? ""}`, revision });
  const draftScope = runtime?.companyKey && getUserScope() ? `${getUserScope()}:${encodeURIComponent(runtime.companyKey)}` : null;
  const [draftState, setDraftState] = useState({ scope: draftScope, rows: {} });
  const drafts = draftState.scope === draftScope ? draftState.rows : {};
  const setDrafts = update => setDraftState(previous => ({ scope: draftScope, rows: typeof update === "function" ? update(previous.scope === draftScope ? previous.rows : {}) : update }));
  const [draftDecision, setDraftDecision] = useState(null), [savedCount, setSavedCount] = useState(0);
  const pendingCount = Object.values(drafts).filter(row => String(row.goodOutput ?? "").trim() || !["", "0"].includes(String(row.rejectedOutput ?? ""))).length;
  const recovery = useScopedDraft({ entity: "production-daily", context: "grid", version: 1, values: { drafts, businessDate, time }, scope: draftScope, enabled: Boolean(draftScope) && pendingCount > 0 });
  const recoverable = draftDecision !== draftScope && recovery.recoveredDraft;
  useUnsavedChanges({ when: pendingCount > 0, message: "Production entries have not been posted. Keep the saved draft and leave?" });
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
  const locked = opening || Boolean(command) || Boolean(readinessError) || !runtime || Boolean(recoverable);
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
  const storeDrafts = next => { setDrafts(next); if (Object.keys(next).length) recovery.saveDraft({ drafts: next, businessDate, time }); else recovery.clearDraft(); };
  const updateDraft = (row, key, value) => storeDrafts({ ...drafts, [row.id]: { goodOutput: "", rejectedOutput: "0", ...drafts[row.id], version: drafts[row.id]?.version ?? row.version, [key]: value } });
  const clearRow = row => { const next = { ...drafts }; delete next[row.id]; storeDrafts(next); setSelection(previous => { const next = new Set(previous); next.delete(String(row.id)); return next; }); };
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
    setSavedCount(value => value + 1);
    calendar.reload();
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
  const changeEntryContext = action => {
    if (pendingCount) { setEntryContextRevision(value => value + 1); setError("Review or explicitly discard the pending entries before changing their date or time."); return; }
    action();
  };
  if (!access.canView) return <Denied />;
  return <div className={`production-workspace${view === "board" ? " is-board" : ""}`}>
    <PageHeader badge="COSMOS / PRODUCTION WORKSPACE" icon={view === "board" ? Columns3 : ClipboardList} title={t(view === "board" ? "Production Kanban" : "Daily production")} description={t(view === "board" ? "See work by stage. Move a card to review the next action." : "Record today's work without opening each order. Review actual materials before saving.")} actions={<><AppButton variant="secondary" disabled={locked || resource.busy} onClick={refresh}><RefreshCw className="h-4 w-4" />{t("Refresh")}</AppButton>{access.canCreate && <Link className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-medium text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2" to="/manufacturing/orders/new"><Plus className="h-4 w-4" />{t("New order")}</Link>}</>} />
    <div className="production-viewbar"><div role="tablist" aria-label={t("Production views")} className="production-view-tabs">{[{ key: "grid", label: "Daily entry", Icon: LayoutGrid }, { key: "board", label: "Kanban board", Icon: Columns3 }].map(({ key, label, Icon }) => <button key={key} type="button" role="tab" id={`${tabId}-${key}-tab`} aria-controls={`${tabId}-panel`} tabIndex={view === key ? 0 : -1} aria-selected={view === key} disabled={Boolean(command) || opening} onClick={() => patch({ view: key === "grid" ? "" : key })} onKeyDown={event => { if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return; event.preventDefault(); const target = event.key === "Home" ? "grid" : event.key === "End" ? "board" : view === "grid" ? "board" : "grid"; patch({ view: target === "grid" ? "" : target }); document.getElementById(`${tabId}-${target}-tab`)?.focus(); }} className="production-view-tab"><Icon size={16} aria-hidden="true" />{t(label)}</button>)}</div><nav className="production-quicklinks" aria-label={t("Production tools")}><Link to="/manufacturing/orders">{t("Order register")}</Link><Link to="/manufacturing/planning">{t("Production planning")}</Link>{reportAccess.canView && <Link to="/reports/manufacturing/operations">{t("Stock & reports")}</Link>}{shipmentAccess.canView && <Link to="/shipments">{t("Dispatch")}</Link>}<details><summary>{t("More tools")}</summary><div className="production-more-menu">{configurationAccess.canView && <Link to="/manufacturing/configuration">{t("Configuration")}</Link>}<Link to="/manufacturing/imports">{t("Import & reconcile")}</Link></div></details></nav></div>
    {(runtimeState.loading || readinessError || !access.canApprove) && <Notice tone={readinessError || !access.canApprove ? "amber" : "blue"}><strong>{t(readinessError ? "Company setup needs attention" : !access.canApprove ? "Read-only access" : "Loading orders…")}</strong><p className="mt-1">{readinessError || (!access.canApprove ? t("You can view work. Production approval permission is required to save entries.") : "Loading the company's date and timezone…")}</p>{readinessError && <AppButton className="mt-3" variant="secondary" onClick={runtimeState.reload}>{t("Retry")}</AppButton>}</Notice>}
    {view === "grid" && <SubmissionCalendar month={calendarMonth} onMonthChange={setChosenMonth} entries={calendar.entries} today={runtime?.businessDate || submissionToday()} selectedDate={businessDate} onSelectDate={date => changeEntryContext(() => { try { assertBusinessDate(date, runtime); setEntryDate(date); setError(""); } catch (failure) { setError(failure.message); } })} isDateDisabled={date => date > runtime?.businessDate || Boolean(runtime?.closedThroughDate && date <= runtime.closedThroughDate)} loading={calendar.loading} error={calendar.error} complete={calendar.complete} onRetry={calendar.reload} title={t("Production submission calendar")} description={t("See which days have saved production and choose a date to record work.")} recordLabel="production entries" emptyLabel="No production entry" disabled={locked || pendingCount > 0} unavailableMessage={!reportAccess.canView ? "Production report access is needed to check saved days. You can still enter production below." : "Load company settings to check production entries."} note="Days with entries show saved production across all orders. A day may still need more entries; dates without production can include non-working days." />}
    {recoverable && <Notice tone="amber"><strong>Saved production draft available</strong><p className="mt-1">{Object.keys(recovery.recoveredDraft.values?.drafts ?? {}).length} entries from {recovery.recoveredDraft.values?.businessDate}. Recover the draft to review and finish saving your work.</p><div className="mt-3 flex gap-2"><AppButton disabled={opening || Boolean(command)} onClick={() => {
      const stored = recovery.recoveredDraft.values;
      setDrafts(stored.drafts ?? {}); setEntryDate(stored.businessDate); setEntryTime(stored.time); setChosenMonth(validSubmissionDate(stored.businessDate) ? stored.businessDate.slice(0, 7) : null); recovery.acknowledgeRecovery(); setDraftDecision(draftScope);
    }}>Recover draft</AppButton><AppButton variant="secondary" disabled={opening || Boolean(command)} onClick={() => { recovery.clearDraft(); setDraftDecision(draftScope); }}>Discard stored draft</AppButton></div></Notice>}
    <ManufacturingCard><div className="production-context-heading"><div className="production-context-title"><span><CalendarDays size={17} aria-hidden="true" /></span><div><h2>{t("Production entry context")}</h2><p>{t("Choose the day and time for the work you are recording.")}</p></div></div><div className="production-entry-steps" aria-label={t("Entry workflow")}><span><b>1</b>{t("Choose day")}</span><span><b>2</b>{t("Enter quantities")}</span><span><b>3</b>{t("Review & save")}</span></div></div><div className="production-context-fields"><AppInput key={`entry-date-${entryContextRevision}`} label={t("Entry date")} type="date" value={businessDate} disabled={Boolean(command) || opening || !runtime || pendingCount > 0} onChange={event => changeEntryContext(() => { const date = event.target.value; setEntryDate(date); if (validSubmissionDate(date)) setChosenMonth(date.slice(0, 7)); })} /><AppInput key={`entry-time-${entryContextRevision}`} label={t("Actual time")} type="time" value={time} disabled={Boolean(command) || opening || !runtime || pendingCount > 0} onChange={event => changeEntryContext(() => setEntryTime(event.target.value))} /><AppButton variant="secondary" disabled={Boolean(command) || opening || !runtime || pendingCount > 0} onClick={() => changeEntryContext(() => setEntryTime(companyClock(runtime.browserTimeZone)))}><Clock3 size={15} aria-hidden="true" />{t("Use current time")}</AppButton>{view === "board" && <form className="production-order-search production-board-search" onSubmit={event => { event.preventDefault(); patch({ search: searchInput.trim(), pageNumber: 1 }); }}><AppInput leadingIcon={Search} label={t("Find an order")} value={searchInput} disabled={Boolean(command) || opening} placeholder={t("Order number or reference")} onChange={event => setSearchInput(event.target.value)} /><AppButton type="submit" variant="secondary" disabled={Boolean(command) || opening}>{t("Search")}</AppButton></form>}</div>{runtime && <div className="production-context-footer"><span><Clock3 size={12} aria-hidden="true" />{runtime.businessTimeZone}</span><span><CheckCheck size={13} aria-hidden="true" />{t("Review quantities and materials before saving.")}</span></div>}</ManufacturingCard>
    {pendingCount > 0 && <p className="text-xs text-amber-700">Review or discard pending entries before changing their date or time.</p>}
    <ManufacturingInlineError message={error || setupMessage(resource.error)} onRetry={resource.error ? resource.reload : undefined} />
    {success && <Notice>{success}</Notice>}
    {opening && <Busy label="Loading the selected order's actual materials…" />}
    {(view === "grid" || pendingCount > 0) && <div className={`production-draft-bar ${pendingCount ? "has-pending" : ""}`} role="status"><div className="production-draft-counts"><ClipboardList size={17} aria-hidden="true" /><span><strong>{pendingCount}</strong> pending · <strong>{command ? 1 : 0}</strong> in review · <strong>{savedCount}</strong> saved this visit</span></div>{pendingCount > 0 && <div className="production-draft-actions"><AppButton variant="secondary" disabled={locked || !recovery.available} onClick={() => recovery.saveDraft()}>Keep draft</AppButton><AppButton variant="ghost" disabled={opening || Boolean(command)} onClick={() => { if (window.confirm("Discard all typed production entries? Saved production is unchanged.")) { setDrafts({}); setSelection(new Set()); recovery.clearDraft(); } }}>Discard typed entries</AppButton></div>}{recovery.storageError && <p className="production-draft-storage-error">{recovery.storageError}</p>}</div>}

    <div role="tabpanel" id={`${tabId}-panel`} aria-labelledby={`${tabId}-${view}-tab`}>{!runtime ? <ManufacturingEmpty title={t(runtimeState.loading ? "Loading orders…" : "Company setup needs attention")} description={readinessError || "Load the company's business date and timezone to show daily work."} /> : view === "board" ? <ProductionKanban search={search} revision={revision} canApprove={access.canApprove} locked={locked} onAction={open} onMove={move} /> : <ManufacturingCard title={t("Daily entry")} actions={access.canApprove && <AppButton disabled={locked || resource.busy || Boolean(resource.error) || !selection.size} onClick={reviewSelected}>{t("Review selected")} ({selection.size})</AppButton>}>
      <div className="production-filters"><form className="production-order-search" onSubmit={event => { event.preventDefault(); patch({ search: searchInput.trim(), pageNumber: 1 }); }}><AppInput leadingIcon={Search} label={t("Find an order")} value={searchInput} disabled={Boolean(command) || opening} placeholder={t("Order number or reference")} onChange={event => setSearchInput(event.target.value)} /><AppButton type="submit" variant="secondary" disabled={Boolean(command) || opening}>{t("Search")}</AppButton></form><div className="production-order-status"><AppSelect label={t("Show orders")} value={status} disabled={Boolean(command) || opening} onChange={value => patch({ status: value, pageNumber: 1 })} options={[{ value: "", label: t("All orders") }, ...lanes.map(lane => ({ value: String(lane.status), label: t(lane.label) }))]} /></div></div>
      <p className="production-grid-help"><Keyboard size={14} aria-hidden="true" />{t("Tip: paste accepted/rejected columns from a sheet. Enter moves down; Tab moves across.")}</p>
      {resource.busy ? <Busy /> : resource.error ? <ManufacturingEmpty title={t("Orders could not be loaded")} description={t("Check the setup message above and retry to load your orders.")} /> : !rows.length ? <ManufacturingEmpty title={t("No matching orders")} description={t("Try another status or search. Create an order if work has not been planned yet.")} /> : <DailyProductionGrid rows={rows} drafts={drafts} selected={selection} labels={labels} canApprove={access.canApprove} locked={locked} onChange={updateDraft} onSelect={(row, checked) => setSelection(previous => { const next = new Set(previous); if (checked) next.add(String(row.id)); else next.delete(String(row.id)); return next; })} onReview={row => { queue.current = []; void open(row, "complete", true); }} onRelease={row => { queue.current = []; void open(row, "release"); }} onClear={clearRow} onPaste={(event, row, column) => {
        const text = event.clipboardData.getData("text");
        if (!/[\t\n]/.test(text)) return;
        event.preventDefault();
        try { storeDrafts(pasteQuantities(rows, row, column, text, drafts)); setError(""); } catch (failure) { setError(failure.message); }
      }} />}
      {!resource.error && <OrderPager page={{ ...page, pageSize }} disabled={resource.busy || locked} onChange={number => patch({ pageNumber: number })} onPageSizeChange={size => patch({ pageSize: size, pageNumber: 1 })} />}
    </ManufacturingCard>}</div>
    {selection.size > 0 && <p className="text-xs text-slate-500">{selection.size} {t("entries to review")}. {t("Each entry saves separately. If a result is unknown, review it before continuing.")}</p>}
    {command && <OrderCommandModal key={`${command.context.order.id}:${command.action}`} action={command.action} context={command.context} runtime={runtime} initialCompletion={command.initialCompletion} onClose={close} onSaved={saved} onConflict={recover} />}
  </div>;
}
