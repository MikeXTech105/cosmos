import { RefreshCw } from "lucide-react";

const StatSkeleton = () => {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="h-10 w-10 animate-pulse rounded-full bg-indigo-50" />
      <div className="mt-4 h-2.5 w-24 animate-pulse rounded-full bg-slate-100" />
      <div className="mt-3 h-6 w-20 animate-pulse rounded-md bg-slate-100" />
      <div className="mt-1.5 h-3 w-16 animate-pulse rounded-full bg-slate-100" />
    </div>
  );
};

const ChartSkeleton = ({ tall = false }) => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="h-3 w-32 animate-pulse rounded-full bg-slate-100" />
      <div
        className={[
          "mt-5 animate-pulse rounded-xl bg-slate-100",
          tall ? "h-[220px]" : "h-[136px]",
        ].join(" ")}
      />
    </div>
  );
};

const Dashboard = () => {
  return (
    <section>
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-950">
            Analytics Overview
          </h1>
          <p className="mt-1 text-sm text-slate-500 leading-relaxed">
            Live platform metrics, usage trends, and system health.
          </p>
        </div>

        <button
          type="button"
          className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 shadow-sm transition-all hover:bg-slate-50 active:scale-[0.98] sm:w-auto"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          <StatSkeleton key={index} />
        ))}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <ChartSkeleton tall />
        <ChartSkeleton tall />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <ChartSkeleton />
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
    </section>
  );
};

export default Dashboard;
