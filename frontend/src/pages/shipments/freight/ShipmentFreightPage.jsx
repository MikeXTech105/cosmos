import {
  BadgeCheck,
  Banknote,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  Send,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import AppButton from "../../../components/common/AppButton";
import AppInput from "../../../components/common/AppInput";
import AppSelect from "../../../components/common/AppSelect";
import AppTooltip from "../../../components/common/AppTooltip";
import DataTableShell, {
  DATA_TABLE_HEADER_CLASS,
  DATA_TABLE_ROW_ACTION_CLASS,
} from "../../../components/common/DataTableShell";
import PageHeader from "../../../components/common/PageHeader";
import StatCards from "../../../components/common/StatCards";
import {
  SHIPMENT_FREIGHT_CHARGE_TYPE_LABELS,
  SHIPMENT_FREIGHT_STATUS,
  SHIPMENT_FREIGHT_STATUS_LABELS,
  toShipmentOptions,
} from "../../../constants/shipmentEnums";
import { shipmentService } from "../../../services/shipments";
import { getApiErrorMessage } from "../../../utils/apiError";
import {
  clampShipmentPageSize,
  DEFAULT_SHIPMENT_PAGE_SIZE,
} from "../../../utils/shipmentQuery";
import {
  SupplyChainFilterBar,
  SupplyChainInlineError,
  SupplyChainPagination,
} from "../../supplyChain/SupplyChainShared";
import {
  ShipmentFreightStatusPill,
} from "../ShipmentShared";
import {
  formatShipmentCurrency,
  formatShipmentNumber,
} from "../shipmentDisplay";

const ShipmentFreightPage = () => {
  const [search, setSearch] = useState("");
  const [freightStatus, setFreightStatus] = useState("");
  const [shipments, setShipments] = useState([]);
  const [charges, setCharges] = useState([]);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_SHIPMENT_PAGE_SIZE);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await shipmentService.list({
        PageNumber: pageNumber,
        PageSize: pageSize,
        Search: search,
      });
      const page = response.data ?? {};
      const pageShipments = Array.isArray(page.items) ? page.items : [];
      setShipments(pageShipments);
      setTotalCount(Number(page.totalCount) || 0);
      setTotalPages(Number(page.totalPages) || 1);

      // BACKEND: Shipment Operations publishes no global freight-charge list
      // endpoint. To keep this route operational, flatten freightCharges from
      // the detail DTOs for the current shipment page only.
      const details = await Promise.all(
        pageShipments.map((shipment) =>
          shipmentService.getById(shipment.id),
        ),
      );
      setCharges(
        details.flatMap((detailResponse) => {
          const detail = detailResponse.data;
          return (detail?.freightCharges ?? []).map((charge) => ({
            ...charge,
            shipmentId: detail.id,
            shipmentNumber: detail.shipmentNumber,
          }));
        }),
      );
    } catch (requestError) {
      setShipments([]);
      setCharges([]);
      setError(
        getApiErrorMessage(
          requestError,
          "Unable to load freight charges for this shipment page.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [pageNumber, pageSize, search]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 180);
    return () => window.clearTimeout(timeout);
  }, [load]);

  const visibleCharges = useMemo(
    () =>
      freightStatus
        ? charges.filter((charge) => charge.status === freightStatus)
        : charges,
    [charges, freightStatus],
  );
  const stats = charges.reduce(
    (totals, charge) => {
      if (
        ![
          SHIPMENT_FREIGHT_STATUS.Paid,
          SHIPMENT_FREIGHT_STATUS.Rejected,
          SHIPMENT_FREIGHT_STATUS.Cancelled,
        ].includes(charge.status)
      ) {
        totals.open += 1;
      }
      if (charge.status === SHIPMENT_FREIGHT_STATUS.Submitted) {
        totals.submitted += 1;
      }
      if (
        [SHIPMENT_FREIGHT_STATUS.Approved,
          SHIPMENT_FREIGHT_STATUS.PartiallyPaid].includes(charge.status)
      ) {
        totals.approvedUnpaid += 1;
      }
      if (charge.status === SHIPMENT_FREIGHT_STATUS.Paid) totals.paid += 1;
      return totals;
    },
    { approvedUnpaid: 0, open: 0, paid: 0, submitted: 0 },
  );
  const activeFilterCount = [search, freightStatus].filter(Boolean).length;

  return (
    <section className="min-w-0 space-y-5">
      <PageHeader
        badge="Shipment Operations"
        description="Review charge lifecycles and open each shipment for approval, payment and explicit Rojmel posting."
        title="Freight"
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

      <StatCards
        loading={loading}
        cards={[
          {
            hint: "Loaded shipment page",
            icon: Banknote,
            label: "Open charges",
            value: stats.open,
          },
          {
            hint: "Loaded shipment page",
            icon: Send,
            label: "Submitted",
            value: stats.submitted,
          },
          {
            hint: "Loaded shipment page",
            icon: BadgeCheck,
            label: "Approved unpaid",
            value: stats.approvedUnpaid,
          },
          {
            hint: "Loaded shipment page",
            icon: CheckCircle2,
            label: "Paid",
            value: stats.paid,
          },
        ]}
      />

      <SupplyChainFilterBar
        activeFilterCount={activeFilterCount}
        onClear={() => {
          setSearch("");
          setFreightStatus("");
          setPageNumber(1);
        }}
      >
        <AppInput
          className="w-72"
          label="Search shipments"
          placeholder="Shipment, invoice or STO"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPageNumber(1);
          }}
        />
        <AppSelect
          className="w-52"
          label="Freight status"
          options={[
            { label: "All freight statuses", value: "" },
            ...toShipmentOptions(SHIPMENT_FREIGHT_STATUS_LABELS),
          ]}
          value={freightStatus}
          onChange={setFreightStatus}
        />
      </SupplyChainFilterBar>

      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600">
        The API has no global freight-charge list. This page shows charges
        loaded from {shipments.length} shipment detail
        {shipments.length === 1 ? "" : "s"} on the current shipment page.
        Lifecycle actions remain in each shipment’s Freight tab.
      </div>

      <SupplyChainInlineError
        message={error}
        title="Freight work list unavailable"
        onRetry={load}
      />

      <DataTableShell
        colGroup={
          <colgroup>
            <col className="w-[56px]" />
            <col className="w-44" />
            <col className="w-44" />
            <col className="w-52" />
            <col className="w-36" />
            <col className="w-36" />
            <col className="w-40" />
            <col className="w-32" />
            <col className="w-24" />
          </colgroup>
        }
        columnCount={9}
        emptyHint="Adjust filters or add freight from a shipment detail page."
        emptyTitle={
          !loading && visibleCharges.length === 0
            ? "No freight charges on this shipment page"
            : undefined
        }
        head={
          <>
            <th className={DATA_TABLE_HEADER_CLASS}>#</th>
            <th className={DATA_TABLE_HEADER_CLASS}>Shipment no.</th>
            <th className={DATA_TABLE_HEADER_CLASS}>Charge type</th>
            <th className={DATA_TABLE_HEADER_CLASS}>Transporter</th>
            <th className={`${DATA_TABLE_HEADER_CLASS} text-right`}>
              Chargeable weight
            </th>
            <th className={`${DATA_TABLE_HEADER_CLASS} text-right`}>Total</th>
            <th className={DATA_TABLE_HEADER_CLASS}>Status</th>
            <th className={DATA_TABLE_HEADER_CLASS}>Rojmel posted</th>
            <th className={`${DATA_TABLE_HEADER_CLASS} text-right`}>
              Actions
            </th>
          </>
        }
        loading={loading}
        minWidth="min-w-[1260px]"
      >
        {visibleCharges.map((charge, index) => (
          <tr key={charge.id}>
            <td className="px-4 py-3.5 text-xs font-semibold tabular-nums text-slate-400">
              {index + 1}
            </td>
            <td className="font-semibold text-slate-900">
              {charge.shipmentNumber}
            </td>
            <td>
              {SHIPMENT_FREIGHT_CHARGE_TYPE_LABELS[charge.chargeType] ||
                charge.chargeType}
            </td>
            <td>{charge.transporterName || "—"}</td>
            <td className="text-right tabular-nums">
              {formatShipmentNumber(charge.chargeableWeight, "0")}
            </td>
            <td className="text-right font-semibold tabular-nums">
              {formatShipmentCurrency(
                charge.totalCharge,
                charge.currencyCode,
              )}
            </td>
            <td>
              <ShipmentFreightStatusPill status={charge.status} />
            </td>
            <td>
              {charge.rojmelTransactionId ? (
                <span className="font-semibold text-emerald-700">✓ Yes</span>
              ) : (
                <span className="text-slate-400">—</span>
              )}
            </td>
            <td>
              <div className="flex items-center justify-end">
                <AppTooltip label="Open shipment freight tab">
                  <Link
                    aria-label={`Open freight for ${charge.shipmentNumber}`}
                    className={DATA_TABLE_ROW_ACTION_CLASS}
                    to={`/shipments/work-list/${charge.shipmentId}?tab=freight`}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </AppTooltip>
              </div>
            </td>
          </tr>
        ))}
      </DataTableShell>

      <SupplyChainPagination
        disabled={loading}
        pageNumber={pageNumber}
        pageSize={pageSize}
        totalCount={totalCount}
        totalPages={totalPages}
        onPageChange={setPageNumber}
        onPageSizeChange={(value) => {
          setPageSize(clampShipmentPageSize(value));
          setPageNumber(1);
        }}
      />
    </section>
  );
};

export default ShipmentFreightPage;
