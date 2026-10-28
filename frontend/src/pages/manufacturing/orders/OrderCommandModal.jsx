import { orderText as tr } from "./orderText";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import AppButton from "../../../components/common/AppButton";
import AppInput from "../../../components/common/AppInput";
import AppModal from "../../../components/common/AppModal";
import CompletionEntryFields from "./CompletionEntryFields";
import productionOrderService from "../../../services/manufacturing/productionOrderService";
import { productionWorkspaceService } from "../../../services/manufacturing/productionWorkspaceService";
import { getApiFieldErrors, isConflictError } from "../../../utils/apiError";
import { ManufacturingInlineError } from "../ManufacturingShared";
import { Busy, Notice, TableWrap } from "./OrderShared";
import { useAsyncResource, useItemLabels, useOrderCapabilities, useOrderLookupAccess } from "./orderHooks";
import { addQuantity, buildCompletionPayload, commandIdentity, compareQuantity, completionMaterialPreview, formatOrderQuantity, isBusinessDate, isOrderStatus, materialEstimate, productionError, quantity } from "./orderHelpers";
const labels = {
  release: "Approve release",
  complete: "Record partial completion",
  amend: "Approve released amendment",
  close: "Short close remainder",
  cancel: "Cancel remainder",
  reverse: "Reverse linked completion"
};
export default function OrderCommandModal({
  action,
  completion,
  context,
  runtime,
  initialCompletion,
  onClose,
  onSaved,
  onConflict
}) {
  const order = context.order,
    materials = context.materials ?? [];
  const [openedVersion] = useState(order.version);
  const contextChanged = openedVersion !== order.version;
  const canApprove = useOrderCapabilities().canApprove;
  const [form, setForm] = useState(() => ({
    quantity: String(order.plannedQuantity ?? ""),
    plannedQuantity: String(order.plannedQuantity ?? ""),
    releasedQuantity: String(order.releasedQuantity ?? ""),
    plannedStart: order.plannedStart,
    dueDate: order.dueDate,
    reason: "",
    sourcePlanId: order.sourcePlanId ?? "",
    businessDate: initialCompletion?.businessDate ?? runtime?.businessDate ?? "",
    occurredAt: initialCompletion?.occurredAt ?? "",
    goodOutput: initialCompletion?.goodOutput ?? "",
    rejectedOutput: initialCompletion?.rejectedOutput ?? "0",
    varianceReason: "",
    sourceReference: "",
    materials: materials.map(() => ({
      consumedQuantity: "",
      scrapQuantity: "0",
      returnedQuantity: "0"
    }))
  }));
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [fields, setFields] = useState({}),
    [uncertain, setUncertain] = useState(false),
    [blocked, setBlocked] = useState(false);
  const [sourceFilters, setSourceFilters] = useState({ demandFrom: "", demandTo: "", freshnessDays: "30" });
  const [sourceBusy, setSourceBusy] = useState(false), [sourceResult, setSourceResult] = useState(null);
  const inFlight = useRef(false),
    identity = useRef(null);
  const itemLabel = useItemLabels([order.itemId, ...materials.map(line => line.itemId)]);
  const lookupAccess = useOrderLookupAccess();
  const loadBom = useCallback(({ signal } = {}) => productionOrderService.bom(order.bomId, { signal }), [order.bomId]);
  const bomResource = useAsyncResource(loadBom, action === "release" && lookupAccess.boms && canApprove);
  const materialPreview = completionMaterialPreview(order, materials, context.completions, form);
  const set = (key, value) => setForm(s => ({
    ...s,
    [key]: value
  }));
  const setMaterial = (index, key, value) => setForm(s => ({
    ...s,
    materials: s.materials.map((line, i) => i === index ? {
      ...line,
      [key]: value
    } : line)
  }));
  const copyExpectedActuals = () => setForm(current => ({
    ...current,
    materials: current.materials.map((line, index) => line.consumedQuantity === "" && materialPreview[index]?.expectedQuantity != null ? { ...line, consumedQuantity: materialPreview[index].expectedQuantity } : line)
  }));
  const refreshAmendmentSource = async () => {
    if (sourceBusy || busy || uncertain) return;
    setError("");
    if (!runtime?.businessDate || !isBusinessDate(sourceFilters.demandFrom) || !isBusinessDate(sourceFilters.demandTo) || sourceFilters.demandTo < sourceFilters.demandFrom || sourceFilters.demandTo > runtime.businessDate || !/^\d+$/.test(sourceFilters.freshnessDays)) { setError("Choose a valid observed demand period up to the current company business date and nonnegative freshness days."); return; }
    setSourceBusy(true);
    try {
      const response = await productionWorkspaceService.plan({ asOfDate: runtime.businessDate, demandFrom: sourceFilters.demandFrom, demandTo: sourceFilters.demandTo, freshnessDays: Number(sourceFilters.freshnessDays), channelId: order.channelId ?? null, itemIds: [order.itemId] });
      const snapshot = response.data, lines = Array.isArray(snapshot.lines) ? snapshot.lines : snapshot.lines?.items ?? [];
      const line = lines.find(entry => String(entry.itemId) === String(order.itemId));
      if (!snapshot.id || !line || Number(line.freshness) !== 1 || line.suggestedProduction == null || !line.sourceRevision) throw new Error("The refreshed server snapshot has no current eligible recommendation for this Item. Review demand in Planning.");
      set("sourcePlanId", snapshot.id); setSourceResult({ snapshot, line });
    } catch (failure) { setError(productionError(failure)); }
    finally { setSourceBusy(false); }
  };
  const prepare = () => {
    if (!order.version) throw new Error("Order version is missing. Reload before submitting.");
    if (contextChanged) throw new Error("The order changed while this command was open. Reload and review before entering a new command.");
    if (action === "release" && !isOrderStatus(order, "Draft") || ["complete", "amend"].includes(action) && !isOrderStatus(order, "Released", "InProgress") || ["close", "cancel", "reverse"].includes(action) && isOrderStatus(order, "Closed", "Cancelled")) throw new Error("This action is unavailable in the current order state. Reload and review its lifecycle history.");
    if (action === "release") {
      const approved = quantity(form.quantity, {
        positive: true
      });
      if (compareQuantity(approved, order.plannedQuantity) > 0) throw new Error("Approved release quantity cannot exceed planned output.");
      return {
        version: order.version,
        quantity: approved
      };
    }
    if (action === "complete") {
      if (materialPreview.some((line) => line.overConsumption) && !form.varianceReason.trim()) throw new Error("Actual consumed plus scrap exceeds the expected partial allocation. Enter the variance reason and approval reference.");
      return buildCompletionPayload(order, materials, form, runtime);
    }
    if (!form.reason.trim()) throw new Error("An approval reason is required.");
    if (action === "amend") {
      if (![form.plannedStart, form.dueDate].every(isBusinessDate) || form.dueDate < form.plannedStart) throw new Error("Choose a valid planned start and due date.");
      const releasedQuantity = quantity(form.releasedQuantity, {
          positive: true
        }),
        plannedQuantity = quantity(form.plannedQuantity, {
          positive: true
        });
      if (compareQuantity(releasedQuantity, plannedQuantity) > 0) throw new Error("Released output cannot exceed planned output.");
      if (compareQuantity(releasedQuantity, addQuantity(order.completedQuantity, order.rejectedQuantity)) <= 0) throw new Error("Use short close for a zero remainder; an amendment must retain positive output beyond accepted plus rejected output already recorded.");
      return {
        version: order.version,
        plannedQuantity,
        releasedQuantity,
        plannedStart: form.plannedStart,
        dueDate: form.dueDate,
        reason: form.reason.trim(),
        sourcePlanId: form.sourcePlanId || null
      };
    }
    return {
      version: order.version,
      reason: form.reason.trim()
    };
  };
  const submit = async event => {
    event.preventDefault();
    if (inFlight.current || sourceBusy || blocked || contextChanged || !canApprove) return;
    setError("");
    setFields({});
    let payload;
    try {
      payload = prepare();
    } catch (failure) {
      setError(failure.message);
      return;
    }
    const nextIdentity = commandIdentity(identity.current, {
      action,
      target: completion?.id ?? order.id,
      ...payload
    });
    if (uncertain && nextIdentity !== identity.current) {
      setError("The previous outcome is unknown. Retry the identical request or reload and review the order before changing entries.");
      return;
    }
    identity.current = nextIdentity;
    payload = {
      ...payload,
      idempotencyKey: identity.current.key
    };
    inFlight.current = true;
    setBusy(true);
    try {
      const methods = {
        release: "release",
        complete: "complete",
        amend: "amend",
        close: "close",
        cancel: "cancel",
        reverse: "reverseCompletion"
      };
      await productionOrderService[methods[action]](action === "reverse" ? completion.id : order.id, payload);
      toast.success(action === "amend" ? "Order amended. Schedule the revised route again." : action === "reverse" ? "Completion reversed; the order was closed without reopening reservations." : "Production order updated.");
      identity.current = null;
      setUncertain(false);
      try {
        if (await onSaved(action) === false) throw new Error("The order could not be reloaded.");
      } catch {
        setBlocked(true);
        setError("The command completed, but refreshing its order context failed. Reload and inspect the saved order before another command.");
      }
    } catch (failure) {
      setUncertain(!failure.response && !failure.status);
      setBlocked(isConflictError(failure));
      setFields(getApiFieldErrors(failure));
      setError(`${productionError(failure)}${isConflictError(failure) ? "\nReload and review the latest order quantities and version before another command." : "\nAn identical retry preserves this request's idempotency key. Changing input creates a new command."}`);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };
  const physicalDeduction = line => {
    try {
      return addQuantity(line.consumedQuantity, line.scrapQuantity);
    } catch {
      return "—";
    }
  };
  const close = async () => {
    if (inFlight.current || sourceBusy) return;
    if (uncertain || blocked || contextChanged) {
      inFlight.current = true;
      setBusy(true);
      try {
        if (!await onConflict()) throw new Error("Authoritative order context could not be reloaded. Keep this command and retry the read before starting another action.");
      } catch (failure) { setError(productionError(failure)); return; }
      finally { inFlight.current = false; setBusy(false); }
    }
    onClose();
  };
  return <AppModal isOpen title={initialCompletion && action === "complete" ? `${tr("Review production entry")} · ${itemLabel(order.itemId)} · ${order.orderNumber ?? order.id}` : tr(labels[action])} onClose={close} isBusy={busy || sourceBusy} maxWidth={action === "complete" ? "max-w-6xl" : "max-w-3xl"}><form onSubmit={submit} className="space-y-5">
    <ManufacturingInlineError message={error} />
    {contextChanged && <Notice tone="amber">{tr("The order changed while this command was open. Reload and review before entering a new command.")}</Notice>}
    {!canApprove && <Notice tone="amber">{tr("Manufacturing Orders Approve permission is required for this command.")}</Notice>}
    {blocked && <Notice tone="amber">{tr("Reload and review the saved order before another command. A completed command will not be posted again.")}</Notice>}
    {uncertain && <Notice tone="amber">{tr("The previous outcome is unknown. Retry the same entries with the same request key, or go back to refresh and inspect the order before starting another action.")}</Notice>}
    {action === "complete" && initialCompletion && <div className="space-y-3 rounded-xl border border-brand/15 bg-brand/5 p-4"><p className="text-sm text-slate-800">{tr("Your daily quantities and company time are filled in. Review the actual materials below before saving.")}</p><AppButton type="button" variant="secondary" disabled={busy || uncertain || blocked || contextChanged || !canApprove || materialPreview.some(line => line.expectedQuantity == null)} onClick={copyExpectedActuals}>{tr("Actual consumption matches expected")}</AppButton><p className="text-xs text-slate-600">{tr("Use only when measured consumption matches the preview. Existing actual entries are preserved; scrap and returns remain separate.")}</p></div>}
    {action === "release" && <><Notice>{tr("The complete approved component allocation is reserved atomically. On-hand stock does not change at release. A smaller explicit approval is a deliberate release; shortages reject the whole command.")}</Notice><AppInput label={tr("Approved release quantity")} inputMode="decimal" required value={form.quantity} error={fields.quantity} disabled={busy} onChange={e => set("quantity", e.target.value)} helperText={`Planned output: ${formatOrderQuantity(order.plannedQuantity)} · ${itemLabel.unitLabel?.(order.itemId, order.unitId) ?? tr("Base unit unavailable")}`} />{!lookupAccess.boms ? <Notice tone="amber">{tr("BOM allocation preview requires Manufacturing BOMs View permission. Release still revalidates the complete allocation on the server.")}</Notice> : bomResource.busy ? <Busy label={tr("Reading canonical BOM allocation…")} /> : bomResource.error ? <ManufacturingInlineError message={bomResource.error} onRetry={bomResource.reload} /> : <TableWrap><thead><tr><th>{tr("Component / base unit")}</th><th>{tr("Source / output base")}</th><th>{tr("Waste %")}</th><th>{tr("Approved allocation preview")}</th></tr></thead><tbody>{(bomResource.data?.components ?? []).map(line => <tr key={line.id}><td>{line.componentItemCode} · {line.componentItemName}<div className="text-xs text-slate-500">{line.unitName ?? `Unit #${line.unitId}`}</div></td><td>{formatOrderQuantity(line.quantity)} / {formatOrderQuantity(bomResource.data?.outputBaseQuantity)}</td><td>{formatOrderQuantity(line.wastagePercentage)}</td><td>{formatOrderQuantity(materialEstimate({
                  ...line,
                  outputBaseQuantity: bomResource.data?.outputBaseQuantity
                }, form.quantity))}</td></tr>)}</tbody></TableWrap>}<p className="text-xs leading-5 text-slate-500">{tr("The server revalidates free stock, source freshness, effective BOM/routing and resource eligibility at approval. The frozen allocation and actual reservation are shown after success.")}</p></>}
    {action === "complete" && <CompletionEntryFields simple={Boolean(initialCompletion)} form={form} order={order} materials={materials} materialPreview={materialPreview} runtime={runtime} itemLabel={itemLabel} fields={fields} busy={busy} set={set} setMaterial={setMaterial} physicalDeduction={physicalDeduction} />}
    {action === "amend" && <><Notice tone="amber">{tr("Amendment revalidates and adjusts the remaining material reservation. All previous capacity bookings are invalidated. Explicitly schedule the revised route after amendment.")}</Notice><div className="grid gap-4 sm:grid-cols-2"><AppInput label={tr("Revised planned output")} required inputMode="decimal" value={form.plannedQuantity} disabled={busy} error={fields.plannedQuantity} onChange={e => set("plannedQuantity", e.target.value)} /><AppInput label={tr("Revised released output")} required inputMode="decimal" value={form.releasedQuantity} disabled={busy} error={fields.releasedQuantity} onChange={e => set("releasedQuantity", e.target.value)} /><AppInput label={tr("Revised planned start")} type="date" required value={form.plannedStart} disabled={busy} error={fields.plannedStart} onChange={e => set("plannedStart", e.target.value)} /><AppInput label={tr("Revised due date")} type="date" required value={form.dueDate} disabled={busy} error={fields.dueDate} onChange={e => set("dueDate", e.target.value)} /><AppInput label={tr("Current saved planning snapshot (when linked)")} value={form.sourcePlanId} readOnly error={fields.sourcePlanId} helperText={tr("Recommendation-backed quantity changes require a fresh server snapshot. Open Planning to refresh it.")} /></div></>}
    {action === "amend" && order.sourcePlanId && <section className="space-y-4 rounded-xl border border-slate-200 p-4"><h3 className="text-sm font-semibold">{tr("Refresh recommendation for amendment")}</h3><p className="text-xs leading-5 text-slate-600">{tr("Choose the observed demand period. Save a fresh server snapshot for this Item and channel before approving a linked quantity change. The server uses the 21-day total top-up policy.")}</p><div className="grid gap-4 sm:grid-cols-3"><AppInput label={tr("Observed demand from")} type="date" value={sourceFilters.demandFrom} disabled={sourceBusy || busy || uncertain} onChange={e => setSourceFilters(current => ({ ...current, demandFrom: e.target.value }))} /><AppInput label={tr("Observed demand to")} type="date" value={sourceFilters.demandTo} disabled={sourceBusy || busy || uncertain} onChange={e => setSourceFilters(current => ({ ...current, demandTo: e.target.value }))} /><AppInput label={tr("Freshness days")} inputMode="numeric" value={sourceFilters.freshnessDays} disabled={sourceBusy || busy || uncertain} onChange={e => setSourceFilters(current => ({ ...current, freshnessDays: e.target.value }))} /></div><AppButton variant="secondary" isLoading={sourceBusy} disabled={busy || uncertain} onClick={refreshAmendmentSource}>{tr("Save fresh amendment source")}</AppButton>{sourceResult && <Notice>{tr("Fresh server snapshot saved. Additional suggested output:")} {formatOrderQuantity(sourceResult.line.suggestedProduction)} · {sourceResult.snapshot.asOfDate}</Notice>}</section>}
    {action === "reverse" && <Notice tone="amber">{tr("Reverse original completion #")}{completion?.id}{tr("only if its accepted output remains available and has no downstream dispatch/consumption. The server verifies eligibility. The original and linked reversal remain in history. This closes the order and releases remaining reservations; it does not silently reopen production.")}</Notice>}
    {(action === "close" || action === "cancel") && <Notice tone="amber">{tr("Only the uncompleted remainder is released from reservation. Existing accepted/rejected output and posted stock movements remain in history. An order with recorded output becomes Closed when its remainder is cancelled.")}</Notice>}
    {["amend", "close", "cancel", "reverse"].includes(action) && <AppInput label={tr("Approval reason")} required maxLength={1000} value={form.reason} disabled={busy} error={fields.reason} onChange={e => set("reason", e.target.value)} />}
    <div className="flex flex-wrap justify-end gap-3"><AppButton variant="secondary" disabled={busy} onClick={close}>{tr(uncertain || blocked || contextChanged ? "Reload and review outcome" : "Back")}</AppButton><AppButton type="submit" isLoading={busy} disabled={sourceBusy || blocked || contextChanged || !canApprove} variant={action === "reverse" || action === "cancel" ? "danger" : "primary"}>{tr(initialCompletion && action === "complete" ? "Save production" : labels[action])}</AppButton></div>
  </form></AppModal>;
}
