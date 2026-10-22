import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
  Boxes,
  CircleDollarSign,
  Factory,
  ShieldCheck,
  Target,
  Wallet,
} from "lucide-react";
import AppModal from "../../components/common/AppModal";
import AppSelect from "../../components/common/AppSelect";
import { PLANNING_RUN_STATUS_LABELS } from "../../constants/procurementEnums";
import {
  getTransactionStatusLabel,
  getTransactionTypeLabel,
} from "../../constants/rojmelEnums";
import { planningService } from "../../services/procurement/planningService";
import { safeLogSummary } from "../../utils/gstCompliance";
import { sumRojmelMoney } from "../../utils/rojmelTotals";
import {
  buildInsights,
  comparisonRange,
  insightSummary,
  metricChange,
} from "../oee/insights/productionInsights";
import { buildDowntimeAnalysis } from "../oee/dashboard/downtimeAnalysis";
import { groupSubmissionDays } from "../oee/dashboard/submissionAudit";
import InsightDailyRecords, {
  InsightDayDetails,
} from "../oee/insights/InsightDailyRecords";
import "../oee/insights/productionInsights.css";
import {
  dispatchTotals,
  formatNumber as n,
  gstOutcome,
  money,
  number,
  percent,
  safeSourceError,
  observationTime,
} from "./deepDiveData";
import {
  Gauge,
  Notice,
  Panel,
  Pill,
  RecordDetails,
  RecordLink,
  RecordTable,
  Source,
  Stat,
  Trend,
} from "./DeepDiveShared";

const productionColumns = [
  {
    key: "productionDate",
    label: "Production date",
    value: (row) => row.productionDate?.slice(0, 10),
  },
  { key: "machineCode", label: "Machine" },
  { key: "machineName", label: "Machine name" },
  { key: "mouldName", label: "Mould" },
  { key: "shotCount", label: "Shots", render: (row) => n(row.shotCount) },
  {
    key: "calculatedTargetShot",
    label: "Saved target",
    render: (row) => n(row.calculatedTargetShot),
  },
  { key: "machineOnTime", label: "Entered on-time" },
  { key: "downtimeReasonName", label: "Recorded reason" },
  { key: "remarks", label: "Remarks" },
];
const dispatchColumns = [
  { key: "runNumber", label: "Run" },
  {
    key: "planningDate",
    label: "Planning date",
    value: (row) => row.planningDate?.slice(0, 10),
  },
  { key: "itemCode", label: "Item code" },
  { key: "itemName", label: "Item" },
  { key: "warehouseName", label: "Warehouse" },
  {
    key: "recommendedQuantity",
    label: "Recommended",
    render: (row) => n(row.recommendedQuantity, 2),
  },
  {
    key: "allocatedQuantity",
    label: "Allocated",
    render: (row) => n(row.allocatedQuantity, 2),
  },
  {
    key: "allocation",
    label: "Allocation",
    value: (row) =>
      number(row.recommendedQuantity) > 0 &&
      number(row.allocatedQuantity) !== null &&
      number(row.allocatedQuantity) >= 0
        ? (Number(row.allocatedQuantity) / Number(row.recommendedQuantity)) *
          100
        : null,
    render: (row) => (
      <Pill
        tone={
          number(row.recommendedQuantity) > 0 &&
          number(row.allocatedQuantity) !== null &&
          number(row.allocatedQuantity) >= number(row.recommendedQuantity)
            ? "good"
            : "warn"
        }
      >
        {number(row.recommendedQuantity) > 0 &&
        number(row.allocatedQuantity) !== null &&
        number(row.allocatedQuantity) >= 0
          ? percent(
              (Number(row.allocatedQuantity) /
                Number(row.recommendedQuantity)) *
                100,
            )
          : "Unknown"}
      </Pill>
    ),
  },
];
const planningColumns = [
  { key: "runNumber", label: "Planning run" },
  {
    key: "fromDate",
    label: "From",
    value: (row) => row.fromDate?.slice(0, 10),
  },
  { key: "toDate", label: "To", value: (row) => row.toDate?.slice(0, 10) },
  {
    key: "status",
    label: "Status",
    value: (row) => PLANNING_RUN_STATUS_LABELS[row.status] || "Unknown",
  },
  { key: "lineCount", label: "Materials" },
  { key: "purchaseLineCount", label: "Purchase lines" },
];
const cashflowColumns = [
  {
    key: "transactionDate",
    label: "Date",
    value: (row) => row.transactionDate?.slice(0, 10),
  },
  { key: "income", label: "Income", render: (row) => money(row.income) },
  { key: "expense", label: "Expense", render: (row) => money(row.expense) },
  {
    key: "netIncomeExpense",
    label: "Net movement",
    render: (row) => money(row.netIncomeExpense),
  },
];
const logColumns = [
  {
    key: "createdAt",
    label: "Observed at (IST)",
    value: (row) => row.createdAt,
    render: (row) => observationTime(row.createdAt),
  },
  { key: "apiType", label: "Operation" },
  { key: "companyGstRegistrationId", label: "Registration ID" },
  {
    key: "outcome",
    label: "API outcome",
    value: gstOutcome,
    render: (row) => (
      <Pill
        tone={
          row.isSuccess === true
            ? "good"
            : row.isSuccess === false
              ? "bad"
              : "muted"
        }
      >
        {gstOutcome(row)}
      </Pill>
    ),
  },
  { key: "statusCode", label: "HTTP status" },
  { key: "durationMs", label: "Duration (ms)" },
  {
    key: "summary",
    label: "Summary",
    value: (row) =>
      typeof row.isSuccess !== "boolean" ? "Outcome not supplied" : safeLogSummary(row),
  },
];
const statusHint = (source) =>
  !source || source.status === "denied"
    ? "Access restricted"
    : source.status === "error"
      ? "Source unavailable"
      : "Loading source…";
