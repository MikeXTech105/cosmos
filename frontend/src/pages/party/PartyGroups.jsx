import { memo } from "react";

const GROUPS = [
  { id: "all", label: "All Parties" },
  { id: "customers", label: "Customers" },
  { id: "suppliers", label: "Suppliers" },
  { id: "both", label: "Both" },
];

const PartyGroups = ({ activeGroup, counts, onChange }) => {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white px-2">
      <div className="flex min-w-max gap-1">
        {GROUPS.map((group) => {
          const isActive = activeGroup === group.id;

          return (
            <button
              key={group.id}
              type="button"
              onClick={() => onChange(group.id)}
              className={[
                "flex h-12 items-center gap-2 border-b-2 px-4 text-sm font-medium transition-colors",
                isActive
                  ? "border-brand text-brand"
                  : "border-transparent text-slate-500 hover:text-slate-800",
              ].join(" ")}
            >
              <span>{group.label}</span>
              <span
                className={[
                  "rounded-full px-2 py-0.5 text-[11px]",
                  isActive
                    ? "bg-brand-light font-medium text-brand"
                    : "bg-slate-100 text-slate-500",
                ].join(" ")}
              >
                {counts[group.id] ?? 0}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default memo(PartyGroups);
