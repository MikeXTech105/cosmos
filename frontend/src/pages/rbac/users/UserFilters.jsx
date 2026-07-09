import { Filter, RotateCcw, Search } from "lucide-react";
import { memo } from "react";

import AppSelect from "../../../components/common/AppSelect";

const STATUS_OPTIONS = [
  { value: "all", label: "All status" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const UserFilters = ({
  filters,
  isRolesLoading,
  roleOptions,
  onChange,
  onClear,
  resultCount,
  rolesError,
}) => {
  const hasActiveFilters =
    filters.search || filters.status !== "all" || filters.roleId !== "all";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="grid gap-3 lg:grid-cols-[minmax(240px,1fr)_180px_180px_auto]">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={filters.search}
            onChange={(event) => onChange({ search: event.target.value })}
            placeholder="Search by username, name, or email..."
            className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
        </label>

        <AppSelect
          value={filters.status}
          onChange={(value) => onChange({ status: value })}
          options={STATUS_OPTIONS}
          aria-label="Filter by status"
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
          aria-label="Filter by role"
        />

        <button
          type="button"
          onClick={onClear}
          disabled={!hasActiveFilters}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
        >
          <RotateCcw className="h-4 w-4" />
          Clear
        </button>
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
        <Filter className="h-3.5 w-3.5" />
        {resultCount} users match current filters
      </div>
    </div>
  );
};

export default memo(UserFilters);
