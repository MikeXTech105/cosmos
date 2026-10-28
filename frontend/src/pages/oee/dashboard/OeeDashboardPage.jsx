import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  ChevronRight,
  Download,
  Factory,
  Info,
  RefreshCw,
  Target,
  TrendingUp,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import AppSelect from "../../../components/common/AppSelect";
import AppButton from "../../../components/common/AppButton";
import AppInput from "../../../components/common/AppInput";
import MetricCard from "../../../components/common/MetricCard";
import PageHeader from "../../../components/common/PageHeader";
import { getQuickDateRange } from "../../../components/common/dateRangePresets";
import { oeeProductionEntryService } from "../../../services/oee/oeeProductionEntryService";
import { getApiErrorMessage } from "../../../utils/apiError";
import { downloadCsv } from "../../../utils/csv";
import useOeeCapabilities from "../useOeeCapabilities";
import OeeSpeedometer from "../OeeSpeedometer";
import OeeAggregateDashboard from "./OeeAggregateDashboard";
import { loadDowntimeEntries } from "./downtimeAnalysis";
import {
  buildProductionAnalytics,
  selectReadings,
} from "./productionAnalytics";
import DailySubmissionAudit from "./DailySubmissionAudit";
import "./oeeDashboard.css";

const n = (value, digits = 0) =>
  value == null
    ? "—"
    : Number(value).toLocaleString("en-IN", { maximumFractionDigits: digits });
const percent = (value) => (value == null ? "—" : `${n(value, 1)}%`);
const shortDate = (value) =>
  value
    ? new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
      })
    : "—";
const rating = (value) =>
  value == null
    ? { label: "No eligible target", tone: "neutral" }
    : value >= 85
      ? { label: "World class", tone: "green" }
      : value >= 65
        ? { label: "Good", tone: "blue" }
        : value >= 40
          ? { label: "Needs attention", tone: "amber" }
          : { label: "Critical", tone: "red" };
