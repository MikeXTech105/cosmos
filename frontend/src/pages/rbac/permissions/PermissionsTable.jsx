import {
  BadgeCheck,
  CheckSquare2,
  Download,
  Eye,
  FileLock2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { createElement, memo } from "react";

import EmptyState from "../../../components/common/EmptyState";
import MobileRecordCard, {
  MobileRecordCardSkeleton,
} from "../../../components/common/MobileRecordCard";
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

const depthPadding = [
  "pl-0",
  "pl-4",
  "pl-8",
  "pl-12",
  "pl-16",
  "pl-20",
];

const PermissionCheckbox = memo(({ checked, disabled, label, onChange }) => {
  return (
    <label
      className={[
        "group inline-flex h-11 w-11 items-center justify-center rounded-xl transition-colors focus-within:ring-2 focus-within:ring-brand/20 md:h-9 md:w-9",
        disabled
          ? "cursor-not-allowed opacity-50"
          : "cursor-pointer hover:bg-slate-100",
      ].join(" ")}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        title={disabled ? `${label} cannot be changed in the current state` : undefined}
        onChange={(event) => onChange(event.target.checked)}
        aria-label={label}
        className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-brand"
      />
    </label>
  );
});

PermissionCheckbox.displayName = "PermissionCheckbox";

const BulkButton = memo(({ active, disabled, icon, label, onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      disabled={disabled}
      title={disabled ? "This permission cannot be changed in the current state" : undefined}
      className={[
        "inline-flex h-9 items-center justify-center gap-2 rounded-lg border px-3 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/20 disabled:cursor-not-allowed disabled:opacity-50",
        active
          ? "border-brand/15 bg-brand-light text-brand"
          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900",
      ].join(" ")}
    >
      {createElement(icon, {
        "aria-hidden": true,
        className: "h-3.5 w-3.5",
      })}
      {label}
    </button>
  );
});

BulkButton.displayName = "BulkButton";

const TableSkeleton = () => {
  return Array.from({ length: 5 }, (_, index) => (
    <tr key={index}>
      <td colSpan={7} className="px-4 py-3">
        <div className="h-4 animate-pulse rounded bg-slate-100" />
      </td>
    </tr>
  ));
};

const StatePanel = ({ errorMessage, hasError, onRetry, selectedRoleId }) => {
  const title = hasError
    ? "Couldn't load permission matrix"
    : selectedRoleId
      ? "No pages yet"
      : "Select a role to begin";
  const description = hasError
    ? errorMessage ?? "Something went wrong while loading permissions."
    : selectedRoleId
      ? "Create page records before assigning role permissions."
      : "Choose a role above to review and manage its page access.";

  return (
    <EmptyState
      context={
        selectedRoleId
          ? "The permission matrix maps roles to pages and allowed actions."
          : undefined
      }
      hint={description}
      icon={FileLock2}
      title={title}
      variant={hasError ? "error" : "empty"}
      onAction={hasError ? onRetry : undefined}
    />
  );
};

const PermissionRow = memo(({ isDisabled, onToggleCell, page, row }) => {
  return (
    <tr className="group transition-colors hover:bg-slate-50 focus-within:bg-slate-50">
      <td className="sticky left-0 z-10 border-b border-r border-slate-100 bg-white px-4 py-3 group-hover:bg-slate-50">
        <div
          className={[
            "flex min-w-0 items-center gap-3",
            depthPadding[Math.min(page.depth, depthPadding.length - 1)],
          ].join(" ")}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand">
            {createElement(getIconComponent(page.icon), {
              "aria-hidden": true,
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
            checked={Boolean(row?.[column.key])}
            disabled={isDisabled}
            label={`${column.label} permission for ${page.displayName}`}
            onChange={(checked) => onToggleCell(page.id, column.key, checked)}
          />
        </td>
      ))}
    </tr>
  );
});

PermissionRow.displayName = "PermissionRow";

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
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
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
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-4 py-4">
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

      <div className="grid gap-3 p-3 md:hidden">
        {isLoading
          ? Array.from({ length: 5 }, (_, index) => (
              <MobileRecordCardSkeleton key={index} fields={1} />
            ))
          : pages.map((page, index) => {
              const row = matrix[String(page.id)];
              const enabledForPage = permissionColumns.filter((column) =>
                Boolean(row?.[column.key]),
              ).length;

              return (
                <MobileRecordCard
                  key={page.id}
                  serial={index + 1}
                  title={page.displayName}
                  subtitle={page.hierarchyPath || page.route || page.name}
                  fields={[
                    {
                      key: "enabled",
                      label: "Enabled permissions",
                      value: `${enabledForPage} of ${permissionColumns.length}`,
                    },
                  ]}
                  footer={
                    <div className="grid grid-cols-3 gap-2">
                      {permissionColumns.map((column) => (
                        <div
                          key={column.key}
                          className="flex min-w-0 flex-col items-center gap-1 text-center"
                        >
                          <PermissionCheckbox
                            checked={Boolean(row?.[column.key])}
                            disabled={isDisabled}
                            label={`${column.label} permission for ${page.displayName}`}
                            onChange={(checked) =>
                              onToggleCell(page.id, column.key, checked)
                            }
                          />
                          <span className="text-[11px] text-slate-500">
                            {column.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  }
                />
              );
            })}
      </div>

      <div className="hidden max-h-[calc(100dvh-360px)] min-h-72 overflow-auto md:block">
        <table aria-label="Role permission matrix" className="min-w-[900px] w-full border-separate border-spacing-0 text-left">
          <thead className="sticky top-0 z-20 bg-slate-50">
            <tr>
              <th scope="col" className="sticky left-0 z-30 min-w-[280px] border-b border-r border-slate-200 bg-slate-50 px-4 py-3.5 text-xs font-medium uppercase tracking-wide text-slate-500">
                Page
              </th>
              {permissionColumns.map((column) => (
                <th scope="col" aria-label={column.label === "#" ? "Row number" : undefined}
                  key={column.key}
                  className="w-[104px] whitespace-nowrap border-b border-slate-200 px-3 py-3.5 text-center text-xs font-medium uppercase tracking-wide text-slate-500"
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
    </section>
  );
};

export default memo(PermissionsTable);
