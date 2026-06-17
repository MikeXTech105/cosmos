import { Plus, RefreshCw, Scale } from "lucide-react";

import AppButton from "../../../components/common/AppButton";
import {
  InventoryPagination,
  InventoryStatusPill,
} from "../InventoryShared";
import { formatDate } from "../inventoryHelpers";
import UnitActions from "./UnitActions";

const UnitTable = ({
  actions,
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
  units,
}) => {
  if (!isLoading && (error || units.length === 0)) {
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-light text-brand">
            <Scale className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-slate-900">
            {error ? "Unable to load units" : "No units found"}
          </h3>
          <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">
            {error
              ? error
              : "Create the first unit of measure or adjust the current filters."}
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
              {error ? "Retry" : "Add Unit"}
            </AppButton>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-[860px] w-full table-fixed text-left">
          <thead className="bg-slate-50">
            <tr>
              {[
                "Full Name",
                "Short Name",
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
              ? Array.from({ length: 6 }, (_, index) => (
                  <tr key={index}>
                    <td colSpan={6} className="px-4 py-3">
                      <div className="h-11 animate-pulse rounded-xl bg-slate-100" />
                    </td>
                  </tr>
                ))
              : units.map((unit) => (
                  <tr
                    key={unit.id}
                    className="transition-colors hover:bg-slate-50"
                  >
                    <td className="border-b border-slate-100 px-4 py-3.5 text-sm font-medium text-slate-900">
                      {unit.name}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3.5">
                      <span className="inline-flex rounded-lg bg-slate-100 px-2 py-1 font-mono text-xs font-semibold text-slate-700">
                        {unit.shortName || "-"}
                      </span>
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3.5">
                      <p className="max-w-md truncate text-sm text-slate-500">
                        {unit.description || "-"}
                      </p>
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3.5">
                      <InventoryStatusPill isActive={unit.isActive} />
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3.5 text-sm text-slate-500">
                      {formatDate(unit.createdAt)}
                    </td>
                    <td className="border-b border-slate-100 px-3 py-3.5">
                      <UnitActions unit={unit} {...actions} />
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      <InventoryPagination
        disabled={isLoading}
        itemLabel="units"
        itemCount={units.length}
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

export default UnitTable;
