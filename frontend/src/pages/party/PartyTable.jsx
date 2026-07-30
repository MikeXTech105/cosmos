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
  active: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  inactive: "bg-red-50 text-red-700 ring-red-200",
};

const getInitials = (party) => {
  return getPartyDisplayName(party)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
};

const getPartyIdentityStyles = (party) => {
  const type = getPartyTypeLabel(party).toLowerCase();

  if (type.includes("customer")) {
    return "bg-brand-light text-brand";
  }

  if (type.includes("supplier")) {
    return "bg-amber-50 text-amber-700";
  }

  return "bg-brand-light text-brand";
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

const ActionButton = ({ icon: Icon, label, onClick, tone = "default" }) => {
  const buttonClass =
    tone === "danger"
      ? "inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-all hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 disabled:cursor-not-allowed disabled:opacity-40"
      : "inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-all hover:bg-slate-100 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <AppTooltip label={label}>
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        className={buttonClass}
      >
        <Icon className="h-4 w-4" />
      </button>
    </AppTooltip>
  );
};

const PartyActions = ({
  canActivate = false,
  canDeactivate = false,
  canDelete = false,
  canEdit = false,
  canView = false,
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
        />
      )}

      {canEdit && (
        <ActionButton
          icon={Pencil}
          label="Edit Party"
          onClick={() => onEdit(party)}
        />
      )}

      {party.isActive ? (
        canDeactivate && (
          <ActionButton
            icon={Ban}
            label="Deactivate Party"
            onClick={() => onDeactivate(party)}
          />
        )
      ) : (
        canActivate && (
          <ActionButton
            icon={CheckCircle2}
            label="Activate Party"
            onClick={() => onActivate(party)}
          />
        )
      )}

      {canDelete && (
        <ActionButton
          icon={Trash2}
          label="Delete Party"
          onClick={() => onDelete(party)}
          tone="danger"
        />
      )}
    </div>
  );
};

const TableSkeleton = () => {
  return Array.from({ length: 5 }, (_, index) => (
    <tr key={index}>
      <td colSpan={10} className="px-4 py-3.5">
        <div className="h-4 animate-pulse rounded bg-slate-100" />
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
        ) : onCreate ? (
          <button
            type="button"
            onClick={onCreate}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-dark active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            Add Party
          </button>
        ) : null}
      </div>
    </div>
  );
};

const MobilePartyCard = ({ actions, party, serialNumber }) => {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
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
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
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
          ? Array.from({ length: 5 }, (_, index) => (
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

      <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:block">
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
            <thead className="sticky top-0 z-10 bg-slate-50">
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
                      "whitespace-nowrap border-b border-slate-200 px-4 py-3.5 text-xs font-medium uppercase tracking-wide text-slate-500",
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
                    className="group transition-colors hover:bg-slate-50 focus-within:bg-slate-50"
                  >
                    <td className="border-b border-slate-100 px-4 py-3.5 text-xs font-semibold tabular-nums text-slate-400">
                      {(currentPage - 1) * pageSize + index + 1}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3.5">
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          className={[
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold",
                            getPartyIdentityStyles(party),
                          ].join(" ")}
                        >
                          {getInitials(party) || "P"}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-slate-900">
                            {getPartyDisplayName(party)}
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-slate-400">
                            {[party.partyCode, getPartyTypeLabel(party)]
                              .filter(Boolean)
                              .join(" / ") || "-"}
                          </span>
                        </span>
                      </div>
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3.5">
                      <p className="truncate font-mono text-xs text-slate-600">
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
                    <td className="border-b border-slate-100 px-4 py-3.5 text-right text-sm font-medium tabular-nums text-slate-700">
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
