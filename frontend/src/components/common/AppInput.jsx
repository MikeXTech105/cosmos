import clsx from "clsx";
import { forwardRef, useId } from "react";
import { twMerge } from "tailwind-merge";

import AppDateInput from "./AppDateInput";

const AppInput = forwardRef(({
  "aria-describedby": ariaDescribedBy,
  className = "",
  error,
  helperText,
  id,
  label,
  leadingIcon: LeadingIcon,
  required,
  type = "text",
  ...props
}, ref) => {
  const generatedId = useId();
  const inputId = id ?? `app-input-${generatedId}`;
  const errorId = `${inputId}-error`;
  const helperId = `${inputId}-helper`;
  const describedBy = [
    ariaDescribedBy,
    helperText ? helperId : "",
    error ? errorId : "",
  ]
    .filter(Boolean)
    .join(" ") || undefined;
  const isCalendarInput = type === "date" || type === "datetime-local";
  const InputComponent = isCalendarInput ? AppDateInput : "input";

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="text-[13px] font-medium text-slate-700"
        >
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </label>
      )}
      <div className="relative min-w-0">
        {LeadingIcon ? (
          <LeadingIcon
            className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
        ) : null}
        <InputComponent
          {...props}
          ref={ref}
          id={inputId}
          type={type}
          required={required}
          aria-required={required || undefined}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={describedBy}
          className={twMerge(
            clsx(
              "h-11 w-full rounded-xl border bg-white px-4 text-sm text-slate-800 shadow-sm placeholder:text-slate-400",
              "outline-none transition-all duration-200 hover:border-slate-300",
              "focus:border-brand focus:ring-2 focus:ring-brand/15",
              "disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none",
              LeadingIcon && "pl-10",
              error ? "border-red-400 bg-red-50/60" : "border-slate-200",
            ),
            className,
          )}
        />
      </div>
      {helperText && (
        <p id={helperId} className="text-[12px] text-slate-500">
          {helperText}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-[12px] text-red-500">
          {error}
        </p>
      )}
    </div>
  );
});

AppInput.displayName = "AppInput";

export default AppInput;
