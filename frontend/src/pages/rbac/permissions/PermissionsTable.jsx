import {
  BadgeCheck,
  Check,
  CheckSquare2,
  Download,
  Eye,
  FileLock2,
  Layers3,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import { createElement, memo, useMemo, useState } from "react";

import { getIconComponent } from "../../../config/iconMap";
import { permissionColumns } from "./permissionsColumns";

const bulkIcons = {
  canApprove: BadgeCheck,
  canCreate: Plus,
  canDelete: Trash2,
  canEdit: Pencil,
  canExport: Download,
  canView: Eye,
};

const depthPadding = ["pl-0", "pl-3", "pl-6", "pl-9", "pl-12", "pl-16"];

const PermissionCheckbox = memo(({ checked, disabled, label, onChange }) => (
  <button
    type="button"
    role="checkbox"
    aria-checked={checked}
    aria-label={label}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={[
      "inline-flex h-5 w-5 items-center justify-center rounded-md border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/25 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50",
      checked
        ? "border-brand bg-brand text-white hover:bg-brand-dark"
        : "border-slate-300 bg-white text-transparent hover:border-brand/50 hover:bg-brand-light",
    ].join(" ")}
  >
    <Check className="h-3.5 w-3.5 stroke-[2.5]" />
  </button>
));

PermissionCheckbox.displayName = "PermissionCheckbox";

const BulkButton = memo(({ active, disabled, icon, label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label + " permission for every page"}
    aria-pressed={active}
    disabled={disabled}
    className={[
      "inline-flex h-8 items-center justify-center gap-1 rounded-lg border px-2 text-[10px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/20 disabled:cursor-not-allowed disabled:opacity-50",
      active
        ? "border-brand/20 bg-brand-light text-brand"
        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900",
    ].join(" ")}
  >
    {createElement(icon, { className: "h-3 w-3" })}
    {label}
  </button>
));

BulkButton.displayName = "BulkButton";

const TableSkeleton = () => {
  return Array.from({ length: 8 }, (_, index) => (
    <tr key={index}>
      <td colSpan={7} className="px-4 py-2.5">
        <div className="h-9 animate-pulse rounded-lg bg-slate-100" />
      </td>
    </tr>
  ));
};

const StatePanel = ({ errorMessage, hasError, onRetry, selectedRoleId }) => {
  const title = hasError
    ? "Unable to load permission matrix"
    : selectedRoleId
      ? "No pages available"
      : "Select a role";
  const description = hasError
    ? errorMessage ?? "Something went wrong while loading permissions."
    : selectedRoleId
      ? "Create page records before assigning role permissions."
      : "Choose a role above to review its page and action access.";

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-light text-brand">
          <FileLock2 className="h-6 w-6" />
        </div>
        <h3 className="mt-4 text-base font-bold text-slate-950">{title}</h3>
        <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">
          {description}
        </p>
        {hasError && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-5 inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/20"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        )}
      </div>
    </section>
  );
};

const PermissionRow = memo(({ isDisabled, onToggleCell, page, row }) => {
  const enabledPermissions = permissionColumns.filter((column) => {
    return Boolean(row?.[column.key]);
  }).length;
  const pageContext =
    page.route || (page.depth > 0 ? page.hierarchyPath : "Top-level page");

  return (
    <tr className="group transition-colors hover:bg-slate-50 focus-within:bg-slate-50">
      <td className="sticky left-0 z-10 border-b border-r border-slate-100 bg-white px-3 py-2.5 group-hover:bg-slate-50">
        <div
          className={[
            "flex min-w-0 items-center gap-2.5",
            depthPadding[Math.min(page.depth, depthPadding.length - 1)],
          ].join(" ")}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-light text-brand ring-1 ring-inset ring-brand/10">
            {createElement(getIconComponent(page.icon), {
              className: "h-3.5 w-3.5",
            })}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-semibold text-slate-900">
              {page.displayName}
            </span>
            <span className="mt-0.5 block truncate text-[10px] text-slate-400">
              {pageContext}
            </span>
          </span>
          <span
            className={[
              "shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold tabular-nums",
              enabledPermissions > 0
                ? "bg-brand-light text-brand"
                : "bg-slate-100 text-slate-400",
            ].join(" ")}
          >
            {enabledPermissions}/{permissionColumns.length}
          </span>
        </div>
      </td>
      {permissionColumns.map((column) => (
        <td
          key={column.key}
          className="border-b border-slate-100 px-2 py-2.5 text-center"
        >
          <PermissionCheckbox
            checked={Boolean(row?.[column.key])}
            disabled={isDisabled}
            label={column.label + " permission for " + page.displayName}
            onChange={(checked) => onToggleCell(page.id, column.key, checked)}
          />
        </td>
      ))}
    </tr>
  );
});

PermissionRow.displayName = "PermissionRow";

const EmptySearchRow = ({ query }) => (
  <tr>
    <td colSpan={7} className="px-6 py-14 text-center">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
        <Search className="h-5 w-5" />
      </div>
      <p className="mt-3 text-sm font-bold text-slate-900">No matching pages</p>
      <p className="mt-1 text-xs text-slate-500">
        No results for &quot;{query}&quot;. Try a page, module, or route name.
      </p>
    </td>
  </tr>
);

const PermissionsTable = ({
  enabledCount,
  errorMessage,
  isAllSelected,
  isColumnSelected,
  isDisabled,
  isLoading,
  isSuperAdmin,
  matrix,
  onRetry,
  onToggleAll,
  onToggleCell,
  onToggleColumn,
  pages,
  selectedRoleId,
  selectedRoleName,
  totalCount,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const hasError = Boolean(errorMessage);
  const coverage = totalCount > 0
    ? Math.round((enabledCount / totalCount) * 100)
    : 0;
  const filteredPages = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return pages;
    }

    return pages.filter((page) => {
      return [page.displayName, page.hierarchyPath, page.route, page.name]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [pages, searchQuery]);

  if (!isLoading && (hasError || !selectedRoleId || pages.length === 0)) {
    return (
      <StatePanel
        errorMessage={errorMessage}
        hasError={hasError}
        onRetry={onRetry}
        selectedRoleId={selectedRoleId}
      />
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand ring-1 ring-inset ring-brand/10">
            <Layers3 className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-bold text-slate-950">
                Permission matrix
              </h2>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                {pages.length} pages
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {isSuperAdmin ? "Effective access for " : "Editing permissions for "}
              <span className="font-semibold text-slate-700">
                {selectedRoleName || "the selected role"}
              </span>
              {isSuperAdmin ? " · SuperAdmin always has full access" : ""}
            </p>
          </div>
        </div>

        <div className="w-full lg:max-w-64">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="font-medium text-slate-500">Access coverage</span>
            <span className="font-semibold tabular-nums text-slate-700">
              {enabledCount}/{totalCount} · {coverage}%
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-brand transition-[width] duration-300"
              style={{ width: String(coverage) + "%" }}
            />
          </div>
        </div>
      </div>

      <div className="border-y border-slate-200 bg-slate-50/70 px-4 py-3">
        <div className="grid gap-3 lg:grid-cols-[minmax(170px,220px)_minmax(0,1fr)] lg:items-center">
          <div className="relative min-w-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Find a page or route..."
              aria-label="Search permission pages"
              className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-8 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/15"
            />
            {searchQuery && (
              <button
                type="button"
                aria-label="Clear permission search"
                onClick={() => setSearchQuery("")}
                className="absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex min-w-0 flex-wrap items-center gap-1 lg:justify-end">
            <span className="mr-1 inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              <SlidersHorizontal className="h-3 w-3" />
              Bulk
            </span>
            <BulkButton
              active={isAllSelected}
              disabled={isDisabled}
              icon={CheckSquare2}
              label="All"
              onClick={onToggleAll}
            />
            {permissionColumns.map((column) => (
              <BulkButton
                key={column.key}
                active={isColumnSelected(column.key)}
                disabled={isDisabled}
                icon={bulkIcons[column.key]}
                label={column.label}
                onClick={() => onToggleColumn(column.key)}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="max-h-[calc(100dvh-350px)] min-h-72 overflow-auto">
        <table className="w-full min-w-[760px] table-fixed border-separate border-spacing-0 text-left">
          <colgroup>
            <col className="w-[280px]" />
            {permissionColumns.map((column) => (
              <col key={column.key} className="w-[80px]" />
            ))}
          </colgroup>
          <thead className="sticky top-0 z-20 bg-slate-50">
            <tr>
              <th className="sticky left-0 z-30 border-b border-r border-slate-200 bg-slate-50 px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                <div className="flex items-center justify-between gap-3">
                  <span>Page &amp; module</span>
                  <span className="normal-case tracking-normal text-slate-400">
                    {filteredPages.length} shown
                  </span>
                </div>
              </th>
              {permissionColumns.map((column) => (
                <th
                  key={column.key}
                  className="border-b border-slate-200 px-2 py-2.5 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-500"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <TableSkeleton />
            ) : filteredPages.length === 0 ? (
              <EmptySearchRow query={searchQuery} />
            ) : (
              filteredPages.map((page) => (
                <PermissionRow
                  key={page.id}
                  isDisabled={isDisabled}
                  onToggleCell={onToggleCell}
                  page={page}
                  row={matrix[String(page.id)]}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-2 border-t border-slate-200 bg-slate-50/70 px-4 py-2.5 text-[11px] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <p>
          Showing <span className="font-semibold text-slate-700">{filteredPages.length}</span> of{" "}
          <span className="font-semibold text-slate-700">{pages.length}</span> pages
        </p>
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-brand" /> Enabled
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm border border-slate-300 bg-white" /> Not granted
          </span>
        </div>
      </div>
    </section>
  );
};

export default memo(PermissionsTable);
