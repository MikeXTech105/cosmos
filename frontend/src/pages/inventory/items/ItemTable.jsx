import { Boxes } from "lucide-react";

import EmptyState from "../../../components/common/EmptyState";
import MaterialTypePill from "../../../components/common/MaterialTypePill";
import MobileRecordCard, {
  MobileRecordCardSkeleton,
} from "../../../components/common/MobileRecordCard";
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
  activeFilterCount = 0,
  error,
  isLoading,
  items,
  onCreate,
  onClear,
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
    const variant = error
      ? "error"
      : activeFilterCount > 0
        ? "filtered"
        : "empty";

    return (
      <div className="flex h-full min-h-[420px] items-center justify-center px-6">
        <EmptyState
          actionLabel={variant === "empty" ? "Add Item" : undefined}
          context={
            variant === "empty"
              ? "Items are the products and services used in sales, purchasing, stock, and planning."
              : undefined
          }
          hint={
            error
              ? error
              : variant === "filtered"
                ? "Clear the current filters to see all inventory items."
                : "Create your first product or service to begin."
          }
          icon={Boxes}
          title={
            error
              ? "Couldn't load items"
              : variant === "filtered"
                ? "No items match these filters"
                : "No items yet"
          }
          variant={variant}
          onAction={
            error
              ? onRetry
              : variant === "filtered"
                ? onClear
                : actions.canCreate
                  ? onCreate
                  : undefined
          }
        />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-[420px] flex-col">
      <div className="grid gap-3 pb-3 md:hidden">
        {isLoading
          ? Array.from({ length: 5 }, (_, index) => (
              <MobileRecordCardSkeleton key={index} />
            ))
          : items.map((item, index) => {
              const itemType = getItemTypeLabel(item.itemType);

              return (
                <MobileRecordCard
                  key={item.id}
                  serial={(pageNumber - 1) * pageSize + index + 1}
                  title={item.name}
                  subtitle={
                    [item.itemCode, item.categoryName]
                      .filter(Boolean)
                      .join(" · ") || "No code or category"
                  }
                  status={<InventoryStatusPill isActive={item.isActive} />}
                  fields={[
                    { key: "type", label: "Type", value: itemType },
                    {
                      key: "material",
                      label: "Material type",
                      value: (
                        <MaterialTypePill
                          value={item.procurementClassification}
                        />
                      ),
                    },
                    {
                      key: "stock",
                      label: "Current stock",
                      value:
                        itemType === "Service"
                          ? "-"
                          : formatStockWithUnit(
                              item.currentStock,
                              item.unitShortName,
                            ),
                      className: isLowStock(item) ? "text-red-600" : undefined,
                    },
                    {
                      key: "category",
                      label: "Category",
                      value: item.categoryName || "-",
                    },
                  ]}
                  footer={
                    <button
                      type="button"
                      className="inline-flex min-h-11 items-center text-sm font-medium text-brand"
                      onClick={() => onSelect(item)}
                    >
                      View details
                    </button>
                  }
                  actions={<ItemActions item={item} {...actions} />}
                />
              );
            })}
      </div>

      <div className="hidden min-h-0 flex-1 overflow-x-auto md:block">
        <table aria-label="Inventory items" className="w-full min-w-[1010px] table-fixed text-left">
          <colgroup>
            {itemColumns.map((column) => (
              <col key={column.key} className={column.width} />
            ))}
          </colgroup>
          <thead className="bg-slate-50">
            <tr>
              {itemColumns.map((column) => (
                <th scope="col" aria-label={column.label === "#" ? "Row number" : undefined}
                  key={column.key}
                  className={[
                    "border-b border-slate-200 px-3 py-3 text-xs font-medium uppercase tracking-wide text-slate-500",
                    column.align === "right" ? "text-right" : "",
                  ].join(" ")}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 5 }, (_, index) => (
                  <tr key={index}>
                    <td colSpan={itemColumns.length} className="px-3 py-3">
                      <div className="h-4 animate-pulse rounded bg-slate-100" />
                    </td>
                  </tr>
                ))
              : items.map((item, index) => {
                  const lowStock = isLowStock(item);
                  const isSelected = String(selectedId) === String(item.id);
                  const itemType = getItemTypeLabel(item.itemType);

                  return (
                    <tr
                      key={item.id}
                      className={[
                        "transition-colors hover:bg-slate-50",
                        isSelected ? "bg-brand-light/60" : "",
                      ].join(" ")}
                    >
                      <td className="border-b border-slate-100 px-4 py-3.5 text-xs font-semibold tabular-nums text-slate-500">
                        {(pageNumber - 1) * pageSize + index + 1}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-3">
                        <button
                          type="button"
                          className="flex w-full items-center gap-3 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
                          onClick={() => onSelect(item)}
                        >
                          <ItemImageThumbnail
                            src={item.imageUrl}
                            alt={item.name}
                          />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-900">
                              {item.name}
                            </p>
                            <p className="mt-1 truncate text-xs text-slate-500">
                              {[item.itemCode, item.categoryName]
                                .filter(Boolean)
                                .join(" - ") || "No code or category"}
                            </p>
                          </div>
                        </button>
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
                      <td className="border-b border-slate-100 px-4 py-3.5">
                        <MaterialTypePill
                          value={item.procurementClassification}
                        />
                      </td>
                      <td
                        className={[
                          "border-b border-slate-100 px-3 py-3 text-right text-sm font-semibold tabular-nums",
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
