import { Contact, CreditCard, Store, Truck, XCircle } from "lucide-react";
import { memo } from "react";

import StatScopeBadge from "../../components/common/StatScopeBadge";
import { formatNumber } from "./partyHelpers";

const StatCard = ({ colorClass, icon: Icon, label, loading, scope, value }) => {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${colorClass}`}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="min-h-8 text-[11px] font-semibold uppercase leading-4 tracking-[0.08em] text-slate-400">
            {label}
          </p>
          {loading ? (
            <div className="h-7 w-20 animate-pulse rounded bg-slate-100" />
          ) : (
            <p className="text-xl font-bold tabular-nums text-slate-900">{value}</p>
          )}
          <StatScopeBadge className="mt-1" scope={scope} />
        </div>
      </div>
    </div>
  );
};

const PartyStats = ({
  creditLimitTotal,
  customerCount,
  inactive,
  loading,
  metricScope,
  supplierCount,
  total,
  totalScope,
}) => {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <StatCard
        icon={Contact}
        label="Total Parties"
        value={total}
        loading={loading}
        scope={totalScope}
        colorClass="bg-brand-light text-brand"
      />
      <StatCard
        icon={Store}
        label="Customers"
        value={customerCount}
        loading={loading}
        scope={metricScope}
        colorClass="bg-brand-light text-brand"
      />
      <StatCard
        icon={Truck}
        label="Suppliers"
        value={supplierCount}
        loading={loading}
        scope={metricScope}
        colorClass="bg-amber-50 text-amber-600"
      />
      <StatCard
        icon={XCircle}
        label="Inactive"
        value={inactive}
        loading={loading}
        scope={metricScope}
        colorClass="bg-red-50 text-red-500"
      />
      <StatCard
        icon={CreditCard}
        label="Credit Limit Used"
        value={formatNumber(creditLimitTotal)}
        loading={loading}
        scope={metricScope}
        colorClass="bg-green-50 text-green-600"
      />
    </div>
  );
};

export default memo(PartyStats);
