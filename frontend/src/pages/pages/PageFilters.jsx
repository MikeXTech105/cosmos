import { Filter, RotateCcw, Search } from "lucide-react";
import { memo } from "react";

const PageFilters = ({
  filters,
  isParentsLoading,
  onChange,
  onClear,
  parentOptions,
  parentsError,
  resultCount,
}) => {
  const hasActiveFilters =
    filters.search || filters.status !== "all" || filters.parentPageId !== "all";

  return (
    <div className="glass-card rounded-2xl p-3">
      <div className="grid gap-3 lg:grid-cols-[minmax(240px,1fr)_180px_220px_auto]">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={filters.search}
            onChange={(event) => onChange({ search: event.target.value })}
            placeholder="Search by name, display name, or route..."
            className="h-10 w-full rounded-xl border border-slate-200 bg-white/70 pl-9 pr-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-brand/30 focus:bg-white focus:ring-4 focus:ring-brand/10"
          />
        </label>

        <select
          value={filters.status}
          onChange={(event) => onChange({ status: event.target.value })}
          className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition-all focus:border-brand/30 focus:ring-4 focus:ring-brand/10"
          aria-label="Filter by status"
        >
          <option value="all">All status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <select
          value={filters.parentPageId}
          onChange={(event) => onChange({ parentPageId: event.target.value })}
          disabled={isParentsLoading || Boolean(parentsError)}
          className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition-all focus:border-brand/30 focus:ring-4 focus:ring-brand/10 disabled:cursor-not-allowed disabled:opacity-60"
          aria-label="Filter by parent page"
        >
          <option value="all">
            {isParentsLoading
              ? "Loading parents..."
              : parentsError
                ? "Parents unavailable"
                : "All parent pages"}
          </option>
          <option value="root">Root Menu</option>
          {parentOptions.map((page) => (
            <option key={page.id} value={String(page.id)}>
              {page.displayName}
            </option>
          ))}
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
        {resultCount} pages match current filters
      </div>
    </div>
  );
};

export default memo(PageFilters);
