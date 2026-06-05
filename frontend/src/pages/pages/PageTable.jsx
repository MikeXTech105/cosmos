import { FolderTree, Plus, RefreshCw } from "lucide-react";
import { createElement, memo } from "react";

import { getIconComponent } from "../../config/iconMap";
import PageActions from "./PageActions";

const statusStyles = {
  active: "bg-emerald-50/70 text-emerald-700 ring-emerald-200/70",
  inactive: "bg-red-50/70 text-red-700 ring-red-200/70",
};

const PageStatusBadge = ({ isActive }) => {
  const status = isActive ? "active" : "inactive";

  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset",
        statusStyles[status],
      ].join(" ")}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-75" />
      {isActive ? "Active" : "Inactive"}
    </span>
  );
};

const IconPreview = ({ iconName }) => {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand ring-1 ring-inset ring-brand/10">
        {createElement(getIconComponent(iconName), { className: "h-4 w-4" })}
      </span>
      <span className="truncate text-xs font-medium text-slate-500">
        {iconName || "AppWindow"}
      </span>
    </div>
  );
};

const TableSkeleton = () => {
  return Array.from({ length: 6 }, (_, index) => (
    <tr key={index}>
      <td colSpan={9} className="px-4 py-3.5">
        <div className="h-11 animate-pulse rounded-xl bg-slate-100" />
      </td>
    </tr>
  ));
};

const EmptyState = ({ errorMessage, hasError, onCreate, onRetry }) => {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-light text-brand">
        <FolderTree className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-base font-bold text-slate-950">
        {hasError ? "Unable to load pages" : "No pages found"}
      </h3>
      <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">
        {hasError
          ? errorMessage ?? "Something went wrong while loading pages."
          : "Create a page record or adjust your filters to find one."}
      </p>
      <div className="mt-5">
        {hasError ? (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        ) : (
          <button
            type="button"
            onClick={onCreate}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-dark active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            Create Page
          </button>
        )}
      </div>
    </div>
  );
};

const MobilePageCard = ({ actions, page, parentName, serialNumber }) => {
  return (
    <article className="glass-card rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <span className="shrink-0 text-xs font-semibold tabular-nums text-slate-400">
              #{serialNumber}
            </span>
            <p className="truncate text-sm font-bold text-slate-950">
              {page.displayName}
            </p>
          </div>
          <p className="mt-1 truncate font-mono text-xs text-slate-500">
            {page.route}
          </p>
        </div>
        <PageActions page={page} {...actions} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <IconPreview iconName={page.icon} />
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
            Parent
          </p>
          <p className="mt-1 truncate text-sm font-medium text-slate-700">
            {parentName}
          </p>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <PageStatusBadge isActive={page.isActive} />
        <span className="text-xs font-medium text-slate-500">
          Sort order {page.sortOrder}
        </span>
      </div>
    </article>
  );
};

const PageTable = ({
  actions,
  currentPage = 1,
  errorMessage,
  hasError,
  isLoading,
  onCreate,
  onRetry,
  pageSize = 10,
  pages,
  parentLookup,
}) => {
  if (!isLoading && (hasError || pages.length === 0)) {
    return (
      <div className="overflow-hidden rounded-3xl glass-card shadow-sm">
        <EmptyState
          errorMessage={errorMessage}
          hasError={hasError}
          onCreate={onCreate}
          onRetry={onRetry}
        />
      </div>
    );
  }

  const getParentName = (page) => {
    return page.parentPageId
      ? parentLookup.get(String(page.parentPageId))?.displayName ?? "Unknown"
      : "Root Menu";
  };

  return (
    <div>
      <div className="grid gap-3 xl:hidden">
        {isLoading
          ? Array.from({ length: 4 }, (_, index) => (
              <div
                key={index}
                className="h-48 animate-pulse rounded-2xl bg-slate-100"
              />
            ))
          : pages.map((page, index) => (
              <MobilePageCard
                key={page.id}
                actions={actions}
                page={page}
                parentName={getParentName(page)}
                serialNumber={(currentPage - 1) * pageSize + index + 1}
              />
            ))}
      </div>

      <div className="hidden overflow-hidden rounded-2xl glass-card xl:block">
        <table className="w-full table-fixed border-separate border-spacing-0 text-left">
          <colgroup>
            <col className="w-[50px]" />
            <col className="w-[12%]" />
            <col className="w-[14%]" />
            <col className="w-[16%]" />
            <col className="w-[14%]" />
            <col className="w-[12%]" />
            <col className="w-[76px]" />
            <col className="w-[10%]" />
            <col className="w-[148px]" />
          </colgroup>
          <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-sm">
            <tr>
              {[
                "#",
                "Name",
                "Display Name",
                "Route",
                "Icon",
                "Parent",
                "Sort",
                "Status",
                "Actions",
              ].map((heading) => (
                <th
                  key={heading}
                  className={[
                    "whitespace-nowrap border-b border-slate-200 px-3 py-3.5 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400",
                    heading === "#" || heading === "Sort" ? "text-center" : "",
                    heading === "Actions" ? "text-right" : "",
                  ].join(" ")}
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <TableSkeleton />
            ) : (
              pages.map((page, index) => (
                <tr
                  key={page.id}
                  className="group transition-colors hover:bg-indigo-50/30 focus-within:bg-brand-light/20"
                >
                  <td className="border-b border-slate-100 px-2 py-3.5 text-center text-xs font-semibold tabular-nums text-slate-400">
                    {(currentPage - 1) * pageSize + index + 1}
                  </td>
                  <td className="border-b border-slate-100 px-3 py-3.5">
                    <p className="truncate text-sm font-semibold text-slate-950">
                      {page.name}
                    </p>
                  </td>
                  <td className="border-b border-slate-100 px-3 py-3.5">
                    <p className="truncate text-sm font-medium text-slate-700">
                      {page.displayName}
                    </p>
                  </td>
                  <td className="border-b border-slate-100 px-3 py-3.5">
                    <p className="truncate font-mono text-xs text-slate-600">
                      {page.route}
                    </p>
                  </td>
                  <td className="border-b border-slate-100 px-3 py-3.5">
                    <IconPreview iconName={page.icon} />
                  </td>
                  <td className="border-b border-slate-100 px-3 py-3.5">
                    <p className="truncate text-sm text-slate-600">
                      {getParentName(page)}
                    </p>
                  </td>
                  <td className="border-b border-slate-100 px-2 py-3.5 text-center text-sm font-semibold tabular-nums text-slate-500">
                    {page.sortOrder}
                  </td>
                  <td className="border-b border-slate-100 px-3 py-3.5">
                    <PageStatusBadge isActive={page.isActive} />
                  </td>
                  <td className="border-b border-slate-100 px-3 py-3.5">
                    <PageActions page={page} {...actions} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default memo(PageTable);
