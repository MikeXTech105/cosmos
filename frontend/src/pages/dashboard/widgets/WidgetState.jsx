import { FileSearch, RefreshCw } from "lucide-react";

import AppButton from "../../../components/common/AppButton";
import EmptyState from "../../../components/common/EmptyState";

export const StatSkeleton = () => {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="h-10 w-10 animate-pulse rounded-xl bg-brand-light" />
      <div className="mt-4 h-2.5 w-24 animate-pulse rounded-full bg-slate-100" />
      <div className="mt-3 h-6 w-28 animate-pulse rounded-md bg-slate-100" />
      <div className="mt-2 h-3 w-20 animate-pulse rounded-full bg-slate-100" />
    </div>
  );
};

export const ChartSkeleton = ({ tall = false }) => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="h-3 w-32 animate-pulse rounded-full bg-slate-100" />
      <div
        className={[
          "mt-5 animate-pulse rounded-xl bg-slate-100",
          tall ? "h-[280px]" : "h-[180px]",
        ].join(" ")}
      />
    </div>
  );
};

export const ListSkeleton = ({ rows = 5 }) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-3">
          <div className="h-8 w-8 animate-pulse rounded-full bg-slate-100" />
          <div className="min-w-0 flex-1">
            <div className="h-3 w-40 animate-pulse rounded-full bg-slate-100" />
            <div className="mt-2 h-2.5 w-24 animate-pulse rounded-full bg-slate-100" />
          </div>
          <div className="h-4 w-20 animate-pulse rounded-full bg-slate-100" />
        </div>
      ))}
    </div>
  );
};

export const WidgetCard = ({ actions, children, description, title }) => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          {description && (
            <p className="mt-1 text-sm leading-6 text-slate-500">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
};

export const WidgetError = ({ message, onRetry }) => {
  return (
    <div
      role="alert"
      className="rounded-xl border border-red-100 bg-red-50 px-4 py-4"
    >
      <h3 className="text-sm font-semibold text-red-700">
        Unable to load this widget
      </h3>
      <p className="mt-1 text-sm leading-6 text-red-600">
        {message ?? "The backend did not return data for this widget."}
      </p>
      {onRetry && (
        <AppButton
          variant="secondary"
          className="mt-3 h-9 rounded-lg border-red-200 bg-white px-3 text-red-700 hover:bg-red-50"
          onClick={onRetry}
        >
          <RefreshCw aria-hidden="true" className="h-4 w-4" />
          Retry
        </AppButton>
      )}
    </div>
  );
};

export const WidgetEmpty = ({
  hint = "Activity will appear here once it is recorded.",
  message = "No activity for this period",
}) => {
  return (
    <div className="min-h-[180px] rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4">
      <EmptyState
        hint={hint}
        icon={FileSearch}
        title={message}
      />
    </div>
  );
};

export const RankBadge = ({ rank }) => {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-light text-xs font-bold text-brand ring-1 ring-inset ring-brand/10">
      {rank ?? "-"}
    </span>
  );
};
