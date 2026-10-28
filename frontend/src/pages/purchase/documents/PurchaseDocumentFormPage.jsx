import useFormReturnContext from "../../../hooks/useFormReturnContext";
import useUncertainSave from "../../../hooks/useUncertainSave";
import UncertainSaveNotice from "../../../components/commerce/UncertainSaveNotice";
import { purchaseOrderService } from "../../../services/purchase/purchaseOrderService";
import { purchaseReturnService } from "../../../services/purchase/purchaseReturnService";
import useDocumentBusinessDefaults from "../../../hooks/useDocumentBusinessDefaults";
import { documentLookupService } from "../../../services/documentLookupService";
import { purchaseDocumentSchema as documentSchema } from "./purchaseDocumentSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Save } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import AppButton from "../../../components/common/AppButton";
import AppInput from "../../../components/common/AppInput";
import AppSelect from "../../../components/common/AppSelect";
import AppLookup from "../../../components/common/AppLookup";
import { lookupPage } from "../../../utils/lookupPage";
import PageHeader from "../../../components/common/PageHeader";
import { applyApiErrorsToForm } from "../../../utils/formApiErrors";
import { purchaseDocumentActions } from "./purchaseLifecycle";
import FormErrorSummary from "../../../components/commerce/FormErrorSummary";
import { returnSourceLines } from "./purchaseReturnSource";
import useCapabilities from "../../../hooks/useCapabilities";
import useCreatePermission from "../../../hooks/useCreatePermission";
import useUnsavedChanges from "../../../hooks/useUnsavedChanges";
import useScopedDraft from "../../../hooks/useScopedDraft";
import { withoutDirtyPrompt } from "../../../utils/dirtyWork";
import { categoryService } from "../../../services/inventory/categoryService";
import { itemService } from "../../../services/inventory/itemService";
import { unitService } from "../../../services/inventory/unitService";
import { purchaseBillService } from "../../../services/purchase/purchaseBillService";
import CategoryFormModal from "../../inventory/categories/CategoryFormModal";
import ItemFormModal from "../../inventory/items/ItemFormModal";
import UnitFormModal from "../../inventory/units/UnitFormModal";
import { PartyFormModal } from "../../party";
import { getPartyDisplayName, getPartyType } from "../../party/partyHelpers";
import { partyService } from "../../party/partyService";
import PurchaseLineItems, { PurchaseNumberInput } from "../PurchaseLineItems";
import {  buildPurchaseDocumentPayload as buildPayload,  extractItems,
  formatCurrency,
  getActionError,
  getDefaultLine,
  getDocumentNumber,
  getDocumentTotals,
  getSuccessMessage,
  getSupplierName,  PAYMENT_TYPE,
  PAYMENT_TYPE_OPTIONS,
  toInputDate,
} from "../purchaseHelpers";

const getDefaultValues = (record, config) => {
  const today = "";

  return {
    supplierId: record?.supplierId ?? "",
    supplierInvoiceNo: record?.supplierInvoiceNo ?? "",
    purchaseBillId: record?.purchaseBillId ?? "",
    billDate: toInputDate(record?.billDate) || today,
    dueDate: toInputDate(record?.dueDate),
    orderDate: toInputDate(record?.orderDate) || today,
    expectedDeliveryDate:
      toInputDate(record?.expectedDeliveryDate),
    returnDate: toInputDate(record?.returnDate) || today,
    paymentType: record?.paymentType ?? PAYMENT_TYPE.CASH,
    discountAmount: String(record?.discountAmount ?? 0),
    roundOff: String(record?.roundOff ?? 0),
    paidAmount: String(record?.paidAmount ?? 0),
    reason: record?.reason ?? "",
    termsAndConditions:
      record?.termsAndConditions ?? "Purchase terms as agreed with supplier.",
    notes: record?.notes ?? "",
    items: record ? extractItems(record) : [getDefaultLine()],
    activeDate: toInputDate(record?.[config.dateField]) || today,
  };
};

const getLookupList = (response) => {
  const data = response?.data;

  if (Array.isArray(data)) {
    return data;
  }

  return data?.items ?? [];
};

const getResponseRecord = (response, key) => {
  return response?.data?.[key] ?? response?.data ?? null;
};

