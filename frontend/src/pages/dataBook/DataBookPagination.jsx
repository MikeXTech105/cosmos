import AppButton from "../../components/common/AppButton";
import AppSelect from "../../components/common/AppSelect";
import AppTooltip from "../../components/common/AppTooltip";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100, 200].map((value) => ({
  label: String(value),
  value,
}));

const DisabledTooltip = ({ children, disabled, reason }) =>
  disabled ? <AppTooltip label={reason}>{children}</AppTooltip> : children;

const DataBookPagination = ({
  disabled,
  itemCount,
  onPageChange,
  onPageSizeChange,
  pageNumber,
  pageSize,
  totalCount,
  totalPages,
}) => {
  const start = itemCount ? (pageNumber - 1) * pageSize + 1 : 0;
  const end = itemCount ? Math.min(start + itemCount - 1, totalCount) : 0;
  const previousDisabled = disabled || pageNumber <= 1;
  const nextDisabled = disabled || pageNumber >= Math.max(1, totalPages);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm lg:flex-row lg:items-center lg:justify-between">
      <p>
        Showing <span className="font-semibold text-slate-900">{start}</span> to{" "}
        <span className="font-semibold text-slate-900">{end}</span> of{" "}
        <span className="font-semibold text-slate-900">{totalCount}</span>
      </p>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2 font-medium text-slate-600">
          <span>Rows</span>
          <DisabledTooltip
            disabled={disabled}
            reason="Wait for entries to finish loading."
          >
            <div className="w-20">
              <AppSelect
                aria-label="Rows per page"
                disabled={disabled}
                options={PAGE_SIZE_OPTIONS}
                value={pageSize}
                onChange={(value) => onPageSizeChange(Number(value))}
              />
            </div>
          </DisabledTooltip>
        </div>

        <div className="flex items-center gap-2">
          <DisabledTooltip
            disabled={previousDisabled}
            reason={
              disabled
                ? "Wait for entries to finish loading."
                : "You are on the first page."
            }
          >
            <AppButton
              className="h-9 rounded-lg px-3"
              disabled={previousDisabled}
              variant="secondary"
              onClick={() => onPageChange(pageNumber - 1)}
            >
              Previous
            </AppButton>
          </DisabledTooltip>
          <span className="min-w-24 text-center text-xs font-semibold text-slate-500">
            Page {pageNumber} of {Math.max(1, totalPages)}
          </span>
          <DisabledTooltip
            disabled={nextDisabled}
            reason={
              disabled
                ? "Wait for entries to finish loading."
                : "You are on the last page."
            }
          >
            <AppButton
              className="h-9 rounded-lg px-3"
              disabled={nextDisabled}
              variant="secondary"
              onClick={() => onPageChange(pageNumber + 1)}
            >
              Next
            </AppButton>
          </DisabledTooltip>
        </div>
      </div>
    </div>
  );
};

export default DataBookPagination;
