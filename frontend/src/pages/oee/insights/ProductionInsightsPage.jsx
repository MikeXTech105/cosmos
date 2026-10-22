import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Download,
  Factory,
  Info,
  RefreshCw,
  ShieldCheck,
  Target,
  TriangleAlert,
} from "lucide-react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import AppButton from "../../../components/common/AppButton";
import AppDateRangeFilter from "../../../components/common/AppDateRangeFilter";
import AppModal from "../../../components/common/AppModal";
import AppSelect from "../../../components/common/AppSelect";
import MetricCard from "../../../components/common/MetricCard";
import PageHeader from "../../../components/common/PageHeader";
import { oeeProductionEntryService } from "../../../services/oee/oeeProductionEntryService";
import { getApiErrorMessage } from "../../../utils/apiError";
import { downloadCsv } from "../../../utils/csv";
import useOeeCapabilities from "../useOeeCapabilities";
import { loadDowntimeEntries } from "../dashboard/downtimeAnalysis";
import InsightDailyRecords, { InsightDayDetails } from "./InsightDailyRecords";
import {
  calendarAuditDays,
  groupSubmissionDays,
} from "../dashboard/submissionAudit";
import {
  hasRecordedProblem,
  readingRatio,
} from "../dashboard/productionAnalytics";
import {
  buildInsights,
  comparisonRange,
  indiaToday,
  insightPreset,
  metricChange,
} from "./productionInsights";
import "./productionInsights.css";

const n = (value, digits = 0) =>
  value == null || value === "" || !Number.isFinite(Number(value))
    ? "—"
    : Number(value).toLocaleString("en-IN", { maximumFractionDigits: digits });
const pct = (value) => (value == null ? "—" : `${n(value, 1)}%`);
const date = (value) =>
  value
    ? new Date(`${value.slice(0, 10)}T12:00:00Z`).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      })
    : "—";
const span = (range) => `${date(range.fromDate)} – ${date(range.toDate)}`;
const stamp = (value) =>
  value == null
    ? "Not available"
    : new Date(value).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Kolkata",
      });
