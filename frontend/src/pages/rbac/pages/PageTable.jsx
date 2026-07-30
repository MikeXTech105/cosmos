import {
  ChevronDown,
  ChevronRight,
  FolderTree,
} from "lucide-react";
import { createElement, memo, useMemo } from "react";

import CommonEmptyState from "../../../components/common/EmptyState";
import MobileRecordCard, {
  MobileRecordCardSkeleton,
} from "../../../components/common/MobileRecordCard";
import { getIconComponent } from "../../../config/iconMap";
import { PAGE_TABLE_COLUMNS } from "./pageColumns";
import { buildPageTree, collectTreeIds } from "./pageHelpers";
import PageActions from "./PageActions";

const statusStyles = {
  active: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  inactive: "bg-red-50 text-red-700 ring-red-200",
};

export const PageStatusBadge = ({ isActive }) => {
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

export const IconPreview = ({ iconName }) => {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand ring-1 ring-inset ring-brand/10">
        {createElement(getIconComponent(iconName), {
          "aria-hidden": true,
          className: "h-4 w-4",
        })}
      </span>
      <span className="truncate text-xs font-medium text-slate-500">
        {iconName || "pages"}
      </span>
    </div>
  );
};

const TableSkeleton = () => {
  return Array.from({ length: 5 }, (_, index) => (
    <tr key={index}>
      <td colSpan={7} className="px-4 py-3.5">
        <div className="h-4 animate-pulse rounded bg-slate-100" />
      </td>
    </tr>
  ));
};

const PageEmptyState = ({
  activeFilterCount,
  errorMessage,
  hasError,
  onClear,
  onCreate,
  onRetry,
}) => {
  const variant = hasError
    ? "error"
    : activeFilterCount > 0
      ? "filtered"
      : "empty";

  return (
    <CommonEmptyState
      actionLabel={variant === "empty" ? "Create Page" : undefined}
      context={
        variant === "empty"
          ? "Page records define the application surfaces available to roles."
          : undefined
      }
      hint={
        hasError
          ? errorMessage ?? "The page list could not be checked."
          : variant === "filtered"
            ? "Clear the current filters to see all page records."
            : "Create the first page record to build the permission tree."
      }
      icon={FolderTree}
      title={
        hasError
          ? "Couldn't load pages"
          : variant === "filtered"
            ? "No pages match these filters"
            : "No pages yet"
      }
      variant={variant}
      onAction={
        hasError
          ? onRetry
          : variant === "filtered"
            ? onClear
            : onCreate
      }
    />
  );
};

const MobilePageCard = ({ actions, page, parentName, serialNumber }) => {
  return (
    <MobileRecordCard
      serial={serialNumber}
      title={page.displayName}
      subtitle={page.route || "No route"}
      status={<PageStatusBadge isActive={page.isActive} />}
      fields={[
        { key: "name", label: "Internal name", value: page.name },
        {
          key: "icon",
          label: "Icon",
          value: <IconPreview iconName={page.icon} />,
        },
        { key: "parent", label: "Parent", value: parentName },
        { key: "sort", label: "Sort order", value: page.sortOrder },
      ]}
      actions={<PageActions page={page} {...actions} />}
    />
  );
};

const getParentName = (page, parentLookup) => {
  return page.parentPageId
    ? parentLookup.get(String(page.parentPageId))?.displayName ?? "Ungrouped"
    : "Top-level";
};

const flattenVisibleNodes = (nodes, expandedIds, parentLookup) => {
  return nodes.flatMap((node) => {
    const hasChildren = node.children.length > 0;
    const isExpanded = expandedIds[String(node.id)] ?? true;
    const self = {
      node,
      parentName: getParentName(node, parentLookup),
    };

    if (!hasChildren || !isExpanded) {
      return [self];
    }

    return [
      self,
      ...flattenVisibleNodes(node.children, expandedIds, parentLookup),
    ];
  });
};

const GroupHeaderRow = ({
  actions,
  isExpanded,
  node,
  onToggle,
}) => {
  return (
    <tr className="bg-slate-50">
      <td colSpan={6} className="border-b border-slate-200 px-4 py-3">
        <button
          type="button"
          onClick={() => onToggle(node.id)}
          className="flex min-w-0 items-center gap-2 text-left"
        >
          {isExpanded ? (
            <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-500" />
          ) : (
            <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-500" />
          )}
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand">
            {createElement(getIconComponent(node.icon), {
              "aria-hidden": true,
              className: "h-4 w-4",
            })}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold text-slate-950">
              {node.displayName}
            </span>
            <span className="mt-0.5 block truncate text-xs text-slate-500">
              {node.children.length} child page{node.children.length === 1 ? "" : "s"}
            </span>
          </span>
        </button>
      </td>
      <td className="border-b border-slate-200 px-3 py-3">
        {!node.isSynthetic && <PageActions page={node} {...actions} />}
      </td>
    </tr>
  );
};

