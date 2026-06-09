import {
  Ban,
  CheckCircle2,
  Contact,
  Eye,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { memo } from "react";

import AppTooltip from "../../components/common/AppTooltip";
import {
  formatBalance,
  formatValue,
  getPartyCity,
  getPartyDisplayName,
  getPartyState,
  getPartyTypeLabel,
} from "./partyHelpers";

const statusStyles = {
  active: "bg-emerald-50/70 text-emerald-700 ring-emerald-200/70",
  inactive: "bg-red-50/70 text-red-700 ring-red-200/70",
};

const PartyStatusBadge = ({ isActive }) => {
  const status = isActive ? "active" : "inactive";

  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset",
        statusStyles[status],
      ].join(" ")}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-75" />
      {isActive ? "Active" : "Inactive"}
    </span>
  );
};

const ActionButton = ({ className, icon: Icon, label, onClick }) => {
  return (
    <AppTooltip label={label}>
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        className={[
          "inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-all hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30",
          className,
        ].join(" ")}
      >
        <Icon className="h-4 w-4" />
      </button>
    </AppTooltip>
  );
};

const PartyActions = ({
  canActivate = true,
  canDeactivate = true,
  canDelete = true,
  canEdit = true,
  canView = true,
  onActivate,
  onDeactivate,
  onDelete,
  onEdit,
  onView,
  party,
}) => {
  return (
    <div className="flex items-center justify-end gap-0.5">
      {canView && (
        <ActionButton
          icon={Eye}
          label="View Party"
          onClick={() => onView(party)}
          className="hover:text-brand"
        />
      )}

      {canEdit && (
        <ActionButton
          icon={Pencil}
          label="Edit Party"
          onClick={() => onEdit(party)}
          className="hover:text-blue-700"
        />
      )}

      {party.isActive ? (
        canDeactivate && (
          <ActionButton
            icon={Ban}
            label="Deactivate Party"
            onClick={() => onDeactivate(party)}
            className="hover:bg-amber-50 hover:text-amber-700"
          />
        )
      ) : (
        canActivate && (
          <ActionButton
            icon={CheckCircle2}
            label="Activate Party"
            onClick={() => onActivate(party)}
            className="hover:bg-emerald-50 hover:text-emerald-700"
          />
        )
      )}

      {canDelete && (
        <ActionButton
          icon={Trash2}
          label="Delete Party"
          onClick={() => onDelete(party)}
          className="hover:bg-red-50 hover:text-red-700"
        />
      )}
    </div>
  );
};

const TableSkeleton = () => {
  return Array.from({ length: 6 }, (_, index) => (
    <tr key={index}>
      <td colSpan={10} className="px-4 py-3.5">
        <div className="h-11 animate-pulse rounded-xl bg-slate-100" />
      </td>
    </tr>
  ));
};

const EmptyState = ({ errorMessage, hasError, onCreate, onRetry }) => {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-light text-brand">
        <Contact className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-base font-bold text-slate-950">
        {hasError ? "Unable to load parties" : "No parties found"}
      </h3>
      <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">
        {hasError
          ? errorMessage ?? "Something went wrong while loading parties."
          : "Create the first party or adjust filters to find existing records."}
      </p>
      <div className="mt-5">
        {hasError ? (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        ) : (
          <button
            type="button"
            onClick={onCreate}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-dark active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            Add Party
          </button>
        )}
      </div>
    </div>
  );
};

const MobilePartyCard = ({ actions, party, serialNumber }) => {
  return (
    <article className="glass-card rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <span className="shrink-0 text-xs font-semibold tabular-nums text-slate-400">
              #{serialNumber}
            </span>
            <p className="truncate text-sm font-bold text-slate-950">
              {getPartyDisplayName(party)}
            </p>
          </div>
          <p className="mt-1 truncate text-xs font-semibold text-slate-400">
            {getPartyTypeLabel(party)}
          </p>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">
            {[party.mobileNo, getPartyCity(party), getPartyState(party)]
              .filter(Boolean)
              .join(" / ") || "-"}
          </p>
        </div>
        <PartyActions party={party} {...actions} />
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <PartyStatusBadge isActive={party.isActive} />
        <span className="text-xs text-slate-500">
          Balance {formatBalance(party)}
        </span>
      </div>
    </article>
  );
};

