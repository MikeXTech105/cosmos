import { zodResolver } from "@hookform/resolvers/zod";
import {
  Check,
  PackagePlus,
  Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";

import AppButton from "../../../components/common/AppButton";
import AppImageUpload from "../../../components/common/AppImageUpload";
import AppInput from "../../../components/common/AppInput";
import AppModal from "../../../components/common/AppModal";
import AppSelect from "../../../components/common/AppSelect";
import { applyApiErrorsToForm } from "../../../utils/formApiErrors";
import { itemSchema } from "../../../utils/validationSchemas";
import {
  buildItemPayload,
  generateItemCode,
  getItemDefaultValues,
  ITEM_CLASSIFICATION_OPTIONS,
  ITEM_TYPE,
  ITEM_TYPE_OPTIONS,
  GST_RATE_OPTIONS,
} from "./itemHelpers";

const ITEM_FIELDS = [
  "name", "itemCode", "barcode", "categoryId", "unitId", "itemType",
  "procurementClassification", "purchasePrice", "salesPrice", "hsnCode",
  "gstRate", "trackInventory", "openingStock", "openingStockValue",
  "currentStock", "reservedStock", "minimumStock", "description", "isActive",
  "imageFile",
];

const ToggleRow = ({
  checked,
  description,
  disabled,
  label,
  onChange,
}) => {
  return (
    <label
      className={[
        "flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3",
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
      ].join(" ")}
    >
      <span>
        <span className="block text-sm font-semibold text-slate-900">
          {label}
        </span>
        <span className="mt-0.5 block text-xs leading-5 text-slate-500">
          {description}
        </span>
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
};

const SectionCard = ({ children, title }) => {
  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {title}
      </h3>
      <div className="mt-3">{children}</div>
    </section>
  );
};

const normalizeItemNumberInput = (rawValue) => {
  const value = String(rawValue ?? "").replace(/[^\d.]/g, "");

  if (!value) {
    return "";
  }

  const decimalIndex = value.indexOf(".");

  if (decimalIndex >= 0) {
    const integerPart =
      value.slice(0, decimalIndex).replace(/^0+(?=\d)/, "") || "0";
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

  const completedValue = normalized.endsWith(".")
    ? normalized.slice(0, -1)
    : normalized;
  const numericValue = Number(completedValue);

  return Number.isFinite(numericValue) ? String(numericValue) : "0";
};

const ItemNumberInput = ({
  control,
  disabled,
  error,
  id,
  label,
  name,
}) => {
  return (
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
          onChange={(event) =>
            field.onChange(normalizeItemNumberInput(event.target.value))
          }
          onBlur={(event) => {
            field.onChange(normalizeItemNumberBlurValue(event.target.value));
            field.onBlur();
          }}
          ref={field.ref}
        />
      )}
    />
  );
};

