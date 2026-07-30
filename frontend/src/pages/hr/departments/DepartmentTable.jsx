import { Building2, Plus } from "lucide-react";

import AppButton from "../../../components/common/AppButton";
import MobileRecordCard, {
  MobileRecordCardSkeleton,
} from "../../../components/common/MobileRecordCard";
import {
  formatHrDate,
  getHrBoolean,
  getHrRecordId,
} from "../hrHelpers";
import {
  HrEmptyState,
  HrPagination,
  HrStatusPill,
} from "../HrShared";
import DepartmentActions from "./DepartmentActions";

const DepartmentTable = ({
  activeFilterCount = 0,
  actions,
  departments,
  error,
  isLoading,
  onCreate,
  onClear,
  onPageChange,
  onPageSizeChange,
  onRetry,
  pageNumber,
  pageSize,
  totalCount,
  totalPages,
}) => {
  if (!isLoading && (error || departments.length === 0)) {
    const variant = activeFilterCount > 0 ? "filtered" : "empty";

    return (
      <HrEmptyState
        context="Departments organize employees, reporting, and workforce metrics."
        icon={Building2}
        error={error}
        errorTitle="Couldn't load departments"
        title={
          variant === "filtered"
            ? "No departments match these filters"
            : "No departments yet"
        }
        description={
          variant === "filtered"
            ? "Clear the current filters to see all departments."
            : "Create the first HR department to organize your team."
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
              Add Department
            </AppButton>
          ) : undefined
        }
      />
    );
  }

  return (
    <div className="overflow-hidden md:rounded-2xl md:border md:border-slate-200 md:bg-white md:shadow-sm">
      <div className="grid gap-3 pb-3 md:hidden">
        {isLoading
          ? Array.from({ length: 5 }, (_, index) => (
              <MobileRecordCardSkeleton key={index} fields={3} />
            ))
          : departments.map((department, index) => (
              <MobileRecordCard
                key={getHrRecordId(department, "department") ?? index}
                serial={(pageNumber - 1) * pageSize + index + 1}
                title={department.departmentName ?? "-"}
                subtitle={department.description || "HR department"}
                status={
                  <HrStatusPill
                    isActive={getHrBoolean(department.isActive)}
                  />
                }
                fields={[
                  {
                    key: "code",
                    label: "Code",
                    value: department.departmentCode ?? "-",
                  },
                  {
                    key: "created",
                    label: "Created",
                    value: formatHrDate(department.createdAt),
                  },
                ]}
                actions={
                  <DepartmentActions department={department} {...actions} />
                }
              />
            ))}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table aria-label="Departments" className="w-full min-w-[840px] table-fixed text-left">
          <thead className="bg-slate-50">
            <tr>
              {[
                "#",
                "Department",
                "Code",
                "Description",
                "Status",
                "Created Date",
                "Actions",
              ].map((heading) => (
                <th scope="col" aria-label={heading === "#" ? "Row number" : undefined}
                  key={heading}
                  className={[
                    "border-b border-slate-200 px-4 py-3.5 text-xs font-medium uppercase tracking-wide text-slate-500",
                    heading === "Actions" ? "text-right" : "",
                  ].join(" ")}
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 5 }, (_, index) => (
                  <tr key={index}>
                    <td colSpan={7} className="px-4 py-3">
                      <div className="h-4 animate-pulse rounded bg-slate-100" />
                    </td>
                  </tr>
                ))
              : departments.map((department, index) => {
                  const id = getHrRecordId(department, "department");

                  return (
                    <tr
                      key={id ?? department.departmentCode}
                      className="transition-colors hover:bg-slate-50"
                    >
                      <td className="border-b border-slate-100 px-4 py-3.5 text-xs font-semibold tabular-nums text-slate-500">
                        {(pageNumber - 1) * pageSize + index + 1}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-light text-brand">
                            <Building2 aria-hidden="true" className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-900">
                              {department.departmentName ?? "-"}
                            </p>
                            <p className="truncate text-xs text-slate-500">
                              HR department
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3.5">
                        <span className="font-mono text-xs font-semibold text-slate-600">
                          {department.departmentCode ?? "-"}
                        </span>
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3.5">
                        <p className="max-w-md truncate text-sm text-slate-500">
                          {department.description || "-"}
                        </p>
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3.5">
                        <HrStatusPill
                          isActive={getHrBoolean(department.isActive)}
                        />
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3.5 text-sm text-slate-500">
                        {formatHrDate(department.createdAt)}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-3.5">
                        <DepartmentActions
                          department={department}
                          {...actions}
                        />
                      </td>
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </div>

      <HrPagination
        disabled={isLoading}
        itemLabel="departments"
        itemCount={departments.length}
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

export default DepartmentTable;
