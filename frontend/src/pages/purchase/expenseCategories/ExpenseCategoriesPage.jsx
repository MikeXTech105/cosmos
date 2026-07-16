import { zodResolver } from "@hookform/resolvers/zod";
import { FolderKanban, Plus, RefreshCw, RotateCcw, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import { z } from "zod";

import AppButton from "../../../components/common/AppButton";
import AppInput from "../../../components/common/AppInput";
import AppModal from "../../../components/common/AppModal";
import AppSelect from "../../../components/common/AppSelect";
import PageHeader from "../../../components/common/PageHeader";
import useCapabilities from "../../../hooks/useCapabilities";
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
      isOpen={isOpen}
      maxWidth="max-w-xl"
      onClose={isSubmitting ? undefined : onClose}
    >
      <h2 className="text-lg font-semibold text-slate-900">
        {mode === "edit" ? "Edit Expense Category" : "New Expense Category"}
      </h2>
      <form
        className="mt-5 space-y-4"
        onSubmit={handleSubmit((values) =>
          onSubmit({
            name: values.name.trim(),
            description: values.description?.trim() || null,
            isActive: Boolean(values.isActive),
          }),
        )}
      >
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
            className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/20"
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
          <AppButton type="submit" isLoading={isSubmitting}>
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
      active: state.list.filter(isActiveRecord).length,
      inactive: state.list.filter((item) => !isActiveRecord(item)).length,
      total: state.totalCount,
    }),
    [state.list, state.totalCount],
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

  return (
    <section className="min-w-0 space-y-5">
      <PageHeader
        badge={
          <>
            <FolderKanban className="h-3.5 w-3.5" />
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
              <RefreshCw
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
                <Plus className="h-4 w-4" />
                New Category
              </AppButton>
            )}
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <PurchaseStatCard
          icon={FolderKanban}
          label="Total"
          value={stats.total}
          colorClass="bg-brand-light text-brand"
        />
        <PurchaseStatCard
          icon={FolderKanban}
          label="Active"
          value={stats.active}
          colorClass="bg-emerald-50 text-emerald-600"
        />
        <PurchaseStatCard
          icon={FolderKanban}
          label="Inactive"
          value={stats.inactive}
          colorClass="bg-red-50 text-red-600"
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="grid gap-3 md:grid-cols-[minmax(240px,1fr)_180px_auto]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search categories..."
              className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </label>
          <AppSelect
            value={state.filters.IsActive}
            onChange={(value) => {
              dispatch(setExpenseCategoryFilters({ IsActive: value }));
              dispatch(setExpenseCategoryPage(1));
            }}
            options={ACTIVE_OPTIONS}
            aria-label="Filter by status"
          />
          <AppButton
            variant="secondary"
            className="h-10 rounded-lg px-3"
            disabled={!hasFilters}
            onClick={() => {
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
            }}
          >
            <RotateCcw className="h-4 w-4" />
            Clear
          </AppButton>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] table-fixed text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="w-[28%] border-b border-slate-200 px-4 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Name
                </th>
                <th className="border-b border-slate-200 px-4 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Description
                </th>
                <th className="w-32 border-b border-slate-200 px-4 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Status
                </th>
                <th className="w-36 border-b border-slate-200 px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {state.loading ? (
                Array.from({ length: 5 }, (_, index) => (
                  <tr key={index}>
                    <td colSpan={4} className="px-4 py-3">
                      <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
                    </td>
                  </tr>
                ))
              ) : state.error || state.list.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-12 text-center text-sm text-slate-500"
                  >
                    {state.error || "No expense categories found."}
                  </td>
                </tr>
              ) : (
                state.list.map((category) => (
                  <tr key={category.id} className="hover:bg-slate-50">
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
                      <div className="inline-flex gap-2">
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
        </div>

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
        title="Delete Expense Category?"
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
