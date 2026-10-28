import {
  ChevronDown,
  ChevronUp,
  FileSearch,
  RefreshCw,
} from "lucide-react";
import { Link } from "react-router-dom";

import AppButton from "../../components/common/AppButton";
import AppSelect from "../../components/common/AppSelect";
import { sumRojmelMoney } from "../../utils/rojmelTotals";
import {
  formatCell,
  getPillMeta,
  getReportValue,
  isNumericColumn,
  toReportNumber,
} from "../../utils/reportFormat";
import { REPORT_PAGE_SIZE_OPTIONS } from "./filters/filterRegistry";

const getSortIcon = (active, direction) => {
  if (!active) {
    return <ChevronDown className="h-3.5 w-3.5 opacity-30" />;
  }

  return direction === "asc" ? (
    <ChevronUp className="h-3.5 w-3.5" />
  ) : (
    <ChevronDown className="h-3.5 w-3.5" />
  );
};

const ReportPagination = ({
  disabled,
  itemCount,
  onPageChange,
  onPageSizeChange,
  pageNumber,
  pageSize,
  totalCount,
  totalPages,
}) => {
  const rangeStart = itemCount ? (pageNumber - 1) * pageSize + 1 : 0;
  const rangeEnd = itemCount ? rangeStart + itemCount - 1 : 0;

  return (
    <div className="flex flex-col gap-3 border-t border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 lg:flex-row lg:items-center lg:justify-between">
      <p>
        Showing <span className="font-semibold text-slate-900">{rangeStart}</span>{" "}
        to <span className="font-semibold text-slate-900">{rangeEnd}</span> of{" "}
        <span className="font-semibold text-slate-900">{totalCount}</span> rows
      </p>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
          <span>Rows</span>
          <AppSelect
            value={pageSize}
            onChange={(value) => onPageSizeChange(Number(value))}
            options={REPORT_PAGE_SIZE_OPTIONS}
            className="w-24"
            aria-label="Rows per page"
          />
        </div>

        <div className="flex items-center gap-2">
          <AppButton
            variant="secondary"
            className="h-9 rounded-lg px-3"
            disabled={disabled || pageNumber <= 1}
            onClick={() => onPageChange(Math.max(1, pageNumber - 1))}
          >
            Previous
          </AppButton>
          <span className="min-w-20 text-center text-xs font-semibold text-slate-500">
            Page {pageNumber} / {Math.max(1, totalPages)}
          </span>
          <AppButton
            variant="secondary"
            className="h-9 rounded-lg px-3"
            disabled={disabled || pageNumber >= Math.max(1, totalPages)}
            onClick={() =>
              onPageChange(Math.min(Math.max(1, totalPages), pageNumber + 1))
            }
          >
            Next
          </AppButton>
        </div>
      </div>
    </div>
  );
};

