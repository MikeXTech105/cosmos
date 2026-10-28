import { orderText as tr } from "./orderText";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import AppButton from "../../../components/common/AppButton";
import AppInput from "../../../components/common/AppInput";
import productionOrderService from "../../../services/manufacturing/productionOrderService";
import { isConflictError } from "../../../utils/apiError";
import { ManufacturingCard, ManufacturingEmpty, ManufacturingInlineError } from "../ManufacturingShared";
import { Busy, Notice, TableWrap } from "./OrderShared";
import { useAsyncResource } from "./orderHooks";
import { buildSchedulePayload, commandIdentity, formatOrderQuantity, isBusinessDate, isOrderStatus, productionError } from "./orderHelpers";
export default function OrderCapacity({
  order,
  canApprove,
  rescheduleRequired,
  onScheduled,
  onConflict
}) {
  const [dateInput, setDateInput] = useState(order.plannedStart ?? ""),
    [date, setDate] = useState(order.plannedStart ?? "");
  const [bookingDraft, setBookingDraft] = useState({ source: null, rows: {} }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [uncertain, setUncertain] = useState(false),
    [blocked, setBlocked] = useState(false);
  const lock = useRef(false),
    identity = useRef(null);
  const load = useCallback(({ signal } = {}) => {
    // A command changes the version; fetch a new capacity read for that version.
    if (!order.version) return Promise.reject(new Error("Order version is unavailable."));
    return productionOrderService.capacity(order.id, date, { signal });
  }, [order.id, order.version, date]);
  const resource = useAsyncResource(load, isBusinessDate(date) && !isOrderStatus(order, "Draft", "Cancelled", "Closed"));
  const capacity = resource.data;
  // Bind edits to their actual read snapshot. A new read starts empty in the same render;
  // no passive reset can later erase input typed immediately after recovery unlocks.
  const bookings = bookingDraft.source === capacity ? bookingDraft.rows : {};
  const setBooking = (routingStepId, key, value) => setBookingDraft((current) => {
    const rows = current.source === capacity ? current.rows : {};
    return { source: capacity, rows: { ...rows, [routingStepId]: { ...rows[routingStepId], [key]: value } } };
  });
  const unavailable = Boolean(capacity?.conflictCode || !capacity?.lines?.length || capacity.lines.some(line => line.conflictCode || line.requiredMinutes == null || line.minimumBookingSeconds == null || line.capacityFactor == null || line.availableMinutes == null || !line.windowFrom || !line.windowTo));
  const schedulingAllowed = canApprove && isOrderStatus(order, "Released", "InProgress");
  const reviewOutcome = async () => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      if (!await onConflict()) throw new Error("The order could not be reloaded.");
      if (!await resource.reload()) throw new Error("Capacity could not be reloaded.");
      identity.current = null;
      setBookingDraft({ source: null, rows: {} });
      setUncertain(false);
      setBlocked(false);
      setError("");
    } catch (failure) {
      setError(`${productionError(failure)}\nReload and inspect the saved order and capacity before another booking.`);
    } finally { lock.current = false; setBusy(false); }
  };
  const submit = async event => {
    event.preventDefault();
    if (!schedulingAllowed || lock.current || blocked || resource.busy || resource.error) return;
    setError("");
    let payload;
    try {
      payload = buildSchedulePayload(capacity, date, bookings);
    } catch (failure) {
      setError(failure.message);
      return;
    }
    const nextIdentity = commandIdentity(identity.current, {
      orderId: order.id,
      ...payload
    });
    if (uncertain && nextIdentity !== identity.current) {
      setError("The previous booking outcome is unknown. Retry identical entries or reload capacity and review the order before changing the booking.");
      return;
    }
    identity.current = nextIdentity;
    lock.current = true;
    setBusy(true);
    try {
      await productionOrderService.schedule(order.id, {
        ...payload,
        idempotencyKey: identity.current.key
      });
      toast.success("Ordered route capacity booked.");
      identity.current = null;
      setUncertain(false);
      setBookingDraft({ source: null, rows: {} });
      try {
        if (!await onScheduled()) throw new Error("The saved order could not be reloaded.");
        if (!await resource.reload()) throw new Error("The saved capacity could not be reloaded.");
      } catch {
        setBlocked(true);
        setError("The booking completed, but refreshing its context failed. Reload and inspect the saved order and capacity before another booking.");
      }
    } catch (failure) {
      setUncertain(!failure.response && !failure.status);
      setBlocked(isConflictError(failure));
      setError(`${productionError(failure)}${isConflictError(failure) ? "\nReload and review the order and capacity before another booking." : "\nAn identical uncertain retry keeps the same command key."}`);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return <ManufacturingCard title={tr("Route capacity and scheduling")} description={tr("Read the remaining required minutes for each operation, then explicitly book ordered windows. Planning recommendations do not occupy capacity.")}><div className="space-y-5 p-5">{rescheduleRequired && <Notice tone="amber">{tr("The released amendment cleared the previous booking. Review the revised remaining work and schedule it explicitly.")}</Notice>}<div className="flex flex-wrap items-end gap-3"><AppInput label={tr("Capacity business date")} type="date" value={dateInput} disabled={busy || uncertain || blocked} onChange={e => setDateInput(e.target.value)} /><AppButton disabled={busy || resource.busy || uncertain || blocked} variant="secondary" onClick={() => {
          if (uncertain || blocked) return;
          if (!isBusinessDate(dateInput)) {
            setError("Choose an explicit valid business date.");
            return;
          }
          setError("");
          if (dateInput === date) void resource.reload();else setDate(dateInput);
        }}>{tr("Read capacity")}</AppButton>{(uncertain || blocked) && <AppButton variant="secondary" disabled={busy} onClick={reviewOutcome}>{tr("Reload and review saved booking")}</AppButton>}</div><ManufacturingInlineError message={error || resource.error} onRetry={resource.error ? resource.reload : undefined} />{isOrderStatus(order, "Draft") ? <Notice>{tr("Release the order before reading frozen route capacity and booking operations.")}</Notice> : resource.busy ? <Busy label={tr("Reading work centre, rate, calendar and resource conflicts…")} /> : capacity ? <><Notice>{tr("Timezone:")}<strong>{capacity.timeZone || "Unavailable"}</strong>{tr(". Returned timestamps retain their offsets, including overnight windows. Available minutes exclude configured breaks, approved downtime and reserved capacity. Missing rate, cavity mapping or shift context means unavailable capacity.")}</Notice>{capacity.conflictCode && <Notice tone="amber">{tr("Capacity conflict:")}{capacity.conflictCode}</Notice>}<form onSubmit={submit} className="space-y-4"><TableWrap><thead><tr><th>{tr("Sequence / operation")}</th><th>{tr("Work centre / HR shift")}</th><th>{tr("Usable window (offset preserved)")}</th><th>{tr("Remaining required min")}</th><th>{tr("Available min")}</th><th>{tr("Conflict / explanation")}</th><th>{tr("Explicit booking")}</th></tr></thead><tbody>{[...(capacity.lines ?? [])].sort((a, b) => a.sequence - b.sequence).map(line => <tr key={line.routingStepId}><td>{line.sequence}{tr("· Step #")}{line.routingStepId}</td><td>{tr("Work centre #")}{line.workCentreId}<div className="text-xs text-slate-500">{tr("HR shift #")}{line.shiftId}</div></td><td className="whitespace-nowrap text-xs">{line.windowFrom ?? "Unavailable"}<br />{line.windowTo ?? "Unavailable"}</td><td>{formatOrderQuantity(line.requiredMinutes)}<div className="mt-1 text-xs text-slate-500">{tr("Capacity factor")}: {formatOrderQuantity(line.capacityFactor)} · {tr("Minimum booking seconds")}: {formatOrderQuantity(line.minimumBookingSeconds)}</div></td><td>{formatOrderQuantity(line.availableMinutes)}</td><td className="min-w-48 text-xs leading-5"><span className={line.conflictCode ? "font-semibold text-red-700" : "text-emerald-700"}>{line.conflictCode || "Feasible"}</span><p className="mt-1 text-slate-600">{line.explanation}</p></td><td>{schedulingAllowed && <div className="min-w-72 space-y-2"><AppInput label={`Step ${line.sequence} booking start with offset`} placeholder={line.windowFrom ?? "Explicit timestamp with offset"} value={bookings[String(line.routingStepId)]?.from ?? ""} disabled={busy || unavailable || uncertain || blocked} onChange={e => setBooking(line.routingStepId, "from", e.target.value)} /><AppInput label={`Step ${line.sequence} booking end with offset`} placeholder={line.windowTo ?? "Explicit timestamp with offset"} value={bookings[String(line.routingStepId)]?.to ?? ""} disabled={busy || unavailable || uncertain || blocked} onChange={e => setBooking(line.routingStepId, "to", e.target.value)} /></div>}</td></tr>)}</tbody></TableWrap>{schedulingAllowed && <div className="flex justify-end"><AppButton type="submit" disabled={unavailable || resource.busy || blocked || Boolean(resource.error)} isLoading={busy}>{tr("Approve ordered booking")}</AppButton></div>}</form></> : <ManufacturingEmpty title={tr("No capacity result")} description={tr("Choose the business date and read capacity. Unknown capacity does not imply unlimited time.")} />}</div></ManufacturingCard>;
}
