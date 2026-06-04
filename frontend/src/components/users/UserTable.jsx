import { Plus, RefreshCw, UsersRound } from "lucide-react";

import UserActions from "./UserActions";
import UserStatusBadge from "./UserStatusBadge";

const getInitials = (name = "") => {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
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
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const RolePills = ({ roles }) => {
  if (!roles?.length) {
    return <span className="text-sm text-slate-400">No role</span>;
  }

  return (
    <div className="flex max-w-[260px] flex-wrap gap-1.5">
      {roles.slice(0, 2).map((role) => (
        <span
          key={role.id ?? role.name}
          className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-100"
        >
          {role.name}
        </span>
      ))}

      {roles.length > 2 && (
        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
          +{roles.length - 2}
        </span>
      )}
    </div>
  );
};

const TableSkeleton = () => {
  return Array.from({ length: 6 }, (_, index) => (
    <tr key={index}>
      <td colSpan={8} className="px-5 py-4">
        <div className="h-12 animate-pulse rounded-2xl bg-slate-100" />
      </td>
    </tr>
  ));
};

const EmptyState = ({ onCreate, onRetry, hasError, errorMessage }) => {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
        <UsersRound className="h-6 w-6" />
      </div>

      <h3 className="mt-4 text-base font-bold text-slate-950">
        {hasError ? "Unable to load users" : "No users found"}
      </h3>
      <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">
        {hasError
          ? errorMessage ?? "Something went wrong while loading users."
          : "Create the first user or adjust your filters to find a specific account."}
      </p>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        {hasError ? (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        ) : (
          <button
            type="button"
            onClick={onCreate}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Create User
          </button>
        )}
      </div>
    </div>
  );
};

const MobileUserCard = ({ user, actions }) => {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
            {getInitials(user.fullName || user.username)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-950">
              {user.fullName || user.username}
            </p>
            <p className="truncate text-xs text-slate-500">@{user.username}</p>
          </div>
        </div>

        <UserActions user={user} {...actions} />
      </div>

      <div className="mt-4 grid gap-3 text-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
            Email
          </p>
          <p className="mt-1 truncate text-slate-700">{user.email}</p>
        </div>
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
            Role
          </p>
          <RolePills roles={user.roles} />
        </div>
        <div className="flex items-center justify-between gap-3">
          <UserStatusBadge isActive={user.isActive} />
          <span className="text-xs text-slate-500">
            Created {formatDate(user.createdAt)}
          </span>
        </div>
      </div>
    </article>
  );
};

const UserTable = ({
  actions,
  errorMessage,
  hasError,
  isLoading,
  onCreate,
  onRetry,
  users,
}) => {
  if (!isLoading && (hasError || users.length === 0)) {
    return (
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <EmptyState
          hasError={hasError}
          errorMessage={errorMessage}
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
          : users.map((user) => (
              <MobileUserCard key={user.id} user={user} actions={actions} />
            ))}
      </div>

      <div className="hidden overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm lg:block">
        <div className="overflow-x-auto">
          <table className="min-w-[1120px] border-separate border-spacing-0 text-left">
            <thead className="sticky top-0 z-10 bg-slate-50">
              <tr>
                {[
                  "Avatar",
                  "Username",
                  "Full Name",
                  "Email",
                  "Role",
                  "Status",
                  "Created Date",
                  "Actions",
                ].map((heading) => (
                  <th
                    key={heading}
                    className="whitespace-nowrap border-b border-slate-100 px-5 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400"
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
                users.map((user) => (
                  <tr
                    key={user.id}
                    className="group transition-colors hover:bg-slate-50/80"
                  >
                    <td className="border-b border-slate-100 px-5 py-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white shadow-sm">
                        {getInitials(user.fullName || user.username)}
                      </div>
                    </td>
                    <td className="border-b border-slate-100 px-5 py-4">
                      <p className="text-sm font-semibold text-slate-950">
                        {user.username}
                      </p>
                    </td>
                    <td className="border-b border-slate-100 px-5 py-4 text-sm font-medium text-slate-700">
                      {user.fullName || "-"}
                    </td>
                    <td className="border-b border-slate-100 px-5 py-4 text-sm text-slate-600">
                      {user.email}
                    </td>
                    <td className="border-b border-slate-100 px-5 py-4">
                      <RolePills roles={user.roles} />
                    </td>
                    <td className="border-b border-slate-100 px-5 py-4">
                      <UserStatusBadge isActive={user.isActive} />
                    </td>
                    <td className="border-b border-slate-100 px-5 py-4 text-sm text-slate-500">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="border-b border-slate-100 px-5 py-4">
                      <UserActions user={user} {...actions} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UserTable;
