import { zodResolver } from "@hookform/resolvers/zod";
import { FolderKanban, Plus, RefreshCw, RotateCcw, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import { z } from "zod";

import AppButton from "../../../components/common/AppButton";
import EmptyState from "../../../components/common/EmptyState";
import AppInput from "../../../components/common/AppInput";
import AppModal from "../../../components/common/AppModal";
import AppSelect from "../../../components/common/AppSelect";
import MobileFilterSheet from "../../../components/common/MobileFilterSheet";
import ResponsiveTableRegion from "../../../components/common/ResponsiveTableRegion";
import PageHeader from "../../../components/common/PageHeader";
import useCapabilities from "../../../hooks/useCapabilities";
import { applyApiErrorsToForm } from "../../../utils/formApiErrors";
import { getApiStatus } from "../../../utils/apiError";
import {
  createExpenseCategory,
  deleteExpenseCategory,
  fetchExpenseCategories,
  setExpenseCategoryFilters,
  setExpenseCategoryPage,
  setExpenseCategoryPageSize,
  updateExpenseCategory,
} from "../../../store/slices/purchase/expenseCategorySlice";
import {
  ACTIVE_OPTIONS,
  buildListParams,
  getActionError,
  getSuccessMessage,
  isActiveRecord,
} from "../purchaseHelpers";
import {
  PurchaseConfirmDialog,
  PurchasePagination,
  PurchaseStatCard,
  PurchaseStatusPill,
} from "../PurchaseShared";

const categorySchema = z.object({
  name: z.string().trim().min(2, "Name is required"),
  description: z.string().trim().max(500, "Description is too long").optional(),
  isActive: z.boolean(),
});

const getCategoryDefaultValues = (category) => ({
  name: category?.name ?? "",
  description: category?.description ?? "",
  isActive: category?.isActive ?? true,
});

export const CategoryModal = ({ category, isOpen, mode, onClose, onSubmit }) => {
  const {
    handleSubmit,
    register,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(categorySchema),
    defaultValues: getCategoryDefaultValues(category),
  });

  useEffect(() => {
    if (isOpen) {
      reset(getCategoryDefaultValues(category));
    }
  }, [category, isOpen, reset]);

  return (
    <AppModal
      isBusy={isSubmitting}
      isOpen={isOpen}
      maxWidth="max-w-xl"
      onClose={isSubmitting ? undefined : onClose}
    >
      <h2 className="text-lg font-semibold text-slate-900">
        {mode === "edit" ? "Edit Expense Category" : "New Expense Category"}
      </h2>
      <form
        className="mt-5 space-y-4"
        onSubmit={handleSubmit(async (values) => {
          try {
            await onSubmit({
              name: values.name.trim(),
              description: values.description?.trim() || null,
              isActive: Boolean(values.isActive),
            });
          } catch (error) {
            applyApiErrorsToForm({
              error,
              formFieldNames: ["name", "description", "isActive"],
              setError,
            });
          }
        })}
      >
        {errors.root?.server?.message && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {errors.root.server.message}
          </p>
        )}
        <AppInput
          id="expenseCategoryName"
          label="Name"
          required
          error={errors.name?.message}
          {...register("name")}
        />
        <div>
          <label
            htmlFor="expenseCategoryDescription"
            className="mb-1.5 block text-xs font-semibold text-slate-700"
          >
            Description
          </label>
          <textarea
            id="expenseCategoryDescription"
            rows={4}
            className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-500 focus:border-brand focus:ring-2 focus:ring-brand/20"
            {...register("description")}
          />
          {errors.description?.message && (
            <p className="mt-1.5 text-xs font-medium text-red-600">
              {errors.description.message}
            </p>
          )}
        </div>
        <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900">
          Active category
          <input
            type="checkbox"
            className="h-4 w-4 accent-brand"
            {...register("isActive")}
          />
        </label>
        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <AppButton
            variant="secondary"
            disabled={isSubmitting}
            onClick={onClose}
          >
            Cancel
          </AppButton>
          <AppButton type="submit" isLoading={isSubmitting} loadingText="Saving…">
            Save Category
          </AppButton>
        </div>
      </form>
    </AppModal>
  );
};

