import { FolderKanban } from "lucide-react";

import EmptyState from "../../../components/common/EmptyState";
import MobileRecordCard, {
  MobileRecordCardSkeleton,
} from "../../../components/common/MobileRecordCard";
import {
  InventoryPagination,
  InventoryStatusPill,
} from "../InventoryShared";
import { formatDate } from "../inventoryHelpers";
import CategoryActions from "./CategoryActions";

const CategoryTable = ({
  actions,
  activeFilterCount = 0,
  categories,
  error,
  isLoading,
  onCreate,
  onClear,
  onPageChange,
  onPageSizeChange,
  onRetry,
  pageNumber,
  pageSize,
  totalCount,
  totalPages,
}) => {
  if (!isLoading && (error || categories.length === 0)) {
    const variant = error
      ? "error"
      : activeFilterCount > 0
        ? "filtered"
        : "empty";

    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <EmptyState
          actionLabel={variant === "empty" ? "Add Category" : undefined}
          context={
            variant === "empty"
              ? "Categories group your items for reporting and procurement planning."
              : undefined
          }
          hint={
            error
              ? error
              : variant === "filtered"
                ? "Clear the current filters to see your categories."
                : "Create a category to organize your first inventory items."
          }
          icon={FolderKanban}
          title={
            error
              ? "Couldn't load categories"
              : variant === "filtered"
                ? "No categories match these filters"
                : "No categories yet"
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
    <div className="overflow-hidden md:rounded-2xl md:border md:border-slate-200 md:bg-white md:shadow-sm">
      <div className="grid gap-3 pb-3 md:hidden">
        {isLoading
          ? Array.from({ length: 5 }, (_, index) => (
              <MobileRecordCardSkeleton key={index} fields={2} />
            ))
          : categories.map((category, index) => (
              <MobileRecordCard
                key={category.id}
                serial={(pageNumber - 1) * pageSize + index + 1}
                title={category.name}
                subtitle={category.description || "No description"}
                status={<InventoryStatusPill isActive={category.isActive} />}
                fields={[
                  {
                    key: "created",
                    label: "Created",
                    value: formatDate(category.createdAt),
                  },
                ]}
                actions={<CategoryActions category={category} {...actions} />}
              />
            ))}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table aria-label="Item categories" className="w-full min-w-[760px] table-fixed text-left">
          <thead className="bg-slate-50">
            <tr>
              {[
                "#",
                "Name",
                "Description",
                "Status",
                "Created Date",
                "Actions",
              ].map((heading) => (
                  <th scope="col" aria-label={heading === "#" ? "Row number" : undefined}
                    key={heading}
                    className={[
                      "border-b border-slate-200 px-4 py-3.5 text-xs font-medium uppercase tracking-wide text-slate-500",
                      heading === "Actions" ? "text-right" : "",
                    ].join(" ")}
                  >
                    {heading}
                  </th>
                ))}
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 5 }, (_, index) => (
                  <tr key={index}>
                    <td colSpan={6} className="px-4 py-3">
                      <div className="h-4 animate-pulse rounded bg-slate-100" />
                    </td>
                  </tr>
                ))
              : categories.map((category, index) => (
                  <tr
                    key={category.id}
                    className="transition-colors hover:bg-slate-50"
                  >
                    <td className="border-b border-slate-100 px-4 py-3.5 text-xs font-semibold tabular-nums text-slate-500">
                      {(pageNumber - 1) * pageSize + index + 1}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3.5 text-sm font-medium text-slate-900">
                      {category.name}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3.5">
                      <p className="max-w-md truncate text-sm text-slate-500">
                        {category.description || "-"}
                      </p>
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3.5">
                      <InventoryStatusPill isActive={category.isActive} />
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3.5 text-sm text-slate-500">
                      {formatDate(category.createdAt)}
                    </td>
                    <td className="border-b border-slate-100 px-3 py-3.5">
                      <CategoryActions category={category} {...actions} />
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      <InventoryPagination
        disabled={isLoading}
        itemLabel="categories"
        itemCount={categories.length}
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

export default CategoryTable;
