import { AlertTriangle, Boxes, FileWarning, ReceiptText, WalletCards } from "lucide-react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { isRouteAuthorized } from "../../../utils/authorizedRoute";
import { getAlertLink } from "../alertLinks";

import AppInput from "../../../components/common/AppInput";
import AppSelect from "../../../components/common/AppSelect";
import {
  DASHBOARD_PREVIEW_OPTIONS,
  formatCurrency,
  formatNumber,
  normalizeDashboardNumberInput,
} from "../dashboardHelpers";
import {
  ListSkeleton,
  WidgetCard,
  WidgetEmpty,
  WidgetError,
} from "./WidgetState";

const bucketMeta = {
  gst: {
    className: "bg-sky-50 text-sky-700 ring-sky-200",
    icon: FileWarning,
    label: "GST",
    route: "/gst/configuration",
  },
  inventory: {
    className: "bg-amber-50 text-amber-700 ring-amber-200",
    icon: Boxes,
    label: "Inventory",
    route: "/reports/inventory/low-stock",
  },
  payables: {
    className: "bg-red-50 text-red-700 ring-red-200",
    icon: WalletCards,
    label: "Payables",
    route: "/reports/purchase/payables",
  },
  receivables: {
    className: "bg-red-50 text-red-700 ring-red-200",
    icon: ReceiptText,
    label: "Receivables",
    route: "/reports/sales/receivables",
  },
};

const getBuckets = (alerts) => {
  return ["inventory", "receivables", "payables", "gst"]
    .map((key) => ({
      key,
      meta: bucketMeta[key],
      value: alerts?.[key],
    }))
    .filter((entry) => entry.value);
};

const AlertsPanel = ({
  alerts,
  error,
  filters,
  isLoading,
  onChange,
  onRetry,
}) => {
  const auth = useSelector((state) => state.auth);
  const allowedLink = (link) => link && isRouteAuthorized({ ...auth, route: link.split("?")[0] });
  const buckets = getBuckets(alerts);

  return (
    <WidgetCard
      title="Alerts"
      description="Operational exceptions that need attention."
      actions={
        <>
          <AppSelect
            value={filters.previewLimit}
            onChange={(value) => onChange({ previewLimit: Number(value) })}
            options={DASHBOARD_PREVIEW_OPTIONS.map((value) => ({
              label: `${value} previews`,
              value,
            }))}
            className="w-36"
            aria-label="Alert preview limit"
          />
          <AppInput
            value={filters.minimumAmount ?? ""}
            onChange={(event) =>
              onChange({
                minimumAmount: normalizeDashboardNumberInput(event.target.value),
              })
            }
            placeholder="Min amount"
            className="h-10 w-32"
            aria-label="Minimum alert amount"
          />
        </>
      }
    >
      {isLoading ? (
        <ListSkeleton rows={4} />
      ) : error ? (
        <WidgetError message={error} onRetry={onRetry} />
      ) : buckets.length === 0 ? (
        <WidgetEmpty message="No active alerts." />
      ) : (
        <div className="grid gap-3">
          {buckets.map(({ key, meta, value }) => {
            const Icon = meta.icon;
            const previewRows = Array.isArray(value.previewRows)
              ? value.previewRows
              : [];

            return (
              <div
                key={key}
                className="rounded-xl border border-slate-100 px-3 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={[
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset",
                        meta.className,
                      ].join(" ")}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">
                        {meta.label}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {value.alertType ?? "Attention required"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold tabular-nums text-slate-900">
                      {formatNumber(value.count)}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      {formatCurrency(value.amount)}
                    </p>
                  </div>
                </div>

                {previewRows.length > 0 && (
                  <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                    {previewRows.map((row, index) => (
                      <div
                        key={`${row.entityId ?? row.referenceNumber ?? index}`}
                        className="flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0">
                          {allowedLink(getAlertLink(key, row, filters)) ? <Link to={getAlertLink(key, row, filters)} className="block truncate font-medium text-brand hover:underline">{row.title ?? row.referenceNumber ?? "Alert item"}</Link> : <p className="truncate font-medium text-slate-700">{row.title ?? row.referenceNumber ?? "Alert item"}</p>}
                          <p className="mt-0.5 truncate text-slate-400">
                            {[row.referenceNumber, row.severity]
                              .filter(Boolean)
                              .join(" - ")}
                          </p>
                        </div>
                        <span className="shrink-0 font-semibold tabular-nums text-slate-700">
                          {formatCurrency(row.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {allowedLink(getAlertLink(key, null, filters)) && <Link
                  to={getAlertLink(key, null, filters)}
                  className="mt-3 inline-flex text-xs font-semibold text-brand hover:text-brand-dark"
                >
                  View all
                </Link>}
              </div>
            );
          })}
        </div>
      )}

      {!isLoading && !error && buckets.length > 0 && (
        <p className="mt-3 flex items-center gap-2 text-xs text-slate-400">
          <AlertTriangle className="h-3.5 w-3.5" />
          Generated from live dashboard alert buckets.
        </p>
      )}
    </WidgetCard>
  );
};

export default AlertsPanel;
