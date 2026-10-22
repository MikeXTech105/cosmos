import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Plus, Save, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Controller,
  useFieldArray,
  useForm,
  useWatch,
} from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import { enumNumber, requiredDate, optionalDate, dateOrder } from "../../../utils/validationRules";

import AppButton from "../../../components/common/AppButton";
import AppInput from "../../../components/common/AppInput";
import AppSelect from "../../../components/common/AppSelect";
import PageHeader from "../../../components/common/PageHeader";
import useCapabilities from "../../../hooks/useCapabilities";
import useCreatePermission from "../../../hooks/useCreatePermission";
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
}).refine(line => line.discountAmount <= line.quantity * line.rate, { path: ["discountAmount"], message: "Discount cannot exceed line amount" });

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
}).superRefine((values, context) => dateOrder(values, context, "invoiceDate", "dueDate", "Due date cannot be before invoice date"));

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
  });
  const [lookupCreateModal, setLookupCreateModal] = useState({ category: false, customer: false, item: false, unit: false });
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
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(invoiceSchema),
    defaultValues: getInvoiceDefaultValues(null),
  });
  const { append, fields, remove } = useFieldArray({ control, name: "items" });
  const watchedItems = useWatch({ control, name: "items" }) ?? [];
  const invoiceDiscountAmount = useWatch({ control, name: "discountAmount" }) ?? "0";
  const totals = getInvoiceTotals(watchedItems, invoiceDiscountAmount);

  const loadLookup = useCallback((type) => {
    const isCustomers = type === "customers";
    const loadingKey = isCustomers ? "customersLoading" : "itemsLoading";
    const errorKey = isCustomers ? "customersError" : "itemsError";
    const request = isCustomers
      ? partyService.getParties({ PageNumber: 1, PageSize: 200, IsActive: true })
      : itemService.getItems({ PageNumber: 1, PageSize: 200, IsActive: true });

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

  const loadLookups = useCallback(() => {
    return Promise.all([loadLookup("customers"), loadLookup("items")]);
  }, [loadLookup]);

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

  const customerOptions = useMemo(
    () => lookups.customers.map((customer) => ({ value: customer.id, label: getPartyDisplayName(customer) })),
    [lookups.customers],
  );
  const itemOptions = useMemo(
    () => lookups.items.map((item) => ({ value: Number(item.id), label: [item.name, item.itemCode].filter(Boolean).join(" - ") })),
    [lookups.items],
  );
  const itemsById = useMemo(() => new Map(lookups.items.map((item) => [String(item.id), item])), [lookups.items]);

  const applyItemDetails = async (index, itemId) => {
    const lookupItem = itemsById.get(String(itemId));
    const applyItem = (item) => {
      if (!item) return;

      setValue(`items.${index}.itemName`, item.name ?? "", { shouldDirty: true });
      setValue(`items.${index}.rate`, String(item.salesPrice ?? 0), { shouldDirty: true, shouldValidate: true });
      setValue(`items.${index}.taxPercentage`, String(item.gstRate ?? 0), { shouldDirty: true, shouldValidate: true });
    };

    applyItem(lookupItem);

    try {
      const [itemResult, classificationResult] = await Promise.allSettled([
        itemService.getItemById(itemId),
        hsnGstService.getEffectiveClassification(itemId, new Date().toISOString().slice(0, 10)),
      ]);
      const itemResponse = itemResult.status === "fulfilled" ? itemResult.value : null;
      const classificationResponse = classificationResult.status === "fulfilled" ? classificationResult.value : null;
      applyItem(getResponseItem(itemResponse) ?? lookupItem);
      const classification = classificationResponse?.data ?? classificationResponse;
      setValue(`items.${index}.hsnSacCode`, classification?.code ?? classification?.legacyHsnCode ?? "", { shouldDirty: true });
      setValue(`items.${index}.hsnSource`, classification?.source ?? "", { shouldDirty: true });
    } catch {
      applyItem(lookupItem);
      setValue(`items.${index}.hsnSacCode`, lookupItem?.hsnCode ?? "", { shouldDirty: true });
      setValue(`items.${index}.hsnSource`, lookupItem?.hsnCode ? "Legacy" : "", { shouldDirty: true });
    }
  };

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

  const openLookupCreate = useCallback((type) => {
    const allowed = { category: canCreateCategory, customer: canCreateCustomer, item: canCreateItem, unit: canCreateUnit }[type];

    if (!allowed) {
      toast.error("You don't have permission to create this record.");
      return;
    }

    if (type === "item") {
      void loadItemCreateLookups();
    }

    setLookupCreateModal((current) => ({ ...current, [type]: true }));
  }, [canCreateCategory, canCreateCustomer, canCreateItem, canCreateUnit, loadItemCreateLookups]);

  const closeLookupCreate = useCallback((type) => setLookupCreateModal((current) => ({ ...current, [type]: false })), []);

  const refreshItemCreateLookup = useCallback(async (type) => {
    if (type === "category") {
      const response = await categoryService.getCategories({ IsActive: true, PageNumber: 1, PageSize: 200 });
      setItemCreateLookups((current) => ({ ...current, categories: getLookupList(response) }));
      return;
    }

    const response = await unitService.getUnits({ IsActive: true, PageNumber: 1, PageSize: 200 });
    setItemCreateLookups((current) => ({ ...current, units: getLookupList(response) }));
  }, []);

  const submitLookupCreate = useCallback(async (type, payload, saveAndNew = false) => {
    try {
      if (type === "customer") {
        await partyService.createParty(payload);
        toast.success("Customer created successfully");
        await loadLookup("customers");
      } else if (type === "item") {
        await itemService.createItem(payload);
        toast.success("Item created successfully");
        await loadLookup("items");
      } else if (type === "category") {
        await categoryService.createCategory(payload);
        toast.success("Category created successfully");
        await refreshItemCreateLookup("category");
      } else {
        await unitService.createUnit(payload);
        toast.success("Unit created successfully");
        await refreshItemCreateLookup("unit");
      }

      if (!saveAndNew) {
        closeLookupCreate(type);
      }
    } catch (error) {
      toast.error(getActionError(error, "Unable to create record."));
      throw error;
    }
  }, [closeLookupCreate, loadLookup, refreshItemCreateLookup]);

  const saveDisabledReason = (isEdit ? capabilities.canUpdate : capabilities.canCreate)
    ? ""
    : `You need ${isEdit ? "edit" : "create"} permission for sale invoices.`;

  const submitForm = async (values) => {
    if (saveDisabledReason) {
      toast.error(saveDisabledReason);
      return;
    }

    const payload = buildInvoicePayload(values);

    try {
      const response = isEdit
        ? await dispatch(updateInvoice({ id, payload })).unwrap()
        : await dispatch(createInvoice(payload)).unwrap();
      const savedInvoice = getResponseInvoice(response);

      toast.success(getSuccessMessage(response, isEdit ? "Invoice updated successfully" : "Invoice created successfully"));
      navigate(savedInvoice?.id ? `/sales/invoices/${savedInvoice.id}` : "/sales/invoices");
    } catch (error) {
      toast.error(getActionError(error, "Unable to save invoice."));
    }
  };

  const backRoute = isEdit ? `/sales/invoices/${id}` : "/sales/invoices";
  const title = isEdit ? "Edit sale invoice" : "New sale invoice";

  if (isEdit && detailError) {
    return (
      <div className="space-y-5">
        <PageHeader title={title} />
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{detailError}</div>
        <AppButton variant="secondary" onClick={() => navigate("/sales/invoices")}>
          <ArrowLeft className="h-4 w-4" /> Back to invoices
        </AppButton>
      </div>
    );
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit(submitForm)} noValidate>
      <PageHeader
        badge="Sales / Invoices"
        title={title}
        description="Create a draft invoice with live line totals and backend-ready tax fields."
        actions={
          <>
            <AppButton variant="secondary" onClick={() => navigate(backRoute)}>
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
                  <AppSelect
                    label="Customer"
                    required
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    options={customerOptions}
                    emptyMessage={lookups.customersError ? "Unable to load customers. Try refreshing the page." : "No customers found in Party Master."}
                    placeholder={lookups.customersLoading ? "Loading customers..." : "Select customer"}
                    disabled={lookups.customersLoading}
                    error={errors.customerPartyId?.message}
                    creatable={canCreateCustomer}
                    createLabel="Create new customer"
                    onCreateClick={() => openLookupCreate("customer")}
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
              <table className="w-full min-w-[1170px] table-fixed text-left">
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
                      <tr key={field.id} className="border-b border-slate-100">
                        <td className="px-3 py-3 align-top">
                          <Controller
                            control={control}
                            name={`items.${index}.itemId`}
                            render={({ field: itemField }) => (
                              <AppSelect
                                value={itemField.value}
                                onChange={(value) => {
                                  itemField.onChange(Number(value));
                                  void applyItemDetails(index, value);
                                }}
                                onBlur={itemField.onBlur}
                                options={itemOptions}
                                emptyMessage={lookups.itemsError ? "Unable to load items. Try refreshing the page." : "No items found in inventory."}
                                placeholder={lookups.itemsLoading ? "Loading items..." : "Select item"}
                                disabled={lookups.itemsLoading}
                                required
                                error={errors.items?.[index]?.itemId?.message}
                                creatable={canCreateItem}
                                createLabel="Create new item"
                                onCreateClick={() => openLookupCreate("item")}
                              />
                            )}
                          />
                        </td>
                        <td className="px-3 py-3 align-top text-xs text-slate-600">
                          <p className="font-semibold text-slate-800">{line.hsnSacCode || "—"}</p>
                          {line.hsnSource && <p className="mt-1 text-[11px] text-slate-500">{line.hsnSource === "ProductOverride" ? "Product override" : line.hsnSource === "CategoryDefault" ? "Category default" : line.hsnSource}</p>}
                        </td>
                        <td className="px-3 py-3 align-top">
                          <NumberInput control={control} id={`quantity-${index}`} name={`items.${index}.quantity`} required error={errors.items?.[index]?.quantity?.message} />
                        </td>
                        <td className="px-3 py-3 align-top">
                          <NumberInput control={control} id={`rate-${index}`} name={`items.${index}.rate`} error={errors.items?.[index]?.rate?.message} />
                        </td>
                        <td className="px-3 py-3 align-top">
                          <NumberInput control={control} id={`discount-percentage-${index}`} name={`items.${index}.discountPercentage`} error={errors.items?.[index]?.discountPercentage?.message} />
                        </td>
                        <td className="px-3 py-3 align-top">
                          <NumberInput control={control} id={`discount-amount-${index}`} name={`items.${index}.discountAmount`} error={errors.items?.[index]?.discountAmount?.message} />
                        </td>
                        <td className="px-3 py-3 align-top">
                          <NumberInput control={control} id={`tax-${index}`} name={`items.${index}.taxPercentage`} error={errors.items?.[index]?.taxPercentage?.message} />
                        </td>
                        <td className="px-3 py-3 text-right align-middle text-sm font-semibold text-slate-900">{formatCurrency(lineTotal)}</td>
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
                        <AppSelect label="Mode" value={field.value} onChange={(value) => field.onChange(Number(value))} onBlur={field.onBlur} options={PAYMENT_MODE_OPTIONS} error={errors.initialPayment?.paymentMode?.message} />
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

      <div className="sticky bottom-4 flex flex-col-reverse gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-lg sm:flex-row sm:justify-end">
        <AppButton variant="secondary" disabled={isSubmitting} onClick={() => navigate(backRoute)}>
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
        onCreateCategory={() => openLookupCreate("category")}
        onCreateUnit={() => openLookupCreate("unit")}
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
    </form>
  );
};

export default InvoiceFormPage;
