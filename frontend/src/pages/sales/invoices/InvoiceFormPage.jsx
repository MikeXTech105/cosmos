import { invoiceService } from "../../../services/sales/invoiceService";
import useUncertainSave from "../../../hooks/useUncertainSave";
import UncertainSaveNotice from "../../../components/commerce/UncertainSaveNotice";
import useFormReturnContext from "../../../hooks/useFormReturnContext";
import "../../purchase/commerceTables.css";
import GstRegistrationLookup from "../../gst/GstRegistrationLookup";
import FormErrorSummary from "../../../components/commerce/FormErrorSummary";
import useDocumentBusinessDefaults from "../../../hooks/useDocumentBusinessDefaults";
import { documentLookupService } from "../../../services/documentLookupService";
import { invoiceSchema } from "./invoiceSchema";
import { invoiceLookupTarget } from "./invoiceLookupGuard";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Plus, Save, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Controller,
  useFieldArray,
  useForm,
  useWatch,
} from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import AppButton from "../../../components/common/AppButton";
import AppInput from "../../../components/common/AppInput";
import AppSelect from "../../../components/common/AppSelect";
import AppLookup from "../../../components/common/AppLookup";
import { lookupPage } from "../../../utils/lookupPage";
import PageHeader from "../../../components/common/PageHeader";
import useCapabilities from "../../../hooks/useCapabilities";
import useCreatePermission from "../../../hooks/useCreatePermission";
import useUnsavedChanges from "../../../hooks/useUnsavedChanges";
import useScopedDraft from "../../../hooks/useScopedDraft";
import { withoutDirtyPrompt } from "../../../utils/dirtyWork";
import { applyApiErrorsToForm } from "../../../utils/formApiErrors";
import { categoryService } from "../../../services/inventory/categoryService";
import { itemService } from "../../../services/inventory/itemService";
import { hsnGstService } from "../../../services/gst/hsnGstService";
import { unitService } from "../../../services/inventory/unitService";
import CategoryFormModal from "../../inventory/categories/CategoryFormModal";
import ItemFormModal from "../../inventory/items/ItemFormModal";
import UnitFormModal from "../../inventory/units/UnitFormModal";
import { PartyFormModal } from "../../party";
import { getPartyDisplayName, getPartyType } from "../../party/partyHelpers";
import { partyService } from "../../party/partyService";
import {
  createInvoice,
  fetchInvoiceById,
  updateInvoice,
} from "../../../store/slices/sales/invoiceSlice";
import {
  buildInvoicePayload,
  formatCurrency,
  getActionError,
  getDefaultInvoiceLine,
  getInvoiceDefaultValues,
  getInvoiceTotals,
  getLineCalculations,
  getSuccessMessage,
  normalizeNumberBlurValue,
  normalizeNumberInput,
  PAYMENT_MODE_OPTIONS,
  SALES_PAYMENT_MODE,
} from "./invoiceHelpers";
import { canApplyItemDetails, getInvoiceItemDefaults } from "./invoiceItemDefaults";

const invoiceLineSchema = z.object({
  itemId: z.coerce.number().int().positive("Item is required"),
  itemName: z.string().optional(),
  quantity: z.coerce.number().positive("Quantity must be greater than 0"),
  rate: z.coerce.number().min(0, "Rate cannot be negative"),
  discountPercentage: z.coerce
    .number()
    .min(0, "Discount cannot be negative")
    .max(100, "Discount cannot exceed 100%"),
  discountAmount: z.coerce
    .number()
    .min(0, "Discount amount cannot be negative"),
  taxRateId: z.union([z.number(), z.string(), z.null()]).optional(),
  taxPercentage: z.coerce.number().min(0, "Tax cannot be negative"),
  hsnSacCode: z.string().optional(),
  hsnSource: z.string().optional(),
  itemDetailsStatus: z.enum(["idle", "loading", "ready", "missing", "error", "saved"]).optional(),
}).refine(line => line.discountAmount <= line.quantity * line.rate, { path: ["discountAmount"], message: "Discount cannot exceed line amount" })
  .superRefine((line, context) => {
    if (["loading", "missing", "error"].includes(line.itemDetailsStatus ?? "idle")) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["itemId"],
        message: line.itemDetailsStatus === "error"
          ? "Item defaults could not be loaded; select the item again before saving."
          : "Item Master price and GST data must load before saving this line.",
      });
    }
  });

const initialPaymentSchema = z
  .object({
    paymentDate: z.string().optional(),
    amount: z.coerce
      .number()
      .min(0, "Payment amount cannot be negative")
      .optional(),
    paymentMode: enumNumber(SALES_PAYMENT_MODE, "Payment mode"),
    referenceNumber: z.string().max(100, "Reference is too long").optional(),
    notes: z.string().max(500, "Payment notes are too long").optional(),
  })
  .superRefine((payment, context) => {
    if (Number(payment.amount) > 0 && !payment.paymentDate) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Payment date is required",
        path: ["paymentDate"],
      });
    }
  });

