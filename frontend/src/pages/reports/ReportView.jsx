import { Download, RefreshCw } from "lucide-react";
import { createElement, useEffect, useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";

import AppButton from "../../components/common/AppButton";
import PageHeader from "../../components/common/PageHeader";
import { getIconComponent } from "../../config/iconMap";
import {
  runReportThunk,
  setReportExporting,
} from "../../store/slices/reports/reportsSlice";
import {
  formatCell,
  getReportValue,
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

const escapeCsvValue = (value) => {
  const text = String(value ?? "");

  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const downloadCsv = ({ columns, filename, rows }) => {
  const headers = columns.map((column) => column.header ?? column.label);
  const body = rows.map((row) => {
    return columns
      .map((column) =>
        escapeCsvValue(formatCell(getReportValue(row, column.key), column)),
      )
      .join(",");
  });
  const csv = [headers.map(escapeCsvValue).join(","), ...body].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const getExportColumns = (report) => {
  if (report.kind === "summary") {
    return report.kpis ?? [];
  }

  return report.columns ?? [];
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
  const reportState = useSelector(
    (state) => state.reports.byReport[report.id],
  );
  const exporting = useSelector((state) => state.reports.exporting[report.id]);
  const data = reportState?.data ?? null;
  const rows = toRows(data);
  const group = getReportGroup(report.group);
  const params = useMemo(
    () => buildReportParams(report, filters),
    [filters, report],
  );

  useEffect(() => {
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
  }, [dispatch, params, report.id]);

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
    requestRef.current?.abort?.();
    requestRef.current = dispatch(
      runReportThunk({
        params,
        reportId: report.id,
      }),
    );
  };

  const handleExport = () => {
    if (rows.length === 0) {
      return;
    }

    const columns = getExportColumns(report);
    const from = filters.FromDate || "from";
    const to = filters.ToDate || "to";

    dispatch(setReportExporting({ reportId: report.id, value: true }));
    downloadCsv({
      columns,
      filename: `${report.id}_${from}_${to}.csv`,
      rows,
    });
    dispatch(setReportExporting({ reportId: report.id, value: false }));
  };

  const isLoading = reportState?.loading || reportState?.status === "loading";
  const error = reportState?.error;

  return (
    <section className="min-w-0 space-y-5">
      <PageHeader
        badge={
          <>
            <DynamicIcon className="h-3.5 w-3.5" name={report.icon} />
            Reports / {group?.label ?? report.group} / {report.title}
          </>
        }
        title={report.title}
        description={report.description}
        actions={
          <>
            <AppButton
              variant="secondary"
              className="h-10"
              disabled={isLoading}
              onClick={handleRetry}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </AppButton>
            {report.exportable && (
              <AppButton
                className="h-10"
                disabled={isLoading || rows.length === 0 || exporting}
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
        </div>
      )}
    </section>
  );
};

export default ReportView;
