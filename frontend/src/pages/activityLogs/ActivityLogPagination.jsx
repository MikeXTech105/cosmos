import { ChevronLeft, ChevronRight } from "lucide-react";

import AppButton from "../../components/common/AppButton";
import AppSelect from "../../components/common/AppSelect";
import AppTooltip from "../../components/common/AppTooltip";

const PaginationButton = ({ children, disabled, label, onClick }) => {
  const button = (
    <AppButton
      variant="secondary"
      className="h-9 rounded-lg px-3"
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </AppButton>
  );

  return disabled ? <AppTooltip label={label}>{button}</AppTooltip> : button;
};

const ActivityLogPagination = ({
  pageNumber,
  pageSize,
  totalCount,
  totalPages,
  onPageChange,
  onPageSizeChange,
}) => {
  const first = totalCount === 0 ? 0 : (pageNumber - 1) * pageSize + 1;
  const last = Math.min(pageNumber * pageSize, totalCount);

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/90 bg-white px-5 py-4 shadow-[0_10px_30px_-24px_rgba(15,23,42,0.35)] lg:flex-row lg:items-center lg:justify-between">
      <p className="text-sm text-slate-500">
        Showing <span className="font-semibold tabular-nums text-slate-700">{first.toLocaleString("en-IN")}</span>
        {" to "}
        <span className="font-semibold tabular-nums text-slate-700">{last.toLocaleString("en-IN")}</span>
        {" of "}
        <span className="font-semibold tabular-nums text-slate-700">{totalCount.toLocaleString("en-IN")}</span>
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-slate-500">Rows per page</span>
        <AppSelect
          aria-label="Rows per page"
          className="w-24"
          value={pageSize}
          options={[25, 50, 100, 200].map((value) => ({ label: String(value), value }))}
          onChange={(value) => onPageSizeChange(Number(value))}
        />
        <PaginationButton
          disabled={pageNumber <= 1}
          label="Already on the first page"
          onClick={() => onPageChange(pageNumber - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </PaginationButton>
        <span className="px-2 text-xs font-semibold tabular-nums text-slate-600">
          Page {pageNumber} of {totalPages}
        </span>
        <PaginationButton
          disabled={pageNumber >= totalPages}
          label="Already on the last page"
          onClick={() => onPageChange(pageNumber + 1)}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </PaginationButton>
      </div>
    </div>
  );
};

export default ActivityLogPagination;
