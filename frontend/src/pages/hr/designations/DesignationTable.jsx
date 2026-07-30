import { BadgeCheck, Building2, Plus } from "lucide-react";

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
import DesignationActions from "./DesignationActions";

const getDepartmentLabel = (designation, departmentLabels) => {
  const departmentId = designation.departmentId;

  return (
    designation.departmentName ??
    designation.department?.departmentName ??
    designation.department?.name ??
    departmentLabels.get(String(departmentId)) ??
    "-"
  );
};

const DesignationTable = ({
  actions,
  departmentLabels,
  designations,
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
  if (!isLoading && (error || designations.length === 0)) {
    return (
      <HrEmptyState
        icon={BadgeCheck}
        error={error}
        title="No designations found"
        description="Create the first HR designation or adjust the current filters."
        onRetry={onRetry}
        action={
          actions.canCreate && (
            <AppButton className="mt-5 h-10" onClick={onCreate}>
              <Plus className="h-4 w-4" />
              Add Designation
            </AppButton>
          )
        }
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] table-fixed text-left">
          <thead className="bg-slate-50">
            <tr>
              {[
                "#",
                "Designation",
                "Code",
                "Department",
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
              : designations.map((designation, index) => {
                  const id = getHrRecordId(designation, "designation");

                  return (
                    <tr
                      key={id ?? designation.designationCode}
                      className="transition-colors hover:bg-slate-50"
                    >
                      <td className="border-b border-slate-100 px-4 py-3.5 text-xs font-semibold tabular-nums text-slate-400">
                        {(pageNumber - 1) * pageSize + index + 1}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-light text-brand">
                            <BadgeCheck className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-900">
                              {designation.designationName ?? "-"}
                            </p>
                            <p className="truncate text-xs text-slate-400">
                              {designation.description || "HR role title"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3.5">
                        <span className="font-mono text-xs font-semibold text-slate-600">
                          {designation.designationCode ?? "-"}
                        </span>
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3.5">
                        <span className="inline-flex items-center gap-2 text-sm text-slate-600">
                          <Building2 className="h-4 w-4 text-slate-400" />
                          {getDepartmentLabel(designation, departmentLabels)}
                        </span>
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3.5">
                        <HrStatusPill
                          isActive={getHrBoolean(designation.isActive)}
                        />
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3.5 text-sm text-slate-500">
                        {formatHrDate(designation.createdAt)}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-3.5">
                        <DesignationActions
                          designation={designation}
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
        itemLabel="designations"
        itemCount={designations.length}
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

export default DesignationTable;
