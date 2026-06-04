import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import { LockKeyhole, Mail, RotateCcw, ShieldCheck, User, X } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const inputClassName =
  "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500";

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

const getPrimaryRoleId = (user) => {
  const roleId = user?.roles?.[0]?.id;

  return roleId === undefined || roleId === null ? "" : String(roleId);
};

const getDefaultValues = (user, mode) => ({
  username: mode === "create" ? "" : user?.username ?? "",
  email: user?.email ?? "",
  fullName: user?.fullName ?? "",
  password: "",
  isActive: user?.isActive ?? true,
  roleId: getPrimaryRoleId(user),
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

  const {
    handleSubmit,
    register,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: getDefaultValues(user, mode),
  });

  useEffect(() => {
    if (isOpen) {
      reset(getDefaultValues(user, mode));
    }
  }, [isOpen, mode, reset, user]);

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
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4 py-6 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={onClose}
        >
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-labelledby="user-modal-title"
            className="w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_30px_100px_rgba(15,23,42,0.22)]"
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
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
              <div className="grid gap-4 px-6 py-6 sm:grid-cols-2">
                {Array.from({ length: 6 }, (_, index) => (
                  <div
                    key={index}
                    className="h-12 animate-pulse rounded-xl bg-slate-100"
                  />
                ))}
              </div>
            ) : (
              <form onSubmit={handleSubmit(submitForm)}>
                <div className="grid gap-5 px-6 py-5 sm:grid-cols-2">
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
                    <label
                      htmlFor="roleId"
                      className="mb-1.5 block text-xs font-semibold text-slate-700"
                    >
                      Role *
                    </label>
                    <select
                      id="roleId"
                      disabled={isRolesLoading || Boolean(rolesError)}
                      className={inputClassName}
                      {...register("roleId")}
                    >
                      <option value="">
                        {isRolesLoading ? "Loading roles..." : "Select role"}
                      </option>
                      {roleOptions.map((role) => (
                        <option key={role.id} value={String(role.id)}>
                          {role.name}
                        </option>
                      ))}
                    </select>
                    <FieldError error={errors.roleId?.message} />
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

                  <label className="sm:col-span-2 flex cursor-pointer items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
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
                      className="h-4 w-4 accent-blue-600"
                      {...register("isActive")}
                    />
                  </label>
                </div>

                <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50 px-6 py-4 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitDisabled}
                    className="inline-flex h-10 items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
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

export default UserModal;
