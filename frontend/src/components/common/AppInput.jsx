import clsx from "clsx";
import { forwardRef, useId } from "react";
import { twMerge } from "tailwind-merge";

const sizes = {
  sm: "h-9 px-3",
  md: "h-11 px-4",
};

const AppInput = forwardRef((componentProps, ref) => {
  const {
    "aria-describedby": ariaDescribedBy,
    className = "",
    disabled = false,
    error,
    helperText,
    hint,
    id,
    isDisabled = false,
    label,
    required,
    size = "md",
    type = "text",
    value,
    ...props
  } = componentProps;
  const generatedId = useId();
  const inputId = id ?? `app-input-${generatedId}`;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;
  const resolvedDisabled = Boolean(disabled || isDisabled);
  const resolvedHint = hint ?? helperText;
  const hasValueProp = Object.prototype.hasOwnProperty.call(
    componentProps,
    "value",
  );
  const describedBy = [
    ariaDescribedBy,
    resolvedHint ? hintId : "",
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
        disabled={resolvedDisabled}
        required={required}
        aria-required={required || undefined}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={describedBy}
        {...(hasValueProp ? { value: value ?? "" } : {})}
        className={twMerge(
          clsx(
            "w-full rounded-lg border bg-white text-sm text-slate-800 placeholder:text-slate-400",
            "outline-none transition-all",
            "focus:border-brand focus:ring-2 focus:ring-brand/20",
            sizes[size] ?? sizes.md,
            error ? "border-red-400 bg-red-50" : "border-slate-200",
          ),
          className,
        )}
      />
      {resolvedHint && (
        <p id={hintId} className="text-xs text-slate-500">
          {resolvedHint}
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