const PartyTable = ({
  actions,
  currentPage = 1,
  errorMessage,
  hasError,
  isLoading,
  onCreate,
  onRetry,
  pageSize = 10,
  parties,
}) => {
  if (!isLoading && (hasError || parties.length === 0)) {
    return (
      <div className="overflow-hidden rounded-3xl glass-card shadow-sm">
        <EmptyState
          errorMessage={errorMessage}
          hasError={hasError}
          onCreate={onCreate}
          onRetry={onRetry}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="grid gap-3 lg:hidden">
        {isLoading
          ? Array.from({ length: 4 }, (_, index) => (
              <div
                key={index}
                className="h-40 animate-pulse rounded-2xl bg-slate-100"
              />
            ))
          : parties.map((party, index) => (
              <MobilePartyCard
                key={party.id}
                actions={actions}
                party={party}
                serialNumber={(currentPage - 1) * pageSize + index + 1}
              />
            ))}
      </div>

      <div className="hidden overflow-hidden rounded-2xl glass-card lg:block">
        <div className="overflow-x-auto">
          <table className="min-w-[1120px] table-fixed border-separate border-spacing-0 text-left">
            <colgroup>
              <col className="w-[56px]" />
              <col className="w-[210px]" />
              <col className="w-[130px]" />
              <col className="w-[150px]" />
              <col className="w-[130px]" />
              <col className="w-[130px]" />
              <col className="w-[120px]" />
              <col className="w-[130px]" />
              <col className="w-[112px]" />
              <col className="w-[148px]" />
            </colgroup>
            <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-sm">
              <tr>
                {[
                  "SR No",
                  "Party Name",
                  "Mobile",
                  "GSTIN",
                  "City",
                  "State",
                  "Party Type",
                  "Balance",
                  "Status",
                  "Actions",
                ].map((heading) => (
                  <th
                    key={heading}
                    className={[
                      "whitespace-nowrap border-b border-slate-200 px-4 py-3.5 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400",
                      heading === "SR No" ? "text-center" : "",
                      heading === "Actions" ? "text-right" : "",
                    ].join(" ")}
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <TableSkeleton />
              ) : (
                parties.map((party, index) => (
                  <tr
                    key={party.id}
                    className="group transition-colors hover:bg-indigo-50/30 focus-within:bg-brand-light/20"
                  >
                    <td className="border-b border-slate-100 px-2 py-3.5 text-center text-xs font-semibold tabular-nums text-slate-400">
                      {(currentPage - 1) * pageSize + index + 1}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3.5">
                      <p className="truncate text-sm font-semibold text-slate-950">
                        {getPartyDisplayName(party)}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-slate-400">
                        {party.partyCode || party.email || "-"}
                      </p>
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3.5">
                      <p className="truncate text-sm text-slate-600">
                        {party.mobileNo || "-"}
                      </p>
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3.5">
                      <p className="truncate text-sm text-slate-600">
                        {party.gstin || "-"}
                      </p>
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3.5 text-sm text-slate-600">
                      {formatValue(getPartyCity(party))}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3.5 text-sm text-slate-600">
                      {formatValue(getPartyState(party))}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3.5 text-sm font-semibold text-slate-700">
                      {getPartyTypeLabel(party)}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3.5 text-sm font-semibold tabular-nums text-slate-700">
                      {formatBalance(party)}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3.5">
                      <PartyStatusBadge isActive={party.isActive} />
                    </td>
                    <td className="border-b border-slate-100 px-3 py-3.5">
                      <PartyActions party={party} {...actions} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default memo(PartyTable);
