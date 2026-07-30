import { Scale } from "lucide-react";

import EmptyState from "../../../components/common/EmptyState";
import MobileRecordCard, {
  MobileRecordCardSkeleton,
} from "../../../components/common/MobileRecordCard";
import {
  InventoryPagination,
  InventoryStatusPill,
} from "../InventoryShared";
import { formatDate } from "../inventoryHelpers";
import UnitActions from "./UnitActions";

const UnitTable = ({
  actions,
  activeFilterCount = 0,
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
  units,
}) => {
  if (!isLoading && (error || units.length === 0)) {
    const variant = error
      ? "error"
      : activeFilterCount > 0
        ? "filtered"
        : "empty";

    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <EmptyState
          actionLabel={variant === "empty" ? "Add Unit" : undefined}
          context={
            variant === "empty"
              ? "Units keep quantities consistent across inventory, sales, and purchasing."
              : undefined
          }
          hint={
            error
              ? error
              : variant === "filtered"
                ? "Clear the current filters to see your units."
                : "Create a unit of measure before adding stock items."
          }
          icon={Scale}
          title={
            error
              ? "Couldn't load units"
              : variant === "filtered"
                ? "No units match these filters"
                : "No units yet"
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
              <MobileRecordCardSkeleton key={index} fields={3} />
            ))
          : units.map((unit, index) => (
              <MobileRecordCard
                key={unit.id}
                serial={(pageNumber - 1) * pageSize + index + 1}
                title={unit.name}
                subtitle={unit.description || "No description"}
                status={<InventoryStatusPill isActive={unit.isActive} />}
                fields={[
                  {
                    key: "shortName",
                    label: "Short name",
                    value: unit.shortName || "-",
                  },
                  {
                    key: "created",
                    label: "Created",
                    value: formatDate(unit.createdAt),
                  },
                ]}
                actions={<UnitActions unit={unit} {...actions} />}
              />
            ))}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table aria-label="Units of measure" className="min-w-[860px] w-full table-fixed text-left">
          <thead className="bg-slate-50">
            <tr>
              {[
                "#",
                "Full Name",
                "Short Name",
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
                    <td colSpan={7} className="px-4 py-3">
                      <div className="h-4 animate-pulse rounded bg-slate-100" />
                    </td>
                  </tr>
                ))
              : units.map((unit, index) => (
                  <tr
                    key={unit.id}
                    className="transition-colors hover:bg-slate-50"
                  >
                    <td className="border-b border-slate-100 px-4 py-3.5 text-xs font-semibold tabular-nums text-slate-500">
                      {(pageNumber - 1) * pageSize + index + 1}
                    </td>
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
