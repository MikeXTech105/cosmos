import { memo } from "react";

const GROUPS = [
  { id: "all", label: "All Parties" },
  { id: "customers", label: "Customers" },
  { id: "suppliers", label: "Suppliers" },
  { id: "both", label: "Both" },
];

const PartyGroups = ({ activeGroup, counts, onChange }) => {
  return (
    <div className="glass-card rounded-2xl p-2">
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {GROUPS.map((group) => {
          const isActive = activeGroup === group.id;

          return (
            <button
              key={group.id}
              type="button"
              onClick={() => onChange(group.id)}
              className={[
                "flex h-11 items-center justify-between rounded-xl px-3 text-sm font-semibold transition-all",
                isActive
                  ? "bg-brand text-white shadow-sm"
                  : "text-slate-600 hover:bg-white hover:text-slate-950",
              ].join(" ")}
            >
              <span>{group.label}</span>
              <span
                className={[
                  "rounded-full px-2 py-0.5 text-xs",
                  isActive ? "bg-white/18 text-white" : "bg-slate-100 text-slate-500",
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