const ready = (source) => source?.status === "ready";
const rowsOf = (source) =>
  ready(source) && Array.isArray(source.data) ? source.data : [];

export function ExecutiveStats({ sources, open }) {
  const production = insightSummary(rowsOf(sources.production));
  const dispatch = dispatchTotals(rowsOf(sources.dispatch));
  const summary = sources.summary?.data;
  const balance = summary?.isAllWalletView
    ? summary.totalWalletBalance
    : summary?.companyWalletBalance;
  const active = rowsOf(sources.planning).filter((row) =>
    [1, 3, 4].includes(Number(row.status)),
  );
  return (
    <div className="deep-stats">
      <Stat
        label="Open planning runs"
        value={ready(sources.planning) ? n(active.length) : "—"}
        hint={
          ready(sources.planning)
            ? "Draft, calculated & reviewed plans"
            : statusHint(sources.planning)
        }
        icon={Boxes}
        onClick={
          ready(sources.planning)
            ? () =>
                open("Open planning runs", active, planningColumns, "planning")
            : undefined
        }
      />
      <Stat
        label="Dispatch allocation"
        value={ready(sources.dispatch) ? percent(dispatch.ratio) : "—"}
        hint={
          ready(sources.dispatch)
            ? `${n(dispatch.allocated, 2)} of ${n(dispatch.recommended, 2)} comparable units · finalized runs`
            : statusHint(sources.dispatch)
        }
        icon={ArrowUpRight}
        tone="sky"
        onClick={
          ready(sources.dispatch)
            ? () =>
                open(
                  "Finalized dispatch allocations",
                  sources.dispatch.data,
                  dispatchColumns,
                  "dispatch",
                )
            : undefined
        }
      />
      <Stat
        label="Production target achievement"
        value={
          ready(sources.production) ? percent(production.achievement) : "—"
        }
        hint={
          ready(sources.production)
            ? `${n(production.eligible)} comparable readings · shots ÷ saved target`
            : statusHint(sources.production)
        }
        icon={Factory}
        tone="amber"
        onClick={
          ready(sources.production)
            ? () =>
                open(
                  "Production readings",
                  sources.production.data,
                  productionColumns,
                  "production",
                )
            : undefined
        }
      />
      <Stat
        label="Current wallet balance"
        value={ready(sources.summary) ? money(balance) : "—"}
        hint={
          ready(sources.summary)
            ? `${summary?.isAllWalletView ? "All accessible wallets" : "Company wallet"} · current snapshot`
            : statusHint(sources.summary)
        }
        icon={Wallet}
        tone="emerald"
        onClick={
          ready(sources.summary)
            ? () =>
                open(
                  "Rojmel summary",
                  [summary],
                  [
                    { key: "fromDate", label: "Period start" },
                    { key: "toDate", label: "Period end" },
                    {
                      key: "balance",
                      label: "Current balance",
                      value: () => money(balance),
                    },
                    {
                      key: "totalIncome",
                      label: "Period income",
                      render: (row) => money(row.totalIncome),
                    },
                    {
                      key: "totalExpense",
                      label: "Period expense",
                      render: (row) => money(row.totalExpense),
                    },
                    {
                      key: "totalTransfers",
                      label: "Transfers (separate)",
                      render: (row) => money(row.totalTransfers),
                    },
                  ],
                  "summary",
                )
            : undefined
        }
      />
    </div>
  );
}

