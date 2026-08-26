import { PackageSearch } from "lucide-react";

export const DATA_TABLE_HEADER_CLASS =
  "whitespace-nowrap border-b border-slate-200 px-4 py-3.5 text-left text-[11px] font-medium uppercase tracking-wide text-slate-500";

export const DATA_TABLE_CELL_CLASS =
  "border-b border-slate-100 px-4 py-3.5 text-slate-700";

export const DATA_TABLE_ROW_ACTION_CLASS =
  "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-slate-400 transition-all hover:border-brand/10 hover:bg-brand-light hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 disabled:cursor-not-allowed disabled:opacity-40";

export const DATA_TABLE_ROW_ACTION_DANGER_CLASS =
  "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-slate-400 transition-all hover:border-red-100 hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 disabled:cursor-not-allowed disabled:opacity-40";

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
    <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_12px_36px_-24px_rgba(15,23,42,0.4)] ring-1 ring-slate-950/[0.02]">
      <div className={`overflow-x-auto ${scrollerClassName}`}>
        <table
          className={[
            "w-full table-fixed text-sm",
            minWidth,
            "[&_th]:whitespace-nowrap [&_th]:border-b [&_th]:border-slate-200 [&_th]:px-4 [&_th]:py-3.5 [&_th]:text-left [&_th]:text-[11px] [&_th]:font-medium [&_th]:uppercase [&_th]:tracking-wide [&_th]:text-slate-500",
            "[&_td]:border-b [&_td]:border-slate-100 [&_td]:px-4 [&_td]:py-3.5 [&_td]:text-slate-700",
            "[&_tbody_tr]:transition-colors [&_tbody_tr]:hover:bg-brand-light/25",
            className,
          ].join(" ")}
        >
          {colGroup}
          {head ? (
            <thead className={`bg-slate-50/80 ${headClassName}`}>
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
                        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-light text-brand">
                          <EmptyIcon className="h-6 w-6" />
                        </span>
                        <p className="mt-3 text-sm font-medium text-slate-900">
                          {emptyTitle}
                        </p>
                        {emptyHint ? (
                          <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-slate-500">
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