const invoiceSchema = z.object({
  // Party identifiers are backend-owned and may be GUIDs or numeric/string ids.
  customerPartyId: z.coerce.string().trim().min(1, "Customer is required"),
  companyGstRegistrationId: z.union([z.coerce.number().int().positive(), z.literal(""), z.null()]).optional(),
  placeOfSupplyStateCode: z.string().trim().regex(/^$|^[0-9]{2}$/, "Use a two-digit GST state code"),
  placeOfSupplySource: z.string().trim().max(50, "Source is too long"),
  priceBasis: z.union([z.literal(""), z.coerce.number().int().min(0).max(1)]).optional(),
  invoiceNumber: z.string().optional(),
  invoiceDate: requiredDate("Invoice date"),
  dueDate: optionalDate,
  discountAmount: z.coerce
    .number()
    .min(0, "Invoice discount cannot be negative"),
  notes: z.string().max(1000, "Notes are too long").optional(),
  termsAndConditions: z.string().max(2000, "Terms are too long").optional(),
  initialPayment: initialPaymentSchema.optional(),
  items: z.array(invoiceLineSchema).min(1, "Add at least one line item"),
}).superRefine((values, context) => {
  dateOrder(values, context, "invoiceDate", "dueDate", "Due date cannot be before invoice date");
  if (values.placeOfSupplyStateCode && !values.placeOfSupplySource) context.addIssue({ code: z.ZodIssueCode.custom, path: ["placeOfSupplySource"], message: "Explain the reviewed place-of-supply selection." });
});

const getLookupList = (response) => {
  const data = response?.data;

  if (Array.isArray(data)) {
    return data;
  }

  return data?.items ?? [];
};

const getResponseInvoice = (response) => {
  return response?.data?.invoice ?? response?.data ?? null;
};

const getResponseItem = (response) => {
  return response?.data?.item ?? response?.data ?? null;
};

const NumberInput = ({ className, control, disabled, error, id, label, name, placeholder = "0", required = false }) => (
  <Controller
    control={control}
    name={name}
    render={({ field }) => (
      <AppInput
        id={id}
        label={label}
        type="text"
        inputMode="decimal"
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        value={field.value ?? ""}
        name={field.name}
        error={error}
        className={className}
        onFocus={(event) => {
          if (String(field.value) === "0") {
            event.target.select();
          }
        }}
        onKeyDown={(event) => {
          if (["e", "E", "+", "-"].includes(event.key)) {
            event.preventDefault();
          }
        }}
        onChange={(event) => field.onChange(normalizeNumberInput(event.target.value))}
        onBlur={(event) => {
          field.onChange(normalizeNumberBlurValue(event.target.value));
          field.onBlur();
        }}
        ref={field.ref}
      />
    )}
  />
);

