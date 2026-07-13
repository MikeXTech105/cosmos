import { BarChart3, FileSearch, RefreshCw, TrendingUp } from "lucide-react";

import AppButton from "../../components/common/AppButton";
import {
  formatCell,
  getReportValue,
  toReportNumber,
} from "../../utils/reportFormat";

const getSummaryObject = (data) => {
  if (Array.isArray(data)) {
    return data[0] ?? {};
  }

  return data && typeof data === "object" ? data : {};
};

const ReportSummary = ({ data, error, isLoading, onRetry, report }) => {
  const summary = getSummaryObject(data);
  const kpis = report.kpis ?? [];
  const values = kpis.map((kpi) => toReportNumber(getReportValue(summary, kpi.key, 0)) ?? 0);
  const maxValue = Math.max(...values.map((value) => Math.abs(value)), 1);

  if (!isLoading && error) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-light text-brand">
          <FileSearch className="h-6 w-6" />
        </div>
        <h3 className="mt-4 text-base font-semibold text-slate-900">
          Unable to load report
        </h3>
        <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">{error}</p>
        <AppButton variant="secondary" className="mt-5 h-10" onClick={onRetry}>
          <RefreshCw className="h-4 w-4" />
          Retry
        </AppButton>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading
          ? Array.from({ length: Math.max(4, kpis.length) }, (_, index) => (
              <div
                key={index}
                className="h-28 animate-pulse rounded-xl border border-slate-200 bg-white shadow-sm"
              />
            ))
          : kpis.map((kpi) => (
              <div
                key={kpi.key}
                className="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-light text-brand">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
                      {kpi.label}
                    </p>
                    <p className="mt-0.5 truncate text-xl font-bold text-slate-900">
                      {formatCell(getReportValue(summary, kpi.key), kpi)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
      </div>

      {!isLoading && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-light text-brand">
              <BarChart3 className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                KPI Distribution
              </h2>
              <p className="text-xs text-slate-500">
                Relative scale based on the current report response.
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {kpis.map((kpi, index) => {
              const value = values[index];
              const width = `${Math.max(4, (Math.abs(value) / maxValue) * 100)}%`;

              return (
                <div
                  key={kpi.key}
                  className="grid gap-2 md:grid-cols-[180px_minmax(0,1fr)_140px] md:items-center"
                >
                  <p className="truncate text-sm font-medium text-slate-600">
                    {kpi.label}
                  </p>
                  <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-brand" style={{ width }} />
                  </div>
                  <p className="text-right text-sm font-semibold tabular-nums text-slate-900">
                    {formatCell(getReportValue(summary, kpi.key), kpi)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportSummary;