const ItemFormModal = ({
  canCreateCategory = false,
  canCreateUnit = false,
  categoryEmptyMessage,
  categoryLoading,
  categoryOptions,
  isLoading,
  isOpen,
  item,
  mode,
  onClose,
  onCreateCategory,
  onCreateUnit,
  onSubmit,
  unitEmptyMessage,
  unitLoading,
  unitOptions,
}) => {
  const isEdit = mode === "edit";
  const [activeTab, setActiveTab] = useState("pricing");
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
    defaultValues: getItemDefaultValues(item),
  });
  const itemType = useWatch({ control, name: "itemType" });
  const trackInventory = useWatch({ control, name: "trackInventory" });
  const itemName = useWatch({ control, name: "name" });

  useEffect(() => {
    if (isOpen) {
      reset(getItemDefaultValues(item));
    }
  }, [isOpen, item, reset]);

  const visibleTab =
    itemType === ITEM_TYPE.SERVICE && activeTab === "stock"
      ? "pricing"
      : activeTab;

  const submitForm = async (values, saveAndNew = false) => {
    try {
      await onSubmit(buildItemPayload(values), saveAndNew);
    } catch (error) {
      applyApiErrorsToForm({
        error,
        fieldAliases: { gstRate: "GSTRate", hsnCode: "HSNCode" },
        formFieldNames: ITEM_FIELDS,
        setError,
      });
      return;
    }

    if (saveAndNew) {
      reset(getItemDefaultValues(null));
      setActiveTab("pricing");
    }
  };

  const title = isEdit ? "Edit Item" : "Add Item";

  return (
    <AppModal
      isBusy={isSubmitting}
      isOpen={isOpen}
      maxWidth="max-w-[1480px]"
      onClose={isSubmitting ? undefined : onClose}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-light text-brand">
          <PackagePlus className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">
            Configure identity, pricing, tax, and stock in one place.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 8 }, (_, index) => (
            <div
              key={index}
              className="h-14 animate-pulse rounded-xl bg-slate-100"
            />
          ))}
        </div>
      ) : (
        <form
          className="mt-5 flex max-h-[calc(100vh-16rem)] min-h-0 flex-col"
          onSubmit={handleSubmit((values) => submitForm(values, false))}
        >
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-1 pb-5">
            {errors.root?.server?.message && (
              <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {errors.root.server.message}
              </p>
            )}
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Item type
                </p>
                <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                  {ITEM_TYPE_OPTIONS.map((option) => {
                    const type = option.value;
                    const isActive = itemType === type;

                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          setValue("itemType", type, {
                            shouldDirty: true,
                            shouldValidate: true,
                          });
                          if (type === ITEM_TYPE.SERVICE) {
                            setActiveTab("pricing");
                          }
                        }}
                        className={[
                          "h-9 rounded-lg px-5 text-sm font-semibold transition-colors",
                          isActive
                            ? "bg-brand text-white shadow-sm"
                            : "text-slate-500 hover:bg-white hover:text-slate-900",
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
                      options={[
                        { value: "", label: "Not classified" },
                        ...ITEM_CLASSIFICATION_OPTIONS,
                      ]}
                      aria-describedby="itemMaterialTypeHelp"
                    />
                  )}
                />
                <p
                  id="itemMaterialTypeHelp"
                  className="mt-1.5 text-xs text-slate-500"
                >
                  Used by procurement planning to decide what to buy.
                </p>
              </div>
            </div>

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Item identity
              </h3>
              <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <AppInput
                  id="itemName"
                  label="Item Name"
                  required
                  error={errors.name?.message}
                  {...register("name")}
                />

                <div>
                  <div className="mb-1.5 flex items-center justify-between gap-3">
                    <label
                      htmlFor="itemCode"
                      className="text-[13px] font-medium text-slate-700"
                    >
                      Item Code
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setValue("itemCode", generateItemCode(itemName), {
                          shouldDirty: true,
                          shouldValidate: true,
                        })
                      }
                      className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:text-brand-dark"
                    >
                      <Sparkles className="h-3 w-3" />
                      Assign Code
                    </button>
                  </div>
                  <AppInput
                    id="itemCode"
                    aria-label="Item code"
                    error={errors.itemCode?.message}
                    {...register("itemCode")}
                  />
                </div>

                <AppInput
                  id="itemBarcode"
                  label="Barcode"
                  error={errors.barcode?.message}
                  {...register("barcode")}
                />

                <Controller
                  control={control}
                  name="categoryId"
                  render={({ field }) => (
                    <AppSelect
                      label="Category"
                      required={itemType === ITEM_TYPE.PRODUCT}
                      value={field.value}
                      onChange={(value) => field.onChange(Number(value))}
                      onBlur={field.onBlur}
                      options={categoryOptions}
                      emptyMessage={categoryEmptyMessage}
                      placeholder={
                        categoryLoading
                          ? "Loading categories..."
                          : "Select category"
                      }
                      disabled={categoryLoading}
                      error={errors.categoryId?.message}
                      creatable={canCreateCategory}
                      createLabel="Create new category"
                      onCreateClick={onCreateCategory}
                    />
                  )}
                />

                {itemType === ITEM_TYPE.PRODUCT && (
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
                        emptyMessage={unitEmptyMessage}
                        placeholder={
                          unitLoading ? "Loading units..." : "Select unit"
                        }
                        disabled={unitLoading}
                        error={errors.unitId?.message}
                        creatable={canCreateUnit}
                        createLabel="Create new unit"
                        onCreateClick={onCreateUnit}
                      />
                    )}
                  />
                )}

                <Controller
                  control={control}
                  name="imageUrl"
                  render={({ field }) => (
                    <AppImageUpload
                      label="Item Image"
                      value={field.value}
                      disabled={isSubmitting}
                      onChange={(url) =>
                        setValue("imageUrl", url, {
                          shouldDirty: true,
                          shouldValidate: true,
                        })
                      }
                      onFileChange={
                        isEdit
                          ? undefined
                          : (file) =>
                              setValue("imageFile", file, {
                                shouldDirty: true,
                              })
                      }
                      error={errors.imageUrl?.message}
                    />
                  )}
                />
              </div>
            </section>

            <div className="border-b border-slate-200">
              <div className="flex gap-1 overflow-x-auto">
                {[
                  { id: "pricing", label: "Pricing" },
                  ...(itemType === ITEM_TYPE.PRODUCT
                    ? [{ id: "stock", label: "Stock" }]
                    : []),
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={[
                      "h-11 shrink-0 border-b-2 px-4 text-sm font-semibold transition-colors",
                      visibleTab === tab.id
                        ? "border-brand text-brand"
                        : "border-transparent text-slate-500 hover:text-slate-900",
                    ].join(" ")}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {visibleTab === "pricing" && (
              <div className="grid gap-4 lg:grid-cols-3">
                <SectionCard title="Sale Price">
                  <ItemNumberInput
                    control={control}
                    id="salesPrice"
                    name="salesPrice"
                    label="Sales Price"
                    error={errors.salesPrice?.message}
                  />
                </SectionCard>

                <SectionCard title="Purchase Price">
                  <ItemNumberInput
                    control={control}
                    id="purchasePrice"
                    name="purchasePrice"
                    label="Purchase Price"
                    error={errors.purchasePrice?.message}
                  />
                </SectionCard>

                <SectionCard title="Taxes">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                    <AppInput
                      id="hsnCode"
                      label="HSN Code"
                      error={errors.hsnCode?.message}
                      {...register("hsnCode")}
                    />
                    <Controller
                      control={control}
                      name="gstRate"
                      render={({ field }) => (
                        <AppSelect
                          label="GST Rate"
                          value={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          options={GST_RATE_OPTIONS}
                          error={errors.gstRate?.message}
                        />
                      )}
                    />
                  </div>
                </SectionCard>
              </div>
            )}

            {visibleTab === "stock" && itemType === ITEM_TYPE.PRODUCT && (
              <div className="space-y-4">
                <Controller
                  control={control}
                  name="trackInventory"
                  render={({ field }) => (
                    <ToggleRow
                      checked={field.value}
                      label="Track inventory"
                      description="Maintain opening, current, reserved, and minimum stock for this product."
                      onChange={field.onChange}
                    />
                  )}
                />

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <ItemNumberInput
                    control={control}
                    id="openingStock"
                    name="openingStock"
                    label="Opening Stock"
                    disabled={!trackInventory}
                    error={errors.openingStock?.message}
                  />
                  <ItemNumberInput
                    control={control}
                    id="openingStockValue"
                    name="openingStockValue"
                    label="Opening Stock Value"
                    disabled={!trackInventory}
                    error={errors.openingStockValue?.message}
                  />
                  <ItemNumberInput
                    control={control}
                    id="currentStock"
                    name="currentStock"
                    label="Current Stock"
                    disabled={!trackInventory}
                    error={errors.currentStock?.message}
                  />
                  <ItemNumberInput
                    control={control}
                    id="reservedStock"
                    name="reservedStock"
                    label="Reserved Stock"
                    disabled={!trackInventory}
                    error={errors.reservedStock?.message}
                  />
                  <ItemNumberInput
                    control={control}
                    id="minimumStock"
                    name="minimumStock"
                    label="Minimum Stock"
                    disabled={!trackInventory}
                    error={errors.minimumStock?.message}
                  />
                </div>
              </div>
            )}

            <section className="grid gap-4 lg:grid-cols-[1fr_320px]">
              <div>
                <label
                  htmlFor="itemDescription"
                  className="mb-1.5 block text-xs font-semibold text-slate-700"
                >
                  Description
                </label>
                <textarea
                  id="itemDescription"
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

              <Controller
                control={control}
                name="isActive"
                render={({ field }) => (
                  <ToggleRow
                    checked={field.value}
                    label="Active item"
                    description="Active items are available for inventory and transaction workflows."
                    onChange={field.onChange}
                  />
                )}
              />
            </section>
          </div>

          <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-slate-200 bg-white pt-4 sm:flex-row sm:justify-end">
            <AppButton
              variant="secondary"
              disabled={isSubmitting}
              onClick={onClose}
            >
              Cancel
            </AppButton>
            {!isEdit && (
              <AppButton
                type="button"
                variant="secondary"
                disabled={isSubmitting}
                onClick={handleSubmit((values) => submitForm(values, true))}
              >
                <PackagePlus className="h-4 w-4" />
                Save & New
              </AppButton>
            )}
            <AppButton type="submit" isLoading={isSubmitting} loadingText="Saving…">
              {isEdit ? (
                <>
                  <Check className="h-4 w-4" />
                  Save Changes
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Save Item
                </>
              )}
            </AppButton>
          </div>
        </form>
      )}
    </AppModal>
  );
};

export default ItemFormModal;
