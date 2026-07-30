import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import { FolderTree, X } from "lucide-react";
import { createElement, memo, useEffect, useMemo, useRef } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import AppInput from "../../../components/common/AppInput";
import AppSelect from "../../../components/common/AppSelect";
import { getIconComponent } from "../../../config/iconMap";
import { applyApiErrorsToForm } from "../../../utils/formApiErrors";
import { activateDialogFocus } from "../../../utils/focus";
import {
  getDescendantIds,
  normalizePageNumberBlurValue,
  normalizePageNumberInput,
  PAGE_ICON_OPTIONS,
} from "./pageHelpers";

const checkboxClassName = "h-4 w-4 rounded border-slate-300 accent-brand";
const PAGE_FIELDS = [
  "name", "displayName", "route", "icon", "parentPageId", "sortOrder", "isActive",
];

const buildPageSchema = (blockedParentIds) => {
  return z
    .object({
      name: z.string().trim().min(1, "Name is required"),
      displayName: z.string().trim().min(1, "Display name is required"),
      route: z
        .string()
        .trim()
        .min(1, "Route is required")
        .regex(
          /^\/[A-Za-z0-9/_-]*$/,
          "Route must start with / and contain valid URL characters",
        ),
      icon: z.string().trim().min(1, "Icon is required"),
      parentPageId: z.string(),
      sortOrder: z
        .string()
        .trim()
        .regex(/^\d+$/, "Sort order must be a whole number"),
      isActive: z.boolean(),
    })
    .superRefine((values, context) => {
      if (
        values.parentPageId &&
        blockedParentIds.has(String(values.parentPageId))
      ) {
        context.addIssue({
          code: "custom",
          message: "Parent cannot be this page or one of its descendants.",
          path: ["parentPageId"],
        });
      }
    });
};

const getDefaultValues = ({ initialParentId, page }) => {
  return {
    name: page?.name ?? "",
    displayName: page?.displayName ?? "",
    route: page?.route ?? "",
    icon: page?.icon ?? "pages",
    parentPageId: page?.parentPageId
      ? String(page.parentPageId)
      : initialParentId
        ? String(initialParentId)
        : "",
    sortOrder: String(page?.sortOrder ?? 0),
    isActive: page?.isActive ?? true,
  };
};

const ModalSkeleton = () => {
  return (
    <div className="grid gap-4 px-5 py-5 sm:grid-cols-2 sm:px-6 sm:py-6">
      {Array.from({ length: 8 }, (_, index) => (
        <div key={index} className="h-12 animate-pulse rounded-xl bg-slate-100" />
      ))}
    </div>
  );
};

