import { AlertTriangle } from "lucide-react";

import AppButton from "../../../components/common/AppButton";
import AppModal from "../../../components/common/AppModal";
import AppSelect from "../../../components/common/AppSelect";
import { PAGE_SIZE_OPTIONS } from "./invoiceHelpers";

export const InvoiceStatusPill = ({ meta }) => {
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset",
        meta.className,
      ].join(" ")}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-75" />
      {meta.label}
    </span>
  );
};

export const InvoiceStatCard = ({
  colorClass,
  icon: Icon,
  label,
  value,
}) => {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${colorClass}`}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
            {label}
          </p>
          <p className="mt-0.5 truncate text-xl font-bold text-slate-900">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
};

export const InvoicePagination = ({
  disabled,
  invoiceCount,
  onPageChange,
  onPageSizeChange,
  pageNumber,
  pageSize,
  totalCount,
  totalPages,
}) => {
  const rangeStart = invoiceCount ? (pageNumber - 1) * pageSize + 1 : 0;
  const rangeEnd = invoiceCount ? rangeStart + invoiceCount - 1 : 0;

  return (
    <div className="flex flex-col gap-3 border-t border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 lg:flex-row lg:items-center lg:justify-between">
      <p>
        Showing{" "}
        <span className="font-semibold text-slate-900">{rangeStart}</span> to{" "}
        <span className="font-semibold text-slate-900">{rangeEnd}</span> of{" "}
        <span className="font-semibold text-slate-900">{totalCount}</span>{" "}
        invoices
      </p>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
          <span>Rows</span>
          <AppSelect
            value={pageSize}
            onChange={(value) => onPageSizeChange(Number(value))}
            options={PAGE_SIZE_OPTIONS}
            className="w-24"
            aria-label="Rows per page"
          />
        </div>

        <div className="flex items-center gap-2">
          <AppButton
            variant="secondary"
            className="h-9 rounded-lg px-3"
            disabled={disabled || pageNumber <= 1}
            onClick={() => onPageChange(Math.max(1, pageNumber - 1))}
          >
            Previous
          </AppButton>
          <span className="min-w-20 text-center text-xs font-semibold text-slate-500">
            Page {pageNumber} / {Math.max(1, totalPages)}
          </span>
          <AppButton
            variant="secondary"
            className="h-9 rounded-lg px-3"
            disabled={disabled || pageNumber >= Math.max(1, totalPages)}
            onClick={() =>
              onPageChange(Math.min(Math.max(1, totalPages), pageNumber + 1))
            }
          >
            Next
          </AppButton>
        </div>
      </div>
    </div>
  );
};

export const InvoiceConfirmDialog = ({
  confirmLabel = "Confirm",
  description,
  isLoading,
  isOpen,
  onCancel,
  onConfirm,
  tone = "primary",
  title,
}) => {
  return (
    <AppModal
      isOpen={isOpen}
      maxWidth="max-w-md"
      onClose={isLoading ? undefined : onCancel}
    >
      <div
        className={[
          "flex h-12 w-12 items-center justify-center rounded-xl",
          tone === "danger"
            ? "bg-red-50 text-red-600"
            : "bg-brand-light text-brand",
        ].join(" ")}
      >
        <AlertTriangle className="h-5 w-5" />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-slate-900">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <AppButton
          variant="secondary"
          disabled={isLoading}
          onClick={onCancel}
        >
          Cancel
        </AppButton>
        <AppButton
          variant={tone === "danger" ? "danger" : "primary"}
          isLoading={isLoading}
          onClick={onConfirm}
        >
          {confirmLabel}
        </AppButton>
      </div>
    </AppModal>
  );
};