export function ModulePulse({ sources, link }) {
  const stages = [
    {
      name: "Procurement",
      key: "planning",
      count: `${n(rowsOf(sources.planning).length)} planning runs`,
      page: "cross",
      icon: Boxes,
    },
    {
      name: "Manufacturing",
      key: "production",
      count: `${n(insightSummary(rowsOf(sources.production)).machines)} reporting machines`,
      page: "oee",
      icon: Factory,
    },
    {
      name: "Dispatch",
      key: "dispatch",
      count: `${n(rowsOf(sources.dispatch).length)} allocation lines`,
      page: "cross",
      icon: ArrowUpRight,
    },
    {
      name: "Finance",
      key: "summary",
      count: "Wallet & period summary",
      page: "finance",
      icon: Wallet,
    },
    {
      name: "Statutory",
      key: "logs",
      count: `${n(rowsOf(sources.logs).length)} API observations`,
      page: "gst",
      icon: ShieldCheck,
    },
  ];
  return (
    <Panel
      title="Operations at a glance"
      detail="Independent module snapshots · shared date window"
    >
      <div className="deep-pipeline">
        {stages.map(({ name, key, count, page, icon: Icon }, index) => (
          <div className="deep-stage" key={key}>
            <div className="deep-stage-top">
              <Icon size={20} />
              <span>0{index + 1}</span>
            </div>
            <strong>{name}</strong>
            <p>{ready(sources[key]) ? count : statusHint(sources[key])}</p>
            {sources[key]?.status !== "denied" && (
              <RecordLink to={link(page)}>Explore</RecordLink>
            )}
          </div>
        ))}
      </div>
      <p className="deep-footnote">
        These stages are not a traced order journey. Vendor-to-delivery links,
        warehouse buffers and delivery SLA need additional source contracts.
      </p>
    </Panel>
  );
}

