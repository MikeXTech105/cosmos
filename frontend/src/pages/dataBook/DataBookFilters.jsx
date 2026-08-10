import { RotateCcw, Search, SlidersHorizontal } from "lucide-react";

import AppButton from "../../components/common/AppButton";
import AppInput from "../../components/common/AppInput";
import AppSelect from "../../components/common/AppSelect";
import AppTooltip from "../../components/common/AppTooltip";

const DataBookFilters = ({
  categories,
  filters,
  mode = "list",
  onChange,
  onClear,
  searchValue,
}) => {
  const isGrid = mode === "grid";
  const activeCount = [
    searchValue,
    isGrid ? "" : filters.Category,
    filters.FromDate,
    filters.ToDate,
  ].filter(Boolean).length;
  const clearButton = (
    <AppButton
      className="h-10 rounded-lg px-3"
      disabled={activeCount === 0}
      variant="ghost"
      onClick={onClear}
    >
      <RotateCcw className="h-4 w-4" />
      Clear
    </AppButton>
  );

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
            <SlidersHorizontal className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-900">
              {isGrid ? "Find rows in this sheet" : "Find anything in Data Book"}
            </p>
            <p className="text-xs text-slate-500">
              {isGrid
                ? "Search the selected sheet or narrow it by date."
                : "Search across sheets, then narrow the results."}
            </p>
          </div>
        </div>
        <span className={`inline-flex w-fit rounded-full px-2.5 py-1 text-[11px] font-semibold ${
          activeCount > 0
            ? "bg-brand-light text-brand ring-1 ring-inset ring-brand/10"
            : "bg-slate-100 text-slate-500"
        }`}>
          {activeCount > 0
            ? `${activeCount} active ${activeCount === 1 ? "filter" : "filters"}`
            : "No filters applied"}
        </span>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute bottom-3.5 left-3 h-4 w-4 text-slate-400" />
          <AppInput
            aria-label="Search Data Book"
            className="h-10 pl-9"
            label="Search"
            placeholder={isGrid ? "Search this sheet..." : "Search all entries..."}
            value={searchValue}
            onChange={(event) => onChange({ Search: event.target.value })}
          />
        </div>
        {!isGrid ? (
          <div className="w-full sm:w-52">
            <AppSelect
              label="Sheet"
              options={[
                { label: "All sheets", value: "" },
                ...categories.map((category) => ({
                  label: category,
                  value: category,
                })),
              ]}
              placeholder="All sheets"
              value={filters.Category}
              onChange={(value) => onChange({ Category: value })}
            />
          </div>
        ) : null}
        <div className="w-full sm:w-44">
          <AppInput
            className="h-10"
            label="From date"
            max={filters.ToDate || undefined}
            type="date"
            value={filters.FromDate}
            onChange={(event) => onChange({ FromDate: event.target.value })}
          />
        </div>
        <div className="w-full sm:w-44">
          <AppInput
            className="h-10"
            label="To date"
            min={filters.FromDate || undefined}
            type="date"
            value={filters.ToDate}
            onChange={(event) => onChange({ ToDate: event.target.value })}
          />
        </div>
        {activeCount === 0 ? (
          <AppTooltip label="No active filters to clear.">
            {clearButton}
          </AppTooltip>
        ) : (
          clearButton
        )}
      </div>
    </div>
  );
};

export default DataBookFilters;
