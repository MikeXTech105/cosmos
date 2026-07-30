import {
  ChevronDown,
  ChevronUp,
  FileSearch,
} from "lucide-react";

import AppButton from "../../components/common/AppButton";
import EmptyState from "../../components/common/EmptyState";
import AppSelect from "../../components/common/AppSelect";
import ResponsiveTableRegion from "../../components/common/ResponsiveTableRegion";
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
    return <ChevronDown aria-hidden="true" className="h-3.5 w-3.5 opacity-30" />;
  }

  return direction === "asc" ? (
    <ChevronUp aria-hidden="true" className="h-3.5 w-3.5" />
  ) : (
    <ChevronDown aria-hidden="true" className="h-3.5 w-3.5" />
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
            label="Rows per page"
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
}) => {
  const columns = report.columns ?? [];
  const pageNumber = Number(filters.PageNumber || meta?.pageNumber || 1);
  const pageSize = Number(filters.PageSize || meta?.pageSize || 20);
  const totalCount = Number(meta?.totalCount) || rows.length;
  const totalPages =
    Number(meta?.totalPages) || Math.max(1, Math.ceil(totalCount / pageSize));

  if (!isLoading && (error || rows.length === 0)) {
    return (
      <div className="min-h-[420px] px-6">
        <EmptyState
          hint={
            error
              ? error
              : "Clear or adjust the selected filters to broaden this report."
          }
          icon={FileSearch}
          title={
            error
              ? "Couldn't load this report"
              : "No report rows match these filters"
          }
          variant={error ? "error" : "filtered"}
          onAction={error ? onRetry : undefined}
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-[420px] flex-col">
      <ResponsiveTableRegion
        className="min-h-0 flex-1"
        tableLabel={`${report.title ?? report.label ?? "Report"} results`}
        mobileConfig={{
          fields: [2, 3, 4, 5],
          serial: 0,
          title: 1,
        }}
      >
        <table className="w-full min-w-[920px] table-fixed text-left">
          <thead className="sticky top-0 z-10 bg-slate-50">
            <tr>
              <th scope="col" aria-label="Row number" className="border-b border-slate-200 px-3 py-3 text-xs font-medium uppercase tracking-wide text-slate-500"><span aria-hidden="true">#</span></th>
              {columns.map((column) => {
                const sortKey = column.sortKey ?? column.key;
                const isSortable = report.paginated && column.sortable !== false;
                const isSorted = filters.SortBy === sortKey;

                return (
                  <th scope="col"
                    key={String(column.key)}
                    aria-sort={
                      isSorted
                        ? filters.SortDirection === "desc"
                          ? "descending"
                          : "ascending"
                        : undefined
                    }
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
              ? Array.from({ length: 5 }, (_, index) => (
                  <tr key={index}>
                    <td colSpan={columns.length + 1} className="px-3 py-3">
                      <div className="h-4 animate-pulse rounded bg-slate-100" />
                    </td>
                  </tr>
                ))
              : rows.map((row, rowIndex) => (
                  <tr
                    key={row?.id ?? row?.sourceId ?? `${report.id}-${rowIndex}`}
                    className="transition-colors hover:bg-slate-50"
                  >
                    <td className="border-b border-slate-100 px-4 py-3.5 text-xs font-semibold tabular-nums text-slate-500">
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
                          {formatCell(value, column)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
          </tbody>
        </table>
      </ResponsiveTableRegion>

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
