import { Plus, UserRound } from "lucide-react";

import AppButton from "../../../components/common/AppButton";
import MobileRecordCard, {
  MobileRecordCardSkeleton,
} from "../../../components/common/MobileRecordCard";
import {
  HR_EMPLOYEE_STATUS_KEY,
  getEmployeeStatusKey,
  getEmployeeStatusLabel,
} from "../../../utils/hrEnums";
import {
  getEmployeeInitials,
  getEmployeeName,
  getHrRecordId,
  getLookupLabel,
} from "../hrHelpers";
import { HrEmptyState, HrPagination } from "../HrShared";

const getEmployeeStatusClass = (status, statusName) => {
  const statusKey = getEmployeeStatusKey(status, statusName);

  if (statusKey === HR_EMPLOYEE_STATUS_KEY.ACTIVE) {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  if (statusKey === HR_EMPLOYEE_STATUS_KEY.RESIGNED) {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }

  if (statusKey === HR_EMPLOYEE_STATUS_KEY.TERMINATED) {
    return "bg-red-50 text-red-700 ring-red-200";
  }

  return "bg-slate-100 text-slate-600 ring-slate-200";
};

export const EmployeeStatusPill = ({ status, statusName }) => {
  const colorClass = getEmployeeStatusClass(status, statusName);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${colorClass}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-75" />
      {getEmployeeStatusLabel(status, statusName)}
    </span>
  );
};

export const EmployeeAvatar = ({ employee, isSelected = false, size = "md" }) => {
  const photoUrl =
    employee?.profilePhotoUrl ?? employee?.photoUrl ?? employee?.imageUrl;
  const sizeClass = size === "lg" ? "h-14 w-14 rounded-2xl" : "h-10 w-10 rounded-xl";

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt=""
        className={`${sizeClass} shrink-0 border border-slate-200 object-cover`}
      />
    );
  }

  return (
    <div
      className={[
        "flex shrink-0 items-center justify-center font-bold",
        sizeClass,
        size === "lg" ? "text-base" : "text-sm",
        isSelected ? "bg-brand text-white" : "bg-slate-100 text-slate-600",
      ].join(" ")}
    >
      {getEmployeeInitials(employee)}
    </div>
  );
};

const EmployeeList = ({
  activeFilterCount = 0,
  actions,
  departmentOptions,
  designationOptions,
  employees,
  error,
  isLoading,
  onCreate,
  onClear,
  onPageChange,
  onPageSizeChange,
  onRetry,
  onSelect,
  pageNumber,
  pageSize,
  selectedId,
  totalCount,
  totalPages,
}) => {
  if (!isLoading && (error || employees.length === 0)) {
    const variant = activeFilterCount > 0 ? "filtered" : "empty";

    return (
      <HrEmptyState
        context="Employee profiles connect people to departments, shifts, attendance, leave, and payroll."
        icon={UserRound}
        error={error}
        errorTitle="Couldn't load employees"
        title={
          variant === "filtered"
            ? "No employees match these filters"
            : "No employees yet"
        }
        description={
          variant === "filtered"
            ? "Clear the current filters to see all employees."
            : "Create the first employee profile to begin using HR."
        }
        onRetry={onRetry}
        variant={variant}
        action={
          variant === "filtered" ? (
            <AppButton variant="secondary" onClick={onClear}>
              Clear filters
            </AppButton>
          ) : actions.canCreate ? (
            <AppButton className="mt-5 h-10" onClick={onCreate}>
              <Plus aria-hidden="true" className="h-4 w-4" />
              Add Employee
            </AppButton>
          ) : undefined
        }
      />
    );
  }

  return (
    <div className="flex h-full min-h-[560px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">Employee List</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Select a profile to view HR details.
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        <div className="grid gap-3 md:hidden">
          {isLoading
            ? Array.from({ length: 5 }, (_, index) => (
                <MobileRecordCardSkeleton key={index} fields={3} />
              ))
            : employees.map((employee, index) => (
                <MobileRecordCard
                  key={
                    getHrRecordId(employee, "employee") ??
                    employee.employeeCode
                  }
                  serial={(pageNumber - 1) * pageSize + index + 1}
                  title={getEmployeeName(employee)}
                  subtitle={employee.employeeCode ?? "-"}
                  status={
                    <EmployeeStatusPill
                      status={employee.status}
                      statusName={employee.statusName}
                    />
                  }
                  fields={[
                    {
                      key: "designation",
                      label: "Designation",
                      value: getLookupLabel(
                        designationOptions,
                        employee.designationId,
                        employee.designationName ?? "-",
                      ),
                    },
                    {
                      key: "department",
                      label: "Department",
                      value: getLookupLabel(
                        departmentOptions,
                        employee.departmentId,
                        employee.departmentName ?? "-",
                      ),
                    },
                  ]}
                  footer={
                    <button
                      type="button"
                      className="inline-flex min-h-11 items-center text-sm font-medium text-brand"
                      onClick={() => onSelect(employee)}
                    >
                      View profile
                    </button>
                  }
                />
              ))}
        </div>

        <div className="hidden md:block">
          {isLoading
            ? Array.from({ length: 5 }, (_, index) => (
                <div
                  key={index}
                  className="mb-2 h-20 animate-pulse rounded-xl bg-slate-100"
                />
              ))
            : employees.map((employee) => {
              const id = getHrRecordId(employee, "employee");
              const isSelected = String(id) === String(selectedId);

              return (
                <button
                  key={id ?? employee.employeeCode}
                  type="button"
                  onClick={() => onSelect(employee)}
                  className={[
                    "mb-2 flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition-colors",
                    isSelected
                      ? "border-brand/30 bg-brand-light"
                      : "border-transparent hover:bg-slate-50",
                  ].join(" ")}
                >
                  <EmployeeAvatar employee={employee} isSelected={isSelected} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {getEmployeeName(employee)}
                        </p>
                        <p className="mt-0.5 truncate font-mono text-xs font-medium text-slate-500">
                          {employee.employeeCode ?? "-"}
                        </p>
                      </div>
                      <EmployeeStatusPill
                        status={employee.status}
                        statusName={employee.statusName}
                      />
                    </div>
                    <p className="mt-2 truncate text-xs text-slate-500">
                      {getLookupLabel(
                        designationOptions,
                        employee.designationId,
                        employee.designationName ?? "-",
                      )}
                      {" - "}
                      {getLookupLabel(
                        departmentOptions,
                        employee.departmentId,
                        employee.departmentName ?? "-",
                      )}
                    </p>
                  </div>
                </button>
              );
              })}
        </div>
      </div>

      <HrPagination
        disabled={isLoading}
        itemLabel="employees"
        itemCount={employees.length}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        pageNumber={pageNumber}
        pageSize={pageSize}
        totalCount={totalCount}
        totalPages={totalPages}
      />
    </div>
  );
};

export default EmployeeList;
