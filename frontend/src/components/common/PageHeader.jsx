const PageHeader = ({ actions, badge, description, title }) => {
  return (
    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
      <div>
        {badge && (
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-light px-3 py-1 text-xs font-semibold text-brand ring-1 ring-inset ring-brand/10">
            {badge}
          </div>
        )}
        <h1
          className={[
            "text-2xl font-semibold text-slate-900",
            badge ? "mt-3" : "",
          ].join(" ")}
        >
          {title}
        </h1>
        {description && (
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
            {description}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap xl:justify-end">
          {actions}
        </div>
      )}
    </div>
  );
};

export default PageHeader;