const PageRow = ({ actions, node, parentLookup }) => {
  const depth = Math.min(node.depth ?? 0, 5);
  const indent = `${depth * 22}px`;

  return (
    <tr className="group transition-colors hover:bg-slate-50 focus-within:bg-slate-50">
      <td className="border-b border-slate-100 px-3 py-3.5">
        <div className="flex min-w-0 items-center gap-2" style={{ paddingLeft: indent }}>
          {depth > 0 && (
            <span className="h-6 w-4 shrink-0 rounded-bl-xl border-b border-l border-slate-200" />
          )}
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand ring-1 ring-inset ring-brand/10">
            {createElement(getIconComponent(node.icon), {
              "aria-hidden": true,
              className: "h-4 w-4",
            })}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-slate-950">
              {node.displayName}
            </span>
            <span className="mt-0.5 block truncate text-xs text-slate-500">
              {getParentName(node, parentLookup)}
            </span>
          </span>
        </div>
      </td>
      <td className="border-b border-slate-100 px-3 py-3.5">
        <p className="truncate font-mono text-xs text-slate-500">{node.name}</p>
      </td>
      <td className="border-b border-slate-100 px-3 py-3.5">
        <p className="truncate font-mono text-xs text-slate-600">
          {node.route || "-"}
        </p>
      </td>
      <td className="border-b border-slate-100 px-3 py-3.5">
        <IconPreview iconName={node.icon} />
      </td>
      <td className="border-b border-slate-100 px-2 py-3.5 text-center text-sm font-semibold tabular-nums text-slate-500">
        {node.sortOrder}
      </td>
      <td className="border-b border-slate-100 px-3 py-3.5">
        <PageStatusBadge isActive={node.isActive} />
      </td>
      <td className="border-b border-slate-100 px-3 py-3.5">
        <PageActions page={node} {...actions} />
      </td>
    </tr>
  );
};

const renderRows = ({
  actions,
  expandedGroupIds,
  nodes,
  onToggleGroup,
  parentLookup,
}) => {
  return nodes.flatMap((node) => {
    const hasChildren = node.children.length > 0;
    const isExpanded = expandedGroupIds[String(node.id)] ?? true;

    if (!hasChildren) {
      return [
        <PageRow
          key={node.id}
          actions={actions}
          node={node}
          parentLookup={parentLookup}
        />,
      ];
    }

    return [
      <GroupHeaderRow
        key={`${node.id}-group`}
        actions={actions}
        isExpanded={isExpanded}
        node={node}
        onToggle={onToggleGroup}
      />,
      ...(isExpanded
        ? node.children.flatMap((child) =>
            child.children.length > 0
              ? renderRows({
                  actions,
                  expandedGroupIds,
                  nodes: [child],
                  onToggleGroup,
                  parentLookup,
                })
              : [
                  <PageRow
                    key={child.id}
                    actions={actions}
                    node={child}
                    parentLookup={parentLookup}
                  />,
                ],
          )
        : []),
    ];
  });
};

const PageTable = ({
  activeFilterCount = 0,
  actions,
  errorMessage,
  expandedGroupIds,
  hasError,
  isLoading,
  onClear,
  onCreate,
  onExpandAllGroups,
  onRetry,
  onToggleGroup,
  pages,
  parentLookup,
}) => {
  const tree = useMemo(() => buildPageTree(pages), [pages]);
  const visibleMobileNodes = useMemo(
    () => flattenVisibleNodes(tree, expandedGroupIds, parentLookup),
    [expandedGroupIds, parentLookup, tree],
  );
  const allGroupIds = useMemo(
    () =>
      collectTreeIds(tree.filter((node) => node.children.length > 0)).filter(
        (id) => id !== "__ungrouped__",
      ),
    [tree],
  );

  if (!isLoading && (hasError || pages.length === 0)) {
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <PageEmptyState
          activeFilterCount={activeFilterCount}
          errorMessage={errorMessage}
          hasError={hasError}
          onClear={onClear}
          onCreate={onCreate}
          onRetry={onRetry}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end gap-2">
        <button
          type="button"
          className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
          onClick={() =>
            onExpandAllGroups({ expanded: true, ids: allGroupIds })
          }
        >
          Expand all
        </button>
        <button
          type="button"
          className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
          onClick={() =>
            onExpandAllGroups({ expanded: false, ids: allGroupIds })
          }
        >
          Collapse all
        </button>
      </div>

      <div className="grid gap-3 md:hidden">
        {isLoading
          ? Array.from({ length: 5 }, (_, index) => (
              <MobileRecordCardSkeleton key={index} />
            ))
          : visibleMobileNodes.map(({ node, parentName }, index) => (
              <MobilePageCard
                key={node.id}
                actions={actions}
                page={node}
                parentName={parentName}
                serialNumber={index + 1}
              />
            ))}
      </div>

      <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
        <table aria-label="Application pages" className="w-full table-fixed border-separate border-spacing-0 text-left">
          <colgroup>
            <col className="w-[26%]" />
            <col className="w-[14%]" />
            <col className="w-[18%]" />
            <col className="w-[16%]" />
            <col className="w-[76px]" />
            <col className="w-[10%]" />
            <col className="w-[148px]" />
          </colgroup>
          <thead className="sticky top-0 z-10 bg-slate-50">
            <tr>
              {PAGE_TABLE_COLUMNS.map((column) => (
                <th scope="col" aria-label={column.label === "#" ? "Row number" : undefined}
                  key={column.key}
                  className={[
                    "whitespace-nowrap border-b border-slate-200 px-3 py-3.5 text-xs font-medium uppercase tracking-wide text-slate-500",
                    column.align === "center" ? "text-center" : "",
                    column.align === "right" ? "text-right" : "",
                  ].join(" ")}
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
              renderRows({
                actions,
                expandedGroupIds,
                nodes: tree,
                onToggleGroup,
                parentLookup,
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default memo(PageTable);
