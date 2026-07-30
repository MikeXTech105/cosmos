import AppSelect from "../../../components/common/AppSelect";
import {
  DASHBOARD_TOP_OPTIONS,
  PARTY_TYPE_OPTIONS,
  formatCurrency,
  formatNumber,
  isEmptyCollection,
} from "../dashboardHelpers";
import {
  ListSkeleton,
  RankBadge,
  WidgetCard,
  WidgetEmpty,
  WidgetError,
} from "./WidgetState";

const TopParties = ({
  error,
  filters,
  isLoading,
  onChange,
  onRetry,
  rows,
}) => {
  return (
    <WidgetCard
      title="Top Parties"
      description="Top customers and suppliers by gross amount."
      actions={
        <>
          <AppSelect
            value={filters.top}
            onChange={(value) => onChange({ top: Number(value) })}
            options={DASHBOARD_TOP_OPTIONS.map((value) => ({
              label: `Top ${value}`,
              value,
            }))}
            className="w-28"
            aria-label="Top parties count"
          />
          <AppSelect
            value={filters.partyType}
            onChange={(value) => onChange({ partyType: value })}
            options={PARTY_TYPE_OPTIONS}
            className="min-w-[150px]"
            aria-label="Top parties type"
          />
        </>
      }
    >
      {isLoading ? (
        <ListSkeleton rows={5} />
      ) : error ? (
        <WidgetError message={error} onRetry={onRetry} />
      ) : isEmptyCollection(rows) ? (
        <WidgetEmpty message="No party activity for this period." />
      ) : (
        <div className="space-y-3">
          {rows.map((party) => (
            <div
              key={`${party.partyId}-${party.rank}`}
              className="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-3"
            >
              <RankBadge rank={party.rank} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {party.partyName ?? "Unnamed party"}
                </p>
                <p className="mt-1 truncate text-xs text-slate-400">
                  {[party.partyCode, party.partyType].filter(Boolean).join(" - ") ||
                    "No party code"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold tabular-nums text-slate-900">
                  {formatCurrency(party.grossAmount)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {formatCurrency(party.outstandingAmount)} outstanding
                </p>
                <p className="mt-1 text-[11px] text-slate-400">
                  {formatNumber(party.transactionCount)} txns
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </WidgetCard>
  );
};

export default TopParties;
