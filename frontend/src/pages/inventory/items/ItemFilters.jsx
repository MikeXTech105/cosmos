import { Filter, RotateCcw, Search } from "lucide-react";

import AppButton from "../../../components/common/AppButton";
import AppSelect from "../../../components/common/AppSelect";
import { ITEM_CLASSIFICATION_OPTIONS } from "../../../utils/itemClassification";
import { STATUS_OPTIONS } from "../inventoryHelpers";

const ItemFilters = ({
  activeFilterCount,
  canCreateCategory = false,
  categoryOptions,
  filters,
  onCreateCategory,
  onChange,
  onClear,
  resultCount,
}) => {
  const hasActiveFilters = activeFilterCount > 0;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="grid gap-3 xl:grid-cols-[minmax(240px,1fr)_200px_190px_160px_auto]">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={filters.Search}
            onChange={(event) => onChange({ Search: event.target.value })}
            placeholder="Search name, item code or barcode..."
            className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
        </label>

        <AppSelect
          value={filters.CategoryId}
          onChange={(value) => onChange({ CategoryId: value })}
          options={[
            { value: "all", label: "All categories" },
            ...categoryOptions,
          ]}
          aria-label="Filter items by category"
          creatable={canCreateCategory}
          createLabel="Create new category"
          onCreateClick={onCreateCategory}
        />

        <AppSelect
          value={filters.ProcurementClassification ?? "all"}
          onChange={(value) =>
            onChange({ ProcurementClassification: value })
          }
          options={[
            { value: "all", label: "All material types" },
            ...ITEM_CLASSIFICATION_OPTIONS,
          ]}
          aria-label="Filter items by material type"
        />

        <AppSelect
          value={filters.IsActive}
          onChange={(value) => onChange({ IsActive: value })}
          options={STATUS_OPTIONS}
          aria-label="Filter items by status"
        />

        <AppButton
          variant="secondary"
          className="h-10 rounded-lg px-3"
          disabled={!hasActiveFilters}
          onClick={onClear}
        >
          <RotateCcw className="h-4 w-4" />
          Clear
        </AppButton>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <Filter className="h-3.5 w-3.5" />
        <span>{resultCount} items on this page</span>
        {activeFilterCount > 0 && (
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
            {activeFilterCount} active{" "}
            {activeFilterCount === 1 ? "filter" : "filters"}
          </span>
        )}
      </div>
    </div>
  );
};

export default ItemFilters;
