import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import AppButton from "./AppButton";
import { formatDatePickerValue, getCalendarDays, isDateWithinBounds, parseIsoDate, toIsoDate } from "./datePickerUtils";
import { DATE_RANGE_PRESETS, getQuickDateRange } from "./dateRangePresets";

export default function AppDateRangeFilter({ fromDate = "", toDate = "", onChange, label = "Date range", className = "", max, min, allowLifetime = true, disabled = false, includeTime = false }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ fromDate: "", toDate: "" });
  const [month, setMonth] = useState(() => new Date());
  const [choosingEnd, setChoosingEnd] = useState(false);
  const [preset, setPreset] = useState("custom");
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const panelId = useId();
  const close = () => { setOpen(false); triggerRef.current?.focus(); };
  useLayoutEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    const trigger = triggerRef.current;
    const position = () => {
      const rect = trigger.getBoundingClientRect();
      const viewport = window.visualViewport;
      const width = viewport?.width ?? window.innerWidth;
      const height = viewport?.height ?? window.innerHeight;
      const left = viewport?.offsetLeft ?? 0;
      const top = viewport?.offsetTop ?? 0;
      panel.style.width = `${Math.min(640, width - 16)}px`;
      const below = Math.max(0, top + height - rect.bottom - 16);
      const above = Math.max(0, rect.top - top - 16);
      const upward = below < Math.min(panel.scrollHeight, 480) && above > below;
      panel.style.maxHeight = `${Math.max(80, upward ? above : below)}px`;
      panel.style.left = `${Math.max(left + 8, Math.min(rect.left, left + width - panel.offsetWidth - 8))}px`;
      panel.style.top = `${upward ? Math.max(top + 8, rect.top - panel.offsetHeight - 8) : rect.bottom + 8}px`;
    };
    const dismissOutside = (event) => {
      if (!panel.contains(event.target) && !trigger.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
        trigger.focus();
      }
    };
    position();
    panel.focus({ preventScroll: true });
    const observer = new ResizeObserver(position);
    observer.observe(panel);
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    window.visualViewport?.addEventListener("resize", position);
    document.addEventListener("pointerdown", dismissOutside);
    document.addEventListener("focusin", dismissOutside);
    panel.addEventListener("keydown", onKeyDown);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
      window.visualViewport?.removeEventListener("resize", position);
      document.removeEventListener("pointerdown", dismissOutside);
      document.removeEventListener("focusin", dismissOutside);
      panel.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);
  const withTime = (range) => includeTime && range.fromDate ? { fromDate: `${range.fromDate}T00:00`, toDate: `${range.toDate}T23:59:59` } : range;
  const valid = (allowLifetime && !draft.fromDate && !draft.toDate) || (
    parseIsoDate(draft.fromDate) && parseIsoDate(draft.toDate) && draft.fromDate <= draft.toDate &&
    isDateWithinBounds(parseIsoDate(draft.fromDate), min, max) && isDateWithinBounds(parseIsoDate(draft.toDate), min, max)
  );
  const chooseDay = (value) => {
    setPreset("custom");
    if (!choosingEnd || value < draft.fromDate.slice(0, 10)) {
      setDraft(withTime({ fromDate: value, toDate: value }));
      setChoosingEnd(true);
    } else {
      setDraft((current) => ({ ...current, toDate: includeTime ? `${value}T23:59:59` : value }));
      setChoosingEnd(false);
    }
  };
  return (
    <div className={`min-w-0 ${className}`}>
      <button ref={triggerRef} type="button" disabled={disabled} aria-label={label} aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? panelId : undefined}
        onClick={() => {
          if (open) { close(); return; }
          setDraft({ fromDate: fromDate || "", toDate: toDate || "" });
          setMonth(parseIsoDate(fromDate) || new Date());
          const matched = DATE_RANGE_PRESETS.find(([key]) => {
            const range = withTime(getQuickDateRange(key));
            return range.fromDate === fromDate && range.toDate === toDate;
          });
          setPreset(matched?.[0] || "custom"); setChoosingEnd(false); setOpen(true);
        }}
        className="flex h-11 w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-left text-sm text-slate-700 shadow-sm hover:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 disabled:opacity-50">
        <CalendarDays className="h-4 w-4 shrink-0 text-slate-400" />
        <span className="truncate">{fromDate || toDate ? `${formatDatePickerValue(fromDate, includeTime ? "datetime-local" : "date") || "Start"} – ${formatDatePickerValue(toDate, includeTime ? "datetime-local" : "date") || "End"}` : `${label} · ${allowLifetime ? "All time" : "Select dates"}`}</span>
      </button>
      {open && createPortal(<div ref={panelRef} id={panelId} role="dialog" aria-label={label} tabIndex={-1}
        className="fixed z-[10000] overflow-y-auto overscroll-contain rounded-xl border border-slate-200 bg-white p-4 shadow-xl outline-none">
        <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-3">
          <span className="text-sm font-semibold text-slate-900">{label}</span>
          <button type="button" aria-label="Close date range" onClick={close} className="rounded-md p-1 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
        </div>
        <div className="grid gap-4 sm:grid-cols-[160px_minmax(0,1fr)]">
          <div className="flex gap-1 overflow-x-auto border-b border-slate-200 pb-3 sm:flex-col sm:border-b-0 sm:border-r sm:pb-0 sm:pr-3">
            {DATE_RANGE_PRESETS.filter(([key]) => allowLifetime || key !== "lifetime").map(([key, text]) => {
              const range = getQuickDateRange(key);
              const outOfBounds = range.fromDate && (!isDateWithinBounds(parseIsoDate(range.fromDate), min, max) || !isDateWithinBounds(parseIsoDate(range.toDate), min, max));
              return <button key={key} type="button" disabled={Boolean(outOfBounds)} aria-pressed={preset === key}
                className={`shrink-0 rounded-md px-3 py-2 text-left text-sm disabled:opacity-35 ${preset === key ? "bg-brand-light font-semibold text-brand" : "text-slate-600 hover:bg-slate-50"}`}
                onClick={() => { setDraft(withTime(range)); setPreset(key); setChoosingEnd(false); setMonth(parseIsoDate(range.fromDate) || new Date()); }}>{text}</button>;
            })}
            <button type="button" onClick={() => { setPreset("custom"); setChoosingEnd(false); }} className={`shrink-0 rounded-md px-3 py-2 text-left text-sm ${preset === "custom" ? "bg-brand-light font-semibold text-brand" : "text-slate-600"}`}>Custom range</button>
          </div>
          <div className="min-w-0">
            <div className="mb-3 flex items-center justify-between">
              <button type="button" aria-label="Previous month" className="rounded-md p-2 hover:bg-slate-100" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1, 12))}><ChevronLeft className="h-4 w-4" /></button>
              <span className="text-sm font-semibold text-slate-900">{month.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</span>
              <button type="button" aria-label="Next month" className="rounded-md p-2 hover:bg-slate-100" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1, 12))}><ChevronRight className="h-4 w-4" /></button>
            </div>
            <div className="grid grid-cols-7 text-center">
              {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((day) => <span key={day} className="py-2 text-xs text-slate-400">{day}</span>)}
              {getCalendarDays(month).map((day) => {
                const key = toIsoDate(day);
                const edge = key === draft.fromDate.slice(0, 10) || key === draft.toDate.slice(0, 10);
                const inside = draft.fromDate && draft.toDate && key >= draft.fromDate.slice(0, 10) && key <= draft.toDate.slice(0, 10);
                return <button key={key} type="button" aria-label={day.toLocaleDateString("en-IN", { dateStyle: "full" })} aria-pressed={Boolean(inside)} disabled={!isDateWithinBounds(day, min, max)} onClick={() => chooseDay(key)}
                  className={`h-10 rounded-md text-sm disabled:opacity-25 ${edge ? "bg-brand font-semibold text-white" : inside ? "bg-brand-light text-brand" : day.getMonth() !== month.getMonth() ? "text-slate-300 hover:bg-slate-50" : "text-slate-700 hover:bg-slate-100"}`}>{day.getDate()}</button>;
              })}
            </div>
            <p className="my-3 text-xs text-slate-500">{choosingEnd ? "Choose the end date." : "Choose a start date, then an end date."}</p>
            <div className={`grid gap-3 ${includeTime ? "sm:grid-cols-2" : "grid-cols-2"}`}>
              {["fromDate", "toDate"].map((key) => <label key={key} className="min-w-0 text-xs text-slate-500">{key === "fromDate" ? "From" : "To"}<input type={includeTime ? "datetime-local" : "date"} step={includeTime ? 1 : undefined} value={draft[key]} min={min} max={max} onChange={(event) => { setDraft((current) => ({ ...current, [key]: event.target.value })); setPreset("custom"); setChoosingEnd(false); }} className="mt-1 h-10 w-full min-w-0 rounded-md border border-slate-200 px-2 text-sm text-slate-700" /></label>)}
            </div>
            {!valid && <p role="alert" className="mt-2 text-xs text-red-600">Choose a valid start and end date within the allowed range.</p>}
            <p className="mt-3 text-xs text-slate-400">{Intl.DateTimeFormat().resolvedOptions().timeZone} · Both dates included</p>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2 border-t border-slate-100 pt-4">
          <AppButton variant="secondary" onClick={close}>Cancel</AppButton>
          <AppButton disabled={!valid} onClick={() => { onChange(draft); close(); }}>Apply range</AppButton>
        </div>
      </div>, document.body)}
    </div>
  );
}
