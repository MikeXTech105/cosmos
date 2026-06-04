import { UserCheck, UsersRound, UserX } from "lucide-react";

const StatCard = ({ icon: Icon, label, value }) => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
            {label}
          </p>
          <p className="mt-0.5 text-lg font-bold text-slate-950">{value}</p>
        </div>
      </div>
    </div>
  );
};

const UserStats = ({ active, inactive, total }) => {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <StatCard icon={UsersRound} label="Total Users" value={total} />
      <StatCard icon={UserCheck} label="Active On Page" value={active} />
      <StatCard icon={UserX} label="Inactive On Page" value={inactive} />
    </div>
  );
};

export default UserStats;
