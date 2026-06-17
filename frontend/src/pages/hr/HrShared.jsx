import { AlertTriangle, RefreshCw } from "lucide-react";
import { Controller } from "react-hook-form";

import AppButton from "../../components/common/AppButton";
import AppInput from "../../components/common/AppInput";
import AppModal from "../../components/common/AppModal";
import AppSelect from "../../components/common/AppSelect";
import { HR_PAGE_SIZE_OPTIONS } from "./hrHelpers";
import {
  normalizeHrNumberBlurValue,
  normalizeHrNumberInput,
} from "./hrNumberUtils";

export const HrNumberInput = ({
  allowDecimal = true,
  control,
  disabled,
  error,
  id,
  label,
  name,
  placeholder = "0",
  required,
}) => {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <AppInput
          id={id}
          label={label}
          type="text"
          inputMode={allowDecimal ? "decimal" : "numeric"}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          value={field.value ?? ""}
          name={field.name}
          error={error}
          onFocus={(event) => {
            if (String(field.value) === "0") {
              event.target.select();
            }
          }}
          onKeyDown={(event) => {
            if (["e", "E", "+", "-"].includes(event.key)) {
              event.preventDefault();
            }
          }}
          onChange={(event) =>
            field.onChange(
              normalizeHrNumberInput(event.target.value, allowDecimal),
            )
          }
          onBlur={(event) => {
            field.onChange(
              normalizeHrNumberBlurValue(event.target.value, allowDecimal),
            );
            field.onBlur();
          }}
          ref={field.ref}
        />
      )}
    />
  );
};

export const HrStatusPill = ({ isActive }) => {
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset",
        isActive
          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
          : "bg-red-50 text-red-700 ring-red-200",
      ].join(" ")}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-75" />
      {isActive ? "Active" : "Inactive"}
    </span>
  );
};

export const HrStatCard = ({
  colorClass = "bg-brand-light text-brand",
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
          <p className="mt-0.5 text-xl font-bold text-slate-900">{value}</p>
        </div>
      </div>
    </div>
  );
};

export const HrPagination = ({
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
  const rangeStart = itemCount ? (pageNumber - 1) * pageSize + 1 : 0;
  const rangeEnd = itemCount ? rangeStart + itemCount - 1 : 0;

  return (
    <div className="flex flex-col gap-3 border-t border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 lg:flex-row lg:items-center lg:justify-between">
      <p>
        Showing <span className="font-semibold text-slate-900">{rangeStart}</span>{" "}
        to <span className="font-semibold text-slate-900">{rangeEnd}</span> of{" "}
        <span className="font-semibold text-slate-900">{totalCount}</span>{" "}
        {itemLabel}
      </p>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
          <span>Rows</span>
          <AppSelect
            value={pageSize}
            onChange={(value) => onPageSizeChange(Number(value))}
            options={HR_PAGE_SIZE_OPTIONS}
            className="w-20"
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

export const HrEmptyState = ({
  action,
  description,
  error,
  icon: Icon,
  onRetry,
  title,
}) => {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-light text-brand">
          <Icon className="h-6 w-6" />
        </div>
        <h3 className="mt-4 text-base font-semibold text-slate-900">
          {error ? "Unable to load records" : title}
        </h3>
        <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">
          {error || description}
        </p>
        {error ? (
          <AppButton variant="secondary" className="mt-5 h-10" onClick={onRetry}>
            <RefreshCw className="h-4 w-4" />
            Retry
          </AppButton>
        ) : (
          action
        )}
      </div>
    </div>
  );
};

export const HrConfirmDialog = ({
  description,
  isLoading,
  isOpen,
  onCancel,
  onConfirm,
  title,
}) => {
  return (
    <AppModal
      isOpen={isOpen}
      maxWidth="max-w-md"
      onClose={isLoading ? undefined : onCancel}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600">
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
          variant="danger"
          isLoading={isLoading}
          onClick={onConfirm}
        >
          Delete
        </AppButton>
      </div>
    </AppModal>
  );
};