const choices = (rows, key, label, all) => [
  { value: "", label: all },
  ...[
    ...new Map(
      rows.map((row) => [
        String(row[key]),
        { value: String(row[key]), label: row[label] || String(row[key]) },
      ]),
    ).values(),
  ].sort((a, b) => a.label.localeCompare(b.label)),
];
const exportColumns = [
  ["productionDate", "Date"],
  ["machineCode", "Machine code"],
  ["machineName", "Machine"],
  ["mouldName", "Mould"],
  ["machineOnTime", "Scheduled on-time"],
  ["shotCount", "Shots"],
  ["calculatedTargetShot", "Saved target shots"],
  ["calculatedOeePercentage", "Saved OEE %"],
  ["downtimeReasonName", "Recorded reason"],
  ["remarks", "Remarks"],
].map(([key, header]) => ({ key, header }));
function Panel({ title, subtitle, children, className = "", action }) {
  return (
    <section className={`oee-panel ${className}`}>
      <div className="oee-panel-heading">
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
function Empty({ children }) {
  return (
    <div className="oee-empty">
      <Activity size={27} />
      <p>{children}</p>
    </div>
  );
}
function Metric({ icon, label, value, detail, tone = "brand" }) {
  return (
    <MetricCard
      icon={icon}
      label={label}
      value={value}
      hint={detail}
      tone={tone}
      labelClassName="whitespace-normal text-[11px] leading-5"
      valueClassName="text-2xl font-semibold"
      metaClassName="whitespace-normal leading-5"
    />
  );
}
function ProductionDashboard({ canExport, canCreate }) {
  const [period, setPeriod] = useState("last30");
  const [range, setRange] = useState(() => getQuickDateRange("last30"));
  const [mode, setMode] = useState("calendar");
  const [limit, setLimit] = useState("30");
  const [basis, setBasis] = useState("weighted");
  const [machine, setMachine] = useState("");
  const [mould, setMould] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [result, setResult] = useState({
    key: "",
    rows: [],
    loading: true,
    error: "",
    updated: "",
  });
  const [tab, setTab] = useState("overview");
  const [reason, setReason] = useState("");
  const from = mode === "calendar" ? range.fromDate : "";
  const to = mode === "calendar" ? range.toDate : "";
  const requestKey = JSON.stringify([from, to, refresh]);
  const invalidRange = Boolean(
    mode === "calendar" && (!from || !to || from > to),
  );
  useEffect(() => {
    if (invalidRange) return;
    const controller = new AbortController();
    void Promise.resolve().then(async () => {
      if (controller.signal.aborted) return;
      setResult({
        key: requestKey,
        rows: [],
        loading: true,
        error: "",
        updated: "",
      });
      try {
        const rows = await loadDowntimeEntries(
          oeeProductionEntryService.getProductionEntries,
          { FromDate: from, ToDate: to },
          controller.signal,
        );
        if (!controller.signal.aborted)
          setResult({
            key: requestKey,
            rows,
            loading: false,
            error: "",
            updated: new Date().toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
            }),
          });
      } catch (error) {
        if (!controller.signal.aborted)
          setResult({
            key: requestKey,
            rows: [],
            loading: false,
            error: getApiErrorMessage(error, "Unable to load production data."),
            updated: "",
          });
      }
    });
    return () => controller.abort();
  }, [from, to, refresh, requestKey, invalidRange]);
  const current = result.key === requestKey && !invalidRange;
  const rows = useMemo(
    () => (current && !result.loading && !result.error ? result.rows : []),
    [current, result],
  );
  const selected = useMemo(
    () => selectReadings(rows, { machine, mould, mode, limit }),
    [rows, machine, mould, mode, limit],
  );
  const analysis = useMemo(
    () => buildProductionAnalytics(selected, basis),
    [selected, basis],
  );
  const { summary, machines, moulds, trend, reasons } = analysis;
  const eligibleMachines = machines
    .filter((row) => row.value !== null)
    .sort((a, b) => b.value - a.value);
  const leading = eligibleMachines[0];
  const attention = [...eligibleMachines]
    .reverse()
    .find((row) => row.value < 65);
  const actualStart = selected
    .map((row) => row.productionDate?.slice(0, 10))
    .filter(Boolean)
    .sort()[0];
  const actualEnd = selected
    .map((row) => row.productionDate?.slice(0, 10))
    .filter(Boolean)
    .sort()
    .at(-1);
  const loading = !current || result.loading;
  const badge = rating(summary.value);
  const choosePeriod = (value) => {
    setPeriod(value);
    if (value !== "custom") setRange(getQuickDateRange(value));
  };
  const clearScope = () => {
    setMachine("");
    setMould("");
  };
  const openRecords = (problem = "") => {
    setReason(problem);
    setTab("records");
  };
  const exportRows = () =>
    downloadCsv({
      filename: `cosmos-production-${mode}-${basis}-${actualStart || "empty"}.csv`,
      columns: [
        ...exportColumns,
        {
          header: "Dashboard calculation",
          getValue: () =>
            basis === "mean"
              ? "Mean of eligible reading percentages"
              : "Total shots / total target",
        },
        {
          header: "Dashboard scope",
          getValue: () =>
            mode === "readings"
              ? `Latest ${limit} eligible readings per machine`
              : `${from} to ${to}`,
        },
      ],
      rows: selected,
    });
  return (
    <section className="oee-workspace">
      <PageHeader
        badge="OEE / Production intelligence"
        icon={Factory}
        title="Production Dashboard"
        description="Track machine performance, production targets and daily submissions."
        actions={
          <>
            <span className="oee-status" role="status">
              <span />
              {loading
                ? "Loading readings"
                : result.error
                  ? "Data unavailable"
                  : `Updated ${result.updated || "—"}`}
            </span>
            <AppButton
              variant="secondary"
              onClick={() => setRefresh((value) => value + 1)}
              disabled={loading && !invalidRange}
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />{" "}
              Refresh
            </AppButton>
          </>
        }
      />
      <section className="oee-filters" aria-label="Dashboard filters">
        <div className="oee-filter-grid">
          <label>
            Evaluation window
            <AppSelect
              aria-label="Evaluation window"
              value={mode}
              onChange={setMode}
              options={[
                { value: "calendar", label: "Calendar period" },
                { value: "readings", label: "Latest readings · Sheet style" },
              ]}
            />
          </label>
          {mode === "calendar" ? (
            <label>
              Period
              <AppSelect
                aria-label="Production period"
                value={period}
                onChange={choosePeriod}
                options={[
                  ["today", "Today"],
                  ["last7", "Last 7 days"],
                  ["last30", "Last 30 days"],
                  ["thisMonth", "This month"],
                  ["lastMonth", "Last month"],
                  ["yearToDate", "Year to date"],
                  ["custom", "Custom dates"],
                ].map(([value, label]) => ({ value, label }))}
              />
            </label>
          ) : (
            <label>
              Readings per machine
              <AppSelect
                aria-label="Readings per machine"
                value={limit}
                onChange={setLimit}
                options={[1, 7, 15, 30, 60, 90].map((value) => ({
                  value: String(value),
                  label: `Latest ${value} eligible ${value === 1 ? "reading" : "readings"}`,
                }))}
              />
            </label>
          )}
          <label>
            Machine
            <AppSelect
              aria-label="Production machine"
              value={machine}
              onChange={setMachine}
              options={choices(
                rows,
                "machineId",
                "machineName",
                "All machines with readings",
              )}
            />
          </label>
          <label>
            Mould
            <AppSelect
              aria-label="Production mould"
              value={mould}
              onChange={setMould}
              options={choices(
                rows,
                "mouldId",
                "mouldName",
                "All moulds with readings",
              )}
            />
          </label>
          <label>
            Calculation
            <AppSelect
              aria-label="OEE calculation"
              value={basis}
              onChange={setBasis}
              options={[
                { value: "weighted", label: "ERP · weighted by target" },
                { value: "mean", label: "Sheet · average of readings" },
              ]}
            />
          </label>
        </div>
        {mode === "calendar" && period === "custom" && (
          <div className="oee-date-fields">
            <label>
              From
              <AppInput
                type="date"
                aria-label="Production from date"
                value={range.fromDate}
                onChange={(event) =>
                  setRange({ ...range, fromDate: event.target.value })
                }
              />
            </label>
            <label>
              To
              <AppInput
                type="date"
                aria-label="Production to date"
                value={range.toDate}
                onChange={(event) =>
                  setRange({ ...range, toDate: event.target.value })
                }
              />
            </label>
          </div>
        )}
        <div className="oee-filter-note">
          <span>
            <Info size={14} />{" "}
            {mode === "readings"
              ? `Latest ${limit} ${limit === "1" ? "reading" : "readings"} with a positive target per machine, across all dates. Machine and mould filters apply before selection.`
              : "One period and one scope across every chart, card and record."}
          </span>
          {(machine || mould) && (
            <button onClick={clearScope}>Clear machine & mould</button>
          )}
        </div>
      </section>
      {invalidRange ? (
        <div className="oee-notice" role="alert">
          Choose a valid start and end date. The start date must be on or before
          the end date.
        </div>
      ) : loading ? (
        <div className="oee-loading" role="status">
          <RefreshCw className="animate-spin" />
          <h2>Building your production picture</h2>
          <p>Loading all pages before calculating totals.</p>
        </div>
      ) : result.error ? (
        <div className="oee-notice" role="alert">
          <h2>Production data could not be loaded</h2>
          <p>{result.error}</p>
          <button
            className="oee-button"
            onClick={() => setRefresh((value) => value + 1)}
          >
            Try again
          </button>
        </div>
      ) : (
        <>
          <div className="oee-scope-line">
            <span>
              <strong>
                {mode === "readings"
                  ? `Latest ${limit} eligible ${limit === "1" ? "reading" : "readings"} / machine`
                  : `${shortDate(from)} – ${shortDate(to)}, ${to?.slice(0, 4)}`}
              </strong>{" "}
              · {n(summary.count)} readings · {n(machines.length)} reporting
              machines
            </span>
            {canExport && (
              <button
                className="oee-button"
                disabled={!selected.length}
                onClick={exportRows}
              >
                <Download size={14} /> Export {"scope"}
              </button>
            )}
          </div>
          <div className="oee-metrics">
            <Metric
              icon={Activity}
              label={
                basis === "mean"
                  ? "Average reading OEE"
                  : "Weighted production OEE"
              }
              value={percent(summary.value)}
              detail={
                summary.value == null
                  ? "No positive target in this scope"
                  : `${badge.label} · ${basis === "mean" ? "Reading average" : "Shots ÷ target"}`
              }
            />
            <Metric
              icon={TrendingUp}
              label="Total production"
              tone="sky"
              value={n(summary.shots)}
              detail={`${n(summary.count)} saved production readings`}
            />
            <Metric
              icon={Target}
              label="Target shots"
              tone="emerald"
              value={n(summary.target, 1)}
              detail={
                summary.target
                  ? `${percent(summary.weighted)} of total target achieved`
                  : "Saved targets appear here"
              }
            />
            <Metric
              icon={ArrowDownRight}
              label="Net target shortfall"
              tone="amber"
              value={n(summary.gap, 1)}
              detail={
                summary.shots > summary.target
                  ? `${n(summary.shots - summary.target, 1)} shots above net target`
                  : "Total target minus total shots, minimum zero"
              }
            />
          </div>
          <nav className="oee-tabs" aria-label="Production dashboard views">
            {[
              ["overview", "Floor overview"],
              ["analysis", "Moulds & reasons"],
              ["records", "Daily submissions & audit"],
            ].map(([value, label]) => (
              <button
                key={value}
                aria-current={tab === value ? "page" : undefined}
                onClick={() => {
                  setTab(value);
                  if (value === "records") setReason("");
                }}
              >
                {label}
                {value === "records" && <span>{n(summary.days)}</span>}
              </button>
            ))}
          </nav>
          {!selected.length && tab !== "records" ? (
            <Panel
              title="Your next production picture starts here"
              subtitle="No saved readings match this window and scope."
            >
              <Empty>
                Try last month, a wider date range, or clear the machine and
                mould filters. Missing readings are not treated as zero
                production.
              </Empty>
            </Panel>
          ) : (
            <>
              {tab === "overview" && (
                <>
                  <div className="oee-section-heading">
                    <div>
                      <span className="oee-eyebrow">THE PRODUCTION FLOOR</span>
                      <h2>Machine performance</h2>
                    </div>
                    <p>Reporting machines · click a card to focus</p>
                  </div>
                  <div className="oee-machine-grid">
                    {[...machines]
                      .sort((a, b) =>
                        (a.rows[0]?.machineCode || a.name).localeCompare(
                          b.rows[0]?.machineCode || b.name,
                          undefined,
                          { numeric: true },
                        ),
                      )
                      .map((item) => {
                        const state = rating(item.value);
                        const latest = [...item.rows].sort(
                          (a, b) =>
                            String(b.productionDate).localeCompare(
                              String(a.productionDate),
                            ) || Number(b.id) - Number(a.id),
                        )[0];
                        return (
                          <button
                            key={item.key}
                            className="oee-machine-card"
                            onClick={() =>
                              setMachine(machine === item.key ? "" : item.key)
                            }
                            aria-label={`Focus machine ${item.name}`}
                            aria-pressed={machine === item.key}
                          >
                            <div className="oee-machine-top">
                              <span className="oee-machine-code">
                                {latest.machineCode || "MACHINE"}
                              </span>
                              <span className={`oee-pill ${state.tone}`}>
                                {state.label}
                              </span>
                            </div>
                            <h3>{item.name}</h3>
                            <div className="oee-machine-gauge">
                              {item.value == null ? (
                                <div className="oee-neutral-gauge">
                                  —<small>No positive target</small>
                                </div>
                              ) : (
                                <OeeSpeedometer value={item.value} showTicks />
                              )}
                            </div>
                            <strong className="oee-machine-value">
                              {percent(item.value)}
                            </strong>
                            <p className="oee-machine-caption">
                              {basis === "mean"
                                ? "Average reading OEE"
                                : "Weighted OEE"}
                            </p>
                            <div className="oee-machine-numbers">
                              <span>
                                Shots<strong>{n(item.shots)}</strong>
                              </span>
                              <span>
                                Target<strong>{n(item.target, 1)}</strong>
                              </span>
                              <span>
                                Readings<strong>{n(item.count)}</strong>
                              </span>
                            </div>
                            <div className="oee-machine-latest">
                              <span>
                                Last reported ·{" "}
                                {shortDate(latest.productionDate)}
                              </span>
                              <b title={latest.mouldName}>
                                {latest.mouldName || "Mould not recorded"}
                              </b>
                            </div>
                          </button>
                        );
                      })}
                  </div>
                  <div className="oee-chart-grid">
                    <Panel
                      title="Production, against plan"
                      subtitle="Daily saved shots and targets, with OEE on the right axis."
                    >
                      <div className="oee-chart">
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart
                            data={trend}
                            margin={{ top: 10, right: 5, left: 0, bottom: 8 }}
                            accessibilityLayer
                          >
                            <CartesianGrid
                              strokeDasharray="3 5"
                              vertical={false}
                              stroke="#e9edf3"
                            />
                            <XAxis
                              dataKey="name"
                              tickFormatter={shortDate}
                              tick={{ fontSize: 12 }}
                              tickLine={false}
                              axisLine={false}
                              minTickGap={25}
                            />
                            <YAxis
                              yAxisId="shots"
                              width={58}
                              tick={{ fontSize: 12 }}
                              tickFormatter={(value) => n(value)}
                              axisLine={false}
                              tickLine={false}
                            />
                            <YAxis
                              yAxisId="oee"
                              orientation="right"
                              width={48}
                              tickFormatter={(value) => `${value}%`}
                              domain={[
                                0,
                                (max) =>
                                  Math.max(100, Math.ceil(max / 10) * 10),
                              ]}
                              tick={{ fontSize: 12 }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <Tooltip
                              labelFormatter={shortDate}
                              formatter={(value, name) => [
                                name === "OEE" ? percent(value) : n(value, 1),
                                name,
                              ]}
                              contentStyle={{
                                borderRadius: 12,
                                borderColor: "#e2e8f0",
                                fontSize: 12,
                              }}
                            />
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                            <Bar
                              yAxisId="shots"
                              dataKey="target"
                              name="Target shots"
                              fill="#cbd5e1"
                              radius={[3, 3, 0, 0]}
                              maxBarSize={24}
                            />
                            <Bar
                              yAxisId="shots"
                              dataKey="shots"
                              name="Actual shots"
                              fill="var(--app-accent)"
                              radius={[3, 3, 0, 0]}
                              maxBarSize={24}
                            />
                            <Line
                              yAxisId="oee"
                              type="linear"
                              dataKey="value"
                              name="OEE"
                              stroke="#0f9b8e"
                              strokeWidth={2.5}
                              dot={trend.length < 15}
                              connectNulls={false}
                            />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                      <p className="oee-chart-foot">
                        All {n(trend.length)} reported dates shown. Dates
                        without entries are not assumed to have zero output.
                      </p>
                    </Panel>
                    <Panel
                      title="What deserves a closer look"
                      subtitle="Signals from this selected production scope."
                    >
                      <div className="oee-insights">
                        <div>
                          <span className="oee-insight-icon green">
                            <ArrowUpRight size={18} />
                          </span>
                          <h3>
                            {leading ? leading.name : "No eligible machine"}
                          </h3>
                          <p>
                            {leading
                              ? `${percent(leading.value)} · highest OEE in this scope`
                              : "A positive target is needed to compare OEE."}
                          </p>
                        </div>
                        <div>
                          <span className="oee-insight-icon amber">
                            <ArrowDownRight size={18} />
                          </span>
                          <h3>
                            {attention
                              ? `${attention.name} needs attention`
                              : "Performance watch"}
                          </h3>
                          <p>
                            {attention
                              ? `${percent(attention.value)} · below the 65% good-performance band`
                              : "No reporting machine is below 65%, or no eligible target is available."}
                          </p>
                        </div>
                        <button onClick={() => openRecords("problems")}>
                          <span>
                            <strong>
                              {n(summary.problems)} problem-recorded readings
                            </strong>
                            <small>Review reasons and remarks</small>
                          </span>
                          <ChevronRight size={17} />
                        </button>
                      </div>
                    </Panel>
                  </div>
                </>
              )}
              {tab === "analysis" && (
                <>
                  <div className="oee-chart-grid">
                    <Panel
                      title="Mould performance"
                      subtitle="Compare target achievement for each mould in this scope."
                    >
                      <div
                        className="oee-chart"
                        style={{ height: Math.max(260, moulds.length * 43) }}
                      >
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={moulds}
                            layout="vertical"
                            margin={{ left: 5, right: 20 }}
                            accessibilityLayer
                          >
                            <CartesianGrid
                              strokeDasharray="3 5"
                              horizontal={false}
                              stroke="#e9edf3"
                            />
                            <XAxis
                              type="number"
                              domain={[
                                0,
                                (max) =>
                                  Math.max(100, Math.ceil(max / 10) * 10),
                              ]}
                              tickFormatter={(value) => `${value}%`}
                              tick={{ fontSize: 12 }}
                            />
                            <YAxis
                              type="category"
                              dataKey="name"
                              width={120}
                              tick={{ fontSize: 12 }}
                              tickLine={false}
                            />
                            <Tooltip
                              formatter={(value) => [percent(value), "OEE"]}
                            />
                            <ReferenceLine
                              x={85}
                              stroke="#0f9b8e"
                              strokeDasharray="4 4"
                            />
                            <Bar
                              dataKey="value"
                              name="OEE"
                              fill="var(--app-accent)"
                              radius={[0, 5, 5, 0]}
                              maxBarSize={18}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <p className="oee-chart-foot">
                        Dashed line: 85% reference band. Readings without
                        positive targets have no OEE score.
                      </p>
                    </Panel>
                    <Panel
                      title="Recorded production blockers"
                      subtitle="Frequency of saved reasons, not downtime hours."
                    >
                      {reasons.length ? (
                        <div className="oee-reasons">
                          {reasons.map((item, index) => (
                            <button
                              key={item.name}
                              onClick={() => openRecords(`reason:${item.name}`)}
                            >
                              <span className="oee-reason-rank">
                                {String(index + 1).padStart(2, "0")}
                              </span>
                              <div>
                                <strong>{item.name}</strong>
                                <small>
                                  {n(item.count)} readings · {n(item.days)}{" "}
                                  distinct days · {percent(item.share)} of
                                  problem readings
                                </small>
                                <span className="oee-track">
                                  <span style={{ width: `${item.share}%` }} />
                                </span>
                              </div>
                              <ChevronRight size={15} />
                            </button>
                          ))}
                        </div>
                      ) : (
                        <Empty>
                          No problems recorded in this scope. “NONE” and missing
                          reasons are excluded; this does not prove zero
                          downtime.
                        </Empty>
                      )}
                    </Panel>
                  </div>
                  <Panel
                    title="Mould production ledger"
                    subtitle="The numbers behind the comparison."
                  >
                    <div className="oee-table-wrap">
                      <table>
                        <thead>
                          <tr>
                            {[
                              "Mould",
                              "Readings",
                              "Shots",
                              "Target",
                              "OEE",
                              "Net shortfall",
                            ].map((label) => (
                              <th key={label}>{label}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {moulds.map((item) => (
                            <tr key={item.key}>
                              <td>
                                <button
                                  className="oee-text-button"
                                  onClick={() => setMould(item.key)}
                                >
                                  {item.name}
                                </button>
                              </td>
                              <td>{n(item.count)}</td>
                              <td>{n(item.shots)}</td>
                              <td>{n(item.target, 1)}</td>
                              <td>{percent(item.value)}</td>
                              <td>{n(item.gap, 1)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Panel>
                </>
              )}
              {tab === "records" && (
                <DailySubmissionAudit
                  key={JSON.stringify([
                    requestKey,
                    mode,
                    machine,
                    mould,
                    limit,
                    reason,
                  ])}
                  entries={selected}
                  machineId={machine}
                  mouldId={mould}
                  from={from}
                  to={to}
                  mode={mode}
                  basis={basis}
                  canExport={canExport}
                  canCreate={canCreate}
                  initialReason={reason}
                  onClearReason={() => setReason("")}
                />
              )}
            </>
          )}
          <details className="oee-method">
            <summary>
              <Info size={15} /> Understand these numbers{" "}
              <ChevronRight size={15} />
            </summary>
            <div className="oee-method-grid">
              <div>
                <h3>Two clear calculation views</h3>
                <p>
                  ERP: total shots ÷ total saved target × 100. Sheet: average of
                  individual shots ÷ target percentages, using only
                  positive-target readings. Changing the view recalculates every
                  OEE chart and card; it does not change saved data.
                </p>
                <p>
                  In this scope: ERP {percent(summary.weighted)} · Sheet{" "}
                  {percent(summary.mean)}.
                </p>
              </div>
              <div>
                <h3>Readings, targets and coverage</h3>
                <p>
                  Targets come from saved production entries.{" "}
                  {n(summary.noTarget)} readings have no eligible target. Actual
                  reported dates:{" "}
                  {actualStart ? `${actualStart} to ${actualEnd}` : "none"}. A
                  missing date is not a zero-production day.
                </p>
                <p>
                  Gauges stop at 100; the displayed score retains values above
                  100%. Shortfall is a net shot difference, not lost sales or
                  lost production time.
                </p>
              </div>
              <div>
                <h3>What this data can tell you</h3>
                <p>
                  This is shot-target achievement, as in your Sheet. Full
                  availability × performance × quality OEE needs operating time,
                  downtime duration and good/rejected output. Reason counts
                  measure frequency only; compound reason names are kept as
                  recorded.
                </p>
              </div>
            </div>
          </details>
        </>
      )}
    </section>
  );
}
export default function OeeDashboardPage() {
  const capabilities = useOeeCapabilities({
    actions: ["view", "create"],
    label: "OEE Production Entries",
    pageName: "OEE.ProductionEntries",
    resource: "oeeProductionEntries",
    route: "/oee/production-entries",
  });
  const reports = useOeeCapabilities({
    actions: ["export"],
    label: "OEE Reports",
    pageName: "OEE.Reports",
    resource: ["oeeReports", "reports"],
    route: "/oee/reports",
  });
  return capabilities.canView ? (
    <ProductionDashboard
      canExport={reports.canExport}
      canCreate={capabilities.canCreate}
    />
  ) : (
    <>
      <div className="oee-notice">
        You have dashboard access. Reading-level analysis requires Production
        Entries view access.
      </div>
      <OeeAggregateDashboard />
    </>
  );
}