const PurchaseDocumentFormPage = ({ config }) => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { returnTo, returnState, savedState, returnToList } = useFormReturnContext(config.listPath);
  const [searchParams] = useSearchParams();
  const sourceBillId = config.supportsBillSelect && !isEdit ? searchParams.get("purchaseBillId") : null;
  const returnRequest = useRef(0);
  const inlineTarget = useRef(null);
  const [returnSourceMessage, setReturnSourceMessage] = useState("");
  const capabilities = useCapabilities({
    actions: ["view", "create", "update"],
    label: config.label,
    pageName: config.permissionPageName,
    resource: [config.selectorKey, config.singularLabel, config.pluralLabel],
    route: config.routeBase,
  });
  const canCreateSupplier = useCreatePermission({ label: "Party Master", pageName: "Party", resource: "party", route: "/party" });
  const canCreateItem = useCreatePermission({ label: "Items", resource: "items", route: "/items" });
  const canCreateCategory = useCreatePermission({ label: "Categories", resource: "categories", route: "/categories" });
  const canCreateUnit = useCreatePermission({ label: "Units", resource: "units", route: "/units" });

  const state = useSelector((store) => store[config.selectorKey]);
  const detailLoading = state.detailLoading;
  const detailError = state.detailError;
  const detailRecord = String(state.selected?.id??"")===String(id??"") ? state.selected : null;

  const [lookups, setLookups] = useState({
    bills: [], billsLoading: false,
    items: [], itemsLoading: true,
    suppliers: [], suppliersLoading: true,
  });
  const [lookupCreateModal, setLookupCreateModal] = useState({ category: false, item: false, supplier: false, unit: false });
  const [itemCreateLookups, setItemCreateLookups] = useState({
    categories: [], categoriesLoading: false,
    units: [], unitsLoading: false,
  });

  const {
    control,
    handleSubmit,
    register,
    reset,
    setValue,
    getValues,
    getFieldState,
    setError,
    clearErrors,
    formState: { errors, isDirty, isSubmitting },
  } = useForm({
    resolver: zodResolver(documentSchema(config.dateField)),
    defaultValues: getDefaultValues(null, config),
  });
  const watchedItems = useWatch({ control, name: "items" }) ?? [];
  const supplierId = useWatch({ control, name: "supplierId" });
  const draftValues = useWatch({ control });
  const recovery=useUncertainSave({entity:config.selectorKey,context:id??`new:${sourceBillId??"manual"}`,recordId:isEdit?id:null});
  const draft = useScopedDraft({ entity: config.selectorKey, context: id ?? `new:${sourceBillId ?? "manual"}`, version: detailRecord?.rowVersion ?? 1, values: draftValues, enabled: isDirty&&!recovery.blocked });
  const { confirmLeave } = useUnsavedChanges({ when: isDirty && !isSubmitting });
  const discountAmount = useWatch({ control, name: "discountAmount" }) ?? "0";
  const roundOff = useWatch({ control, name: "roundOff" }) ?? "0";
  const paidAmount = useWatch({ control, name: "paidAmount" }) ?? "0";
  const totals = getDocumentTotals({ discountAmount, items: watchedItems, paidAmount, roundOff });

  const loadLookup = useCallback((type) => {
    const request =
      type === "suppliers"
        ? partyService.getParties({ PageNumber: 1, PageSize: 200, IsActive: true })
        : type === "items"
          ? documentLookupService.items({ PageNumber: 1, PageSize: 200, IsActive: true })
          : purchaseBillService.getPurchaseBills({ PageNumber: 1, PageSize: 200 });

    setLookups((current) => ({ ...current, [`${type}Loading`]: true }));

    return request
      .then((response) => {
        const rows = getLookupList(response).filter((entry) => {
          if (entry?.id === null || entry?.id === undefined) return false;
          if (type === "suppliers") return entry?.isActive !== false && ["supplier", "both"].includes(getPartyType(entry));
          return entry?.isActive !== false;
        });

        setLookups((current) => ({ ...current, [type]: rows, [`${type}Loading`]: false }));
      })
      .catch((error) => {
        toast.error(getActionError(error, `Unable to load ${type}.`));
        setLookups((current) => ({ ...current, [`${type}Loading`]: false }));
      });
  }, []);

  const loadLookups = useCallback(() => {
    return Promise.all([
      loadLookup("suppliers"),
      loadLookup("items"),
      ...(config.supportsBillSelect ? [loadLookup("bills")] : []),
    ]);
  }, [config.supportsBillSelect, loadLookup]);

  useEffect(() => {
    void Promise.resolve().then(loadLookups);
  }, [loadLookups]);

  useEffect(() => {
    if (!isEdit) {
      return undefined;
    }

    const request = dispatch(config.detailThunk(id));

    request.unwrap().catch((error) => {
      if (error?.name !== "AbortError") {
        toast.error(getActionError(error, `Unable to load this ${config.singularLabel.toLowerCase()}.`));
      }
    });

    return () => request.abort?.();
  }, [config, dispatch, id, isEdit]);

  useEffect(() => {
    if (isEdit && detailRecord && String(detailRecord.id) === String(id)) {
      reset(getDefaultValues(detailRecord, config));
    }
  }, [config, detailRecord, id, isEdit, reset]);

  const businessContext = useDocumentBusinessDefaults({ enabled: !isEdit, fields: [config.dateField], getValues, getFieldState, setValue });

  const loadReturnSource = useCallback(async (billId) => {
    const requestId = ++returnRequest.current;
    setValue("purchaseBillId", String(billId ?? ""), { shouldDirty: true });
    setValue("items", [], { shouldDirty: true });
    if (!billId) return;
    setReturnSourceMessage("Loading original bill lines and remaining returnable quantities…");
    try {
      const response = await purchaseBillService.getPurchaseBillById(billId);
      if (returnRequest.current !== requestId || String(getValues("purchaseBillId")) !== String(billId)) return;
      const bill = getResponseRecord(response, "purchaseBill");
      const lines = returnSourceLines(bill);
      setValue("supplierId", bill.supplierId, { shouldDirty: true });
      setValue("items", lines, { shouldDirty: true, shouldValidate: true });
      setReturnSourceMessage(lines.length ? "Original lines and units are linked. Review quantities before saving. This return reduces stock and creates the supplier credit. Receipt-owned goods must use the original physical receipt return and its separate credit action." : "No bill-owned quantity remains returnable. Receipt-owned goods must be returned from their original physical receipt; its credit action does not deduct stock again.");
    } catch (error) {
      if (returnRequest.current === requestId) setReturnSourceMessage(getActionError(error, "Unable to load original bill lines. Retry the source selection."));
    }
  }, [getValues, setValue]);
  useEffect(() => { if (sourceBillId) void Promise.resolve().then(() => loadReturnSource(sourceBillId)); }, [loadReturnSource, sourceBillId]);

  const supplierOptions = useMemo(
    () => lookups.suppliers.map((supplier) => ({ value: supplier.id, label: getPartyDisplayName(supplier) })),
    [lookups.suppliers],
  );
  const itemOptions = useMemo(
    () => lookups.items.map((item) => ({ value: String(item.id), label: [item.name, item.itemCode].filter(Boolean).join(" - ") })),
    [lookups.items],
  );
  const itemsById = useMemo(() => new Map(lookups.items.map((item) => [String(item.id), item])), [lookups.items]);
  const billOptions = useMemo(
    () => lookups.bills.map((bill) => ({ value: String(bill.id), label: `${getDocumentNumber(bill, "PB")} - ${getSupplierName(bill)}` })),
    [lookups.bills],
  );

  const loadItemCreateLookups = useCallback(async () => {
    setItemCreateLookups((current) => ({ ...current, categoriesLoading: true, unitsLoading: true }));

    try {
      const [categories, units] = await Promise.all([
        categoryService.getCategories({ IsActive: true, PageNumber: 1, PageSize: 200 }),
        unitService.getUnits({ IsActive: true, PageNumber: 1, PageSize: 200 }),
      ]);

      setItemCreateLookups({
        categories: getLookupList(categories), categoriesLoading: false,
        units: getLookupList(units), unitsLoading: false,
      });
    } catch (error) {
      toast.error(getActionError(error, "Unable to load item form lookups."));
      setItemCreateLookups((current) => ({ ...current, categoriesLoading: false, unitsLoading: false }));
    }
  }, []);

  const openLookupCreate = useCallback((type, selectItem) => {
    const allowed = { category: canCreateCategory, item: canCreateItem, supplier: canCreateSupplier, unit: canCreateUnit }[type];

    if (!allowed) {
      toast.error("You don't have permission to create this record.");
      return;
    }

    if (type === "item") {
      void loadItemCreateLookups();
    }

    inlineTarget.current = { selectItem: type === "item" ? selectItem : inlineTarget.current?.selectItem, selectMaster: type !== "item" ? selectItem : null, element: document.activeElement };
    setLookupCreateModal((current) => ({ ...current, [type]: true }));
  }, [canCreateCategory, canCreateItem, canCreateSupplier, canCreateUnit, loadItemCreateLookups]);

  const closeLookupCreate = useCallback((type) => { setLookupCreateModal((current) => ({ ...current, [type]: false })); requestAnimationFrame(() => inlineTarget.current?.element?.focus?.()); }, []);


  const submitLookupCreate = useCallback(async (type, payload, saveAndNew = false) => {
    try {
      if (type === "supplier") {
        const response = await partyService.createParty(payload);
        const created = response.data?.party ?? response.data;
        if (created?.id) { setLookups(current => ({ ...current, suppliers: [...current.suppliers.filter(row => String(row.id) !== String(created.id)), created] })); setValue("supplierId", created.id, { shouldDirty: true, shouldValidate: true }); }
        toast.success("Supplier created successfully");
      } else if (type === "item") {
        const response = await itemService.createItem(payload);
        const created = response.data?.item ?? response.data;
        if (created?.id) { setLookups(current => ({ ...current, items: [...current.items.filter(row => String(row.id) !== String(created.id)), created] })); inlineTarget.current?.selectItem?.(created); }
        toast.success("Item created successfully");
      } else if (type === "category") {
        const response = await categoryService.createCategory(payload);
        const created = response.data?.category ?? response.data;
        if (created?.id) { setItemCreateLookups(current => ({ ...current, categories: [...current.categories, created] })); inlineTarget.current?.selectMaster?.(created); }
        toast.success("Category created successfully");
      } else {
        const response = await unitService.createUnit(payload);
        const created = response.data?.unit ?? response.data;
        if (created?.id) { setItemCreateLookups(current => ({ ...current, units: [...current.units, created] })); inlineTarget.current?.selectMaster?.(created); }
        toast.success("Unit created successfully");
      }

      if (!saveAndNew) {
        closeLookupCreate(type);
      }
    } catch (error) {
      toast.error(getActionError(error, "Unable to create record."));
      throw error;
    }
  }, [closeLookupCreate, setValue]);

  const saveDisabledReason = (isEdit ? capabilities.canUpdate : capabilities.canCreate)
    ? isEdit && (!detailRecord || !purchaseDocumentActions(detailRecord,config.pluralLabel).edit) ? "This document is loading or cannot be edited in its current state or inventory ownership. Open its detail to review the next permitted action." : ""
    : `You need ${isEdit ? "edit" : "create"} permission for ${config.pluralLabel}.`;

  const submitForm = async (values) => {
    clearErrors("root.server");
    if (saveDisabledReason) {
      toast.error(saveDisabledReason);
      return;
    }

    const payload = buildPayload(values, config);
    draft.saveDraft(values);
    if(!recovery.begin())return;

    try {
      const response = isEdit
        ? await dispatch(config.updateThunk({ id, payload })).unwrap()
        : await dispatch(config.createThunk(payload)).unwrap();
      const savedRecord = getResponseRecord(response, config.selectorKey.slice(0, -1));
      recovery.succeed();

      toast.success(getSuccessMessage(response, `${config.singularLabel} saved`));
      draft.clearDraft();
      reset(values);
      withoutDirtyPrompt(() => savedRecord?.id ? navigate(config.detailPath(savedRecord.id),{state:savedState(savedRecord.id)}) : returnToList());
    } catch (error) {
      if(recovery.fail(error)){draft.saveDraft(values);setError("root.server",{type:"server",message:"Save result is unconfirmed. Review saved history or readback before a retry; your values are retained."});toast.error("Save result needs review before retrying.");}
      else {
        applyApiErrorsToForm({error,formFieldNames:Object.keys(values).concat(values.items.flatMap((line,index)=>Object.keys(line).map(name=>`items.${index}.${name}`))),setError});
        setError("root.server",{type:"server",message:getActionError(error,`The request was rejected. Your ${config.singularLabel} entries are retained.`)});
        toast.error(getActionError(error,`Unable to save ${config.singularLabel}.`));
      }
    } finally {recovery.finish();}
  };

  const backRoute = returnTo;
  const title = isEdit ? `Edit ${config.singularLabel}` : `New ${config.singularLabel}`;

  if (isEdit && detailError) {
    return (
      <div className="space-y-5">
        <PageHeader title={title} />
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{detailError}</div>
        <AppButton variant="secondary" onClick={() => returnToList()}>
          <ArrowLeft className="h-4 w-4" /> Back to {config.pluralLabel}
        </AppButton>
      </div>
    );
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit(submitForm)} noValidate>
      <UncertainSaveNotice key={recovery.marker?.attemptId??"idle"} recovery={recovery} onReviewHistory={()=>{draft.saveDraft(getValues());returnToList();}} readRecord={isEdit?async()=>{const read=config.pluralLabel==="orders"?purchaseOrderService.getPurchaseOrderById:config.pluralLabel==="returns"?purchaseReturnService.getPurchaseReturnById:purchaseBillService.getPurchaseBillById;const response=await read(id);const saved=getResponseRecord(response,config.selectorKey.slice(0,-1));return `Saved ${config.singularLabel}: ${getDocumentNumber(saved,config.fallbackPrefix)}. Total ${formatCurrency(saved.grandTotal)}. Compare retained header and line values before deciding whether to retry.`;}:undefined}/>
      <fieldset disabled={recovery.blocked} className="contents">
      {draft.recoveredDraft && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{draft.stale ? "A draft from an earlier record version is available. Review current details before saving." : "An unsaved draft from this account and company is available."}<div className="mt-2 flex gap-3"><button type="button" className="font-semibold underline" onClick={() => { reset(draft.recoveredDraft.values, { keepDefaultValues: true }); draft.acknowledgeRecovery(); }}>Restore for review</button><button type="button" className="underline" onClick={draft.clearDraft}>Discard draft</button></div></div>}
      <FormErrorSummary errors={errors}/>
      {returnSourceMessage && <p role="status" className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">{returnSourceMessage}</p>}
      {!businessContext.runtime && <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{businessContext.loading ? "Loading the company business date…" : "Company business date is unavailable. Enter the document date explicitly."}</p>}
      <PageHeader
        title={title}
        actions={
          <>
            <AppButton variant="secondary" onClick={() => confirmLeave(() => navigate(backRoute,{state:returnState()}))}>
              <ArrowLeft className="h-4 w-4" /> Back
            </AppButton>
            <AppButton type="submit" isLoading={isSubmitting} loadingText="Saving…" disabled={Boolean(saveDisabledReason)} title={saveDisabledReason || undefined}>
              <Save className="h-4 w-4" /> Save
            </AppButton>
          </>
        }
      />

      {saveDisabledReason&&<p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{saveDisabledReason}</p>}
      {isEdit && detailLoading ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 9 }, (_, index) => (
            <div key={index} className="h-14 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      ) : (
        <>
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-slate-900">Document Header</h2>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Controller
                control={control}
                name="supplierId"
                render={({ field }) => (
                  <AppLookup
                    label="Supplier"
                    required
                    name={field.name} value={field.value}
                    onChange={(value) => { if (config.supportsBillSelect && String(value) !== String(field.value)) { ++returnRequest.current; setValue("purchaseBillId", "", { shouldDirty: true }); setValue("items", [], { shouldDirty: true }); setReturnSourceMessage("Choose a bill for the selected supplier."); } field.onChange(value); }}
                    onBlur={field.onBlur}
                    initialOptions={supplierOptions}
                    loadPage={async ({ search, page, pageSize, signal }) => lookupPage(await partyService.getParties({ Search: search, PartyType: "Supplier", PageNumber: page, PageSize: pageSize, IsActive: true }, { signal }), page, pageSize)}
                    loadById={async (value, options) => { const response = await partyService.getPartyById(value, options); return response.data?.party ?? response.data; }}
                    getOptionLabel={row => row.label ?? getPartyDisplayName(row)}
                    placeholder="Search supplier name or code"
                    error={errors.supplierId?.message}
                    createLabel="Create new supplier"
                    onCreate={canCreateSupplier ? () => openLookupCreate("supplier") : undefined}
                  />
                )}
              />

              {config.supportsBillSelect && (
                <Controller
                  control={control}
                  name="purchaseBillId"
                  render={({ field }) => (
                    <AppLookup
                      label="Purchase Bill"
                      name={field.name} value={field.value}
                      onChange={(value) => { field.onChange(String(value ?? "")); void loadReturnSource(value); }}
                      onBlur={field.onBlur}
                      initialOptions={billOptions.filter(option => { const bill = lookups.bills.find(row => String(row.id) === String(option.value)); return !supplierId || String(bill?.supplierId) === String(supplierId); })}
                      loadPage={async ({ search, page, pageSize, signal }) => lookupPage(await purchaseBillService.getPurchaseBills({ Search: search, SupplierId: supplierId || undefined, PageNumber: page, PageSize: pageSize }, { signal }), page, pageSize)}
                      loadById={async (value, options) => { const response = await purchaseBillService.getPurchaseBillById(value, options); return response.data?.purchaseBill ?? response.data; }}
                      getOptionLabel={row => row.label ?? `${getDocumentNumber(row, "PB")} · ${getSupplierName(row)}`}
                      scopeKey={supplierId}
                      placeholder="Select linked bill"
                      error={errors.purchaseBillId?.message}
                    />
                  )}
                />
              )}

              {config.supplierReferenceField && (
                <AppInput id="supplierInvoiceNo" label={config.supplierReferenceLabel} error={errors.supplierInvoiceNo?.message} {...register("supplierInvoiceNo")} />
              )}

              <AppInput
                id={config.dateField}
                label={config.dateField === "billDate" ? "Bill Date" : config.dateField === "orderDate" ? "Order Date" : "Return Date"}
                type="date"
                required
                error={errors[config.dateField]?.message}
                {...register(config.dateField)}
              />

              {config.dueDateField && (
                <AppInput id={config.dueDateField} label={config.secondaryDateLabel} type="date" error={errors[config.dueDateField]?.message} {...register(config.dueDateField)} />
              )}

              {config.supportsPaymentType && (
                <Controller
                  control={control}
                  name="paymentType"
                  render={({ field }) => (
                    <AppSelect label="Payment Type" name={field.name} value={field.value} onChange={(value) => field.onChange(Number(value))} onBlur={field.onBlur} options={PAYMENT_TYPE_OPTIONS} error={errors.paymentType?.message} />
                  )}
                />
              )}

              {config.supportsReason && (
                <AppInput id="returnReason" label="Reason" error={errors.reason?.message} {...register("reason")} />
              )}
            </div>
          </section>

          <PurchaseLineItems
            control={control}
            errors={errors.items}
            itemEmptyMessage="No items found in inventory."
            itemLoading={lookups.itemsLoading}
            itemOptions={itemOptions}
            itemsById={itemsById}
            canCreateItem={canCreateItem}
            onCreateItem={(selectItem) => openLookupCreate("item", selectItem)}
            setValue={setValue}
          />

          <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-4">
              {config.supportsTerms && (
                <div>
                  <label htmlFor="termsAndConditions" className="mb-1.5 block text-xs font-semibold text-slate-700">Terms &amp; Conditions</label>
                  <textarea
                    id="termsAndConditions"
                    rows={4}
                    className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/20"
                    {...register("termsAndConditions")}
                  />
                </div>
              )}
              <div>
                <label htmlFor="purchaseNotes" className="mb-1.5 block text-xs font-semibold text-slate-700">Notes</label>
                <textarea
                  id="purchaseNotes"
                  rows={4}
                  className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/20"
                  {...register("notes")}
                />
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-semibold text-slate-900">Totals</h3>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-slate-500">Subtotal</dt>
                  <dd className="font-semibold text-slate-900">{formatCurrency(totals.subTotal)}</dd>
                </div>
                {config.supportsDiscount && (
                  <PurchaseNumberInput control={control} id="purchaseDiscount" name="discountAmount" label="Document Discount" error={errors.discountAmount?.message} />
                )}
                {config.supportsRoundOff && (
                  <PurchaseNumberInput allowNegative control={control} id="purchaseRoundOff" name="roundOff" label="Round Off" error={errors.roundOff?.message} />
                )}
                {config.supportsPaidAmount && (
                  <PurchaseNumberInput control={control} id="purchasePaidAmount" name="paidAmount" label="Paid Amount" error={errors.paidAmount?.message} />
                )}
                <div className="flex items-center justify-between">
                  <dt className="text-slate-500">Tax</dt>
                  <dd className="font-semibold text-slate-900">{formatCurrency(totals.taxAmount)}</dd>
                </div>
                <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                  <dt className="text-base font-semibold text-slate-900">Grand Total</dt>
                  <dd className="text-xl font-bold text-brand">{formatCurrency(totals.grandTotal)}</dd>
                </div>
                {config.supportsPaidAmount && (
                  <div className="flex items-center justify-between">
                    <dt className="font-semibold text-slate-900">Balance</dt>
                    <dd className="font-bold text-red-600">{formatCurrency(totals.balanceAmount)}</dd>
                  </div>
                )}
              </dl>
            </div>
          </section>
        </>
      )}

      <div className="sticky bottom-4 flex flex-col-reverse gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-lg sm:flex-row sm:justify-end">
        <AppButton variant="secondary" disabled={isSubmitting} onClick={() => confirmLeave(() => navigate(backRoute,{state:returnState()}))}>
          Cancel
        </AppButton>
        <AppButton type="submit" isLoading={isSubmitting} loadingText="Saving…" disabled={Boolean(saveDisabledReason)} title={saveDisabledReason || undefined}>
          Save
        </AppButton>
      </div>

      <PartyFormModal
        isLoading={false}
        isOpen={lookupCreateModal.supplier}
        mode="create"
        source={{ partyType: "Supplier" }}
        onClose={() => closeLookupCreate("supplier")}
        onSubmit={(payload) => submitLookupCreate("supplier", payload)}
        submitLabel="Create Supplier"
        title="Add Supplier"
      />

      <ItemFormModal
        canCreateCategory={canCreateCategory}
        canCreateUnit={canCreateUnit}
        categoryOptions={itemCreateLookups.categories.map((category) => ({ value: Number(category.id), label: category.name }))}
        categoryEmptyMessage="No categories yet - add one in Categories."
        categoryLoading={itemCreateLookups.categoriesLoading}
        isLoading={false}
        isOpen={lookupCreateModal.item}
        item={null}
        mode="create"
        onClose={() => closeLookupCreate("item")}
        onCreateCategory={(selectMaster) => openLookupCreate("category", selectMaster)}
        onCreateUnit={(selectMaster) => openLookupCreate("unit", selectMaster)}
        onSubmit={(payload, saveAndNew) => submitLookupCreate("item", payload, saveAndNew)}
        unitOptions={itemCreateLookups.units.map((unit) => ({ value: Number(unit.id), label: unit.shortName ? `${unit.name} (${unit.shortName})` : unit.name }))}
        unitEmptyMessage="No units yet - add one in Units."
        unitLoading={itemCreateLookups.unitsLoading}
      />

      <CategoryFormModal
        category={null}
        isLoading={false}
        isOpen={lookupCreateModal.category}
        mode="create"
        onClose={() => closeLookupCreate("category")}
        onSubmit={(payload) => submitLookupCreate("category", payload)}
      />

      <UnitFormModal
        isLoading={false}
        isOpen={lookupCreateModal.unit}
        mode="create"
        onClose={() => closeLookupCreate("unit")}
        onSubmit={(payload, saveAndNew) => submitLookupCreate("unit", payload, saveAndNew)}
        unit={null}
      />
      </fieldset>
    </form>
  );
};

export default PurchaseDocumentFormPage;
