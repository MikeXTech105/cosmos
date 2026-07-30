import { Download, FileSearch, RefreshCw, TrendingUp } from "lucide-react";
import { createElement, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import AppButton from "../../components/common/AppButton";
import PageHeader from "../../components/common/PageHeader";
import { getIconComponent } from "../../config/iconMap";
import useLatestRequest from "../../hooks/useLatestRequest";
import {
  exportReport,
  loadReportFallbackRows,
} from "../../services/reports/reportExportService";
import { downloadCsv } from "../../utils/csv";
import { getApiStatus } from "../../utils/apiError";
import {
  downloadResponseBlob,
  getDownloadErrorMessage,
} from "../../utils/fileDownload";
import { canPerformAction } from "../../utils/permissionResolver";
import {
  runReportThunk,
  setReportExporting,
} from "../../store/slices/reports/reportsSlice";
import {
  formatCell,
  getReportValue,
  toReportNumber,
} from "../../utils/reportFormat";
import {
  buildReportParams,
  buildReportSearchParams,
  getDefaultReportFilters,
  getReportFiltersFromSearchParams,
} from "./filters/filterRegistry";
import ReportFilterBar from "./filters/ReportFilterBar";
import { getReportGroup } from "./reportRegistry";
import ReportSummary from "./ReportSummary";
import ReportTable from "./ReportTable";

const toRows = (data) => {
  if (Array.isArray(data)) {
    return data;
  }

  return data ? [data] : [];
};

const getExportColumns = (report) => {
  if (report.kind === "summary") {
    return report.kpis ?? [];
  }

  return report.columns ?? [];
};

const formatGeneratedAt = (value) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const toPascalCaseKey = (key) => {
  const text = String(key ?? "");

  return text ? `${text.charAt(0).toUpperCase()}${text.slice(1)}` : text;
};

const getRequiredParamValue = (params, paramName) => {
  if (!paramName) {
    return null;
  }

  return params[paramName] ?? params[toPascalCaseKey(paramName)] ?? null;
};

const hasRequiredParamValue = (value) => {
  return value !== null && value !== undefined && value !== "" && value !== "all";
};

const ReportKpiChips = ({ kpis = [], summary }) => {
  const visibleKpis = kpis
    .map((kpi) => {
      const value = getReportValue(summary, kpi.key, undefined);

      if (value === undefined || value === null || value === "") {
        return null;
      }

      if (
        ["currency", "number", "percent", "qty", "quantity"].includes(kpi.format) &&
        toReportNumber(value) === null
      ) {
        return null;
      }

      return {
        ...kpi,
        value,
      };
    })
    .filter(Boolean);

  if (visibleKpis.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {visibleKpis.map((kpi) => (
        <div
          key={String(kpi.key)}
          className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
                {kpi.label}
              </p>
              <p className="mt-0.5 truncate text-lg font-bold text-slate-900">
                {formatCell(kpi.value, kpi)}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const RequiredParamPrompt = ({ report }) => {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center px-6 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-light text-brand">
        <FileSearch className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-slate-900">
        {report.requiredPromptTitle ?? "Select a required filter"}
      </h3>
      <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">
        {report.requiredPrompt ?? "Choose the required filter to run this report."}
      </p>
    </div>
  );
};

const DynamicIcon = ({ className, name }) => {
  return createElement(getIconComponent(name), { className });
};

const ReportView = ({ report }) => {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(
    () => getReportFiltersFromSearchParams(report, searchParams),
    [report, searchParams],
  );
  const requestRef = useRef(null);
  const [exportProgress, setExportProgress] = useState("");
  const {
    beginAbortableRequest: beginExportRequest,
    isLatestRequest: isLatestExportRequest,
  } = useLatestRequest();
  const reportState = useSelector(
    (state) => state.reports.byReport[report.id],
  );
  const exporting = useSelector((state) => state.reports.exporting[report.id]);
  const auth = useSelector((state) => state.auth);
  const data = reportState?.data ?? null;
  const group = getReportGroup(report.group);
  const params = useMemo(
    () => buildReportParams(report, filters),
    [filters, report],
  );
  const requiredParamValue = getRequiredParamValue(params, report.requiresParam);
  const isMissingRequiredParam =
    Boolean(report.requiresParam) && !hasRequiredParamValue(requiredParamValue);
  const rows = isMissingRequiredParam ? [] : toRows(data);
  const canExport = useMemo(
    () =>
      canPerformAction({
        action: "export",
        pages: auth.pages,
        roles: auth.roles,
        target: {
          label: report.permission,
          route: report.permissionRoute ?? report.route,
        },
        user: auth.user,
      }),
    [
      auth.pages,
      auth.roles,
      auth.user,
      report.permission,
      report.permissionRoute,
      report.route,
    ],
  );

  useEffect(() => {
    if (isMissingRequiredParam) {
      requestRef.current?.abort?.();
      requestRef.current = null;
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      requestRef.current?.abort?.();

      const request = dispatch(
        runReportThunk({
          params,
          reportId: report.id,
        }),
      );

      requestRef.current = request;
      request.finally(() => {
        if (requestRef.current === request) {
          requestRef.current = null;
        }
      });
    }, 350);

    return () => {
      window.clearTimeout(timeoutId);
      requestRef.current?.abort?.();
      requestRef.current = null;
    };
  }, [dispatch, isMissingRequiredParam, params, report.id]);

  useEffect(() => {
    return () => {
      dispatch(setReportExporting({ reportId: report.id, value: false }));
    };
  }, [dispatch, report.id]);

  const updateFilters = (patch) => {
    const next = { ...filters, ...patch };

    setSearchParams(buildReportSearchParams(report, next), {
      replace: true,
    });
  };

  const handleClear = () => {
    const next = getDefaultReportFilters(report);

    setSearchParams(buildReportSearchParams(report, next), { replace: true });
  };

  const handleRetry = () => {
    if (isMissingRequiredParam) {
      return;
    }

    requestRef.current?.abort?.();
    requestRef.current = dispatch(
      runReportThunk({
        params,
        reportId: report.id,
      }),
    );
  };

  const handleExport = async () => {
    if (!canExport || rows.length === 0 || exporting) {
      return;
    }

    const columns = getExportColumns(report);
    const from = filters.FromDate || "from";
    const to = filters.ToDate || "to";
    const filename = `${report.id}_${from}_${to}.csv`;
    const { requestId, signal } = beginExportRequest();

    dispatch(setReportExporting({ reportId: report.id, value: true }));
    setExportProgress("Exporting…");

    try {
      const response = await exportReport(
        { filters: params, reportId: report.id },
        { signal },
      );

      if (!isLatestExportRequest(requestId)) return;
      await downloadResponseBlob(response, filename);
      toast.success("Report export downloaded");
    } catch (error) {
      if (signal.aborted || !isLatestExportRequest(requestId)) return;

      if (![404, 405, 501].includes(getApiStatus(error))) {
        toast.error(await getDownloadErrorMessage(error, "Unable to export report."));
        return;
      }

      try {
        const fallbackRows = await loadReportFallbackRows({
          currentRows: rows,
          onProgress: ({ completed, total }) => {
            if (isLatestExportRequest(requestId)) {
              setExportProgress(
                `Exporting ${completed.toLocaleString()} of ${total.toLocaleString()}…`,
              );
            }
          },
          params,
          report,
          signal,
        });
        const exportColumns = columns.map((column) => ({
          ...column,
          getValue: (row) =>
            formatCell(getReportValue(row, column.key), column),
        }));

        if (!isLatestExportRequest(requestId)) return;
        await downloadCsv({ columns: exportColumns, filename, rows: fallbackRows });
        toast.success(`Exported ${fallbackRows.length.toLocaleString()} report rows`);
      } catch (fallbackError) {
        if (!signal.aborted && isLatestExportRequest(requestId)) {
          toast.error(await getDownloadErrorMessage(fallbackError, "Unable to export report."));
        }
      }
    } finally {
      if (isLatestExportRequest(requestId)) {
        setExportProgress("");
        dispatch(setReportExporting({ reportId: report.id, value: false }));
      }
    }
  };

  const isLoading =
    !isMissingRequiredParam &&
    (reportState?.loading || reportState?.status === "loading");
  const error = reportState?.error;
  const generatedAtText = formatGeneratedAt(reportState?.generatedAtUtc);
  const headerDescription = generatedAtText && !isMissingRequiredParam
    ? `${report.description} Generated ${generatedAtText}.`
    : report.description;
  const headerTitle = isMissingRequiredParam
    ? report.title
    : reportState?.reportTitle ?? report.title;

  return (
    <section className="min-w-0 space-y-5">
      <PageHeader
        badge={
          <>
            <DynamicIcon className="h-3.5 w-3.5" name={report.icon} />
            Reports / {group?.label ?? report.group} / {report.title}
          </>
        }
        title={headerTitle}
        description={headerDescription}
        actions={
          <>
            <AppButton
              variant="secondary"
              className="h-10"
              disabled={isLoading || isMissingRequiredParam}
              onClick={handleRetry}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </AppButton>
            {report.exportable && canExport && (
              <AppButton
                className="h-10"
                disabled={isLoading || rows.length === 0 || exporting}
                isLoading={exporting}
                loadingText={exportProgress || "Exporting…"}
                onClick={handleExport}
              >
                <Download className="h-4 w-4" />
                Export
              </AppButton>
            )}
          </>
        }
      />

      <ReportFilterBar
        disabled={isLoading}
        filters={filters}
        report={report}
        resultCount={rows.length}
        onChange={updateFilters}
        onClear={handleClear}
      />

      <ReportKpiChips
        kpis={report.summaryKpis}
        summary={isMissingRequiredParam ? null : reportState?.summary}
      />

      {report.kind === "summary" ? (
        <ReportSummary
          data={data}
          error={error}
          isLoading={isLoading}
          report={report}
          onRetry={handleRetry}
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {isMissingRequiredParam ? (
            <RequiredParamPrompt report={report} />
          ) : (
            <ReportTable
              error={error}
              filters={filters}
              isLoading={isLoading}
              meta={reportState?.pagination ?? reportState?.meta}
              report={report}
              rows={rows}
              onPageChange={(PageNumber) => updateFilters({ PageNumber })}
              onPageSizeChange={(PageSize) =>
                updateFilters({ PageNumber: 1, PageSize })
              }
              onRetry={handleRetry}
              onSortChange={(sortPatch) =>
                updateFilters({ ...sortPatch, PageNumber: 1 })
              }
            />
          )}
        </div>
      )}
    </section>
  );
};

export default ReportView;
