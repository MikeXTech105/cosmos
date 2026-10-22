import { useMemo, useState } from "react";
import { CalendarDays, ChevronRight, ClipboardList } from "lucide-react";
import { DayDrawer } from "../dashboard/DailySubmissionAudit";
import { groupSubmissionDays } from "../dashboard/submissionAudit";
import {
  formatOeeDate,
  formatOeeNumber,
  formatOeePercent,
} from "../oeeHelpers";
import { OeeEmptyState, OeePagination } from "../OeeShared";
import "../dashboard/oeeDashboard.css";
import "./productionHistory.css";

export default function ProductionHistoryByDate({
  actions,
  entries,
  error,
  isLoading,
  onPageChange,
  onPageSizeChange,
  onRetry,
  pageNumber,
  pageSize,
}) {
  const [selectedDate, setSelectedDate] = useState("");
  const groups = useMemo(() => groupSubmissionDays(entries), [entries]);
  const totalPages = Math.max(1, Math.ceil(groups.length / pageSize));
  const page = Math.min(pageNumber, totalPages);
  const visible = groups.slice((page - 1) * pageSize, page * pageSize);
  const selected = groups.find((day) => day.date === selectedDate);

  if (isLoading)
    return (
      <div
        className="rounded-2xl border border-slate-200 bg-white p-5"
        role="status"
        aria-label="Loading production dates"
      >
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="my-3 h-16 animate-pulse rounded-xl bg-slate-100"
          />
        ))}
      </div>
    );
  if (error || !groups.length)
    return (
      <OeeEmptyState
        icon={ClipboardList}
        title="No production entries found"
        description="Saved production dates will appear here. Open a date to review its machine entries."
        error={error}
        onRetry={onRetry}
      />
    );

  return (
    <div className="production-history">
      <div className="production-history-intro">
        <span className="production-history-icon">
          <CalendarDays size={20} />
        </span>
        <div>
          <h3>Daily production ledger</h3>
          <p>
            One row per date. Open a day to review its machines, moulds and
            remarks.
          </p>
        </div>
        <span className="production-history-count">
          {groups.length} {groups.length === 1 ? "date" : "dates"}{" "}
          <span>
            · {entries.length} machine{" "}
            {entries.length === 1 ? "entry" : "entries"}
          </span>
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="production-history-table">
          <thead>
            <tr>
              <th>Production date</th>
              <th>Machines</th>
              <th>Total shots</th>
              <th>Total target</th>
              <th>Weighted OEE</th>
              <th>Recorded issues</th>
              <th>
                <span className="sr-only">Details</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((day) => (
              <tr key={day.date} onClick={() => setSelectedDate(day.date)}>
                <td>
                  <button
                    type="button"
                    className="production-history-date"
                    onClick={() => setSelectedDate(day.date)}
                    aria-label={`View production for ${formatOeeDate(day.date)}`}
                  >
                    <CalendarDays size={16} />
                    <span>
                      {formatOeeDate(day.date)}
                      <small>
                        {day.count} saved machine{" "}
                        {day.count === 1 ? "entry" : "entries"}
                      </small>
                    </span>
                  </button>
                </td>
                <td>
                  <strong>
                    {day.machines} {day.machines === 1 ? "machine" : "machines"}
                  </strong>
                  <small className="production-history-machines">
                    {[
                      ...new Set(
                        day.rows.map(
                          (row) => row.machineCode || row.machineName,
                        ),
                      ),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </small>
                </td>
                <td className="production-history-number">
                  {formatOeeNumber(day.shots)}
                </td>
                <td className="production-history-number">
                  {formatOeeNumber(day.target)}
                </td>
                <td>
                  <span
                    className={`production-history-oee ${day.value == null ? "neutral" : day.value >= 85 ? "good" : day.value >= 60 ? "fair" : "low"}`}
                  >
                    {day.value == null ? "—" : formatOeePercent(day.value)}
                  </span>
                </td>
                <td>
                  <span
                    className={
                      day.problems
                        ? "production-history-issue"
                        : "text-slate-400"
                    }
                  >
                    {day.problems
                      ? `${day.problems} ${day.problems === 1 ? "entry" : "entries"} with reasons`
                      : "No issues recorded"}
                  </span>
                </td>
                <td>
                  <ChevronRight
                    size={18}
                    className="text-brand"
                    aria-hidden="true"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <OeePagination
        itemCount={visible.length}
        itemLabel={groups.length === 1 ? "production date" : "production dates"}
        pageNumber={page}
        pageSize={pageSize}
        totalCount={groups.length}
        totalPages={totalPages}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
      {selected && (
        <DayDrawer
          day={selected}
          basis="weighted"
          scopeLabel="the current history filters"
          onClose={() => setSelectedDate("")}
          actions={actions}
        />
      )}
    </div>
  );
}
