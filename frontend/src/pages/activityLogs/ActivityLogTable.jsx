import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Bot,
  ChevronRight,
  Eye,
  PackageSearch,
  UserRound,
} from "lucide-react";

import AppTooltip from "../../components/common/AppTooltip";
import DataTableShell, {
  DATA_TABLE_ROW_ACTION_CLASS,
} from "../../components/common/DataTableShell";
import {
  ACTIVITY_EMPTY_VALUE,
  formatActivityTimestamp,
  getActivityActor,
  getActivityEntityLabel,
} from "../../utils/activityLogPresentation";
import ActivityPill from "./ActivityPill";
import StatusPill from "./StatusPill";

const SortHeader = ({ children, field, filters, onSort }) => {
  const active = filters.SortBy === field;
  const direction = active ? filters.SortDirection : "";
  const SortIcon = !active ? ArrowUpDown : direction === "asc" ? ArrowUp : ArrowDown;

  return (
    <button
      type="button"
      className="inline-flex items-center gap-1.5 transition-colors hover:text-slate-800 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
      onClick={() =>
        onSort(field, active && direction === "asc" ? "desc" : "asc")
      }
    >
      {children}
      <SortIcon className={`h-3.5 w-3.5 ${active ? "text-brand" : "text-slate-300"}`} />
    </button>
  );
};

const getTimestampParts = (value) => {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) {
    return { date: ACTIVITY_EMPTY_VALUE, time: "" };
  }

  return {
    date: new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date),
    time: new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      hour12: false,
      hourCycle: "h23",
      minute: "2-digit",
      second: "2-digit",
    }).format(date),
  };
};

