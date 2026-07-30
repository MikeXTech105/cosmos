import { Building2, Plus } from "lucide-react";

import AppButton from "../../../components/common/AppButton";
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
  actions,
  departments,
  error,
  isLoading,
  onCreate,
  onPageChange,
  onPageSizeChange,
  onRetry,
  pageNumber,
  pageSize,
  totalCount,
  totalPages,
}) => {
  if (!isLoading && (error || departments.length === 0)) {
    return (
      <HrEmptyState
        icon={Building2}
        error={error}
        title="No departments found"
        description="Create the first HR department or adjust the current filters."
        onRetry={onRetry}
        action={
          actions.canCreate && (
            <AppButton className="mt-5 h-10" onClick={onCreate}>
              <Plus className="h-4 w-4" />
              Add Department
            </AppButton>
          )
        }
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[840px] table-fixed text-left">
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
                <th
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
                      <td className="border-b border-slate-100 px-4 py-3.5 text-xs font-semibold tabular-nums text-slate-400">
                        {(pageNumber - 1) * pageSize + index + 1}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-light text-brand">
                            <Building2 className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-900">
                              {department.departmentName ?? "-"}
                            </p>
                            <p className="truncate text-xs text-slate-400">
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
