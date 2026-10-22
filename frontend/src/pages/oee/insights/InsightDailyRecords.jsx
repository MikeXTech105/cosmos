import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, List } from "lucide-react";
import AppSelect from "../../../components/common/AppSelect";
import AppButton from "../../../components/common/AppButton";
import AppModal from "../../../components/common/AppModal";
import { calendarAuditDays } from "../dashboard/submissionAudit";
import {
  hasRecordedProblem,
  readingRatio,
} from "../dashboard/productionAnalytics";
import { insightSummary } from "./productionInsights";

const n = (value) =>
  value == null || value === "" || !Number.isFinite(Number(value))
    ? "—"
    : Number(value).toLocaleString("en-IN", { maximumFractionDigits: 1 });
const pct = (value) => (value == null ? "—" : `${n(value)}%`);
const label = (value, opts = {}) =>
  new Date(`${value}T12:00:00Z`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
    ...opts,
  });

export function InsightDayDetails({ day, onClose, canCreate }) {
  const summary = insightSummary(day.rows);
  return (
    <AppModal
      isOpen
      onClose={onClose}
      maxWidth="max-w-5xl"
      title={
        <>
          <span className="insight-eyebrow block">DAILY PRODUCTION FILE</span>
          <span className="mt-1 block text-xl">
            {label(day.date, { weekday: "short" })}
          </span>
        </>
      }
    >
      <div className="insight-machine-modal">
        <p>All saved machines within the current insights filters.</p>
        <div className="insight-detail-metrics">
          <div>
            <small>Actual shots</small>
            <strong>
              {summary.count > summary.invalidShots ? n(summary.actual) : "—"}
            </strong>
          </div>
          <div>
            <small>Comparable target</small>
            <strong>{summary.eligible ? n(summary.target) : "—"}</strong>
          </div>
          <div>
            <small>Target achievement</small>
            <strong>{pct(summary.achievement)}</strong>
          </div>
        </div>
        <p>
          {summary.machines} machines · {summary.count} saved readings ·{" "}
          {summary.eligible} comparable readings
        </p>
        {summary.count > 0 ? (
          <div className="insight-table-wrap insight-modal-table">
            <table>
              <thead>
                <tr>
                  <th>Machine</th>
                  <th>Mould</th>
                  <th>On-time</th>
                  <th>Shots / saved target</th>
                  <th>Achievement</th>
                  <th>Recorded reason & remarks</th>
                </tr>
              </thead>
              <tbody>
                {day.rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <strong>{row.machineCode || row.machineName}</strong>
                      <small>{row.machineName}</small>
                    </td>
                    <td>{row.mouldName || "—"}</td>
                    <td>{row.machineOnTime || "—"}</td>
                    <td>
                      {n(row.shotCount)}{" "}
                      <small>/ {n(row.calculatedTargetShot)}</small>
                    </td>
                    <td>{pct(readingRatio(row))}</td>
                    <td>
                      <strong
                        className={
                          hasRecordedProblem(row) ? "insight-warning-text" : ""
                        }
                      >
                        {row.downtimeReasonName || "No reason recorded"}
                      </strong>
                      <small>{row.remarks || "No remarks"}</small>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="insight-empty">
            <CalendarDays size={26} />
            <p>
              No readings saved for this date. Production status is unknown.
            </p>
            {canCreate && (
              <a
                className="insight-link"
                href={`/oee/production-entries?date=${day.date}`}
              >
                Open production entry for this date <ChevronRight size={14} />
              </a>
            )}
          </div>
        )}
        <p className="insight-help">
          Production totals include valid shot readings. Achievement compares
          only readings with valid shots and positive saved targets.
        </p>
        <div className="insight-modal-footer">
          <AppButton variant="secondary" onClick={onClose}>
            Close details
          </AppButton>
        </div>
      </div>
    </AppModal>
  );
}
export default function InsightDailyRecords({ days, range, onDate }) {
  const [view, setView] = useState("calendar");
  const [monthChoice, setMonthChoice] = useState("");
  const [page, setPage] = useState(1);
  const calendar = useMemo(
    () => calendarAuditDays(days, range.fromDate, range.toDate),
    [days, range],
  );
  const months = [...new Set(calendar.map((day) => day.date.slice(0, 7)))];
  const month = months.includes(monthChoice) ? monthChoice : months.at(-1);
  const shown = calendar.filter((day) => day.date.startsWith(month));
  const pages = Math.max(1, Math.ceil(days.length / 12)),
    activePage = Math.min(page, pages);
  const visible = days.slice((activePage - 1) * 12, activePage * 12);
  return (
    <section className="insight-panel">
      <div className="insight-daily-heading">
        <div>
          <h2>Daily production records</h2>
          <p>One date, every machine. Open a day for its saved readings.</p>
        </div>
        <div className="insight-daily-switch" aria-label="Daily record layout">
          <button
            aria-pressed={view === "calendar"}
            onClick={() => setView("calendar")}
          >
            <CalendarDays size={15} />
            Calendar
          </button>
          <button
            aria-pressed={view === "ledger"}
            onClick={() => setView("ledger")}
          >
            <List size={15} />
            Ledger
          </button>
        </div>
      </div>
      {view === "calendar" ? (
        <>
          <div className="insight-calendar-tools">
            <div>
              <span className="insight-calendar-key">
                <i />
                Saved readings
              </span>
              <span className="insight-calendar-key neutral">
                <i />
                No saved readings
              </span>
            </div>
            <AppSelect
              aria-label="Production calendar month"
              value={month || ""}
              onChange={setMonthChoice}
              options={months.map((value) => ({
                value,
                label: label(`${value}-01`, { day: undefined, month: "long" }),
              }))}
            />
          </div>
          <div className="insight-calendar-grid">
            {shown.map((day) => {
              const summary = insightSummary(day.rows);
              return (
                <button
                  key={day.date}
                  className={`insight-calendar-tile ${day.count ? "logged" : ""}`}
                  aria-label={`View daily production ${day.date}`}
                  onClick={() => onDate(day.date)}
                >
                  <div>
                    <small>
                      {label(day.date, {
                        year: undefined,
                        month: undefined,
                        day: undefined,
                        weekday: "short",
                      })}
                    </small>
                    <span>
                      {day.count ? `${day.machines} machines` : "No entry"}
                    </span>
                  </div>
                  <strong>
                    {day.date.slice(8)}
                    <small>
                      {label(day.date, { day: undefined, year: undefined })}
                    </small>
                  </strong>
                  <p>
                    {summary.count > summary.invalidShots
                      ? `${n(summary.actual)} shots`
                      : "No saved readings"}
                  </p>
                  <footer>
                    {day.count
                      ? `${pct(summary.achievement)} achievement`
                      : "Production status unknown"}
                    <ChevronRight size={13} />
                  </footer>
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <div className="insight-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Production date</th>
                  <th>Machines / readings</th>
                  <th>Actual shots</th>
                  <th>Comparable target</th>
                  <th>Achievement</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((day) => {
                  const summary = insightSummary(day.rows);
                  return (
                    <tr key={day.date}>
                      <td>
                        <button
                          className="insight-link"
                          onClick={() => onDate(day.date)}
                        >
                          {label(day.date)}
                        </button>
                      </td>
                      <td>
                        {day.machines} machines
                        <small>{day.count} saved readings</small>
                      </td>
                      <td>
                        {summary.count > summary.invalidShots
                          ? n(summary.actual)
                          : "—"}
                      </td>
                      <td>{summary.eligible ? n(summary.target) : "—"}</td>
                      <td>{pct(summary.achievement)}</td>
                      <td>
                        <button
                          aria-label={`View daily production ${day.date}`}
                          className="insight-link"
                          onClick={() => onDate(day.date)}
                        >
                          Open day <ChevronRight size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!days.length && (
            <div className="insight-empty">
              No saved production dates in this period and scope.
            </div>
          )}
          <div className="insight-daily-pagination">
            <span>{days.length} production dates</span>
            <div>
              <AppButton
                variant="secondary"
                disabled={activePage <= 1}
                aria-label="Previous production dates"
                onClick={() => setPage(activePage - 1)}
              >
                <ChevronLeft size={14} />
              </AppButton>
              <span>
                {activePage} / {pages}
              </span>
              <AppButton
                variant="secondary"
                disabled={activePage >= pages}
                aria-label="Next production dates"
                onClick={() => setPage(activePage + 1)}
              >
                <ChevronRight size={14} />
              </AppButton>
            </div>
          </div>
        </>
      )}
      <p className="insight-chart-caption">
        Unlogged dates may include holidays or non-production days. Saved
        entries do not contain a working-day schedule.
      </p>
    </section>
  );
}