const optionsFor = (rows, field, label, all) => [
  { value: "", label: all },
  ...[
    ...new Map(
      rows.map((row) => [
        String(row[field]),
        { value: String(row[field]), label: row[label] || String(row[field]) },
      ]),
    ).values(),
  ].sort((a, b) => a.label.localeCompare(b.label)),
];
function Delta({
  current,
  previous,
  available,
  points,
  lowerIsBetter = false,
  neutral = false,
}) {
  const change = metricChange(current, previous, { available, points });
  if (change.value == null)
    return <span className="insight-delta muted">{change.text}</span>;
  const positive = change.value > 0;
  const tone =
    neutral || change.value === 0
      ? "muted"
      : positive !== lowerIsBetter
        ? "good"
        : "bad";
  const Icon = positive ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`insight-delta ${tone}`}>
      {change.value !== 0 && <Icon size={13} />}
      {positive ? "+" : ""}
      {n(change.value, 1)}
      {points ? " pp" : "%"}
      <small>vs prior period</small>
    </span>
  );
}
function InsightPanel({ title, detail, icon: Icon, children, className = "" }) {
  return (
    <section className={`insight-panel ${className}`}>
      <div className="insight-panel-heading">
        <div>
          {Icon && <Icon size={17} />}
          <h2>{title}</h2>
        </div>
        {detail && <p>{detail}</p>}
      </div>
      {children}
    </section>
  );
}
function TrendTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="insight-tooltip">
      <strong>{date(row.date)}</strong>
      <p>Production: {n(row.actual)} shots</p>
      <p>Saved target: {n(row.target)} shots</p>
      <hr />
      <small>Compared date · {date(row.priorDate)}</small>
      <p>Production: {n(row.previous)} shots</p>
    </div>
  );
}
function MachineDetails({
  machine,
  onClose,
  onDate,
  previousAvailable,
  range,
  comparison,
}) {
  return (
    <AppModal
      isOpen={Boolean(machine)}
      onClose={onClose}
      maxWidth="max-w-4xl"
      title={
        <>
          <span className="insight-eyebrow block">MACHINE PERFORMANCE</span>
          <span className="mt-1 block text-xl">
            {machine.code}{" "}
            {machine.name !== machine.code ? `· ${machine.name}` : ""}
          </span>
        </>
      }
    >
      <div className="insight-machine-modal">
        <p>{span(range)}</p>
        <div className="insight-detail-metrics">
          <div>
            <small>Actual shots</small>
            <strong>
              {machine.count > machine.invalidShots ? n(machine.actual) : "—"}
            </strong>
          </div>
          <div>
            <small>Comparable target</small>
            <strong>{machine.eligible ? n(machine.target) : "—"}</strong>
          </div>
          <div>
            <small>Target achievement</small>
            <strong>{pct(machine.achievement)}</strong>
          </div>
        </div>
        <div className="insight-detail-comparison">
          <span>Prior period · {span(comparison)}</span>
          <Delta
            current={machine.achievement}
            previous={machine.previous.achievement}
            points
            available={
              previousAvailable &&
              machine.count > 0 &&
              machine.previous.count > 0
            }
          />
        </div>
        <p className="insight-help">
          Select a production date to see all its machines within the current
          filters.
        </p>
        <div className="insight-table-wrap insight-modal-table">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Mould</th>
                <th>On-time</th>
                <th>Shots / target</th>
                <th>Achievement</th>
                <th>Recorded reason & remarks</th>
              </tr>
            </thead>
            <tbody>
              {[...machine.rows]
                .sort((a, b) =>
                  String(b.productionDate).localeCompare(
                    String(a.productionDate),
                  ),
                )
                .map((row) => (
                  <tr key={row.id}>
                    <td>
                      <button
                        className="insight-link"
                        onClick={() => {
                          onClose();
                          onDate(row.productionDate.slice(0, 10));
                        }}
                      >
                        {date(row.productionDate)}
                      </button>
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
        {!machine.rows.length && (
          <p className="insight-empty">
            No readings in the selected period. This machine appears in the
            comparison period only.
          </p>
        )}
        <div className="insight-modal-footer">
          <AppButton variant="secondary" onClick={onClose}>
            Close details
          </AppButton>
        </div>
      </div>
    </AppModal>
  );
}
export default function ProductionInsightsPage() {
  const [period, setPeriod] = useState("last30");
  const [range, setRange] = useState(() => insightPreset("last30"));
  const [machine, setMachine] = useState("");
  const [mould, setMould] = useState("");
  const [revision, setRevision] = useState(0);
  const [view, setView] = useState("overview");
  const [detailMachine, setDetailMachine] = useState("");
  const [detailDate, setDetailDate] = useState("");
  const [result, setResult] = useState({
    key: "",
    currentRows: [],
    previousRows: [],
    error: "",
    previousError: "",
    updated: null,
  });
  const reports = useOeeCapabilities({
    actions: ["export"],
    label: "OEE Reports",
    pageName: "OEE.Reports",
    route: "/oee/reports",
    resource: ["oeeReports", "reports"],
  });
  const entryPermissions = useOeeCapabilities({
    actions: ["create"],
    label: "OEE Production Entries",
    pageName: "OEE.ProductionEntries",
    route: "/oee/production-entries",
    resource: "oeeProductionEntries",
  });
  const comparison = useMemo(() => comparisonRange(range), [range]);
  const invalidRange = !comparison || range.toDate > indiaToday();
  const requestKey = JSON.stringify([range.fromDate, range.toDate, revision]);
  const from = range.fromDate,
    to = range.toDate;
  const previousFrom = comparison?.fromDate,
    previousTo = comparison?.toDate;
  useEffect(() => {
    if (invalidRange) return;
    const controller = new AbortController();
    Promise.allSettled([
      loadDowntimeEntries(
        oeeProductionEntryService.getProductionEntries,
        { FromDate: from, ToDate: to },
        controller.signal,
      ),
      loadDowntimeEntries(
        oeeProductionEntryService.getProductionEntries,
        { FromDate: previousFrom, ToDate: previousTo },
        controller.signal,
      ),
    ]).then(([current, previous]) => {
      if (controller.signal.aborted) return;
      setResult({
        key: requestKey,
        currentRows: current.status === "fulfilled" ? current.value : [],
        previousRows: previous.status === "fulfilled" ? previous.value : [],
        error:
          current.status === "rejected"
            ? getApiErrorMessage(
                current.reason,
                "Unable to load the selected period.",
              )
            : "",
        previousError:
          previous.status === "rejected"
            ? getApiErrorMessage(
                previous.reason,
                "Unable to load comparison data.",
              )
            : "",
        updated: Date.now(),
      });
    });
    return () => controller.abort();
  }, [from, to, previousFrom, previousTo, requestKey, invalidRange]);
  const loading = !invalidRange && result.key !== requestKey;
  const dataReady = !invalidRange && !loading && !result.error;
  const scoped = useMemo(() => {
    const filter = (row) =>
      (!machine || String(row.machineId) === machine) &&
      (!mould || String(row.mouldId) === mould);
    return {
      rows: dataReady ? result.currentRows.filter(filter) : [],
      baseline: dataReady ? result.previousRows.filter(filter) : [],
    };
  }, [dataReady, result, machine, mould]);
  const analysis = useMemo(
    () => buildInsights(scoped.rows, scoped.baseline, dataReady ? range : {}),
    [scoped, range, dataReady],
  );
  const summary = analysis.current,
    prior = analysis.previous;
  const previousAvailable =
    dataReady && !result.previousError && prior.count > 0;
  const actualAvailable = summary.count > summary.invalidShots;
  const days = useMemo(() => groupSubmissionDays(scoped.rows), [scoped.rows]);
  const selectedDay =
    detailDate && dataReady && detailDate >= from && detailDate <= to
      ? calendarAuditDays(days, detailDate, detailDate)[0]
      : null;
  const selectedMachine = analysis.machines.find(
    (item) => item.id === detailMachine,
  );
  const allOptions = [...result.currentRows, ...result.previousRows];
  const currentMachines = analysis.machines.filter((item) => item.count > 0);
  const baselineOnly = analysis.machines.filter((item) => !item.count);
  const clearScope = () => {
    setMachine("");
    setMould("");
  };
  const selectPeriod = (value) => {
    setPeriod(value);
    if (value !== "custom") setRange(insightPreset(value));
  };
  const exportSnapshot = () =>
    downloadCsv({
      filename: `cosmos-production-insights-${from}-${to}.csv`,
      rows: analysis.machines.map((item) => ({
        machine: item.code,
        name: item.name,
        from,
        to,
        readings: item.count,
        actual: item.count > item.invalidShots ? item.actual : null,
        target: item.eligible ? item.target : null,
        achievement: item.achievement,
        shortfall: item.netShortfall,
        grossShortfall: item.eligible ? item.grossShortfall : null,
        previousFrom,
        previousTo,
        previousActual:
          previousAvailable && item.previous.count > item.previous.invalidShots
            ? item.previous.actual
            : null,
        previousAchievement: previousAvailable
          ? item.previous.achievement
          : null,
        recordedIssues: item.problems,
        missingTarget: item.noTarget,
        reasons: item.reasons.join("; "),
      })),
      columns: [
        ["machine", "Machine code"],
        ["name", "Machine"],
        ["from", "From date"],
        ["to", "To date"],
        ["readings", "Current readings"],
        ["actual", "Actual shots"],
        ["target", "Comparable target shots"],
        ["achievement", "Shot-target achievement %"],
        ["shortfall", "Net shortfall shots"],
        ["grossShortfall", "Sum of reading shortfalls"],
        ["previousFrom", "Prior from date"],
        ["previousTo", "Prior to date"],
        ["previousActual", "Prior actual shots"],
        ["previousAchievement", "Prior achievement %"],
        ["recordedIssues", "Readings with reasons"],
        ["missingTarget", "Readings without positive target"],
        ["reasons", "Recorded reasons"],
      ].map(([key, header]) => ({ key, header })),
    });
  return (
    <div className="production-insights">
      <PageHeader
        icon={BarChart3}
        badge="OEE / Production intelligence"
        title="Production Insights"
        description="See what changed, where production missed target and which machines need attention."
        actions={
          <>
            <AppButton
              variant="secondary"
              onClick={() => setRevision((value) => value + 1)}
              disabled={loading}
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              Refresh
            </AppButton>
            {reports.canExport && (
              <AppButton
                onClick={exportSnapshot}
                disabled={!dataReady || !summary.count}
              >
                <Download size={16} />
                Export insights
              </AppButton>
            )}
          </>
        }
      />
      <section
        className="insight-filters"
        aria-label="Production insights filters"
      >
        <div className="insight-filter-grid">
          <div>
            <label>Reporting period</label>
            <AppSelect
              aria-label="Insights period"
              value={period}
              onChange={selectPeriod}
              options={[
                ["today", "Today"],
                ["last7", "Last 7 days"],
                ["last30", "Last 30 days"],
                ["thisMonth", "This month"],
                ["lastMonth", "Last month"],
                ["custom", "Custom dates"],
              ].map(([value, label]) => ({ value, label }))}
            />
          </div>
          <div className="insight-range-control">
            <label>Production dates</label>
            <AppDateRangeFilter
              label="Insights date range"
              fromDate={from}
              toDate={to}
              allowLifetime={false}
              max={indiaToday()}
              onChange={(next) => {
                setRange(next);
                setPeriod("custom");
              }}
            />
          </div>
          <div>
            <label>Machine</label>
            <AppSelect
              aria-label="Insights machine"
              value={machine}
              onChange={setMachine}
              options={optionsFor(
                allOptions,
                "machineId",
                "machineCode",
                "All machines",
              )}
            />
          </div>
          <div>
            <label>Mould</label>
            <AppSelect
              aria-label="Insights mould"
              value={mould}
              onChange={setMould}
              options={optionsFor(
                allOptions,
                "mouldId",
                "mouldName",
                "All moulds",
              )}
            />
          </div>
        </div>
        <div className="insight-comparison-note">
          <span>
            <CalendarDays size={15} />
            {comparison ? (
              <>
                Compared with {span(comparison)}{" "}
                <b>
                  · same {comparison.days}{" "}
                  {comparison.days === 1 ? "day" : "days"}
                </b>
              </>
            ) : (
              "Select a valid production period"
            )}
          </span>
          {(machine || mould) && (
            <button className="insight-link" onClick={clearScope}>
              Clear machine & mould
            </button>
          )}
        </div>
      </section>
      {invalidRange ? (
        <div className="insight-state warning" role="alert">
          <TriangleAlert size={24} />
          <h2>Choose a valid date range</h2>
          <p>
            Use a start date on or before the end date, ending today or earlier.
          </p>
        </div>
      ) : loading ? (
        <div role="status" className="insight-loading">
          <RefreshCw className="animate-spin" size={24} />
          <h2>Building your production insights</h2>
          <p>Preparing the selected period and its comparison.</p>
          <div>
            {[1, 2, 3, 4].map((key) => (
              <span key={key} />
            ))}
          </div>
        </div>
      ) : result.error ? (
        <div className="insight-state warning" role="alert">
          <TriangleAlert size={24} />
          <h2>Production insights are unavailable</h2>
          <p>{result.error}</p>
          <AppButton
            variant="secondary"
            onClick={() => setRevision((value) => value + 1)}
          >
            Retry
          </AppButton>
        </div>
      ) : (
        <>
          <div className="insight-scope">
            <span>
              <span className="insight-live-dot" />
              {summary.count} saved readings · {currentMachines.length}{" "}
              reporting {currentMachines.length === 1 ? "machine" : "machines"}{" "}
              · {summary.days} logged {summary.days === 1 ? "date" : "dates"}
            </span>
            <small>Refreshed {stamp(result.updated)} IST</small>
          </div>
          {previousAvailable &&
            summary.count > 0 &&
            (summary.machines !== prior.machines ||
              summary.days !== prior.days) && (
              <div className="insight-coverage-note">
                <Info size={15} />
                <p>
                  Reporting coverage differs: machines {summary.machines} vs{" "}
                  {prior.machines}, and logged dates {summary.days} vs{" "}
                  {prior.days} (current vs prior). Volume changes describe saved
                  records.
                </p>
              </div>
            )}
          {result.previousError && (
            <div className="insight-inline-warning" role="alert">
              <TriangleAlert size={16} />
              <span>
                Comparison unavailable: {result.previousError} Current-period
                totals are shown.
              </span>
              <button
                className="insight-link"
                onClick={() => setRevision((value) => value + 1)}
              >
                Retry
              </button>
            </div>
          )}
          {!summary.count && (
            <div className="insight-inline-warning">
              <Info size={17} />
              <span>
                No saved readings match this period and scope. Try a wider range
                or another machine. Blank dates are not treated as zero
                production.
              </span>
            </div>
          )}
          <div className="insight-metric-grid">
            <MetricCard
              labelClassName="whitespace-normal text-[11px] leading-5"
              metaClassName="whitespace-normal leading-5"
              icon={Factory}
              label="Actual production"
              tone="brand"
              value={actualAvailable ? n(summary.actual) : "—"}
              valueClassName="text-2xl font-semibold"
              hint="Shots across saved readings"
              footer={
                <Delta
                  current={actualAvailable ? summary.actual : null}
                  previous={
                    prior.count > prior.invalidShots ? prior.actual : null
                  }
                  available={previousAvailable}
                />
              }
            />
            <MetricCard
              labelClassName="whitespace-normal text-[11px] leading-5"
              metaClassName="whitespace-normal leading-5"
              icon={Target}
              label="Comparable target"
              tone="sky"
              value={summary.eligible ? n(summary.target) : "—"}
              valueClassName="text-2xl font-semibold"
              hint={`${summary.eligible} readings with valid shots & target`}
              footer={
                <Delta
                  current={summary.eligible ? summary.target : null}
                  previous={prior.eligible ? prior.target : null}
                  neutral
                  available={previousAvailable}
                />
              }
            />
            <MetricCard
              labelClassName="whitespace-normal text-[11px] leading-5"
              metaClassName="whitespace-normal leading-5"
              icon={Activity}
              label="Target achievement"
              tone="emerald"
              value={pct(summary.achievement)}
              valueClassName="text-2xl font-semibold"
              hint="Comparable shots ÷ saved target"
              footer={
                <Delta
                  current={summary.achievement}
                  previous={prior.achievement}
                  points
                  available={previousAvailable}
                />
              }
            />
            <MetricCard
              labelClassName="whitespace-normal text-[11px] leading-5"
              metaClassName="whitespace-normal leading-5"
              icon={TriangleAlert}
              label="Net target shortfall"
              tone="amber"
              value={n(summary.netShortfall)}
              valueClassName="text-2xl font-semibold"
              hint={
                summary.overTarget > 0
                  ? `${n(summary.overTarget)} shots above net target`
                  : "Shots needed to reach net target"
              }
              footer={
                <Delta
                  current={summary.netShortfall}
                  previous={prior.netShortfall}
                  lowerIsBetter
                  available={previousAvailable}
                />
              }
            />
          </div>
          <nav className="insight-tabs" aria-label="Insights views">
            {[
              ["overview", "Performance overview", BarChart3],
              ["daily", "Daily records & calendar", CalendarDays],
            ].map(([key, label, Icon]) => (
              <button
                key={key}
                aria-current={view === key ? "page" : undefined}
                onClick={() => setView(key)}
              >
                <Icon size={16} />
                {label}
                {key === "daily" && <span>{summary.days}</span>}
              </button>
            ))}
          </nav>
          {view === "daily" ? (
            <InsightDailyRecords
              key={`${requestKey}-${machine}-${mould}`}
              days={days}
              range={range}
              onDate={setDetailDate}
            />
          ) : (
            <>
              <div className="insight-main-grid">
                <InsightPanel
                  icon={BarChart3}
                  title="Production against plan"
                  detail="Actual and saved targets, with the previous period aligned by day."
                >
                  <div className="insight-chart">
                    {summary.count || prior.count ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart
                          data={analysis.trend}
                          margin={{ top: 15, right: 8, left: 0, bottom: 4 }}
                        >
                          <CartesianGrid
                            vertical={false}
                            stroke="#e2e8f0"
                            strokeDasharray="3 3"
                          />
                          <XAxis
                            dataKey="date"
                            tickFormatter={(value) =>
                              date(value).replace(/ \d{4}$/, "")
                            }
                            tick={{ fontSize: 11, fill: "#64748b" }}
                            tickLine={false}
                            axisLine={false}
                            minTickGap={30}
                          />
                          <YAxis
                            tick={{ fontSize: 11, fill: "#64748b" }}
                            tickFormatter={(value) =>
                              value >= 1000
                                ? `${n(value / 1000, 1)}k`
                                : n(value)
                            }
                            tickLine={false}
                            axisLine={false}
                            width={42}
                          />
                          <Tooltip
                            content={<TrendTooltip />}
                            cursor={{ fill: "#f8fafc" }}
                          />
                          <Legend
                            wrapperStyle={{ fontSize: 12, paddingTop: 14 }}
                          />
                          <Bar
                            dataKey="target"
                            name="Saved target"
                            fill="#cbd5e1"
                            radius={[3, 3, 0, 0]}
                            maxBarSize={22}
                          />
                          <Bar
                            dataKey="actual"
                            name="Actual shots"
                            fill="var(--app-accent)"
                            radius={[3, 3, 0, 0]}
                            maxBarSize={22}
                          />
                          {!result.previousError && (
                            <Line
                              dataKey="previous"
                              name="Prior period shots"
                              stroke="#0d9488"
                              strokeWidth={2}
                              dot={{ r: 3 }}
                              activeDot={{ r: 5 }}
                              connectNulls={false}
                            />
                          )}
                        </ComposedChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="insight-empty">
                        <BarChart3 size={28} />
                        <p>No readings to chart in either period.</p>
                      </div>
                    )}
                  </div>
                  <p className="insight-chart-caption">
                    Blank dates have no saved readings. A zero bar represents a
                    saved zero-shot reading.
                  </p>
                </InsightPanel>
                <InsightPanel
                  icon={Target}
                  title="Target progress"
                  detail="Only readings with valid shots and a positive target are compared."
                >
                  <div className="insight-target-value">
                    <strong>{pct(summary.achievement)}</strong>
                    <span>
                      {summary.achievement == null
                        ? "No comparable target"
                        : summary.achievement >= 100
                          ? "Net target achieved"
                          : "of comparable target"}
                    </span>
                  </div>
                  <div
                    className="insight-progress"
                    role="progressbar"
                    aria-label="Target achievement"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={
                      summary.achievement == null
                        ? undefined
                        : Math.min(100, summary.achievement)
                    }
                    aria-valuetext={
                      summary.achievement == null
                        ? "No comparable target"
                        : pct(summary.achievement)
                    }
                  >
                    <span
                      style={{
                        width: `${Math.min(100, Math.max(0, summary.achievement || 0))}%`,
                      }}
                    />
                  </div>
                  <div className="insight-target-totals">
                    <div>
                      <small>Comparable actual</small>
                      <strong>
                        {summary.eligible ? n(summary.matchedActual) : "—"}
                      </strong>
                    </div>
                    <div>
                      <small>Saved target</small>
                      <strong>
                        {summary.eligible ? n(summary.target) : "—"}
                      </strong>
                    </div>
                  </div>
                  <div className="insight-target-foot">
                    <TriangleAlert size={16} />
                    <p>
                      <strong>
                        {summary.eligible ? n(summary.grossShortfall) : "—"}{" "}
                        shots
                      </strong>{" "}
                      below target across individual readings. Above-target
                      readings can offset this in the net total.
                    </p>
                  </div>
                </InsightPanel>
              </div>
              <div className="insight-section-title">
                <div>
                  <span className="insight-eyebrow">FOCUS FOR THE FLOOR</span>
                  <h2>Machines needing attention</h2>
                  <p>
                    Ranked by the sum of reading shortfalls, with recorded
                    reasons and data checks.
                  </p>
                </div>
                <span className="insight-count">
                  {analysis.attention.length}{" "}
                  {analysis.attention.length === 1 ? "machine" : "machines"}
                </span>
              </div>
              {analysis.attention.length ? (
                <div className="insight-attention-grid">
                  {analysis.attention.map((item) => (
                    <button
                      key={item.id}
                      className="insight-attention-card"
                      onClick={() => setDetailMachine(item.id)}
                    >
                      <div className="insight-attention-top">
                        <span>
                          <Factory size={16} />
                          {item.code}
                        </span>
                        <ChevronRight size={17} />
                      </div>
                      <h3>{item.name}</h3>
                      <div className="insight-attention-score">
                        <strong>{pct(item.achievement)}</strong>
                        <span>
                          {item.eligible
                            ? `${n(item.grossShortfall)} shots below reading targets`
                            : "Target or shot data needs review"}
                        </span>
                      </div>
                      <p>{item.latestMould || "Mould not recorded"}</p>
                      <div className="insight-attention-notes">
                        {item.reasons.length
                          ? item.reasons.join(" · ")
                          : "No production issue recorded"}
                      </div>
                      <footer>
                        {item.noTarget > 0 && (
                          <span>{item.noTarget} without target</span>
                        )}
                        {item.invalidShots > 0 && (
                          <span>{item.invalidShots} invalid shot readings</span>
                        )}
                        {item.duplicates > 0 && (
                          <span>{item.duplicates} duplicate pairs</span>
                        )}
                        <span>
                          Review {item.count}{" "}
                          {item.count === 1 ? "reading" : "readings"}
                        </span>
                      </footer>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="insight-clear">
                  <CheckCircle2 size={20} />
                  <div>
                    <strong>
                      {summary.count
                        ? "No attention flags in the saved readings"
                        : "No machine readings to review"}
                    </strong>
                    <p>
                      {summary.count
                        ? "No reading shortfalls, recorded reasons or target-data issues were found."
                        : "Choose a period with production entries to see priorities."}
                    </p>
                  </div>
                </div>
              )}
              <InsightPanel
                icon={Factory}
                title="Machine comparison"
                detail="The same filters apply to both periods. Select a machine for its saved readings."
              >
                <div className="insight-table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Machine</th>
                        <th>Actual shots</th>
                        <th>Comparable target</th>
                        <th>Achievement</th>
                        <th>Change</th>
                        <th>Reading shortfalls</th>
                        <th>Readings</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analysis.machines.map((item) => (
                        <tr key={item.id}>
                          <td>
                            <button
                              className="insight-link"
                              onClick={() => setDetailMachine(item.id)}
                            >
                              {item.code}
                              <ChevronRight size={13} />
                            </button>
                            <small>
                              {item.name}
                              {!item.count && " · Prior period only"}
                            </small>
                          </td>
                          <td>
                            {item.count > item.invalidShots
                              ? n(item.actual)
                              : "—"}
                          </td>
                          <td>{item.eligible ? n(item.target) : "—"}</td>
                          <td>
                            <span
                              className={`insight-score ${item.achievement == null ? "muted" : item.achievement >= 100 ? "good" : "warning"}`}
                            >
                              {pct(item.achievement)}
                            </span>
                          </td>
                          <td>
                            <Delta
                              current={item.achievement}
                              previous={item.previous.achievement}
                              points
                              available={
                                previousAvailable &&
                                item.count > 0 &&
                                item.previous.count > 0
                              }
                            />
                          </td>
                          <td>
                            {item.eligible ? n(item.grossShortfall) : "—"}
                          </td>
                          <td>
                            {item.count}
                            <small>
                              {previousAvailable
                                ? `${item.previous.count} in prior period`
                                : "Prior period unavailable"}
                            </small>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!analysis.machines.length && (
                  <p className="insight-empty">
                    No machines observed in either period for these filters.
                  </p>
                )}
              </InsightPanel>
              <InsightPanel
                icon={ShieldCheck}
                title="Reporting coverage & data confidence"
                detail="Coverage describes saved records; it is not a scheduled-production or attendance score."
              >
                <div className="insight-health-grid">
                  <div>
                    <Factory size={18} />
                    <strong>
                      {currentMachines.length} / {analysis.machines.length}
                    </strong>
                    <h3>Machines reporting</h3>
                    <p>Of machines observed across both periods.</p>
                  </div>
                  <div>
                    <CalendarDays size={18} />
                    <strong>
                      {summary.days} / {comparison.days}
                    </strong>
                    <h3>Dates with readings</h3>
                    <p>Calendar dates with saved production.</p>
                  </div>
                  <div>
                    <CheckCircle2 size={18} />
                    <strong>
                      {summary.eligible} / {summary.count}
                    </strong>
                    <h3>Comparable readings</h3>
                    <p>Valid shots and positive saved targets.</p>
                  </div>
                  <div>
                    <Clock3 size={18} />
                    <strong className="insight-last-date">
                      {date(summary.latestDate)}
                    </strong>
                    <h3>Last production date</h3>
                    <p>Last saved change · {stamp(summary.lastSaved)} IST</p>
                  </div>
                </div>
                <div className="insight-health-notes">
                  {summary.noTarget > 0 && (
                    <span className="warning">
                      {summary.noTarget} readings without positive targets
                    </span>
                  )}
                  {summary.invalidShots > 0 && (
                    <span className="warning">
                      {summary.invalidShots} readings with invalid shot data
                    </span>
                  )}
                  {summary.duplicates > 0 && (
                    <span className="warning">
                      {summary.duplicates} repeated machine/date pairs
                    </span>
                  )}
                  {!summary.noTarget &&
                    !summary.invalidShots &&
                    !summary.duplicates &&
                    summary.count > 0 && (
                      <span className="good">
                        No target, shot-data or duplicate checks flagged
                      </span>
                    )}
                  {baselineOnly.length > 0 && (
                    <span>
                      {baselineOnly.map((item) => item.code).join(", ")}{" "}
                      appeared only in the prior period. No current readings;
                      production status is unknown.
                    </span>
                  )}
                </div>
              </InsightPanel>
              <div className="insight-method-note">
                <Info size={16} />
                <p>
                  Achievement is comparable shots ÷ saved target, expressed as a
                  percentage. Values above 100% are retained. Reason counts
                  indicate recorded occurrences. Full availability, downtime
                  duration and quality metrics are not available from these
                  entries.
                </p>
              </div>
            </>
          )}
          {selectedMachine && (
            <MachineDetails
              machine={selectedMachine}
              range={range}
              comparison={comparison}
              previousAvailable={previousAvailable}
              onClose={() => setDetailMachine("")}
              onDate={setDetailDate}
            />
          )}
          {selectedDay && (
            <InsightDayDetails
              day={selectedDay}
              canCreate={entryPermissions.canCreate}
              onClose={() => setDetailDate("")}
            />
          )}
        </>
      )}
    </div>
  );
}
