import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  Edit3,
  Search,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { downloadCsv } from "../../../utils/csv";
import AppInput from "../../../components/common/AppInput";
import AppSelect from "../../../components/common/AppSelect";
import MetricCard from "../../../components/common/MetricCard";
import { hasRecordedProblem, readingRatio } from "./productionAnalytics";
import {
  auditTimestamp,
  calendarAuditDays,
  groupSubmissionDays,
} from "./submissionAudit";
import "./submissionAudit.css";

const number = (value) =>
  Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 1 });
const pct = (value) => (value == null ? "—" : `${number(value)}%`);
const dateLabel = (date) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
const timeLabel = (value) =>
  value == null
    ? "Not available"
    : new Date(value).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Kolkata",
      });
const states = {
  ontime: { text: "On time", tone: "green" },
  delayed: { text: "Delayed", tone: "amber" },
  unlogged: { text: "Unlogged", tone: "red" },
  pending: { text: "Within window", tone: "blue" },
  open: { text: "Day in progress", tone: "neutral" },
  unknown: { text: "Check timestamp", tone: "neutral" },
};
function Status({ day }) {
  const state = states[day.status] || states.unknown;
  return (
    <span className={`submission-status ${state.tone}`}>{state.text}</span>
  );
}
export function DayDrawer({
  day,
  onClose,
  canExport,
  canCreate,
  basis,
  actions,
  scopeLabel = "the selected dashboard scope",
}) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    const previousFocus = document.activeElement;
    if (!dialog.open) dialog.showModal();
    return () => {
      dialog.close();
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected)
        previousFocus.focus();
    };
  }, []);
  return createPortal(
    <dialog
      ref={ref}
      className="submission-drawer"
      aria-labelledby="submission-day-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (
          event.target === event.currentTarget &&
          event.clientX < event.currentTarget.getBoundingClientRect().left
        )
          onClose();
      }}
    >
      <div className="submission-drawer-head">
        <div>
          <span className="submission-eyebrow">DAILY PRODUCTION FILE</span>
          <h2 id="submission-day-title">{dateLabel(day.date)}</h2>
          <p>All saved machine readings in {scopeLabel}.</p>
        </div>
        <button
          className="oee-button"
          aria-label="Close daily details"
          onClick={onClose}
        >
          <X size={18} />
        </button>
      </div>
      <div className="submission-drawer-body">
        <div className="submission-day-status">
          <Status day={day} />
          <span>
            {day.machines} machines · {day.count} readings
          </span>
        </div>
        <div className="submission-day-metrics">
          <div>
            <small>Actual shots</small>
            <strong>{day.count ? number(day.shots) : "—"}</strong>
          </div>
          <div>
            <small>Saved target</small>
            <strong>{day.count ? number(day.target) : "—"}</strong>
          </div>
          <div>
            <small>
              {basis === "mean" ? "Average reading OEE" : "Weighted OEE"}
            </small>
            <strong>{pct(day.value)}</strong>
          </div>
        </div>
        {day.rows.length ? (
          <>
            <div className="submission-timeline">
              <div>
                <small>First entry saved · IST</small>
                <strong>{timeLabel(day.first)}</strong>
              </div>
              <div>
                <small>Last entry saved · IST</small>
                <strong>{timeLabel(day.last)}</strong>
              </div>
              <div>
                <small>Delay after production day closes</small>
                <strong>
                  {day.latency == null
                    ? "Not available"
                    : `${number(day.latency)} days`}
                </strong>
              </div>
            </div>
            <div className="submission-machine-heading">
              <h3>Machine breakdown</h3>
              {canExport && (
                <button
                  className="oee-button"
                  onClick={() =>
                    downloadCsv({
                      filename: `cosmos-production-${day.date}.csv`,
                      rows: day.rows,
                      columns: [
                        "productionDate",
                        "machineCode",
                        "machineName",
                        "mouldName",
                        "machineOnTime",
                        "shotCount",
                        "calculatedTargetShot",
                        "calculatedOeePercentage",
                        "downtimeReasonName",
                        "remarks",
                        "createdAt",
                      ].map((key) => ({ key, header: key })),
                    })
                  }
                >
                  <Download size={13} /> Export day
                </button>
              )}
            </div>
            {day.rows.map((row) => (
              <article className="submission-machine" key={row.id}>
                <div className="submission-machine-title">
                  <div>
                    <span>{row.machineCode || "MACHINE"}</span>
                    <h4>{row.machineName}</h4>
                  </div>
                  <strong>{pct(readingRatio(row))}</strong>
                </div>
                <p>{row.mouldName || "Mould not recorded"}</p>
                <div className="submission-machine-values">
                  <span>
                    On-time<b>{row.machineOnTime || "—"}</b>
                  </span>
                  <span>
                    Shots<b>{number(row.shotCount)}</b>
                  </span>
                  <span>
                    Target<b>{number(row.calculatedTargetShot)}</b>
                  </span>
                </div>
                <div
                  className={`submission-machine-note ${hasRecordedProblem(row) ? "has-problem" : ""}`}
                >
                  <strong>
                    {row.downtimeReasonName || "No reason recorded"}
                  </strong>
                  <p>{row.remarks || "No remarks"}</p>
                </div>
                <footer>
                  Saved {timeLabel(auditTimestamp(row.createdAt))} IST · Entry #
                  {row.id}
                  {row.updatedAt && (
                    <span>
                      Updated {timeLabel(auditTimestamp(row.updatedAt))} IST
                    </span>
                  )}
                </footer>
                {(actions?.canEdit || actions?.canDelete) && (
                  <div className="submission-machine-actions">
                    {actions.canEdit && (
                      <button
                        type="button"
                        className="oee-button"
                        aria-label={`Edit ${row.machineCode || row.machineName} entry`}
                        onClick={() => {
                          onClose();
                          actions.onEdit(row);
                        }}
                      >
                        <Edit3 size={14} /> Edit entry
                      </button>
                    )}
                    {actions.canDelete && (
                      <button
                        type="button"
                        className="oee-button submission-delete"
                        aria-label={`Delete ${row.machineCode || row.machineName} entry`}
                        onClick={() => {
                          onClose();
                          actions.onDelete(row);
                        }}
                      >
                        <Trash2 size={14} /> Delete entry
                      </button>
                    )}
                  </div>
                )}
              </article>
            ))}
          </>
        ) : (
          <div className="submission-empty">
            <CalendarDays size={28} />
            <h3>No readings saved for this date</h3>
            <p>
              Confirm whether production was scheduled before treating this as a
              missed submission.
            </p>
            {canCreate && (
              <Link
                className="oee-button"
                to={`/oee/production-entries?date=${day.date}`}
              >
                Log production for this date <ChevronRight size={14} />
              </Link>
            )}
          </div>
        )}
      </div>
      <div className="submission-drawer-footer">
        Production date groups machine records for review. No saved records are
        merged or changed.
      </div>
    </dialog>,
    document.body,
  );
}
export default function DailySubmissionAudit({
  entries,
  from,
  to,
  mode,
  basis,
  canExport,
  canCreate,
  initialReason = "",
  onClearReason,
}) {
  const [view, setView] = useState("ledger");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [monthChoice, setMonthChoice] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [page, setPage] = useState(1);
  const [now] = useState(() => Date.now());
  const groups = useMemo(
    () => groupSubmissionDays(entries, basis, 3, now),
    [entries, basis, now],
  );
  const days = useMemo(
    () =>
      mode === "calendar"
        ? calendarAuditDays(groups, from, to, 3, now)
        : [...groups].reverse(),
    [groups, from, to, mode, now],
  );
  const months = [...new Set(days.map((day) => day.date.slice(0, 7)))];
  const month = months.includes(monthChoice) ? monthChoice : months.at(-1);
  const monthIndex = months.indexOf(month);
  const known = groups.filter(
    (day) => day.status === "ontime" || day.status === "delayed",
  );
  const ontime = groups.filter((day) => day.status === "ontime").length;
  const gaps = days.filter((day) => day.status === "unlogged");
  const anomalies = groups.filter(
    (day) =>
      day.duplicates.length || day.anomalies.length || day.status === "unknown",
  );
  const duplicateCount = groups.reduce(
    (sum, day) => sum + day.duplicates.length,
    0,
  );
  const normalizedSearch = search.trim().toLowerCase();
  const matches = (day) =>
    (status === "all" ||
      (status === "duplicate"
        ? day.duplicates.length > 0
        : day.status === status)) &&
    (!normalizedSearch ||
      [
        day.date,
        dateLabel(day.date),
        ...day.rows.flatMap((row) => [
          row.machineCode,
          row.machineName,
          row.mouldName,
          row.downtimeReasonName,
          row.remarks,
        ]),
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch)) &&
    (!initialReason ||
      day.rows.some((row) =>
        initialReason === "problems"
          ? hasRecordedProblem(row)
          : (row.downtimeReasonName || `Reason ${row.downtimeReasonId}`) ===
            initialReason.slice(7),
      ));
  const ledger = groups.filter(matches);
  const calendar = days.filter(
    (day) => day.date.startsWith(month || "") && matches(day),
  );
  const selected =
    days.find((day) => day.date === selectedDate) ||
    groups.find((day) => day.date === selectedDate);
  const pages = Math.max(1, Math.ceil(ledger.length / 12));
  const activePage = Math.min(page, pages);
  const exportDays = () =>
    downloadCsv({
      filename: `cosmos-daily-submissions-${from || "history"}.csv`,
      rows: ledger,
      columns: [
        { key: "date", header: "Production date" },
        { key: "machines", header: "Reporting machines" },
        { key: "count", header: "Saved readings" },
        { key: "shots", header: "Actual shots" },
        { key: "target", header: "Saved target shots" },
        {
          key: "value",
          header: basis === "mean" ? "Mean reading OEE %" : "Weighted OEE %",
        },
        { header: "Review status", getValue: (day) => states[day.status].text },
        { header: "Last saved (IST)", getValue: (day) => timeLabel(day.last) },
        { key: "latency", header: "Days after production day close" },
      ],
    });
  return (
    <section className="submission-audit">
      <header className="submission-header">
        <div className="submission-title-icon">
          <ShieldCheck size={22} />
        </div>
        <div>
          <h2>
            Daily submissions & production audit{" "}
            <span>3-DAY REVIEW WINDOW</span>
          </h2>
          <p>One production date. Every machine. A complete daily picture.</p>
        </div>
        {canExport && (
          <button
            className="oee-button"
            disabled={!ledger.length}
            onClick={exportDays}
          >
            <Download size={14} /> Export daily ledger
          </button>
        )}
      </header>
      <div className="submission-summary">
        <MetricCard
          labelClassName="whitespace-normal text-[11px] leading-5"
          metaClassName="whitespace-normal leading-5"
          valueClassName="text-2xl font-semibold"
          icon={Clock3}
          label="On-time saved dates"
          tone="brand"
          value={known.length ? pct((ontime / known.length) * 100) : "—"}
          hint={`${ontime} on time · ${known.length - ontime} delayed${groups.length > known.length ? ` · ${groups.length - known.length} unknown` : ""}`}
        />
        <MetricCard
          labelClassName="whitespace-normal text-[11px] leading-5"
          metaClassName="whitespace-normal leading-5"
          valueClassName="text-2xl font-semibold"
          icon={CalendarDays}
          label="Logged dates"
          tone="sky"
          value={
            <>
              {groups.length}
              <span className="ml-1 text-xs font-medium text-slate-500">
                {mode === "calendar" ? `/ ${days.length} dates` : "in sample"}
              </span>
            </>
          }
          hint={`${entries.length} machine readings grouped by date`}
        />
        <MetricCard
          labelClassName="whitespace-normal text-[11px] leading-5"
          metaClassName="whitespace-normal leading-5"
          valueClassName="text-2xl font-semibold"
          icon={AlertTriangle}
          label="Unlogged dates"
          tone={gaps.length ? "red" : "amber"}
          value={mode === "calendar" ? gaps.length : "—"}
          hint={
            mode === "calendar"
              ? "No records after the 3-day window"
              : "Choose a calendar period to find gaps"
          }
        />
        <MetricCard
          labelClassName="whitespace-normal text-[11px] leading-5"
          metaClassName="whitespace-normal leading-5"
          valueClassName="text-2xl font-semibold"
          icon={CheckCircle2}
          label="Duplicate pairs"
          tone="emerald"
          value={duplicateCount}
          hint="Repeated machine and production date"
        />
      </div>
      <nav className="submission-tabs" aria-label="Daily audit views">
        {[
          ["calendar", "Calendar & missing dates"],
          ["ledger", "Daily submission ledger"],
          ["anomalies", "Duplicate & anomaly review"],
        ].map(([key, label]) => (
          <button
            key={key}
            aria-current={view === key ? "page" : undefined}
            onClick={() => {
              setView(key);
              setStatus("all");
              setPage(1);
            }}
          >
            {key === "calendar" ? (
              <CalendarDays size={14} />
            ) : key === "ledger" ? (
              <Clock3 size={14} />
            ) : (
              <AlertTriangle size={14} />
            )}
            {label}
            <span>
              {key === "calendar"
                ? gaps.length
                : key === "ledger"
                  ? groups.length
                  : anomalies.length}
            </span>
          </button>
        ))}
      </nav>
      <p className="submission-explanation">
        {mode === "calendar"
          ? "Audit follows the selected date, machine and mould scope. Unlogged dates include possible holidays; no working-day schedule is configured."
          : "Latest-readings mode is a sample of history. Switch to Calendar period for a complete submission-gap review."}{" "}
        The 3-day rule is a review guide, measured from midnight IST after the
        production date to the last saved machine entry.
      </p>
      {view === "calendar" && gaps.length > 0 && (
        <div className="submission-alert">
          <AlertTriangle size={18} />
          <div>
            <strong>{gaps.length} unlogged dates need a review</strong>
            <p>Check whether production was scheduled before following up.</p>
            <div>
              {gaps
                .slice(-5)
                .reverse()
                .map((day) => (
                  <button
                    key={day.date}
                    onClick={() => setSelectedDate(day.date)}
                  >
                    {dateLabel(day.date)} <ChevronRight size={12} />
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}
      {view !== "anomalies" && (
        <div className="submission-tools">
          <AppInput
            leadingIcon={Search}
            aria-label="Search daily submissions"
            placeholder="Search date, machine, mould, reason or remarks…"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
          <div className="submission-status-filter">
            <AppSelect
              aria-label="Submission status"
              value={status}
              onChange={(value) => {
                setStatus(value);
                setPage(1);
              }}
              options={[
                { value: "all", label: "All statuses" },
                ...Object.entries(states).map(([value, state]) => ({
                  value,
                  label: state.text,
                })),
                { value: "duplicate", label: "Duplicate machine rows" },
              ]}
            />
          </div>
        </div>
      )}
      {initialReason && (
        <p className="submission-filter-note">
          <button className="oee-button" onClick={onClearReason}>
            Clear reason filter
          </button>{" "}
          Showing dates containing{" "}
          {initialReason === "problems"
            ? "a recorded problem"
            : initialReason.slice(7)}
          . Opening a date shows all its machines in the dashboard scope.
        </p>
      )}
      {view === "ledger" && (
        <div className="submission-panel">
          <div className="submission-panel-title">
            <h3>Daily submission ledger</h3>
            <p>Click a date to inspect every machine in the side panel.</p>
          </div>
          <div className="oee-table-wrap">
            <table className="submission-ledger">
              <thead>
                <tr>
                  {[
                    "Production date",
                    "Last saved · IST",
                    "Review status",
                    "Total shots",
                    "Machines & recorded notes",
                    "",
                  ].map((label, index) => (
                    <th key={index}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ledger
                  .slice((activePage - 1) * 12, activePage * 12)
                  .map((day) => (
                    <tr
                      key={day.date}
                      className={selectedDate === day.date ? "is-selected" : ""}
                      onClick={() => setSelectedDate(day.date)}
                    >
                      <td>
                        <button
                          aria-label={`Inspect ${day.date}`}
                          onClick={() => setSelectedDate(day.date)}
                        >
                          <strong>{dateLabel(day.date)}</strong>
                          <small>{day.date}</small>
                        </button>
                      </td>
                      <td>
                        <strong>{timeLabel(day.last)}</strong>
                        <small>
                          {day.latency == null
                            ? "Timestamp unavailable"
                            : `+${number(day.latency)} days after day close`}
                        </small>
                      </td>
                      <td>
                        <Status day={day} />
                        {day.duplicates.length > 0 && (
                          <small className="submission-duplicate">
                            Duplicate machine rows
                          </small>
                        )}
                      </td>
                      <td>
                        <strong>{number(day.shots)}</strong>
                        <small>{pct(day.value)} OEE</small>
                      </td>
                      <td>
                        <strong>
                          {day.machines} machines · {day.count} readings
                        </strong>
                        <span className="submission-machine-preview">
                          {day.rows
                            .map(
                              (row) =>
                                `${row.machineCode || row.machineName}: ${number(row.shotCount)}`,
                            )
                            .join(" · ")}
                        </span>
                        {day.problems > 0 && (
                          <small className="submission-problem-note">
                            {day.problems} readings with a recorded problem
                          </small>
                        )}
                      </td>
                      <td>
                        <button
                          className="oee-button"
                          aria-label={`Open machine details for ${day.date}`}
                          onClick={() => setSelectedDate(day.date)}
                        >
                          <ChevronRight size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          {!ledger.length && (
            <div className="submission-empty">
              <CalendarDays size={27} />
              <p>
                No submitted dates match these filters. Use the calendar to
                review dates without records.
              </p>
            </div>
          )}
          <div className="oee-pagination">
            <span>
              {ledger.length} production dates ·{" "}
              {ledger.reduce((sum, day) => sum + day.count, 0)} saved machine
              readings
            </span>
            <div>
              <button
                className="oee-button"
                aria-label="Previous dates page"
                disabled={activePage <= 1}
                onClick={() => setPage(activePage - 1)}
              >
                <ChevronLeft size={15} />
              </button>
              <span>
                {activePage} / {pages}
              </span>
              <button
                className="oee-button"
                aria-label="Next dates page"
                disabled={activePage >= pages}
                onClick={() => setPage(activePage + 1)}
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        </div>
      )}
      {view === "calendar" && (
        <div className="submission-panel">
          <div className="submission-calendar-heading">
            <div>
              <h3>Submission calendar</h3>
              <p>
                {month
                  ? new Date(`${month}-01T12:00:00Z`).toLocaleDateString(
                      "en-IN",
                      { month: "long", year: "numeric", timeZone: "UTC" },
                    )
                  : "No dates available"}
              </p>
            </div>
            <div>
              <button
                className="oee-button"
                aria-label="Previous audit month"
                disabled={monthIndex <= 0}
                onClick={() => setMonthChoice(months[monthIndex - 1])}
              >
                <ChevronLeft size={15} />
              </button>
              <button
                className="oee-button"
                aria-label="Next audit month"
                disabled={monthIndex >= months.length - 1}
                onClick={() => setMonthChoice(months[monthIndex + 1])}
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
          <div className="submission-legend">
            {Object.entries(states).map(([key, state]) => (
              <span key={key}>
                <i className={state.tone} />
                {state.text}
              </span>
            ))}
          </div>
          <div className="submission-calendar">
            {calendar.map((day) => (
              <button
                className={`submission-calendar-day ${states[day.status].tone}`}
                key={day.date}
                onClick={() => setSelectedDate(day.date)}
                aria-label={`Inspect ${day.date}: ${states[day.status].text}`}
              >
                <div>
                  <span>
                    {new Date(`${day.date}T12:00:00Z`).toLocaleDateString(
                      "en-IN",
                      { weekday: "short", timeZone: "UTC" },
                    )}
                  </span>
                  <Status day={day} />
                </div>
                <strong>
                  {Number(day.date.slice(-2))}
                  <small>
                    {new Date(`${day.date}T12:00:00Z`).toLocaleDateString(
                      "en-IN",
                      { month: "short", timeZone: "UTC" },
                    )}
                  </small>
                </strong>
                <p>
                  {day.count
                    ? `${day.machines} machines · ${number(day.shots)} shots`
                    : "No saved readings"}
                </p>
                <footer>
                  {day.count
                    ? `${day.latency == null ? "Unknown delay" : `+${number(day.latency)}d delay`}`
                    : day.status === "unlogged"
                      ? "Review production schedule"
                      : "Awaiting records"}
                  <ChevronRight size={12} />
                </footer>
                {day.duplicates.length > 0 && (
                  <span className="submission-duplicate">
                    Duplicate machine rows
                  </span>
                )}
              </button>
            ))}
          </div>
          {!calendar.length && (
            <div className="submission-empty">
              No dates match this month and status filter.
            </div>
          )}
        </div>
      )}
      {view === "anomalies" && (
        <div className="submission-panel">
          <div className="submission-panel-title">
            <h3>Duplicate & anomaly review</h3>
            <p>
              Multiple machines on the same date make one daily submission
              group. Only repeated machine/date pairs are flagged.
            </p>
          </div>
          {anomalies.length ? (
            anomalies.map((day) => (
              <button
                className="submission-anomaly"
                key={day.date}
                onClick={() => setSelectedDate(day.date)}
              >
                <AlertTriangle size={19} />
                <div>
                  <strong>{dateLabel(day.date)}</strong>
                  <p>
                    {[
                      day.duplicates.length
                        ? `${day.duplicates.length} repeated machine/date pairs`
                        : "",
                      day.anomalies.length
                        ? `${day.anomalies.length} readings with shots but no positive target`
                        : "",
                      day.status === "unknown"
                        ? "Missing or future save timestamp"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <ChevronRight size={16} />
              </button>
            ))
          ) : (
            <div className="submission-empty">
              <ShieldCheck size={32} />
              <h3>No detected duplicates or data anomalies</h3>
              <p>
                Checks cover the currently loaded scope. No records have been
                changed.
              </p>
            </div>
          )}
        </div>
      )}
      {selected && (
        <DayDrawer
          key={selected.date}
          day={selected}
          onClose={() => setSelectedDate("")}
          canExport={canExport}
          canCreate={canCreate}
          basis={basis}
        />
      )}
    </section>
  );
}
