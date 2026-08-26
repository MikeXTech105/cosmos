import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardCopy,
  Info,
  LockKeyhole,
  PackageOpen,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import AppButton from "../../components/common/AppButton";
import AppModal from "../../components/common/AppModal";
import AppSelect from "../../components/common/AppSelect";
import AppTooltip from "../../components/common/AppTooltip";

export const WebsiteBooleanPill = ({ value, trueLabel = "Active", falseLabel = "Inactive" }) => (
  <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${
    value
      ? "bg-green-50 text-green-700 ring-green-200"
      : "bg-slate-100 text-slate-500 ring-slate-200"
  }`}>
    {value ? trueLabel : falseLabel}
  </span>
);

export const WebsitePageIntro = ({ children }) => (
  <div className="flex items-start gap-3 rounded-2xl border border-sky-100 bg-sky-50/80 px-4 py-3 text-sm leading-6 text-sky-800 shadow-sm shadow-sky-900/5">
    <Info className="mt-1 h-4 w-4 shrink-0 text-sky-600" />
    <span>{children}</span>
  </div>
);

export const WebsiteErrorState = ({ error, onRetry }) => {
  const [copied, setCopied] = useState(false);
  if (!error) return null;
  const neutral = error.status === 403 || error.status === 404;

  const copyReference = async () => {
    try {
      await navigator.clipboard.writeText(String(error.correlationId));
      setCopied(true);
      toast.success("Support reference copied");
    } catch {
      toast.error("Unable to copy the support reference.");
    }
  };

  return (
    <div className={`rounded-xl border p-4 ${
      neutral
        ? "border-slate-200 bg-white text-slate-700"
        : "border-red-100 bg-red-50 text-red-700"
    }`}>
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{error.message || "Unable to load this page."}</p>
          {error.correlationId ? (
            <button
              type="button"
              className="mt-2 inline-flex items-center gap-1.5 font-mono text-xs hover:underline"
              onClick={copyReference}
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <ClipboardCopy className="h-3.5 w-3.5" />}
              Ref: {error.correlationId}
            </button>
          ) : null}
          {onRetry && error.status !== 403 ? (
            <div className="mt-3">
              <AppButton variant="secondary" className="h-8 px-3 text-xs" onClick={onRetry}>
                Retry
              </AppButton>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export const WebsiteEmptyState = ({ description, title }) => (
  <div className="rounded-2xl border border-slate-200/90 bg-white px-5 py-14 text-center shadow-[0_12px_36px_-24px_rgba(15,23,42,0.4)]">
    <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-light text-brand">
      <PackageOpen className="h-6 w-6" />
    </span>
    <p className="mt-3 text-sm font-semibold text-slate-900">{title}</p>
    <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-slate-500">{description}</p>
  </div>
);

export const WebsitePagination = ({
  disabled,
  pageNumber,
  pageSize,
  totalCount,
  totalPages,
  onPageChange,
  onPageSizeChange,
}) => {
  const first = totalCount ? (pageNumber - 1) * pageSize + 1 : 0;
  const last = Math.min(pageNumber * pageSize, totalCount);
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/90 bg-white px-5 py-4 shadow-[0_10px_30px_-24px_rgba(15,23,42,0.35)] lg:flex-row lg:items-center lg:justify-between">
      <p className="text-sm text-slate-500">
        Showing <strong className="tabular-nums text-slate-700">{first}</strong> to{" "}
        <strong className="tabular-nums text-slate-700">{last}</strong> of{" "}
        <strong className="tabular-nums text-slate-700">{totalCount}</strong>
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-slate-500">Rows per page</span>
        <AppSelect
          aria-label="Rows per page"
          className="w-24"
          disabled={disabled}
          value={pageSize}
          options={[25, 50, 100, 200].map((value) => ({ label: String(value), value }))}
          onChange={(value) => onPageSizeChange(Number(value))}
        />
        <AppButton
          variant="secondary"
          className="h-9 rounded-lg px-3"
          disabled={disabled || pageNumber <= 1}
          onClick={() => onPageChange(pageNumber - 1)}
        >
          <ChevronLeft className="h-4 w-4" /> Previous
        </AppButton>
        <span className="px-1 text-xs font-semibold tabular-nums text-slate-600">
          Page {pageNumber} of {totalPages}
        </span>
        <AppButton
          variant="secondary"
          className="h-9 rounded-lg px-3"
          disabled={disabled || pageNumber >= totalPages}
          onClick={() => onPageChange(pageNumber + 1)}
        >
          Next <ChevronRight className="h-4 w-4" />
        </AppButton>
      </div>
    </div>
  );
};

export const GuardedButton = ({ children, disabledReason, ...props }) => {
  const button = <AppButton {...props} disabled={Boolean(disabledReason || props.disabled)}>{children}</AppButton>;
  return disabledReason ? <AppTooltip label={disabledReason}>{button}</AppTooltip> : button;
};

export const WebsiteTextarea = ({
  error,
  helperText,
  id,
  label,
  required,
  className = "",
  ...props
}) => (
  <div>
    <label htmlFor={id} className="mb-1.5 block text-[13px] font-medium text-slate-700">
      {label}{required ? <span className="ml-0.5 text-red-500">*</span> : null}
    </label>
    <textarea
      {...props}
      id={id}
      required={required}
      aria-invalid={Boolean(error) || undefined}
      className={`min-h-28 w-full resize-y rounded-xl border bg-white px-4 py-3 text-sm text-slate-800 shadow-sm outline-none transition-all hover:border-slate-300 focus:border-brand focus:ring-2 focus:ring-brand/15 ${
        error ? "border-red-400 bg-red-50/60" : "border-slate-200"
      } ${className}`}
    />
    {helperText ? <p className="mt-1.5 text-xs text-slate-500">{helperText}</p> : null}
    {error ? <p role="alert" className="mt-1.5 text-xs text-red-600">{error}</p> : null}
  </div>
);

export const WebsiteToggle = ({ checked, disabled, helperText, label, onChange }) => (
  <label className={`group flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm transition-all ${disabled ? "opacity-60" : "cursor-pointer hover:border-slate-300 hover:shadow-md"}`}>
    <span>
      <span className="block text-sm font-medium text-slate-800">{label}</span>
      {helperText ? <span className="mt-0.5 block text-xs leading-5 text-slate-500">{helperText}</span> : null}
    </span>
    <span className="relative mt-0.5 inline-flex shrink-0">
      <input
        type="checkbox"
        className="peer sr-only"
        checked={Boolean(checked)}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="h-6 w-11 rounded-full bg-slate-200 transition-colors peer-checked:bg-brand peer-focus-visible:ring-2 peer-focus-visible:ring-brand/30 peer-focus-visible:ring-offset-2" />
      <span className="pointer-events-none absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" />
    </span>
  </label>
);

export const WebsiteConfirmModal = ({
  confirmLabel = "Confirm",
  danger = false,
  description,
  isLoading,
  isOpen,
  onClose,
  onConfirm,
  title,
}) => (
  <AppModal isBusy={isLoading} isOpen={isOpen} onClose={isLoading ? undefined : onClose} title={title}>
    <div className="flex items-start gap-3">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${danger ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-700"}`}>
        <AlertTriangle className="h-5 w-5" />
      </span>
      <p className="pt-1 text-sm leading-6 text-slate-600">{description}</p>
    </div>
    <div className="mt-6 flex justify-end gap-2">
      <AppButton variant="secondary" disabled={isLoading} onClick={onClose}>Cancel</AppButton>
      <AppButton variant={danger ? "danger" : "primary"} isLoading={isLoading} onClick={onConfirm}>
        {confirmLabel}
      </AppButton>
    </div>
  </AppModal>
);

