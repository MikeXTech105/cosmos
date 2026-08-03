import {
  AlertTriangle,
  ArrowDownToLine,
  Banknote,
  Boxes,
  CheckCircle2,
  Clock3,
  RefreshCw,
  RotateCcw,
  Route,
  Truck,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import AppButton from "../../../components/common/AppButton";
import AppInput from "../../../components/common/AppInput";
import PageHeader from "../../../components/common/PageHeader";
import StatCards from "../../../components/common/StatCards";
import { SHIPMENT_STATUS } from "../../../constants/shipmentEnums";
import {
  shipmentReportService,
  shipmentService,
} from "../../../services/shipments";
import { getApiErrorMessage } from "../../../utils/apiError";
import {
  SupplyChainFilterBar,
  SupplyChainInlineError,
} from "../../supplyChain/SupplyChainShared";
import {
  ShipmentPriorityPill,
  ShipmentStatusPill,
} from "../ShipmentShared";
import {
  formatShipmentCurrency,
  formatShipmentDate,
  formatShipmentNumber,
} from "../shipmentDisplay";

const today = () => {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000)
    .toISOString()
    .slice(0, 10);
};

const ShipmentDashboardPage = () => {
  const [asOfDate, setAsOfDate] = useState(today);
  const [dashboard, setDashboard] = useState(null);
  const [attention, setAttention] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      // BACKEND: ShipmentDashboardDto exposes overdueCount but no overdue
      // shipment rows, and the shipment list contract has no overdue filter.
      // The attention list can therefore load DeliveryAttempted rows only.
      const [dashboardResponse, attentionResponse] = await Promise.all([
        shipmentReportService.dashboard({ asOfDate }),
        shipmentService.list({
          PageNumber: 1,
          PageSize: 8,
          Status: SHIPMENT_STATUS.DeliveryAttempted,
        }),
      ]);
      setDashboard(dashboardResponse.data ?? null);
      setAttention(
        Array.isArray(attentionResponse.data?.items)
          ? attentionResponse.data.items
          : [],
      );
    } catch (requestError) {
      setDashboard(null);
      setAttention([]);
      setError(
        getApiErrorMessage(
          requestError,
          "Unable to load the shipment dashboard.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [asOfDate]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 160);
    return () => window.clearTimeout(timeout);
  }, [load]);

  const chartData = [
    {
      name: "Quantity",
      Delivered: Number(dashboard?.deliveredQuantity || 0),
      Dispatched: Number(dashboard?.dispatchedQuantity || 0),
    },
  ];

  return (
    <section className="min-w-0 space-y-5">
      <PageHeader
        badge="Shipment Operations"
        description="See operational volume, exceptions, delivery attempts, returns and open freight at a glance."
        title="Shipment dashboard"
        actions={
          <AppButton
            disabled={loading}
            variant="secondary"
            onClick={() => void load()}
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </AppButton>
        }
      />

      <SupplyChainFilterBar
        activeFilterCount={asOfDate === today() ? 0 : 1}
        onClear={() => setAsOfDate(today())}
      >
        <AppInput
          className="w-52"
          label="As of date"
          type="date"
          value={asOfDate}
          onChange={(event) => setAsOfDate(event.target.value)}
        />
      </SupplyChainFilterBar>

      <SupplyChainInlineError
        message={error}
        title="Shipment dashboard unavailable"
        onRetry={load}
      />

      <StatCards
        loading={loading}
        cards={[
          { icon: Boxes, label: "Draft", value: dashboard?.draftCount },
          {
            icon: ArrowDownToLine,
            label: "Ready for dispatch",
            value: dashboard?.readyForDispatchCount,
          },
          {
            icon: Truck,
            label: "In transit",
            value: dashboard?.inTransitCount,
          },
          {
            icon: Route,
            label: "Delivery attempts",
            value: dashboard?.deliveryAttemptCount,
          },
          {
            icon: RotateCcw,
            label: "Returns in progress",
            value: dashboard?.returnInProgressCount,
          },
          {
            icon: AlertTriangle,
            label: "Overdue",
            value: dashboard?.overdueCount,
          },
          {
            icon: ArrowDownToLine,
            label: "Dispatched quantity",
            value: dashboard?.dispatchedQuantity,
            formatValue: formatShipmentNumber,
          },
          {
            icon: CheckCircle2,
            label: "Delivered quantity",
            value: dashboard?.deliveredQuantity,
            formatValue: formatShipmentNumber,
          },
          {
            icon: Banknote,
            label: "Open freight amount",
            value: dashboard?.openFreightAmount,
            formatValue: formatShipmentCurrency,
          },
        ]}
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,1fr)]">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">
            Dispatched vs delivered
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Server totals as of {formatShipmentDate(asOfDate)}.
          </p>
          {loading ? (
            <div className="mt-4 h-72 animate-pulse rounded-lg bg-slate-100" />
          ) : (
            <div className="mt-4 h-72">
              <ResponsiveContainer height="100%" width="100%">
                <BarChart
                  data={chartData}
                  margin={{ bottom: 0, left: 0, right: 12, top: 8 }}
                >
                  <CartesianGrid
                    stroke="var(--color-slate-200)"
                    strokeDasharray="3 3"
                    vertical={false}
                  />
                  <XAxis
                    axisLine={false}
                    dataKey="name"
                    tick={{ fill: "var(--color-slate-500)", fontSize: 11 }}
                    tickLine={false}
                  />
                  <YAxis
                    axisLine={false}
                    tick={{ fill: "var(--color-slate-500)", fontSize: 11 }}
                    tickFormatter={(value) =>
                      Number(value).toLocaleString("en-IN", {
                        notation: "compact",
                      })
                    }
                    tickLine={false}
                    width={56}
                  />
                  <Tooltip />
                  <Bar
                    dataKey="Dispatched"
                    fill="var(--color-brand)"
                    radius={[6, 6, 0, 0]}
                  />
                  <Bar
                    dataKey="Delivered"
                    fill="var(--color-emerald-500)"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3">
            <h2 className="text-base font-semibold text-slate-900">
              Needs attention
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Current delivery-attempted shipments. The dashboard exposes an
              overdue count, but not overdue shipment rows.
            </p>
          </div>
          <div className="divide-y divide-slate-100">
            {loading ? (
              Array.from({ length: 4 }, (_, index) => (
                <div className="px-4 py-4" key={index}>
                  <div className="h-4 animate-pulse rounded bg-slate-100" />
                </div>
              ))
            ) : attention.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <Clock3 className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-3 text-sm font-medium text-slate-900">
                  No delivery-attempted shipments
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Exceptions will appear here when the server returns them.
                </p>
              </div>
            ) : (
              attention.map((shipment) => (
                <Link
                  className="block px-4 py-3 transition hover:bg-slate-50"
                  key={shipment.id}
                  to={`/shipments/work-list/${shipment.id}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {shipment.shipmentNumber}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {shipment.channelCode} → {shipment.warehouseCode} ·{" "}
                        {formatShipmentDate(shipment.expectedDeliveryDate)}
                      </p>
                    </div>
                    <ShipmentStatusPill status={shipment.status} />
                  </div>
                  <div className="mt-2">
                    <ShipmentPriorityPill priority={shipment.priority} />
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ShipmentDashboardPage;
