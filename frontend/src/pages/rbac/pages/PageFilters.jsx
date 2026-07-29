import { Filter, ListTree, RotateCcw, Search } from "lucide-react";
import { memo } from "react";

import AppSelect from "../../../components/common/AppSelect";
import { PAGE_STATUS_OPTIONS, PAGE_VIEW_OPTIONS } from "./pageHelpers";

const PageFilters = ({
  filters,
  isParentsLoading,
  onChange,
  onClear,
  onViewModeChange,
  parentOptions,
  parentsError,
  resultCount,
  viewMode,
}) => {
  const hasActiveFilters =
    filters.search || filters.status !== "all" || filters.parentPageId !== "all";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="grid gap-3 xl:grid-cols-[minmax(240px,1fr)_180px_220px_250px_auto]">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={filters.search}
            onChange={(event) => onChange({ search: event.target.value })}
            placeholder="Search by name, display name, or route..."
            className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
        </label>

        <AppSelect
          value={filters.status}
          onChange={(value) => onChange({ status: value })}
          options={PAGE_STATUS_OPTIONS}
          aria-label="Filter by status"
        />

        <AppSelect
          value={filters.parentPageId}
          onChange={(value) => onChange({ parentPageId: value })}
          disabled={isParentsLoading || Boolean(parentsError)}
          options={[
            {
              value: "all",
              label: isParentsLoading
                ? "Loading parents..."
                : parentsError
                  ? "Parents unavailable"
                  : "All parent pages",
            },
            { value: "root", label: "Root Menu" },
            ...parentOptions.map((page) => ({
              value: String(page.id),
              label: page.displayName,
            })),
          ]}
          aria-label="Filter by parent page"
        />

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-1">
          <div className="grid grid-cols-2 gap-1">
            {PAGE_VIEW_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onViewModeChange(option.value)}
                className={[
                  "inline-flex h-8 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-semibold transition-colors",
                  viewMode === option.value
                    ? "bg-brand text-white shadow-sm"
                    : "text-slate-500 hover:bg-white hover:text-slate-900",
                ].join(" ")}
              >
                <ListTree className="h-3.5 w-3.5" />
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={onClear}
          disabled={!hasActiveFilters}
          title={!hasActiveFilters ? "No active filters to clear" : undefined}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
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
