import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import { FolderTree, Route, X } from "lucide-react";
import { createElement, memo, useEffect, useMemo, useRef } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import AppSelect from "../../../components/common/AppSelect";
import { getIconComponent } from "../../../config/iconMap";
import { activateDialogFocus } from "../../../utils/focus";

const inputClassName =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-500 focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500";

const ICON_OPTIONS = [
  "LayoutDashboard",
  "Users",
  "UserCog",
  "ShieldCheck",
  "FolderTree",
  "FileText",
  "Settings",
  "Package",
  "ShoppingCart",
  "Boxes",
  "Contact",
  "Store",
  "Warehouse",
];

const pageSchema = z.object({
  name: z.string().trim().min(2, "Name is required"),
  displayName: z.string().trim().min(2, "Display name is required"),
  route: z
    .string()
    .trim()
    .min(1, "Route is required")
    .regex(
      /^\/[A-Za-z0-9/_-]*$/,
      "Route must start with / and contain valid URL characters",
    ),
  icon: z.string().min(1, "Icon is required"),
  parentPageId: z.string(),
  sortOrder: z.number().min(0, "Sort order cannot be negative"),
  isActive: z.boolean(),
});

const getDefaultValues = (page) => ({
  name: page?.name ?? "",
  displayName: page?.displayName ?? "",
  route: page?.route ?? "",
  icon: page?.icon ?? "LayoutDashboard",
  parentPageId: page?.parentPageId ? String(page.parentPageId) : "",
  sortOrder: page?.sortOrder ?? 0,
  isActive: page?.isActive ?? true,
});

const FieldError = ({ error, id }) => {
  return error ? (
    <p
      id={id}
      role="alert"
      className="mt-1.5 text-xs font-medium text-red-600"
    >
      {error}
    </p>
  ) : null;
};

const serializeId = (value) => {
  if (!value) {
    return 0;
  }

  const numericValue = Number(value);

  return Number.isNaN(numericValue) ? value : numericValue;
};

const getBlockedParentIds = (parentOptions, pageId) => {
  const blockedIds = new Set(pageId ? [String(pageId)] : []);
  let foundDescendant = true;

  while (foundDescendant) {
    foundDescendant = false;

    parentOptions.forEach((parent) => {
      const parentId = String(parent.id);
      const ancestorId = parent.parentPageId
        ? String(parent.parentPageId)
        : null;

      if (
        ancestorId &&
        blockedIds.has(ancestorId) &&
        !blockedIds.has(parentId)
      ) {
        blockedIds.add(parentId);
        foundDescendant = true;
      }
    });
  }

  return blockedIds;
};

