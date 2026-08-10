const FIELD_LABELS = {
  category: "Category",
  description: "Description",
  isPrivate: "Visibility",
  name: "Name",
  value: "Value",
};

const displayValue = (field, value) => {
  if (field === "isPrivate") return value ? "Private" : "Public";
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
};

const DataBookConflictComparison = ({ fields, leftLabel = "Your changes" }) => {
  if (!fields?.length) {
    return (
      <p className="mt-3 text-xs text-amber-800">
        The saved row version changed. Reloaded metadata is ready for review.
      </p>
    );
  }

  return (
    <div className="mt-3 space-y-3">
      {fields.map((difference) => (
        <div key={difference.field}>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-900">
            {FIELD_LABELS[difference.field] ?? difference.field}
          </p>
          <div className="mt-1 grid gap-2 sm:grid-cols-2">
            <div className="rounded-lg border border-amber-200 bg-white p-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                {leftLabel}
              </p>
              <pre className="mt-1 max-h-28 overflow-auto whitespace-pre-wrap break-words font-mono text-xs text-slate-700">
                {displayValue(difference.field, difference.mine)}
              </pre>
            </div>
            <div className="rounded-lg border border-amber-200 bg-white p-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Current saved version
              </p>
              <pre className="mt-1 max-h-28 overflow-auto whitespace-pre-wrap break-words font-mono text-xs text-slate-700">
                {displayValue(difference.field, difference.current)}
              </pre>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default DataBookConflictComparison;
