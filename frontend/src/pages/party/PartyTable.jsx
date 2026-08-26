import {
  Ban,
  CheckCircle2,
  Contact,
  Eye,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  ReceiptText,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { memo } from "react";

import AppTooltip from "../../components/common/AppTooltip";
import {
  formatBalance,
  formatNumber,
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

const PartyTypeBadge = ({ party }) => {
  const label = getPartyTypeLabel(party);
  const normalizedLabel = label.toLowerCase();
  const tone = normalizedLabel.includes("supplier")
    ? "bg-amber-50 text-amber-700 ring-amber-200"
    : normalizedLabel.includes("customer")
      ? "bg-sky-50 text-sky-700 ring-sky-200"
      : "bg-violet-50 text-violet-700 ring-violet-200";

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset ${tone}`}
    >
      {label}
    </span>
  );
};

const ActionButton = ({ icon: Icon, label, onClick, tone = "default" }) => {
  const buttonClass =
    tone === "danger"
      ? "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-slate-400 transition-all hover:border-red-100 hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 disabled:cursor-not-allowed disabled:opacity-40"
      : "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-slate-400 transition-all hover:border-slate-200 hover:bg-white hover:text-brand hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 disabled:cursor-not-allowed disabled:opacity-40";

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
    <div className="flex items-center justify-end gap-0.5 rounded-lg bg-slate-50 p-0.5 ring-1 ring-inset ring-slate-200/70">
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

      {party.isActive
        ? canDeactivate && (
            <ActionButton
              icon={Ban}
              label="Deactivate Party"
              onClick={() => onDeactivate(party)}
            />
          )
        : canActivate && (
            <ActionButton
              icon={CheckCircle2}
              label="Activate Party"
              onClick={() => onActivate(party)}
            />
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
  return Array.from({ length: 6 }, (_, index) => (
    <tr key={index}>
      <td colSpan={8} className="px-5 py-3.5">
        <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
      </td>
    </tr>
  ));
};

const EmptyState = ({ errorMessage, hasError, onCreate, onRetry }) => {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-light text-brand ring-8 ring-brand-light/50">
        <Contact className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-base font-bold text-slate-950">
        {hasError ? "Unable to load parties" : "No parties found"}
      </h3>
      <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">
        {hasError
          ? (errorMessage ?? "Something went wrong while loading parties.")
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
  const location = [getPartyCity(party), getPartyState(party)]
    .filter(Boolean)
    .join(", ");

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${getPartyIdentityStyles(party)}`}
            >
              {getInitials(party) || "P"}
            </span>
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <p className="truncate text-sm font-bold text-slate-950">
                  {getPartyDisplayName(party)}
                </p>
                <span className="shrink-0 text-[10px] font-semibold tabular-nums text-slate-400">
                  #{serialNumber}
                </span>
              </div>
              <p className="mt-1 truncate text-xs text-slate-500">
                {party.partyCode || "No party code"}
              </p>
              <div className="mt-2">
                <PartyTypeBadge party={party} />
              </div>
            </div>
          </div>
          <PartyStatusBadge isActive={party.isActive} />
        </div>

        <div className="mt-4 grid gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span className="truncate">
              {party.mobileNo || "No mobile number"}
            </span>
          </div>
          {party.email && (
            <div className="flex items-center gap-2">
              <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span className="truncate">{party.email}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span className="truncate">{location || "No location added"}</span>
          </div>
          <div className="flex items-center gap-2">
            <ReceiptText className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span className="truncate font-mono">
              {party.gstin || "No GSTIN"}
            </span>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
              Opening balance
            </p>
            <p className="mt-1 text-sm font-bold tabular-nums text-slate-900">
              {formatBalance(party)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
              Credit limit
            </p>
            <p className="mt-1 text-sm font-bold tabular-nums text-slate-900">
              {formatNumber(party.creditLimit)}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end border-t border-slate-100 bg-slate-50/70 px-3 py-2">
        <PartyActions party={party} {...actions} />
      </div>
    </article>
  );
};

const PartyTable = ({
  actions,
  currentPage = 1,
  embedded = false,
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
      <div
        className={
          embedded
            ? "bg-white"
            : "overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        }
      >
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
      <div
        className={`grid gap-3 lg:hidden ${embedded ? "bg-slate-50/40 p-4" : ""}`}
      >
        {isLoading
          ? Array.from({ length: 4 }, (_, index) => (
              <div
                key={index}
                className="h-72 animate-pulse rounded-2xl bg-slate-100"
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

      <div
        className={[
          "hidden overflow-hidden bg-white lg:block",
          embedded ? "" : "rounded-2xl border border-slate-200 shadow-sm",
        ].join(" ")}
      >
        <div className="overflow-x-auto">
          <table className="min-w-[1120px] table-fixed border-separate border-spacing-0 text-left">
            <colgroup>
              <col className="w-[56px]" />
              <col className="w-[250px]" />
              <col className="w-[190px]" />
              <col className="w-[230px]" />
              <col className="w-[120px]" />
              <col className="w-[170px]" />
              <col className="w-[110px]" />
              <col className="w-[148px]" />
            </colgroup>
            <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-sm">
              <tr>
                {[
                  "#",
                  "Party",
                  "Contact",
                  "GST & Location",
                  "Relationship",
                  "Financial",
                  "Status",
                  "Actions",
                ].map((heading) => (
                  <th
                    key={heading}
                    className={[
                      "whitespace-nowrap border-b border-slate-200 px-5 py-3.5 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500",
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
                    className="group transition-colors hover:bg-brand-light/25 focus-within:bg-brand-light/25"
                  >
                    <td className="border-b border-slate-100 px-5 py-4 text-xs font-semibold tabular-nums text-slate-400">
                      {(currentPage - 1) * pageSize + index + 1}
                    </td>
                    <td className="border-b border-slate-100 px-5 py-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          className={[
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold ring-1 ring-inset ring-black/5",
                            getPartyIdentityStyles(party),
                          ].join(" ")}
                        >
                          {getInitials(party) || "P"}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-bold text-slate-950">
                            {getPartyDisplayName(party)}
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-slate-400">
                            {party.partyCode || "No party code"}
                          </span>
                        </span>
                      </div>
                    </td>
                    <td className="border-b border-slate-100 px-5 py-4">
                      <p className="truncate text-sm font-medium text-slate-700">
                        {party.mobileNo || "No mobile"}
                      </p>
                      <p className="mt-1 truncate text-xs text-slate-400">
                        {party.email || "No email added"}
                      </p>
                    </td>
                    <td className="border-b border-slate-100 px-5 py-4">
                      <p className="truncate font-mono text-xs font-medium text-slate-700">
                        {party.gstin || "No GSTIN"}
                      </p>
                      <p className="mt-1 truncate text-xs text-slate-400">
                        {[getPartyCity(party), getPartyState(party)]
                          .filter(Boolean)
                          .join(", ") || "No location added"}
                      </p>
                    </td>
                    <td className="border-b border-slate-100 px-5 py-4">
                      <PartyTypeBadge party={party} />
                    </td>
                    <td className="border-b border-slate-100 px-5 py-4">
                      <p className="text-sm font-bold tabular-nums text-slate-800">
                        {formatBalance(party)}
                      </p>
                      <p className="mt-1 text-xs tabular-nums text-slate-400">
                        Limit {formatNumber(party.creditLimit)}
                      </p>
                    </td>
                    <td className="border-b border-slate-100 px-5 py-4">
                      <PartyStatusBadge isActive={party.isActive} />
                    </td>
                    <td className="border-b border-slate-100 px-4 py-4">
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
