import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  FileSearch,
  RefreshCw,
} from "lucide-react";

import AppButton from "../../components/common/AppButton";
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
      {tone === "income" && <ArrowDownLeft className="h-3 w-3" />}
      {tone === "expense" && <ArrowUpRight className="h-3 w-3" />}
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
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
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
          aria-label="Rows per page"
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

export const RojmelState = ({ error, isLoading, noun, onRetry }) => {
  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="h-12 animate-pulse rounded-xl bg-slate-100" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">
      <div
        className={`flex h-14 w-14 items-center justify-center rounded-2xl ${
          error ? "bg-red-50 text-red-600" : "bg-brand-light text-brand"
        }`}
      >
        {error ? <AlertCircle className="h-6 w-6" /> : <FileSearch className="h-6 w-6" />}
      </div>
      <h3 className="mt-4 text-base font-semibold text-slate-900">
        {error ? `Unable to load ${noun}` : `No ${noun} found`}
      </h3>
      <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">
        {error || "Adjust the current filters or add the first entry."}
      </p>
      {error && (
        <AppButton className="mt-5 h-10" variant="secondary" onClick={onRetry}>
          <RefreshCw className="h-4 w-4" />
          Retry
        </AppButton>
      )}
    </div>
  );
};
