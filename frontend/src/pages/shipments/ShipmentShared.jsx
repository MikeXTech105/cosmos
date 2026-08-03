import {
  AlertCircle,
  Circle,
  PackageCheck,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";

import AppButton from "../../components/common/AppButton";
import AppTooltip from "../../components/common/AppTooltip";
import {
  SHIPMENT_FREIGHT_STATUS_LABELS,
  SHIPMENT_FREIGHT_STATUS_TONES,
  SHIPMENT_PRIORITY_LABELS,
  SHIPMENT_PRIORITY_TONES,
  SHIPMENT_RETURN_STATUS_LABELS,
  SHIPMENT_RETURN_STATUS_TONES,
  SHIPMENT_SOURCE_TYPE,
  SHIPMENT_SOURCE_TYPE_LABELS,
  SHIPMENT_SOURCE_TYPE_TONES,
} from "../../constants/shipmentEnums";
import { getApiCorrelationId, getApiErrorMessage } from "../../utils/apiError";
import { getStatusLabel, getStatusTone } from "./shipmentStatus";

const TONES = {
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
  brand: "bg-brand-light text-brand ring-brand/20",
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  orange: "bg-orange-50 text-orange-700 ring-orange-200",
  red: "bg-red-50 text-red-700 ring-red-200",
  rose: "bg-rose-50 text-rose-700 ring-rose-200",
  sky: "bg-sky-50 text-sky-700 ring-sky-200",
  slate: "bg-slate-50 text-slate-600 ring-slate-200",
  violet: "bg-violet-50 text-violet-700 ring-violet-200",
};

export const ShipmentPill = ({ children, tone = "slate" }) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${TONES[tone] ?? TONES.slate}`}
  >
    <Circle className="h-1.5 w-1.5 fill-current" aria-hidden="true" />
    {children}
  </span>
);

export const ShipmentStatusPill = ({ status }) => (
  <ShipmentPill tone={getStatusTone(status)}>
    {getStatusLabel(status)}
  </ShipmentPill>
);

export const ShipmentPriorityPill = ({ priority }) => (
  <ShipmentPill tone={SHIPMENT_PRIORITY_TONES[priority]}>
    {SHIPMENT_PRIORITY_LABELS[priority] ?? priority ?? "—"}
  </ShipmentPill>
);

export const ShipmentSourcePill = ({ sourceType }) => {
  const pill = (
    <ShipmentPill tone={SHIPMENT_SOURCE_TYPE_TONES[sourceType]}>
      {SHIPMENT_SOURCE_TYPE_LABELS[sourceType] ?? sourceType ?? "—"}
    </ShipmentPill>
  );

  return sourceType === SHIPMENT_SOURCE_TYPE.HistoricalImport ? (
    <AppTooltip label="Imported history, no stock effect.">{pill}</AppTooltip>
  ) : (
    pill
  );
};

export const ShipmentFreightStatusPill = ({ status }) => (
  <ShipmentPill tone={SHIPMENT_FREIGHT_STATUS_TONES[status]}>
    {SHIPMENT_FREIGHT_STATUS_LABELS[status] ?? status ?? "—"}
  </ShipmentPill>
);

export const ShipmentReturnStatusPill = ({ status }) => (
  <ShipmentPill tone={SHIPMENT_RETURN_STATUS_TONES[status]}>
    {SHIPMENT_RETURN_STATUS_LABELS[status] ?? status ?? "—"}
  </ShipmentPill>
);

export const DisabledShipmentAction = ({ children, reason }) => (
  <AppTooltip label={reason}>
    <span className="inline-flex">{children}</span>
  </AppTooltip>
);

export const ShipmentConflict = ({
  error,
  message,
  onRefresh,
  title = "This shipment changed on the server",
}) => {
  const correlationId = error ? getApiCorrelationId(error) : "";
  const displayMessage = message || (error ? getApiErrorMessage(error) : "");

  if (!displayMessage) return null;

  return (
    <div
      className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900 sm:flex-row sm:items-start sm:justify-between"
      role="alert"
    >
      <div className="flex min-w-0 items-start gap-3">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="mt-0.5 whitespace-pre-line text-xs leading-5">
            {displayMessage}
          </p>
          {correlationId ? (
            <p className="mt-1 text-[11px] font-medium">
              Reference: {correlationId}
            </p>
          ) : null}
        </div>
      </div>
      {onRefresh ? (
        <AppButton
          className="shrink-0"
          variant="secondary"
          onClick={onRefresh}
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </AppButton>
      ) : null}
    </div>
  );
};

export const InventoryEffectNotice = ({ type = "none" }) => {
  if (type === "dispatch") {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <div className="flex items-start gap-2">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Dispatch is the stock-out event. Stock decreases only when the
            server moves this shipment from Ready for dispatch to Dispatched.
          </p>
        </div>
      </div>
    );
  }

  if (type === "return") {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
        <div className="flex items-start gap-2">
          <PackageCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Only the restockable quantity is added back to stock when a return
            is received.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600">
      This action records shipment operations only. It does not change current
      stock.
    </div>
  );
};
