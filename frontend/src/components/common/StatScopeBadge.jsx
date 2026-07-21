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
      className={`inline-flex w-fit items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 ring-1 ring-inset ring-slate-200 ${className}`}
      aria-label={`Statistic scope: ${label}`}
    >
      {label}
    </span>
  );
};

export default StatScopeBadge;
