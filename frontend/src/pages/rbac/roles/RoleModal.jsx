import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import { ShieldCheck, X } from "lucide-react";
import { memo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { applyApiErrorsToForm } from "../../../utils/formApiErrors";

const inputClassName =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500";

const roleSchema = z.object({
  name: z.string().trim().min(2, "Role name is required"),
  description: z.string().trim().max(500, "Description is too long").optional(),
  isActive: z.boolean(),
});

const getDefaultValues = (role) => ({
  name: role?.name ?? "",
  description: role?.description ?? "",
  isActive: role?.isActive ?? true,
});
const ROLE_FIELDS = Object.keys(getDefaultValues());

const FieldError = ({ error }) => {
  if (!error) {
    return null;
  }

  return <p className="mt-1.5 text-xs font-medium text-red-600">{error}</p>;
};

const RoleModal = ({
  isLoading,
  isOpen,
  mode = "create",
  onClose,
  onSubmit,
  role,
}) => {
  const isView = mode === "view";
  const isEdit = mode === "edit";

  const {
    handleSubmit,
    register,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(roleSchema),
    defaultValues: getDefaultValues(role),
  });

  useEffect(() => {
    if (isOpen) {
      reset(getDefaultValues(role));
    }
  }, [isOpen, reset, role]);

  const submitForm = async (values) => {
    try {
      await onSubmit({
        description: values.description ?? "",
        isActive: values.isActive,
        name: values.name,
      });
    } catch (error) {
      applyApiErrorsToForm({ error, formFieldNames: ROLE_FIELDS, setError });
    }
  };

  const title = isView ? "View Role" : isEdit ? "Edit Role" : "Create Role";
  const description = isView
    ? "Review the role profile and current access status."
    : isEdit
      ? "Update the role profile and availability."
      : "Create a reusable role for COSMOS ERP access.";

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
            aria-labelledby="role-modal-title"
            className="flex max-h-[calc(100dvh-2rem)] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl sm:max-h-[calc(100dvh-3rem)]"
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
                    id="role-modal-title"
                    className="text-lg font-bold tracking-tight text-slate-950"
                  >
                    {title}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">{description}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-800"
                aria-label="Close role modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {isLoading ? (
              <div className="space-y-4 px-5 py-5 sm:px-6 sm:py-6">
                {Array.from({ length: 3 }, (_, index) => (
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
                <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
                  {errors.root?.server?.message && (
                    <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                      {errors.root.server.message}
                    </p>
                  )}
                  <div>
                    <label
                      htmlFor="roleName"
                      className="mb-1.5 block text-xs font-semibold text-slate-700"
                    >
                      Role Name *
                    </label>
                    <input
                      id="roleName"
                      disabled={isView}
                      className={inputClassName}
                      placeholder="Operations Manager"
                      {...register("name")}
                    />
                    <FieldError error={errors.name?.message} />
                  </div>

                  <div>
                    <label
                      htmlFor="roleDescription"
                      className="mb-1.5 block text-xs font-semibold text-slate-700"
                    >
                      Description
                    </label>
                    <textarea
                      id="roleDescription"
                      disabled={isView}
                      rows={4}
                      className={`${inputClassName} h-auto min-h-28 resize-y py-3`}
                      placeholder="Describe the responsibilities and access profile."
                      {...register("description")}
                    />
                    <FieldError error={errors.description?.message} />
                  </div>

                  <label
                    className={[
                      "flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3",
                      isView ? "cursor-default" : "cursor-pointer",
                    ].join(" ")}
                  >
                    <span>
                      <span className="block text-sm font-semibold text-slate-900">
                        Active role
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-500">
                        Active roles can be assigned to platform users.
                      </span>
                    </span>
                    <input
                      type="checkbox"
                      disabled={isView}
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
                    {isView ? "Close" : "Cancel"}
                  </button>
                  {!isView && (
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="inline-flex h-10 items-center justify-center rounded-xl bg-brand px-4 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-dark active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isSubmitting
                        ? "Saving..."
                        : isEdit
                          ? "Save Changes"
                          : "Create Role"}
                    </button>
                  )}
                </div>
              </form>
            )}
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default memo(RoleModal);
