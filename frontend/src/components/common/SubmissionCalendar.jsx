import { useId } from "react";
import { CalendarDays, Check, CheckCircle2, ChevronLeft, ChevronRight, CircleDashed, Clock3, RefreshCw } from "lucide-react";
import { shiftSubmissionMonth, submissionMonthDays, submissionToday, validSubmissionMonth } from "../../utils/submissionCalendar";
import "./submissionCalendar.css";

const fullDate = date => new Date(`${date}T12:00:00Z`).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const defaultDate = row => row.businessDate ?? row.date;

export default function SubmissionCalendar({
  month, onMonthChange, entries = [], getDate = defaultDate, today = submissionToday(), selectedDate = "", onSelectDate,
  loading = false, error = "", complete = false, onRetry, title = "Submission calendar", description,
  recordLabel = "entries", emptyLabel = "No entry", disabled = false, isDateDisabled, unavailableMessage, note, onClearSelection,
}) {
  const id = useId();
  const verified = complete && !loading && !error;
  const result = submissionMonthDays({ month, entries: loading || error ? [] : entries, getDate, today, complete: verified });
  const { days, offset, saved, pending, upcoming, totalEntries } = result;
  const selected = days.find(day => day.date === selectedDate);
  const monthLabel = validSubmissionMonth(month) ? new Date(`${month}-01T12:00:00Z`).toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" }) : "Choose month";
  const elapsed = days.filter(day => day.date <= today).length;
  const savedElapsed = days.filter(day => day.date <= today && day.count).length;
  const progress = elapsed ? Math.round(savedElapsed / elapsed * 100) : 0;
  const hasTodayPending = days.some(day => day.status === "today");
  const countLabel = count => `${count} ${count === 1 ? recordLabel.replace(/ies$/, "y").replace(/s$/, "") : recordLabel}`;
  const statusLabel = day => day.status === "saved" ? countLabel(day.count) : day.status === "pending" ? emptyLabel : day.status === "today" ? "Due today" : day.status === "future" ? "Upcoming" : "Not checked";
  const compactLabel = day => day.status === "saved" ? `${day.count} saved` : day.status === "pending" ? emptyLabel === "No records" ? "No data" : "No entry" : day.status === "today" ? "Today" : day.status === "future" ? "Later" : "—";
  return <section className="entry-calendar" aria-labelledby={`${id}-title`} aria-busy={loading}>
    <header className="entry-calendar-header">
      <div className="entry-calendar-heading"><span className="entry-calendar-icon"><CalendarDays size={19} aria-hidden="true" /></span><div><h2 id={`${id}-title`}>{title}</h2><p>{description || "See the days with saved entries and the dates still to review."}</p></div></div>
      <div className="entry-calendar-controls">
        <button type="button" aria-label="Previous month" onClick={() => onMonthChange?.(shiftSubmissionMonth(month, -1))} disabled={!onMonthChange || !validSubmissionMonth(month)}><ChevronLeft size={16} /></button>
        <label className="entry-calendar-month"><span className="sr-only">Calendar month</span><input aria-label="Calendar month" type="month" value={month || ""} min="1000-01" max="9999-12" onChange={event => { if (validSubmissionMonth(event.target.value)) onMonthChange?.(event.target.value); }} disabled={!onMonthChange} /></label>
        <button type="button" aria-label="Next month" onClick={() => onMonthChange?.(shiftSubmissionMonth(month, 1))} disabled={!onMonthChange || !validSubmissionMonth(month)}><ChevronRight size={16} /></button>
        {onMonthChange && <button type="button" className="entry-calendar-this-month" onClick={() => onMonthChange(today.slice(0, 7))}>This month</button>}
      </div>
    </header>
    <div className="entry-calendar-body">
      <div className="entry-calendar-month-view">
        <div className="entry-calendar-weekdays" aria-hidden="true">{weekdays.map(day => <span key={day}>{day}</span>)}</div>
        <div className="entry-calendar-grid" role="group" aria-label={`${monthLabel} submission dates`}>
          {Array.from({ length: offset }, (_, index) => <span key={`blank-${index}`} className="entry-calendar-blank" aria-hidden="true" />)}
          {days.map(day => <button key={day.date} type="button" className={`entry-calendar-day is-${day.status}${day.today ? " is-today" : ""}${selectedDate === day.date ? " is-selected" : ""}`} onClick={() => onSelectDate?.(day.date)} disabled={disabled || !onSelectDate || Boolean(isDateDisabled?.(day.date))} aria-pressed={selectedDate === day.date} aria-current={day.today ? "date" : undefined} aria-label={`${fullDate(day.date)}: ${statusLabel(day)}${day.today ? ", today" : ""}`} title={`${fullDate(day.date)} · ${statusLabel(day)}`}>
            <span className="entry-calendar-day-top"><strong>{day.day}</strong>{day.status === "saved" ? <Check size={13} aria-hidden="true" /> : day.status === "pending" ? <span className="entry-calendar-dot" /> : null}</span>
            <span className="entry-calendar-day-label entry-calendar-label-full">{loading ? "…" : statusLabel(day)}</span><span className="entry-calendar-day-label entry-calendar-label-compact" aria-hidden="true">{loading ? "…" : compactLabel(day)}</span>
          </button>)}
        </div>
        <div className="entry-calendar-legend"><span><i className="is-saved" />With entries</span><span><i className="is-pending" />{emptyLabel}</span><span><i className="is-today" />Today</span><span><i className="is-future" />Upcoming</span></div>
      </div>
      <aside className="entry-calendar-summary" aria-label="Month entry summary">
        <span className="entry-calendar-eyebrow">MONTH AT A GLANCE</span><h3>{monthLabel}</h3>
        <div className="entry-calendar-progress-heading"><strong>{verified ? `${savedElapsed} / ${elapsed}` : "—"}</strong><span>days with entries so far</span></div>
        <div className="entry-calendar-progress" role="progressbar" aria-label="Elapsed days with entries" aria-valuemin={0} aria-valuemax={100} {...(verified ? { "aria-valuenow": progress, "aria-valuetext": `${savedElapsed} of ${elapsed} elapsed days have entries` } : { "aria-valuetext": "Month coverage not yet verified" })}><span style={{ width: `${verified ? progress : 0}%` }} /></div>
        <dl className="entry-calendar-totals"><div className="entry-calendar-total-saved"><dt><CheckCircle2 size={15} />Days with entries</dt><dd>{verified ? saved : "—"}</dd></div><div className="entry-calendar-total-pending"><dt><CircleDashed size={15} />{emptyLabel}</dt><dd>{verified ? pending : "—"}</dd></div><div><dt><Clock3 size={15} />Upcoming days</dt><dd>{upcoming}</dd></div></dl>
        {loading ? <p className="entry-calendar-message" role="status"><RefreshCw size={14} className="animate-spin" />Checking the whole month…</p> : error ? <div className="entry-calendar-error" role="alert"><p>{error}</p>{onRetry && <button type="button" onClick={onRetry}><RefreshCw size={13} />Retry month</button>}</div> : !complete ? <p className="entry-calendar-message">{unavailableMessage || "Month coverage is unavailable. Empty dates have not been checked."}</p> : <p className="entry-calendar-message">{countLabel(totalEntries)} saved{hasTodayPending ? ". Today is still open." : " this month."}</p>}
        {selected && <div className="entry-calendar-selection"><span>Selected date<strong>{fullDate(selected.date)}</strong></span>{onClearSelection && <button type="button" onClick={onClearSelection}>Clear</button>}</div>}
      </aside>
    </div>
    <footer className="entry-calendar-footer">{note || "A day with entries means at least one record is saved. Dates without entries may include non-working days."}</footer>
  </section>;
}
