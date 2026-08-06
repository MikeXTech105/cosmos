const SettingsCard = ({
  action,
  bodyAriaLabel,
  bodyClassName = "p-5",
  bodyRole,
  children,
  description,
  icon: Icon,
  title,
}) => {
  const hasBody = Boolean(children);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div
        className={[
          "flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between",
          hasBody ? "border-b border-slate-100" : "",
        ].join(" ")}
      >
        <div className="flex min-w-0 items-start gap-3">
          <div
            className={[
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset",
              "bg-brand-light text-brand ring-brand/10",
            ].join(" ")}
          >
            <Icon className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-950">{title}</h3>
            <p className="mt-0.5 text-xs leading-5 text-slate-500">
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
