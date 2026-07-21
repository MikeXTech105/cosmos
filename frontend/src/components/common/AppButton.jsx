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
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      aria-busy={isLoading || undefined}
      aria-disabled={isDisabled || undefined}
      className={[
        "inline-flex h-9 items-center justify-center gap-2 rounded-xl px-5 text-sm font-medium transition-all",
        variants[variant] ?? variants.primary,
        isDisabled ? "cursor-not-allowed opacity-60" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
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