const ExpenseCategoriesPage = () => {
  const dispatch = useDispatch();
  const state = useSelector((store) => store.expenseCategories);
  const capabilities = useCapabilities({
    actions: ["view", "create", "update", "delete"],
    label: "Expense Categories",
    resource: ["expenseCategories", "expenseCategory"],
    route: "/purchase/expense-categories",
  });
  const [searchInput, setSearchInput] = useState(state.filters.Search);
  const [modal, setModal] = useState({
    category: null,
    isOpen: false,
    mode: "create",
  });
  const [confirmation, setConfirmation] = useState({
    category: null,
    isLoading: false,
    isOpen: false,
  });

  const params = useMemo(
    () =>
      buildListParams({
        filters: state.filters,
        pageNumber: state.pageNumber,
        pageSize: state.pageSize,
        type: "category",
      }),
    [state.filters, state.pageNumber, state.pageSize],
  );

  const loadCategories = useCallback(
    () => dispatch(fetchExpenseCategories(params)),
    [dispatch, params],
  );

  useEffect(() => {
    void Promise.resolve().then(loadCategories);
  }, [loadCategories]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      dispatch(setExpenseCategoryFilters({ Search: searchInput }));
      dispatch(setExpenseCategoryPage(1));
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [dispatch, searchInput]);

  const stats = useMemo(
    () => ({
      active:
        state.summary?.activeCount ?? state.list.filter(isActiveRecord).length,
      inactive:
        state.summary?.inactiveCount ??
        state.list.filter((item) => !isActiveRecord(item)).length,
      total: state.summary?.totalCount ?? state.totalCount,
      metricScope: state.summaryScope,
      totalScope: "all-matching",
    }),
    [state.list, state.summary, state.summaryScope, state.totalCount],
  );

  const submitCategory = async (payload) => {
    if (
      (modal.mode === "edit" && !capabilities.canUpdate) ||
      (modal.mode !== "edit" && !capabilities.canCreate)
    ) {
      return;
    }

    try {
      const response =
        modal.mode === "edit"
          ? await dispatch(
              updateExpenseCategory({ id: modal.category.id, payload }),
            ).unwrap()
          : await dispatch(createExpenseCategory(payload)).unwrap();

      toast.success(getSuccessMessage(response, "Category saved"));
      setModal((current) => ({ ...current, isOpen: false }));
      await loadCategories();
    } catch (error) {
      if (modal.mode === "edit" && getApiStatus(error) === 404) {
        toast.error("This expense category no longer exists. The list was refreshed.");
        setModal((current) => ({ ...current, isOpen: false }));
        await loadCategories();
        return;
      }
      toast.error(getActionError(error, "Unable to save category."));
      throw error;
    }
  };

  const confirmDelete = async () => {
    if (!capabilities.canDelete || !confirmation.category) {
      return;
    }

    setConfirmation((current) => ({ ...current, isLoading: true }));

    try {
      const response = await dispatch(
        deleteExpenseCategory(confirmation.category.id),
      ).unwrap();

      toast.success(getSuccessMessage(response.response, "Category deleted"));
      setConfirmation({ category: null, isLoading: false, isOpen: false });
      await loadCategories();
    } catch (error) {
      toast.error(getActionError(error, "Unable to delete category."));
      setConfirmation((current) => ({ ...current, isLoading: false }));
    }
  };

  const hasFilters = Boolean(searchInput) || state.filters.IsActive !== "all";
  const activeFilterCount =
    Number(Boolean(searchInput)) +
    Number(state.filters.IsActive !== "all");
  const clearFilters = () => {
    setSearchInput("");
    dispatch(
      setExpenseCategoryFilters({
        Search: "",
        IsActive: "all",
        SortBy: "",
        SortDirection: "",
      }),
    );
    dispatch(setExpenseCategoryPage(1));
  };

  return (
    <section className="min-w-0 space-y-5">
      <PageHeader
        badge={
          <>
            <FolderKanban aria-hidden="true" className="h-3.5 w-3.5" />
            Purchase & Expense
          </>
        }
        title="Expense Categories"
        description="Organize expense entries into reusable categories."
        actions={
          <>
            <AppButton
              variant="secondary"
              className="h-10"
              disabled={state.loading}
              onClick={loadCategories}
            >
              <RefreshCw aria-hidden="true"
                className={`h-4 w-4 ${state.loading ? "animate-spin" : ""}`}
              />
              Refresh
            </AppButton>
            {capabilities.canCreate && (
              <AppButton
                className="h-10"
                onClick={() =>
                  setModal({ category: null, isOpen: true, mode: "create" })
                }
              >
                <Plus aria-hidden="true" className="h-4 w-4" />
                New Category
              </AppButton>
            )}
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
        <PurchaseStatCard
          icon={FolderKanban}
          label="Total"
          loading={state.loading}
          value={stats.total}
          scope={stats.totalScope}
          colorClass="bg-brand-light text-brand"
        />
        <PurchaseStatCard
          icon={FolderKanban}
          label="Active"
          loading={state.loading}
          value={stats.active}
          scope={stats.metricScope}
          colorClass="bg-emerald-50 text-emerald-600"
        />
        <PurchaseStatCard
          icon={FolderKanban}
          label="Inactive"
          loading={state.loading}
          value={stats.inactive}
          scope={stats.metricScope}
          colorClass="bg-red-50 text-red-600"
        />
      </div>

      <MobileFilterSheet activeCount={activeFilterCount} onClear={clearFilters}>
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="grid gap-3 md:grid-cols-[minmax(240px,1fr)_180px_auto]">
          <label className="relative block">
          <span className="mb-1.5 block text-xs font-semibold text-slate-700">Search</span>
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 bottom-3 h-4 w-4 text-slate-500" />
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search categories..."
              className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-500 focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </label>
          <AppSelect
            value={state.filters.IsActive}
            onChange={(value) => {
              dispatch(setExpenseCategoryFilters({ IsActive: value }));
              dispatch(setExpenseCategoryPage(1));
            }}
            options={ACTIVE_OPTIONS}
            label="Filter by status"
          />
          <AppButton
            variant="secondary"
            className="h-10 rounded-lg px-3"
            disabled={!hasFilters}
            onClick={clearFilters}
          >
            <RotateCcw aria-hidden="true" className="h-4 w-4" />
            Clear
          </AppButton>
        </div>
        </div>
      </MobileFilterSheet>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <ResponsiveTableRegion
          mobileConfig={{
            actions: 4,
            fields: [2],
            serial: 0,
            status: 3,
            title: 1,
          }}
        >
          <table className="w-full min-w-[720px] table-fixed text-left">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" aria-label="Row number" className="border-b border-slate-200 px-4 py-3 text-xs font-medium uppercase tracking-wide text-slate-500"><span aria-hidden="true">#</span></th>
                <th scope="col" className="w-[28%] border-b border-slate-200 px-4 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Name
                </th>
                <th scope="col" className="border-b border-slate-200 px-4 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Description
                </th>
                <th scope="col" className="w-32 border-b border-slate-200 px-4 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Status
                </th>
                <th scope="col" className="w-36 border-b border-slate-200 px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {state.loading ? (
                Array.from({ length: 5 }, (_, index) => (
                  <tr key={index}>
                    <td colSpan={5} className="px-4 py-3">
                      <div className="h-4 animate-pulse rounded bg-slate-100" />
                    </td>
                  </tr>
                ))
              ) : state.error || state.list.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="p-0"
                  >
                    <EmptyState
                      actionLabel={!state.error && !hasFilters ? "New Category" : undefined}
                      context={
                        !state.error && !hasFilters
                          ? "Expense categories organize operating costs for entry and reporting."
                          : undefined
                      }
                      hint={
                        state.error
                          ? state.error
                          : hasFilters
                            ? "Clear the current filters to see all expense categories."
                            : "Create a category before recording your first expense."
                      }
                      icon={FolderKanban}
                      title={
                        state.error
                          ? "Couldn't load expense categories"
                          : hasFilters
                            ? "No expense categories match these filters"
                            : "No expense categories yet"
                      }
                      variant={
                        state.error ? "error" : hasFilters ? "filtered" : "empty"
                      }
                      onAction={
                        state.error
                          ? loadCategories
                          : hasFilters
                            ? clearFilters
                            : capabilities.canCreate
                              ? () =>
                                  setModal({
                                    category: null,
                                    isOpen: true,
                                    mode: "create",
                                  })
                              : undefined
                      }
                    />
                  </td>
                </tr>
              ) : (
                state.list.map((category, index) => (
                  <tr key={category.id} className="hover:bg-slate-50">
                    <td className="border-b border-slate-100 px-4 py-3.5 text-xs font-semibold tabular-nums text-slate-500">
                      {(state.pageNumber - 1) * state.pageSize + index + 1}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-900">
                      {category.name}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-500">
                      {category.description || "-"}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3">
                      <PurchaseStatusPill
                        meta={
                          isActiveRecord(category)
                            ? {
                                label: "Active",
                                className:
                                  "bg-emerald-50 text-emerald-700 ring-emerald-200",
                              }
                            : {
                                label: "Inactive",
                                className: "bg-red-50 text-red-700 ring-red-200",
                              }
                        }
                      />
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-0.5">
                        {capabilities.canUpdate && (
                          <AppButton
                            variant="secondary"
                            className="h-8 rounded-lg px-3"
                            onClick={() =>
                              setModal({
                                category,
                                isOpen: true,
                                mode: "edit",
                              })
                            }
                          >
                            Edit
                          </AppButton>
                        )}
                        {capabilities.canDelete && (
                          <AppButton
                            variant="danger"
                            className="h-8 rounded-lg px-3"
                            onClick={() =>
                              setConfirmation({
                                category,
                                isLoading: false,
                                isOpen: true,
                              })
                            }
                          >
                            Delete
                          </AppButton>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </ResponsiveTableRegion>

        <PurchasePagination
          disabled={state.loading}
          itemCount={state.list.length}
          itemLabel="categories"
          onPageChange={(value) => dispatch(setExpenseCategoryPage(value))}
          onPageSizeChange={(value) =>
            dispatch(setExpenseCategoryPageSize(value))
          }
          pageNumber={state.pageNumber}
          pageSize={state.pageSize}
          totalCount={state.totalCount}
          totalPages={state.totalPages}
        />
      </div>

      <CategoryModal
        category={modal.category}
        isOpen={modal.isOpen}
        mode={modal.mode}
        onClose={() => setModal((current) => ({ ...current, isOpen: false }))}
        onSubmit={submitCategory}
      />

      <PurchaseConfirmDialog
        confirmLabel="Delete"
        description={`${confirmation.category?.name ?? "This category"} will be deleted.`}
        isLoading={confirmation.isLoading}
        isOpen={confirmation.isOpen}
        title="Delete 1 expense category?"
        tone="danger"
        onCancel={() =>
          setConfirmation({
            category: null,
            isLoading: false,
            isOpen: false,
          })
        }
        onConfirm={confirmDelete}
      />
    </section>
  );
};

export default ExpenseCategoriesPage;
