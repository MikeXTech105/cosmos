import { Filter, RotateCcw, Search } from "lucide-react";
import { memo } from "react";

import AppSelect from "../../../components/common/AppSelect";
import MobileFilterSheet from "../../../components/common/MobileFilterSheet";

const STATUS_OPTIONS = [
  { value: "all", label: "All status" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const UserFilters = ({
  activeFilterCount,
  filters,
  isRolesLoading,
  roleOptions,
  onChange,
  onClear,
  resultCount,
  rolesError,
}) => {
  const hasActiveFilters = activeFilterCount > 0;

  return (
    <MobileFilterSheet activeCount={activeFilterCount} onClear={onClear}>
      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="grid gap-3 lg:grid-cols-[minmax(240px,1fr)_180px_180px_auto]">
        <label className="relative block">
          <span className="mb-1.5 block text-xs font-semibold text-slate-700">Search</span>
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 bottom-3 h-4 w-4 text-slate-500" />
          <input
            value={filters.search}
            onChange={(event) => onChange({ search: event.target.value })}
            placeholder="Search by username, name, or email..."
            className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-500 focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
        </label>

        <AppSelect
          value={filters.status}
          onChange={(value) => onChange({ status: value })}
          options={STATUS_OPTIONS}
          label="Filter by status"
        />

        <AppSelect
          value={filters.roleId}
          onChange={(value) => onChange({ roleId: value })}
          disabled={isRolesLoading || Boolean(rolesError)}
          options={[
            {
              value: "all",
              label: isRolesLoading
                ? "Loading roles..."
                : rolesError
                  ? "Roles unavailable"
                  : "All roles",
            },
            ...roleOptions.map((role) => ({
              value: role.id,
              label: role.name,
            })),
          ]}
          label="Filter by role"
        />

        <button
          type="button"
          onClick={onClear}
          disabled={!hasActiveFilters}
          title={!hasActiveFilters ? "No active filters to clear" : undefined}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
        >
          <RotateCcw aria-hidden="true" className="h-4 w-4" />
          Clear
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <Filter aria-hidden="true" className="h-3.5 w-3.5" />
        <span>{resultCount} users match current filters</span>
        {activeFilterCount > 0 && (
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
            {activeFilterCount} active{" "}
            {activeFilterCount === 1 ? "filter" : "filters"}
          </span>
        )}
      </div>
      </div>
    </MobileFilterSheet>
  );
};

export default memo(UserFilters);
