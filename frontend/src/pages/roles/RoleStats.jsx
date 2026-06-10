import { ShieldCheck, ShieldOff, ShieldPlus } from "lucide-react";
import { memo } from "react";

const StatCard = ({ colorClass, icon: Icon, label, value }) => {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${colorClass}`}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
            {label}
          </p>
          <p className="mt-0.5 text-xl font-bold text-slate-900">{value}</p>
        </div>
      </div>
    </div>
  );
};

const RoleStats = ({ active, inactive, total }) => {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <StatCard
        icon={ShieldPlus}
        label="Total Roles"
        value={total}
        colorClass="bg-brand-light text-brand"
      />
      <StatCard
        icon={ShieldCheck}
        label="Active On Page"
        value={active}
        colorClass="bg-green-50 text-green-600"
      />
      <StatCard
        icon={ShieldOff}
        label="Inactive On Page"
        value={inactive}
        colorClass="bg-red-50 text-red-500"
      />
    </div>
  );
};

export default memo(RoleStats);
