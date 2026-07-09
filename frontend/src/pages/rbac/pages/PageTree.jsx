import { ChevronDown, ChevronRight, FolderTree, Plus } from "lucide-react";
import { createElement, memo, useMemo } from "react";

import { getIconComponent } from "../../../config/iconMap";
import { buildPageTree, collectTreeIds } from "./pageHelpers";
import PageActions from "./PageActions";
import { PageStatusBadge } from "./PageTable";

const TreeEmptyState = ({ errorMessage, hasError, onCreate, onRetry }) => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-light text-brand">
        <FolderTree className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-base font-bold text-slate-950">
        {hasError ? "Unable to load pages" : "No tree nodes found"}
      </h3>
      <p className="mt-1 text-sm leading-6 text-slate-500">
        {hasError
          ? errorMessage ?? "Something went wrong while loading pages."
          : "Create pages or adjust the filters to view the hierarchy."}
      </p>
      <button
        type="button"
        onClick={hasError ? onRetry : onCreate}
        className={[
          "mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold shadow-sm transition-all active:scale-[0.98]",
          hasError
            ? "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            : "bg-brand text-white hover:bg-brand-dark",
        ].join(" ")}
      >
        <Plus className="h-4 w-4" />
        {hasError ? "Retry" : "Create Page"}
      </button>
    </div>
  );
};

const TreeSkeleton = () => {
  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      {Array.from({ length: 5 }, (_, index) => (
        <div
          key={index}
          className="h-14 animate-pulse rounded-xl bg-slate-100"
        />
      ))}
    </div>
  );
};

const TreeNode = ({
  actions,
  expandedIds,
  node,
  onToggle,
}) => {
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedIds[String(node.id)] ?? true;
  const depth = Math.min(node.depth ?? 0, 6);

  return (
    <div>
      <div
        className={[
          "flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm",
          node.isSynthetic ? "border-dashed bg-slate-50" : "",
        ].join(" ")}
        style={{ marginLeft: `${depth * 20}px` }}
      >
        <button
          type="button"
          disabled={!hasChildren}
          onClick={() => onToggle(node.id)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 disabled:opacity-30"
          aria-label={isExpanded ? "Collapse page" : "Expand page"}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )
          ) : (
            <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
          )}
        </button>

        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand ring-1 ring-inset ring-brand/10">
          {createElement(getIconComponent(node.icon), { className: "h-5 w-5" })}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <p className="truncate text-sm font-bold text-slate-950">
              {node.displayName}
            </p>
            <PageStatusBadge isActive={node.isActive} />
          </div>
          <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
            <span className="font-mono">{node.route || "No route"}</span>
            <span className="font-mono">{node.name}</span>
            <span>Sort {node.sortOrder}</span>
            {hasChildren && (
              <span>
                {node.children.length} child page
                {node.children.length === 1 ? "" : "s"}
              </span>
            )}
          </div>
        </div>

        {!node.isSynthetic && <PageActions page={node} {...actions} />}
      </div>

      {hasChildren && isExpanded && (
        <div className="mt-2 space-y-2">
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              actions={actions}
              expandedIds={expandedIds}
              node={child}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const PageTree = ({
  actions,
  errorMessage,
  expandedTreeIds,
  hasError,
  isLoading,
  onCreate,
  onExpandTree,
  onRetry,
  onToggleTreeNode,
  pages,
}) => {
  const tree = useMemo(() => buildPageTree(pages), [pages]);
  const allNodeIds = useMemo(() => collectTreeIds(tree), [tree]);

  if (isLoading) {
    return <TreeSkeleton />;
  }

  if (hasError || pages.length === 0) {
    return (
      <TreeEmptyState
        errorMessage={errorMessage}
        hasError={hasError}
        onCreate={onCreate}
        onRetry={onRetry}
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end gap-2">
        <button
          type="button"
          className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
          onClick={() => onExpandTree({ expanded: true, ids: allNodeIds })}
        >
          Expand all
        </button>
        <button
          type="button"
          className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
          onClick={() => onExpandTree({ expanded: false, ids: allNodeIds })}
        >
          Collapse all
        </button>
      </div>

      <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 shadow-sm">
        {tree.map((node) => (
          <TreeNode
            key={node.id}
            actions={actions}
            expandedIds={expandedTreeIds}
            node={node}
            onToggle={onToggleTreeNode}
          />
        ))}
      </div>
    </div>
  );
};

export default memo(PageTree);