const PageFormModal = ({
  initialParentId = "",
  isLoading = false,
  isOpen,
  mode = "create",
  onClose,
  onSubmit,
  page,
  pages = [],
}) => {
  const isView = mode === "view";
  const isEdit = mode === "edit";
  const dialogRef = useRef(null);
  const blockedParentIds = useMemo(() => {
    const blockedIds = page?.id ? getDescendantIds(pages, page.id) : new Set();

    if (page?.id) {
      blockedIds.add(String(page.id));
    }

    return blockedIds;
  }, [page, pages]);
  const schema = useMemo(
    () => buildPageSchema(blockedParentIds),
    [blockedParentIds],
  );
  const defaultValues = useMemo(
    () => getDefaultValues({ initialParentId, page }),
    [initialParentId, page],
  );

  const {
    control,
    handleSubmit,
    register,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues,
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (isOpen) {
      reset(defaultValues);
    }
  }, [defaultValues, isOpen, reset]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    return activateDialogFocus(dialogRef.current, { onEscape: onClose });
  }, [isOpen, onClose]);

  const selectedIcon = useWatch({ control, name: "icon" });
  const availableParents = useMemo(() => {
    return pages
      .filter((option) => {
        return !blockedParentIds.has(String(option.id));
      })
      .sort((first, second) =>
        first.displayName.localeCompare(second.displayName),
      );
  }, [blockedParentIds, pages]);

  const submitForm = async (values) => {
    try {
      await onSubmit(values);
    } catch (error) {
      applyApiErrorsToForm({
        error,
        fieldAliases: { parentPageId: "parentId" },
        formFieldNames: PAGE_FIELDS,
        setError,
      });
    }
  };

  const title = isView ? "View Page" : isEdit ? "Edit Page" : "Add Page";
  const description = isView
    ? "Review this page record and hierarchy placement."
    : isEdit
      ? "Update display, route, icon, parent, sort order, and status."
      : "Create a page record for an application screen.";

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
            aria-labelledby="page-form-modal-title"
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
                    id="page-form-modal-title"
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
                aria-label="Close page form"
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>

            {isLoading ? (
              <ModalSkeleton />
            ) : (
              <form
                noValidate
                className="flex min-h-0 flex-1 flex-col"
                onSubmit={handleSubmit(submitForm)}
              >
                <div className="grid min-h-0 flex-1 gap-5 overflow-y-auto px-5 py-5 sm:grid-cols-2 sm:px-6">
                  {errors.root?.server?.message && (
                    <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2">
                      {errors.root.server.message}
                    </p>
                  )}
                  <AppInput
                    id="pageName"
                    label="Name"
                    required
                    placeholder="rbac-pages"
                    readOnly={isEdit}
                    disabled={isView}
                    error={errors.name?.message}
                    className={[
                      "font-mono",
                      isEdit ? "bg-slate-50 text-slate-500" : "",
                    ].join(" ")}
                    {...register("name")}
                  />

                  <AppInput
                    id="pageDisplayName"
                    label="Display Name"
                    required
                    placeholder="Pages"
                    disabled={isView}
                    error={errors.displayName?.message}
                    {...register("displayName")}
                  />

                  <div className="sm:col-span-2">
                    <AppInput
                      id="pageRoute"
                      label="Route"
                      required
                      placeholder="/rbac/pages"
                      disabled={isView}
                      title={isView ? "Open edit mode to change page status" : undefined}
                      error={errors.route?.message}
                      className="font-mono"
                      {...register("route")}
                    />
                  </div>

                  <Controller
                    control={control}
                    name="icon"
                    render={({ field }) => (
                      <AppSelect
                        ref={field.ref}
                        name={field.name}
                        id="pageIcon"
                        label="Icon"
                        required
                        disabled={isView}
                        error={errors.icon?.message}
                        options={PAGE_ICON_OPTIONS}
                        value={field.value}
                        onBlur={field.onBlur}
                        onChange={field.onChange}
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
                        {selectedIcon || "pages"}
                      </span>
                    </span>
                  </div>

                  <Controller
                    control={control}
                    name="parentPageId"
                    render={({ field }) => (
                      <AppSelect
                        ref={field.ref}
                        name={field.name}
                        id="parentPageId"
                        label="Parent Page"
                        disabled={isView}
                        error={errors.parentPageId?.message}
                        options={[
                          { value: "", label: "None" },
                          ...availableParents.map((parent) => ({
                            value: String(parent.id),
                            label: parent.displayName,
                          })),
                        ]}
                        value={field.value}
                        onBlur={field.onBlur}
                        onChange={field.onChange}
                      />
                    )}
                  />

                  <Controller
                    control={control}
                    name="sortOrder"
                    render={({ field }) => (
                      <AppInput
                        id="pageSortOrder"
                        label="Sort Order"
                        inputMode="numeric"
                        disabled={isView}
                        error={errors.sortOrder?.message}
                        value={field.value}
                        onBlur={() => {
                          field.onChange(
                            normalizePageNumberBlurValue(field.value),
                          );
                          field.onBlur();
                        }}
                        onChange={(event) =>
                          field.onChange(
                            normalizePageNumberInput(event.target.value),
                          )
                        }
                      />
                    )}
                  />

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
                        Inactive records remain hidden from active workflows.
                      </span>
                    </span>
                    <input
                      type="checkbox"
                      disabled={isView}
                      title={isView ? "Open edit mode to change page status" : undefined}
                      className={checkboxClassName}
                      {...register("isActive")}
                    />
                  </label>
                </div>

                <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-slate-200 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isSubmitting}
                    title={isSubmitting ? "Wait for the page to finish saving" : undefined}
                    className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isView ? "Close" : "Cancel"}
                  </button>
                  {!isView && (
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      title={isSubmitting ? "The page is already saving" : undefined}
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

export default memo(PageFormModal);