const ReportTable = ({
  error,
  filters,
  isLoading,
  meta,
  onPageChange,
  onPageSizeChange,
  onRetry,
  onSortChange,
  report,
  rows,
  getCellLink,
  returnTo,
}) => {
  const columns = report.columns ?? [];
  const pageNumber = Number(filters.PageNumber || meta?.pageNumber || 1);
  const pageSize = Number(filters.PageSize || meta?.pageSize || 20);
  const totalCount = Number(meta?.totalCount) || rows.length;
  const totalPages =
    Number(meta?.totalPages) || Math.max(1, Math.ceil(totalCount / pageSize));
  const renderCell = (column, row) => {
    const text = formatCell(getReportValue(row, column.key), column);
    const link = getCellLink?.(column, row);
    return link ? <Link to={link} state={{ fromReport: returnTo }} className="font-medium text-brand hover:underline">{text}</Link> : text;
  };

  if (!isLoading && (error || rows.length === 0)) {
    return (
      <div className="flex min-h-[420px] flex-col items-center justify-center px-6 py-12 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-light text-brand">
          <FileSearch className="h-6 w-6" />
        </div>
        <h3 className="mt-4 text-base font-semibold text-slate-900">
          {error ? "Unable to load report" : "No data for the selected filters"}
        </h3>
        <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">
          {error
            ? error
            : "Adjust the filters or date range, then the report will refresh automatically."}
        </p>
        {error && (
          <AppButton variant="secondary" className="mt-5 h-10" onClick={onRetry}>
            <RefreshCw className="h-4 w-4" />
            Retry
          </AppButton>
        )}
      </div>
    );
  }

  return (
    <div className="flex min-h-[420px] flex-col">
      <div className="space-y-3 p-3 sm:hidden" aria-label="Report records">
        {isLoading ? <p role="status" className="text-sm text-slate-500">Loading report…</p> : rows.map((row, rowIndex) => <article key={row?.id ?? rowIndex} className="rounded-xl border border-slate-200 bg-white p-3"><h3 className="mb-2 text-sm font-semibold text-slate-900">{columns[0] ? renderCell(columns[0], row) : `Record ${rowIndex + 1}`}</h3><dl className="grid grid-cols-2 gap-x-3 gap-y-2">{columns.slice(1).map((column) => <div key={column.key} className="min-w-0"><dt className="text-xs text-slate-500">{column.header ?? column.label}</dt><dd className="break-words text-sm font-medium text-slate-800">{renderCell(column, row)}</dd></div>)}</dl></article>)}
        {report.paginated && <p className="text-xs text-slate-500">Showing this page. Period summaries and page totals are labelled separately.</p>}
      </div>
      <div className="hidden min-h-0 flex-1 overflow-auto sm:block">
        <table className="w-full min-w-[920px] table-fixed text-left">
          <thead className="sticky top-0 z-10 bg-slate-50">
            <tr>
              <th className="border-b border-slate-200 px-3 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                #
              </th>
              {columns.map((column) => {
                const sortKey = column.sortKey ?? column.key;
                const isSortable = report.paginated && column.sortable !== false;
                const isSorted = filters.SortBy === sortKey;

                return (
                  <th
                    key={String(column.key)}
                    style={column.width ? { width: column.width } : undefined}
                    className={[
                      "border-b border-slate-200 px-3 py-3 text-xs font-medium uppercase tracking-wide text-slate-500",
                      column.align === "right" || isNumericColumn(column)
                        ? "text-right"
                        : "",
                    ].join(" ")}
                  >
                    {isSortable ? (
                      <button
                        type="button"
                        className={[
                          "inline-flex items-center gap-1.5 transition-colors hover:text-slate-700",
                          column.align === "right" || isNumericColumn(column)
                            ? "justify-end"
                            : "",
                        ].join(" ")}
                        onClick={() =>
                          onSortChange({
                            SortBy: sortKey,
                            SortDirection:
                              isSorted && filters.SortDirection === "asc"
                                ? "desc"
                                : "asc",
                          })
                        }
                      >
                        {column.header ?? column.label}
                        {getSortIcon(isSorted, filters.SortDirection)}
                      </button>
                    ) : (
                      column.header ?? column.label
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 8 }, (_, index) => (
                  <tr key={index}>
                    <td colSpan={columns.length + 1} className="px-3 py-3">
                      <div className="h-10 animate-pulse rounded-xl bg-slate-100" />
                    </td>
                  </tr>
                ))
              : rows.map((row, rowIndex) => (
                  <tr
                    key={row?.id ?? row?.sourceId ?? `${report.id}-${rowIndex}`}
                    className="transition-colors hover:bg-slate-50"
                  >
                    <td className="border-b border-slate-100 px-4 py-3.5 text-xs font-semibold tabular-nums text-slate-400">
                      {(pageNumber - 1) * pageSize + rowIndex + 1}
                    </td>
                    {columns.map((column) => {
                      const value = getReportValue(row, column.key);
                      const isNegativeTone =
                        column.tone === "negative" && toReportNumber(value) < 0;

                      if (column.format === "pill") {
                        const metaValue = getPillMeta(value, column);

                        return (
                          <td
                            key={String(column.key)}
                            className="border-b border-slate-100 px-3 py-3"
                          >
                            <span
                              className={[
                                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset",
                                metaValue.className,
                              ].join(" ")}
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-current opacity-75" />
                              {metaValue.label}
                            </span>
                          </td>
                        );
                      }

                      return (
                        <td
                          key={String(column.key)}
                          className={[
                            "border-b border-slate-100 px-3 py-3 text-sm text-slate-700",
                            column.align === "right" || isNumericColumn(column)
                              ? "text-right font-medium tabular-nums text-slate-900"
                              : "",
                            column.format === "enum" ? "font-medium" : "",
                            isNegativeTone ? "text-red-600" : "",
                          ].join(" ")}
                        >
                          {renderCell(column, row)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
          </tbody>
          {!isLoading && report.group === "rojmel" && (
            <tfoot className="border-t border-slate-200 bg-slate-50 text-sm font-semibold text-slate-900">
              <tr>
                <th scope="row" colSpan={columns.length + 1} className="px-3 pt-3 text-left text-xs">
                  {report.paginated ? "Page totals" : "Totals for returned records"} · cancelled entries excluded · running balances not summed
                </th>
              </tr>
              <tr>
                <td />
                {columns.map((column) => (
                  <td key={String(column.key)} className="px-3 py-3 text-right tabular-nums">
                    {column.format === "currency" && column.key !== "balanceAfter"
                      ? formatCell(sumRojmelMoney(rows, column.key, { excludeCancelled: true }), column)
                      : ""}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {report.paginated && (
        <ReportPagination
          disabled={isLoading}
          itemCount={rows.length}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          pageNumber={pageNumber}
          pageSize={pageSize}
          totalCount={totalCount}
          totalPages={totalPages}
        />
      )}
    </div>
  );
};

export default ReportTable;
