import {
  ChevronDown,
  CircleX,
  Filter,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useId, useMemo } from "react";

import AppButton from "../../components/common/AppButton";
import AppInput from "../../components/common/AppInput";
import AppDateRangeFilter from "../../components/common/AppDateRangeFilter";
import AppSelect from "../../components/common/AppSelect";

const optionList = (values, anyLabel) => [
  { label: anyLabel, value: "" },
  ...values.map((value) => ({ label: value, value })),
];

const hasValue = (value) =>
  value !== null && value !== undefined && String(value).trim() !== "";

const getFilterChips = (filters, actors) => {
  const actor = actors.find((candidate) =>
    hasValue(filters.UserId)
      ? String(candidate.userId) === String(filters.UserId)
      : candidate.username.toLowerCase() === String(filters.Username).toLowerCase(),
  );
  const chips = [
    ["Search", "Search", filters.Search],
    ["Module", "Module", filters.Module],
    ["Action", "Action", filters.Action],
    [
      hasValue(filters.UserId) ? "UserId" : "Username",
      "Actor",
      actor?.displayName || actor?.username || filters.Username,
    ],
    ["FromDate", "From", filters.FromDate],
    ["ToDate", "To", filters.ToDate],
    ["EntityType", "Entity", filters.EntityType],
    ["EntityId", "Entity ID", filters.EntityId],
    ["HttpMethod", "Method", filters.HttpMethod],
    ["StatusCode", "Status", filters.StatusCode],
    ["CorrelationId", "Reference", filters.CorrelationId],
  ];

  return chips
    .filter(([, , value]) => hasValue(value))
    .map(([key, label, value]) => ({ key, label, value: String(value) }));
};

