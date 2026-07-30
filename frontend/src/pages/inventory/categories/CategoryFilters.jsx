import { Filter, RotateCcw, Search } from "lucide-react";

import AppButton from "../../../components/common/AppButton";
import MobileFilterSheet from "../../../components/common/MobileFilterSheet";
import AppSelect from "../../../components/common/AppSelect";
import { STATUS_OPTIONS } from "../inventoryHelpers";

const CategoryFilters = ({ filters, onChange, onClear, resultCount }) => {
  const hasActiveFilters =
    Boolean(filters.Search) || filters.IsActive !== "all";
  const activeFilterCount =
    Number(Boolean(filters.Search)) + Number(filters.IsActive !== "all");

  return (
    <MobileFilterSheet activeCount={activeFilterCount} onClear={onClear}>
      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="grid gap-3 lg:grid-cols-[minmax(240px,1fr)_180px_auto]">
        <label className="relative block">
          <span className="mb-1.5 block text-xs font-semibold text-slate-700">Search</span>
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 bottom-3 h-4 w-4 text-slate-500" />
          <input
            value={filters.Search}
            onChange={(event) => onChange({ Search: event.target.value })}
            placeholder="Search categories..."
            className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-500 focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
        </label>

        <AppSelect
          value={filters.IsActive}
          onChange={(value) => onChange({ IsActive: value })}
          options={STATUS_OPTIONS}
          label="Filter categories by status"
        />

        <AppButton
          variant="secondary"
          className="h-10 rounded-lg px-3"
          disabled={!hasActiveFilters}
          onClick={onClear}
        >
          <RotateCcw aria-hidden="true" className="h-4 w-4" />
          Clear
        </AppButton>
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
        <Filter aria-hidden="true" className="h-3.5 w-3.5" />
        {resultCount} categories on this page
      </div>
      </div>
    </MobileFilterSheet>
  );
};

export default CategoryFilters;
