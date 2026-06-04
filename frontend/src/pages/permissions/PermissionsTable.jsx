import {
  BadgeCheck,
  CheckSquare2,
  Download,
  Eye,
  FileLock2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { createElement } from "react";

import { getIconComponent } from "../../config/iconMap";
import { permissionColumns } from "./permissionsColumns";

const bulkIcons = {
  canApprove: BadgeCheck,
  canCreate: Plus,
  canDelete: Trash2,
  canEdit: Pencil,
  canExport: Download,
  canView: Eye,
};

const PermissionCheckbox = ({ checked, disabled, label, onChange }) => {
  return (
    <label
      className={[
        "group inline-flex h-9 w-9 items-center justify-center rounded-xl transition-colors focus-within:ring-2 focus-within:ring-brand/20",
        disabled
          ? "cursor-not-allowed opacity-50"
          : "cursor-pointer hover:bg-brand-light/60",
      ].join(" ")}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        aria-label={label}
        className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-[#4F46E5]"
      />
    </label>
  );
};

const BulkButton = ({ active, disabled, icon, label, onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      disabled={disabled}
      className={[
        "inline-flex h-9 items-center justify-center gap-2 rounded-xl border px-3 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/20 disabled:cursor-not-allowed disabled:opacity-50",
        active
          ? "border-brand/15 bg-brand-light text-brand"
          : "border-slate-200 glass text-slate-600 hover:bg-white hover:text-slate-900",
      ].join(" ")}
    >
      {createElement(icon, { className: "h-3.5 w-3.5" })}
      {label}
    </button>
  );
};

const TableSkeleton = () => {
  return Array.from({ length: 7 }, (_, index) => (
    <tr key={index}>
      <td colSpan={7} className="px-4 py-3">
        <div className="h-11 animate-pulse rounded-xl bg-slate-100" />
      </td>
    </tr>
  ));
};

const StatePanel = ({ errorMessage, hasError, onRetry, selectedRoleId }) => {
  const title = hasError
    ? "Unable to load permission matrix"
    : selectedRoleId
      ? "No pages available"
      : "Select a role to begin";
  const description = hasError
    ? errorMessage ?? "Something went wrong while loading permissions."
    : selectedRoleId
      ? "Create page records before assigning role permissions."
      : "Choose a role above to review and manage its page access.";

  return (
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
          className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </button>
      )}
    </div>
  );
};

const PermissionsTable = ({
  enabledCount,
  errorMessage,
  isAllSelected,
  isColumnSelected,
  isDisabled,
  isLoading,
  matrix,
  onRetry,
  onToggleAll,
  onToggleCell,
  onToggleColumn,
  pages,
  selectedRoleId,
  totalCount,
}) => {
  const hasError = Boolean(errorMessage);

  if (!isLoading && (hasError || !selectedRoleId || pages.length === 0)) {
    return (
      <section className="overflow-hidden rounded-2xl glass-card">
        <StatePanel
          errorMessage={errorMessage}
          hasError={hasError}
          onRetry={onRetry}
          selectedRoleId={selectedRoleId}
        />
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl glass-card">
      <div className="border-b border-slate-100/70 px-4 py-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-950">
              Permission matrix
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {enabledCount} of {totalCount} permissions enabled
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <BulkButton
              active={isAllSelected}
              disabled={isDisabled}
              icon={CheckSquare2}
              label="Select All"
              onClick={onToggleAll}
            />
            {permissionColumns.map((column) => (
              <BulkButton
                key={column.key}
                active={isColumnSelected(column.key)}
                disabled={isDisabled}
                icon={bulkIcons[column.key]}
                label={column.bulkLabel}
                onClick={() => onToggleColumn(column.key)}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="max-h-[calc(100dvh-360px)] min-h-72 overflow-auto">
        <table className="min-w-[900px] w-full border-separate border-spacing-0 text-left">
          <thead className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-sm">
            <tr>
              <th className="sticky left-0 z-30 min-w-[280px] border-b border-r border-slate-200 bg-slate-50/95 px-4 py-3.5 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">
                Page
              </th>
              {permissionColumns.map((column) => (
                <th
                  key={column.key}
                  className="w-[104px] whitespace-nowrap border-b border-slate-200 px-3 py-3.5 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <TableSkeleton />
            ) : (
              pages.map((page) => (
                <tr
                  key={page.id}
                  className="group transition-colors hover:bg-indigo-50/30 focus-within:bg-brand-light/20"
                >
                  <td className="sticky left-0 z-10 border-b border-r border-slate-100 bg-white/95 px-4 py-3 backdrop-blur-sm group-hover:bg-indigo-50/95">
                    <div
                      className="flex min-w-0 items-center gap-3"
                      style={{ paddingLeft: `${page.depth * 18}px` }}
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand">
                        {createElement(getIconComponent(page.icon), {
                          className: "h-4 w-4",
                        })}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-slate-950">
                          {page.displayName}
                        </span>
                        <span className="block truncate text-xs text-slate-500">
                          {page.hierarchyPath || page.route || page.name}
                        </span>
                      </span>
                    </div>
                  </td>
                  {permissionColumns.map((column) => (
                    <td
                      key={column.key}
                      className="border-b border-slate-100 px-3 py-2 text-center"
                    >
                      <PermissionCheckbox
                        checked={Boolean(matrix[String(page.id)]?.[column.key])}
                        disabled={isDisabled}
                        label={`${column.label} permission for ${page.displayName}`}
                        onChange={(checked) =>
                          onToggleCell(page.id, column.key, checked)
                        }
                      />
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default PermissionsTable;
