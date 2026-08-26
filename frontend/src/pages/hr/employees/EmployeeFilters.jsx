import { Filter, RotateCcw, Search } from "lucide-react";

import AppButton from "../../../components/common/AppButton";
import AppInput from "../../../components/common/AppInput";
import AppSelect from "../../../components/common/AppSelect";
import { HR_EMPLOYEE_STATUS_FILTER_OPTIONS } from "../../../utils/hrEnums";

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
    filters.Status !== "all" ||
    filters.IncludeResigned;

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-3 shadow-[0_10px_30px_-24px_rgba(15,23,42,0.4)]">
      <div className="grid gap-3 xl:grid-cols-[minmax(260px,1fr)_180px_180px_160px_170px_auto]">
        <AppInput
          aria-label="Search employees"
          leadingIcon={Search}
          value={filters.Search}
          onChange={(event) => onChange({ Search: event.target.value })}
          placeholder="Search employees..."
        />

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
          options={withAll("All status", HR_EMPLOYEE_STATUS_FILTER_OPTIONS)}
          aria-label="Filter employees by status"
        />

        <label className="flex h-11 cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50">
          <span className="truncate">Include resigned</span>
          <input
            type="checkbox"
            checked={Boolean(filters.IncludeResigned)}
            onChange={(event) =>
              onChange({ IncludeResigned: event.target.checked })
            }
            className="h-4 w-4 rounded border-slate-300 accent-brand"
          />
        </label>

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

      <div className="mt-3 flex flex-col gap-2 text-xs text-slate-500 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5" />
          {resultCount} employees on this page
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {[
            ["Active", "bg-emerald-500"],
            ["Inactive", "bg-slate-400"],
            ["Resigned", "bg-amber-500"],
            ["Terminated", "bg-red-500"],
          ].map(([label, dotClass]) => (
            <span key={label} className="inline-flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${dotClass}`} />
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EmployeeFilters;
