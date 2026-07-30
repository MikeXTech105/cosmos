import { UserCheck, UsersRound, UserX } from "lucide-react";
import { memo } from "react";

const StatCard = ({ colorClass, icon: Icon, label, loading, value }) => {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${colorClass}`}>
          <Icon aria-hidden="true" className="h-4 w-4" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
            {label}
          </p>
          {loading ? (
            <div className="mt-1 h-7 w-20 animate-pulse rounded bg-slate-100" />
          ) : (
            <p className="mt-0.5 text-xl font-bold tabular-nums text-slate-900">{value}</p>
          )}
        </div>
      </div>
    </div>
  );
};

const UserStats = ({ active, inactive, loading, total }) => {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <StatCard icon={UsersRound} label="Total Users" loading={loading} value={total} colorClass="bg-brand-light text-brand" />
      <StatCard icon={UserCheck} label="Active On Page" loading={loading} value={active} colorClass="bg-green-50 text-green-600" />
      <StatCard icon={UserX} label="Inactive On Page" loading={loading} value={inactive} colorClass="bg-red-50 text-red-500" />
    </div>
  );
};

export default memo(UserStats);