export const WebsiteConflictPanel = ({ current, mine, onKeepMine, onUseSaved, resolving }) => {
  const keys = [...new Set([...Object.keys(mine || {}), ...Object.keys(current || {})])]
    .filter((key) => key !== "rowVersion")
    .filter((key) => JSON.stringify(mine?.[key]) !== JSON.stringify(current?.[key]));

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-start gap-2">
        <LockKeyhole className="mt-0.5 h-4 w-4 text-amber-700" />
        <div>
          <p className="text-sm font-semibold text-amber-900">This record changed while you were editing.</p>
          <p className="mt-1 text-xs text-amber-800">Review your values against the current saved version. Your input has not been lost.</p>
        </div>
      </div>
      <div className="mt-4 max-h-72 space-y-3 overflow-auto">
        {keys.map((key) => (
          <div key={key}>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-900">{key}</p>
            <div className="mt-1 grid gap-2 sm:grid-cols-2">
              {[["Yours", mine?.[key]], ["Saved", current?.[key]]].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-amber-200 bg-white p-2.5">
                  <p className="text-[10px] font-semibold uppercase text-slate-400">{label}</p>
                  <pre className="mt-1 max-h-24 overflow-auto whitespace-pre-wrap break-words font-mono text-xs text-slate-700">
                    {value === null || value === undefined || value === "" ? "—" : typeof value === "string" ? value : JSON.stringify(value, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <AppButton variant="secondary" disabled={resolving} onClick={onUseSaved}>
          <X className="h-4 w-4" /> Use theirs
        </AppButton>
        <AppButton isLoading={resolving} loadingText="Saving…" onClick={onKeepMine}>
          Keep mine
        </AppButton>
      </div>
    </div>
  );
};
