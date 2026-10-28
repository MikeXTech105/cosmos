import { orderText as tr } from "./orderText";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Factory, Save } from "lucide-react";
import { toast } from "sonner";
import AppButton from "../../../components/common/AppButton";
import AppInput from "../../../components/common/AppInput";
import AppSelect from "../../../components/common/AppSelect";
import PageHeader from "../../../components/common/PageHeader";
import useProductionRuntime from "../../../hooks/useProductionRuntime";
import productionOrderService from "../../../services/manufacturing/productionOrderService";
import { productionWorkspaceService } from "../../../services/manufacturing/productionWorkspaceService";
import { getApiFieldErrors, isConflictError } from "../../../utils/apiError";
import { ProcurementItemAutocomplete } from "../../procurement/ProcurementShared";
import { ManufacturingCard, ManufacturingInlineError } from "../ManufacturingShared";
import { Busy, Denied, Notice, OrderBackLink, TableWrap } from "./OrderShared";
import { loadAllMasterPages, useAsyncResource, useOrderCapabilities, useOrderLookupAccess } from "./orderHooks";
import { buildDraftPayload, commonRouteShiftIds, effectiveOn, entityLabel, formatOrderQuantity, isBusinessDate, isOrderStatus, materialEstimate, productionError, routeEligibleResources, verifyPlanningSource } from "./orderHelpers";
const blank = {
  businessDate: "",
  plannedStart: "",
  dueDate: "",
  itemId: "",
  bomId: "",
  routingId: "",
  plannedQuantity: "",
  machineId: "",
  mouldId: "",
  shiftId: "",
  reference: "",
  notes: "",
  channelId: "",
  sourcePlanId: "",
  sourceLineId: ""
};
const fromOrder = order => Object.fromEntries(Object.keys(blank).map(key => [key, order[key] === null || order[key] === undefined ? "" : String(order[key])]));
export default function OrderFormPage() {
  const {
      id
    } = useParams(),
    navigate = useNavigate(),
    location = useLocation();
  const capabilities = useOrderCapabilities();
  const lookupAccess = useOrderLookupAccess();
  const {
    runtime,
    loading: runtimeLoading,
    error: runtimeError,
    reload: reloadRuntime
  } = useProductionRuntime();
  const [form, setForm] = useState(() => {
    const source = location.state?.productionDraft ?? location.state?.recommendation ?? location.state ?? {};
    const params = new URLSearchParams(location.search);
    return {
      ...blank,
      itemId: String(source.itemId ?? params.get("itemId") ?? ""),
      plannedQuantity: String(source.plannedQuantity ?? source.suggestedProduction ?? params.get("quantity") ?? ""),
      channelId: String(source.channelId ?? params.get("channelId") ?? ""),
      sourcePlanId: source.sourcePlanId ?? source.snapshotId ?? params.get("sourcePlanId") ?? "",
      sourceLineId: source.sourceLineId ?? params.get("sourceLineId") ?? "",
      businessDate: source.businessDate ?? params.get("businessDate") ?? ""
    };
  });
  const [order, setOrder] = useState(null),
    [item, setItem] = useState(null),
    [initialBusy, setInitialBusy] = useState(Boolean(id || form.itemId));
  const [error, setError] = useState(""),
    [fields, setFields] = useState({}),
    [busy, setBusy] = useState(false),
    [dirty, setDirty] = useState(false),
    [createUncertain, setCreateUncertain] = useState(false);
  const [draftNeedsReview, setDraftNeedsReview] = useState(false);
  const submitLock = useRef(false);
  const draftRead = useRef(0);
  const allowed = capabilities.canView && (id ? capabilities.canUpdate : capabilities.canCreate);
  const requiredLookups = ["items", "boms", "configuration", "machines", "moulds", "shifts"].every((key) => lookupAccess[key]);
  const differentDraft = Boolean(id && String(order?.id) !== String(id));
  const set = (key, value) => {
    setDirty(true);
    setForm(s => ({
      ...s,
      [key]: value
    }));
    setFields(s => ({
      ...s,
      [key]: ""
    }));
  };
  useEffect(() => {
    if (id || !runtime?.businessDate || dirty) return;
    // Initialize untouched inputs from asynchronous company context, never local time.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm(s => ({
      ...s,
      businessDate: s.businessDate || runtime.businessDate,
      plannedStart: s.plannedStart || runtime.businessDate,
      dueDate: s.dueDate || runtime.businessDate
    }));
  }, [id, runtime?.businessDate, dirty]);
  const loadDraft = useCallback(async () => {
    if (!allowed) return;
    const request = ++draftRead.current;
    setInitialBusy(true);
    setError("");
    try {
      if (id) {
        const record = (await productionOrderService.getById(id)).data;
        if (request !== draftRead.current) return false;
        if (!isOrderStatus(record, "Draft")) throw new Error("Only a draft can be edited. Open the order to use approved released amendments.");
        setOrder(record);
        setForm(fromOrder(record));
        if (lookupAccess.items) {
          const selected = (await productionOrderService.item(record.itemId)).data;
          if (request !== draftRead.current) return false;
          setItem(selected);
        }
      } else if (form.itemId && lookupAccess.items) {
        const selected = (await productionOrderService.item(form.itemId)).data;
        if (request !== draftRead.current) return false;
        setItem(selected);
      }
      setDraftNeedsReview(false);
      return true;
    } catch (failure) {
      if (request === draftRead.current) setError(productionError(failure));
      return false;
    } finally {
      if (request === draftRead.current) setInitialBusy(false);
    }
    // The initial source is fixed to this route. Changing the selected Item does not reload a saved draft.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, allowed, lookupAccess.items]);
  useEffect(() => {
    // Load the selected persisted document, including its optimistic version.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadDraft();
    return () => { draftRead.current += 1; };
  }, [loadDraft]);
  const loadMasters = useCallback(async ({ signal } = {}) => {
    const results = await Promise.allSettled([lookupAccess.machines ? loadAllMasterPages(productionOrderService.machines, {
      IsActive: true
    }, { signal }) : Promise.resolve([]), lookupAccess.moulds ? loadAllMasterPages(productionOrderService.moulds, {
      IsActive: true
    }, { signal }) : Promise.resolve([]), lookupAccess.shifts ? loadAllMasterPages(productionOrderService.shifts, {
      IsActive: true
    }, { signal }) : Promise.resolve([]), lookupAccess.channels ? loadAllMasterPages(productionOrderService.channels, {
      IsActive: true
    }, { signal }) : Promise.resolve([])]);
    return {
      machines: results[0].status === "fulfilled" ? results[0].value : [],
      moulds: results[1].status === "fulfilled" ? results[1].value : [],
      shifts: results[2].status === "fulfilled" ? results[2].value : [],
      channels: results[3].status === "fulfilled" ? results[3].value : [],
      errors: results.map((result, index) => result.status === "rejected" ? `${["Machines", "Moulds", "HR shifts", "Channels"][index]}: ${productionError(result.reason)}` : "").filter(Boolean)
    };
  }, [lookupAccess.machines, lookupAccess.moulds, lookupAccess.shifts, lookupAccess.channels]);
  const masters = useAsyncResource(loadMasters, allowed);
  const loadConfiguration = useCallback(async ({ signal } = {}) => {
    const [configuration, bom] = await Promise.all([productionOrderService.configuration(form.itemId, { signal }), productionOrderService.applicableBom(form.itemId, form.plannedStart, { signal })]);
    return {
      ...configuration.data,
      bom: bom.data
    };
  }, [form.itemId, form.plannedStart]);
  const config = useAsyncResource(loadConfiguration, allowed && lookupAccess.configuration && lookupAccess.boms && Boolean(form.itemId) && isBusinessDate(form.plannedStart));
  const loadSource = useCallback(({ signal } = {}) => productionWorkspaceService.snapshot(form.sourcePlanId, {
    itemId: form.itemId,
    pageNumber: 1,
    pageSize: 200
  }, signal), [form.sourcePlanId, form.itemId]);
  const source = useAsyncResource(loadSource, allowed && Boolean(form.sourcePlanId && form.itemId));
  const effectiveRoutes = (config.data?.routings ?? []).filter(route => effectiveOn(route, form.plannedStart));
  const configuredRoute = effectiveRoutes.find(route => String(route.id) === String(form.routingId));
  const eligible = routeEligibleResources(config.data?.eligibility ?? [], configuredRoute, form.plannedStart);
  const workCentreKey = [...new Set((configuredRoute?.steps ?? []).map((step) => String(step.workCentreId)))].join(",");
  const loadRouteShifts = useCallback(async ({ signal } = {}) => Promise.all(workCentreKey.split(",").filter(Boolean).map(async (workCentreId) => ({ workCentreId, shifts: (await productionOrderService.workCentreShifts(workCentreId, { signal })).data?.shifts ?? [] }))), [workCentreKey]);
  const routeShifts = useAsyncResource(loadRouteShifts, allowed && lookupAccess.configuration && lookupAccess.shifts && Boolean(workCentreKey));
  const shiftIds = commonRouteShiftIds(routeShifts.data, form.plannedStart);
  const bom = config.data?.bom;
  useEffect(() => {
    if (!bom?.id) return;
    // Only the server's effective canonical BOM can initialize this choice.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm(s => ({
      ...s,
      bomId: String(bom.id)
    }));
  }, [bom?.id]);
  const selectedMachine = String(form.machineId);
  const machineIds = new Set(eligible.map(entry => String(entry.machineId)));
  const mouldIds = new Set(eligible.filter(entry => String(entry.machineId) === selectedMachine).map(entry => String(entry.mouldId)));
  const options = (records, kind) => records.map(record => ({
    value: String(record.id),
    label: entityLabel(record, kind)
  }));
  const submit = async event => {
    event.preventDefault();
    if (submitLock.current || !allowed || !requiredLookups || createUncertain || draftNeedsReview || differentDraft) return;
    setError("");
    setFields({});
    let payload;
    try {
      payload = buildDraftPayload(form, order?.version);
      if (!item?.isManufactured || item.trackInventory === false || item.isActive === false) throw new Error("Select an active manufactured Item that tracks inventory.");
      if (config.error || config.busy) throw new Error("Reload Item configuration before saving.");
      if (masters.busy || masters.error || masters.data?.errors?.length) throw new Error("Reload the allowed resource lookups before saving this draft.");
      if (![["machines", "machineId"], ["moulds", "mouldId"], ["shifts", "shiftId"]].every(([family, key]) => masters.data?.[family]?.some((entry) => String(entry.id) === String(form[key]) && entry.isActive !== false))) throw new Error("Choose active OEE machine, mould and HR shift records from the current allowed lookups.");
      if (!bom || String(bom.id) !== String(form.bomId) || !configuredRoute) throw new Error("Reload an effective canonical BOM and routing for this Item and planned start date.");
      if (!eligible.some(entry => String(entry.machineId) === String(form.machineId) && String(entry.mouldId) === String(form.mouldId))) throw new Error("Choose a verified effective machine/mould combination from Item Manufacturing configuration.");
      if (routeShifts.busy || routeShifts.error || !shiftIds.has(String(form.shiftId))) throw new Error("Choose an effective HR shift configured for every work centre in the selected route at the planned start date.");
      if (form.sourcePlanId && !form.sourceLineId) throw new Error("The recommendation source line is missing. Open the saved planning snapshot and create the selected draft again.");
      if (form.sourcePlanId) {
        if (source.error || source.busy) throw new Error("Reload the actual saved planning source before saving this draft.");
        verifyPlanningSource(source.data, form, runtime?.businessDate);
      }
    } catch (failure) {
      setError(failure.message);
      return;
    }
    submitLock.current = true;
    setBusy(true);
    try {
      const result = id ? await productionOrderService.update(id, payload) : await productionOrderService.create(payload);
      setDirty(false);
      toast.success(id ? "Production draft updated." : "Production draft created.");
      navigate(`/manufacturing/orders/${result.data.id}`);
    } catch (failure) {
      if (!id && !failure.response && !failure.status) setCreateUncertain(true);
      if (id && (isConflictError(failure) || !failure.response && !failure.status)) setDraftNeedsReview(true);
      setFields(getApiFieldErrors(failure));
      setError(`${productionError(failure)}${isConflictError(failure) ? "\nThe draft changed. Reload and review the latest version before saving again." : ""}`);
    } finally {
      submitLock.current = false;
      setBusy(false);
    }
  };
  if (!allowed) return <Denied />;
  return <div className="space-y-6"><OrderBackLink /><PageHeader icon={Factory} title={id ? `Edit ${order?.orderNumber ?? "production draft"}` : "New production order"} description={tr("Drafts do not reserve material, book capacity or post stock. Release is a separate approval.")} />
    {runtimeError && <ManufacturingInlineError message={productionError(runtimeError)} onRetry={reloadRuntime} />}
    {!runtimeLoading && !runtime && <Notice tone="amber">{tr("Business timezone context is unavailable. Enter explicit business dates; no workstation date has been substituted.")}</Notice>}
    <ManufacturingInlineError message={error} onRetry={id && !busy ? loadDraft : undefined} />
    {!requiredLookups && <Notice tone="amber">{tr("Order entry needs View access to Items, Manufacturing BOMs and Configuration, OEE Machines and Moulds, and HR Shifts. Lookup requests are limited to the permissions you have.")}</Notice>}
    {draftNeedsReview && <Notice tone="amber">{tr("The saved draft must be reloaded successfully before another edit can be submitted.")}</Notice>}
    {createUncertain && <Notice tone="amber">{tr("The create request's outcome is unknown and draft creation has no retry key contract. Open the order list and review the saved drafts before creating another order.")}<a className="underline" href="/manufacturing/orders">{tr("Review production orders")}</a></Notice>}
    {initialBusy || differentDraft ? <Busy /> : <form onSubmit={submit} className="space-y-6">
      <ManufacturingCard title={tr("Item, quantity and dates")}><div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3"><ProcurementItemAutocomplete loader={productionOrderService.items} label={tr("Manufactured finished Item")} value={item} mode="finished" includeLegacy required disabled={busy || Boolean(id) || !lookupAccess.items || Boolean(form.sourcePlanId)} error={fields.itemId} onChange={selected => {
            setItem(selected);
            setDirty(true);
            setForm(s => ({
              ...s,
              itemId: String(selected?.id ?? ""),
              bomId: "",
              routingId: "",
              machineId: "",
              mouldId: "",
              shiftId: ""
            }));
          }} /><AppInput label={`Planned quantity${item?.unitName ? ` (${item.unitName})` : item?.unitId ? ` (unit #${item.unitId})` : ""}`} inputMode="decimal" value={form.plannedQuantity} required disabled={busy} error={fields.plannedQuantity} onChange={e => set("plannedQuantity", e.target.value)} helperText={tr("Posting precision: up to six decimal places.")} /><AppInput label={tr("Business date")} type="date" value={form.businessDate} required disabled={busy} error={fields.businessDate} onChange={e => set("businessDate", e.target.value)} helperText={runtime?.businessTimeZone ? `Company timezone: ${runtime.businessTimeZone}` : "Choose the company business date explicitly."} /><AppInput label={tr("Planned start")} type="date" value={form.plannedStart} required disabled={busy} error={fields.plannedStart} onChange={e => set("plannedStart", e.target.value)} /><AppInput label={tr("Due date")} type="date" value={form.dueDate} required disabled={busy} error={fields.dueDate} onChange={e => set("dueDate", e.target.value)} /><AppInput label={tr("Base unit")} value={item?.unitName ?? (item?.unitId ? `Unit #${item.unitId}` : "Select an Item")} readOnly /></div></ManufacturingCard>
      <ManufacturingCard title={tr("Effective configuration")} description={tr("Maintain BOM, routing and eligibility in the existing Item Manufacturing tab. Unverified resource combinations cannot be released.")}><div className="space-y-4 p-5"><ManufacturingInlineError message={config.error} onRetry={config.reload} />{config.busy ? <Busy label={tr("Loading effective Item configuration…")} /> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><AppSelect label={tr("Effective approved BOM")} required disabled={busy || !bom} value={form.bomId} error={fields.bomId} options={bom ? [{
              value: String(bom.id),
              label: `${bom.bomNumber ?? `BOM #${bom.id}`} · ${bom.version}`
            }] : []} onChange={value => set("bomId", value)} /><AppSelect label={tr("Routing revision")} required disabled={busy} value={form.routingId} error={fields.routingId} options={effectiveRoutes.map(route => ({
              value: String(route.id),
              label: `${route.revision} · ${route.effectiveFrom}${route.effectiveTo ? ` to ${route.effectiveTo}` : " onwards"}`
            }))} onChange={value => set("routingId", value)} /><AppSelect label={tr("Eligible machine")} required disabled={busy || masters.busy} value={form.machineId} error={fields.machineId} options={options((masters.data?.machines ?? []).filter(machine => machineIds.has(String(machine.id))), "Machine")} onChange={value => {
              set("machineId", value);
              set("mouldId", "");
            }} /><AppSelect label={tr("Eligible mould")} required disabled={busy || !form.machineId} value={form.mouldId} error={fields.mouldId} options={options((masters.data?.moulds ?? []).filter(mould => mouldIds.has(String(mould.id))), "Mould")} onChange={value => set("mouldId", value)} /><AppSelect label={tr("Existing HR shift")} required disabled={busy || masters.busy || routeShifts.busy || !configuredRoute} value={form.shiftId} error={fields.shiftId} options={options((masters.data?.shifts ?? []).filter((shift) => shiftIds.has(String(shift.id))), "Shift")} onChange={value => set("shiftId", value)} /></div>}{configuredRoute && <Notice>{configuredRoute.steps?.length ?? 0}{tr("ordered route operations. Release revalidates each work centre's active shift configuration and capacity basis.")}</Notice>}<ManufacturingInlineError message={routeShifts.error} onRetry={routeShifts.reload} />{configuredRoute && !routeShifts.busy && routeShifts.data && !shiftIds.size && <Notice tone="amber">{tr("No common effective HR shift is configured for every work centre at the planned start date. Maintain Work Centre capacity before saving.")}</Notice>}{masters.data?.errors?.map(message => <ManufacturingInlineError key={message} message={message} onRetry={masters.reload} />)}</div></ManufacturingCard>
      {bom && <ManufacturingCard title={tr("BOM allocation preview")} description={`Source BOM base: ${formatOrderQuantity(bom.outputBaseQuantity)} output units. Preview is provisional; release freezes and reserves the complete allocation atomically.`}><TableWrap><thead><tr><th>{tr("Component")}</th><th>{tr("Base unit")}</th><th>{tr("Source quantity")}</th><th>{tr("Waste %")}</th><th>{tr("Estimated planned requirement")}</th></tr></thead><tbody>{(bom.components ?? []).map(line => <tr key={line.id ?? line.componentItemId}><td>{line.componentItemCode} · {line.componentItemName}</td><td>{line.unitName ?? `Unit #${line.unitId}`}</td><td>{formatOrderQuantity(line.quantity)}</td><td>{formatOrderQuantity(line.wastagePercentage)}</td><td>{formatOrderQuantity(materialEstimate({
                  ...line,
                  outputBaseQuantity: bom.outputBaseQuantity
                }, form.plannedQuantity))}</td></tr>)}</tbody></TableWrap></ManufacturingCard>}
      <ManufacturingCard title={tr("Reference and source")}><div className="space-y-4 p-5">{form.sourcePlanId && (source.busy ? <Busy label={tr("Verifying the saved planning source…")} /> : source.error ? <ManufacturingInlineError message={source.error} onRetry={source.reload} /> : <Notice>{tr("Saved server snapshot as of")}{source.data?.asOfDate ?? "unavailable"} · {source.data?.calculationVersion ?? "unavailable"}. <a className="underline" href={`/manufacturing/planning?snapshot=${encodeURIComponent(form.sourcePlanId)}`}>{tr("Open saved Planning snapshot")}</a>{tr(". Source date/revision and positive recommendation are verified before save; release checks current determinants again.")}</Notice>)}<div className="grid gap-4 sm:grid-cols-2"><AppSelect label={tr("Sales channel (optional)")} value={form.channelId} disabled={busy || masters.busy || !lookupAccess.channels || Boolean(form.sourcePlanId)} options={[{
              value: "",
              label: tr("No channel")
            }, ...options(masters.data?.channels ?? [], "Channel")]} error={fields.channelId} onChange={value => set("channelId", value)} /><AppInput label={tr("Reference (optional)")} maxLength={100} value={form.reference} disabled={busy} error={fields.reference} onChange={e => set("reference", e.target.value)} /><AppInput label={tr("Planning snapshot ID")} value={form.sourcePlanId} readOnly helperText={tr("Recommendation identity is preserved from a saved server snapshot.")} /><AppInput label={tr("Planning source line")} value={form.sourceLineId} readOnly /><div className="sm:col-span-2"><AppInput label={tr("Notes (optional)")} maxLength={1000} value={form.notes} disabled={busy} error={fields.notes} onChange={e => set("notes", e.target.value)} /></div></div></div></ManufacturingCard>
      <div className="flex flex-wrap justify-end gap-3"><AppButton variant="secondary" disabled={busy} onClick={() => navigate(id ? `/manufacturing/orders/${id}` : "/manufacturing/orders")}>{tr("Cancel")}</AppButton><AppButton type="submit" isLoading={busy} disabled={differentDraft || !requiredLookups || draftNeedsReview || createUncertain || config.busy || routeShifts.busy || source.busy || initialBusy || Boolean(id && !order)}><Save className="h-4 w-4" />{tr("Save draft")}</AppButton></div>
    </form>}
  </div>;
}
