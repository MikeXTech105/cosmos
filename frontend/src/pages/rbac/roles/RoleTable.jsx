import { ShieldCheck } from "lucide-react";
import { memo } from "react";

import CommonEmptyState from "../../../components/common/EmptyState";
import MobileRecordCard, {
  MobileRecordCardSkeleton,
} from "../../../components/common/MobileRecordCard";
import { formatDate } from "../../../utils/format";
import RoleActions from "./RoleActions";

const statusStyles = {
  active: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  inactive: "bg-red-50 text-red-700 ring-red-200",
};

const RoleStatusBadge = ({ isActive }) => {
  const status = isActive ? "active" : "inactive";

  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset",
        statusStyles[status],
      ].join(" ")}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-75" />
      {isActive ? "Active" : "Inactive"}
    </span>
  );
};

const TableSkeleton = () => {
  return Array.from({ length: 5 }, (_, index) => (
    <tr key={index}>
      <td colSpan={6} className="px-4 py-3.5">
        <div className="h-4 animate-pulse rounded bg-slate-100" />
      </td>
    </tr>
  ));
};

const RoleEmptyState = ({
  activeFilterCount,
  errorMessage,
  hasError,
  onClear,
  onCreate,
  onRetry,
}) => {
  const variant = hasError
    ? "error"
    : activeFilterCount > 0
      ? "filtered"
      : "empty";

  return (
    <CommonEmptyState
      actionLabel={variant === "empty" ? "Create Role" : undefined}
      context={
        variant === "empty"
          ? "Roles group permissions into reusable access profiles."
          : undefined
      }
      hint={
        hasError
          ? errorMessage ?? "The role list could not be checked."
          : variant === "filtered"
            ? "Clear the current filters to see all roles."
            : "Create a role before inviting users."
      }
      icon={ShieldCheck}
      title={
        hasError
          ? "Couldn't load roles"
          : variant === "filtered"
            ? "No roles match these filters"
            : "No roles yet"
      }
      variant={variant}
      onAction={
        hasError
          ? onRetry
          : variant === "filtered"
            ? onClear
            : onCreate
      }
    />
  );
};

const MobileRoleCard = ({ actions, role, serialNumber }) => {
  return (
    <MobileRecordCard
      serial={serialNumber}
      title={role.name}
      subtitle={role.description || "No description provided."}
      status={<RoleStatusBadge isActive={role.isActive} />}
      fields={[
        {
          key: "created",
          label: "Created",
          value: formatDate(role.createdAt),
        },
      ]}
      actions={<RoleActions role={role} {...actions} />}
    />
  );
};

const RoleTable = ({
  activeFilterCount = 0,
  actions,
  currentPage = 1,
  errorMessage,
  hasError,
  isLoading,
  onClear,
  onCreate,
  onRetry,
  pageSize = 10,
  roles,
}) => {
  if (!isLoading && (hasError || roles.length === 0)) {
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <RoleEmptyState
          activeFilterCount={activeFilterCount}
          errorMessage={errorMessage}
          hasError={hasError}
          onClear={onClear}
          onCreate={onCreate}
          onRetry={onRetry}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="grid gap-3 md:hidden">
        {isLoading
          ? Array.from({ length: 5 }, (_, index) => (
              <MobileRecordCardSkeleton key={index} fields={1} />
            ))
          : roles.map((role, index) => (
              <MobileRoleCard
                key={role.id}
                actions={actions}
                role={role}
                serialNumber={(currentPage - 1) * pageSize + index + 1}
              />
            ))}
      </div>

      <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
        <table aria-label="Roles" className="w-full table-fixed border-separate border-spacing-0 text-left">
          <colgroup>
            <col className="w-[56px]" />
            <col className="w-[20%]" />
            <col />
            <col className="w-[13%]" />
            <col className="w-[16%]" />
            <col className="w-[148px]" />
          </colgroup>
          <thead className="sticky top-0 z-10 bg-slate-50">
            <tr>
              {[
                "#",
                "Role Name",
                "Description",
                "Status",
                "Created Date",
                "Actions",
              ].map((heading) => (
                <th scope="col" aria-label={heading === "#" ? "Row number" : undefined}
                  key={heading}
                  className={[
                    "whitespace-nowrap border-b border-slate-200 px-4 py-3.5 text-xs font-medium uppercase tracking-wide text-slate-500",
                    heading === "Actions" ? "text-right" : "",
                  ].join(" ")}
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <TableSkeleton />
            ) : (
              roles.map((role, index) => (
                <tr
                  key={role.id}
                  className="group transition-colors hover:bg-slate-50 focus-within:bg-slate-50"
                >
                  <td className="border-b border-slate-100 px-4 py-3.5 text-xs font-semibold tabular-nums text-slate-500">
                    {(currentPage - 1) * pageSize + index + 1}
                  </td>
                  <td className="border-b border-slate-100 px-4 py-3.5">
                    <p className="truncate text-sm font-semibold text-slate-950">
                      {role.name}
                    </p>
                  </td>
                  <td className="border-b border-slate-100 px-4 py-3.5">
                    <p className="truncate text-sm text-slate-600">
                      {role.description || "-"}
                    </p>
                  </td>
                  <td className="border-b border-slate-100 px-4 py-3.5">
                    <RoleStatusBadge isActive={role.isActive} />
                  </td>
                  <td className="whitespace-nowrap border-b border-slate-100 px-4 py-3.5 text-sm text-slate-500">
                    {formatDate(role.createdAt)}
                  </td>
                  <td className="border-b border-slate-100 px-3 py-3.5">
                    <RoleActions role={role} {...actions} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default memo(RoleTable);
