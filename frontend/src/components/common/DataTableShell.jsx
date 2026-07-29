import clsx from "clsx";
import { PackageSearch } from "lucide-react";
import { twMerge } from "tailwind-merge";

export const DATA_TABLE_HEADER_CLASS =
  "whitespace-nowrap border-b border-slate-200 px-4 py-3.5 text-left text-[11px] font-medium uppercase tracking-wide text-slate-500";

export const DATA_TABLE_CELL_CLASS =
  "border-b border-slate-100 px-4 py-3.5 text-slate-700";

export const DATA_TABLE_ROW_ACTION_CLASS =
  "inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-all hover:bg-slate-100 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 disabled:cursor-not-allowed disabled:opacity-40";

export const DATA_TABLE_ROW_ACTION_DANGER_CLASS =
  "inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-all hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 disabled:cursor-not-allowed disabled:opacity-40";

const DataTableShell = ({
  children,
  className = "",
  colGroup,
  columnCount,
  emptyAction,
  emptyHint,
  emptyIcon: EmptyIcon = PackageSearch,
  emptyTitle,
  head,
  headClassName = "",
  loading = false,
  minWidth = "min-w-[760px]",
  rows = 5,
  scrollerClassName = "",
}) => {
  const isEmpty = !loading && Boolean(emptyTitle);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div
        className={twMerge(
          clsx("overflow-x-auto"),
          scrollerClassName,
        )}
      >
        <table
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
              <tr>{head}</tr>
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
                      <td colSpan={columnCount} className="py-12 text-center">
                        <EmptyIcon className="mx-auto h-8 w-8 text-slate-300" />
                        <p className="mt-3 text-sm font-medium text-slate-900">
                          {emptyTitle}
                        </p>
                        {emptyHint ? (
                          <p className="mt-1 text-xs text-slate-500">
                            {emptyHint}
                          </p>
                        ) : null}
                        {emptyAction ? (
                          <div className="mt-4">{emptyAction}</div>
                        ) : null}
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
