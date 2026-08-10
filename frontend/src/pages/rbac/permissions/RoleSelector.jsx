import { RefreshCw, ShieldCheck, UserRoundCog } from "lucide-react";

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
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="grid gap-4 px-4 py-4 sm:px-5 md:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] md:items-center">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand ring-1 ring-inset ring-brand/10">
            <UserRoundCog className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-950">
              Role access profile
            </h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Select a role to review and update its page permissions.
            </p>
          </div>
        </div>

        <div className="min-w-0">
          <AppSelect
            aria-label="Role to configure"
            disabled={isDisabled || isLoading || Boolean(error)}
            emptyMessage="No roles available"
            label="Role"
            options={roles.map((role) => ({
              label: role.name,
              value: role.id,
            }))}
            placeholder={isLoading ? "Loading roles..." : "Select a role"}
            value={selectedRoleId}
            onChange={onChange}
          />
          <p className="mt-2 flex items-center gap-2 text-[11px] text-slate-500">
            <span
              className={[
                "h-1.5 w-1.5 rounded-full",
                selectedRole ? "bg-emerald-500" : "bg-slate-300",
              ].join(" ")}
            />
            {selectedRole ? (
              <>
                Editing permissions for
                <span className="font-semibold text-slate-700">
                  {selectedRole.name}
                </span>
              </>
            ) : (
              "Select a role to open the permission matrix"
            )}
          </p>
        </div>
      </div>

      {error && (
        <div className="flex flex-col gap-3 border-t border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <span className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            {error}
          </span>
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex h-8 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-3 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </button>
        </div>
      )}
    </section>
  );
};

export default RoleSelector;
