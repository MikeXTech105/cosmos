import clsx from "clsx";
import { twMerge } from "tailwind-merge";

const variants = {
  primary:
    "border border-brand bg-brand text-white shadow-lg shadow-brand/20 hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-xl hover:shadow-brand/20 active:translate-y-0 active:scale-[0.98]",
  secondary:
    "border border-slate-200 bg-white text-slate-700 shadow-sm hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 active:translate-y-0 active:scale-[0.98]",
  danger:
    "border border-red-500 bg-red-500 text-white shadow-lg shadow-red-500/15 hover:-translate-y-0.5 hover:bg-red-600 active:translate-y-0 active:scale-[0.98]",
  ghost:
    "border border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-950 active:scale-[0.98]",
};

const AppButton = ({
  children,
  className = "",
  disabled = false,
  isLoading = false,
  loadingText = "Working…",
  onClick,
  type = "button",
  variant = "primary",
  ...buttonProps
}) => {
  const isDisabled = Boolean(disabled || isLoading);

  return (
    <button
      {...buttonProps}
      data-app-button=""
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      aria-busy={isLoading || undefined}
      aria-disabled={isDisabled || undefined}
      className={twMerge(
        clsx(
          "inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 focus-visible:ring-offset-2",
          variants[variant] ?? variants.primary,
          isDisabled && "cursor-not-allowed opacity-60",
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
};

export default AppButton;
