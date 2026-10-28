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
import { enumNumber, requiredDate } from "../../../utils/validationRules";

import AppButton from "../../../components/common/AppButton";
import AppInput from "../../../components/common/AppInput";
import AppDateRangeFilter from "../../../components/common/AppDateRangeFilter";
import AppModal from "../../../components/common/AppModal";
import AppSelect from "../../../components/common/AppSelect";
import { PurchasePartyLookup, PurchaseSupplierBillLookup } from "../PurchaseMasterLookup";
import { financialIdSchema, financialMoneySchema } from "../../../utils/financialEntry";
import { addDecimal, compareDecimal, subtractDecimal } from "../../../utils/productionValues";
import PageHeader from "../../../components/common/PageHeader";
import useUnsavedChanges from "../../../hooks/useUnsavedChanges";
import useScopedDraft from "../../../hooks/useScopedDraft";
import useProductionRuntime from "../../../hooks/useProductionRuntime";
import { applyApiErrorsToForm } from "../../../utils/formApiErrors";
import { getApiStatus } from "../../../utils/apiError";
import { formatCurrency } from "../../../utils/reportFormat";
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
  formatDate,
  getActionError,
  getDocumentNumber,
  getPaymentModeLabel,
  getSuccessMessage,
  getTodayInputValue,
  PAYMENT_MODE,
  PAYMENT_MODE_OPTIONS,
  toInputDate,
} from "../purchaseHelpers";
import {
  PurchaseConfirmDialog,
  PurchasePagination,
  PurchaseStatCard,
} from "../PurchaseShared";

const supplierCreateSource = { partyType: "Supplier" };

const allocationSchema = z.object({
  purchaseBillId: financialIdSchema,
  allocatedAmount: financialMoneySchema(),
});

