import { Filter, RotateCcw, Search } from "lucide-react";
import { memo } from "react";

const PartyFilters = ({ filters, onChange, onClear, resultCount }) => {
  const hasActiveFilters =
    filters.Search ||
    filters.IsActive !== "all" ||
    filters.creditLimit !== "all" ||
    filters.gst !== "all";

  return (
    <div className="glass-card rounded-2xl p-3">
      <div className="grid gap-3 xl:grid-cols-[minmax(240px,1fr)_170px_180px_170px_auto]">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={filters.Search}
            onChange={(event) => onChange({ Search: event.target.value })}
            placeholder="Quick search by name, mobile, GSTIN..."
            className="h-10 w-full rounded-xl border border-slate-200 bg-white/70 pl-9 pr-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-brand/30 focus:bg-white focus:ring-4 focus:ring-brand/10"
          />
        </label>

        <select
          value={filters.IsActive}
          onChange={(event) => onChange({ IsActive: event.target.value })}
          className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition-all focus:border-brand/30 focus:ring-4 focus:ring-brand/10"
          aria-label="Filter parties by status"
        >
          <option value="all">All status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <select
          value={filters.creditLimit}
          onChange={(event) => onChange({ creditLimit: event.target.value })}
          className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition-all focus:border-brand/30 focus:ring-4 focus:ring-brand/10"
          aria-label="Filter parties by credit limit"
        >
          <option value="all">All credit</option>
          <option value="with-limit">With credit limit</option>
          <option value="without-limit">No credit limit</option>
        </select>

        <select
          value={filters.gst}
          onChange={(event) => onChange({ gst: event.target.value })}
          className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition-all focus:border-brand/30 focus:ring-4 focus:ring-brand/10"
          aria-label="Filter parties by GST"
        >
          <option value="all">All GST</option>
          <option value="with-gstin">With GSTIN</option>
          <option value="without-gstin">Without GSTIN</option>
        </select>

        <button
          type="button"
          onClick={onClear}
          disabled={!hasActiveFilters}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 glass px-3 text-sm font-semibold text-slate-600 transition-all hover:bg-white disabled:cursor-not-allowed disabled:opacity-45"
        >
          <RotateCcw className="h-4 w-4" />
          Clear
        </button>
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
        <Filter className="h-3.5 w-3.5" />
        {resultCount} parties match current filters
      </div>
    </div>
  );
};

export default memo(PartyFilters);
