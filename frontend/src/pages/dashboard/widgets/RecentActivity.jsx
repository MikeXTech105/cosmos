import { ArrowRight, History } from "lucide-react";
import { Link } from "react-router-dom";

import useCapabilities from "../../../hooks/useCapabilities";
import {
  ACTIVITY_EMPTY_VALUE,
  formatRelativeActivityTime,
  getActivityActor,
  getActivityEntityLabel,
} from "../../../utils/activityLogPresentation";
import useActivityLogsCapabilities from "../../activityLogs/useActivityLogsCapabilities";
import {
  ListSkeleton,
  WidgetCard,
  WidgetEmpty,
  WidgetError,
} from "./WidgetState";

const extractRows = (data) => {
  if (Array.isArray(data)) return data.slice(0, 10);
  return Array.isArray(data?.items) ? data.items.slice(0, 10) : [];
};

const RecentActivity = ({ data, error, errorStatus, isLoading, onRetry }) => {
  const dashboardCapabilities = useCapabilities({
    actions: ["view"],
    label: "Dashboard",
    pageName: "Dashboard",
    resource: "Dashboard",
    route: "/dashboard",
  });
  const activityCapabilities = useActivityLogsCapabilities();

  if (!dashboardCapabilities.canView || errorStatus === 403) return null;

  const rows = extractRows(data);

  return (
    <WidgetCard
      title="Recent activity"
      description="The latest recorded changes across COSMOS."
      actions={
        activityCapabilities.canView ? (
          <Link
            to="/activity-logs"
            className="inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-brand transition-colors hover:bg-brand-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/20"
          >
            View all activity
            <ArrowRight className="h-4 w-4" />
          </Link>
        ) : null
      }
    >
      {isLoading ? (
        <ListSkeleton rows={5} />
      ) : error ? (
        <WidgetError message={error} onRetry={onRetry} />
      ) : rows.length === 0 ? (
        <WidgetEmpty message="No recent activity recorded." />
      ) : (
        <div className="divide-y divide-slate-100">
          {rows.map((activity, index) => {
            const actor = getActivityActor(activity);
            const description =
              String(activity?.description ?? "").trim() ||
              [activity?.action, getActivityEntityLabel(activity)]
                .filter((value) => value && value !== ACTIVITY_EMPTY_VALUE)
                .join(" · ") ||
              ACTIVITY_EMPTY_VALUE;

            return (
              <div
                key={String(activity?.id ?? `${activity?.timestampUtc}-${index}`)}
                className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
              >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-light text-brand">
                  <History className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-slate-700" title={description}>
                    {description}
                  </p>
                  <p className={`mt-1 truncate text-xs ${actor.isSystem ? "italic text-slate-400" : "text-slate-500"}`}>
                    {actor.primary}
                  </p>
                </div>
                <time
                  className="shrink-0 text-xs tabular-nums text-slate-400"
                  title={activity?.timestampUtc ?? undefined}
                >
                  {formatRelativeActivityTime(activity?.timestampUtc)}
                </time>
              </div>
            );
          })}
        </div>
      )}
    </WidgetCard>
  );
};

export default RecentActivity;
