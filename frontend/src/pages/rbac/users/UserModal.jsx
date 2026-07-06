import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import { LockKeyhole, Mail, RotateCcw, ShieldCheck, User, X } from "lucide-react";
import { memo, useEffect, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import AppSelect from "../../../components/common/AppSelect";

const inputClassName =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500";

const userSchema = (mode) =>
  z.object({
    username:
      mode === "create"
        ? z.string().min(2, "Username is required")
        : z.string().optional(),
    email: z.string().email("Enter a valid email address"),
    fullName: z.string().min(2, "Full name is required"),
    password:
      mode === "create"
        ? z.string().min(8, "Password must be at least 8 characters")
        : z.string().optional(),
    isActive: z.boolean(),
    roleId: z.string().min(1, "Role is required"),
  });

const normalizeLookupValue = (value) => {
  return String(value ?? "").trim().toLowerCase();
};

const getPrimaryRole = (user) => {
  if (Array.isArray(user?.roles) && user.roles.length > 0) {
    return user.roles[0];
  }

  if (user?.role && typeof user.role === "object") {
    return user.role;
  }

  const roleId = user?.roleId ?? user?.roleID ?? user?.role_id;
  const roleName =
    user?.roleName ??
    user?.roleLabel ??
    (typeof user?.role === "string" ? user.role : undefined);

  if (roleId !== undefined || roleName !== undefined) {
    return {
      id: roleId ?? roleName,
      name: roleName ?? roleId,
    };
  }

  return null;
};

const getPrimaryRoleId = (user, roleOptions = []) => {
  const role = getPrimaryRole(user);
  const roleId = role?.id;
  const roleName = role?.name ?? role?.roleName ?? role?.label;
  const normalizedRoleId = normalizeLookupValue(roleId);
  const normalizedRoleName = normalizeLookupValue(roleName);
  const matchedRole = roleOptions.find((option) => {
    const optionId = normalizeLookupValue(option.id);
    const optionName = normalizeLookupValue(option.name);

    return (
      (normalizedRoleId && optionId === normalizedRoleId) ||
      (normalizedRoleName && optionName === normalizedRoleName) ||
      (normalizedRoleId && optionName === normalizedRoleId)
    );
  });

  if (matchedRole?.id !== undefined && matchedRole.id !== null) {
    return String(matchedRole.id);
  }

  return roleId === undefined || roleId === null ? "" : String(roleId);
};

const getDefaultValues = (user, mode, roleId = "") => ({
  username: mode === "create" ? "" : user?.username ?? "",
  email: user?.email ?? "",
  fullName: user?.fullName ?? "",
  password: "",
  isActive: user?.isActive ?? true,
  roleId,
});

const FieldError = ({ error }) => {
  if (!error) {
    return null;
  }

  return <p className="mt-1.5 text-xs font-medium text-red-600">{error}</p>;
};

const UserModal = ({
  isLoading,
  isOpen,
  isRolesLoading,
  mode = "create",
  onClose,
  onRetryRoles,
  onSubmit,
  roleOptions = [],
  rolesError,
  user,
}) => {
  const isEdit = mode === "edit";
  const schema = useMemo(() => userSchema(mode), [mode]);
  const defaultRoleId = useMemo(
    () => getPrimaryRoleId(user, roleOptions),
    [roleOptions, user],
  );

  const {
    control,
    handleSubmit,
    register,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: getDefaultValues(user, mode, defaultRoleId),
  });

  useEffect(() => {
    if (isOpen) {
      reset(getDefaultValues(user, mode, defaultRoleId));
    }
  }, [defaultRoleId, isOpen, mode, reset, user]);

  const submitForm = (values) => {
    const selectedRole = roleOptions.find((role) => {
      return String(role.id) === String(values.roleId);
    });
    const roleId = selectedRole?.id ?? values.roleId;
    const payload = isEdit
      ? {
          email: values.email,
          fullName: values.fullName,
          isActive: values.isActive,
          roleId,
        }
      : {
          username: values.username,
          email: values.email,
          fullName: values.fullName,
          password: values.password,
          isActive: values.isActive,
          roleId,
        };

    return onSubmit(payload);
  };

  const submitDisabled =
    isSubmitting || isRolesLoading || Boolean(rolesError) || roleOptions.length === 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-3 py-4 backdrop-blur-sm sm:px-4 sm:py-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={onClose}
        >
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-labelledby="user-modal-title"
            className="flex max-h-[calc(100dvh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl sm:max-h-[calc(100dvh-3rem)]"
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex shrink-0 items-start justify-between border-b border-slate-200 px-5 py-4 sm:px-6 sm:py-5">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-light text-brand">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h2
                    id="user-modal-title"
                    className="text-lg font-bold tracking-tight text-slate-950"
                  >
                    {isEdit ? "Edit User" : "Create User"}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {isEdit
                      ? "Update account details and role."
                      : "Create account identity and access together."}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-800"
                aria-label="Close user modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {isLoading ? (
              <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto px-5 py-5 sm:grid-cols-2 sm:px-6 sm:py-6">
                {Array.from({ length: 6 }, (_, index) => (
                  <div
                    key={index}
                    className="h-12 animate-pulse rounded-xl bg-slate-100"
                  />
                ))}
              </div>
            ) : (
              <form
                className="flex min-h-0 flex-1 flex-col"
                onSubmit={handleSubmit(submitForm)}
              >
                <div className="grid min-h-0 flex-1 gap-5 overflow-y-auto px-5 py-5 sm:grid-cols-2 sm:px-6">
                  <div>
                    <label
                      htmlFor="username"
                      className="mb-1.5 block text-xs font-semibold text-slate-700"
                    >
                      Username *
                    </label>
                    <div className="relative">
                      <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        id="username"
                        disabled={isEdit}
                        className={`${inputClassName} pl-9`}
                        placeholder="system-admin"
                        {...register("username")}
                      />
                    </div>
                    <FieldError error={errors.username?.message} />
                  </div>

                  <div>
                    <Controller
                      name="roleId"
                      control={control}
                      render={({ field }) => (
                        <AppSelect
                          id="roleId"
                          label="Role"
                          required
                          disabled={isRolesLoading || Boolean(rolesError)}
                          error={errors.roleId?.message}
                          value={field.value}
                          onBlur={field.onBlur}
                          onChange={field.onChange}
                          placeholder={
                            isRolesLoading ? "Loading roles..." : "Select role"
                          }
                          options={roleOptions.map((role) => ({
                            value: String(role.id),
                            label: role.name,
                          }))}
                        />
                      )}
                    />
                    {rolesError && (
                      <div className="mt-2 flex items-center justify-between gap-2 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700 ring-1 ring-inset ring-red-100">
                        <span>{rolesError}</span>
                        <button
                          type="button"
                          onClick={onRetryRoles}
                          className="inline-flex items-center gap-1 font-bold"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Retry
                        </button>
                      </div>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="email"
                      className="mb-1.5 block text-xs font-semibold text-slate-700"
                    >
                      Email *
                    </label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        id="email"
                        type="email"
                        className={`${inputClassName} pl-9`}
                        placeholder="admin@example.com"
                        {...register("email")}
                      />
                    </div>
                    <FieldError error={errors.email?.message} />
                  </div>

                  <div>
                    <label
                      htmlFor="fullName"
                      className="mb-1.5 block text-xs font-semibold text-slate-700"
                    >
                      Full Name *
                    </label>
                    <input
                      id="fullName"
                      className={inputClassName}
                      placeholder="System Admin"
                      {...register("fullName")}
                    />
                    <FieldError error={errors.fullName?.message} />
                  </div>

                  {!isEdit && (
                    <div className="sm:col-span-2">
                      <label
                        htmlFor="password"
                        className="mb-1.5 block text-xs font-semibold text-slate-700"
                      >
                        Password *
                      </label>
                      <div className="relative">
                        <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          id="password"
                          type="password"
                          className={`${inputClassName} pl-9`}
                          placeholder="Minimum 8 characters"
                          {...register("password")}
                        />
                      </div>
                      <FieldError error={errors.password?.message} />
                    </div>
                  )}

                  <label className="sm:col-span-2 flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <span>
                      <span className="block text-sm font-semibold text-slate-900">
                        Active account
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-500">
                        Active users can access COSMOS ERP after login.
                      </span>
                    </span>
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-brand"
                      {...register("isActive")}
                    />
                  </label>
                </div>

                <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-slate-200 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitDisabled}
                    className="inline-flex h-10 items-center justify-center rounded-xl bg-brand px-4 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-dark active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isSubmitting
                      ? "Saving..."
                      : isEdit
                        ? "Save Changes"
                        : "Create User"}
                  </button>
                </div>
              </form>
            )}
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default memo(UserModal);
