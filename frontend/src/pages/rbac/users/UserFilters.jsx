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
    <div className="rounded-2xl border border-slate-200/90 bg-white p-3 shadow-[0_10px_30px_-24px_rgba(15,23,42,0.4)]">
      <div className="grid gap-3 lg:grid-cols-[minmax(240px,1fr)_180px_180px_auto]">
        <AppInput
          aria-label="Search users"
          leadingIcon={Search}
          value={filters.search}
          onChange={(event) => onChange({ search: event.target.value })}
          placeholder="Search by username, name, or email..."
        />

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
        {resultCount} users match current filters
      </div>
    </div>
  );
};

export default memo(UserFilters);
