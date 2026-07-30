import { FolderKanban, Plus, RefreshCw } from "lucide-react";

import AppButton from "../../../components/common/AppButton";
import {
  InventoryPagination,
  InventoryStatusPill,
} from "../InventoryShared";
import { formatDate } from "../inventoryHelpers";
import CategoryActions from "./CategoryActions";

const CategoryTable = ({
  actions,
  categories,
  error,
  isLoading,
  onCreate,
  onPageChange,
  onPageSizeChange,
  onRetry,
  pageNumber,
  pageSize,
  totalCount,
  totalPages,
}) => {
  if (!isLoading && (error || categories.length === 0)) {
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-light text-brand">
            <FolderKanban className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-slate-900">
            {error ? "Unable to load categories" : "No categories found"}
          </h3>
          <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">
            {error
              ? error
              : "Create the first inventory category or adjust the current filters."}
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
              {error ? "Retry" : "Add Category"}
            </AppButton>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] table-fixed text-left">
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
                  <th
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
                    <td className="border-b border-slate-100 px-4 py-3.5 text-xs font-semibold tabular-nums text-slate-400">
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
