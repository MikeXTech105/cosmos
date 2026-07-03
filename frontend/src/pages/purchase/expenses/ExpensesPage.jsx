import { zodResolver } from "@hookform/resolvers/zod";
import {
  CircleDollarSign,
  Plus,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  Search,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import { z } from "zod";

import AppButton from "../../../components/common/AppButton";
import AppImageUpload from "../../../components/common/AppImageUpload";
import AppInput from "../../../components/common/AppInput";
import AppModal from "../../../components/common/AppModal";
import AppSelect from "../../../components/common/AppSelect";
import PageHeader from "../../../components/common/PageHeader";
import useCreatePermission from "../../../hooks/useCreatePermission";
import { expenseCategoryService } from "../../../services/purchase/expenseCategoryService";
import {
  createExpense,
  deleteExpense,
  fetchExpenseById,
  fetchExpenses,
  setExpenseFilters,
  setExpensePage,
  setExpensePageSize,
  updateExpense,
} from "../../../store/slices/purchase/expenseSlice";
import { getPartyDisplayName } from "../../party/partyHelpers";
import { partyService } from "../../party/partyService";
import { PurchaseNumberInput } from "../PurchaseLineItems";
import {
  buildListParams,
  cleanNullableString,
  formatCurrency,
  formatDate,
  getActionError,
  getCategoryName,
  getSuccessMessage,
  getTodayInputValue,
  PAYMENT_MODE,
  PAYMENT_MODE_OPTIONS,
  toInputDate,
  toNumber,
} from "../purchaseHelpers";
import {
  PurchaseConfirmDialog,
  PurchasePagination,
  PurchaseStatCard,
} from "../PurchaseShared";
import { PartyFormModal } from "../../party";
import { CategoryModal } from "../expenseCategories/ExpenseCategoriesPage";

const expenseSchema = z.object({
  expenseDate: z.string().min(1, "Expense date is required"),
  categoryId: z.coerce.number().int().positive("Category is required"),
  paidToPartyId: z.string().optional(),
  amount: z.coerce.number().min(0, "Amount cannot be negative"),
  taxAmount: z.coerce.number().min(0, "Tax cannot be negative"),
  paymentMode: z.coerce.number().int().min(0),
  referenceNo: z.string().max(100, "Reference is too long").optional(),
  notes: z.string().max(1000, "Notes are too long").optional(),
  attachmentPath: z.string().optional(),
});

const getLookupList = (response) => {
  const data = response?.data;

  if (Array.isArray(data)) {
    return data;
  }

  return data?.items ?? [];
};

const getExpenseDefaultValues = (expense) => ({
  expenseDate: toInputDate(expense?.expenseDate) || getTodayInputValue(),
  categoryId: expense?.categoryId ?? "",
  paidToPartyId: expense?.paidToPartyId ?? "",
  amount: String(expense?.amount ?? 0),
  taxAmount: String(expense?.taxAmount ?? 0),
  paymentMode: expense?.paymentMode ?? PAYMENT_MODE.CASH,
  referenceNo: expense?.referenceNo ?? "",
  notes: expense?.notes ?? "",
  attachmentPath: expense?.attachmentPath ?? "",
});

const getResponseRecord = (response) => {
  return response?.data?.expense ?? response?.data ?? null;
};

const ExpenseModal = ({
  canCreateCategory = false,
  canCreateParty = false,
  categoryOptions,
  expense,
  isOpen,
  mode,
  onClose,
  onCreateCategory,
  onCreateParty,
  onSubmit,
  partyOptions,
}) => {
  const {
    control,
    handleSubmit,
    register,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(expenseSchema),
    defaultValues: getExpenseDefaultValues(expense),
  });

  useEffect(() => {
    if (isOpen) {
      reset(getExpenseDefaultValues(expense));
    }
  }, [expense, isOpen, reset]);

  return (
    <AppModal
      isOpen={isOpen}
      maxWidth="max-w-4xl"
      onClose={isSubmitting ? undefined : onClose}
    >
      <h2 className="text-lg font-semibold text-slate-900">
        {mode === "edit" ? "Edit Expense" : "New Expense"}
      </h2>
      <form
        className="mt-5 max-h-[calc(100vh-12rem)] space-y-5 overflow-y-auto px-1 pb-1"
        onSubmit={handleSubmit((values) =>
          onSubmit({
            expenseDate: values.expenseDate,
            categoryId: Number(values.categoryId),
            paidToPartyId: values.paidToPartyId || null,
            amount: Number(values.amount),
            taxAmount: Number(values.taxAmount),
            paymentMode: Number(values.paymentMode),
            referenceNo: cleanNullableString(values.referenceNo),
            notes: cleanNullableString(values.notes),
            attachmentPath: cleanNullableString(values.attachmentPath),
          }),
        )}
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <AppInput
            id="expenseDate"
            label="Expense Date"
            type="date"
            required
            error={errors.expenseDate?.message}
            {...register("expenseDate")}
          />
          <Controller
            control={control}
            name="categoryId"
            render={({ field }) => (
              <AppSelect
                label="Category"
                required
                value={field.value}
                onChange={(value) => field.onChange(Number(value))}
                onBlur={field.onBlur}
                options={categoryOptions}
                placeholder="Select category"
                error={errors.categoryId?.message}
                creatable={canCreateCategory}
                createLabel="Create new expense category"
                onCreateClick={onCreateCategory}
              />
            )}
          />
          <Controller
            control={control}
            name="paidToPartyId"
            render={({ field }) => (
              <AppSelect
                label="Paid To"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                options={[{ value: "", label: "No party" }, ...partyOptions]}
                placeholder="Select party"
                error={errors.paidToPartyId?.message}
                creatable={canCreateParty}
                createLabel="Create new party"
                onCreateClick={onCreateParty}
              />
            )}
          />
          <PurchaseNumberInput
            control={control}
            id="expenseAmount"
            name="amount"
            label="Amount"
            error={errors.amount?.message}
          />
          <PurchaseNumberInput
            control={control}
            id="expenseTax"
            name="taxAmount"
            label="Tax Amount"
            error={errors.taxAmount?.message}
          />
          <Controller
            control={control}
            name="paymentMode"
            render={({ field }) => (
              <AppSelect
                label="Payment Mode"
                value={field.value}
                onChange={(value) => field.onChange(Number(value))}
                onBlur={field.onBlur}
                options={PAYMENT_MODE_OPTIONS}
                error={errors.paymentMode?.message}
              />
            )}
          />
          <AppInput
            id="expenseReference"
            label="Reference No"
            error={errors.referenceNo?.message}
            {...register("referenceNo")}
          />
        </div>

        <Controller
          control={control}
          name="attachmentPath"
          render={({ field }) => (
            <AppImageUpload
              label="Attachment"
              value={field.value}
              disabled={isSubmitting}
              onChange={(value) =>
                setValue("attachmentPath", value, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
              error={errors.attachmentPath?.message}
            />
          )}
        />

        <div>
          <label
            htmlFor="expenseNotes"
            className="mb-1.5 block text-xs font-semibold text-slate-700"
          >
            Notes
          </label>
          <textarea
            id="expenseNotes"
            rows={4}
            className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/20"
            {...register("notes")}
          />
          {errors.notes?.message && (
            <p className="mt-1.5 text-xs font-medium text-red-600">
              {errors.notes.message}
            </p>
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
          <AppButton
            variant="secondary"
            disabled={isSubmitting}
            onClick={onClose}
          >
            Cancel
          </AppButton>
          <AppButton type="submit" isLoading={isSubmitting}>
            Save Expense
          </AppButton>
        </div>
      </form>
    </AppModal>
  );
};

const ExpensesPage = () => {
  const dispatch = useDispatch();
  const state = useSelector((store) => store.expenses);
  const canCreateCategory = useCreatePermission({
    label: "Expense Categories",
    resource: "expenseCategories",
    route: "/purchase/expense-categories",
  });
  const canCreateParty = useCreatePermission({
    label: "Party Master",
    resource: "party",
    route: "/party",
  });
  const [searchInput, setSearchInput] = useState(state.filters.Search);
  const [lookups, setLookups] = useState({
    categories: [],
    categoriesLoading: false,
    parties: [],
    partiesLoading: false,
  });
  const lookupCacheRef = useRef({
    categories: { loaded: false, promise: null },
    parties: { loaded: false, promise: null },
  });
  const [modal, setModal] = useState({
    expense: null,
    isLoading: false,
    isOpen: false,
    mode: "create",
  });
  const [lookupCreateModal, setLookupCreateModal] = useState({
    category: false,
    party: false,
  });
  const [confirmation, setConfirmation] = useState({
    expense: null,
    isLoading: false,
    isOpen: false,
  });

  const params = useMemo(
    () =>
      buildListParams({
        filters: state.filters,
        pageNumber: state.pageNumber,
        pageSize: state.pageSize,
        type: "expense",
      }),
    [state.filters, state.pageNumber, state.pageSize],
  );

  const loadExpenses = useCallback(
    () => dispatch(fetchExpenses(params)),
    [dispatch, params],
  );

  const loadLookup = useCallback((type, { force = false } = {}) => {
    const cache = lookupCacheRef.current[type];

    if (cache.loaded && !force) {
      return Promise.resolve();
    }

    if (cache.promise) {
      return cache.promise;
    }

    const isCategories = type === "categories";
    const request = isCategories
      ? expenseCategoryService.getExpenseCategories({
          PageNumber: 1,
          PageSize: 200,
          IsActive: true,
        })
      : partyService.getParties({
          PageNumber: 1,
          PageSize: 200,
          IsActive: true,
        });

    setLookups((current) => ({
      ...current,
      [`${type}Loading`]: true,
    }));

    cache.promise = request
      .then((response) => {
        cache.loaded = true;
        setLookups((current) => ({
          ...current,
          [type]: getLookupList(response),
          [`${type}Loading`]: false,
        }));
      })
      .catch((error) => {
        toast.error(getActionError(error, `Unable to load ${type}.`));
        setLookups((current) => ({
          ...current,
          [`${type}Loading`]: false,
        }));
      })
      .finally(() => {
        cache.promise = null;
      });

    return cache.promise;
  }, []);

  const loadLookups = useCallback(
    () => Promise.all([loadLookup("categories"), loadLookup("parties")]),
    [loadLookup],
  );

  useEffect(() => {
    void Promise.resolve().then(loadExpenses);
  }, [loadExpenses]);

  useEffect(() => {
    void loadLookups();
  }, [loadLookups]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      dispatch(setExpenseFilters({ Search: searchInput }));
      dispatch(setExpensePage(1));
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [dispatch, searchInput]);

  const categoryOptions = useMemo(
    () =>
      lookups.categories.map((category) => ({
        value: Number(category.id),
        label: category.name,
      })),
    [lookups.categories],
  );

  const partyOptions = useMemo(
    () =>
      lookups.parties.map((party) => ({
        value: party.id,
        label: getPartyDisplayName(party),
      })),
    [lookups.parties],
  );

  const categoryById = useMemo(
    () =>
      new Map(
        lookups.categories.map((category) => [String(category.id), category]),
      ),
    [lookups.categories],
  );

  const stats = useMemo(() => {
    const total = state.list.reduce(
      (sum, expense) => sum + toNumber(expense.amount),
      0,
    );
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const thisMonth = state.list.reduce((sum, expense) => {
      const date = new Date(expense.expenseDate);

      return !Number.isNaN(date.getTime()) && date >= monthStart
        ? sum + toNumber(expense.amount)
        : sum;
    }, 0);

    return {
      count: state.totalCount,
      thisMonth: formatCurrency(thisMonth),
      total: formatCurrency(total),
    };
  }, [state.list, state.totalCount]);

  const openLookupCreate = useCallback((type) => {
    setLookupCreateModal((current) => ({ ...current, [type]: true }));
  }, []);

  const closeLookupCreate = useCallback((type) => {
    setLookupCreateModal((current) => ({ ...current, [type]: false }));
  }, []);

  const submitLookupCreate = useCallback(
    async (type, payload) => {
      try {
        if (type === "category") {
          await expenseCategoryService.createExpenseCategory(payload);
          toast.success("Expense category created successfully");
          lookupCacheRef.current.categories.loaded = false;
          await loadLookup("categories", { force: true });
        } else {
          await partyService.createParty(payload);
          toast.success("Party created successfully");
          lookupCacheRef.current.parties.loaded = false;
          await loadLookup("parties", { force: true });
        }

        closeLookupCreate(type);
      } catch (error) {
        toast.error(getActionError(error, "Unable to create record."));
        throw error;
      }
    },
    [closeLookupCreate, loadLookup],
  );

  const openEdit = async (expense) => {
    setModal({
      expense,
      isLoading: true,
      isOpen: true,
      mode: "edit",
    });

    try {
      const response = await dispatch(fetchExpenseById(expense.id)).unwrap();

      setModal({
        expense: getResponseRecord(response),
        isLoading: false,
        isOpen: true,
        mode: "edit",
      });
    } catch (error) {
      toast.error(getActionError(error, "Unable to load expense details."));
      setModal((current) => ({ ...current, isLoading: false }));
    }
  };

  const submitExpense = async (payload) => {
    try {
      const response =
        modal.mode === "edit"
          ? await dispatch(
              updateExpense({ id: modal.expense.id, payload }),
            ).unwrap()
          : await dispatch(createExpense(payload)).unwrap();

      toast.success(getSuccessMessage(response, "Expense saved"));
      setModal((current) => ({ ...current, isOpen: false }));
      await loadExpenses();
    } catch (error) {
      toast.error(getActionError(error, "Unable to save expense."));
      throw error;
    }
  };

  const confirmDelete = async () => {
    if (!confirmation.expense) {
      return;
    }

    setConfirmation((current) => ({ ...current, isLoading: true }));

    try {
      const response = await dispatch(
        deleteExpense(confirmation.expense.id),
      ).unwrap();

      toast.success(getSuccessMessage(response.response, "Expense deleted"));
      setConfirmation({ expense: null, isLoading: false, isOpen: false });
      await loadExpenses();
    } catch (error) {
      toast.error(getActionError(error, "Unable to delete expense."));
      setConfirmation((current) => ({ ...current, isLoading: false }));
    }
  };

  const hasFilters =
    Boolean(searchInput) ||
    state.filters.CategoryId !== "all" ||
    Boolean(state.filters.FromDate) ||
    Boolean(state.filters.ToDate);

  return (
    <section className="min-w-0 space-y-5">
      <PageHeader
        badge={
          <>
            <CircleDollarSign className="h-3.5 w-3.5" />
            Purchase & Expense
          </>
        }
        title="Expenses"
        description="Record operating expenses, tax, payment mode, and attachments."
        actions={
          <>
            <AppButton
              variant="secondary"
              className="h-10"
              disabled={state.loading}
              onClick={loadExpenses}
            >
              <RefreshCw
                className={`h-4 w-4 ${state.loading ? "animate-spin" : ""}`}
              />
              Refresh
            </AppButton>
            <AppButton
              className="h-10"
              onClick={() =>
                setModal({
                  expense: null,
                  isLoading: false,
                  isOpen: true,
                  mode: "create",
                })
              }
            >
              <Plus className="h-4 w-4" />
              New Expense
            </AppButton>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <PurchaseStatCard
          icon={CircleDollarSign}
          label="Total Expenses"
          value={stats.total}
          colorClass="bg-brand-light text-brand"
        />
        <PurchaseStatCard
          icon={ReceiptText}
          label="This Month"
          value={stats.thisMonth}
          colorClass="bg-emerald-50 text-emerald-600"
        />
        <PurchaseStatCard
          icon={ReceiptText}
          label="Count"
          value={stats.count}
          colorClass="bg-sky-50 text-sky-600"
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="grid gap-3 xl:grid-cols-[minmax(240px,1fr)_220px_160px_160px_auto]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search expenses..."
              className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </label>
          <AppSelect
            value={state.filters.CategoryId}
            onChange={(value) => {
              dispatch(setExpenseFilters({ CategoryId: value }));
              dispatch(setExpensePage(1));
            }}
            options={[{ value: "all", label: "All categories" }, ...categoryOptions]}
            aria-label="Filter by category"
            creatable={canCreateCategory}
            createLabel="Create new expense category"
            onCreateClick={() => openLookupCreate("category")}
          />
          <AppInput
            type="date"
            value={state.filters.FromDate}
            onChange={(event) => {
              dispatch(setExpenseFilters({ FromDate: event.target.value }));
              dispatch(setExpensePage(1));
            }}
            aria-label="From date"
            className="h-10"
          />
          <AppInput
            type="date"
            value={state.filters.ToDate}
            onChange={(event) => {
              dispatch(setExpenseFilters({ ToDate: event.target.value }));
              dispatch(setExpensePage(1));
            }}
            aria-label="To date"
            className="h-10"
          />
          <AppButton
            variant="secondary"
            className="h-10 rounded-lg px-3"
            disabled={!hasFilters}
            onClick={() => {
              setSearchInput("");
              dispatch(
                setExpenseFilters({
                  Search: "",
                  CategoryId: "all",
                  FromDate: "",
                  ToDate: "",
                  SortBy: "",
                  SortDirection: "",
                }),
              );
              dispatch(setExpensePage(1));
            }}
          >
            <RotateCcw className="h-4 w-4" />
            Clear
          </AppButton>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] table-fixed text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="border-b border-slate-200 px-3 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Date
                </th>
                <th className="border-b border-slate-200 px-3 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Category
                </th>
                <th className="border-b border-slate-200 px-3 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Paid To
                </th>
                <th className="border-b border-slate-200 px-3 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">
                  Amount
                </th>
                <th className="border-b border-slate-200 px-3 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">
                  Tax
                </th>
                <th className="border-b border-slate-200 px-3 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Ref
                </th>
                <th className="w-36 border-b border-slate-200 px-3 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {state.loading ? (
                Array.from({ length: 6 }, (_, index) => (
                  <tr key={index}>
                    <td colSpan={7} className="px-3 py-3">
                      <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
                    </td>
                  </tr>
                ))
              ) : state.error || state.list.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-sm text-slate-500"
                  >
                    {state.error || "No expenses found."}
                  </td>
                </tr>
              ) : (
                state.list.map((expense) => (
                  <tr key={expense.id} className="hover:bg-slate-50">
                    <td className="border-b border-slate-100 px-3 py-3 text-sm text-slate-600">
                      {formatDate(expense.expenseDate)}
                    </td>
                    <td className="border-b border-slate-100 px-3 py-3 text-sm font-semibold text-slate-900">
                      {expense.categoryName ||
                        categoryById.get(String(expense.categoryId))?.name ||
                        getCategoryName(expense)}
                    </td>
                    <td className="border-b border-slate-100 px-3 py-3 text-sm text-slate-600">
                      {expense.paidToPartyName || expense.paidToPartyId || "-"}
                    </td>
                    <td className="border-b border-slate-100 px-3 py-3 text-right text-sm font-semibold text-slate-900">
                      {formatCurrency(expense.amount)}
                    </td>
                    <td className="border-b border-slate-100 px-3 py-3 text-right text-sm text-slate-600">
                      {formatCurrency(expense.taxAmount)}
                    </td>
                    <td className="border-b border-slate-100 px-3 py-3 text-sm text-slate-600">
                      {expense.referenceNo || "-"}
                    </td>
                    <td className="border-b border-slate-100 px-3 py-3 text-right">
                      <div className="inline-flex gap-2">
                        <AppButton
                          variant="secondary"
                          className="h-8 rounded-lg px-3"
                          onClick={() => void openEdit(expense)}
                        >
                          Edit
                        </AppButton>
                        <AppButton
                          variant="danger"
                          className="h-8 rounded-lg px-3"
                          onClick={() =>
                            setConfirmation({
                              expense,
                              isLoading: false,
                              isOpen: true,
                            })
                          }
                        >
                          Delete
                        </AppButton>
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
          itemLabel="expenses"
          onPageChange={(value) => dispatch(setExpensePage(value))}
          onPageSizeChange={(value) => dispatch(setExpensePageSize(value))}
          pageNumber={state.pageNumber}
          pageSize={state.pageSize}
          totalCount={state.totalCount}
          totalPages={state.totalPages}
        />
      </div>

      <ExpenseModal
        canCreateCategory={canCreateCategory}
        canCreateParty={canCreateParty}
        categoryOptions={categoryOptions}
        expense={modal.expense}
        isOpen={modal.isOpen}
        mode={modal.mode}
        onClose={() => setModal((current) => ({ ...current, isOpen: false }))}
        onCreateCategory={() => openLookupCreate("category")}
        onCreateParty={() => openLookupCreate("party")}
        onSubmit={submitExpense}
        partyOptions={partyOptions}
      />

      <CategoryModal
        category={null}
        isOpen={lookupCreateModal.category}
        mode="create"
        onClose={() => closeLookupCreate("category")}
        onSubmit={(payload) => submitLookupCreate("category", payload)}
      />

      <PartyFormModal
        isLoading={false}
        isOpen={lookupCreateModal.party}
        mode="create"
        onClose={() => closeLookupCreate("party")}
        onSubmit={(payload) => submitLookupCreate("party", payload)}
        submitLabel="Create Party"
        title="Add Party"
      />

      <PurchaseConfirmDialog
        confirmLabel="Delete"
        description="This expense entry will be deleted."
        isLoading={confirmation.isLoading}
        isOpen={confirmation.isOpen}
        title="Delete Expense?"
        tone="danger"
        onCancel={() =>
          setConfirmation({
            expense: null,
            isLoading: false,
            isOpen: false,
          })
        }
        onConfirm={confirmDelete}
      />
    </section>
  );
};

export default ExpensesPage;
