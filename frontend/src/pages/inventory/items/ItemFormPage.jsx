import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  Check,
  PackagePlus,
  Save,
  Sparkles,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import AppButton from "../../../components/common/AppButton";
import AppImageUpload from "../../../components/common/AppImageUpload";
import AppInput from "../../../components/common/AppInput";
import AppSelect from "../../../components/common/AppSelect";
import PageHeader from "../../../components/common/PageHeader";
import useCreatePermission from "../../../hooks/useCreatePermission";
import useCapabilities from "../../../hooks/useCapabilities";
import { hsnGstService } from "../../../services/gst/hsnGstService";
import useManufacturingPreference from "../../../hooks/useManufacturingPreference";
import { categoryService } from "../../../services/inventory/categoryService";
import { unitService } from "../../../services/inventory/unitService";
import {
  createItem,
  fetchItemById,
  updateItem,
} from "../../../store/slices/inventory/itemSlice";
import { applyApiErrorsToForm } from "../../../utils/formApiErrors";
import { itemSchema } from "../../../utils/validationSchemas";
import { getActionError, getSuccessMessage } from "../inventoryHelpers";
import useInventoryCapabilities from "../useInventoryCapabilities";
import CategoryFormModal from "../categories/CategoryFormModal";
import UnitFormModal from "../units/UnitFormModal";
import ItemManufacturingTab from "./ItemManufacturingTab";
import {
  buildItemPayload,
  generateItemCode,
  getItemDefaultValues,
  GST_RATE_OPTIONS,
  ITEM_CLASSIFICATION_OPTIONS,
  ITEM_TYPE,
  ITEM_TYPE_OPTIONS,
} from "./itemHelpers";

const ITEM_FIELDS = [
  "name", "itemCode", "barcode", "categoryId", "unitId", "itemType",
  "procurementClassification", "purchasePrice", "salesPrice", "hsnCode",
  "gstRate", "trackInventory", "isManufactured", "openingStock", "openingStockValue",
  "currentStock", "reservedStock", "minimumStock", "description", "isActive",
  "imageFile",
];

const getLookupList = (response) => {
  const data = response?.data;

  if (Array.isArray(data)) {
    return data;
  }

  return data?.items ?? [];
};

const getResponseItem = (response) => {
  const data = response?.data;

  return data?.item ?? data;
};

const ToggleRow = ({ checked, description, disabled, label, onChange }) => (
  <label
    className={[
      "flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3",
      disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
    ].join(" ")}
  >
    <span>
      <span className="block text-sm font-semibold text-slate-900">{label}</span>
      <span className="mt-0.5 block text-xs leading-5 text-slate-500">{description}</span>
    </span>
    <input
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={(event) => onChange(event.target.checked)}
      className="h-4 w-4 shrink-0 accent-brand"
    />
  </label>
);

const Section = ({ children, title }) => (
  <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <h2 className="mb-4 text-base font-semibold text-slate-900">{title}</h2>
    {children}
  </section>
);

const SectionCard = ({ children, title }) => (
  <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
    <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</h3>
    <div className="mt-3">{children}</div>
  </section>
);

const normalizeItemNumberInput = (rawValue) => {
  const value = String(rawValue ?? "").replace(/[^\d.]/g, "");

  if (!value) {
    return "";
  }

  const decimalIndex = value.indexOf(".");

  if (decimalIndex >= 0) {
    const integerPart = value.slice(0, decimalIndex).replace(/^0+(?=\d)/, "") || "0";
    const decimalPart = value.slice(decimalIndex + 1).replace(/\./g, "");

    return `${integerPart}.${decimalPart}`;
  }

  return value.replace(/^0+(?=\d)/, "") || "0";
};

const normalizeItemNumberBlurValue = (value) => {
  const normalized = normalizeItemNumberInput(value);

  if (!normalized) {
    return "0";
  }

  const completedValue = normalized.endsWith(".") ? normalized.slice(0, -1) : normalized;
  const numericValue = Number(completedValue);

  return Number.isFinite(numericValue) ? String(numericValue) : "0";
};

const ItemNumberInput = ({ control, disabled, error, id, label, name }) => (
  <Controller
    control={control}
    name={name}
    render={({ field }) => (
      <AppInput
        id={id}
        label={label}
        type="text"
        inputMode="decimal"
        placeholder="0"
        disabled={disabled}
        value={field.value ?? ""}
        name={field.name}
        error={error}
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
        onChange={(event) => field.onChange(normalizeItemNumberInput(event.target.value))}
        onBlur={(event) => {
          field.onChange(normalizeItemNumberBlurValue(event.target.value));
          field.onBlur();
        }}
        ref={field.ref}
      />
    )}
  />
);

