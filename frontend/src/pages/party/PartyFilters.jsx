import { Filter, RotateCcw, Search } from "lucide-react";
import { memo } from "react";

import AppSelect from "../../components/common/AppSelect";
import MobileFilterSheet from "../../components/common/MobileFilterSheet";

const STATUS_OPTIONS = [
  { value: "all", label: "All status" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const CREDIT_OPTIONS = [
  { value: "all", label: "All credit" },
  { value: "with-limit", label: "With credit limit" },
  { value: "without-limit", label: "No credit limit" },
];

const GST_OPTIONS = [
  { value: "all", label: "All GST" },
  { value: "with-gstin", label: "With GSTIN" },
  { value: "without-gstin", label: "Without GSTIN" },
];

const PartyFilters = ({ filters, onChange, onClear, resultCount }) => {
  const hasActiveFilters =
    filters.Search ||
    filters.IsActive !== "all" ||
    filters.creditLimit !== "all" ||
    filters.gst !== "all";
  const activeFilterCount =
    Number(Boolean(filters.Search)) +
    Number(filters.IsActive !== "all") +
    Number(filters.creditLimit !== "all") +
    Number(filters.gst !== "all");

  return (
    <MobileFilterSheet activeCount={activeFilterCount} onClear={onClear}>
      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="grid gap-3 xl:grid-cols-[minmax(240px,1fr)_170px_180px_170px_auto]">
        <label className="relative block">
          <span className="mb-1.5 block text-xs font-semibold text-slate-700">Search</span>
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 bottom-3 h-4 w-4 text-slate-500" />
          <input
            value={filters.Search}
            onChange={(event) => onChange({ Search: event.target.value })}
            placeholder="Quick search by name, mobile, GSTIN..."
            className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-500 focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
        </label>

        <AppSelect
          value={filters.IsActive}
          onChange={(value) => onChange({ IsActive: value })}
          options={STATUS_OPTIONS}
          label="Filter parties by status"
        />

        <AppSelect
          value={filters.creditLimit}
          onChange={(value) => onChange({ creditLimit: value })}
          options={CREDIT_OPTIONS}
          label="Filter parties by credit limit"
        />

        <AppSelect
          value={filters.gst}
          onChange={(value) => onChange({ gst: value })}
          options={GST_OPTIONS}
          label="Filter parties by GST"
        />

        <button
          type="button"
          onClick={onClear}
          disabled={!hasActiveFilters}
          title={!hasActiveFilters ? "No active filters to clear" : undefined}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
        >
          <RotateCcw aria-hidden="true" className="h-4 w-4" />
          Clear
        </button>
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
        <Filter aria-hidden="true" className="h-3.5 w-3.5" />
        {resultCount} matching parties across all pages
      </div>
      </div>
    </MobileFilterSheet>
  );
};

export default memo(PartyFilters);
