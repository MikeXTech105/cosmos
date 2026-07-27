import { Boxes, Plus, RefreshCw } from "lucide-react";

import AppButton from "../../../components/common/AppButton";
import {
  getItemClassificationLabel,
  normalizeItemClassification,
} from "../../../utils/itemClassification";
import {
  InventoryPagination,
  InventoryStatusPill,
} from "../InventoryShared";
import ItemActions from "./ItemActions";
import ItemImageThumbnail from "./ItemImageThumbnail";
import { itemColumns } from "./itemColumns";
import {
  formatStockWithUnit,
  getItemTypeLabel,
  isLowStock,
} from "./itemHelpers";

const ItemTable = ({
  actions,
  error,
  isLoading,
  items,
  onCreate,
  onPageChange,
  onPageSizeChange,
  onRetry,
  onSelect,
  pageNumber,
  pageSize,
  selectedId,
  totalCount,
  totalPages,
}) => {
  if (!isLoading && (error || items.length === 0)) {
    return (
      <div className="flex h-full min-h-[420px] flex-col items-center justify-center px-6 py-12 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-light text-brand">
          <Boxes className="h-6 w-6" />
        </div>
        <h3 className="mt-4 text-base font-semibold text-slate-900">
          {error ? "Unable to load items" : "No items found"}
        </h3>
        <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">
          {error
            ? error
            : "Create the first product or service, or adjust the current filters."}
        </p>
        {(error || actions.canCreate) && (
          <AppButton
            variant={error ? "secondary" : "primary"}
            className="mt-5 h-10"
            onClick={error ? onRetry : onCreate}
          >
            {error ? (
              <RefreshCw className="h-4 w-4" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {error ? "Retry" : "Add Item"}
          </AppButton>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-[420px] flex-col">
      <div className="min-h-0 flex-1 overflow-x-auto">
        <table className="w-full min-w-[860px] table-fixed text-left">
          <thead className="bg-slate-50">
            <tr>
              {itemColumns.map((column) => (
                <th
                  key={column.key}
                  className={[
                    "border-b border-slate-200 px-3 py-3 text-xs font-medium uppercase tracking-wide text-slate-500",
                    column.align === "right" ? "text-right" : "",
                    column.key === "serialNumber" ? "w-[52px]" : "",
                    column.key === "name" ? "w-[30%]" : "",
                    column.key === "procurementClassification"
                      ? "w-[148px]"
                      : "",
                    column.key === "actions" ? "w-[112px]" : "",
                  ].join(" ")}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 7 }, (_, index) => (
                  <tr key={index}>
                    <td colSpan={itemColumns.length} className="px-3 py-3">
                      <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
                    </td>
                  </tr>
                ))
              : items.map((item, index) => {
                  const lowStock = isLowStock(item);
                  const isSelected = String(selectedId) === String(item.id);
                  const itemType = getItemTypeLabel(item.itemType);
                  const itemClassification = normalizeItemClassification(
                    item.procurementClassification,
                  );
                  const itemClassificationLabel =
                    getItemClassificationLabel(itemClassification);

                  return (
                    <tr
                      key={item.id}
                      tabIndex={0}
                      onClick={() => onSelect(item)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onSelect(item);
                        }
                      }}
                      className={[
                        "cursor-pointer transition-colors hover:bg-slate-50",
                        isSelected ? "bg-brand-light/60" : "",
                      ].join(" ")}
                    >
                      <td className="border-b border-slate-100 px-4 py-3.5 text-xs font-semibold tabular-nums text-slate-400">
                        {(pageNumber - 1) * pageSize + index + 1}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-3">
                        <div className="flex items-center gap-3">
                          <ItemImageThumbnail
                            src={item.imageUrl}
                            alt={item.name}
                          />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-900">
                              {item.name}
                            </p>
                            <p className="mt-1 truncate text-xs text-slate-400">
                              {[item.itemCode, item.categoryName]
                                .filter(Boolean)
                                .join(" - ") || "No code or category"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="border-b border-slate-100 px-3 py-3">
                        <span
                          className={[
                            "inline-flex rounded-full px-2 py-1 text-[11px] font-semibold",
                            itemType === "Service"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-brand-light text-brand",
                          ].join(" ")}
                        >
                          {itemType}
                        </span>
                      </td>
                      <td className="border-b border-slate-100 px-3 py-3">
                        <span
                          className={[
                            "inline-flex rounded-full px-2 py-1 text-[11px] font-semibold",
                            itemClassification === null
                              ? "bg-slate-50 text-slate-500 ring-1 ring-inset ring-slate-200"
                              : "bg-slate-100 text-slate-700",
                          ].join(" ")}
                        >
                          {itemClassificationLabel}
                        </span>
                      </td>
                      <td
                        className={[
                          "border-b border-slate-100 px-3 py-3 text-right text-sm font-semibold",
                          lowStock ? "text-red-600" : "text-slate-700",
                        ].join(" ")}
                      >
                        {itemType === "Service"
                          ? "-"
                          : formatStockWithUnit(
                              item.currentStock,
                              item.unitShortName,
                            )}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-3">
                        <InventoryStatusPill isActive={item.isActive} />
                      </td>
                      <td className="border-b border-slate-100 px-2 py-3">
                        <ItemActions item={item} {...actions} />
                      </td>
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </div>

      <InventoryPagination
        disabled={isLoading}
        itemLabel="items"
        itemCount={items.length}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        pageNumber={pageNumber}
        pageSize={pageSize}
        totalCount={totalCount}
        totalPages={totalPages}
      />
    </div>
  );
};

export default ItemTable;