export function ProductionSection({
  source,
  priorSource,
  range,
  query,
  canExport,
  detailed = false,
}) {
  return (
    <Source source={source}>
      {(rows) => (
        <ProductionContent
          rows={rows}
          priorSource={priorSource}
          range={range}
          query={query}
          canExport={canExport}
          detailed={detailed}
        />
      )}
    </Source>
  );
}
function ProductionContent({
  rows,
  priorSource,
  range,
  query,
  canExport,
  detailed,
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const machine = detailed ? searchParams.get("machine") || "" : "";
  const setMachine = (value) => {
    const next = new URLSearchParams(searchParams);
    value ? next.set("machine", value) : next.delete("machine");
    setSearchParams(next);
  };
  const [day, setDay] = useState(null);
  const [selected, setSelected] = useState(null);
  const scoped = rows.filter(
    (row) => !machine || String(row.machineId) === machine,
  );
  const previous = rowsOf(priorSource).filter(
    (row) => !machine || String(row.machineId) === machine,
  );
  const insight = buildInsights(scoped, previous, range);
  const stats = insight.current;
  const downtime = buildDowntimeAnalysis(scoped);
  const days = groupSubmissionDays(scoped);
  const machineColumns = [
    { key: "code", label: "Machine" },
    { key: "count", label: "Readings" },
    { key: "actual", label: "Shots", render: (row) => n(row.actual) },
    {
      key: "target",
      label: "Comparable target",
      render: (row) => n(row.target),
    },
    {
      key: "achievement",
      label: "Achievement",
      render: (row) => percent(row.achievement),
    },
    {
      key: "grossShortfall",
      label: "Reading shortfall",
      render: (row) => n(row.grossShortfall),
    },
    { key: "latestDate", label: "Latest production date" },
  ];
  return (
    <>
      <Panel
        title="Manufacturing performance"
        detail="Saved production readings · no sensor feed"
        action={
          detailed && (
            <AppSelect
              aria-label="Manufacturing machine"
              value={machine}
              onChange={setMachine}
              options={[
                { value: "", label: "All reporting machines" },
                ...[
                  ...new Map(
                    rows.map((row) => [
                      String(row.machineId),
                      {
                        value: String(row.machineId),
                        label: row.machineCode || row.machineName,
                      },
                    ]),
                  ).values(),
                ],
              ]}
            />
          )
        }
      >
        <div className="deep-gauges">
          <Gauge
            value={stats.achievement}
            label="Target achievement"
            detail={`${n(stats.eligible)} comparable readings`}
          />
          <Gauge
            label="Availability"
            detail="Runtime and planned time needed"
            color="#10b981"
          />
          <Gauge
            label="Performance"
            detail="Ideal cycle time needed"
            color="#f59e0b"
          />
          <Gauge
            label="Quality"
            detail="Good and rejected counts needed"
            color="#0ea5e9"
          />
        </div>
        <Notice>
          True OEE = Availability × Performance × Quality. Current records
          support shot-to-target achievement. Values can exceed 100%; sensor
          status and downtime duration are not supplied.
        </Notice>
        <RecordTable
          title="Machine performance"
          rows={insight.machines.filter((machine) => machine.count > 0)}
          columns={machineColumns}
          query={query}
          canExport={canExport}
          onInspect={setSelected}
          filename={`deep-dive-machines-${range.fromDate}-${range.toDate}`}
        />
      </Panel>
      {detailed && (
        <>
          <Panel
            title="Previous-period comparison"
            detail={`Equal calendar window: ${comparisonRange(range).fromDate} → ${comparisonRange(range).toDate}. The machine filter applies to both periods.`}
          >
            <Source source={priorSource}>
              {() => (
                <div className="deep-inline-metrics">
                  {[
                    [
                      "Shot output",
                      stats.count ? stats.actual : null,
                      insight.previous.count ? insight.previous.actual : null,
                      false,
                    ],
                    [
                      "Target achievement",
                      stats.achievement,
                      insight.previous.achievement,
                      true,
                    ],
                    [
                      "Reporting machines",
                      stats.machines || null,
                      insight.previous.machines || null,
                      false,
                    ],
                  ].map(([label, current, before, points]) => {
                    const change = metricChange(current, before, { points });
                    return (
                      <div key={label}>
                        <small>{label} · vs previous period</small>
                        <strong>
                          {change.value == null
                            ? "—"
                            : `${change.value > 0 ? "+" : ""}${n(change.value, 1)}${points ? " pp" : "%"}`}
                        </strong>
                        <p className="deep-footnote">
                          {change.value == null
                            ? change.text
                            : `Previous: ${points ? percent(before) : n(before)}`}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </Source>
          </Panel>
          <div className="deep-stats">
            <Stat
              label="Actual shots"
              value={n(stats.actual)}
              hint={`${n(stats.count)} saved readings`}
              icon={Factory}
            />
            <Stat
              label="Comparable target"
              value={stats.eligible ? n(stats.target) : "—"}
              hint="Positive targets with valid shot counts"
              icon={Target}
              tone="sky"
            />
            <Stat
              label="Reading shortfall"
              value={stats.eligible ? n(stats.grossShortfall) : "—"}
              hint="Positive gaps per reading; not offset by overproduction"
              icon={Activity}
              tone="amber"
            />
            <Stat
              label="Data quality"
              value={n(stats.count - stats.eligible)}
              hint={`${n(stats.duplicates)} repeated machine/date pairs · review source records`}
              icon={ShieldCheck}
              tone="violet"
            />
          </div>
          <div className="deep-grid">
            <Panel
              title="Output and saved targets"
              detail="Missing production dates remain gaps; recorded zero is zero"
            >
              <Trend
                rows={insight.trend}
                xKey="date"
                title="Production trend"
                series={[
                  {
                    key: "actual",
                    label: "Actual shots",
                    color: "var(--app-accent)",
                  },
                  {
                    key: "target",
                    label: "Comparable target",
                    color: "#0ea5e9",
                  },
                ]}
              />
            </Panel>
            <Panel
              title="Recorded issue frequency"
              detail="Occurrences per machine and reason · not downtime minutes"
            >
              {!downtime.rows.length ? (
                <div className="deep-empty">
                  <strong>No recorded production issues</strong>
                  <p>NONE entries are excluded from this analysis.</p>
                </div>
              ) : (
                <div className="deep-bars">
                  {downtime.rows.slice(0, 8).map((row) => (
                    <div key={row.key}>
                      <div>
                        <span>
                          {row.machine} · {row.reason}
                        </span>
                        <strong>{n(row.count)} readings</strong>
                      </div>
                      <progress
                        max={downtime.recorded}
                        value={row.count}
                        aria-label={`${row.machine}: ${row.reason}, ${row.count} readings`}
                      />
                    </div>
                  ))}
                </div>
              )}
              <details className="deep-chart-table">
                <summary>View all issue records</summary>
                <RecordTable
                  title="Production issues"
                  rows={downtime.rows}
                  columns={[
                    { key: "machine", label: "Machine" },
                    { key: "reason", label: "Reason" },
                    { key: "count", label: "Occurrences" },
                    { key: "days", label: "Production dates" },
                  ]}
                  query={query}
                  canExport={canExport}
                />
              </details>
            </Panel>
          </div>
          <InsightDailyRecords
            days={days}
            range={range}
            onDate={(date) =>
              setDay(
                days.find((item) => item.date === date) || { date, rows: [] },
              )
            }
          />
        </>
      )}
      {selected && (
        <AppModal
          isOpen
          title={`${selected.code} · production readings`}
          maxWidth="max-w-6xl"
          onClose={() => setSelected(null)}
        >
          <RecordTable
            title="Selected machine readings"
            rows={selected.rows}
            columns={productionColumns}
            canExport={canExport}
          />
        </AppModal>
      )}
      {day && (
        <InsightDayDetails
          day={day}
          onClose={() => setDay(null)}
          canCreate={false}
        />
      )}
    </>
  );
}

export function DispatchSection({ source, query, canExport }) {
  const [selected, setSelected] = useState(null);
  return (
    <Panel
      title="Dispatch allocation streams"
      detail="Finalized planning runs · allocation is not a delivery status"
    >
      <Source source={source}>
        {(rows) => (
          <>
            <Notice>
              {dispatchTotals(rows).excluded} lines excluded from the ratio
              because recommended or allocated quantities are not comparable.
              Values combine saved run snapshots.
            </Notice>
            <RecordTable
              title="Dispatch streams"
              rows={rows}
              columns={dispatchColumns}
              query={query}
              canExport={canExport}
              onInspect={setSelected}
            />
          </>
        )}
      </Source>
      {selected && rowsOf(source).includes(selected) && (
        <RecordDetails
          record={selected}
          columns={[
            ...dispatchColumns,
            { key: "channelCode", label: "Channel" },
            { key: "channelSku", label: "Channel SKU" },
            { key: "boxCount", label: "Boxes" },
            { key: "tier", label: "Tier" },
          ]}
          title={`${selected.runNumber} · ${selected.itemCode}`}
          onClose={() => setSelected(null)}
        />
      )}
    </Panel>
  );
}
export function PlanningSection({ source, query, canExport }) {
  const [selected, setSelected] = useState(null);
  return (
    <Panel
      title="Procurement planning register"
      detail="Saved planning windows · quantities are not purchase-order value"
    >
      <Source source={source}>
        {(rows) => (
          <RecordTable
            title="Planning runs"
            rows={rows}
            columns={planningColumns}
            query={query}
            canExport={canExport}
            onInspect={setSelected}
          />
        )}
      </Source>
      {selected && rowsOf(source).includes(selected) && (
        <PlanDetail
          run={selected}
          onClose={() => setSelected(null)}
          canExport={canExport}
        />
      )}
    </Panel>
  );
}
function PlanDetail({ run, onClose, canExport }) {
  const [state, setState] = useState({ status: "loading" });
  useEffect(() => {
    let active = true;
    planningService
      .getRun(run.id)
      .then((response) => {
        if (!Array.isArray(response.data?.lines))
          throw new Error("Planning lines are unavailable.");
        if (active) setState({ status: "ready", data: response.data.lines });
      })
      .catch((error) => {
        if (active)
          setState({ status: "error", error: safeSourceError(error) });
      });
    return () => {
      active = false;
    };
  }, [run.id]);
  return (
    <AppModal
      isOpen
      title={`${run.runNumber} · material requirements`}
      onClose={onClose}
      maxWidth="max-w-6xl"
    >
      <Source source={state}>
        {(rows) => (
          <RecordTable
            title="Material requirements"
            rows={rows}
            canExport={canExport}
            columns={[
              { key: "materialItemCode", label: "Material" },
              { key: "materialItemName", label: "Name" },
              { key: "unitShortName", label: "Unit" },
              { key: "physicalStock", label: "Physical stock" },
              { key: "shortage", label: "Shortage" },
              { key: "finalQuantity", label: "Final quantity" },
              { key: "warningState", label: "Warning" },
              { key: "calculationExplanation", label: "Calculation" },
            ]}
          />
        )}
      </Source>
    </AppModal>
  );
}

export function CashflowSection({
  source,
  query,
  canExport,
  detailed = false,
}) {
  return (
    <Panel
      title="Cashflow movement"
      detail="Period income and expense · transfers, adjustments and opening balances excluded"
    >
      <Source source={source}>
        {(rows) => (
          <>
            <div className="deep-inline-metrics">
              <div>
                <small>Income</small>
                <strong className="deep-good">
                  {money(sumRojmelMoney(rows, "income"))}
                </strong>
              </div>
              <div>
                <small>Expense</small>
                <strong className="deep-bad">
                  {money(sumRojmelMoney(rows, "expense"))}
                </strong>
              </div>
              <div>
                <small>Net movement</small>
                <strong>
                  {money(sumRojmelMoney(rows, "netIncomeExpense"))}
                </strong>
              </div>
            </div>
            <Trend
              rows={[...rows].sort((a, b) =>
                String(a.transactionDate).localeCompare(
                  String(b.transactionDate),
                ),
              )}
              xKey="transactionDate"
              title="Cashflow"
              format={money}
              series={[
                { key: "income", label: "Income", color: "#059669" },
                { key: "expense", label: "Expense", color: "#e11d48" },
              ]}
            />
            {detailed && (
              <RecordTable
                title="Daily cashflow ledger"
                rows={rows}
                columns={cashflowColumns}
                query={query}
                canExport={canExport}
              />
            )}
          </>
        )}
      </Source>
    </Panel>
  );
}
export function FinanceSection({ sources, query, exports }) {
  const [selected, setSelected] = useState(null);
  const transactionColumns = [
    { key: "transactionNo", label: "Transaction" },
    {
      key: "transactionDate",
      label: "Date",
      value: (row) => row.transactionDate?.slice(0, 10),
    },
    { key: "walletName", label: "Wallet" },
    {
      key: "transactionType",
      label: "Type",
      value: (row) => getTransactionTypeLabel(row.transactionType),
    },
    {
      key: "status",
      label: "Status",
      value: (row) => getTransactionStatusLabel(row.status),
    },
    { key: "categoryName", label: "Category" },
    { key: "amount", label: "Amount", render: (row) => money(row.amount) },
    { key: "description", label: "Description" },
  ];
  return (
    <>
      <Source source={sources.summary}>
        {(data) => (
          <div className="deep-stats">
            <Stat
              label="Current wallet balance"
              value={money(
                data.isAllWalletView
                  ? data.totalWalletBalance
                  : data.companyWalletBalance,
              )}
              hint={`${data.isAllWalletView ? "All accessible wallets" : "Company wallet"} · current snapshot`}
              icon={Wallet}
              tone="brand"
            />
            <Stat
              label="Period income"
              value={money(data.totalIncome)}
              hint="Income transactions in the selected period"
              icon={ArrowDownLeft}
              tone="emerald"
            />
            <Stat
              label="Period expense"
              value={money(data.totalExpense)}
              hint="Expense transactions in the selected period"
              icon={ArrowUpRight}
              tone="red"
            />
            <Stat
              label="Period transfers"
              value={money(data.totalTransfers)}
              hint="Internal movement · excluded from income and expense"
              icon={CircleDollarSign}
              tone="sky"
            />
          </div>
        )}
      </Source>
      <CashflowSection
        source={sources.cashflow}
        query={query}
        canExport={exports.cashflow}
        detailed
      />
      <Panel
        title="Accessible wallets"
        detail="Current balances · date filters do not change this snapshot"
      >
        <Source source={sources.wallets}>
          {(rows) => (
            <RecordTable
              title="Wallet balances"
              snapshot
              rows={rows}
              columns={[
                { key: "walletCode", label: "Wallet code" },
                { key: "walletName", label: "Wallet" },
                { key: "linkedUserName", label: "Linked user" },
                {
                  key: "currentBalance",
                  label: "Current balance",
                  render: (row) => money(row.currentBalance),
                },
              ]}
              query={query}
              canExport={exports.wallets}
            />
          )}
        </Source>
      </Panel>
      <Panel
        title="Period transaction ledger"
        detail="All accessible transactions in the selected period · types and cancellation status remain explicit"
      >
        <Source source={sources.transactions}>
          {(rows) => (
            <RecordTable
              title="Period transactions"
              rows={rows}
              columns={transactionColumns}
              query={query}
              canExport={exports.transactions}
              onInspect={setSelected}
            />
          )}
        </Source>
      </Panel>
      <Notice>
        Pending payables, bank reconciliation and input tax credit cannot be
        derived from wallet balances. These require dedicated ledger and GST
        reconciliation data.
      </Notice>
      {selected && rowsOf(sources.transactions).includes(selected) && (
        <RecordDetails
          title={selected.transactionNo || "Transaction details"}
          record={selected}
          columns={[
            ...transactionColumns,
            { key: "referenceNo", label: "Reference" },
            {
              key: "balanceBefore",
              label: "Balance before",
              value: (row) => money(row.balanceBefore),
            },
            {
              key: "balanceAfter",
              label: "Balance after",
              value: (row) => money(row.balanceAfter),
            },
          ]}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}

export function JournalPreview({ source, query, canExport, href }) {
  const [selected, setSelected] = useState(null);
  const columns = [
    { key: "transactionNo", label: "Transaction" },
    {
      key: "transactionDate",
      label: "Date",
      value: (row) => row.transactionDate?.slice(0, 10),
    },
    { key: "walletName", label: "Wallet" },
    {
      key: "transactionType",
      label: "Type",
      value: (row) => getTransactionTypeLabel(row.transactionType),
    },
    {
      key: "status",
      label: "Status",
      value: (row) => getTransactionStatusLabel(row.status),
    },
    { key: "amount", label: "Amount", render: (row) => money(row.amount) },
  ];
  return (
    <Panel
      title="Financial journal"
      detail="Transactions within the selected period · transfers and opening balances remain separate types"
      action={
        source?.status !== "denied" && (
          <RecordLink to={href}>Financial Hub</RecordLink>
        )
      }
    >
      <Source source={source}>
        {(rows) => (
          <RecordTable
            rows={rows}
            columns={columns}
            title="Financial journal"
            query={query}
            canExport={canExport}
            onInspect={setSelected}
          />
        )}
      </Source>
      {selected && rowsOf(source).includes(selected) && (
        <RecordDetails
          title={selected.transactionNo}
          record={selected}
          columns={columns}
          onClose={() => setSelected(null)}
        />
      )}
    </Panel>
  );
}

export function GstLogSection({ source, query, canExport }) {
  const [selected, setSelected] = useState(null);
  return (
    <Panel
      title="Observed GST operations"
      detail="API outcomes from stored logs · not filing or tax-authority confirmation"
    >
      <Source source={source}>
        {(rows) => (
          <RecordTable
            title="GST operation logs"
            rows={rows}
            columns={logColumns}
            query={query}
            canExport={canExport}
            onInspect={setSelected}
          />
        )}
      </Source>
      {selected && rowsOf(source).includes(selected) && (
        <RecordDetails
          title="GST operation observation"
          record={selected}
          columns={logColumns}
          onClose={() => setSelected(null)}
        />
      )}
    </Panel>
  );
}
export function GstSection({ sources, query, exports }) {
  return (
    <>
      <div className="deep-grid">
        <Panel
          title="Provider configuration"
          detail="Configuration availability does not confirm provider health"
        >
          <Source source={sources.configuration}>
            {(data) => (
              <>
                <div className="deep-configuration">
                  <ShieldCheck size={32} />
                  <div>
                    <small>Configured environment</small>
                    <strong>{data.environment || "Not supplied"}</strong>
                  </div>
                  <Pill tone="muted">Health unknown</Pill>
                </div>
                <div className="deep-detail-list">
                  <div>
                    <dt>Enabled features</dt>
                    <dd>
                      {data.enabledFeatures?.join(", ") || "None reported"}
                    </dd>
                  </div>
                  <div>
                    <dt>Missing settings</dt>
                    <dd>
                      {data.missingSettings?.join(", ") || "None reported"}
                    </dd>
                  </div>
                </div>
                <Notice>
                  No health-check or provider heartbeat is supplied by this
                  endpoint.
                </Notice>
              </>
            )}
          </Source>
        </Panel>
        <Panel
          title="Operation quality"
          detail="Complete stored log set for the selected period"
        >
          <Source source={sources.logs}>
            {(rows) => (
              <>
                <div className="deep-inline-metrics">
                  <div>
                    <small>Completed</small>
                    <strong className="deep-good">
                      {n(rows.filter((row) => row.isSuccess === true).length)}
                    </strong>
                  </div>
                  <div>
                    <small>Failed</small>
                    <strong className="deep-bad">
                      {n(rows.filter((row) => row.isSuccess === false).length)}
                    </strong>
                  </div>
                  <div>
                    <small>Unknown</small>
                    <strong>
                      {n(rows.filter((row) => typeof row.isSuccess !== "boolean").length)}
                    </strong>
                  </div>
                </div>
                <Notice>
                  Log success confirms completion of an API operation only. It
                  does not establish that a return was filed, ITC was approved
                  or an invoice is active.
                </Notice>
              </>
            )}
          </Source>
        </Panel>
      </div>
      <Panel
        title="GST registration coverage"
        detail="Current registration settings · not filtered by transaction date"
      >
        <Source source={sources.registrations}>
          {(rows) => (
            <RecordTable
              title="GST registrations"
              snapshot
              rows={rows}
              query={query}
              canExport={exports.registrations}
              columns={[
                { key: "gstin", label: "GSTIN" },
                { key: "legalName", label: "Legal name" },
                { key: "branchName", label: "Branch" },
                { key: "status", label: "Stored status" },
                {
                  key: "isEInvoiceEnabled",
                  label: "E-Invoice enabled",
                  value: (row) =>
                    row.isEInvoiceEnabled === true
                      ? "Yes"
                      : row.isEInvoiceEnabled === false
                        ? "No"
                        : "Unknown",
                },
                {
                  key: "isEWayBillEnabled",
                  label: "E-Way Bill enabled",
                  value: (row) =>
                    row.isEWayBillEnabled === true
                      ? "Yes"
                      : row.isEWayBillEnabled === false
                        ? "No"
                        : "Unknown",
                },
              ]}
            />
          )}
        </Source>
      </Panel>
      <GstLogSection
        source={sources.logs}
        query={query}
        canExport={exports.logs}
      />
      <Notice>
        Invoice and E-Way Bill registers, return status and GSTR-2B / ITC
        reconciliation await list and reconciliation APIs. Existing identifier
        lookup remains available in GST compliance for authorized users.
      </Notice>
    </>
  );
}

export function Findings({ sources, open }) {
  const findings = [];
  if (ready(sources.production)) {
    const summary = insightSummary(sources.production.data);
    if (summary.grossShortfall > 0)
      findings.push({
        title: `${n(summary.grossShortfall)} shots below saved reading targets`,
        text: "Sum of positive gaps for comparable production readings. Over-target machines do not cancel these gaps.",
        page: "oee",
        tone: "warn",
      });
    if (summary.count - summary.eligible > 0)
      findings.push({
        title: `${n(summary.count - summary.eligible)} readings need data review`,
        text: "A valid shot count and positive saved target are required for comparable achievement.",
        page: "oee",
        tone: "warn",
      });
    if (summary.duplicates > 0)
      findings.push({
        title: `${n(summary.duplicates)} repeated machine/date pairs`,
        text: "Review the source before interpreting daily machine coverage. Multiple readings are not automatically duplicates.",
        page: "oee",
        tone: "warn",
      });
  }
  if (ready(sources.dispatch)) {
    const dispatch = dispatchTotals(sources.dispatch.data);
    if (dispatch.gap > 0)
      findings.push({
        title: `${n(dispatch.gap, 2)} recommended units unallocated`,
        text: "Positive gaps within finalized run snapshots. This is not proof of late customer delivery.",
        page: "cross",
        tone: "warn",
      });
  }
  if (ready(sources.logs)) {
    const failed = sources.logs.data.filter(
      (row) => row.isSuccess === false,
    ).length;
    if (failed)
      findings.push({
        title: `${n(failed)} unsuccessful GST operations`,
        text: "Inspect stored observations before retrying from the source module. No tax authority outcome is inferred.",
        page: "gst",
        tone: "bad",
      });
  }
  return (
    <Panel
      title="Attention & evidence"
      detail="Rules: positive target gaps, incomplete readings, repeated pairs and explicitly failed API operations"
    >
      <div className="deep-findings">
        {findings.map((item, index) => (
          <article key={index}>
            <Pill tone={item.tone}>Review</Pill>
            <div>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </div>
            <button className="deep-link" onClick={() => {
              const source = { oee: "production", cross: "dispatch", gst: "logs" }[item.page];
              const columns = { oee: productionColumns, cross: dispatchColumns, gst: logColumns }[item.page];
              open(`Source records · ${item.title}`, rowsOf(sources[source]), columns, source);
            }}>Inspect <ArrowUpRight size={14} /></button>
          </article>
        ))}
        {!findings.length && (
          <div className="deep-empty">
            <strong>No review signals in available records</strong>
            <p>
              Unavailable or restricted sources are not included in this
              assessment.
            </p>
          </div>
        )}
      </div>
    </Panel>
  );
}
