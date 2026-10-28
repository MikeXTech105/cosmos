import "./commerceTables.css";
import { Controller, useFieldArray, useWatch } from "react-hook-form";
import { useEffect, useRef } from "react";
import { Plus, Trash2 } from "lucide-react";

import AppButton from "../../components/common/AppButton";
import AppInput from "../../components/common/AppInput";
import AppLookup from "../../components/common/AppLookup";
import { documentLookupService } from "../../services/documentLookupService";
import { lookupPage } from "../../utils/lookupPage";
import { returnDiscount } from "./documents/purchaseReturnSource";
import {
  formatCurrency,
  getDefaultLine,
  getDocumentTotals,
  getLineCalculations,
  normalizeNumberBlurValue,
  normalizeNumberInput,
  normalizeSignedNumberBlurValue,
  normalizeSignedNumberInput,
} from "./purchaseHelpers";

export const PurchaseNumberInput = ({
  className,
  control,
  disabled,
  error,
  id,
  label,
  name,
  allowNegative = false,
  placeholder = "0",
  required = false,
  onValueChange,
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
            if (event.key === "-" && allowNegative) {
              if (
                String(field.value ?? "").startsWith("-") ||
                event.currentTarget.selectionStart !== 0
              ) {
                event.preventDefault();
              }

              return;
            }

            if (["e", "E", "+", "-"].includes(event.key)) {
              event.preventDefault();
            }
          }}
          onChange={(event) => {
            const value =
              allowNegative
                ? normalizeSignedNumberInput(event.target.value)
                : normalizeNumberInput(event.target.value);
            field.onChange(value);
            onValueChange?.(value);
          }}
          onBlur={(event) => {
            field.onChange(
              allowNegative
                ? normalizeSignedNumberBlurValue(event.target.value)
                : normalizeNumberBlurValue(event.target.value),
            );
            field.onBlur();
          }}
          ref={field.ref}
        />
      )}
    />
  );
};

