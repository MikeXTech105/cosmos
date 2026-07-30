import clsx from "clsx";
import { forwardRef } from "react";
import { twMerge } from "tailwind-merge";

import AppTooltip from "./AppTooltip";

const variants = {
  primary:
    "bg-brand text-white hover:bg-brand-dark shadow-sm active:scale-[0.98]",
  secondary:
    "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 active:scale-[0.98]",
  danger:
    "bg-red-500 text-white hover:bg-red-600 shadow-sm active:scale-[0.98]",
  ghost:
    "text-slate-600 hover:bg-slate-100 hover:text-slate-900 active:scale-[0.98]",
};

const sizes = {
  sm: "h-8 px-3",
  md: "h-9 px-5",
};

const AppButton = forwardRef(({
  children,
  className = "",
  disabled = false,
  disabledReason,
  isDisabled = false,
  isLoading = false,
  loadingText = "Working…",
  onClick,
  size = "md",
  type = "button",
  variant = "primary",
  ...buttonProps
}, ref) => {
  const resolvedDisabled = Boolean(disabled || isDisabled || isLoading);

  const button = (
    <button
      {...buttonProps}
      ref={ref}
      type={type}
      onClick={onClick}
      disabled={resolvedDisabled}
      aria-busy={isLoading || undefined}
      aria-disabled={resolvedDisabled || undefined}
      className={twMerge(
        clsx(
          "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-medium transition-all",
          variants[variant] ?? variants.primary,
          sizes[size] ?? sizes.md,
          resolvedDisabled && "cursor-not-allowed disabled:opacity-60",
        ),
        className,
      )}
    >
      {isLoading ? (
        <>
          <svg
            className="h-4 w-4 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            />
          </svg>
          {loadingText}
        </>
      ) : (
        children
      )}
    </button>
  );

  if (disabledReason && resolvedDisabled) {
    return <AppTooltip label={disabledReason}>{button}</AppTooltip>;
  }

  return button;
});

AppButton.displayName = "AppButton";

export default AppButton;