const InvoiceFormPage = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { returnTo, returnState, savedState, returnToList } = useFormReturnContext("/sales/invoices");
  const capabilities = useCapabilities({
    actions: ["view", "create", "update"],
    label: "Sale Invoices",
    pageName: "Sales.Invoice",
    resource: ["saleInvoices", "salesInvoices", "invoices"],
    route: "/sales/invoices",
  });
  const canCreateCustomer = useCreatePermission({ label: "Party Master", pageName: "Party", resource: "party", route: "/party" });
  const canCreateItem = useCreatePermission({ label: "Items", resource: "items", route: "/items" });
  const canCreateCategory = useCreatePermission({ label: "Categories", resource: "categories", route: "/categories" });
  const canCreateUnit = useCreatePermission({ label: "Units", resource: "units", route: "/units" });

  const detailLoading = useSelector((state) => state.salesInvoices.detailLoading);
  const detailError = useSelector((state) => state.salesInvoices.detailError);
  const detailInvoice = useSelector((state) => state.salesInvoices.selected);

  const [lookups, setLookups] = useState({
    customers: [], customersError: null, customersLoading: true,
    items: [], itemsError: null, itemsLoading: true,
    registrations: [], registrationsError: null, registrationsLoading: true,
  });
  const [lookupCreateModal, setLookupCreateModal] = useState({ category: false, customer: false, item: false, unit: false });
  const inlineTarget = useRef(null);
  const [itemCreateLookups, setItemCreateLookups] = useState({
    categories: [], categoriesLoading: false,
    units: [], unitsLoading: false,
  });

  const {
    control,
    handleSubmit,
    getValues,
    register,
    reset,
    setValue,
    getValues,
    getFieldState,
    setError,
    clearErrors,
    formState: { errors, isDirty, isSubmitting },
  } = useForm({
    resolver: zodResolver(invoiceSchema),
    defaultValues: getInvoiceDefaultValues(null),
  });
  const { append, fields, remove } = useFieldArray({ control, name: "items" });
  const itemDetailsCache = useRef(new Map());
  const itemSelectionVersions = useRef(new Map());
  const rowIndexes = useRef(new Map());
  rowIndexes.current = new Map(fields.map((field, index) => [field.id, index]));
  const watchedItems = useWatch({ control, name: "items" }) ?? [];
  const draftValues = useWatch({ control });
  const recovery=useUncertainSave({entity:"sales-invoice",context:id ?? "new",recordId:isEdit?id:null});
  const draft = useScopedDraft({ entity: "sales-invoice", context: id ?? "new", version: detailInvoice?.rowVersion ?? 1, values: draftValues, enabled: isDirty && !recovery.blocked });
  const { confirmLeave } = useUnsavedChanges({ when: isDirty && !isSubmitting });
  const invoiceDate = useWatch({ control, name: "invoiceDate" });
  const invoiceDiscountAmount = useWatch({ control, name: "discountAmount" }) ?? "0";
  const totals = getInvoiceTotals(watchedItems, invoiceDiscountAmount);

  const loadLookup = useCallback((type) => {
    const isCustomers = type === "customers";
    const loadingKey = isCustomers ? "customersLoading" : "itemsLoading";
    const errorKey = isCustomers ? "customersError" : "itemsError";
    const request = isCustomers
      ? partyService.getParties({ PageNumber: 1, PageSize: 200, IsActive: true })
      : documentLookupService.items({ PageNumber: 1, PageSize: 200, IsActive: true });

    setLookups((current) => ({ ...current, [loadingKey]: true, [errorKey]: null }));

    return request
      .then((response) => {
        const records = getLookupList(response).filter((entry) => {
          if (entry?.id === null || entry?.id === undefined) return false;
          if (entry?.isActive === false) return false;
          if (isCustomers) return ["customer", "both"].includes(getPartyType(entry));
          return Boolean(String(entry?.name ?? "").trim());
        });

        setLookups((current) => ({ ...current, [type]: records, [loadingKey]: false, [errorKey]: null }));
      })
      .catch((error) => {
        const message = getActionError(error, `Unable to load ${isCustomers ? "customers" : "items"}.`);

        setLookups((current) => ({ ...current, [loadingKey]: false, [errorKey]: message }));
        toast.error(message);
      });
  }, []);

  const loadRegistrations = useCallback(() => {
    setLookups((current) => ({ ...current, registrationsLoading: true, registrationsError: null }));
    return documentLookupService.registrations({ PageNumber: 1, PageSize: 200, Status: "Active" })
      .then((response) => {
        setLookups((current) => ({ ...current, registrations: getLookupList(response).filter((entry) => entry?.id && String(entry.status ?? "Active").toLowerCase() === "active"), registrationsLoading: false }));
      })
      .catch((error) => {
        const message = getActionError(error, "Unable to load GST registrations.");
        setLookups((current) => ({ ...current, registrationsLoading: false, registrationsError: message }));
      });
  }, []);

  const loadLookups = useCallback(() => {
    return Promise.all([loadLookup("customers"), loadLookup("items"), loadRegistrations()]);
  }, [loadLookup, loadRegistrations]);

  useEffect(() => {
    void Promise.resolve().then(loadLookups);
  }, [loadLookups]);

  useEffect(() => {
    if (!isEdit) {
      return undefined;
    }

    const request = dispatch(fetchInvoiceById(id));

    request.unwrap().catch((error) => {
      if (error?.name !== "AbortError") {
        toast.error(getActionError(error, "Unable to load this invoice."));
      }
    });

    return () => request.abort();
  }, [dispatch, id, isEdit]);

  useEffect(() => {
    if (isEdit && detailInvoice && String(detailInvoice.id) === String(id)) {
      reset(getInvoiceDefaultValues(detailInvoice));
    }
  }, [detailInvoice, id, isEdit, reset]);

  const businessContext = useDocumentBusinessDefaults({ enabled: !isEdit, fields: ["invoiceDate", "initialPayment.paymentDate"], getValues, getFieldState, setValue });

  const customerOptions = useMemo(
    () => lookups.customers.map((customer) => ({ value: customer.id, label: getPartyDisplayName(customer) })),
    [lookups.customers],
  );
  const itemOptions = useMemo(
    () => lookups.items.map((item) => ({ value: String(item.id), label: [item.name, item.itemCode].filter(Boolean).join(" - ") })),
    [lookups.items],
  );
  const registrationOptions = useMemo(() => lookups.registrations.map((registration) => ({
    value: String(registration.id),
    label: [registration.gstin, registration.legalName, registration.branchName || registration.city].filter(Boolean).join(" — "),
  })), [lookups.registrations]);
  const priceBasisOptions = [{ value: 0, label: "Tax Exclusive — entered price excludes GST" }, { value: 1, label: "Tax Inclusive — entered price includes GST" }];
  const placeSourceOptions = [
    { value: "CustomerBillingReviewed", label: "Customer billing state reviewed" },
    { value: "CustomerShippingReviewed", label: "Customer shipping state reviewed" },
    { value: "OtherConfirmed", label: "Other confirmed basis" },
  ];
  const itemsById = useMemo(() => new Map(lookups.items.map((item) => [String(item.id), item])), [lookups.items]);

  const applyItemDetails = async (rowId, itemId) => {
    const index = rowIndexes.current.get(rowId);
    if (index === undefined) return;

    const version = (itemSelectionVersions.current.get(rowId) ?? 0) + 1;
    itemSelectionVersions.current.set(rowId, version);

    const setLineValue = (name, value, options = {}) => {
      const currentIndex = rowIndexes.current.get(rowId);
      if (currentIndex !== undefined) {
        setValue(`items.${currentIndex}.${name}`, value, { shouldDirty: true, ...options });
      }
    };

    if (!itemId) {
      setLineValue("itemName", "");
      setLineValue("rate", "0", { shouldValidate: true });
      setLineValue("taxPercentage", "0", { shouldValidate: true });
      setLineValue("hsnSacCode", "");
      setLineValue("hsnSource", "");
      setLineValue("itemDetailsStatus", "idle");
      return;
    }

    const lookupItem = itemsById.get(String(itemId));
    const applyItem = (item, status) => {
      const defaults = getInvoiceItemDefaults(item);
      setLineValue("itemName", defaults.itemName);
      if (defaults.hasSalesPrice) setLineValue("rate", String(defaults.salesPrice), { shouldValidate: true });
      if (defaults.hasGstRate) setLineValue("taxPercentage", String(defaults.gstRate), { shouldValidate: true });
      setLineValue("hsnSacCode", defaults.hsnSacCode);
      setLineValue("hsnSource", defaults.hsnSacCode ? "Item master" : "Not configured in Item Master");
      setLineValue("itemDetailsStatus", status);
    };

    // Reset every item-owned value before loading details so a previously
    // selected item's values can never be submitted for this row.
    setLineValue("itemName", lookupItem?.name ?? "");
    setLineValue("rate", "0", { shouldValidate: true });
    setLineValue("taxPercentage", "0", { shouldValidate: true });
    setLineValue("hsnSacCode", "");
    setLineValue("hsnSource", "Loading item defaults…");
    setLineValue("itemDetailsStatus", "loading");

    if (lookupItem && Object.prototype.hasOwnProperty.call(lookupItem, "salesPrice")) {
      const listDefaults = getInvoiceItemDefaults(lookupItem);
      if (listDefaults.hasSalesPrice) setLineValue("rate", String(listDefaults.salesPrice), { shouldValidate: true });
    }

    try {
      const item = itemDetailsCache.current.has(String(itemId))
        ? itemDetailsCache.current.get(String(itemId))
        : getResponseItem(await itemService.getItemById(itemId));
      itemDetailsCache.current.set(String(itemId), item);

      const currentIndex = rowIndexes.current.get(rowId);
      const currentItemId = currentIndex === undefined ? null : getValues(`items.${currentIndex}.itemId`);
      if (!canApplyItemDetails({ currentItemId, requestItemId: itemId, currentVersion: itemSelectionVersions.current.get(rowId), requestVersion: version })) return;

      const defaults = getInvoiceItemDefaults(item);
      applyItem(item, defaults.hasSalesPrice && defaults.hasGstRate ? "ready" : "missing");
    } catch {
      const currentIndex = rowIndexes.current.get(rowId);
      const currentItemId = currentIndex === undefined ? null : getValues(`items.${currentIndex}.itemId`);
      if (!canApplyItemDetails({ currentItemId, requestItemId: itemId, currentVersion: itemSelectionVersions.current.get(rowId), requestVersion: version })) return;

      setLineValue("rate", "0", { shouldValidate: true });
      setLineValue("taxPercentage", "0", { shouldValidate: true });
      setLineValue("hsnSacCode", "");
      setLineValue("hsnSource", "Unable to load item defaults");
      setLineValue("itemDetailsStatus", "error");
    }
  }, [getValues, itemsById, setValue]);

  const previousInvoiceDate = useRef(invoiceDate);
  useEffect(() => {
    if (previousInvoiceDate.current === invoiceDate) return;
    previousInvoiceDate.current = invoiceDate;
    currentFields.current.forEach((_, index) => {
      const itemId = getValues(`items.${index}.itemId`);
      if (itemId) void applyItemDetails(index, itemId, true);
    });
  }, [applyItemDetails, getValues, invoiceDate]);

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

  const openLookupCreate = useCallback((type, rowId = null, selectMaster = null) => {
    const allowed = { category: canCreateCategory, customer: canCreateCustomer, item: canCreateItem, unit: canCreateUnit }[type];

    if (!allowed) {
      toast.error("You don't have permission to create this record.");
      return;
    }

    if (type === "item") {
      void loadItemCreateLookups();
    }

    inlineTarget.current = { type, rowId: rowId ?? inlineTarget.current?.rowId, selectMaster, element: document.activeElement };
    setLookupCreateModal((current) => ({ ...current, [type]: true }));
  }, [canCreateCategory, canCreateCustomer, canCreateItem, canCreateUnit, loadItemCreateLookups]);

  const closeLookupCreate = useCallback((type) => { setLookupCreateModal((current) => ({ ...current, [type]: false })); requestAnimationFrame(() => inlineTarget.current?.element?.focus?.()); }, []);


  const submitLookupCreate = useCallback(async (type, payload, saveAndNew = false) => {
    try {
      if (type === "customer") {
        const response = await partyService.createParty(payload);
        const created = response?.data?.party ?? response?.data;
        if (created?.id) { setLookups(current => ({ ...current, customers: [...current.customers.filter(row => String(row.id) !== String(created.id)), created] })); setValue("customerPartyId", created.id, { shouldDirty: true, shouldValidate: true }); }
        toast.success("Customer created successfully");
      } else if (type === "item") {
        const response = await itemService.createItem(payload);
        const created = getResponseItem(response);
        if (created?.id) {
          setLookups(current => ({ ...current, items: [...current.items.filter(row => String(row.id) !== String(created.id)), created] }));
          const rowIndex = currentFields.current.findIndex(row => row.id === inlineTarget.current?.rowId);
          if (rowIndex >= 0) { setValue(`items.${rowIndex}.itemId`, String(created.id), { shouldDirty: true, shouldValidate: true }); void applyItemDetails(rowIndex, created.id); }
        }
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
  }, [applyItemDetails, closeLookupCreate, setValue]);

  const saveDisabledReason = (isEdit ? capabilities.canUpdate : capabilities.canCreate)
    ? ""
    : `You need ${isEdit ? "edit" : "create"} permission for sale invoices.`;

  const submitForm = async (values) => {
    clearErrors("root.server");
    if (saveDisabledReason) {
      toast.error(saveDisabledReason);
      return;
    }

    const payload = buildInvoicePayload(values);
    draft.saveDraft(values);
    if(!recovery.begin())return;

    try {
      const response = isEdit
        ? await dispatch(updateInvoice({ id, payload })).unwrap()
        : await dispatch(createInvoice(payload)).unwrap();
      const savedInvoice = getResponseInvoice(response);
      recovery.succeed();

      toast.success(getSuccessMessage(response, isEdit ? "Invoice updated successfully" : "Invoice created successfully"));
      draft.clearDraft();
      reset(values);
      withoutDirtyPrompt(() => savedInvoice?.id ? navigate(`/sales/invoices/${savedInvoice.id}`,{state:savedState(savedInvoice.id)}) : returnToList());
    } catch (error) {
      if(recovery.fail(error)){draft.saveDraft(values);setError("root.server",{type:"server",message:"Save result is unconfirmed. Review saved history or readback before a retry; your values are retained."});toast.error("Save result needs review before retrying.");}
      else {
        const fieldNames = Object.keys(values).concat(values.items.flatMap((line,index)=>Object.keys(line).map(name=>`items.${index}.${name}`)));
        applyApiErrorsToForm({error,formFieldNames:fieldNames,setError});
        setError("root.server",{type:"server",message:getActionError(error,"The request was rejected. Review the highlighted fields; your entries are retained.")});
        toast.error(getActionError(error,"Unable to save invoice."));
      }
    } finally {recovery.finish();}
  };

  const backRoute = returnTo;
  const title = isEdit ? "Edit sale invoice" : "New sale invoice";

  if (isEdit && detailError) {
    return (
      <div className="space-y-5">
        <PageHeader title={title} />
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{detailError}</div>
        <AppButton variant="secondary" onClick={() => returnToList()}>
          <ArrowLeft className="h-4 w-4" /> Back to invoices
        </AppButton>
      </div>
    );
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit(submitForm)} noValidate>
      <UncertainSaveNotice key={recovery.marker?.attemptId??"idle"} recovery={recovery} onReviewHistory={()=>{draft.saveDraft(getValues());returnToList();}} readRecord={isEdit?async()=>{const response=await invoiceService.getInvoiceById(id);const saved=getResponseInvoice(response);return `Saved invoice ${saved.invoiceNumber}. Total ${formatCurrency(saved.grandTotal)}. Compare all retained line and header values before deciding whether to retry.`;}:undefined}/>
      <fieldset disabled={recovery.blocked} className="contents">
      {draft.recoveredDraft && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{draft.stale ? "A draft from an earlier record version is available. Reload current details and review it before saving." : "An unsaved draft from this account and company is available."}<div className="mt-2 flex gap-3"><button type="button" className="font-semibold underline" onClick={() => { reset(draft.recoveredDraft.values, { keepDefaultValues: true }); draft.acknowledgeRecovery(); }}>Restore for review</button><button type="button" className="underline" onClick={draft.clearDraft}>Discard draft</button></div></div>}
      {draft.storageError && <p role="alert">{draft.storageError}</p>}
      <FormErrorSummary errors={errors}/>
      {!businessContext.runtime && <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{businessContext.loading ? "Loading the company business date…" : "Company business date is unavailable. Enter invoice and payment dates explicitly."}</p>}
      <PageHeader
        badge="Sales / Invoices"
        title={title}
        description="Select an item to apply its Item Master price and GST defaults; saved invoice lines retain their own values."
        actions={
          <>
            <AppButton variant="secondary" onClick={() => confirmLeave(() => navigate(backRoute,{state:returnState()}))}>
              <ArrowLeft className="h-4 w-4" /> Back
            </AppButton>
            <AppButton type="submit" isLoading={isSubmitting} loadingText="Saving…" disabled={Boolean(saveDisabledReason)} title={saveDisabledReason || undefined}>
              <Save className="h-4 w-4" /> {isEdit ? "Save changes" : "Save draft"}
            </AppButton>
          </>
        }
      />

      {isEdit && detailLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }, (_, index) => (
            <div key={index} className="h-14 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      ) : (
        <>
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-slate-900">Invoice Header</h2>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Controller
                control={control}
                name="customerPartyId"
                render={({ field }) => (
                  <AppLookup
                          label="Item"
                    label="Customer"
                    required
                    name={field.name} value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    initialOptions={customerOptions}
                    loadPage={async ({ search, page, pageSize, signal }) => lookupPage(await partyService.getParties({ Search: search, PartyType: "Customer", PageNumber: page, PageSize: pageSize, IsActive: true }, { signal }), page, pageSize)}
                    loadById={async (value, options) => { const response = await partyService.getPartyById(value, options); return response.data?.party ?? response.data; }}
                    getOptionLabel={row => row.label ?? getPartyDisplayName(row)}
                    placeholder="Search customer name or code"
                    error={errors.customerPartyId?.message}
                    createLabel="Create new customer"
                    onCreate={canCreateCustomer ? () => openLookupCreate("customer") : undefined}
                  />
                )}
              />

              <AppInput id="invoiceNumber" label="Invoice Number" placeholder="Assigned by backend" disabled {...register("invoiceNumber")} />
              <AppInput id="invoiceDate" label="Invoice Date" type="date" required error={errors.invoiceDate?.message} {...register("invoiceDate")} />
              <AppInput id="dueDate" label="Due Date" type="date" error={errors.dueDate?.message} {...register("dueDate")} />
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Line Items</h3>
                <p className="mt-0.5 text-xs text-slate-500">Rate and GST auto-fill from item details when the backend provides them.</p>
              </div>
              <AppButton variant="secondary" className="h-9 rounded-lg px-3" onClick={() => append(getDefaultInvoiceLine())}>
                <Plus className="h-4 w-4" /> Add Row
              </AppButton>
            </div>

            <div className="overflow-x-auto">
              <table className="commerce-line-table w-full min-w-[1170px] table-fixed text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-white">
                    <th className="w-[27%] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Item<span className="ml-0.5 text-red-500">*</span></th>
                    <th className="w-[11%] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">HSN/SAC</th>
                    <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Qty<span className="ml-0.5 text-red-500">*</span></th>
                    <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Rate</th>
                    <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Disc %</th>
                    <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Disc Amt</th>
                    <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">GST %</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">Line Total</th>
                    <th className="w-12 px-2 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {fields.map((field, index) => {
                    const line = watchedItems[index] ?? field;
                    const lineTotal = getLineCalculations(line).lineTotal;

                    return (
                      <tr key={field.id} data-line-label={`Line ${index + 1}`} className="border-b border-slate-100">
                        <td className="px-3 py-3 align-top">
                          <Controller
                            control={control}
                            name={`items.${index}.itemId`}
                            render={({ field: itemField }) => (
                              <AppLookup
                                name={itemField.name} value={itemField.value}
                                onChange={(value) => {
                                  const itemId = value ? Number(value) : "";
                                  itemField.onChange(itemId);
                                  void applyItemDetails(field.id, itemId);
                                }}
                                onBlur={itemField.onBlur}
                                initialOptions={itemOptions}
                                loadPage={async ({ search, page, pageSize, signal }) => lookupPage(await documentLookupService.items({ Search: search, PageNumber: page, PageSize: pageSize, IsActive: true }, { signal }), page, pageSize)}
                                loadById={async (value, options) => getResponseItem(await documentLookupService.item(value, options))}
                                getOptionLabel={row => row.label ?? [row.name, row.itemCode].filter(Boolean).join(" · ")}
                                placeholder="Search item name or code"
                                required
                                error={errors.items?.[index]?.itemId?.message}
                                createLabel="Create new item"
                                onCreate={canCreateItem ? () => openLookupCreate("item", field.id) : undefined}
                              />
                            )}
                          />
                        </td>
                        <td data-label="HSN / SAC" className="px-3 py-3 align-top text-xs text-slate-600">
                          <p className="font-semibold text-slate-800">{line.hsnSacCode || "—"}</p>
                          {line.hsnSource && <p className="mt-1 text-[11px] text-slate-500">{line.hsnSource}</p>}
                        </td>
                        <td className="px-3 py-3 align-top">
                          <NumberInput control={control} id={`quantity-${index}`} name={`items.${index}.quantity`} label="Quantity" required error={errors.items?.[index]?.quantity?.message} />
                        </td>
                        <td className="px-3 py-3 align-top">
                          <NumberInput control={control} id={`rate-${index}`} name={`items.${index}.rate`} label="Rate" error={errors.items?.[index]?.rate?.message} />
                        </td>
                        <td className="px-3 py-3 align-top">
                          <NumberInput control={control} id={`discount-percentage-${index}`} name={`items.${index}.discountPercentage`} label="Discount %" error={errors.items?.[index]?.discountPercentage?.message} />
                        </td>
                        <td className="px-3 py-3 align-top">
                          <NumberInput control={control} id={`discount-amount-${index}`} name={`items.${index}.discountAmount`} label="Discount amount" error={errors.items?.[index]?.discountAmount?.message} />
                        </td>
                        <td className="px-3 py-3 align-top">
                          <NumberInput control={control} id={`tax-${index}`} name={`items.${index}.taxPercentage`} error={errors.items?.[index]?.taxPercentage?.message} />
                          {line.itemDetailsStatus === "loading" && <p className="mt-1 text-[11px] text-slate-500">Loading item GST…</p>}
                          {line.itemDetailsStatus === "missing" && <p className="mt-1 text-[11px] text-amber-700">Item Master is missing a price or GST rate. GST has not been defaulted.</p>}
                          {line.itemDetailsStatus === "error" && <p className="mt-1 text-[11px] text-red-700">Item defaults could not be loaded. Choose the item again or retry after resolving the lookup error.</p>}
                        </td>
                        <td data-label="Line total" className="px-3 py-3 text-right align-middle text-sm font-semibold text-slate-900">{formatCurrency(lineTotal)}</td>
                        <td className="px-2 py-3 text-right align-middle">
                          <button
                            type="button"
                            aria-label="Remove line item"
                            disabled={fields.length === 1}
                            onClick={() => remove(index)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {errors.items?.message && <p className="px-4 py-3 text-xs font-medium text-red-600">{errors.items.message}</p>}
          </section>

          <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-4">
              <div>
                <label htmlFor="invoiceNotes" className="mb-1.5 block text-xs font-semibold text-slate-700">Notes</label>
                <textarea
                  id="invoiceNotes"
                  rows={4}
                  className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/20"
                  {...register("notes")}
                />
                {errors.notes?.message && <p className="mt-1.5 text-xs font-medium text-red-600">{errors.notes.message}</p>}
              </div>

              <div>
                <label htmlFor="termsAndConditions" className="mb-1.5 block text-xs font-semibold text-slate-700">Terms &amp; Conditions</label>
                <textarea
                  id="termsAndConditions"
                  rows={4}
                  className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/20"
                  {...register("termsAndConditions")}
                />
                {errors.termsAndConditions?.message && <p className="mt-1.5 text-xs font-medium text-red-600">{errors.termsAndConditions.message}</p>}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-semibold text-slate-900">Totals</h3>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-slate-500">Subtotal</dt>
                  <dd className="font-semibold text-slate-900">{formatCurrency(totals.subTotal)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-slate-500">Line Discount</dt>
                  <dd className="font-semibold text-slate-900">{formatCurrency(totals.lineDiscount)}</dd>
                </div>
                <NumberInput control={control} id="invoiceDiscountAmount" name="discountAmount" label="Invoice Discount" error={errors.discountAmount?.message} />
                <div className="flex items-center justify-between">
                  <dt className="text-slate-500">Tax</dt>
                  <dd className="font-semibold text-slate-900">{formatCurrency(totals.taxAmount)}</dd>
                </div>
                <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                  <dt className="text-base font-semibold text-slate-900">Grand Total</dt>
                  <dd className="text-xl font-bold text-brand">{formatCurrency(totals.grandTotal)}</dd>
                </div>
              </dl>

              {!isEdit && (
                <div className="mt-5 border-t border-slate-200 pt-4">
                  <h4 className="text-sm font-semibold text-slate-900">Initial Payment</h4>
                  <p className="mt-1 text-xs text-slate-500">Leave amount blank to save without a receipt.</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <NumberInput control={control} id="initialPaymentAmount" name="initialPayment.amount" label="Amount" error={errors.initialPayment?.amount?.message} />
                    <AppInput id="initialPaymentDate" label="Payment Date" type="date" error={errors.initialPayment?.paymentDate?.message} {...register("initialPayment.paymentDate")} />
                    <Controller
                      control={control}
                      name="initialPayment.paymentMode"
                      defaultValue={SALES_PAYMENT_MODE.CASH}
                      render={({ field }) => (
                        <AppSelect label="Mode" name={field.name} value={field.value} onChange={(value) => field.onChange(Number(value))} onBlur={field.onBlur} options={PAYMENT_MODE_OPTIONS} error={errors.initialPayment?.paymentMode?.message} />
                      )}
                    />
                    <AppInput id="initialPaymentReference" label="Reference" error={errors.initialPayment?.referenceNumber?.message} {...register("initialPayment.referenceNumber")} />
                  </div>
                  <div className="mt-3">
                    <label htmlFor="initialPaymentNotes" className="mb-1.5 block text-xs font-semibold text-slate-700">Payment Notes</label>
                    <textarea
                      id="initialPaymentNotes"
                      rows={2}
                      className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/20"
                      {...register("initialPayment.notes")}
                    />
                    {errors.initialPayment?.notes?.message && <p className="mt-1.5 text-xs font-medium text-red-600">{errors.initialPayment.notes.message}</p>}
                  </div>
                </div>
              )}
            </div>
          </section>
        </>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Issuing GST registration</h2>
        <p className="mt-1 text-xs text-slate-500">Select the GSTIN that issues this draft. This choice is never inferred from the default registration.</p>
        <div className="mt-4 max-w-2xl">
          <Controller control={control} name="companyGstRegistrationId" render={({ field }) => (
            <GstRegistrationLookup
              label="Seller GST registration"
              activeOnly
              name={field.name} value={field.value ?? ""}
              onChange={(value) => field.onChange(value ? String(value) : null)}
              onBlur={field.onBlur}
              initialOptions={lookups.registrations}
              disabled={Boolean(isEdit && detailInvoice && Number(detailInvoice.status) !== 1)}
              error={errors.companyGstRegistrationId?.message}
            />
          )} />
          {isEdit && detailInvoice && Number(detailInvoice.status) !== 1 && <p className="mt-2 text-xs text-slate-500">Confirmed invoices retain their issuing registration. Use an approved correction workflow for changes.</p>}
          {!lookups.registrationsLoading && registrationOptions.length === 0 && <p className="mt-2 text-xs text-slate-500">Search the full registration catalogue by GSTIN, legal name or branch. An active issuing registration is required for GST preparation.</p>}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">GST draft context</h2>
        <p className="mt-1 text-xs text-slate-500">These explicit choices are retained for GST readiness. They do not replace the current Sales tax calculation or authorize statutory generation.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <Controller control={control} name="priceBasis" render={({ field }) => <AppSelect label="Pricing mode" name={field.name} value={field.value ?? ""} onChange={(value) => field.onChange(value === "" ? null : Number(value))} onBlur={field.onBlur} options={priceBasisOptions} placeholder="Select pricing mode" error={errors.priceBasis?.message} />} />
          <AppInput label="Place of supply code" maxLength={2} placeholder="e.g. 24" error={errors.placeOfSupplyStateCode?.message} {...register("placeOfSupplyStateCode")} />
          <Controller control={control} name="placeOfSupplySource" render={({ field }) => <AppSelect label="Reviewed basis" name={field.name} value={field.value ?? ""} onChange={field.onChange} onBlur={field.onBlur} options={placeSourceOptions} placeholder="Select reviewed basis" error={errors.placeOfSupplySource?.message} />} />
        </div>
        <p className="mt-3 text-xs text-amber-700">A billing or shipping address can inform review, but this form never infers a statutory place of supply or changes GST components automatically.</p>
      </section>

      <div className="sticky bottom-4 flex flex-col-reverse gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-lg sm:flex-row sm:justify-end">
        <AppButton variant="secondary" disabled={isSubmitting} onClick={() => navigate(backRoute,{state:returnState()})}>
          Cancel
        </AppButton>
        <AppButton type="submit" isLoading={isSubmitting} loadingText="Saving…" disabled={Boolean(saveDisabledReason)} title={saveDisabledReason || undefined}>
          {isEdit ? "Save Changes" : "Save Draft"}
        </AppButton>
      </div>

      <PartyFormModal
        isLoading={false}
        isOpen={lookupCreateModal.customer}
        mode="create"
        source={{ partyType: "Customer" }}
        onClose={() => closeLookupCreate("customer")}
        onSubmit={(payload) => submitLookupCreate("customer", payload)}
        submitLabel="Create Customer"
        title="Add Customer"
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
        onCreateCategory={(selectMaster) => openLookupCreate("category", null, selectMaster)}
        onCreateUnit={(selectMaster) => openLookupCreate("unit", null, selectMaster)}
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

export default InvoiceFormPage;