const Actor = ({ actor }) => {
  const initial = actor.isSystem
    ? null
    : actor.primary.trim().charAt(0).toUpperCase() || null;

  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold ${
        actor.isSystem
          ? "bg-slate-100 text-slate-500"
          : "bg-brand-light text-brand"
      }`}>
        {actor.isSystem ? <Bot className="h-4 w-4" /> : initial || <UserRound className="h-4 w-4" />}
      </span>
      <div className="min-w-0">
        <p className={`truncate text-sm ${actor.isSystem ? "font-medium text-slate-500" : "font-semibold text-slate-800"}`}>
          {actor.primary}
        </p>
        {actor.secondary ? (
          <p className="mt-0.5 truncate text-[11px] text-slate-500">{actor.secondary}</p>
        ) : null}
      </div>
    </div>
  );
};

const MobileSkeleton = () => (
  <div className="space-y-3 lg:hidden" aria-label="Loading activity logs">
    {Array.from({ length: 4 }, (_, index) => (
      <div key={index} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex animate-pulse items-center justify-between gap-4">
          <div className="h-5 w-24 rounded bg-slate-100" />
          <div className="h-4 w-28 rounded bg-slate-100" />
        </div>
        <div className="mt-4 h-4 w-2/3 animate-pulse rounded bg-slate-100" />
        <div className="mt-2 h-3 w-full animate-pulse rounded bg-slate-100" />
      </div>
    ))}
  </div>
);

const ActivityLogTable = ({
  filters,
  items,
  loading,
  onOpen,
  onSort,
}) => {
  if (loading) {
    return (
      <>
        <MobileSkeleton />
        <div className="hidden lg:block">
          <DataTableShell columnCount={6} loading rows={6} minWidth="min-w-[1080px]" />
        </div>
      </>
    );
  }

  return (
    <>
      <div className="space-y-3 lg:hidden">
        {items.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white px-5 py-12 text-center shadow-sm">
            <PackageSearch className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-3 text-sm font-semibold text-slate-900">No activity found</p>
            <p className="mt-1 text-xs text-slate-500">Try widening the date range or clearing filters.</p>
          </div>
        ) : items.map((item) => {
          const actor = getActivityActor(item);
          const entity = getActivityEntityLabel(item);
          const description = String(item?.description ?? "").trim();

          return (
            <button
              key={String(item.id)}
              type="button"
              className="w-full rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-brand/25 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
              onClick={() => onOpen(item)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <ActivityPill value={item?.module} />
                  <ActivityPill value={item?.action} />
                </div>
                <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-300" />
              </div>
              <p className="mt-3 truncate text-sm font-semibold text-slate-900" title={entity}>
                {entity}
              </p>
              <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                {description || ACTIVITY_EMPTY_VALUE}
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                <Actor actor={actor} />
                <div className="flex flex-col items-end gap-1.5">
                  <StatusPill method={item?.httpMethod} statusCode={item?.httpStatusCode} />
                  <time className="text-[11px] tabular-nums text-slate-500" title={item?.timestampUtc ?? undefined}>
                    {formatActivityTimestamp(item?.timestampUtc)}
                  </time>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="hidden lg:block">
        <DataTableShell
          columnCount={6}
          minWidth="min-w-[1080px]"
          emptyTitle={items.length === 0 ? "No activity found" : ""}
          emptyHint="Try widening the date range or clearing filters."
          colGroup={
            <colgroup>
              <col className="w-[150px]" />
              <col className="w-[190px]" />
              <col className="w-[210px]" />
              <col />
              <col className="w-[150px]" />
              <col className="w-[64px]" />
            </colgroup>
          }
          head={
            <>
              <th aria-sort={filters.SortBy === "TimestampUtc" ? `${filters.SortDirection}ending` : "none"}>
                <SortHeader field="TimestampUtc" filters={filters} onSort={onSort}>Time</SortHeader>
              </th>
              <th aria-sort={filters.SortBy === "Username" ? `${filters.SortDirection}ending` : "none"}>
                <SortHeader field="Username" filters={filters} onSort={onSort}>Actor</SortHeader>
              </th>
              <th>Event</th>
              <th aria-sort={filters.SortBy === "EntityType" || filters.SortBy === "EntityId" ? `${filters.SortDirection}ending` : "none"}>
                <SortHeader field="EntityType" filters={filters} onSort={onSort}>Target &amp; description</SortHeader>
              </th>
              <th aria-sort={filters.SortBy === "HttpStatusCode" ? `${filters.SortDirection}ending` : "none"}>
                <SortHeader field="HttpStatusCode" filters={filters} onSort={onSort}>Request</SortHeader>
              </th>
              <th><span className="sr-only">Actions</span></th>
            </>
          }
        >
          {items.map((item) => {
            const actor = getActivityActor(item);
            const description = String(item?.description ?? "").trim();
            const entity = getActivityEntityLabel(item);
            const timestamp = getTimestampParts(item?.timestampUtc);

            return (
              <tr
                key={String(item.id)}
                tabIndex={0}
                className="group cursor-pointer focus-visible:bg-brand-light focus-visible:outline-none"
                onClick={() => onOpen(item)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onOpen(item);
                  }
                }}
              >
                <td>
                  <time className="block tabular-nums" title={item?.timestampUtc ?? undefined}>
                    <span className="block whitespace-nowrap text-xs font-semibold text-slate-700">{timestamp.date}</span>
                    {timestamp.time ? (
                      <span className="mt-1 block text-[11px] text-slate-500">{timestamp.time}</span>
                    ) : null}
                  </time>
                </td>
                <td><Actor actor={actor} /></td>
                <td>
                  <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                    <ActivityPill value={item?.module} />
                    <ActivityPill value={item?.action} />
                  </div>
                </td>
                <td>
                  <p className="truncate text-sm font-semibold text-slate-800" title={entity}>
                    {entity}
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500" title={description || undefined}>
                    {description || ACTIVITY_EMPTY_VALUE}
                  </p>
                </td>
                <td><StatusPill method={item?.httpMethod} statusCode={item?.httpStatusCode} /></td>
                <td>
                  <AppTooltip label="View activity details">
                    <button
                      type="button"
                      className={`${DATA_TABLE_ROW_ACTION_CLASS} group-hover:bg-white group-hover:text-brand group-hover:shadow-sm`}
                      aria-label="View activity details"
                      onClick={(event) => {
                        event.stopPropagation();
                        onOpen(item);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </AppTooltip>
                </td>
              </tr>
            );
          })}
        </DataTableShell>
      </div>
    </>
  );
};

export default ActivityLogTable;
