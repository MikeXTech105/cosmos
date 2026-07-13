const SettingsCard = ({
  action,
  bodyAriaLabel,
  bodyClassName = "p-5",
  bodyRole,
  children,
  description,
  icon: Icon,
  title,
  variant = "brand",
}) => {
  const hasBody = Boolean(children);
  const iconClassName =
    variant === "indigo"
      ? "bg-gradient-to-br from-indigo-50 via-white to-indigo-100 text-indigo-600 ring-indigo-100"
      : "bg-gradient-to-br from-brand-light via-white to-brand-mid/30 text-brand ring-brand/10";

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      <div
        className={[
          "flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between",
          hasBody ? "border-b border-slate-100" : "",
        ].join(" ")}
      >
        <div className="flex min-w-0 items-start gap-3">
          <div
            className={[
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm ring-1 ring-inset",
              iconClassName,
            ].join(" ")}
          >
            <Icon className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
            <p className="mt-0.5 text-sm leading-5 text-slate-500">
              {description}
            </p>
          </div>
        </div>

        {action}
      </div>

      {hasBody && (
        <div
          className={bodyClassName}
          role={bodyRole}
          aria-label={bodyAriaLabel}
        >
          {children}
        </div>
      )}
    </section>
  );
};

export default SettingsCard;
