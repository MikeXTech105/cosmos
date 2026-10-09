import {
  Boxes,
  CheckCircle2,
  Download,
  RefreshCw,
  Warehouse,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";

import AppButton from "../../../components/common/AppButton";
import AppDateRangeFilter from "../../../components/common/AppDateRangeFilter";
import AppSelect from "../../../components/common/AppSelect";
import DataTableShell, {
  DATA_TABLE_HEADER_CLASS,
} from "../../../components/common/DataTableShell";
import PageHeader from "../../../components/common/PageHeader";
import StatCards from "../../../components/common/StatCards";
import { DISPATCH_RUN_STATUS } from "../../../constants/dispatchEnums";
import { dispatchReportService } from "../../../services/dispatch";
import {
  downloadResponseBlob,
  getDownloadErrorMessage,
} from "../../../utils/fileDownload";
import {
  SupplyChainFilterBar,
  SupplyChainInlineError,
} from "../../supplyChain/SupplyChainShared";
import useSupplyChainChannels from "../../supplyChain/useSupplyChainChannels";
import {
  DisabledDispatchAction,
  DispatchRunStatusPill,
} from "../DispatchShared";
import {
  formatDispatchDate,
  formatDispatchNumber,
} from "../dispatchDisplay";
import useDispatchCapabilities from "../useDispatchCapabilities";

const getDefaultPeriod = () => {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 29);
  const formatLocal = (date) => {
    const offset = date.getTimezoneOffset();
    return new Date(date.getTime() - offset * 60_000)
      .toISOString()
      .slice(0, 10);
  };
  return { FromDate: formatLocal(from), ToDate: formatLocal(to) };
};

const QuantityTooltip = ({ active, label, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-lg">
      <p className="font-semibold text-slate-900">{label}</p>
      <p className="mt-2 text-slate-600">
        Recommended: {formatDispatchNumber(payload[0]?.payload?.recommended, "0")}
      </p>
      <p className="text-slate-600">
        Allocated: {formatDispatchNumber(payload[0]?.payload?.allocated, "0")}
      </p>
    </div>
  );
};

