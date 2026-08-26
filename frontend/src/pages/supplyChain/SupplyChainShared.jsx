import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Circle,
  RefreshCw,
} from "lucide-react";

import AppButton from "../../components/common/AppButton";
import AppModal from "../../components/common/AppModal";
import AppSelect from "../../components/common/AppSelect";
import AppTooltip from "../../components/common/AppTooltip";
import { getApiErrorMessage } from "../../utils/apiError";
import {
  formatSupplyChainNumber,
  SUPPLY_CHAIN_PAGE_SIZE_OPTIONS,
} from "./supplyChainDisplay";

export const SupplyChainStatusPill = ({ active, label }) => (
  <span
    className={[
      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset",
      active
        ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
        : "bg-slate-50 text-slate-600 ring-slate-200",
    ].join(" ")}
  >
    <Circle className="h-1.5 w-1.5 fill-current" />
    {label ?? (active ? "Active" : "Inactive")}
  </span>
);

export const SupplyChainBadge = ({ children, tone = "slate" }) => {
  const tones = {
    amber: "bg-amber-50 text-amber-700 ring-amber-200",
    brand: "bg-brand-light text-brand ring-brand/20",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    red: "bg-red-50 text-red-700 ring-red-200",
    slate: "bg-slate-50 text-slate-600 ring-slate-200",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${tones[tone] ?? tones.slate}`}
    >
      {children}
    </span>
  );
};

export const SupplyChainFilterBar = ({
  activeFilterCount = 0,
  children,
  onClear,
}) => (
  <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-[0_10px_30px_-24px_rgba(15,23,42,0.4)]">
    <div className="flex flex-wrap items-end gap-3">{children}</div>
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
      <p className="text-xs text-slate-500">
        {activeFilterCount} active filter
        {activeFilterCount === 1 ? "" : "s"}
      </p>
      {activeFilterCount > 0 ? (
        <AppButton variant="ghost" onClick={onClear}>
          Clear
        </AppButton>
      ) : null}
    </div>
  </div>
);

export const SupplyChainPagination = ({
  disabled,
  onPageChange,
  onPageSizeChange,
  pageNumber,
  pageSize,
  totalCount,
  totalPages,
}) => {
  const from = totalCount > 0 ? (pageNumber - 1) * pageSize + 1 : 0;
  const to = Math.min(pageNumber * pageSize, totalCount);

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/90 bg-white px-5 py-4 shadow-[0_10px_30px_-24px_rgba(15,23,42,0.35)] sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-slate-500">
        Showing {formatSupplyChainNumber(from, "0", 0)} to{" "}
        {formatSupplyChainNumber(to, "0", 0)} of{" "}
        {formatSupplyChainNumber(totalCount, "0", 0)}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {disabled ? (
          <AppTooltip label="Wait for the current page to finish loading.">
            <span className="inline-flex w-28">
              <AppSelect
                aria-label="Rows per page"
                className="w-28"
                disabled
                options={SUPPLY_CHAIN_PAGE_SIZE_OPTIONS.map((value) => ({
                  label: `${value} rows`,
                  value,
                }))}
                value={pageSize}
                onChange={onPageSizeChange}
              />
            </span>
          </AppTooltip>
        ) : (
          <AppSelect
            aria-label="Rows per page"
            className="w-28"
            options={SUPPLY_CHAIN_PAGE_SIZE_OPTIONS.map((value) => ({
              label: `${value} rows`,
              value,
            }))}
            value={pageSize}
            onChange={onPageSizeChange}
          />
        )}
        {disabled || pageNumber <= 1 ? (
          <AppTooltip
            label={
              disabled
                ? "Wait for the current page to finish loading."
                : "You are already on the first page."
            }
          >
            <AppButton className="h-10 px-3" disabled variant="secondary">
              <ChevronLeft className="h-4 w-4" />
              Previous
            </AppButton>
          </AppTooltip>
        ) : (
          <AppButton
            className="h-10 px-3"
            variant="secondary"
            onClick={() => onPageChange(pageNumber - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </AppButton>
        )}
        <span className="min-w-20 text-center text-xs font-medium text-slate-600">
          Page {pageNumber} of {Math.max(1, totalPages)}
        </span>
        {disabled || pageNumber >= totalPages ? (
          <AppTooltip
            label={
              disabled
                ? "Wait for the current page to finish loading."
                : "You are already on the last page."
            }
          >
            <AppButton className="h-10 px-3" disabled variant="secondary">
              Next
              <ChevronRight className="h-4 w-4" />
            </AppButton>
          </AppTooltip>
        ) : (
          <AppButton
            className="h-10 px-3"
            variant="secondary"
            onClick={() => onPageChange(pageNumber + 1)}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </AppButton>
        )}
      </div>
    </div>
  );
};

export const SupplyChainInlineError = ({
  message,
  onRetry,
  title = "Unable to continue",
}) => {
  if (!message) {
    return null;
  }

  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
      <div className="flex min-w-0 items-start gap-3">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="mt-0.5 whitespace-pre-line text-xs leading-5">
            {typeof message === "string"
              ? message
              : getApiErrorMessage(message)}
          </p>
        </div>
      </div>
      {onRetry ? (
        <AppButton className="shrink-0" variant="secondary" onClick={onRetry}>
          <RefreshCw className="h-4 w-4" />
          Retry
        </AppButton>
      ) : null}
    </div>
  );
};

export const SupplyChainDeleteModal = ({
  entityLabel,
  error,
  isOpen,
  loading,
  onClose,
  onConfirm,
}) => (
  <AppModal
    isBusy={loading}
    isOpen={isOpen}
    title={`Delete ${entityLabel}`}
    onClose={loading ? undefined : onClose}
  >
    <p className="text-sm leading-6 text-slate-600">
      Delete this {entityLabel}? The server will block the action when the
      record is in use.
    </p>
    <SupplyChainInlineError
      message={error}
      title="This record cannot be deleted"
    />
    <div className="mt-5 flex justify-end gap-2">
      <AppButton variant="secondary" onClick={onClose}>
        Back
      </AppButton>
      <AppButton
        isLoading={loading}
        loadingText="Deleting…"
        variant="danger"
        onClick={onConfirm}
      >
        Delete
      </AppButton>
    </div>
  </AppModal>
);

export const DisabledAction = ({ children, reason }) => (
  <AppTooltip label={reason}>
    <span className="inline-flex">{children}</span>
  </AppTooltip>
);
