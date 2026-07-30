import { zodResolver } from "@hookform/resolvers/zod";
import {
  CreditCard,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
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
import useCreatePermission from "../../../hooks/useCreatePermission";
import { purchaseBillService } from "../../../services/purchase/purchaseBillService";
import {
  createSupplierPayment,
  deleteSupplierPayment,
  fetchSupplierPaymentById,
  fetchSupplierPayments,
  setSupplierPaymentFilters,
  setSupplierPaymentPage,
  setSupplierPaymentPageSize,
  updateSupplierPayment,
} from "../../../store/slices/purchase/supplierPaymentSlice";
import {
  getPartyDisplayName,
  getPartyType,
} from "../../party/partyHelpers";
import { partyService } from "../../party/partyService";
import { PartyFormModal } from "../../party";
import { PurchaseNumberInput } from "../PurchaseLineItems";
import {
  buildListParams,
  cleanNullableString,
  formatCurrency,
  formatDate,
  formatNumber,
  getActionError,
  getBalanceAmount,
  getDocumentNumber,
  getPaymentModeLabel,
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

const allocationSchema = z.object({
  purchaseBillId: z.coerce.number().int().positive("Bill is required"),
  allocatedAmount: z.coerce.number().min(0, "Allocation cannot be negative"),
});

const paymentSchema = z
  .object({
    supplierId: z.string().uuid("Supplier is required"),
    paymentDate: z.string().min(1, "Payment date is required"),
    amount: z.coerce.number().positive("Amount must be greater than 0"),
    paymentMode: z.coerce.number().int().min(0),
    referenceNo: z.string().optional(),
    notes: z.string().optional(),
    allocations: z.array(allocationSchema).optional(),
  })
  .superRefine((values, context) => {
    const allocated = (values.allocations ?? []).reduce(
      (total, allocation) => total + toNumber(allocation.allocatedAmount),
      0,
    );

    if (allocated > values.amount) {
      context.addIssue({
        code: "custom",
        message: "Total allocation cannot exceed payment amount",
        path: ["allocations"],
      });
    }
  });

const getLookupList = (response) => {
  const data = response?.data;

  if (Array.isArray(data)) {
    return data;
  }

  return data?.items ?? [];
};

const getDefaultValues = (payment) => ({
  supplierId: payment?.supplierId ?? "",
  paymentDate: toInputDate(payment?.paymentDate) || getTodayInputValue(),
  amount: String(payment?.amount ?? 0),
  paymentMode: payment?.paymentMode ?? PAYMENT_MODE.CASH,
  referenceNo: payment?.referenceNo ?? "",
  notes: payment?.notes ?? "",
  allocations: Array.isArray(payment?.allocations)
    ? payment.allocations.map((allocation) => ({
        purchaseBillId: allocation.purchaseBillId ?? "",
        allocatedAmount: String(allocation.allocatedAmount ?? 0),
      }))
    : [],
});

const PaymentModal = ({
  billOptions,
  canCreateSupplier = false,
  isOpen,
  mode,
  onClose,
  onCreateSupplier,
  onLoadBills,
  onSubmit,
  payment,
  supplierOptions,
}) => {
  const {
    control,
    handleSubmit,
    register,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(paymentSchema),
    defaultValues: getDefaultValues(payment),
  });
  const { append, fields, remove } = useFieldArray({
    control,
    name: "allocations",
  });
  const watchedSupplier = useWatch({ control, name: "supplierId" });
  const watchedAmount = useWatch({ control, name: "amount" });
  const allocations = useWatch({ control, name: "allocations" }) ?? [];
  const allocatedTotal = allocations.reduce(
    (total, allocation) => total + toNumber(allocation.allocatedAmount),
    0,
  );

  useEffect(() => {
    if (isOpen) {
      reset(getDefaultValues(payment));
    }
  }, [isOpen, payment, reset]);

  useEffect(() => {
    if (watchedSupplier) {
      void onLoadBills(watchedSupplier);
    }
  }, [onLoadBills, watchedSupplier]);

  return (
    <AppModal
      isBusy={isSubmitting}
      isOpen={isOpen}
      maxWidth="max-w-5xl"
      onClose={isSubmitting ? undefined : onClose}
    >
      <h2 className="text-lg font-semibold text-slate-900">
        {mode === "edit" ? "Edit Supplier Payment" : "New Supplier Payment"}
      </h2>
      <form
        className="mt-5 max-h-[calc(100vh-12rem)] space-y-5 overflow-y-auto px-1 pb-1"
        onSubmit={handleSubmit((values) =>
          onSubmit({
            supplierId: values.supplierId,
            paymentDate: values.paymentDate,
            amount: Number(values.amount),
            paymentMode: Number(values.paymentMode),
            referenceNo: cleanNullableString(values.referenceNo),
            notes: cleanNullableString(values.notes),
            allocations: (values.allocations ?? [])
              .filter((allocation) => toNumber(allocation.allocatedAmount) > 0)
              .map((allocation) => ({
                purchaseBillId: Number(allocation.purchaseBillId),
                allocatedAmount: Number(allocation.allocatedAmount),
              })),
          }),
        )}
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Controller
            control={control}
            name="supplierId"
            render={({ field }) => (
              <AppSelect
                ref={field.ref}
                name={field.name}
                label="Supplier"
                required
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                options={supplierOptions}
                placeholder="Select supplier"
                error={errors.supplierId?.message}
                creatable={canCreateSupplier}
                createLabel="Create new supplier"
                onCreateClick={onCreateSupplier}
              />
            )}
          />
          <AppInput
            id="supplierPaymentDate"
            label="Payment Date"
            type="date"
            required
            error={errors.paymentDate?.message}
            {...register("paymentDate")}
          />
          <PurchaseNumberInput
            control={control}
            id="supplierPaymentAmount"
            name="amount"
            label="Amount"
            error={errors.amount?.message}
          />
          <Controller
            control={control}
            name="paymentMode"
            render={({ field }) => (
              <AppSelect
                ref={field.ref}
                name={field.name}
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
            id="supplierPaymentReference"
            label="Reference No"
            error={errors.referenceNo?.message}
            {...register("referenceNo")}
          />
        </div>

        <section className="rounded-xl border border-slate-200 bg-white">
          <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Allocations
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                Allocate this payment across unpaid purchase bills.
              </p>
            </div>
            <AppButton
              variant="secondary"
              className="h-9 rounded-lg px-3"
              disabled={!watchedSupplier}
              onClick={() =>
                append({ purchaseBillId: "", allocatedAmount: "0" })
              }
            >
              <Plus aria-hidden="true" className="h-4 w-4" />
              Add Allocation
            </AppButton>
          </div>
          <ResponsiveTableRegion
            mobileConfig={{
              actions: 2,
              fields: [1],
              serial: "generated",
              title: 0,
            }}
          >
            <table className="w-full min-w-[620px] text-left">
              <thead className="text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Purchase Bill</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Amount (₹)</th>
                  <th scope="col" className="w-14 px-2 py-3" />
                </tr>
              </thead>
              <tbody>
                {fields.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-4 py-6 text-center text-sm text-slate-500"
                    >
                      No allocations added.
                    </td>
                  </tr>
                ) : (
                  fields.map((field, index) => (
                    <tr key={field.id} className="border-t border-slate-100">
                      <td className="px-4 py-3">
                        <Controller
                          control={control}
                          name={`allocations.${index}.purchaseBillId`}
                          render={({ field: billField }) => (
                            <AppSelect
                              aria-label={`Bill for allocation ${index + 1}`}
                              ref={billField.ref}
                              name={billField.name}
                              value={billField.value}
                              onChange={(value) => billField.onChange(Number(value))}
                              onBlur={billField.onBlur}
                              options={billOptions}
                              placeholder="Select bill"
                              error={
                                errors.allocations?.[index]?.purchaseBillId
                                  ?.message
                              }
                            />
                          )}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <PurchaseNumberInput
                          control={control}
                          id={`allocation-${index}`}
                          name={`allocations.${index}.allocatedAmount`}
                          error={
                            errors.allocations?.[index]?.allocatedAmount
                              ?.message
                          }
                        />
                      </td>
                      <td className="px-2 py-3 text-right">
                        <div className="flex items-center justify-end gap-0.5">
                          <button
                            type="button"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-all hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 disabled:cursor-not-allowed disabled:opacity-40"
                            onClick={() => remove(index)}
                            aria-label="Remove allocation"
                          >
                            <Trash2 aria-hidden="true" className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </ResponsiveTableRegion>
          <div className="flex flex-col gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3 text-sm sm:flex-row sm:justify-end">
            <span>Payment: {formatCurrency(watchedAmount)}</span>
            <span>Allocated: {formatCurrency(allocatedTotal)}</span>
            <span
              className={
                allocatedTotal > toNumber(watchedAmount)
                  ? "font-semibold text-red-600"
                  : "font-semibold text-slate-900"
              }
            >
              Unallocated: {formatCurrency(toNumber(watchedAmount) - allocatedTotal)}
            </span>
          </div>
          {errors.allocations?.message && (
            <p className="px-4 py-2 text-xs font-medium text-red-600">
              {errors.allocations.message}
            </p>
          )}
        </section>

        <div>
          <label
            htmlFor="supplierPaymentNotes"
            className="mb-1.5 block text-xs font-semibold text-slate-700"
          >
            Notes
          </label>
          <textarea
            id="supplierPaymentNotes"
            rows={3}
            className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-500 focus:border-brand focus:ring-2 focus:ring-brand/20"
            {...register("notes")}
          />
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
          <AppButton
            variant="secondary"
            disabled={isSubmitting}
            onClick={onClose}
          >
            Cancel
          </AppButton>
          <AppButton type="submit" isLoading={isSubmitting} loadingText="Saving…">
            Save Payment
          </AppButton>
        </div>
      </form>
    </AppModal>
  );
};

const SupplierPaymentsPage = () => {
  const dispatch = useDispatch();
  const state = useSelector((store) => store.supplierPayments);
  const capabilities = useCapabilities({
    actions: ["view", "create", "update", "delete"],
    label: "Supplier Payments",
    resource: ["supplierPayments", "supplierPayment"],
    route: "/purchase/supplier-payments",
  });
  const canCreateSupplier = useCreatePermission({
    label: "Party Master",
    resource: "party",
    route: "/party",
  });
  const [searchInput, setSearchInput] = useState(state.filters.Search);
  const [suppliers, setSuppliers] = useState([]);
  const [supplierBills, setSupplierBills] = useState([]);
  const supplierCacheRef = useRef({ loaded: false, promise: null });
  const [modal, setModal] = useState({
    isLoading: false,
    isOpen: false,
    mode: "create",
    payment: null,
  });
  const [supplierCreateOpen, setSupplierCreateOpen] = useState(false);
  const [confirmation, setConfirmation] = useState({
    isLoading: false,
    isOpen: false,
    payment: null,
  });

  const params = useMemo(
    () =>
      buildListParams({
        filters: state.filters,
        pageNumber: state.pageNumber,
        pageSize: state.pageSize,
        type: "supplierPayment",
      }),
    [state.filters, state.pageNumber, state.pageSize],
  );

  const loadPayments = useCallback(
    () => dispatch(fetchSupplierPayments(params)),
    [dispatch, params],
  );

  const loadSuppliers = useCallback(({ force = false } = {}) => {
    if (supplierCacheRef.current.loaded && !force) {
      return Promise.resolve();
    }

    if (supplierCacheRef.current.promise) {
      return supplierCacheRef.current.promise;
    }

    supplierCacheRef.current.promise = partyService
      .getParties({ PageNumber: 1, PageSize: 200, IsActive: true })
      .then((response) => {
        setSuppliers(
          getLookupList(response).filter(
            (party) =>
              party?.isActive !== false &&
              ["supplier", "both"].includes(getPartyType(party)),
          ),
        );
        supplierCacheRef.current.loaded = true;
      })
      .catch((error) =>
        toast.error(getActionError(error, "Unable to load suppliers.")),
      )
      .finally(() => {
        supplierCacheRef.current.promise = null;
      });

    return supplierCacheRef.current.promise;
  }, []);

  const loadSupplierBills = useCallback(async (supplierId) => {
    try {
      const response = await purchaseBillService.getPurchaseBillsBySupplier(
        supplierId,
        { PageNumber: 1, PageSize: 200 },
      );
      setSupplierBills(getLookupList(response));
    } catch (error) {
      toast.error(getActionError(error, "Unable to load supplier bills."));
      setSupplierBills([]);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadPayments);
  }, [loadPayments]);

  useEffect(() => {
    void loadSuppliers();
  }, [loadSuppliers]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      dispatch(setSupplierPaymentFilters({ Search: searchInput }));
      dispatch(setSupplierPaymentPage(1));
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [dispatch, searchInput]);

  const supplierOptions = useMemo(
    () =>
      suppliers.map((supplier) => ({
        value: supplier.id,
        label: getPartyDisplayName(supplier),
      })),
    [suppliers],
  );

  const billOptions = useMemo(
    () =>
      supplierBills.map((bill) => ({
        value: Number(bill.id),
        label: `${getDocumentNumber(bill, "PB")} - Outstanding ${formatCurrency(
          getBalanceAmount(bill),
        )}`,
      })),
    [supplierBills],
  );

  const stats = useMemo(() => {
    const totalPaid = state.list.reduce(
      (sum, payment) => sum + toNumber(payment.amount),
      0,
    );

    return {
      count: state.summary?.totalCount ?? state.totalCount,
      totalPaid: formatCurrency(state.summary?.totalPaidAmount ?? totalPaid),
      metricScope: state.summaryScope,
      totalScope: "all-matching",
    };
  }, [state.list, state.summary, state.summaryScope, state.totalCount]);

  const submitSupplier = useCallback(
    async (payload) => {
      if (!canCreateSupplier) {
        return;
      }

      try {
        await partyService.createParty(payload);
        toast.success("Supplier created successfully");
        supplierCacheRef.current.loaded = false;
        await loadSuppliers({ force: true });
        setSupplierCreateOpen(false);
      } catch (error) {
        toast.error(getActionError(error, "Unable to create supplier."));
        throw error;
      }
    },
    [canCreateSupplier, loadSuppliers],
  );

  const openEdit = async (payment) => {
    if (!capabilities.canUpdate) {
      return;
    }

    setModal({
      isLoading: true,
      isOpen: true,
      mode: "edit",
      payment,
    });

    try {
      const response = await dispatch(fetchSupplierPaymentById(payment.id)).unwrap();
      const detail = response?.data?.supplierPayment ?? response?.data ?? payment;

      setModal({
        isLoading: false,
        isOpen: true,
        mode: "edit",
        payment: detail,
      });
    } catch (error) {
      toast.error(getActionError(error, "Unable to load payment details."));
      setModal((current) => ({ ...current, isLoading: false }));
    }
  };

  const submitPayment = async (payload) => {
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
              updateSupplierPayment({ id: modal.payment.id, payload }),
            ).unwrap()
          : await dispatch(createSupplierPayment(payload)).unwrap();

      toast.success(getSuccessMessage(response, "Supplier payment saved"));
      setModal((current) => ({ ...current, isOpen: false }));
      await loadPayments();
    } catch (error) {
      toast.error(getActionError(error, "Unable to save supplier payment."));
      throw error;
    }
  };

  const confirmDelete = async () => {
    if (!capabilities.canDelete || !confirmation.payment) {
      return;
    }

    setConfirmation((current) => ({ ...current, isLoading: true }));

    try {
      const response = await dispatch(
        deleteSupplierPayment(confirmation.payment.id),
      ).unwrap();

      toast.success(getSuccessMessage(response.response, "Payment deleted"));
      setConfirmation({ isLoading: false, isOpen: false, payment: null });
      await loadPayments();
    } catch (error) {
      toast.error(getActionError(error, "Unable to delete payment."));
      setConfirmation((current) => ({ ...current, isLoading: false }));
    }
  };

  const hasFilters =
    Boolean(searchInput) ||
    state.filters.SupplierId !== "all" ||
    Boolean(state.filters.FromDate) ||
    Boolean(state.filters.ToDate);
  const activeFilterCount =
    Number(Boolean(searchInput)) +
    Number(state.filters.SupplierId !== "all") +
    Number(Boolean(state.filters.FromDate)) +
    Number(Boolean(state.filters.ToDate));
  const clearFilters = () => {
    setSearchInput("");
    dispatch(
      setSupplierPaymentFilters({
        Search: "",
        SupplierId: "all",
        FromDate: "",
        ToDate: "",
        SortBy: "",
        SortDirection: "",
      }),
    );
    dispatch(setSupplierPaymentPage(1));
  };

  return (
    <section className="min-w-0 space-y-5">
      <PageHeader
        badge={
          <>
            <CreditCard aria-hidden="true" className="h-3.5 w-3.5" />
            Purchase & Expense
          </>
        }
        title="Supplier Payments"
        description="Record payments to suppliers and allocate them to purchase bills."
        actions={
          <>
            <AppButton
              variant="secondary"
              className="h-10"
              disabled={state.loading}
              onClick={loadPayments}
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
                  setModal({
                    isLoading: false,
                    isOpen: true,
                    mode: "create",
                    payment: null,
                  })
                }
              >
                <Plus aria-hidden="true" className="h-4 w-4" />
                New Payment
              </AppButton>
            )}
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
        <PurchaseStatCard
          icon={CreditCard}
          label="Total Paid"
          loading={state.loading}
          value={stats.totalPaid}
          scope={stats.metricScope}
          colorClass="bg-brand-light text-brand"
        />
        <PurchaseStatCard
          icon={CreditCard}
          label="Payments"
          loading={state.loading}
          value={stats.count}
          scope={stats.totalScope}
          colorClass="bg-emerald-50 text-emerald-600"
        />
      </div>

      <MobileFilterSheet activeCount={activeFilterCount} onClear={clearFilters}>
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="grid gap-3 xl:grid-cols-[minmax(240px,1fr)_220px_160px_160px_auto]">
          <label className="relative block">
          <span className="mb-1.5 block text-xs font-semibold text-slate-700">Search</span>
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 bottom-3 h-4 w-4 text-slate-500" />
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search supplier payments..."
              className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-500 focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </label>
          <AppSelect
            value={state.filters.SupplierId}
            onChange={(value) => {
              dispatch(setSupplierPaymentFilters({ SupplierId: value }));
              dispatch(setSupplierPaymentPage(1));
            }}
            options={[{ value: "all", label: "All suppliers" }, ...supplierOptions]}
            label="Filter by supplier"
            creatable={canCreateSupplier}
            createLabel="Create new supplier"
            onCreateClick={() => {
              if (canCreateSupplier) {
                setSupplierCreateOpen(true);
              }
            }}
          />
          <AppInput
            type="date"
            value={state.filters.FromDate}
            onChange={(event) => {
              dispatch(
                setSupplierPaymentFilters({ FromDate: event.target.value }),
              );
              dispatch(setSupplierPaymentPage(1));
            }}
            label="From date"
            className="h-10"
          />
          <AppInput
            type="date"
            value={state.filters.ToDate}
            onChange={(event) => {
              dispatch(setSupplierPaymentFilters({ ToDate: event.target.value }));
              dispatch(setSupplierPaymentPage(1));
            }}
            label="To date"
            className="h-10"
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
            actions: 7,
            fields: [2, 3, 4, 5],
            serial: 0,
            subtitle: 6,
            title: 1,
          }}
        >
          <table className="w-full min-w-[920px] table-fixed text-left">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" aria-label="Row number" className="border-b border-slate-200 px-3 py-3 text-xs font-medium uppercase tracking-wide text-slate-500"><span aria-hidden="true">#</span></th>
                <th scope="col" className="border-b border-slate-200 px-3 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Payment #
                </th>
                <th scope="col" className="border-b border-slate-200 px-3 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Supplier
                </th>
                <th scope="col" className="border-b border-slate-200 px-3 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Date
                </th>
                <th scope="col" className="border-b border-slate-200 px-3 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">
                  Amount (₹)
                </th>
                <th scope="col" className="border-b border-slate-200 px-3 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Mode
                </th>
                <th scope="col" className="border-b border-slate-200 px-3 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Ref
                </th>
                <th scope="col" className="w-36 border-b border-slate-200 px-3 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {state.loading ? (
                Array.from({ length: 5 }, (_, index) => (
                  <tr key={index}>
                    <td colSpan={8} className="px-3 py-3">
                      <div className="h-4 animate-pulse rounded bg-slate-100" />
                    </td>
                  </tr>
                ))
              ) : state.error || state.list.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="p-0"
                  >
                    <EmptyState
                      actionLabel={!state.error && !hasFilters ? "New Payment" : undefined}
                      context={
                        !state.error && !hasFilters
                          ? "Supplier payments record outgoing amounts and their purchase-bill allocations."
                          : undefined
                      }
                      hint={
                        state.error
                          ? state.error
                          : hasFilters
                            ? "Clear the current filters to see all supplier payments."
                            : "Record the first supplier payment after entering a purchase bill."
                      }
                      icon={CreditCard}
                      title={
                        state.error
                          ? "Couldn't load supplier payments"
                          : hasFilters
                            ? "No supplier payments match these filters"
                            : "No supplier payments yet"
                      }
                      variant={
                        state.error ? "error" : hasFilters ? "filtered" : "empty"
                      }
                      onAction={
                        state.error
                          ? loadPayments
                          : hasFilters
                            ? clearFilters
                            : capabilities.canCreate
                              ? () =>
                                  setModal({
                                    isLoading: false,
                                    isOpen: true,
                                    mode: "create",
                                    payment: null,
                                  })
                              : undefined
                      }
                    />
                  </td>
                </tr>
              ) : (
                state.list.map((payment, index) => (
                  <tr key={payment.id} className="hover:bg-slate-50">
                    <td className="border-b border-slate-100 px-4 py-3.5 text-xs font-semibold tabular-nums text-slate-500">
                      {(state.pageNumber - 1) * state.pageSize + index + 1}
                    </td>
                    <td className="border-b border-slate-100 px-3 py-3 text-sm font-semibold text-slate-900">
                      {payment.paymentNo ?? payment.paymentNumber ?? `PAY-${payment.id}`}
                    </td>
                    <td className="border-b border-slate-100 px-3 py-3 text-sm text-slate-600">
                      {payment.supplierName ?? payment.supplierId}
                    </td>
                    <td className="border-b border-slate-100 px-3 py-3 text-sm text-slate-600">
                      {formatDate(payment.paymentDate)}
                    </td>
                    <td className="border-b border-slate-100 px-3 py-3 text-right text-sm font-semibold tabular-nums text-slate-900">
                      {formatNumber(payment.amount)}
                    </td>
                    <td className="border-b border-slate-100 px-3 py-3 text-sm text-slate-600">
                      {getPaymentModeLabel(payment.paymentMode)}
                    </td>
                    <td className="border-b border-slate-100 px-3 py-3 text-sm text-slate-600">
                      {payment.referenceNo || "-"}
                    </td>
                    <td className="border-b border-slate-100 px-3 py-3 text-right">
                      <div className="flex items-center justify-end gap-0.5">
                        {capabilities.canUpdate && (
                          <AppButton
                            variant="secondary"
                            className="h-8 rounded-lg px-3"
                            onClick={() => void openEdit(payment)}
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
                                isLoading: false,
                                isOpen: true,
                                payment,
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
          itemLabel="payments"
          onPageChange={(value) => dispatch(setSupplierPaymentPage(value))}
          onPageSizeChange={(value) =>
            dispatch(setSupplierPaymentPageSize(value))
          }
          pageNumber={state.pageNumber}
          pageSize={state.pageSize}
          totalCount={state.totalCount}
          totalPages={state.totalPages}
        />
      </div>

      <PaymentModal
        billOptions={billOptions}
        canCreateSupplier={canCreateSupplier}
        isOpen={modal.isOpen}
        mode={modal.mode}
        onClose={() => setModal((current) => ({ ...current, isOpen: false }))}
        onCreateSupplier={() => {
          if (canCreateSupplier) {
            setSupplierCreateOpen(true);
          }
        }}
        onLoadBills={loadSupplierBills}
        onSubmit={submitPayment}
        payment={modal.payment}
        supplierOptions={supplierOptions}
      />

      <PartyFormModal
        isLoading={false}
        isOpen={supplierCreateOpen}
        mode="create"
        onClose={() => setSupplierCreateOpen(false)}
        onSubmit={submitSupplier}
        submitLabel="Create Supplier"
        title="Add Supplier"
      />

      <PurchaseConfirmDialog
        confirmLabel="Delete"
        description="This supplier payment will be deleted."
        isLoading={confirmation.isLoading}
        isOpen={confirmation.isOpen}
        title="Delete 1 supplier payment?"
        tone="danger"
        onCancel={() =>
          setConfirmation({
            isLoading: false,
            isOpen: false,
            payment: null,
          })
        }
        onConfirm={confirmDelete}
      />
    </section>
  );
};

export default SupplierPaymentsPage;