const DispatchDashboardPage = () => {
  const { channels, error: channelError } = useSupplyChainChannels();
  const [filters, setFilters] = useState(() => ({
    ChannelId: "",
    ...getDefaultPeriod(),
  }));
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  const capabilities = useDispatchCapabilities({
    label: "DispatchPlanning.Reports",
    route: "/dispatch/dashboard",
  });
  const params = useMemo(
    () => ({
      ...filters,
      PageNumber: 1,
      PageSize: 200,
      Status: DISPATCH_RUN_STATUS.Finalized,
    }),
    [filters],
  );
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await dispatchReportService.list(params);
      const data = response.data ?? {};
      setRows(Array.isArray(data.items) ? data.items : []);
      setSummary(data.summary ?? null);
      setTotalCount(Number(data.totalCount) || 0);
    } catch (requestError) {
      setRows([]);
      setSummary(null);
      setTotalCount(0);
      setError(requestError);
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 200);
    return () => window.clearTimeout(timeout);
  }, [load]);

  const exportReport = async () => {
    setExporting(true);
    try {
      const response = await dispatchReportService.export({
        ...params,
        PageSize: 500,
      });
      const filename = await downloadResponseBlob(
        response,
        "finalized-dispatch-recommendations.csv",
      );
      toast.success(`${filename} downloaded.`);
    } catch (requestError) {
      toast.error(
        await getDownloadErrorMessage(
          requestError,
          "Unable to export finalized recommendations.",
        ),
      );
    } finally {
      setExporting(false);
    }
  };

  const computed = useMemo(() => {
    const runs = new Set();
    const warehouses = new Set();
    let recommended = 0;
    let allocated = 0;
    rows.forEach((row) => {
      if (row.runNumber) runs.add(row.runNumber);
      if (row.warehouseCode) warehouses.add(row.warehouseCode);
      recommended += Number(row.recommendedQuantity) || 0;
      allocated += Number(row.allocatedQuantity) || 0;
    });
    return { allocated, recommended, runs: runs.size, warehouses: warehouses.size };
  }, [rows]);
  const chartData = useMemo(() => {
    const map = new Map();
    rows.forEach((row) => {
      const key = row.warehouseCode || row.warehouseName || "Unknown";
      const current = map.get(key) ?? {
        allocated: 0,
        name: key,
        recommended: 0,
      };
      current.recommended += Number(row.recommendedQuantity) || 0;
      current.allocated += Number(row.allocatedQuantity) || 0;
      map.set(key, current);
    });
    return [...map.values()].sort(
      (left, right) => right.recommended - left.recommended,
    );
  }, [rows]);
  const topRows = useMemo(
    () =>
      [...rows]
        .sort(
          (left, right) =>
            (Number(right.recommendedQuantity) || 0) -
            (Number(left.recommendedQuantity) || 0),
        )
        .slice(0, 10),
    [rows],
  );
  const fallbackHint = summary ? undefined : totalCount > rows.length
    ? `Calculated from the first ${rows.length} rows`
    : "Calculated from matching rows";
  const activeFilterCount = [
    Boolean(filters.ChannelId),
    Boolean(filters.FromDate),
    Boolean(filters.ToDate),
  ].filter(Boolean).length;

  return (
    <section className="min-w-0 space-y-5">
      <PageHeader
        badge="Dispatch Planning"
        description="Monitor finalized recommendation outcomes by channel, period and warehouse."
        title="Dispatch dashboard"
        actions={
          <>
            {loading ? (
              <DisabledDispatchAction reason="Wait for the current refresh to finish.">
                <AppButton disabled variant="secondary">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Refresh
                </AppButton>
              </DisabledDispatchAction>
            ) : (
              <AppButton variant="secondary" onClick={() => void load()}>
                <RefreshCw className="h-4 w-4" />
                Refresh
              </AppButton>
            )}
            {capabilities.canExport ? (
              <AppButton
                isLoading={exporting}
                loadingText="Exporting…"
                variant="secondary"
                onClick={exportReport}
              >
                <Download className="h-4 w-4" />
                Export
              </AppButton>
            ) : null}
          </>
        }
      />

      <StatCards
        loading={loading}
        cards={[
          {
            hint: summary?.finalizedRuns == null ? fallbackHint : undefined,
            icon: CheckCircle2,
            label: "Finalized runs",
            value: summary?.finalizedRuns ?? computed.runs,
          },
          {
            hint: summary?.totalRecommendedQuantity == null ? fallbackHint : undefined,
            icon: Boxes,
            label: "Total recommended qty",
            value: summary?.totalRecommendedQuantity ?? computed.recommended,
            formatValue: formatDispatchNumber,
          },
          {
            hint: summary?.totalAllocatedQuantity == null ? fallbackHint : undefined,
            icon: Boxes,
            label: "Total allocated qty",
            value: summary?.totalAllocatedQuantity ?? computed.allocated,
            formatValue: formatDispatchNumber,
          },
          {
            hint: summary?.warehouseCount == null ? fallbackHint : undefined,
            icon: Warehouse,
            label: "Warehouses covered",
            value: summary?.warehouseCount ?? computed.warehouses,
          },
        ]}
      />

      <SupplyChainFilterBar
        activeFilterCount={activeFilterCount}
        onClear={() =>
          setFilters({
            ChannelId: "",
            FromDate: "",
            ToDate: "",
          })
        }
      >
        <AppSelect
          className="w-56"
          label="Channel"
          options={[
            { label: "All channels", value: "" },
            ...channels.map((channel) => ({
              label: `${channel.code} — ${channel.name}`,
              value: channel.id,
            })),
          ]}
          value={filters.ChannelId}
          onChange={(value) =>
            setFilters((current) => ({ ...current, ChannelId: value }))
          }
        />
<AppDateRangeFilter
            className="w-full sm:col-span-2 sm:min-w-[260px]"
            fromDate={filters.FromDate}
            toDate={filters.ToDate}
            allowLifetime={false}
            onChange={({ fromDate, toDate }) => setFilters((current) => ({ ...current, FromDate: fromDate, ToDate: toDate }))}
          />
      </SupplyChainFilterBar>

      <SupplyChainInlineError message={channelError} title="Channels unavailable" />
      <SupplyChainInlineError
        message={error}
        title="Dispatch dashboard unavailable"
        onRetry={load}
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,1fr)]">
        <div className="min-w-0 space-y-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Largest finalized recommendations
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Top 10 matching lines by recommended quantity.
            </p>
          </div>
          <DataTableShell
            columnCount={8}
            emptyHint="Finalize a planning run or broaden the date filters."
            emptyTitle={
              !loading && topRows.length === 0
                ? "No finalized recommendations in this period"
                : undefined
            }
            head={
              <>
                <th className={DATA_TABLE_HEADER_CLASS}>#</th>
                <th className={DATA_TABLE_HEADER_CLASS}>Run</th>
                <th className={DATA_TABLE_HEADER_CLASS}>Warehouse</th>
                <th className={DATA_TABLE_HEADER_CLASS}>Item</th>
                <th className={`${DATA_TABLE_HEADER_CLASS} text-right`}>Recommended</th>
                <th className={`${DATA_TABLE_HEADER_CLASS} text-right`}>Allocated</th>
                <th className={`${DATA_TABLE_HEADER_CLASS} text-right`}>Boxes</th>
                <th className={DATA_TABLE_HEADER_CLASS}>Status</th>
              </>
            }
            loading={loading}
            minWidth="min-w-[980px]"
          >
            {topRows.map((row, index) => (
              <tr
                key={row.id ?? `${row.runNumber}-${row.warehouseCode}-${row.channelSku}-${index}`}
              >
                <td className="text-xs font-semibold tabular-nums text-slate-400">
                  {index + 1}
                </td>
                <td>
                  <p className="font-medium text-slate-900">{row.runNumber}</p>
                  <p className="text-xs text-slate-500">{formatDispatchDate(row.planningDate)}</p>
                </td>
                <td>{row.warehouseCode}</td>
                <td>
                  <p className="font-medium">{row.itemName}</p>
                  <p className="text-xs text-slate-500">{row.itemCode} · {row.channelSku}</p>
                </td>
                <td className="text-right tabular-nums">{formatDispatchNumber(row.recommendedQuantity, "0")}</td>
                <td className="text-right tabular-nums">{formatDispatchNumber(row.allocatedQuantity, "0")}</td>
                <td className="text-right tabular-nums">{formatDispatchNumber(row.boxCount, "0")}</td>
                <td><DispatchRunStatusPill status={row.runStatus} /></td>
              </tr>
            ))}
          </DataTableShell>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">
            Recommended vs allocated
          </h2>
          <p className="mt-1 text-xs text-slate-500">By warehouse.</p>
          {loading ? (
            <div className="mt-4 h-72 animate-pulse rounded-lg bg-slate-100" />
          ) : chartData.length === 0 ? (
            <div className="grid h-72 place-items-center text-sm text-slate-500">
              No warehouse totals in this period.
            </div>
          ) : (
            <div className="mt-4 h-72">
              <ResponsiveContainer height="100%" width="100%">
                <BarChart
                  data={chartData}
                  margin={{ bottom: 0, left: 0, right: 8, top: 8 }}
                >
                  <CartesianGrid
                    stroke="var(--color-slate-200)"
                    strokeDasharray="3 3"
                    vertical={false}
                  />
                  <XAxis
                    axisLine={false}
                    dataKey="name"
                    tick={{ fill: "var(--color-slate-500)", fontSize: 11 }}
                    tickLine={false}
                  />
                  <YAxis
                    axisLine={false}
                    tick={{ fill: "var(--color-slate-500)", fontSize: 11 }}
                    tickFormatter={(value) =>
                      Number(value).toLocaleString("en-IN", {
                        notation: "compact",
                      })
                    }
                    tickLine={false}
                    width={56}
                  />
                  <Tooltip content={<QuantityTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar
                    dataKey="recommended"
                    fill="var(--color-brand)"
                    name="Recommended"
                    radius={[5, 5, 0, 0]}
                  />
                  <Bar
                    dataKey="allocated"
                    fill="var(--color-slate-400)"
                    name="Allocated"
                    radius={[5, 5, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-slate-500">
        Dashboard results come from finalized recommendation reports.
        Finalization is an immutable recommendation only; it does not move
        stock.
      </p>
    </section>
  );
};

export default DispatchDashboardPage;
