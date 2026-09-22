import { AlertCircle, ChevronLeft, ChevronRight, Factory, RefreshCw } from "lucide-react";

import AppButton from "../../components/common/AppButton";
import AppSelect from "../../components/common/AppSelect";
import { getStatus } from "./manufacturingHelpers";

export const ManufacturingCard = ({ actions, children, description, title }) => (
  <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_12px_36px_-24px_rgba(15,23,42,0.4)]">
    {(title || description || actions) && (
      <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {title && <h2 className="text-sm font-semibold text-slate-900">{title}</h2>}
          {description && <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    )}
    {children}
  </section>
);

export const ManufacturingInlineError = ({ message, onRetry, title = "Unable to continue" }) => {
  if (!message) return null;
  return (
    <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-0.5 whitespace-pre-line text-xs leading-5">{message}</p>
      </div>
      {onRetry && (
        <AppButton className="h-9" variant="secondary" onClick={onRetry}>
          <RefreshCw className="h-4 w-4" /> Retry
        </AppButton>
      )}
    </div>
  );
};

export const ManufacturingStatusPill = ({ record, value }) => {
  const status = value ?? getStatus(record);
  const key = String(status).toLowerCase();
  const tone = key === "posted"
    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
    : key === "cancelled" || key === "canceled"
      ? "bg-red-50 text-red-700 ring-red-200"
      : "bg-amber-50 text-amber-700 ring-amber-200";
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${tone}`}>{status}</span>;
};

export const ManufacturingEmpty = ({ description, title }) => (
  <div className="flex min-h-56 flex-col items-center justify-center p-8 text-center">
    <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-light text-brand"><Factory className="h-6 w-6" /></span>
    <h3 className="mt-4 text-sm font-semibold text-slate-900">{title}</h3>
    <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">{description}</p>
  </div>
);

export const ManufacturingPagination = ({ disabled, onPageChange, onPageSizeChange, page }) => (
  <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
    <p className="text-xs text-slate-500">{page.totalCount} total records</p>
    <div className="flex items-center gap-2">
      <AppSelect className="w-24" value={page.pageSize} disabled={disabled} options={[10, 20, 50].map((value) => ({ value, label: `${value} rows` }))} onChange={onPageSizeChange} />
      <AppButton className="h-10 px-3" variant="secondary" disabled={disabled || page.pageNumber <= 1} onClick={() => onPageChange(page.pageNumber - 1)}><ChevronLeft className="h-4 w-4" /></AppButton>
      <span className="min-w-20 text-center text-xs font-medium text-slate-600">Page {page.pageNumber} / {page.totalPages}</span>
      <AppButton className="h-10 px-3" variant="secondary" disabled={disabled || page.pageNumber >= page.totalPages} onClick={() => onPageChange(page.pageNumber + 1)}><ChevronRight className="h-4 w-4" /></AppButton>
    </div>
  </div>
);