const ActivityLogFilters = ({
  actions,
  activeFilterCount,
  actors,
  errors = {},
  filters,
  modules,
  onChange,
  onClear,
  resultCount,
}) => {
  const moduleListId = useId();
  const actionListId = useId();
  const selectedActor = actors.find((actor) => {
    if (hasValue(filters.UserId)) {
      return String(actor.userId) === String(filters.UserId);
    }
    return actor.username.toLowerCase() === String(filters.Username).toLowerCase();
  });
  const filterChips = useMemo(
    () => getFilterChips(filters, actors),
    [actors, filters],
  );
  const advancedFilterCount = [
    hasValue(filters.UserId) ? "" : filters.Username,
    filters.EntityType,
    filters.EntityId,
    filters.HttpMethod,
    filters.StatusCode,
    filters.CorrelationId,
  ].filter(hasValue).length;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "local time";
  const numericResultCount = Number(resultCount || 0);
  const resultLabel = `${numericResultCount.toLocaleString("en-IN")} event${numericResultCount === 1 ? "" : "s"}`;

  const setActor = (username) => {
    const normalizedUsername = String(username ?? "");
    const actor = actors.find(
      (candidate) =>
        candidate.username.toLowerCase() === normalizedUsername.toLowerCase(),
    );

    if (!actor) {
      onChange({ UserId: "", Username: normalizedUsername });
      return;
    }

    if (actor.userId !== null && actor.userId !== undefined) {
      onChange({ UserId: actor.userId, Username: "" });
    } else {
      onChange({ UserId: "", Username: actor.username });
    }
  };

  const clearChip = (key) => {
    if (key === "UserId" || key === "Username") {
      onChange({ UserId: "", Username: "" });
      return;
    }
    onChange({ [key]: "" });
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand">
            <Filter className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold text-slate-900">Filter activity</h2>
              {activeFilterCount > 0 ? (
                <span className="rounded-full bg-brand-light px-2 py-0.5 text-[11px] font-semibold text-brand">
                  {activeFilterCount} active
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              {resultLabel} {numericResultCount === 1 ? "matches" : "match"} the current view
            </p>
          </div>
        </div>
        {activeFilterCount > 0 ? (
          <AppButton
            variant="ghost"
            className="h-8 self-start rounded-lg px-2.5 text-xs sm:self-auto"
            onClick={onClear}
          >
            <CircleX className="h-3.5 w-3.5" />
            Clear all
          </AppButton>
        ) : null}
      </div>

      <div className="p-4 sm:p-5">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-10 h-4 w-4 text-slate-400" />
            <AppInput
              label="Search"
              className="pl-10"
              placeholder="Actor, entity, or description"
              value={filters.Search}
              error={errors.search}
              onChange={(event) => onChange({ Search: event.target.value })}
            />
          </div>

          <div>
            <AppInput
              label="Module"
              list={moduleListId}
              placeholder="All modules"
              value={filters.Module}
              error={errors.module}
              onChange={(event) => onChange({ Module: event.target.value })}
            />
            <datalist id={moduleListId}>
              {modules.map((module) => <option key={module} value={module} />)}
            </datalist>
          </div>

          <div>
            <AppInput
              label="Action"
              list={actionListId}
              placeholder="All actions"
              value={filters.Action}
              error={errors.action}
              onChange={(event) => onChange({ Action: event.target.value })}
            />
            <datalist id={actionListId}>
              {actions.map((action) => <option key={action} value={action} />)}
            </datalist>
          </div>

          <AppSelect
            label="Actor"
            value={selectedActor?.username ?? ""}
            options={[
              { label: "All actors", value: "" },
              ...actors.map((actor) => ({
                label: actor.displayName
                  ? `${actor.displayName} · ${actor.username}`
                  : actor.username,
                value: actor.username,
              })),
            ]}
            error={errors.userId || errors.username}
            onChange={setActor}
          />

          <div className="min-w-0 self-end md:col-span-2">
            <AppDateRangeFilter
              includeTime
              fromDate={filters.FromDate}
              toDate={filters.ToDate}
              onChange={({ fromDate, toDate }) => onChange({ FromDate: fromDate, ToDate: toDate })}
            />
            {(errors.fromDate || errors.toDate) && <p role="alert" className="mt-1 text-xs text-red-600">{errors.fromDate || errors.toDate}</p>}
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 text-[11px] leading-5 text-slate-500">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
          Times are shown in {timezone}. Date bounds are inclusive.
        </div>

        <details
          className="group mt-4 overflow-hidden rounded-xl border border-slate-200 bg-slate-50/60"
          open={advancedFilterCount > 0 || Boolean(errors.entityType || errors.entityId || errors.httpMethod || errors.statusCode || errors.correlationId)}
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/30">
            <span className="inline-flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-brand" />
              More filters
              {advancedFilterCount > 0 ? (
                <span className="rounded-full bg-white px-2 py-0.5 text-[10px] text-brand ring-1 ring-inset ring-brand/15">
                  {advancedFilterCount}
                </span>
              ) : (
                <span className="text-xs font-normal text-slate-400">For support and API tracing</span>
              )}
            </span>
            <ChevronDown className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-180" />
          </summary>
          <div className="grid gap-3 border-t border-slate-200 bg-white p-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            <AppInput
              label="Username"
              placeholder="Exact username"
              value={filters.Username}
              error={errors.username}
              onChange={(event) => onChange({ UserId: "", Username: event.target.value })}
            />
            <AppInput
              label="Entity type"
              placeholder="e.g. SalesOrder"
              value={filters.EntityType}
              error={errors.entityType}
              onChange={(event) => onChange({ EntityType: event.target.value })}
            />
            <AppInput
              label="Entity ID"
              placeholder="Exact record ID"
              value={filters.EntityId}
              error={errors.entityId}
              onChange={(event) => onChange({ EntityId: event.target.value })}
            />
            <AppSelect
              label="HTTP method"
              value={filters.HttpMethod}
              options={optionList(["GET", "POST", "PUT", "PATCH", "DELETE"], "Any method")}
              error={errors.httpMethod}
              onChange={(value) => onChange({ HttpMethod: value })}
            />
            <AppInput
              label="Status code"
              type="number"
              min="100"
              max="599"
              placeholder="e.g. 200"
              value={filters.StatusCode}
              error={errors.statusCode}
              onChange={(event) => onChange({ StatusCode: event.target.value })}
            />
            <AppInput
              label="Correlation ID"
              placeholder="Paste support reference"
              value={filters.CorrelationId}
              error={errors.correlationId}
              onChange={(event) => onChange({ CorrelationId: event.target.value })}
            />
          </div>
        </details>

        {(errors.sortBy || errors.sortDirection) ? (
          <p role="alert" className="mt-3 text-xs font-medium text-red-600">
            {errors.sortBy || errors.sortDirection}
          </p>
        ) : null}

        {filterChips.length > 0 ? (
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
            <span className="mr-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Applied
            </span>
            {filterChips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                aria-label={`Remove ${chip.label} filter: ${chip.value}`}
                className="group/chip inline-flex max-w-full items-center gap-1.5 rounded-lg bg-brand-light px-2.5 py-1.5 text-xs text-slate-700 ring-1 ring-inset ring-brand/10 transition hover:ring-brand/25"
                title={`Remove ${chip.label} filter`}
                onClick={() => clearChip(chip.key)}
              >
                <span className="font-semibold text-brand">{chip.label}</span>
                <span className="max-w-48 truncate">{chip.value}</span>
                <X className="h-3.5 w-3.5 shrink-0 text-slate-400 group-hover/chip:text-slate-700" />
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
};

export default ActivityLogFilters;
