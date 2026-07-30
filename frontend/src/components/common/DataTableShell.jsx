import clsx from "clsx";
import { PackageSearch } from "lucide-react";
import { Children, isValidElement } from "react";
import { twMerge } from "tailwind-merge";

import { enhanceTableHeaders } from "../../utils/tableAccessibility";
import EmptyState from "./EmptyState";
import { MobileRecordCardSkeleton } from "./MobileRecordCard";
import { buildMobileCards } from "./mobileTableCards";

export const DATA_TABLE_HEADER_CLASS =
  "whitespace-nowrap border-b border-slate-200 px-4 py-3.5 text-left text-[11px] font-medium uppercase tracking-wide text-slate-500";

export const DATA_TABLE_CELL_CLASS =
  "border-b border-slate-100 px-4 py-3.5 text-slate-700";

export const DATA_TABLE_ROW_ACTION_CLASS =
  "inline-flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 transition-all hover:bg-slate-100 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 disabled:cursor-not-allowed disabled:opacity-40 md:h-8 md:w-8";

export const DATA_TABLE_ROW_ACTION_DANGER_CLASS =
  "inline-flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 transition-all hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 disabled:cursor-not-allowed disabled:opacity-40 md:h-8 md:w-8";

const countRows = (nodes) => {
  return Children.toArray(nodes).reduce((count, node) => {
    if (!isValidElement(node)) {
      return count;
    }

    if (node.type === "tr") {
      return count + 1;
    }

    return count + countRows(node.props.children);
  }, 0);
};

const DataTableShell = ({
  children,
  className = "",
  colGroup,
  columnCount,
  emptyAction,
  emptyContext,
  emptyHint,
  emptyIcon: EmptyIcon = PackageSearch,
  emptyTitle,
  emptyVariant = "empty",
  head,
  headClassName = "",
  loading = false,
  mobileCards,
  mobileConfig,
  minWidth = "min-w-[760px]",
  rows = 5,
  scrollerClassName = "",
  resultCount,
  tableLabel,
}) => {
  const isEmpty = !loading && Boolean(emptyTitle);
  const resolvedMobileCards =
    mobileCards ?? buildMobileCards({ children, config: mobileConfig, head });
  const resolvedTableLabel =
    tableLabel ??
    (typeof emptyContext === "string" ? emptyContext : null) ??
    (typeof emptyTitle === "string" ? emptyTitle : null) ??
    "Records";
  const visibleResultCount =
    resultCount ?? (isEmpty ? 0 : countRows(children));

  return (
    <div className="md:overflow-hidden md:rounded-xl md:border md:border-slate-200 md:bg-white md:shadow-sm">
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {loading
          ? `Loading ${resolvedTableLabel.toLocaleLowerCase()}`
          : `${visibleResultCount} ${visibleResultCount === 1 ? "result" : "results"}`}
      </p>
      <div className="grid gap-3 md:hidden">
        {loading ? (
          Array.from({ length: rows }, (_, index) => (
            <MobileRecordCardSkeleton key={index} />
          ))
        ) : isEmpty ? (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <EmptyState
              action={emptyAction}
              context={emptyContext}
              hint={emptyHint}
              icon={EmptyIcon}
              title={emptyTitle}
              variant={emptyVariant}
            />
          </div>
        ) : (
          resolvedMobileCards
        )}
      </div>

      <div
        role="region"
        aria-label={`${resolvedTableLabel} table view`}
        tabIndex={0}
        className={twMerge(
          clsx("hidden overflow-x-auto md:block"),
          scrollerClassName,
        )}
      >
        <table
          aria-label={resolvedTableLabel}
          className={twMerge(
            clsx(
              "w-full table-fixed text-sm",
              minWidth,
              "[&_th]:whitespace-nowrap [&_th]:border-b [&_th]:border-slate-200 [&_th]:px-4 [&_th]:py-3.5 [&_th]:text-left [&_th]:text-[11px] [&_th]:font-medium [&_th]:uppercase [&_th]:tracking-wide [&_th]:text-slate-500",
              "[&_td]:border-b [&_td]:border-slate-100 [&_td]:px-4 [&_td]:py-3.5 [&_td]:text-slate-700",
              "[&_tbody_tr]:transition-colors [&_tbody_tr]:hover:bg-slate-50",
            ),
            className,
          )}
        >
          {colGroup}
          {head ? (
            <thead
              className={twMerge(clsx("bg-slate-50"), headClassName)}
            >
              <tr>{enhanceTableHeaders(head)}</tr>
            </thead>
          ) : null}
          <tbody>
            {loading
              ? Array.from({ length: rows }, (_, index) => (
                  <tr key={index}>
                    <td colSpan={columnCount} className="px-4 py-3.5">
                      <div className="h-4 animate-pulse rounded bg-slate-100" />
                    </td>
                  </tr>
                ))
              : isEmpty
                ? (
                    <tr>
                      <td colSpan={columnCount} className="p-0">
                        <EmptyState
                          action={emptyAction}
                          context={emptyContext}
                          hint={emptyHint}
                          icon={EmptyIcon}
                          title={emptyTitle}
                          variant={emptyVariant}
                        />
                      </td>
                    </tr>
                  )
                : children}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DataTableShell;
