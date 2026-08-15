import { Contact, Store, Truck, UsersRound } from "lucide-react";
import { memo } from "react";

const GROUPS = [
  { id: "all", icon: Contact, label: "All Parties" },
  { id: "customers", icon: Store, label: "Customers" },
  { id: "suppliers", icon: Truck, label: "Suppliers" },
  { id: "both", icon: UsersRound, label: "Both" },
];

const PartyGroups = ({ activeGroup, counts, embedded = false, onChange }) => {
  return (
    <div
      className={[
        "flex flex-col gap-4 px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between",
        embedded
          ? "border-b border-slate-200 bg-white"
          : "rounded-2xl border border-slate-200 bg-white shadow-sm",
      ].join(" ")}
    >
      <div className="min-w-0">
        <h2 className="text-sm font-bold text-slate-950">Party Directory</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Browse every customer, supplier and shared account.
        </p>
      </div>

      <div className="-mx-1 overflow-x-auto px-1">
        <div
          className="flex min-w-max gap-1 rounded-xl bg-slate-100 p-1"
          role="tablist"
          aria-label="Party relationship views"
        >
          {GROUPS.map((group) => {
            const isActive = activeGroup === group.id;
            const Icon = group.icon;

            return (
              <button
                key={group.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onChange(group.id)}
                className={[
                  "flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-bold transition-all",
                  isActive
                    ? "bg-white text-brand shadow-sm ring-1 ring-inset ring-slate-200"
                    : "text-slate-500 hover:bg-white/70 hover:text-slate-800",
                ].join(" ")}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{group.label}</span>
                <span
                  className={[
                    "inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] tabular-nums",
                    isActive
                      ? "bg-brand-light font-medium text-brand"
                      : "bg-slate-200/70 text-slate-500",
                  ].join(" ")}
                >
                  {counts[group.id] ?? 0}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default memo(PartyGroups);
