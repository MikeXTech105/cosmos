import {
  ArrowDownToLine,
  Boxes,
  Download,
  RefreshCw,
  RotateCcw,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";

import AppButton from "../../../components/common/AppButton";
import AppDateRangeFilter from "../../../components/common/AppDateRangeFilter";
import AppSelect from "../../../components/common/AppSelect";
import DataTableShell, {
  DATA_TABLE_HEADER_CLASS,
} from "../../../components/common/DataTableShell";
import PageHeader from "../../../components/common/PageHeader";
import StatCards from "../../../components/common/StatCards";
import {
  SHIPMENT_STATUS_LABELS,
  toShipmentOptions,
} from "../../../constants/shipmentEnums";
import { shipmentReportService } from "../../../services/shipments";
import { supplyChainWarehouseService } from "../../../services/supplyChain/warehouseService";
import {
  fetchShipmentReports,
  setShipmentReportFilters,
  setShipmentReportPage,
  setShipmentReportPageSize,
} from "../../../store/slices/shipments/reportSlice";
import {
  downloadResponseBlob,
  getDownloadErrorMessage,
} from "../../../utils/fileDownload";
import {
  SupplyChainFilterBar,
  SupplyChainInlineError,
  SupplyChainPagination,
} from "../../supplyChain/SupplyChainShared";
import useSupplyChainChannels from "../../supplyChain/useSupplyChainChannels";
import {
  ShipmentStatusPill,
} from "../ShipmentShared";
import {
  formatShipmentCurrency,
  formatShipmentDate,
  formatShipmentNumber,
} from "../shipmentDisplay";
import useShipmentCapabilities from "../useShipmentCapabilities";

const ShipmentReportsPage = () => {
  const dispatch = useDispatch();
  const state = useSelector((root) => root.shipmentReports);
  const capabilities = useShipmentCapabilities();
  const { channels, error: channelError } = useSupplyChainChannels();
  const [warehouses, setWarehouses] = useState([]);
  const [warehouseError, setWarehouseError] = useState("");
  const [exporting, setExporting] = useState(false);
  const params = useMemo(
    () => ({
      ...state.filters,
      PageNumber: state.pageNumber,
      PageSize: state.pageSize,
    }),
    [state.filters, state.pageNumber, state.pageSize],
  );
  const load = useCallback(
    () => dispatch(fetchShipmentReports(params)),
    [dispatch, params],
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 180);
    return () => window.clearTimeout(timeout);
  }, [load]);

  useEffect(() => {
    let current = true;
    const loadWarehouses = async () => {
      try {
        const response = await supplyChainWarehouseService.dropdown({
          channelId: state.filters.ChannelId || undefined,
        });
        if (!current) return;
        setWarehouses(
          Array.isArray(response.data)
            ? response.data
            : Array.isArray(response.data?.items)
              ? response.data.items
              : [],
        );
        setWarehouseError("");
      } catch {
        if (current) {
          setWarehouses([]);
          setWarehouseError("Unable to load warehouse filters.");
        }
      }
    };
    void loadWarehouses();
    return () => {
      current = false;
    };
  }, [state.filters.ChannelId]);

  const exportReport = async () => {
    setExporting(true);
    try {
      const response = await shipmentReportService.export(state.filters);
      const filename = await downloadResponseBlob(
        response,
        "shipment-operations.csv",
      );
      toast.success(`${filename} downloaded.`);
    } catch (error) {
      toast.error(
        await getDownloadErrorMessage(
          error,
          "Unable to export shipment reports.",
        ),
      );
    } finally {
      setExporting(false);
    }
  };

  const setFilters = (patch) => dispatch(setShipmentReportFilters(patch));
  const activeFilterCount = Object.values(state.filters).filter(Boolean).length;
  const pageTotals = state.list.reduce(
    (totals, row) => ({
      dispatched:
        totals.dispatched + Number(row.dispatchedQuantity || 0),
      planned: totals.planned + Number(row.plannedQuantity || 0),
      returned: totals.returned + Number(row.returnedQuantity || 0),
    }),
    { dispatched: 0, planned: 0, returned: 0 },
  );

  return (
    <section className="min-w-0 space-y-5">
      <PageHeader
        badge="Shipment Operations"
        description="Review item-level shipment movement, receipt, return, docket and freight figures."
        title="Shipment reports"
        actions={
          <>
            <AppButton
              disabled={state.loading}
              variant="secondary"
              onClick={() => void load()}
            >
              <RefreshCw
                className={`h-4 w-4 ${state.loading ? "animate-spin" : ""}`}
              />
              Refresh
            </AppButton>
            {capabilities.canExportReports ? (
              <AppButton
                isLoading={exporting}
                loadingText="Exporting…"
                variant="secondary"
                onClick={() => void exportReport()}
              >
                <Download className="h-4 w-4" />
                Export
              </AppButton>
            ) : null}
          </>
        }
      />

      <StatCards
        loading={state.loading}
        cards={[
          {
            icon: Boxes,
            label: "Matching rows",
            value: state.totalCount,
          },
          {
            hint: "On this page",
            icon: Boxes,
            label: "Planned quantity",
            value: pageTotals.planned,
            formatValue: formatShipmentNumber,
          },
          {
            hint: "On this page",
            icon: ArrowDownToLine,
            label: "Dispatched quantity",
            value: pageTotals.dispatched,
            formatValue: formatShipmentNumber,
          },
          {
            hint: "On this page",
            icon: RotateCcw,
            label: "Returned quantity",
            value: pageTotals.returned,
            formatValue: formatShipmentNumber,
          },
        ]}
      />

      <SupplyChainFilterBar
        activeFilterCount={activeFilterCount}
        onClear={() =>
          setFilters({
            ChannelId: "",
            FromDate: "",
            Status: "",
            ToDate: "",
            WarehouseId: "",
          })
        }
      >
        <AppSelect
          className="w-52"
          label="Channel"
          options={[
            { label: "All channels", value: "" },
            ...channels.map((channel) => ({
              label: `${channel.code} — ${channel.name}`,
              value: channel.id,
            })),
          ]}
          value={state.filters.ChannelId}
          onChange={(value) =>
            setFilters({ ChannelId: value, WarehouseId: "" })
          }
        />
        <AppSelect
          className="w-56"
          label="Warehouse"
          options={[
            { label: "All warehouses", value: "" },
            ...warehouses.map((warehouse) => ({
              label: `${warehouse.warehouseCode} — ${warehouse.warehouseName}`,
              value: warehouse.id,
            })),
          ]}
          value={state.filters.WarehouseId}
          onChange={(value) => setFilters({ WarehouseId: value })}
        />
        <AppSelect
          className="w-52"
          label="Status"
          options={[
            { label: "All statuses", value: "" },
            ...toShipmentOptions(SHIPMENT_STATUS_LABELS),
          ]}
          value={state.filters.Status}
          onChange={(value) => setFilters({ Status: value })}
        />
<AppDateRangeFilter
            className="w-full sm:col-span-2 sm:min-w-[260px]"
            fromDate={state.filters.FromDate}
            toDate={state.filters.ToDate}
            allowLifetime={false}
            onChange={({ fromDate, toDate }) => setFilters({ FromDate: fromDate, ToDate: toDate })}
          />
      </SupplyChainFilterBar>

      <SupplyChainInlineError
        message={channelError}
        title="Channels unavailable"
      />
      <SupplyChainInlineError
        message={warehouseError}
        title="Warehouses unavailable"
      />
      <SupplyChainInlineError
        message={state.error}
        title="Shipment report unavailable"
        onRetry={load}
      />

      <DataTableShell
        colGroup={
          <colgroup>
            <col className="w-[56px]" />
            <col className="w-40" />
            <col className="w-32" />
            <col className="w-28" />
            <col className="w-32" />
            <col className="w-64" />
            {Array.from({ length: 4 }, (_, index) => (
              <col className="w-28" key={index} />
            ))}
            <col className="w-44" />
            <col className="w-40" />
            <col className="w-36" />
          </colgroup>
        }
        columnCount={13}
        emptyHint="Adjust the filters or complete shipment operations."
        emptyTitle={
          !state.loading && state.list.length === 0
            ? "No shipment report rows match these filters"
            : undefined
        }
        head={
          <>
            <th className={DATA_TABLE_HEADER_CLASS}>#</th>
            <th className={DATA_TABLE_HEADER_CLASS}>Shipment no.</th>
            <th className={DATA_TABLE_HEADER_CLASS}>Date</th>
            <th className={DATA_TABLE_HEADER_CLASS}>Channel</th>
            <th className={DATA_TABLE_HEADER_CLASS}>Warehouse</th>
            <th className={DATA_TABLE_HEADER_CLASS}>Item</th>
            <th className={`${DATA_TABLE_HEADER_CLASS} text-right`}>
              Planned
            </th>
            <th className={`${DATA_TABLE_HEADER_CLASS} text-right`}>
              Dispatched
            </th>
            <th className={`${DATA_TABLE_HEADER_CLASS} text-right`}>
              Received
            </th>
            <th className={`${DATA_TABLE_HEADER_CLASS} text-right`}>
              Returned
            </th>
            <th className={DATA_TABLE_HEADER_CLASS}>Status</th>
            <th className={DATA_TABLE_HEADER_CLASS}>Docket no.</th>
            <th className={`${DATA_TABLE_HEADER_CLASS} text-right`}>
              Freight amount
            </th>
          </>
        }
        loading={state.loading}
        minWidth="min-w-[1600px]"
      >
        {state.list.map((row, index) => (
          <tr
            key={`${row.shipmentNumber}-${row.itemCode}-${index}`}
          >
            <td className="px-4 py-3.5 text-xs font-semibold tabular-nums text-slate-400">
              {(state.pageNumber - 1) * state.pageSize + index + 1}
            </td>
            <td className="font-semibold text-slate-900">
              {row.shipmentNumber}
            </td>
            <td>{formatShipmentDate(row.shipmentDate)}</td>
            <td>{row.channelCode || "—"}</td>
            <td>{row.warehouseCode || "—"}</td>
            <td>
              <p className="font-medium text-slate-900">{row.itemName}</p>
              <p className="text-xs text-slate-500">{row.itemCode}</p>
            </td>
            {[
              row.plannedQuantity,
              row.dispatchedQuantity,
              row.receivedQuantity,
              row.returnedQuantity,
            ].map((value, valueIndex) => (
              <td
                className="text-right tabular-nums"
                key={valueIndex}
              >
                {formatShipmentNumber(value, "0")}
              </td>
            ))}
            <td>
              <ShipmentStatusPill status={row.status} />
            </td>
            <td>{row.docketNumber || "—"}</td>
            <td className="text-right tabular-nums">
              {formatShipmentCurrency(row.freightAmount)}
            </td>
          </tr>
        ))}
      </DataTableShell>

      <SupplyChainPagination
        disabled={state.loading}
        pageNumber={state.pageNumber}
        pageSize={state.pageSize}
        totalCount={state.totalCount}
        totalPages={state.totalPages}
        onPageChange={(value) => dispatch(setShipmentReportPage(value))}
        onPageSizeChange={(value) =>
          dispatch(setShipmentReportPageSize(value))
        }
      />
    </section>
  );
};

export default ShipmentReportsPage;
