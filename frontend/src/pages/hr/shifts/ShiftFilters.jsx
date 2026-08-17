import { Filter, RotateCcw, Search } from "lucide-react";

import AppButton from "../../../components/common/AppButton";
import AppInput from "../../../components/common/AppInput";
import AppSelect from "../../../components/common/AppSelect";
import { HR_STATUS_OPTIONS } from "../hrHelpers";

const ShiftFilters = ({ filters, onChange, onClear, resultCount }) => {
  const hasActiveFilters =
    Boolean(filters.Search) || filters.IsActive !== "all";

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-3 shadow-[0_10px_30px_-24px_rgba(15,23,42,0.4)]">
      <div className="grid gap-3 lg:grid-cols-[minmax(240px,1fr)_180px_auto]">
        <AppInput
          leadingIcon={Search}
          value={filters.Search}
          onChange={(event) => onChange({ Search: event.target.value })}
          placeholder="Search shifts..."
        />

        <AppSelect
          value={filters.IsActive}
          onChange={(value) => onChange({ IsActive: value })}
          options={HR_STATUS_OPTIONS}
          aria-label="Filter shifts by status"
        />

        <AppButton
          variant="secondary"
          className="px-3"
          disabled={!hasActiveFilters}
          onClick={onClear}
        >
          <RotateCcw className="h-4 w-4" />
          Clear
        </AppButton>
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
        <Filter className="h-3.5 w-3.5" />
        {resultCount} shifts on this page
      </div>
    </div>
  );
};

export default ShiftFilters;
