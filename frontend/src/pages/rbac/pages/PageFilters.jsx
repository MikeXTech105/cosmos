import { Filter, ListTree, RotateCcw, Search } from "lucide-react";
import { memo } from "react";

import AppButton from "../../../components/common/AppButton";
import AppInput from "../../../components/common/AppInput";
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
    <div className="rounded-2xl border border-slate-200/90 bg-white p-3 shadow-[0_10px_30px_-24px_rgba(15,23,42,0.4)]">
      <div className="grid gap-3 xl:grid-cols-[minmax(240px,1fr)_180px_220px_250px_auto]">
        <AppInput
          leadingIcon={Search}
          value={filters.search}
          onChange={(event) => onChange({ search: event.target.value })}
          placeholder="Search by name, display name, or route..."
        />

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

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100/80 p-1 shadow-inner">
          <div className="grid grid-cols-2 gap-1">
            {PAGE_VIEW_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onViewModeChange(option.value)}
                className={[
                  "inline-flex h-8 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-semibold transition-colors",
                  viewMode === option.value
                    ? "bg-white text-brand shadow-sm ring-1 ring-slate-200"
                    : "text-slate-500 hover:bg-white/70 hover:text-slate-900",
                ].join(" ")}
              >
                <ListTree className="h-3.5 w-3.5" />
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <AppButton
          variant="secondary"
          onClick={onClear}
          disabled={!hasActiveFilters}
          className="px-3"
        >
          <RotateCcw className="h-4 w-4" />
          Clear
        </AppButton>
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
        <Filter className="h-3.5 w-3.5" />
        {resultCount} pages match current filters
      </div>
    </div>
  );
};

export default memo(PageFilters);
