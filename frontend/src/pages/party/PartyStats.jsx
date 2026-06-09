import { Contact, CreditCard, Store, Truck, XCircle } from "lucide-react";
import { memo } from "react";

import { formatNumber } from "./partyHelpers";

const StatCard = ({ colorClass, icon: Icon, label, value }) => {
  return (
    <div className="glass-card rounded-2xl px-4 py-3">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${colorClass}`}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
            {label}
          </p>
          <p className="mt-0.5 truncate text-lg font-bold text-slate-950">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
};

const PartyStats = ({
  creditLimitTotal,
  customerCount,
  inactive,
  supplierCount,
  total,
}) => {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <StatCard
        icon={Contact}
        label="Total Parties"
        value={total}
        colorClass="bg-brand-light text-brand"
      />
      <StatCard
        icon={Store}
        label="Customers"
        value={customerCount}
        colorClass="bg-blue-50 text-blue-600"
      />
      <StatCard
        icon={Truck}
        label="Suppliers"
        value={supplierCount}
        colorClass="bg-amber-50 text-amber-600"
      />
      <StatCard
        icon={XCircle}
        label="Inactive"
        value={inactive}
        colorClass="bg-red-50 text-red-500"
      />
      <StatCard
        icon={CreditCard}
        label="Credit Limit Used"
        value={formatNumber(creditLimitTotal)}
        colorClass="bg-green-50 text-green-600"
      />
    </div>
  );
};

export default memo(PartyStats);