const ItemFormPage = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const capabilities = useInventoryCapabilities({ label: "Items", resource: "items", route: "/items" });
  const hsnCapabilities = useCapabilities({ actions: ["view", "update"], label: "GST Product Mapping", pageName: "GST.ProductMapping", resource: "GST.ProductMapping", route: "/gst/product-mappings" });
  const { manufacturingEnabled } = useManufacturingPreference();
  const canCreateCategory = useCreatePermission({ label: "Categories", resource: "categories", route: "/categories" });
  const canCreateUnit = useCreatePermission({ label: "Units", resource: "units", route: "/units" });
  const detailLoading = useSelector((state) => state.items.detailLoading);
  const detailError = useSelector((state) => state.items.detailError);
  const detailItem = useSelector((state) => state.items.selected);

  const [activeTab, setActiveTab] = useState(() => searchParams.get("tab") === "manufacturing" ? "manufacturing" : "pricing");
  const [lookupCreateModal, setLookupCreateModal] = useState({ isOpen: false, type: null });
  const [lookups, setLookups] = useState({
    categories: [], categoriesError: null, categoriesLoading: true,
    units: [], unitsError: null, unitsLoading: true,
  });
  const [hsnState, setHsnState] = useState({ classification: null, error: "", loading: false, options: [], saving: false, search: "", selectedId: "", effectiveFrom: new Date().toISOString().slice(0, 10) });

  const {
    control,
    handleSubmit,
    register,
    reset,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(itemSchema),
    defaultValues: getItemDefaultValues(null),
  });
  const itemType = useWatch({ control, name: "itemType" });
  const trackInventory = useWatch({ control, name: "trackInventory" });
  const isManufactured = useWatch({ control, name: "isManufactured" });
  const isActive = useWatch({ control, name: "isActive" });
  const itemName = useWatch({ control, name: "name" });

  const loadLookup = useCallback((type) => {
    const isCategories = type === "categories";
    const loadingKey = isCategories ? "categoriesLoading" : "unitsLoading";
    const errorKey = isCategories ? "categoriesError" : "unitsError";
    const request = isCategories
      ? categoryService.getCategories({ PageNumber: 1, PageSize: 200, IsActive: true })
      : unitService.getUnits({ PageNumber: 1, PageSize: 200, IsActive: true });

    setLookups((current) => ({ ...current, [loadingKey]: true, [errorKey]: null }));

    return request
      .then((response) => {
        const items = getLookupList(response).filter((entry) => {
          return entry?.isActive !== false && entry?.id !== null && entry?.id !== undefined && Boolean(String(entry?.name ?? "").trim());
        });

        setLookups((current) => ({ ...current, [type]: items, [loadingKey]: false, [errorKey]: null }));
      })
      .catch((error) => {
        const message = getActionError(error, `Unable to load ${type}.`);

        setLookups((current) => ({ ...current, [loadingKey]: false, [errorKey]: message }));
        toast.error(message);
      });
  }, []);

  const loadLookups = useCallback(() => {
    return Promise.all([loadLookup("categories"), loadLookup("units")]);
  }, [loadLookup]);

  useEffect(() => {
    void Promise.resolve().then(loadLookups);
  }, [loadLookups]);

  useEffect(() => {
    if (!isEdit) {
      return undefined;
    }

    const request = dispatch(fetchItemById(id));

    request.unwrap().catch((error) => {
      if (error?.name !== "AbortError") {
        toast.error(getActionError(error, "Unable to load this item."));
      }
    });

    return () => request.abort();
  }, [dispatch, id, isEdit]);

  useEffect(() => {
    if (isEdit && detailItem && String(detailItem.id) === String(id)) {
      reset(getItemDefaultValues(detailItem));
    }
  }, [detailItem, id, isEdit, reset]);

  const loadHsnClassification = useCallback(async () => {
    if (!isEdit || !hsnCapabilities.canView) return;

    setHsnState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const [classificationResponse, hsnResponse] = await Promise.all([
        hsnGstService.getEffectiveClassification(id, new Date().toISOString().slice(0, 10)),
        hsnGstService.listHsnSac({ IsActive: true, PageNumber: 1, PageSize: 200 }),
      ]);
      const hsnData = hsnResponse?.data ?? hsnResponse;
      setHsnState((current) => ({
        ...current,
        classification: classificationResponse?.data ?? classificationResponse,
        options: Array.isArray(hsnData) ? hsnData : hsnData?.items ?? [],
        loading: false,
      }));
    } catch (error) {
      setHsnState((current) => ({ ...current, loading: false, error: getActionError(error, "Unable to load HSN/SAC classification.") }));
    }
  }, [hsnCapabilities.canView, id, isEdit]);

  useEffect(() => { void loadHsnClassification(); }, [loadHsnClassification]);

  const saveHsnOverride = async () => {
    if (!hsnState.selectedId) {
      toast.error("Select an active HSN/SAC code.");
      return;
    }
    setHsnState((current) => ({ ...current, saving: true, error: "" }));
    try {
      await hsnGstService.saveItemOverride(id, { hsnSacId: Number(hsnState.selectedId), effectiveFrom: hsnState.effectiveFrom, effectiveTo: null });
      toast.success("Product HSN/SAC override saved.");
      setHsnState((current) => ({ ...current, selectedId: "" }));
      await loadHsnClassification();
    } catch (error) {
      setHsnState((current) => ({ ...current, error: getActionError(error, "Unable to save the HSN/SAC override.") }));
    } finally {
      setHsnState((current) => ({ ...current, saving: false }));
    }
  };

  const categoryOptions = useMemo(
    () => lookups.categories.map((category) => ({ value: Number(category.id), label: category.name })),
    [lookups.categories],
  );
  const unitOptions = useMemo(
    () => lookups.units.map((unit) => ({ value: Number(unit.id), label: unit.shortName ? `${unit.name} (${unit.shortName})` : unit.name })),
    [lookups.units],
  );
  const hsnOptions = useMemo(() => {
    const query = hsnState.search.trim().toLowerCase();
    return hsnState.options
      .filter((entry) => !query || `${entry.code} ${entry.codeType} ${entry.description}`.toLowerCase().includes(query))
      .map((entry) => ({ value: String(entry.id), label: `${entry.code} · ${entry.codeType} — ${entry.description}` }));
  }, [hsnState.options, hsnState.search]);

  const visibleTab = (
    (itemType === ITEM_TYPE.SERVICE && activeTab !== "pricing")
    || (!manufacturingEnabled && activeTab === "manufacturing")
  ) ? "pricing" : activeTab;
  const saveDisabledReason = (isEdit ? capabilities.canUpdate : capabilities.canCreate)
    ? ""
    : `You need ${isEdit ? "edit" : "create"} permission for items.`;

  const openLookupCreate = useCallback((type) => {
    const isAllowed = type === "categories" ? canCreateCategory : canCreateUnit;

    if (isAllowed) {
      setLookupCreateModal({ isOpen: true, type });
    }
  }, [canCreateCategory, canCreateUnit]);
  const closeLookupCreate = useCallback(() => setLookupCreateModal({ isOpen: false, type: null }), []);
  const submitLookupCreate = useCallback(async (payload, saveAndNew = false) => {
    const type = lookupCreateModal.type;

    if (!type) {
      return;
    }

    try {
      if (type === "categories") {
        await categoryService.createCategory(payload);
        toast.success("Category created successfully");
      } else {
        await unitService.createUnit(payload);
        toast.success("Unit created successfully");
      }

      await loadLookup(type);

      if (!saveAndNew) {
        closeLookupCreate();
      }
    } catch (error) {
      toast.error(getActionError(error, type === "categories" ? "Unable to create category." : "Unable to create unit."));
      throw error;
    }
  }, [closeLookupCreate, loadLookup, lookupCreateModal.type]);

  const submitForm = async (values, saveAndNew = false) => {
    if (saveDisabledReason) {
      toast.error(saveDisabledReason);
      return;
    }

    const payload = buildItemPayload(values);

    try {
      const response = isEdit
        ? await dispatch(updateItem({ id, payload })).unwrap()
        : await dispatch(createItem(payload)).unwrap();
      const responseItem = getResponseItem(response);

      toast.success(getSuccessMessage(response, isEdit ? "Item updated successfully" : "Item created successfully"));

      if (isEdit) {
        return;
      }

      if (saveAndNew) {
        reset(getItemDefaultValues(null));
        setActiveTab("pricing");
        return;
      }

      const newId = responseItem?.id ?? (["number", "string"].includes(typeof responseItem) ? responseItem : undefined);

      navigate(newId !== undefined ? `/items/${newId}/edit` : "/items", { replace: true });
    } catch (error) {
      applyApiErrorsToForm({ error, fieldAliases: { gstRate: "GSTRate", hsnCode: "HSNCode" }, formFieldNames: ITEM_FIELDS, setError });
      toast.error(getActionError(error, "Unable to save item."));
    }
  };

  const title = isEdit ? "Edit item" : "Add item";

  if (isEdit && detailError) {
    return (
      <div className="space-y-5">
        <PageHeader badge="Inventory / Item Master" title={title} />
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{detailError}</div>
        <AppButton variant="secondary" onClick={() => navigate("/items")}>
          <ArrowLeft className="h-4 w-4" /> Back to items
        </AppButton>
      </div>
    );
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit((values) => submitForm(values, false))} noValidate>
      <PageHeader
        badge="Inventory / Item Master"
        title={title}
        description="Configure identity, pricing, tax, and stock in one place."
        actions={
          <>
            <AppButton variant="secondary" onClick={() => navigate("/items")}>
              <ArrowLeft className="h-4 w-4" /> Back
            </AppButton>
            <AppButton type="submit" isLoading={isSubmitting} loadingText="Saving…" disabled={Boolean(saveDisabledReason)} title={saveDisabledReason || undefined}>
              <Save className="h-4 w-4" /> {isEdit ? "Save changes" : "Save item"}
            </AppButton>
          </>
        }
      />

      {errors.root?.server?.message && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {errors.root.server.message}
        </p>
      )}

      {isEdit && detailLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 8 }, (_, index) => (
            <div key={index} className="h-14 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      ) : (
        <>
          <Section title="Item type & classification">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="mb-1.5 block text-xs font-semibold text-slate-700">Item type</p>
                <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                  {ITEM_TYPE_OPTIONS.map((option) => {
                    const type = option.value;
                    const isActive = itemType === type;

                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          setValue("itemType", type, { shouldDirty: true, shouldValidate: true });
                          if (type === ITEM_TYPE.SERVICE) {
                            setActiveTab("pricing");
                          }
                        }}
                        className={[
                          "h-9 rounded-lg px-5 text-sm font-semibold transition-colors",
                          isActive ? "bg-brand text-white shadow-sm" : "text-slate-500 hover:bg-white hover:text-slate-900",
                        ].join(" ")}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <Controller
                  control={control}
                  name="procurementClassification"
                  render={({ field }) => (
                    <AppSelect
                      id="itemMaterialType"
                      label="Material type"
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      options={[{ value: "", label: "Not classified" }, ...ITEM_CLASSIFICATION_OPTIONS]}
                      aria-describedby="itemMaterialTypeHelp"
                    />
                  )}
                />
                <p id="itemMaterialTypeHelp" className="mt-1.5 text-xs text-slate-500">
                  Used by procurement planning to decide what to buy.
                </p>
              </div>
            </div>
          </Section>

          <Section title="Item identity">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <AppInput id="itemName" label="Item Name" required error={errors.name?.message} {...register("name")} />

              <div>
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <label htmlFor="itemCode" className="text-[13px] font-medium text-slate-700">Item Code</label>
                  <button
                    type="button"
                    onClick={() => setValue("itemCode", generateItemCode(itemName), { shouldDirty: true, shouldValidate: true })}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:text-brand-dark"
                  >
                    <Sparkles className="h-3 w-3" /> Assign Code
                  </button>
                </div>
                <AppInput id="itemCode" required aria-label="Item code" error={errors.itemCode?.message} {...register("itemCode")} />
              </div>

              <AppInput id="itemBarcode" label="Barcode" error={errors.barcode?.message} {...register("barcode")} />

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
                    emptyMessage={lookups.categoriesError ? "Unable to load categories. Try refreshing the page." : "No categories yet - add one in Categories."}
                    placeholder={lookups.categoriesLoading ? "Loading categories..." : "Select category"}
                    disabled={lookups.categoriesLoading}
                    error={errors.categoryId?.message}
                    creatable={canCreateCategory}
                    createLabel="Create new category"
                    onCreateClick={() => openLookupCreate("categories")}
                  />
                )}
              />

              <Controller
                control={control}
                name="unitId"
                render={({ field }) => (
                  <AppSelect
                    label="Unit"
                    required
                    value={field.value}
                    onChange={(value) => field.onChange(Number(value))}
                    onBlur={field.onBlur}
                    options={unitOptions}
                    emptyMessage={lookups.unitsError ? "Unable to load units. Try refreshing the page." : "No units yet - add one in Units."}
                    placeholder={lookups.unitsLoading ? "Loading units..." : "Select unit"}
                    disabled={lookups.unitsLoading}
                    error={errors.unitId?.message}
                    creatable={canCreateUnit}
                    createLabel="Create new unit"
                    onCreateClick={() => openLookupCreate("units")}
                  />
                )}
              />


              <Controller
                control={control}
                name="imageUrl"
                render={({ field }) => (
                  <AppImageUpload
                    label="Item Image"
                    value={field.value}
                    disabled={isSubmitting}
                    onChange={(url) => setValue("imageUrl", url, { shouldDirty: true, shouldValidate: true })}
                    onFileChange={isEdit ? undefined : (file) => setValue("imageFile", file, { shouldDirty: true })}
                    error={errors.imageUrl?.message}
                  />
                )}
              />
            </div>
          </Section>

          {isEdit && hsnCapabilities.canView && (
            <Section title="HSN/SAC classification">
              <p className="mb-4 text-sm text-slate-500">Classification is stored as a dated product override. It is separate from the legacy GST rate field and does not change invoice tax calculation.</p>
              {hsnState.loading ? <p className="text-sm text-slate-500">Loading classification…</p> : (
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
                    <p className="font-semibold text-slate-900">{hsnState.classification?.code ? `${hsnState.classification.code} · ${hsnState.classification.codeType}` : hsnState.classification?.legacyHsnCode || "No active HSN/SAC mapping"}</p>
                    <p className="mt-1 text-xs text-slate-500">{hsnState.classification?.description || "Select an active master code to add a product override."}</p>
                    <p className="mt-2 text-xs font-medium text-slate-600">Source: {hsnState.classification?.source === "ProductOverride" ? "Product override" : hsnState.classification?.source === "CategoryDefault" ? "Category default" : "No active mapping"}</p>
                  </div>
                  {hsnCapabilities.canUpdate && <div className="space-y-2"><AppInput label="Search active HSN/SAC" value={hsnState.search} onChange={(event) => setHsnState((current) => ({ ...current, search: event.target.value }))} placeholder="Code or description" /><AppSelect aria-label="HSN/SAC override" options={[{ value: "", label: "Select HSN/SAC" }, ...hsnOptions]} value={hsnState.selectedId} onChange={(selectedId) => setHsnState((current) => ({ ...current, selectedId }))} /><AppInput label="Effective from" type="date" value={hsnState.effectiveFrom} onChange={(event) => setHsnState((current) => ({ ...current, effectiveFrom: event.target.value }))} /></div>}
                  {hsnCapabilities.canUpdate && <AppButton type="button" isLoading={hsnState.saving} onClick={saveHsnOverride}>Save HSN/SAC</AppButton>}
                </div>
              )}
              {hsnState.error && <p role="alert" className="mt-3 text-sm text-red-600">{hsnState.error}</p>}
              {hsnState.classification?.source === "ProductOverride" && <p className="mt-3 text-xs text-slate-500">To replace a current override, retire it with its effective end date first from GST → Product HSN overrides; history and audit entries are retained.</p>}
            </Section>
          )}

          <Section title="Pricing, stock & manufacturing">
            <div className="border-b border-slate-200">
              <div className="flex gap-1 overflow-x-auto">
                {[
                  { id: "pricing", label: "Pricing" },
                  ...(itemType === ITEM_TYPE.PRODUCT ? [{ id: "stock", label: "Stock" }] : []),
                  ...(itemType === ITEM_TYPE.PRODUCT && manufacturingEnabled ? [{ id: "manufacturing", label: "Manufacturing" }] : []),
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={[
                      "h-11 shrink-0 border-b-2 px-4 text-sm font-semibold transition-colors",
                      visibleTab === tab.id ? "border-brand text-brand" : "border-transparent text-slate-500 hover:text-slate-900",
                    ].join(" ")}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {visibleTab === "pricing" && (
              <div className="mt-5 grid gap-4 lg:grid-cols-3">
                <SectionCard title="Sale Price">
                  <ItemNumberInput control={control} id="salesPrice" name="salesPrice" label="Sales Price" error={errors.salesPrice?.message} />
                </SectionCard>

                <SectionCard title="Purchase Price">
                  <ItemNumberInput control={control} id="purchasePrice" name="purchasePrice" label="Purchase Price" error={errors.purchasePrice?.message} />
                </SectionCard>

                <SectionCard title="Taxes">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                    <AppInput id="hsnCode" label="HSN Code" error={errors.hsnCode?.message} {...register("hsnCode")} />
                    <Controller
                      control={control}
                      name="gstRate"
                      render={({ field }) => (
                        <AppSelect label="GST Rate" value={field.value} onChange={field.onChange} onBlur={field.onBlur} options={GST_RATE_OPTIONS} error={errors.gstRate?.message} />
                      )}
                    />
                  </div>
                </SectionCard>
              </div>
            )}

            {visibleTab === "stock" && itemType === ITEM_TYPE.PRODUCT && (
              <div className="mt-5 space-y-4">
                <Controller
                  control={control}
                  name="trackInventory"
                  render={({ field }) => (
                    <ToggleRow checked={field.value} label="Track inventory" description="Opening stock is set during creation. Current and reserved balances follow inventory transactions." onChange={field.onChange} />
                  )}
                />

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <ItemNumberInput control={control} id="openingStock" name="openingStock" label="Opening Stock" disabled={isEdit || !trackInventory} error={errors.openingStock?.message} />
                  <ItemNumberInput control={control} id="openingStockValue" name="openingStockValue" label="Opening Stock Value" disabled={isEdit || !trackInventory} error={errors.openingStockValue?.message} />
                  <ItemNumberInput control={control} id="currentStock" name="currentStock" label="Current Stock" disabled={true} error={errors.currentStock?.message} />
                  <ItemNumberInput control={control} id="reservedStock" name="reservedStock" label="Reserved Stock" disabled={true} error={errors.reservedStock?.message} />
                  <ItemNumberInput control={control} id="minimumStock" name="minimumStock" label="Minimum Stock" disabled={!trackInventory} error={errors.minimumStock?.message} />
                </div>
              </div>
            )}

            {visibleTab === "manufacturing" && itemType === ITEM_TYPE.PRODUCT && manufacturingEnabled && (
              <div className="mt-5">
                <ItemManufacturingTab
                  disabled={isSubmitting}
                  enabled={Boolean(isManufactured)}
                  isActive={Boolean(isActive)}
                  item={isEdit ? detailItem : null}
                  trackInventory={Boolean(trackInventory)}
                  onEnabledChange={(value) => setValue("isManufactured", value, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })}
                />
              </div>
            )}
          </Section>

          <Section title="Description & status">
            <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
              <div>
                <label htmlFor="itemDescription" className="mb-1.5 block text-xs font-semibold text-slate-700">Description</label>
                <textarea
                  id="itemDescription"
                  rows={4}
                  className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/20"
                  {...register("description")}
                />
                {errors.description?.message && <p className="mt-1.5 text-xs font-medium text-red-600">{errors.description.message}</p>}
              </div>

              <div>
                <Controller
                  control={control}
                  name="isActive"
                  render={({ field }) => (
                    <ToggleRow checked={field.value} label="Active item" description="Active items are available for inventory and transaction workflows." onChange={field.onChange} />
                  )}
                />
              </div>
            </div>
          </Section>
        </>
      )}

      <div className="sticky bottom-4 flex flex-col-reverse gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-lg sm:flex-row sm:justify-end">
        <AppButton variant="secondary" disabled={isSubmitting} onClick={() => navigate("/items")}>
          Cancel
        </AppButton>
        {!isEdit && (
          <AppButton type="button" variant="secondary" disabled={isSubmitting} onClick={handleSubmit((values) => submitForm(values, true))}>
            <PackagePlus className="h-4 w-4" /> Save &amp; New
          </AppButton>
        )}
        <AppButton type="submit" isLoading={isSubmitting} loadingText="Saving…" disabled={Boolean(saveDisabledReason)} title={saveDisabledReason || undefined}>
          <Check className="h-4 w-4" /> {isEdit ? "Save Changes" : "Save Item"}
        </AppButton>
      </div>

      <CategoryFormModal
        category={null}
        isLoading={false}
        isOpen={lookupCreateModal.isOpen && lookupCreateModal.type === "categories"}
        mode="create"
        onClose={closeLookupCreate}
        onSubmit={submitLookupCreate}
      />

      <UnitFormModal
        isLoading={false}
        isOpen={lookupCreateModal.isOpen && lookupCreateModal.type === "units"}
        mode="create"
        onClose={closeLookupCreate}
        onSubmit={submitLookupCreate}
        unit={null}
      />
    </form>
  );
};

export default ItemFormPage;
