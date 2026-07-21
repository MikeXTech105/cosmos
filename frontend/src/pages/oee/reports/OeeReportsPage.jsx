import {
  AlertTriangle,
  BarChart3,
  Download,
  FileSpreadsheet,
  Gauge,
  RefreshCw,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";

import AppButton from "../../../components/common/AppButton";
import AppInput from "../../../components/common/AppInput";
import AppSelect from "../../../components/common/AppSelect";
import PageHeader from "../../../components/common/PageHeader";
import { oeeDowntimeReasonService } from "../../../services/oee/oeeDowntimeReasonService";
import { oeeMachineService } from "../../../services/oee/oeeMachineService";
import { oeeMouldService } from "../../../services/oee/oeeMouldService";
import { oeeReportService } from "../../../services/oee/oeeReportService";
import {
  fetchOeeDailyReport,
  fetchOeeDowntimeReport,
  fetchOeeMachinePerformanceReport,
  fetchOeeMouldPerformanceReport,
  setOeeReportFilters,
} from "../../../store/slices/oee/oeeReportSlice";
import {
  buildOeeReportParams,
  formatOeeDate,
  formatOeeNumber,
  formatOeePercent,
  getOeeActionError,
  getOeeRecordId,
  OEE_HORIZON_OPTIONS,
} from "../oeeHelpers";
import useOeeCapabilities from "../useOeeCapabilities";

const tabs = [
  { id: "daily", label: "Daily", icon: FileSpreadsheet },
  { id: "machinePerformance", label: "Machine Performance", icon: Gauge },
  { id: "mouldPerformance", label: "Mould Performance", icon: BarChart3 },
  { id: "downtime", label: "Downtime", icon: AlertTriangle },
];

const getItems = (response) => {
  if (Array.isArray(response?.data?.items)) {
    return response.data.items;
  }

  if (Array.isArray(response?.data)) {
    return response.data;
  }

  return [];
};

const toOptions = (items, getLabel) => {
  return items.map((item) => ({
    value: getOeeRecordId(item),
    label: getLabel(item),
  }));
};

const getReportRows = (reports, activeTab) => {
  if (activeTab === "daily") {
    return reports.daily;
  }

  if (activeTab === "machinePerformance") {
    return reports.machinePerformance;
  }

  if (activeTab === "mouldPerformance") {
    return reports.mouldPerformance;
  }

  return reports.downtime;
};

const getReportColumns = (activeTab) => {
  if (activeTab === "daily") {
    return [
      {
        key: "productionDate",
        label: "Date",
        render: (row) => formatOeeDate(row.productionDate),
      },
      {
        key: "machineName",
        label: "Machine",
        render: (row) =>
          [row.machineCode, row.machineName].filter(Boolean).join(" - ") || "-",
      },
      { key: "mouldName", label: "Mould" },
      { key: "machineOnTime", label: "On-Time" },
      {
        key: "shotCount",
        label: "Shots",
        render: (row) =>
          formatOeeNumber(row.shotCount, { maximumFractionDigits: 0 }),
      },
      {
        key: "calculatedTargetShot",
        label: "Target",
        render: (row) => formatOeeNumber(row.calculatedTargetShot),
      },
      {
        key: "calculatedOeePercentage",
        label: "OEE",
        render: (row) => formatOeePercent(row.calculatedOeePercentage),
      },
      { key: "downtimeReasonName", label: "Downtime" },
      { key: "remarks", label: "Remarks" },
    ];
  }

  if (activeTab === "downtime") {
    return [
      { key: "reasonName", label: "Reason" },
      {
        key: "count",
        label: "Count",
        render: (row) =>
          formatOeeNumber(row.count, { maximumFractionDigits: 0 }),
      },
      {
        key: "percentage",
        label: "Share",
        render: (row) => formatOeePercent(row.percentage),
      },
    ];
  }

  const nameKey =
    activeTab === "machinePerformance" ? "machineName" : "mouldName";

  return [
    {
      key: nameKey,
      label: activeTab === "machinePerformance" ? "Machine" : "Mould",
    },
    {
      key: "totalShot",
      label: "Shots",
      render: (row) =>
        formatOeeNumber(row.totalShot, { maximumFractionDigits: 0 }),
    },
    {
      key: "totalTarget",
      label: "Target",
      render: (row) => formatOeeNumber(row.totalTarget),
    },
    {
      key: "averageOeePercentage",
      label: "Avg OEE",
      render: (row) => formatOeePercent(row.averageOeePercentage),
    },
  ];
};

const ReportTable = ({ activeTab, rows }) => {
  const columns = getReportColumns(activeTab);

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center text-sm text-slate-500 shadow-sm">
        No report data available for the selected filters.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-semibold">#</th>
              {columns.map((column) => (
                <th key={column.key} className="px-4 py-3 font-semibold">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index} className="border-t border-slate-100">
                <td className="border-b border-slate-100 px-4 py-3.5 text-xs font-semibold tabular-nums text-slate-400">
                  {index + 1}
                </td>
                {columns.map((column) => (
                  <td key={column.key} className="px-4 py-3 text-slate-700">
                    {column.render ? column.render(row) : row[column.key] || "-"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const ReportBarChart = ({ activeTab, rows }) => {
  const chartRows = rows.slice(0, 8);
  const valueGetter =
    activeTab === "downtime"
      ? (row) => Number(row.count) || 0
      : activeTab === "daily"
        ? (row) => Number(row.calculatedOeePercentage) || 0
        : (row) => Number(row.averageOeePercentage) || 0;
  const labelGetter =
    activeTab === "downtime"
      ? (row) => row.reasonName || "Reason"
      : activeTab === "daily"
        ? (row) => formatOeeDate(row.productionDate)
        : activeTab === "machinePerformance"
          ? (row) => row.machineName || "Machine"
          : (row) => row.mouldName || "Mould";
  const max = Math.max(1, ...chartRows.map(valueGetter));

  if (chartRows.length === 0) {
    return (
      <div className="rounded-xl bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
        Chart appears after report data loads.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Report Snapshot
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Top rows from the active report.
          </p>
        </div>
        <BarChart3 className="h-5 w-5 text-brand" />
      </div>
      <div className="space-y-3">
        {chartRows.map((row, index) => {
          const value = valueGetter(row);
          const width = Math.max(4, Math.round((value / max) * 100));

          return (
            <div key={`${labelGetter(row)}-${index}`}>
              <div className="mb-1 flex items-center justify-between gap-3">
                <span className="truncate text-sm font-semibold text-slate-900">
                  {labelGetter(row)}
                </span>
                <span className="shrink-0 text-xs font-semibold text-slate-500">
                  {activeTab === "downtime"
                    ? formatOeeNumber(value, { maximumFractionDigits: 0 })
                    : formatOeePercent(value)}
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-brand"
                  style={{ width: `${width}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const getDownloadFilename = (headers, fallback) => {
  const disposition = headers?.["content-disposition"];
  const match = disposition?.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)/i);

  return match ? decodeURIComponent(match[1]) : fallback;
};

const downloadBlob = ({ blob, filename }) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

const OeeReportsPage = () => {
  const dispatch = useDispatch();
  const reports = useSelector((state) => state.oeeReports);
  const capabilities = useOeeCapabilities({
    actions: ["view", "export"],
    label: "OEE Reports",
    resource: ["oeeReports", "reports"],
    route: "/oee/reports",
  });
  const [activeTab, setActiveTab] = useState("daily");
  const [exporting, setExporting] = useState(false);
  const [lookups, setLookups] = useState({
    machines: [],
    moulds: [],
    reasons: [],
  });

  const params = useMemo(
    () => buildOeeReportParams(reports.filters),
    [reports.filters],
  );
  const rows = getReportRows(reports, activeTab);

  const loadLookups = useCallback(async () => {
    try {
      const [machines, moulds, reasons] = await Promise.all([
        oeeMachineService.getMachines({ Page: 1, PageSize: 200, IsActive: true }),
        oeeMouldService.getMoulds({ Page: 1, PageSize: 200, IsActive: true }),
        oeeDowntimeReasonService.getDowntimeReasons({
          Page: 1,
          PageSize: 200,
          IsActive: true,
        }),
      ]);

      setLookups({
        machines: getItems(machines),
        moulds: getItems(moulds),
        reasons: getItems(reasons),
      });
    } catch (error) {
      toast.error(getOeeActionError(error, "Unable to load report filters."));
    }
  }, []);

  const runReport = useCallback(async () => {
    try {
      if (activeTab === "daily") {
        await dispatch(fetchOeeDailyReport(params)).unwrap();
      } else if (activeTab === "machinePerformance") {
        await dispatch(fetchOeeMachinePerformanceReport(params)).unwrap();
      } else if (activeTab === "mouldPerformance") {
        await dispatch(fetchOeeMouldPerformanceReport(params)).unwrap();
      } else {
        await dispatch(fetchOeeDowntimeReport(params)).unwrap();
      }
    } catch (error) {
      toast.error(getOeeActionError(error, "Unable to load OEE report."));
    }
  }, [activeTab, dispatch, params]);

  useEffect(() => {
    void Promise.resolve().then(loadLookups);
  }, [loadLookups]);

  useEffect(() => {
    void Promise.resolve().then(runReport);
  }, [runReport]);

  const machineOptions = useMemo(
    () => [
      { value: "", label: "All machines" },
      ...toOptions(
        lookups.machines,
        (machine) =>
          [machine.machineCode, machine.machineName].filter(Boolean).join(" - "),
      ),
    ],
    [lookups.machines],
  );
  const mouldOptions = useMemo(
    () => [
      { value: "", label: "All moulds" },
      ...toOptions(lookups.moulds, (mould) => mould.mouldName ?? "-"),
    ],
    [lookups.moulds],
  );
  const reasonOptions = useMemo(
    () => [
      { value: "", label: "All reasons" },
      ...toOptions(lookups.reasons, (reason) => reason.reasonName ?? "-"),
    ],
    [lookups.reasons],
  );

  const exportExcel = async () => {
    if (!capabilities.canExport || exporting) {
      return;
    }

    setExporting(true);

    try {
      const response = await oeeReportService.exportExcel(params);
      const range =
        reports.filters.mode === "custom"
          ? `${reports.filters.FromDate || "from"}-${reports.filters.ToDate || "to"}`
          : `last-${reports.filters.LastDays}-days`;
      const filename = getDownloadFilename(
        response.headers,
        `OEE-Report-${range}.xlsx`,
      );

      downloadBlob({ blob: response.data, filename });
      toast.success("OEE report exported successfully");
    } catch (error) {
      toast.error(getOeeActionError(error, "Unable to export OEE report."));
    } finally {
      setExporting(false);
    }
  };

  return (
    <section className="min-w-0 space-y-5">
      <PageHeader
        badge={
          <>
            <FileSpreadsheet className="h-3.5 w-3.5" />
            OEE / Reports
          </>
        }
        title="OEE Reports"
        description="Review daily production, machine performance, mould performance, and downtime analysis."
        actions={
          <>
            <AppButton
              variant="secondary"
              className="h-10"
              disabled={reports.loading}
              onClick={runReport}
            >
              <RefreshCw
                className={`h-4 w-4 ${reports.loading ? "animate-spin" : ""}`}
              />
              Run Report
            </AppButton>
            {capabilities.canExport && (
              <AppButton
                className="h-10"
                isLoading={exporting}
                loadingText="Exporting…"
                onClick={exportExcel}
              >
                <Download className="h-4 w-4" />
                Export to Excel
              </AppButton>
            )}
          </>
        }
      />

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        <div className="flex min-w-max gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={[
                  "inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors",
                  activeTab === tab.id
                    ? "bg-brand text-white"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900",
                ].join(" ")}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
          <AppSelect
            value={reports.filters.mode}
            onChange={(value) => dispatch(setOeeReportFilters({ mode: value }))}
            options={[
              { value: "lastDays", label: "Last N days" },
              { value: "custom", label: "Custom range" },
            ]}
            aria-label="Range mode"
          />
          {reports.filters.mode === "custom" ? (
            <>
              <AppInput
                type="date"
                value={reports.filters.FromDate}
                onChange={(event) =>
                  dispatch(setOeeReportFilters({ FromDate: event.target.value }))
                }
                aria-label="From date"
                className="h-10"
              />
              <AppInput
                type="date"
                value={reports.filters.ToDate}
                onChange={(event) =>
                  dispatch(setOeeReportFilters({ ToDate: event.target.value }))
                }
                aria-label="To date"
                className="h-10"
              />
            </>
          ) : (
            <>
              <AppSelect
                value={reports.filters.LastDays}
                onChange={(value) =>
                  dispatch(setOeeReportFilters({ LastDays: Number(value) }))
                }
                options={OEE_HORIZON_OPTIONS}
                aria-label="Last days"
              />
              <div />
            </>
          )}
          <AppSelect
            value={reports.filters.MachineId}
            onChange={(value) =>
              dispatch(setOeeReportFilters({ MachineId: value }))
            }
            options={machineOptions}
            aria-label="Machine filter"
          />
          <AppSelect
            value={reports.filters.MouldId}
            onChange={(value) =>
              dispatch(setOeeReportFilters({ MouldId: value }))
            }
            options={mouldOptions}
            aria-label="Mould filter"
          />
          <AppSelect
            value={reports.filters.DowntimeReasonId}
            onChange={(value) =>
              dispatch(setOeeReportFilters({ DowntimeReasonId: value }))
            }
            options={reasonOptions}
            aria-label="Downtime reason filter"
          />
          <AppButton
            variant="secondary"
            className="h-10 rounded-lg px-3"
            onClick={() =>
              dispatch(
                setOeeReportFilters({
                  FromDate: "",
                  ToDate: "",
                  MachineId: "",
                  MouldId: "",
                  DowntimeReasonId: "",
                  LastDays: 30,
                  mode: "lastDays",
                }),
              )
            }
          >
            Clear
          </AppButton>
        </div>
      </div>

      {reports.error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-inset ring-red-100">
          {reports.error}
        </div>
      )}

      {reports.loading ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)]">
          <div className="h-72 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-72 animate-pulse rounded-2xl bg-slate-100" />
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(320px,0.65fr)_minmax(0,1.35fr)]">
          <ReportBarChart activeTab={activeTab} rows={rows} />
          <ReportTable activeTab={activeTab} rows={rows} />
        </div>
      )}
    </section>
  );
};

export default OeeReportsPage;
