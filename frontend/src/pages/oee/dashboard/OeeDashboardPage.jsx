import {
  Activity,
  AlertTriangle,
  BarChart3,
  Factory,
  Gauge,
  Hash,
  RefreshCw,
  Search,
  Target,
  Trophy,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";

import AppButton from "../../../components/common/AppButton";
import AppInput from "../../../components/common/AppInput";
import AppSelect from "../../../components/common/AppSelect";
import PageHeader from "../../../components/common/PageHeader";
import { oeeMachineService } from "../../../services/oee/oeeMachineService";
import {
  fetchOeeDashboard,
  setOeeDashboardFilters,
} from "../../../store/slices/oee/oeeDashboardSlice";
import {
  buildOeeRangeParams,
  formatOeeDate,
  formatOeeNumber,
  formatOeePercent,
  getOeeActionError,
  getOeeRating,
  getOeeRecordId,
  OEE_HORIZON_OPTIONS,
} from "../oeeHelpers";
import { OeeRatingPill, OeeStatCard } from "../OeeShared";

const asArray = (value) => (Array.isArray(value) ? value : []);

const PanelSkeleton = ({ className = "" }) => {
  return (
    <div
      className={[
        "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm",
        className,
      ].join(" ")}
    >
      <div className="h-4 w-36 animate-pulse rounded-full bg-slate-100" />
      <div className="mt-5 h-40 animate-pulse rounded-xl bg-slate-100" />
    </div>
  );
};

const PanelError = ({ message }) => {
  if (!message) {
    return null;
  }

  return (
    <div className="rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-100">
      {message}
    </div>
  );
};

const EmptyPanel = ({ label }) => {
  return (
    <div className="rounded-xl bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
      {label}
    </div>
  );
};

const GaugeRing = ({ value }) => {
  const safeValue = Math.max(0, Math.min(100, Number(value) || 0));
  const rating = getOeeRating(safeValue);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (safeValue / 100) * circumference;

  return (
    <div className="relative mx-auto h-40 w-40">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 140 140">
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="13"
        />
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke={rating.color}
          strokeLinecap="round"
          strokeWidth="13"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
        />
        <circle
          cx="70"
          cy="70"
          r="38"
          fill="white"
          stroke="#f1f5f9"
          strokeWidth="1"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-slate-900">
          {safeValue.toFixed(1)}
        </span>
        <span className="text-xs font-semibold text-slate-400">OEE %</span>
      </div>
    </div>
  );
};

const MachineGaugeCard = ({ machine, meta }) => {
  const rating = getOeeRating(machine.averageOeePercentage);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">
            {meta?.machineCode || machine.machineName || "Machine"}
          </p>
          <p className="mt-0.5 truncate text-xs text-slate-500">
            {[machine.machineName, meta?.tonnage].filter(Boolean).join(" / ") ||
              "Production machine"}
          </p>
        </div>
        <OeeRatingPill rating={rating} />
      </div>

      <div className="mt-4">
        <GaugeRing value={machine.averageOeePercentage} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-slate-50 px-3 py-2">
          <p className="text-xs font-semibold text-slate-400">Shots</p>
          <p className="mt-1 text-sm font-bold text-slate-900">
            {formatOeeNumber(machine.totalShot, { maximumFractionDigits: 0 })}
          </p>
        </div>
        <div className="rounded-xl bg-slate-50 px-3 py-2">
          <p className="text-xs font-semibold text-slate-400">Target</p>
          <p className="mt-1 text-sm font-bold text-slate-900">
            {formatOeeNumber(machine.totalTarget)}
          </p>
        </div>
      </div>

      <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-slate-100">
        <span className="w-[40%] bg-red-400" />
        <span className="w-[25%] bg-amber-400" />
        <span className="w-[20%] bg-brand" />
        <span className="w-[15%] bg-emerald-500" />
      </div>
      <div className="mt-1 flex justify-between text-[10px] font-semibold text-slate-400">
        <span>0</span>
        <span>40</span>
        <span>65</span>
        <span>85</span>
        <span>100</span>
      </div>
    </div>
  );
};

