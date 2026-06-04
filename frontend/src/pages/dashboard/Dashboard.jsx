import { RefreshCw } from "lucide-react";

const StatSkeleton = () => {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="h-8 w-8 rounded-lg bg-slate-100" />
      <div className="mt-4 h-2.5 w-24 rounded-full bg-slate-100" />
      <div className="mt-3 h-4 w-32 rounded-md bg-slate-100" />
    </div>
  );
};

const ChartSkeleton = ({ tall = false }) => {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="h-3 w-32 rounded-full bg-slate-100" />
      <div
        className={[
          "mt-5 rounded-lg bg-slate-100",
          tall ? "h-[220px]" : "h-[136px]",
        ].join(" ")}
      />
    </div>
  );
};

const Dashboard = () => {
  return (
    <section>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-950">
            Analytics Overview
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Live platform metrics, usage trends, and system health.
          </p>
        </div>

        <button
          type="button"
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
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