const PageModal = ({
  isLoading,
  isOpen,
  isParentsLoading,
  mode = "create",
  onClose,
  onRetryParents,
  onSubmit,
  page,
  parentOptions = [],
  parentsError,
}) => {
  const isView = mode === "view";
  const isEdit = mode === "edit";
  const dialogRef = useRef(null);

  const {
    control,
    handleSubmit,
    register,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(pageSchema),
    defaultValues: getDefaultValues(page),
  });

  useEffect(() => {
    if (isOpen) {
      reset(getDefaultValues(page));
    }
  }, [isOpen, page, reset]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    return activateDialogFocus(dialogRef.current, { onEscape: onClose });
  }, [isOpen, onClose]);

  const selectedIcon = useWatch({ control, name: "icon" });
  const availableParents = useMemo(() => {
    const blockedParentIds = getBlockedParentIds(parentOptions, page?.id);

    return parentOptions.filter((parent) => {
      return !blockedParentIds.has(String(parent.id));
    });
  }, [page?.id, parentOptions]);

  const submitForm = (values) => {
    return onSubmit({
      displayName: values.displayName,
      icon: values.icon,
      isActive: values.isActive,
      name: values.name,
      parentPageId: serializeId(values.parentPageId),
      route: values.route,
      sortOrder: values.sortOrder,
    });
  };

  const title = isView ? "View Page" : isEdit ? "Edit Page" : "Create Page";
  const description = isView
    ? "Review the page record and hierarchy."
    : isEdit
      ? "Update the page record and hierarchy."
      : "Create a backend page record for a current or future module.";

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
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="page-modal-title"
            className="flex max-h-[calc(100dvh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl sm:max-h-[calc(100dvh-3rem)]"
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex shrink-0 items-start justify-between border-b border-slate-200 px-5 py-4 sm:px-6 sm:py-5">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-light text-brand">
                  <FolderTree aria-hidden="true" className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h2
                    id="page-modal-title"
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
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
                aria-label="Close page modal"
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>

            {isLoading ? (
              <div className="grid gap-4 px-5 py-5 sm:grid-cols-2 sm:px-6 sm:py-6">
                {Array.from({ length: 7 }, (_, index) => (
                  <div
                    key={index}
                    className="h-12 animate-pulse rounded-xl bg-slate-100"
                  />
                ))}
              </div>
            ) : (
              <form
                noValidate
                className="flex min-h-0 flex-1 flex-col"
                onSubmit={handleSubmit(submitForm)}
              >
                <div className="grid min-h-0 flex-1 gap-5 overflow-y-auto px-5 py-5 sm:grid-cols-2 sm:px-6">
                  <div>
                    <label htmlFor="pageName" className="mb-1.5 block text-xs font-semibold text-slate-700">
                      Name *
                    </label>
                    <input
                      id="pageName"
                      required
                      aria-invalid={Boolean(errors.name) || undefined}
                      aria-describedby={
                        errors.name ? "page-name-error" : undefined
                      }
                      disabled={isView}
                      title={isView ? "Open edit mode to change the page name" : undefined}
                      className={inputClassName}
                      placeholder="customers"
                      {...register("name")}
                    />
                    <FieldError
                      id="page-name-error"
                      error={errors.name?.message}
                    />
                  </div>
                  <div>
                    <label htmlFor="pageDisplayName" className="mb-1.5 block text-xs font-semibold text-slate-700">
                      Display Name *
                    </label>
                    <input
                      id="pageDisplayName"
                      required
                      aria-invalid={Boolean(errors.displayName) || undefined}
                      aria-describedby={
                        errors.displayName
                          ? "page-display-name-error"
                          : undefined
                      }
                      disabled={isView}
                      title={isView ? "Open edit mode to change the display name" : undefined}
                      className={inputClassName}
                      placeholder="Customers"
                      {...register("displayName")}
                    />
                    <FieldError
                      id="page-display-name-error"
                      error={errors.displayName?.message}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="pageRoute" className="mb-1.5 block text-xs font-semibold text-slate-700">
                      Route *
                    </label>
                    <div className="relative">
                      <Route aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                      <input
                        id="pageRoute"
                        required
                        aria-invalid={Boolean(errors.route) || undefined}
                        aria-describedby={
                          errors.route ? "page-route-error" : undefined
                        }
                        disabled={isView}
                        title={isView ? "Open edit mode to change the route" : undefined}
                        className={`${inputClassName} pl-9 font-mono`}
                        placeholder="/customers"
                        {...register("route")}
                      />
                    </div>
                    <FieldError
                      id="page-route-error"
                      error={errors.route?.message}
                    />
                  </div>
                  <Controller
                    name="icon"
                    control={control}
                    render={({ field }) => (
                      <AppSelect
                        ref={field.ref}
                        name={field.name}
                        id="pageIcon"
                        label="Icon"
                        required
                        disabled={isView}
                        error={errors.icon?.message}
                        value={field.value}
                        onBlur={field.onBlur}
                        onChange={field.onChange}
                        options={ICON_OPTIONS}
                      />
                    )}
                  />
                  <div className="flex min-h-16 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand">
                      {createElement(getIconComponent(selectedIcon), {
                        "aria-hidden": true,
                        className: "h-5 w-5",
                      })}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                        Icon Preview
                      </span>
                      <span className="mt-0.5 block truncate text-sm font-semibold text-slate-800">
                        {selectedIcon}
                      </span>
                    </span>
                  </div>
                  <div>
                    <Controller
                      name="parentPageId"
                      control={control}
                      render={({ field }) => (
                        <AppSelect
                          ref={field.ref}
                          name={field.name}
                          id="parentPageId"
                          label="Parent Page"
                          disabled={
                            isView ||
                            isParentsLoading ||
                            Boolean(parentsError)
                          }
                          value={field.value}
                          onBlur={field.onBlur}
                          onChange={field.onChange}
                          placeholder={
                            isParentsLoading ? "Loading pages..." : "No Parent"
                          }
                          options={[
                            {
                              value: "",
                              label: isParentsLoading
                                ? "Loading pages..."
                                : "No Parent",
                            },
                            ...availableParents.map((parent) => ({
                              value: String(parent.id),
                              label: parent.displayName,
                            })),
                          ]}
                        />
                      )}
                    />
                    {parentsError && (
                      <div
                        role="alert"
                        className="mt-2 flex items-center justify-between gap-2 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700 ring-1 ring-inset ring-red-100"
                      >
                        <span>{parentsError}</span>
                        <button type="button" onClick={onRetryParents} className="font-bold">
                          Retry
                        </button>
                      </div>
                    )}
                  </div>
                  <div>
                    <label htmlFor="sortOrder" className="mb-1.5 block text-xs font-semibold text-slate-700">
                      Sort Order
                    </label>
                    <input
                      id="sortOrder"
                      type="number"
                      min="0"
                      aria-invalid={Boolean(errors.sortOrder) || undefined}
                      aria-describedby={
                        errors.sortOrder ? "sort-order-error" : undefined
                      }
                      disabled={isView}
                      title={isView ? "Open edit mode to change the sort order" : undefined}
                      className={inputClassName}
                      {...register("sortOrder", { valueAsNumber: true })}
                    />
                    <FieldError
                      id="sort-order-error"
                      error={errors.sortOrder?.message}
                    />
                  </div>
                  <label
                    className={[
                      "sm:col-span-2 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3",
                      isView ? "cursor-default" : "cursor-pointer",
                    ].join(" ")}
                  >
                    <span>
                      <span className="block text-sm font-semibold text-slate-900">
                        Active page record
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-500">
                        Navigation release is managed separately.
                      </span>
                    </span>
                    <input
                      type="checkbox"
                      disabled={isView}
                      title={isView ? "Open edit mode to change page status" : undefined}
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
                      disabled={isSubmitting || isParentsLoading}
                      title={
                        isSubmitting
                          ? "The page is already saving"
                          : isParentsLoading
                            ? "Wait for parent pages to finish loading"
                            : undefined
                      }
                      className="inline-flex h-10 items-center justify-center rounded-xl bg-brand px-4 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-dark active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isSubmitting
                        ? "Saving..."
                        : isEdit
                          ? "Save Changes"
                          : "Create Page"}
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

export default memo(PageModal);