const HorizontalBarChart = ({
  emptyLabel,
  getLabel,
  getMeta,
  getValue,
  rows,
  valueLabel,
}) => {
  const max = Math.max(1, ...rows.map((row) => Number(getValue(row)) || 0));

  if (rows.length === 0) {
    return <EmptyPanel label={emptyLabel} />;
  }

  return (
    <div className="space-y-3">
      {rows.map((row, index) => {
        const value = Number(getValue(row)) || 0;
        const width = Math.max(4, Math.round((value / max) * 100));

        return (
          <div key={`${getLabel(row)}-${index}`}>
            <div className="flex items-center justify-between gap-3 text-sm">
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-900">
                  {getLabel(row)}
                </p>
                {getMeta && (
                  <p className="truncate text-xs text-slate-500">
                    {getMeta(row)}
                  </p>
                )}
              </div>
              <span className="shrink-0 text-xs font-semibold text-slate-500">
                {valueLabel(row)}
              </span>
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-brand"
                style={{ width: `${width}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

const TrendChart = ({ rows }) => {
  const trend = rows.slice(-30);
  const width = 760;
  const height = 260;
  const padding = 36;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  const maxShots = Math.max(1, ...trend.map((row) => Number(row.totalShot) || 0));
  const points = trend.map((row, index) => {
    const x =
      padding +
      (trend.length <= 1 ? chartWidth / 2 : (index / (trend.length - 1)) * chartWidth);
    const y =
      padding +
      chartHeight -
      ((Number(row.averageOeePercentage) || 0) / 100) * chartHeight;

    return { x, y, row };
  });
  const linePath = points.map((point) => `${point.x},${point.y}`).join(" ");
  const areaPath =
    points.length > 0
      ? `${points[0].x},${height - padding} ${linePath} ${points[points.length - 1].x},${height - padding}`
      : "";

  if (trend.length === 0) {
    return <EmptyPanel label="No daily trend data available." />;
  }

  return (
    <div className="overflow-hidden rounded-xl bg-slate-50 p-3">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-[260px] w-full"
        role="img"
        aria-label="Daily OEE trend"
      >
        {[0, 25, 50, 75, 100].map((tick) => {
          const y = padding + chartHeight - (tick / 100) * chartHeight;

          return (
            <g key={tick}>
              <line
                x1={padding}
                x2={width - padding}
                y1={y}
                y2={y}
                stroke="#e2e8f0"
                strokeDasharray="4 6"
              />
              <text
                x={padding - 10}
                y={y + 4}
                textAnchor="end"
                className="fill-slate-400 text-[11px] font-semibold"
              >
                {tick}%
              </text>
            </g>
          );
        })}

        {trend.map((row, index) => {
          const barWidth = Math.max(8, chartWidth / Math.max(1, trend.length) - 8);
          const x =
            padding +
            (trend.length <= 1 ? chartWidth / 2 : (index / (trend.length - 1)) * chartWidth) -
            barWidth / 2;
          const barHeight = ((Number(row.totalShot) || 0) / maxShots) * (chartHeight * 0.5);
          const y = height - padding - barHeight;

          return (
            <rect
              key={`${row.productionDate}-${index}`}
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              rx="5"
              fill="var(--app-accent-light)"
            />
          );
        })}

        {areaPath && (
          <polygon points={areaPath} fill="var(--app-accent)" opacity="0.12" />
        )}
        <polyline
          points={linePath}
          fill="none"
          stroke="var(--app-accent)"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="4"
        />
        {points.map((point, index) => (
          <g key={`${point.row.productionDate}-${index}`}>
            <circle
              cx={point.x}
              cy={point.y}
              r="5"
              fill="white"
              stroke="var(--app-accent)"
              strokeWidth="3"
            />
            {(index === 0 || index === points.length - 1) && (
              <text
                x={point.x}
                y={height - 8}
                textAnchor={index === 0 ? "start" : "end"}
                className="fill-slate-500 text-[11px] font-semibold"
              >
                {formatOeeDate(point.row.productionDate)}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
};

const DashboardPanel = ({ children, error, icon: Icon, loading, subtitle, title }) => {
  if (loading) {
    return <PanelSkeleton />;
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          {subtitle && (
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          )}
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-light text-brand">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <PanelError message={error} />
      <div className={error ? "mt-4" : ""}>{children}</div>
    </div>
  );
};

const OeeDashboardPage = () => {
  const dispatch = useDispatch();
  const dashboard = useSelector((state) => state.oeeDashboard);
  const [machineLookup, setMachineLookup] = useState([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [search, setSearch] = useState("");
  const [ratingFilter, setRatingFilter] = useState("all");

  const rangeParams = useMemo(
    () => buildOeeRangeParams(dashboard.filters),
    [dashboard.filters],
  );

  const loadDashboard = useCallback(() => {
    return dispatch(fetchOeeDashboard(rangeParams));
  }, [dispatch, rangeParams]);

  const loadMachineLookup = useCallback(async () => {
    try {
      const response = await oeeMachineService.getMachines({
        Page: 1,
        PageSize: 200,
        SortBy: "displayOrder",
        SortDirection: "asc",
      });

      setMachineLookup(asArray(response.data?.items));
    } catch (error) {
      toast.error(
        getOeeActionError(error, "Unable to load machine details."),
      );
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadDashboard);
  }, [loadDashboard]);

  useEffect(() => {
    void Promise.resolve().then(loadMachineLookup);
  }, [loadMachineLookup]);

  const summary = dashboard.summary.data ?? {};
  const machineWise = asArray(dashboard.machineWise.data);
  const mouldWise = asArray(dashboard.mouldWise.data);
  const topDowntime = asArray(dashboard.topDowntime.data);
  const dailyTrend = asArray(dashboard.dailyTrend.data);
  const machineById = useMemo(() => {
    return new Map(
      machineLookup.map((machine) => [
        String(getOeeRecordId(machine, "machine")),
        machine,
      ]),
    );
  }, [machineLookup]);

  const monitored = machineWise.length;
  const healthy = machineWise.filter(
    (machine) => Number(machine.averageOeePercentage) >= 65,
  ).length;
  const averageRating = getOeeRating(summary.averageOeePercentage);

  const filteredMachines = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return machineWise.filter((machine) => {
      const meta = machineById.get(String(machine.machineId));
      const haystack = [
        machine.machineName,
        meta?.machineCode,
        meta?.machineName,
        meta?.tonnage,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const rating = getOeeRating(machine.averageOeePercentage).label;

      return (
        (!normalizedSearch || haystack.includes(normalizedSearch)) &&
        (ratingFilter === "all" || rating === ratingFilter)
      );
    });
  }, [machineById, machineWise, ratingFilter, search]);

  const anyLoading = Object.values(dashboard)
    .filter((value) => value && typeof value === "object" && "loading" in value)
    .some((panel) => panel.loading);

  return (
    <section className="min-w-0 space-y-5">
      <PageHeader
        badge={
          <>
            <Gauge className="h-3.5 w-3.5" />
            OEE / Dashboard
          </>
        }
        title="OEE Dashboard"
        description="Real-time manufacturing effectiveness across machines, moulds, shots, targets, and downtime."
        actions={
          <AppButton
            variant="secondary"
            className="h-10"
            disabled={anyLoading}
            onClick={loadDashboard}
          >
            <RefreshCw className={`h-4 w-4 ${anyLoading ? "animate-spin" : ""}`} />
            Refresh
          </AppButton>
        }
      />

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[180px_160px_160px_auto]">
          <AppSelect
            value={dashboard.filters.mode}
            onChange={(value) =>
              dispatch(setOeeDashboardFilters({ mode: value }))
            }
            options={[
              { value: "lastDays", label: "Last N days" },
              { value: "custom", label: "Custom range" },
            ]}
            aria-label="Dashboard range mode"
          />
          {dashboard.filters.mode === "custom" ? (
            <>
              <AppInput
                type="date"
                value={dashboard.filters.FromDate}
                onChange={(event) =>
                  dispatch(
                    setOeeDashboardFilters({ FromDate: event.target.value }),
                  )
                }
                aria-label="From date"
                className="h-10"
              />
              <AppInput
                type="date"
                value={dashboard.filters.ToDate}
                onChange={(event) =>
                  dispatch(
                    setOeeDashboardFilters({ ToDate: event.target.value }),
                  )
                }
                aria-label="To date"
                className="h-10"
              />
            </>
          ) : (
            <>
              <AppSelect
                value={dashboard.filters.LastDays}
                onChange={(value) =>
                  dispatch(setOeeDashboardFilters({ LastDays: Number(value) }))
                }
                options={OEE_HORIZON_OPTIONS}
                aria-label="Last days"
              />
              <div />
            </>
          )}
          <div className="flex items-center justify-end text-xs font-semibold text-slate-500">
            Evaluation horizon:{" "}
            <span className="ml-1 text-slate-900">
              {dashboard.filters.mode === "custom"
                ? `${dashboard.filters.FromDate || "-"} to ${dashboard.filters.ToDate || "-"}`
                : `Last ${dashboard.filters.LastDays} days`}
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:col-span-2 xl:col-span-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
                Average Plant OEE
              </p>
              <div className="mt-2 flex items-end gap-3">
                <span className="text-4xl font-bold text-slate-900">
                  {formatOeePercent(summary.averageOeePercentage)}
                </span>
                <OeeRatingPill rating={averageRating} />
              </div>
              <p className="mt-3 text-sm text-slate-500">
                Best:{" "}
                <span className="font-semibold text-slate-900">
                  {summary.bestMachine || "-"}
                </span>{" "}
                / Worst:{" "}
                <span className="font-semibold text-slate-900">
                  {summary.worstMachine || "-"}
                </span>
              </p>
            </div>
            <Gauge className="h-8 w-8 text-brand" />
          </div>
        </div>
        <OeeStatCard
          icon={Factory}
          label="Machines"
          value={formatOeeNumber(monitored, { maximumFractionDigits: 0 })}
          meta={`${healthy} stable / ${Math.max(0, monitored - healthy)} watch`}
          colorClass="bg-brand-light text-brand"
        />
        <OeeStatCard
          icon={Hash}
          label="Total Shots"
          value={formatOeeNumber(summary.totalShotCount, {
            maximumFractionDigits: 0,
          })}
          colorClass="bg-sky-50 text-sky-600"
        />
        <OeeStatCard
          icon={Target}
          label="Total Target"
          value={formatOeeNumber(summary.totalTargetShot)}
          colorClass="bg-violet-50 text-violet-600"
        />
        <OeeStatCard
          icon={AlertTriangle}
          label="Downtime Count"
          value={formatOeeNumber(summary.totalDowntimeCount, {
            maximumFractionDigits: 0,
          })}
          meta={`${formatOeeNumber(summary.totalProductionDays, { maximumFractionDigits: 0 })} production days`}
          colorClass="bg-amber-50 text-amber-600"
        />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        <div className="flex min-w-max gap-1">
          {[
            { id: "overview", label: "Overview" },
            { id: "analytics", label: "Comparative Analytics" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={[
                "h-10 rounded-xl px-4 text-sm font-semibold transition-colors",
                activeTab === tab.id
                  ? "bg-brand text-white"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900",
              ].join(" ")}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "overview" ? (
        <>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_220px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search machine or tonnage"
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </div>
              <AppSelect
                value={ratingFilter}
                onChange={setRatingFilter}
                options={[
                  { value: "all", label: "All ratings" },
                  { value: "World-Class", label: "World-Class" },
                  { value: "Good", label: "Good" },
                  { value: "Needs Attention", label: "Needs Attention" },
                  { value: "Critical", label: "Critical" },
                ]}
                aria-label="Rating filter"
              />
            </div>
          </div>

          {dashboard.machineWise.loading ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }, (_, index) => (
                <PanelSkeleton key={index} />
              ))}
            </div>
          ) : dashboard.machineWise.error ? (
            <PanelError message={dashboard.machineWise.error} />
          ) : filteredMachines.length === 0 ? (
            <EmptyPanel label="No machine OEE data found for this filter." />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {filteredMachines.map((machine) => (
                <MachineGaugeCard
                  key={machine.machineId ?? machine.machineName}
                  machine={machine}
                  meta={machineById.get(String(machine.machineId))}
                />
              ))}
            </div>
          )}

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
            <DashboardPanel
              title="Daily Trend"
              subtitle="OEE line with shot-volume columns."
              icon={Activity}
              loading={dashboard.dailyTrend.loading}
              error={dashboard.dailyTrend.error}
            >
              <TrendChart rows={dailyTrend} />
            </DashboardPanel>

            <DashboardPanel
              title="Top Downtime Reasons"
              subtitle="Most frequent production blockers."
              icon={AlertTriangle}
              loading={dashboard.topDowntime.loading}
              error={dashboard.topDowntime.error}
            >
              <HorizontalBarChart
                rows={topDowntime}
                emptyLabel="No downtime reasons found."
                getLabel={(row) => row.reasonName || "Unspecified"}
                getValue={(row) => row.count}
                valueLabel={(row) =>
                  `${formatOeeNumber(row.count, { maximumFractionDigits: 0 })} / ${formatOeePercent(row.percentage)}`
                }
              />
            </DashboardPanel>
          </div>
        </>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          <DashboardPanel
            title="Machine-wise Performance"
            subtitle="Shot output and average OEE by machine."
            icon={BarChart3}
            loading={dashboard.machineWise.loading}
            error={dashboard.machineWise.error}
          >
            <HorizontalBarChart
              rows={machineWise}
              emptyLabel="No machine-wise data available."
              getLabel={(row) => row.machineName || "Machine"}
              getMeta={(row) =>
                `${formatOeeNumber(row.totalShot, { maximumFractionDigits: 0 })} shots / ${formatOeeNumber(row.totalTarget)} target`
              }
              getValue={(row) => row.averageOeePercentage}
              valueLabel={(row) => formatOeePercent(row.averageOeePercentage)}
            />
          </DashboardPanel>

          <DashboardPanel
            title="Mould-wise Performance"
            subtitle="Target attainment and OEE by mould."
            icon={Trophy}
            loading={dashboard.mouldWise.loading}
            error={dashboard.mouldWise.error}
          >
            <HorizontalBarChart
              rows={mouldWise}
              emptyLabel="No mould-wise data available."
              getLabel={(row) => row.mouldName || "Mould"}
              getMeta={(row) =>
                `${formatOeeNumber(row.totalShot, { maximumFractionDigits: 0 })} shots / ${formatOeeNumber(row.totalTarget)} target`
              }
              getValue={(row) => row.averageOeePercentage}
              valueLabel={(row) => formatOeePercent(row.averageOeePercentage)}
            />
          </DashboardPanel>
        </div>
      )}
    </section>
  );
};

export default OeeDashboardPage;
