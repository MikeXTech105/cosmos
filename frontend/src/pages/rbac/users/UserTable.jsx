import { UsersRound } from "lucide-react";
import { memo } from "react";

import CommonEmptyState from "../../../components/common/EmptyState";
import MobileRecordCard, {
  MobileRecordCardSkeleton,
} from "../../../components/common/MobileRecordCard";
import { formatDate } from "../../../utils/format";
import UserActions from "./UserActions";

const statusStyles = {
  active: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  inactive: "bg-red-50 text-red-700 ring-red-200",
};

const UserStatusBadge = ({ isActive }) => {
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

const RolePills = ({ roles }) => {
  if (!roles?.length) {
    return (
      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
        No role
      </span>
    );
  }

  return (
    <div className="flex min-w-0 flex-wrap gap-1.5">
      {roles.slice(0, 1).map((role) => (
        <span
          key={role.id ?? role.name}
          className="inline-flex max-w-full items-center truncate rounded-full bg-brand-light px-2.5 py-1 text-xs font-semibold text-brand ring-1 ring-inset ring-brand/10"
        >
          {role.name}
        </span>
      ))}

      {roles.length > 1 && (
        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
          +{roles.length - 1}
        </span>
      )}
    </div>
  );
};

const TableSkeleton = () => {
  return Array.from({ length: 5 }, (_, index) => (
    <tr key={index}>
      <td colSpan={8} className="px-4 py-3.5">
        <div className="h-4 animate-pulse rounded bg-slate-100" />
      </td>
    </tr>
  ));
};

const UserEmptyState = ({
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
      actionLabel={variant === "empty" ? "Create User" : undefined}
      context={
        variant === "empty"
          ? "Users are the people who can sign in and work in COSMOS."
          : undefined
      }
      hint={
        hasError
          ? errorMessage ?? "The user list could not be checked."
          : variant === "filtered"
            ? "Clear the current filters to see all users."
            : "Invite a user and assign a role to get your team started."
      }
      icon={UsersRound}
      title={
        hasError
          ? "Couldn't load users"
          : variant === "filtered"
            ? "No users match these filters"
            : "No users yet"
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

const MobileUserCard = ({ actions, serialNumber, user }) => {
  return (
    <MobileRecordCard
      serial={serialNumber}
      title={user.fullName || user.username}
      subtitle={`@${user.username}`}
      status={<UserStatusBadge isActive={user.isActive} />}
      fields={[
        { key: "email", label: "Email", value: user.email, fullWidth: true },
        { key: "role", label: "Role", value: <RolePills roles={user.roles} /> },
        {
          key: "created",
          label: "Created",
          value: formatDate(user.createdAt),
        },
      ]}
      actions={<UserActions user={user} {...actions} />}
    />
  );
};

const UserTable = ({
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
  users,
}) => {
  if (!isLoading && (hasError || users.length === 0)) {
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <UserEmptyState
          activeFilterCount={activeFilterCount}
          hasError={hasError}
          errorMessage={errorMessage}
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
              <MobileRecordCardSkeleton key={index} fields={3} />
            ))
          : users.map((user, index) => (
              <MobileUserCard
                key={user.id}
                actions={actions}
                serialNumber={(currentPage - 1) * pageSize + index + 1}
                user={user}
              />
            ))}
      </div>

      <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
        <table aria-label="Users" className="w-full table-fixed border-separate border-spacing-0 text-left">
          <colgroup>
            <col className="w-[56px]" />
            <col className="w-[13%]" />
            <col className="w-[17%]" />
            <col />
            <col className="w-[13%]" />
            <col className="w-[11%]" />
            <col className="w-[15%]" />
            <col className="w-[112px]" />
          </colgroup>
          <thead className="sticky top-0 z-10 bg-slate-50">
            <tr>
              {[
                "#",
                "Username",
                "Full Name",
                "Email",
                "Role",
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
              users.map((user, index) => (
                <tr
                  key={user.id}
                  className="group transition-colors hover:bg-slate-50 focus-within:bg-slate-50"
                >
                  <td className="border-b border-slate-100 px-4 py-3.5 text-xs font-semibold tabular-nums text-slate-500">
                    {(currentPage - 1) * pageSize + index + 1}
                  </td>
                  <td className="border-b border-slate-100 px-4 py-3.5">
                    <p className="truncate text-sm font-semibold text-slate-950">
                      {user.username}
                    </p>
                  </td>
                  <td className="border-b border-slate-100 px-4 py-3.5">
                    <p className="truncate text-sm font-medium text-slate-700">
                      {user.fullName || "-"}
                    </p>
                  </td>
                  <td className="border-b border-slate-100 px-4 py-3.5">
                    <p className="truncate text-sm text-slate-600">
                      {user.email}
                    </p>
                  </td>
                  <td className="border-b border-slate-100 px-4 py-3.5">
                    <RolePills roles={user.roles} />
                  </td>
                  <td className="border-b border-slate-100 px-4 py-3.5">
                    <UserStatusBadge isActive={user.isActive} />
                  </td>
                  <td className="whitespace-nowrap border-b border-slate-100 px-4 py-3.5 text-sm text-slate-500">
                    {formatDate(user.createdAt)}
                  </td>
                  <td className="border-b border-slate-100 px-3 py-3.5">
                    <UserActions user={user} {...actions} />
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

export default memo(UserTable);
