import { Plus, RefreshCw, ShieldCheck } from "lucide-react";
import { memo } from "react";

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

const formatDate = (value) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const TableSkeleton = () => {
  return Array.from({ length: 6 }, (_, index) => (
    <tr key={index}>
      <td colSpan={6} className="px-4 py-3.5">
        <div className="h-11 animate-pulse rounded-xl bg-slate-100" />
      </td>
    </tr>
  ));
};

const EmptyState = ({ errorMessage, hasError, onCreate, onRetry }) => {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-light text-brand">
        <ShieldCheck className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-base font-bold text-slate-950">
        {hasError ? "Unable to load roles" : "No roles found"}
      </h3>
      <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">
        {hasError
          ? errorMessage ?? "Something went wrong while loading roles."
          : "Create the first role or adjust your filters to find an access profile."}
      </p>
      <div className="mt-5">
        {hasError ? (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        ) : onCreate ? (
          <button
            type="button"
            onClick={onCreate}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-dark active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            Create Role
          </button>
        ) : null}
      </div>
    </div>
  );
};

const MobileRoleCard = ({ actions, role, serialNumber }) => {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <span className="shrink-0 text-xs font-semibold tabular-nums text-slate-400">
              #{serialNumber}
            </span>
            <p className="truncate text-sm font-bold text-slate-950">
              {role.name}
            </p>
          </div>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">
            {role.description || "No description provided."}
          </p>
        </div>
        <RoleActions role={role} {...actions} />
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <RoleStatusBadge isActive={role.isActive} />
        <span className="text-xs text-slate-500">
          Created {formatDate(role.createdAt)}
        </span>
      </div>
    </article>
  );
};

const RoleTable = ({
  actions,
  currentPage = 1,
  errorMessage,
  hasError,
  isLoading,
  onCreate,
  onRetry,
  pageSize = 10,
  roles,
}) => {
  if (!isLoading && (hasError || roles.length === 0)) {
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <EmptyState
          errorMessage={errorMessage}
          hasError={hasError}
          onCreate={onCreate}
          onRetry={onRetry}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="grid gap-3 lg:hidden">
        {isLoading
          ? Array.from({ length: 4 }, (_, index) => (
              <div
                key={index}
                className="h-40 animate-pulse rounded-2xl bg-slate-100"
              />
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

      <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:block">
        <table className="w-full table-fixed border-separate border-spacing-0 text-left">
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
                <th
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
                  <td className="border-b border-slate-100 px-4 py-3.5 text-xs font-semibold tabular-nums text-slate-400">
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
