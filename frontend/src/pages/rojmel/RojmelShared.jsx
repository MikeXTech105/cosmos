import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  FileSearch,
} from "lucide-react";

import AppButton from "../../components/common/AppButton";
import EmptyState from "../../components/common/EmptyState";
import AppSelect from "../../components/common/AppSelect";
import StatScopeBadge from "../../components/common/StatScopeBadge";
import {
  getTransactionStatusLabel,
  getTransactionTypeLabel,
  getTransactionTypeTone,
  getWalletTypeLabel,
  RojmelTransactionStatus,
} from "../../constants/rojmelEnums";
import {
  formatRojmelCurrency,
  ROJMEL_PAGE_SIZE_OPTIONS,
} from "./rojmelHelpers";
import { formatNumber } from "../../utils/format";

const TYPE_TONES = {
  adjustment: "bg-amber-50 text-amber-700 ring-amber-200",
  expense: "bg-red-50 text-red-700 ring-red-200",
  income: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  neutral: "bg-slate-50 text-slate-600 ring-slate-200",
  transfer: "bg-blue-50 text-blue-700 ring-blue-200",
};

export const RojmelTransactionTypeBadge = ({ value }) => {
  const tone = getTransactionTypeTone(value);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${TYPE_TONES[tone]}`}
    >
      {tone === "income" && <ArrowDownLeft aria-hidden="true" className="h-3 w-3" />}
      {tone === "expense" && <ArrowUpRight aria-hidden="true" className="h-3 w-3" />}
      {getTransactionTypeLabel(value)}
    </span>
  );
};

export const RojmelStatusPill = ({ value }) => {
  const isActive = Number(value) === RojmelTransactionStatus.Active;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${
        isActive
          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
          : "bg-slate-100 text-slate-500 ring-slate-200 line-through"
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-75" />
      {getTransactionStatusLabel(value)}
    </span>
  );
};

export const RojmelWalletTypeBadge = ({ value }) => (
  <span className="inline-flex rounded-full bg-brand-light px-2.5 py-1 text-[11px] font-semibold text-brand ring-1 ring-inset ring-brand/15">
    {getWalletTypeLabel(value)}
  </span>
);

export const RojmelWalletStatusPill = ({ isActive }) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${
      isActive
        ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
        : "bg-red-50 text-red-700 ring-red-200"
    }`}
  >
    <span className="h-1.5 w-1.5 rounded-full bg-current opacity-75" />
    {isActive ? "Active" : "Inactive"}
  </span>
);

export const RojmelAmount = ({ amount, showCurrency = true, type }) => {
  const tone = getTransactionTypeTone(type);
  const prefix = tone === "income" ? "+" : tone === "expense" ? "−" : "";
  const className =
    tone === "income"
      ? "text-emerald-700"
      : tone === "expense"
        ? "text-red-600"
        : tone === "adjustment"
          ? "text-amber-700"
          : "text-slate-900";

  return (
    <span className={`font-semibold tabular-nums ${className}`}>
      {prefix}
      {showCurrency
        ? formatRojmelCurrency(Math.abs(Number(amount) || 0))
        : formatNumber(Math.abs(Number(amount) || 0))}
    </span>
  );
};

export const RojmelStatCard = ({
  icon: Icon,
  label,
  loading = false,
  scope,
  tone,
  value,
}) => {
  const tones = {
    brand: "bg-brand-light text-brand",
    emerald: "bg-emerald-50 text-emerald-700",
    red: "bg-red-50 text-red-600",
    slate: "bg-slate-100 text-slate-600",
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tones[tone] ?? tones.brand}`}
        >
          <Icon aria-hidden="true" className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
            {label}
          </p>
          {loading ? (
            <div className="mt-1 h-7 w-20 animate-pulse rounded bg-slate-100" />
          ) : (
            <p className="mt-1 truncate text-2xl font-bold tabular-nums text-slate-900">
              {value}
            </p>
          )}
          <StatScopeBadge className="mt-1" scope={scope} />
        </div>
      </div>
    </div>
  );
};

export const RojmelPagination = ({
  disabled,
  itemCount,
  itemLabel,
  onPageChange,
  onPageSizeChange,
  pageNumber,
  pageSize,
  totalCount,
  totalPages,
}) => {
  const start = itemCount ? (pageNumber - 1) * pageSize + 1 : 0;
  const end = itemCount ? start + itemCount - 1 : 0;

  return (
    <div className="flex flex-col gap-3 border-t border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 lg:flex-row lg:items-center lg:justify-between">
      <p>
        Showing <strong className="text-slate-900">{start}</strong> to{" "}
        <strong className="text-slate-900">{end}</strong> of{" "}
        <strong className="text-slate-900">{totalCount}</strong> {itemLabel}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-slate-600">Rows</span>
        <AppSelect
          label="Rows per page"
          className="w-20"
          disabled={disabled}
          options={ROJMEL_PAGE_SIZE_OPTIONS}
          value={pageSize}
          onChange={(value) => onPageSizeChange(Number(value))}
        />
        <AppButton
          className="h-9 rounded-lg px-3"
          disabled={disabled || pageNumber <= 1}
          variant="secondary"
          onClick={() => onPageChange(pageNumber - 1)}
        >
          Previous
        </AppButton>
        <span className="min-w-20 text-center text-xs font-semibold">
          {pageNumber} / {Math.max(1, totalPages)}
        </span>
        <AppButton
          className="h-9 rounded-lg px-3"
          disabled={disabled || pageNumber >= Math.max(1, totalPages)}
          variant="secondary"
          onClick={() => onPageChange(pageNumber + 1)}
        >
          Next
        </AppButton>
      </div>
    </div>
  );
};

export const RojmelState = ({
  context,
  createLabel,
  error,
  isFiltered = false,
  isLoading,
  noun,
  onClear,
  onCreate,
  onRetry,
}) => {
  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="h-12 animate-pulse rounded-xl bg-slate-100" />
        ))}
      </div>
    );
  }

  const variant = error ? "error" : isFiltered ? "filtered" : "empty";

  return (
    <div className="min-h-72 px-6">
      <EmptyState
        actionLabel={isFiltered || error ? undefined : createLabel}
        context={context}
        hint={
          error ||
          (isFiltered
            ? `Clear the current filters to see ${noun}.`
            : `Add the first ${noun.replace(/s$/, "")} to begin.`)
        }
        icon={error ? AlertCircle : FileSearch}
        title={
          error
            ? `Couldn't load ${noun}`
            : isFiltered
              ? `No ${noun} match these filters`
              : `No ${noun} yet`
        }
        variant={variant}
        onAction={error ? onRetry : isFiltered ? onClear : onCreate}
      />
    </div>
  );
};
