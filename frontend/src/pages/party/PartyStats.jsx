import { Contact, CreditCard, Store, Truck, XCircle } from "lucide-react";
import { memo } from "react";

import StatScopeBadge from "../../components/common/StatScopeBadge";
import { formatNumber } from "./partyHelpers";

const StatCard = ({
  accentClass,
  className = "",
  colorClass,
  icon: Icon,
  label,
  scope,
  value,
}) => {
  return (
    <article
      className={`group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md ${className}`}
    >
      <span className={`absolute inset-x-0 top-0 h-0.5 ${accentClass}`} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400">
            {label}
          </p>
          <p className="mt-2 truncate text-2xl font-bold tracking-tight text-slate-950">
            {value}
          </p>
        </div>
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105 ${colorClass}`}
        >
          <Icon className="h-[18px] w-[18px]" />
        </div>
      </div>
      <StatScopeBadge className="mt-3" scope={scope} />
    </article>
  );
};

const PartyStats = ({
  creditLimitTotal,
  customerCount,
  inactive,
  metricScope,
  supplierCount,
  total,
  totalScope,
}) => {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      <StatCard
        icon={Contact}
        label="Total Parties"
        value={total}
        scope={totalScope}
        colorClass="bg-brand-light text-brand"
        accentClass="bg-brand"
      />
      <StatCard
        icon={Store}
        label="Customers"
        value={customerCount}
        scope={metricScope}
        colorClass="bg-sky-50 text-sky-600"
        accentClass="bg-sky-500"
      />
      <StatCard
        icon={Truck}
        label="Suppliers"
        value={supplierCount}
        scope={metricScope}
        colorClass="bg-amber-50 text-amber-600"
        accentClass="bg-amber-500"
      />
      <StatCard
        icon={XCircle}
        label="Inactive"
        value={inactive}
        scope={metricScope}
        colorClass="bg-red-50 text-red-500"
        accentClass="bg-red-500"
      />
      <StatCard
        icon={CreditCard}
        label="Total Credit Limit"
        value={formatNumber(creditLimitTotal)}
        scope={metricScope}
        colorClass="bg-green-50 text-green-600"
        accentClass="bg-emerald-500"
        className="col-span-2 lg:col-span-1"
      />
    </div>
  );
};

export default memo(PartyStats);