const paymentSchema = z
  .object({
    supplierId: z.string().uuid("Supplier is required"),
    paymentDate: requiredDate("Payment date"),
    amount: financialMoneySchema(true),
    paymentMode: enumNumber(PAYMENT_MODE, "Payment mode"),
    referenceNo: z.string().optional(),
    notes: z.string().optional(),
    allocations: z.array(allocationSchema).optional(),
  })
  .superRefine((values, context) => {
    const allocated = (values.allocations ?? []).reduce(
      (total, allocation) => addDecimal(total, allocation.allocatedAmount || "0"),
      "0",
    );

    if (compareDecimal(allocated, values.amount) > 0) {
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

export const PaymentModal = ({
  billOptions,
  billsLoading,
  billsError,
  canCreateSupplier = false,
  isOpen,
  mode,
  onClose,
  onCreateSupplier,
  onLoadBills,
  onSubmit,
  payment,
  supplierOptions,
  onReviewHistory,
}) => {
  const {
    control,
    handleSubmit,
    getValues,
    register,
    reset,
    setError,
    setValue,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({
    resolver: zodResolver(paymentSchema),
    defaultValues: getDefaultValues(payment),
  });
  const { append, fields, remove, replace } = useFieldArray({
    control,
    name: "allocations",
  });
  const watchedSupplier = useWatch({ control, name: "supplierId" });
  const watchedAmount = useWatch({ control, name: "amount" });
  const allocations = useWatch({ control, name: "allocations" }) ?? [];
  const allocatedTotal = allocations.reduce(
    (total, allocation) => { try { return addDecimal(total, allocation.allocatedAmount || "0"); } catch { return total; } },
    "0",
  );

  const formValues = useWatch({ control });
  const submitLock = useRef({ context: null, locked: false });
  const recordContext = String(payment?.id ?? "new");
  const [unknownState, setUnknownState] = useState({ context: null, value: false });
  const sessionUnknown = unknownState.context === recordContext && unknownState.value;
  const business = useProductionRuntime();
  const draft = useScopedDraft({ entity: "supplier-payment", context: payment?.id ?? "new", values: { form: formValues, outcomeUnknown: sessionUnknown || isSubmitting }, enabled: isOpen && (isDirty || sessionUnknown || isSubmitting) });
  const outcomeUnknown = sessionUnknown || Boolean(draft.recoveredDraft?.values?.outcomeUnknown);
  const { confirmLeave } = useUnsavedChanges({ when: isOpen && (isDirty || outcomeUnknown || isSubmitting) });
  useEffect(() => {
    if (isOpen && !payment && !isDirty && business.runtime?.businessDate) setValue("paymentDate", business.runtime.businessDate, { shouldDirty: false });
  }, [business.runtime?.businessDate, isDirty, isOpen, payment, setValue]);

  useEffect(() => {
    if (isOpen) {
      reset(getDefaultValues(payment));
    }
  }, [isOpen, payment, reset]);

  useEffect(() => {
    if (isOpen) void onLoadBills(watchedSupplier || "");
  }, [isOpen, onLoadBills, watchedSupplier]);

  return (
    <AppModal
      title={mode === "edit" ? "Edit Supplier Payment" : "New Supplier Payment"}
      isBusy={isSubmitting}
      isOpen={isOpen}
      maxWidth="max-w-5xl"
      onClose={isSubmitting ? undefined : () => confirmLeave(onClose)}
    >
      {draft.recoveredDraft && <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">A saved draft is available for this payment. Review it before saving. <button type="button" className="underline" onClick={() => { reset(draft.recoveredDraft.values.form ?? draft.recoveredDraft.values, { keepDefaultValues: true }); setUnknownState({ context: recordContext, value: Boolean(draft.recoveredDraft.values.outcomeUnknown) }); draft.acknowledgeRecovery(); }}>Restore for review</button> <button type="button" className="underline" disabled={outcomeUnknown} onClick={draft.clearDraft}>Discard draft</button></div>}
      {outcomeUnknown && <div role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">This result needs a history check. <button type="button" className="underline" onClick={async () => { draft.saveDraft({ form: draft.recoveredDraft?.values?.form ?? getValues(), outcomeUnknown: true }); await onReviewHistory?.(); onClose(); }}>Return to refreshed history</button> <button type="button" className="underline" onClick={() => { const reviewed = draft.recoveredDraft?.values?.form ?? getValues(); if (draft.recoveredDraft) { reset(reviewed, { keepDefaultValues: true }); draft.acknowledgeRecovery(); } draft.saveDraft({ form: reviewed, outcomeUnknown: false }); submitLock.current = { context: recordContext, locked: false }; setUnknownState({ context: recordContext, value: false }); }}>I reviewed saved entries; allow retry</button></div>}
      {errors.root?.server && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{errors.root.server.message}</p>}
      {draft.storageError && <p role="alert" className="text-sm text-rose-700">{draft.storageError}</p>}
      <form
        className="mt-5 max-h-[calc(100vh-12rem)] space-y-5 overflow-y-auto px-1 pb-1"
        onSubmit={(event) => { void handleSubmit(async (values) => {
          if (outcomeUnknown || (submitLock.current.context === recordContext && submitLock.current.locked)) return;
          submitLock.current = { context: recordContext, locked: true };
          let needsReview = false;
          try {
            const retained = draft.saveDraft({ form: values, outcomeUnknown: true });
            if (draft.available && !retained) { setError("root.server", { type: "server", message: "The request was not sent because recovery storage could not be updated. Review the draft notice before retrying." }); return; }
            await onSubmit({
            supplierId: values.supplierId,
            paymentDate: values.paymentDate,
            amount: values.amount,
            paymentMode: Number(values.paymentMode),
            referenceNo: cleanNullableString(values.referenceNo),
            notes: cleanNullableString(values.notes),
            allocations: (values.allocations ?? [])
              .filter((allocation) => compareDecimal(allocation.allocatedAmount, "0") > 0)
              .map((allocation) => ({
                purchaseBillId: allocation.purchaseBillId,
                allocatedAmount: allocation.allocatedAmount,
              })),
          }); reset(values); setUnknownState({ context: recordContext, value: false }); draft.clearDraft(); }
          catch (error) {
            const status = getApiStatus(error);
            const uncertain = !status || status === 408 || status >= 500;
            needsReview = uncertain;
            if (uncertain) { setUnknownState({ context: recordContext, value: true }); draft.saveDraft({ form: values, outcomeUnknown: true }); }
            else draft.saveDraft({ form: values, outcomeUnknown: false });
            const names = Object.keys(values).concat((values.allocations ?? []).flatMap((line, index) => Object.keys(line).map((key) => `allocations.${index}.${key}`)));
            applyApiErrorsToForm({ error, formFieldNames: names, setError });
            setError("root.server", { type: "server", message: uncertain ? "The save result is unknown. Review saved entries before retrying to avoid a duplicate." : getActionError(error, "Save failed. Your entries have been retained.") });
          } finally { submitLock.current = { context: recordContext, locked: needsReview }; }
        })(event); }}
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Controller
            control={control}
            name="supplierId"
            render={({ field }) => (
              <PurchasePartyLookup
                label="Supplier"
                partyType="Supplier"
                required
                value={field.value}
                onChange={(value) => {
                  if (String(value) !== String(field.value)) replace([]);
                  field.onChange(value);
                }}
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
            required
            error={errors.amount?.message}
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
              <Plus className="h-4 w-4" />
              Add Allocation
            </AppButton>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left">
              <thead className="text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Purchase Bill<span className="ml-0.5 text-red-500">*</span></th>
                  <th className="px-4 py-3 text-right font-semibold">Amount</th>
                  <th className="w-14 px-2 py-3" />
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
                            <PurchaseSupplierBillLookup
                              disabled={!watchedSupplier || isSubmitting}
                              supplierId={watchedSupplier}
                              value={billField.value}
                              onChange={billField.onChange}
                              onBlur={billField.onBlur}
                              options={billOptions}
                              placeholder="Select bill"
                              required
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
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-all hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 disabled:cursor-not-allowed disabled:opacity-40"
                            onClick={() => remove(index)}
                            aria-label="Remove allocation"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3 text-sm sm:flex-row sm:justify-end">
            <span>Payment: {formatCurrency(watchedAmount)}</span>
            <span>Allocated: {formatCurrency(allocatedTotal)}</span>
            <span
              className={
                compareDecimal(allocatedTotal, watchedAmount || "0") > 0
                  ? "font-semibold text-red-600"
                  : "font-semibold text-slate-900"
              }
            >
              Unallocated: {formatCurrency(subtractDecimal(watchedAmount || "0", allocatedTotal))}
            </span>
          </div>
          {billsLoading && <p role="status" className="px-4 py-2 text-sm text-slate-600">Loading this supplier's bills…</p>}
          {billsError && <div role="alert" className="px-4 py-2 text-sm text-red-700">{billsError} <button type="button" className="underline" onClick={() => onLoadBills(watchedSupplier)}>Retry</button></div>}
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
            className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/20"
            {...register("notes")}
          />
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
          <AppButton
            variant="secondary"
            disabled={isSubmitting}
            onClick={() => confirmLeave(onClose)}
          >
            Cancel
          </AppButton>
          <AppButton type="submit" disabled={outcomeUnknown} isLoading={isSubmitting} loadingText="Saving…">
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
    pageName: "PurchaseExpense.PaymentOut",
    resource: ["supplierPayments", "supplierPayment"],
    route: "/purchase/supplier-payments",
  });
  const canCreateSupplier = useCreatePermission({
    label: "Party Master",
    pageName: "Party",
    resource: "party",
    route: "/party",
  });
  const [searchInput, setSearchInput] = useState(state.filters.Search);
  const [suppliers, setSuppliers] = useState([]);
  const [supplierBills, setSupplierBills] = useState([]);
  const [billsLoading, setBillsLoading] = useState(false);
  const [billsError, setBillsError] = useState("");
  const billsRequest = useRef(0);
  const supplierCacheRef = useRef({ loaded: false, promise: null });
  const supplierCreateResolver = useRef(null);
  const [modal, setModal] = useState({
    isLoading: false,
    isOpen: false,
    mode: "create",
    payment: null,
  });
  const [supplierCreateOpen, setSupplierCreateOpen] = useState(false);
  const requestSupplierCreate = () => canCreateSupplier ? new Promise((resolve) => { supplierCreateResolver.current?.(null); supplierCreateResolver.current = resolve; setSupplierCreateOpen(true); }) : undefined;
  const closeSupplierCreate = () => { supplierCreateResolver.current?.(null); supplierCreateResolver.current = null; setSupplierCreateOpen(false); };
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
      .getParties({ PageNumber: 1, PageSize: 40, IsActive: true })
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
    const requestId = ++billsRequest.current;
    setSupplierBills([]);
    setBillsError("");
    setBillsLoading(Boolean(supplierId));
    if (!supplierId) return;
    try {
      const response = await purchaseBillService.getPurchaseBillsBySupplier(
        supplierId,
        { PageNumber: 1, PageSize: 40 },
      );
      if (requestId !== billsRequest.current) return;
      setSupplierBills(getLookupList(response).filter((bill) => !bill.supplierId || String(bill.supplierId) === String(supplierId)));
    } catch (error) {
      if (requestId !== billsRequest.current) return;
      setBillsError(getActionError(error, "Unable to load supplier bills."));
    } finally {
      if (requestId === billsRequest.current) setBillsLoading(false);
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
        value: String(bill.id),
        label: `${getDocumentNumber(bill, "PB")} - Outstanding ${formatCurrency(
          bill.balanceAmount ?? bill.dueAmount ?? bill.outstandingAmount,
        )}`,
      })),
    [supplierBills],
  );

  const stats = useMemo(() => {
    const totalPaid = state.list.reduce(
      (sum, payment) => addDecimal(sum, payment.amount),
      "0",
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
        const result = await partyService.createParty({ ...payload, partyType: payload.partyType ?? "Supplier" });
        const created = result.data?.party ?? result.data;
        toast.success("Supplier created successfully");
        supplierCacheRef.current.loaded = false;
        await loadSuppliers({ force: true });
        supplierCreateResolver.current?.(created);
        supplierCreateResolver.current = null;
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

  return (
    <section className="min-w-0 space-y-5">
      <PageHeader
        badge={
          <>
            <CreditCard className="h-3.5 w-3.5" />
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
              <RefreshCw
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
                <Plus className="h-4 w-4" />
                New Payment
              </AppButton>
            )}
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <PurchaseStatCard
          icon={CreditCard}
          label="Total Paid"
          value={stats.totalPaid}
          scope={stats.metricScope}
          colorClass="bg-brand-light text-brand"
        />
        <PurchaseStatCard
          icon={CreditCard}
          label="Payments"
          value={stats.count}
          scope={stats.totalScope}
          colorClass="bg-emerald-50 text-emerald-600"
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="grid gap-3 xl:grid-cols-[minmax(240px,1fr)_220px_160px_160px_auto]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              aria-label="Search supplier payments"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search supplier payments..."
              className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </label>
          <PurchasePartyLookup
            value={state.filters.SupplierId}
            onChange={(value) => {
              dispatch(setSupplierPaymentFilters({ SupplierId: value }));
              dispatch(setSupplierPaymentPage(1));
            }}
            options={[{ value: "all", label: "All suppliers" }, ...supplierOptions]}
            aria-label="Filter by supplier"
            partyType="Supplier"
            creatable={canCreateSupplier}
            createLabel="Create new supplier"
            onCreateClick={requestSupplierCreate}
          />
<AppDateRangeFilter
            className="w-full sm:col-span-2 sm:min-w-[260px]"
            fromDate={state.filters.FromDate}
            toDate={state.filters.ToDate}
            allowLifetime={true}
            onChange={({ fromDate, toDate }) => { dispatch(setSupplierPaymentFilters({ FromDate: fromDate, ToDate: toDate })); dispatch(setSupplierPaymentPage(1)); }}
          />
          <AppButton
            variant="secondary"
            className="h-10 rounded-lg px-3"
            disabled={!hasFilters}
            onClick={() => {
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
            }}
          >
            <RotateCcw className="h-4 w-4" />
            Clear
          </AppButton>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] table-fixed text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="border-b border-slate-200 px-3 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                  #
                </th>
                <th className="border-b border-slate-200 px-3 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Payment #
                </th>
                <th className="border-b border-slate-200 px-3 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Supplier
                </th>
                <th className="border-b border-slate-200 px-3 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Date
                </th>
                <th className="border-b border-slate-200 px-3 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">
                  Amount
                </th>
                <th className="border-b border-slate-200 px-3 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Mode
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
                    <td colSpan={8} className="px-3 py-3">
                      <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
                    </td>
                  </tr>
                ))
              ) : state.error || state.list.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-12 text-center text-sm text-slate-500"
                  >
                    {state.error || "No supplier payments found."}
                  </td>
                </tr>
              ) : (
                state.list.map((payment, index) => (
                  <tr key={payment.id} className="hover:bg-slate-50">
                    <td className="border-b border-slate-100 px-4 py-3.5 text-xs font-semibold tabular-nums text-slate-400">
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
                    <td className="border-b border-slate-100 px-3 py-3 text-right text-sm font-semibold text-slate-900">
                      {formatCurrency(payment.amount)}
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
        </div>

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
        onReviewHistory={loadPayments}
        billOptions={billOptions}
        billsLoading={billsLoading}
        billsError={billsError}
        canCreateSupplier={canCreateSupplier}
        isOpen={modal.isOpen}
        mode={modal.mode}
        onClose={() => setModal((current) => ({ ...current, isOpen: false }))}
        onCreateSupplier={requestSupplierCreate}
        onLoadBills={loadSupplierBills}
        onSubmit={submitPayment}
        payment={modal.payment}
        supplierOptions={supplierOptions}
      />

      <PartyFormModal
        source={supplierCreateSource}
        isLoading={false}
        isOpen={supplierCreateOpen}
        mode="create"
        onClose={closeSupplierCreate}
        onSubmit={submitSupplier}
        submitLabel="Create Supplier"
        title="Add Supplier"
      />

      <PurchaseConfirmDialog
        confirmLabel="Delete"
        description="This supplier payment will be deleted."
        isLoading={confirmation.isLoading}
        isOpen={confirmation.isOpen}
        title="Delete Supplier Payment?"
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
