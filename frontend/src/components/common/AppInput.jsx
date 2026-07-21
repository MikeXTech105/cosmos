import { forwardRef, useId } from "react";

const AppInput = forwardRef(({
  "aria-describedby": ariaDescribedBy,
  className = "",
  error,
  helperText,
  id,
  label,
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

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="text-[13px] font-medium text-slate-700"
        >
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </label>
      )}
      <input
        {...props}
        ref={ref}
        id={inputId}
        type={type}
        required={required}
        aria-required={required || undefined}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={describedBy}
        className={[
          "h-11 w-full rounded-lg border bg-white px-4 text-sm text-slate-800 placeholder:text-slate-400",
          "outline-none transition-all",
          "focus:border-brand focus:ring-2 focus:ring-brand/20",
          error ? "border-red-400 bg-red-50" : "border-slate-200",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      />
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
