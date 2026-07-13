import { useEffect, useMemo, useState } from "react";

import AppSelect from "../../../components/common/AppSelect";
import { categoryService } from "../../../services/inventory/categoryService";
import {
  DASHBOARD_TOP_OPTIONS,
  formatCurrency,
  formatNumber,
  isEmptyCollection,
} from "../dashboardHelpers";
import {
  ListSkeleton,
  RankBadge,
  WidgetCard,
  WidgetEmpty,
  WidgetError,
} from "./WidgetState";

const extractList = (response) => {
  const data = response?.data;

  if (Array.isArray(data)) {
    return data;
  }

  return Array.isArray(data?.items) ? data.items : [];
};

const TopSellingItems = ({
  error,
  filters,
  isLoading,
  onChange,
  onRetry,
  rows,
}) => {
  const [categoryOptions, setCategoryOptions] = useState([]);

  useEffect(() => {
    let isMounted = true;

    categoryService
      .getCategories({
        IsActive: true,
        PageNumber: 1,
        PageSize: 200,
      })
      .then((response) => {
        if (!isMounted) {
          return;
        }

        setCategoryOptions(
          extractList(response)
            .map((category) => ({
              label: category?.name ?? category?.categoryName,
              value: category?.id ?? category?.categoryId,
            }))
            .filter((option) => option.label && option.value),
        );
      })
      .catch(() => {
        if (isMounted) {
          setCategoryOptions([]);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const options = useMemo(
    () => [{ label: "All categories", value: "all" }, ...categoryOptions],
    [categoryOptions],
  );

  return (
    <WidgetCard
      title="Top Selling Items"
      description="Ranked by sales amount in the selected date range."
      actions={
        <>
          <AppSelect
            value={filters.top}
            onChange={(value) => onChange({ top: Number(value) })}
            options={DASHBOARD_TOP_OPTIONS.map((value) => ({
              label: `Top ${value}`,
              value,
            }))}
            className="w-28"
            aria-label="Top selling items count"
          />
          <AppSelect
            value={filters.categoryId}
            onChange={(value) => onChange({ categoryId: value })}
            options={options}
            className="min-w-[180px]"
            aria-label="Top selling items category"
          />
        </>
      }
    >
      {isLoading ? (
        <ListSkeleton rows={5} />
      ) : error ? (
        <WidgetError message={error} onRetry={onRetry} />
      ) : isEmptyCollection(rows) ? (
        <WidgetEmpty message="No item sales for this period." />
      ) : (
        <div className="space-y-3">
          {rows.map((item) => (
            <div
              key={`${item.itemId}-${item.rank}`}
              className="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-3"
            >
              <RankBadge rank={item.rank} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {item.itemName ?? "Unnamed item"}
                </p>
                <p className="mt-1 truncate text-xs text-slate-400">
                  {[item.itemCode, item.categoryName].filter(Boolean).join(" - ") ||
                    "No code or category"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold tabular-nums text-slate-900">
                  {formatCurrency(item.salesAmount)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {formatNumber(item.quantitySold)} qty
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </WidgetCard>
  );
};

export default TopSellingItems;
