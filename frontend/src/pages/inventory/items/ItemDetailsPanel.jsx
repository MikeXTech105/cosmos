import {
  Boxes,
  CalendarDays,
  Pencil,
  Tag,
} from "lucide-react";

import AppButton from "../../../components/common/AppButton";
import { InventoryStatusPill } from "../InventoryShared";
import { formatDate } from "../inventoryHelpers";
import {
  formatCurrency,
  formatStockWithUnit,
  formatUnitDisplay,
  getItemTypeLabel,
  isLowStock,
} from "./itemHelpers";
import ItemImageThumbnail from "./ItemImageThumbnail";

const DetailRow = ({ label, value }) => {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-2.5 last:border-b-0">
      <span className="text-xs font-medium text-slate-400">{label}</span>
      <span className="text-right text-sm font-medium text-slate-700">
        {value || "-"}
      </span>
    </div>
  );
};

const ItemDetailsPanel = ({ canEdit, item, isLoading, onEdit }) => {
  if (isLoading) {
    return (
      <div className="h-full min-h-[420px] space-y-4 p-5">
        <div className="h-20 animate-pulse rounded-xl bg-slate-100" />
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            className="h-10 animate-pulse rounded-lg bg-slate-100"
          />
        ))}
      </div>
    );
  }

  if (!item) {
    return (
      <div className="flex h-full min-h-[420px] flex-col items-center justify-center px-6 py-12 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
          <Boxes className="h-6 w-6" />
        </div>
        <h3 className="mt-4 text-base font-semibold text-slate-900">
          Select an item
        </h3>
        <p className="mt-1 max-w-xs text-sm leading-6 text-slate-500">
          Choose a product or service from the list to see its pricing and
          inventory details.
        </p>
      </div>
    );
  }

  const lowStock = isLowStock(item);
  const itemType = getItemTypeLabel(item.itemType);

  return (
    <div className="h-full min-h-[420px] p-5">
      <div className="flex items-start gap-4">
        <ItemImageThumbnail
          src={item.imageUrl}
          alt={item.name}
          className="h-14 w-14 rounded-xl"
          iconClassName="h-5 w-5"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold text-slate-900">
                {item.name}
              </h2>
              <p className="mt-1 text-xs font-medium text-slate-400">
                {item.itemCode || "No item code"}
              </p>
            </div>
            <InventoryStatusPill isActive={item.isActive} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-light px-2.5 py-1 text-xs font-semibold text-brand">
              <Tag className="h-3 w-3" />
              {itemType}
            </span>
            {lowStock && (
              <span className="inline-flex rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
                Low stock
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-medium text-slate-400">Sale price</p>
          <p className="mt-1 text-base font-semibold text-slate-900">
            {formatCurrency(item.salesPrice)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-medium text-slate-400">Purchase price</p>
          <p className="mt-1 text-base font-semibold text-slate-900">
            {formatCurrency(item.purchasePrice)}
          </p>
        </div>
      </div>

      <div className="mt-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Item details
        </p>
        <div className="mt-2">
          <DetailRow label="Category" value={item.categoryName} />
          <DetailRow
            label="Unit"
            value={formatUnitDisplay(item.unitName, item.unitShortName)}
          />
          <DetailRow label="Barcode" value={item.barcode} />
          <DetailRow label="HSN code" value={item.hsnCode} />
          <DetailRow
            label="GST rate"
            value={`${Number(item.gstRate ?? 0)}%`}
          />
        </div>
      </div>

      {itemType !== "Service" && (
        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Stock
          </p>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-200 p-3">
              <p className="text-xs text-slate-400">Current</p>
              <p
                className={[
                  "mt-1 text-base font-semibold",
                  lowStock ? "text-red-600" : "text-slate-900",
                ].join(" ")}
              >
                {formatStockWithUnit(
                  item.currentStock,
                  item.unitShortName,
                )}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 p-3">
              <p className="text-xs text-slate-400">Stock value</p>
              <p className="mt-1 text-base font-semibold text-slate-900">
                {formatCurrency(item.openingStockValue)}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-5 flex items-center gap-2 text-xs text-slate-400">
        <CalendarDays className="h-3.5 w-3.5" />
        Created {formatDate(item.createdAt)}
      </div>

      {canEdit && (
        <AppButton className="mt-5 w-full" onClick={() => onEdit(item)}>
          <Pencil className="h-4 w-4" />
          Adjust / Edit Item
        </AppButton>
      )}
    </div>
  );
};

export default ItemDetailsPanel;
