import { Filter, RotateCcw, Search } from "lucide-react";

import AppButton from "../../../components/common/AppButton";
import AppSelect from "../../../components/common/AppSelect";
import { HR_EMPLOYEE_STATUS_OPTIONS } from "../../../utils/hrEnums";

const withAll = (label, options) => [{ value: "all", label }, ...options];

const EmployeeFilters = ({
  canCreateDepartment = false,
  canCreateDesignation = false,
  departmentOptions,
  designationOptions,
  filters,
  onCreateDepartment,
  onCreateDesignation,
  onChange,
  onClear,
  resultCount,
}) => {
  const hasActiveFilters =
    Boolean(filters.Search) ||
    filters.DepartmentId !== "all" ||
    filters.DesignationId !== "all" ||
    filters.Status !== "all";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="grid gap-3 xl:grid-cols-[minmax(260px,1fr)_180px_180px_160px_auto]">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={filters.Search}
            onChange={(event) => onChange({ Search: event.target.value })}
            placeholder="Search employees..."
            className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
        </label>

        <AppSelect
          value={filters.DepartmentId}
          onChange={(value) => onChange({ DepartmentId: value })}
          options={withAll("All departments", departmentOptions)}
          aria-label="Filter employees by department"
          creatable={canCreateDepartment}
          createLabel="Create new department"
          onCreateClick={onCreateDepartment}
        />

        <AppSelect
          value={filters.DesignationId}
          onChange={(value) => onChange({ DesignationId: value })}
          options={withAll("All designations", designationOptions)}
          aria-label="Filter employees by designation"
          creatable={canCreateDesignation}
          createLabel="Create new designation"
          onCreateClick={onCreateDesignation}
        />

        <AppSelect
          value={filters.Status}
          onChange={(value) => onChange({ Status: value })}
          options={withAll("All status", HR_EMPLOYEE_STATUS_OPTIONS)}
          aria-label="Filter employees by status"
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

      <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
        <Filter className="h-3.5 w-3.5" />
        {resultCount} employees on this page
      </div>
    </div>
  );
};

export default EmployeeFilters;