const PurchaseLineItems = ({
  canCreateItem = false,
  control,
  errors,
  itemEmptyMessage,
  itemOptions,
  itemsById,
  name = "items",
  onCreateItem,
  setValue,
}) => {
  const { append, fields, remove } = useFieldArray({ control, name });
  const latestFields = useRef(fields);
  useEffect(() => { latestFields.current = fields; }, [fields]);
  const watchedItems = useWatch({ control, name }) ?? [];

  const applyItemDetails = (index, itemId, selected) => {
    const item = selected ?? itemsById.get(String(itemId));

    if (!item) {
      return;
    }

    setValue(`${name}.${index}.itemName`, item.name ?? "", {
      shouldDirty: true,
    });
    setValue(
      `${name}.${index}.purchasePrice`,
      String(item.purchasePrice ?? item.salesPrice ?? 0),
      {
        shouldDirty: true,
        shouldValidate: true,
      },
    );
    setValue(`${name}.${index}.taxPercentage`, String(item.gstRate ?? 0), {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue(`${name}.${index}.unitId`, item.unitId ?? null, {
      shouldDirty: true,
    });
  };

  const totals = getDocumentTotals({ items: watchedItems });

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Line Items</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Item price and GST auto-fill from inventory when available.
          </p>
        </div>
        <AppButton
          variant="secondary"
          className="h-9 rounded-lg px-3"
          onClick={() => append(getDefaultLine())}
        >
          <Plus className="h-4 w-4" />
          Add Row
        </AppButton>
      </div>

      <div className="overflow-x-auto">
        <table className="commerce-line-table w-full min-w-[1040px] table-fixed text-left">
          <thead>
            <tr className="border-b border-slate-100 bg-white">
              <th className="w-[28%] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Item<span className="ml-0.5 text-red-500">*</span>
              </th>
              <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Qty<span className="ml-0.5 text-red-500">*</span>
              </th>
              <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Price
              </th>
              <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Disc %
              </th>
              <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Disc Amt
              </th>
              <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Tax %
              </th>
              <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">
                Line Total
              </th>
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
                      name={`${name}.${index}.itemId`}
                      render={({ field: itemField }) => (
                        <AppLookup
                          label="Item"
                          name={itemField.name} value={itemField.value}
                          onChange={(value, selected) => {
                            itemField.onChange(String(value ?? ""));
                            applyItemDetails(index, value, selected);
                          }}
                          onBlur={itemField.onBlur}
                          initialOptions={itemOptions}
                          loadPage={async ({ search, page, pageSize, signal }) => lookupPage(await documentLookupService.items({ Search: search, PageNumber: page, PageSize: pageSize, IsActive: true }, { signal }), page, pageSize)}
                          loadById={async (value, options) => { const response = await documentLookupService.item(value, options); return response.data?.item ?? response.data; }}
                          getOptionLabel={row => row.label ?? [row.name, row.itemCode].filter(Boolean).join(" · ")}
                          placeholder={itemEmptyMessage || "Search item name or code"}
                          disabled={Boolean(line.purchaseBillItemId)}
                          required
                          error={errors?.[index]?.itemId?.message}
                          createLabel="Create new item"
                          onCreate={canCreateItem ? () => onCreateItem?.((created) => {
                            const currentIndex = latestFields.current.findIndex(row => row.id === field.id);
                            if (currentIndex < 0) return;
                            setValue(`${name}.${currentIndex}.itemId`, String(created.id), { shouldDirty: true, shouldValidate: true });
                            applyItemDetails(currentIndex, created.id, created);
                          }) : undefined}
                        />
                      )}
                    />
                    {line.maxReturnQuantity && <p className="mt-1 text-xs text-slate-500">Original bill line · maximum {line.maxReturnQuantity}</p>}
                  </td>
                  <td className="px-3 py-3 align-top">
                    <PurchaseNumberInput
                      control={control}
                      id={`purchase-quantity-${index}`}
                      name={`${name}.${index}.quantity`} label="Quantity"
                      required
                      error={errors?.[index]?.quantity?.message}
                      onValueChange={line.sourceQuantity ? (value) => setValue(`${name}.${index}.discountAmount`, returnDiscount(line.sourceDiscountAmount, line.sourceQuantity, value), { shouldDirty: true }) : undefined}
                    />
                  </td>
                  <td className="px-3 py-3 align-top">
                    <PurchaseNumberInput
                      control={control}
                      id={`purchase-price-${index}`}
                      name={`${name}.${index}.purchasePrice`} label="Price"
                      error={errors?.[index]?.purchasePrice?.message}
                    />
                  </td>
                  <td className="px-3 py-3 align-top">
                    <PurchaseNumberInput
                      control={control}
                      id={`purchase-discount-percentage-${index}`}
                      name={`${name}.${index}.discountPercentage`} label="Discount %"
                      error={errors?.[index]?.discountPercentage?.message}
                    />
                  </td>
                  <td className="px-3 py-3 align-top">
                    <PurchaseNumberInput
                      control={control}
                      id={`purchase-discount-amount-${index}`}
                      name={`${name}.${index}.discountAmount`} label="Discount amount"
                      error={errors?.[index]?.discountAmount?.message}
                    />
                  </td>
                  <td className="px-3 py-3 align-top">
                    <PurchaseNumberInput
                      control={control}
                      id={`purchase-tax-${index}`}
                      name={`${name}.${index}.taxPercentage`} label="Tax %"
                      error={errors?.[index]?.taxPercentage?.message}
                    />
                  </td>
                  <td data-label="Line total" className="px-3 py-3 text-right align-middle text-sm font-semibold text-slate-900">
                    {formatCurrency(lineTotal)}
                  </td>
                  <td className="px-2 py-3 text-right align-middle">
                    <div className="flex items-center justify-end gap-0.5">
                      <button
                        type="button"
                        aria-label="Remove line item"
                        disabled={fields.length === 1}
                        onClick={() => remove(index)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-all hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-2 bg-slate-50 px-4 py-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-end">
        <span>Subtotal: {formatCurrency(totals.subTotal)}</span>
        <span className="hidden text-slate-300 sm:inline">|</span>
        <span>Discount: {formatCurrency(totals.lineDiscount)}</span>
        <span className="hidden text-slate-300 sm:inline">|</span>
        <span>Tax: {formatCurrency(totals.taxAmount)}</span>
        <span className="font-semibold text-slate-900">
          Lines Total: {formatCurrency(totals.grandTotal)}
        </span>
      </div>
    </section>
  );
};

export default PurchaseLineItems;
