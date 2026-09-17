import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, FolderTree, Save } from "lucide-react";
import { createElement, useEffect, useMemo } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";

import AppButton from "../../../components/common/AppButton";
import AppInput from "../../../components/common/AppInput";
import AppSelect from "../../../components/common/AppSelect";
import PageHeader from "../../../components/common/PageHeader";
import { getIconComponent } from "../../../config/iconMap";
import useCapabilities from "../../../hooks/useCapabilities";
import {
  createRbacPage,
  fetchRbacPageById,
  fetchRbacPages,
  updateRbacPage,
} from "../../../store/slices/rbac/pageSlice";
import { applyApiErrorsToForm } from "../../../utils/formApiErrors";
import {
  getDescendantIds,
  getPageErrorMessage,
  normalizePageNumberBlurValue,
  normalizePageNumberInput,
  PAGE_ICON_OPTIONS,
  toCreatePagePayload,
  toUpdatePagePayload,
} from "./pageHelpers";

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
        .regex(/^\/[A-Za-z0-9/_-]*$/, "Route must start with / and contain valid URL characters"),
      icon: z.string().trim().min(1, "Icon is required"),
      parentPageId: z.string(),
      sortOrder: z.string().trim().regex(/^\d+$/, "Sort order must be a whole number"),
      isActive: z.boolean(),
    })
    .superRefine((values, context) => {
      if (values.parentPageId && blockedParentIds.has(String(values.parentPageId))) {
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
    parentPageId: page?.parentPageId ? String(page.parentPageId) : initialParentId ? String(initialParentId) : "",
    sortOrder: String(page?.sortOrder ?? 0),
    isActive: page?.isActive ?? true,
  };
};

const PageFormPage = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const initialParentId = searchParams.get("parentId") ?? "";
  const isEdit = Boolean(id);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const capabilities = useCapabilities({ label: "Pages", resource: "pages", route: "/rbac/pages" });
  const isView = isEdit && !capabilities.canUpdate;

  const pages = useSelector((state) => state.rbacPages.list);
  const detailLoading = useSelector((state) => state.rbacPages.detailLoading);
  const detailError = useSelector((state) => state.rbacPages.detailError);
  const detailPage = useSelector((state) => state.rbacPages.selected);

  const blockedParentIds = useMemo(() => {
    const blockedIds = isEdit && id ? getDescendantIds(pages, id) : new Set();

    if (isEdit && id) {
      blockedIds.add(String(id));
    }

    return blockedIds;
  }, [id, isEdit, pages]);
  const schema = useMemo(() => buildPageSchema(blockedParentIds), [blockedParentIds]);
  const availableParents = useMemo(() => {
    return pages
      .filter((option) => !blockedParentIds.has(String(option.id)))
      .sort((first, second) => first.displayName.localeCompare(second.displayName));
  }, [blockedParentIds, pages]);

  const {
    control,
    handleSubmit,
    register,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: getDefaultValues({ initialParentId, page: null }),
  });

  useEffect(() => {
    if (pages.length === 0) {
      void dispatch(fetchRbacPages());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isEdit) {
      return undefined;
    }

    const request = dispatch(fetchRbacPageById(id));

    request.unwrap().catch((error) => {
      if (error?.name !== "AbortError") {
        toast.error(getPageErrorMessage(error, "Unable to load this page."));
      }
    });

    return () => request.abort();
  }, [dispatch, id, isEdit]);

  useEffect(() => {
    if (isEdit && detailPage && String(detailPage.id) === String(id)) {
      reset(getDefaultValues({ initialParentId, page: detailPage }));
    }
  }, [detailPage, id, initialParentId, isEdit, reset]);

  const selectedIcon = useWatch({ control, name: "icon" });

  const saveDisabledReason = (isEdit ? capabilities.canUpdate : capabilities.canCreate)
    ? ""
    : `You need ${isEdit ? "edit" : "create"} permission for pages.`;

  const submitForm = async (values) => {
    if (saveDisabledReason) {
      toast.error(saveDisabledReason);
      return;
    }

    try {
      if (isEdit) {
        await dispatch(updateRbacPage({ id, payload: toUpdatePagePayload(values) })).unwrap();
        toast.success("Page updated successfully");
      } else {
        await dispatch(createRbacPage(toCreatePagePayload(values))).unwrap();
        toast.success("Page created successfully");
      }

      navigate("/rbac/pages");
    } catch (error) {
      applyApiErrorsToForm({
        error,
        fieldAliases: { parentPageId: "parentId" },
        formFieldNames: PAGE_FIELDS,
        setError,
      });
      toast.error(getPageErrorMessage(error, isEdit ? "Unable to update page." : "Unable to create page."));
    }
  };

  const title = isView ? "View page" : isEdit ? "Edit page" : "Add page";
  const description = isView
    ? "Review this page record and hierarchy placement."
    : isEdit
      ? "Update display, route, icon, parent, sort order, and status."
      : "Create a page record for an application screen.";

  if (isEdit && detailError) {
    return (
      <div className="space-y-5">
        <PageHeader badge={<><FolderTree className="h-3.5 w-3.5" /> RBAC / Page Management</>} title={title} />
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{detailError}</div>
        <AppButton variant="secondary" onClick={() => navigate("/rbac/pages")}>
          <ArrowLeft className="h-4 w-4" /> Back to pages
        </AppButton>
      </div>
    );
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit(submitForm)} noValidate>
      <PageHeader
        badge={<><FolderTree className="h-3.5 w-3.5" /> RBAC / Page Management</>}
        title={title}
        description={description}
        actions={
          <>
            <AppButton variant="secondary" onClick={() => navigate("/rbac/pages")}>
              <ArrowLeft className="h-4 w-4" /> Back
            </AppButton>
            {!isView && (
              <AppButton type="submit" isLoading={isSubmitting} loadingText="Saving…" disabled={Boolean(saveDisabledReason)} title={saveDisabledReason || undefined}>
                <Save className="h-4 w-4" /> {isEdit ? "Save changes" : "Create page"}
              </AppButton>
            )}
          </>
        }
      />

      {isEdit && detailLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 8 }, (_, index) => (
            <div key={index} className="h-14 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      ) : (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          {errors.root?.server?.message && (
            <p role="alert" className="mb-5 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {errors.root.server.message}
            </p>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            <AppInput
              id="pageName"
              label="Name"
              required
              placeholder="rbac-pages"
              readOnly={isEdit}
              disabled={isView}
              error={errors.name?.message}
              className={["font-mono", isEdit ? "bg-slate-50 text-slate-500" : ""].join(" ")}
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
                {createElement(getIconComponent(selectedIcon), { className: "h-5 w-5" })}
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">Icon Preview</span>
                <span className="mt-0.5 block truncate text-sm font-semibold text-slate-800">{selectedIcon || "pages"}</span>
              </span>
            </div>

            <Controller
              control={control}
              name="parentPageId"
              render={({ field }) => (
                <AppSelect
                  id="parentPageId"
                  label="Parent Page"
                  disabled={isView}
                  error={errors.parentPageId?.message}
                  options={[
                    { value: "", label: "None" },
                    ...availableParents.map((parent) => ({ value: String(parent.id), label: parent.displayName })),
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
                    field.onChange(normalizePageNumberBlurValue(field.value));
                    field.onBlur();
                  }}
                  onChange={(event) => field.onChange(normalizePageNumberInput(event.target.value))}
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
                <span className="block text-sm font-semibold text-slate-900">Active page record</span>
                <span className="mt-0.5 block text-xs text-slate-500">Inactive records remain hidden from active workflows.</span>
              </span>
              <input type="checkbox" disabled={isView} className="h-4 w-4 rounded border-slate-300 accent-brand" {...register("isActive")} />
            </label>
          </div>
        </section>
      )}

      {!isView && (
        <div className="sticky bottom-4 flex flex-col-reverse gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-lg sm:flex-row sm:justify-end">
          <AppButton variant="secondary" disabled={isSubmitting} onClick={() => navigate("/rbac/pages")}>
            Cancel
          </AppButton>
          <AppButton type="submit" isLoading={isSubmitting} loadingText="Saving…" disabled={Boolean(saveDisabledReason)} title={saveDisabledReason || undefined}>
            {isEdit ? "Save Changes" : "Create Page"}
          </AppButton>
        </div>
      )}
    </form>
  );
};

export default PageFormPage;
