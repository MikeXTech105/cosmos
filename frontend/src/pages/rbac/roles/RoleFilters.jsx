import { Filter, RotateCcw, Search } from "lucide-react";
import { memo } from "react";

import AppButton from "../../../components/common/AppButton";
import AppInput from "../../../components/common/AppInput";
import AppSelect from "../../../components/common/AppSelect";

const STATUS_OPTIONS = [
  { value: "all", label: "All status" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const RoleFilters = ({ filters, onChange, onClear, resultCount }) => {
  const hasActiveFilters = filters.search || filters.status !== "all";

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-3 shadow-[0_10px_30px_-24px_rgba(15,23,42,0.4)]">
      <div className="grid gap-3 lg:grid-cols-[minmax(240px,1fr)_180px_auto]">
        <AppInput
          aria-label="Search roles"
          leadingIcon={Search}
          value={filters.search}
          onChange={(event) => onChange({ search: event.target.value })}
          placeholder="Search by role name or description..."
        />

        <AppSelect
          value={filters.status}
          onChange={(value) => onChange({ status: value })}
          options={STATUS_OPTIONS}
          aria-label="Filter by status"
        />

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
        {resultCount} roles match current filters
      </div>
    </div>
  );
};

export default memo(RoleFilters);
