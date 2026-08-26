const LABELS = {
  "all-matching": "All matching records",
  "current-page": "Current page",
};

const StatScopeBadge = ({ className = "", scope }) => {
  const label = LABELS[scope];

  if (!label) {
    return null;
  }

  return (
    <span
      className={`inline-flex w-fit items-center gap-1.5 rounded-full bg-slate-100/90 px-2 py-0.5 text-[10px] font-semibold text-slate-600 ring-1 ring-inset ring-slate-200 ${className}`}
      aria-label={`Statistic scope: ${label}`}
    >
      <span className="h-1 w-1 rounded-full bg-brand" aria-hidden="true" />
      {label}
    </span>
  );
};

export default StatScopeBadge;
