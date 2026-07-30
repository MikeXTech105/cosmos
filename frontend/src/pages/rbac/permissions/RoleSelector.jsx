import { RefreshCw, ShieldCheck } from "lucide-react";

import AppSelect from "../../../components/common/AppSelect";

const RoleSelector = ({
  error,
  isDisabled,
  isLoading,
  onChange,
  onRetry,
  roles,
  selectedRoleId,
}) => {
  const selectedRole = roles.find((role) => {
    return String(role.id) === String(selectedRoleId);
  });

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-light text-brand">
            <ShieldCheck aria-hidden="true" className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-950">Role access profile</h2>
            <p className="mt-0.5 text-xs leading-5 text-slate-500">
              Select a role to review and update its page permissions.
            </p>
          </div>
        </div>

        <div className="w-full lg:max-w-sm">
          <label
            htmlFor="permissionRole"
            className="mb-1.5 block text-xs font-semibold text-slate-700"
          >
            Role
          </label>
          <div className="flex gap-2">
            <AppSelect
              id="permissionRole"
              value={selectedRoleId}
              onChange={onChange}
              disabled={isDisabled || isLoading || Boolean(error)}
              placeholder={isLoading ? "Loading roles..." : "Select Role"}
              options={roles.map((role) => ({
                value: String(role.id),
                label: role.name,
              }))}
              className="min-w-0 flex-1"
              label="Role"
            />
            {error && (
              <button
                type="button"
                onClick={onRetry}
                aria-label="Retry loading roles"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-600 transition-colors hover:bg-red-100"
              >
                <RefreshCw aria-hidden="true" className="h-4 w-4" />
              </button>
            )}
          </div>
          {error ? (
            <p className="mt-1.5 text-xs font-medium text-red-600">{error}</p>
          ) : selectedRole ? (
            <p className="mt-1.5 truncate text-xs text-slate-500">
              Editing permissions for{" "}
              <span className="font-semibold text-slate-700">
                {selectedRole.name}
              </span>
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
};

export default RoleSelector;
