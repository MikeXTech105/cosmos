import {
  Ban,
  Boxes,
  Eye,
  PackageCheck,
  Plus,
  RefreshCw,
  Route,
  Truck,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import AppButton from "../../../components/common/AppButton";
import AppInput from "../../../components/common/AppInput";
import AppDateRangeFilter from "../../../components/common/AppDateRangeFilter";
import AppModal from "../../../components/common/AppModal";
import AppSelect from "../../../components/common/AppSelect";
import AppTooltip from "../../../components/common/AppTooltip";
import DataTableShell, {
  DATA_TABLE_HEADER_CLASS,
  DATA_TABLE_ROW_ACTION_CLASS,
  DATA_TABLE_ROW_ACTION_DANGER_CLASS,
} from "../../../components/common/DataTableShell";
import PageHeader from "../../../components/common/PageHeader";
import StatCards from "../../../components/common/StatCards";
import {
  SHIPMENT_SOURCE_TYPE_LABELS,
  SHIPMENT_STATUS_LABELS,
  toShipmentOptions,
} from "../../../constants/shipmentEnums";
import {
  shipmentReportService,
  shipmentService,
} from "../../../services/shipments";
import { supplyChainWarehouseService } from "../../../services/supplyChain/warehouseService";
import {
  fetchShipments,
  setShipmentFilters,
  setShipmentPage,
  setShipmentPageSize,
} from "../../../store/slices/shipments/shipmentSlice";
import { getApiErrorMessage, isConflictError } from "../../../utils/apiError";
import {
  SupplyChainFilterBar,
  SupplyChainInlineError,
  SupplyChainPagination,
} from "../../supplyChain/SupplyChainShared";
import useSupplyChainChannels from "../../supplyChain/useSupplyChainChannels";
import {
  ShipmentConflict,
  ShipmentPriorityPill,
  ShipmentSourcePill,
  ShipmentStatusPill,
} from "../ShipmentShared";
import {
  formatShipmentDate,
  formatShipmentNumber,
  getShipmentMutationMessage,
} from "../shipmentDisplay";
import { getShipmentActions } from "../shipmentStatus";
import useShipmentCapabilities from "../useShipmentCapabilities";
import { NotesField } from "./ShipmentFormShared";
import { getItems } from "./shipmentFormUtils";

const CancelShipmentModal = ({
  conflict,
  loading,
  onClose,
  onConfirm,
  onRefresh,
  shipment,
}) => {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!shipment) return undefined;
    const timeout = window.setTimeout(() => {
      setReason("");
      setError("");
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [shipment]);

  const confirm = () => {
    const value = reason.trim();
    if (!value) {
      setError("A cancellation reason is required.");
      return;
    }
    onConfirm(value);
  };

  return (
    <AppModal
      isBusy={loading}
      isOpen={Boolean(shipment)}
      title={`Cancel ${shipment?.shipmentNumber || "shipment"}`}
      onClose={loading ? undefined : onClose}
    >
      <p className="text-sm leading-6 text-slate-600">
        Cancellation is an auditable lifecycle action. It does not restore or
        move stock.
      </p>
      <div className="mt-4">
        <NotesField
          disabled={loading}
          error={error}
          id="shipment-cancel-reason"
          label="Cancellation reason"
          value={reason}
          onChange={(value) => {
            setReason(value);
            setError("");
          }}
        />
      </div>
      <div className="mt-4">
        <ShipmentConflict error={conflict} onRefresh={onRefresh} />
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <AppButton disabled={loading} variant="secondary" onClick={onClose}>
          Back
        </AppButton>
        <AppButton
          isLoading={loading}
          loadingText="Cancelling…"
          variant="danger"
          onClick={confirm}
        >
          Cancel shipment
        </AppButton>
      </div>
    </AppModal>
  );
};

const ShipmentWorkListPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const state = useSelector((root) => root.shipments);
  const { channels, error: channelError } = useSupplyChainChannels();
  const capabilities = useShipmentCapabilities();
  const [dashboard, setDashboard] = useState(null);
  const [dashboardError, setDashboardError] = useState("");
  const [warehouses, setWarehouses] = useState([]);
  const [cancelShipment, setCancelShipment] = useState(null);
  const [cancelConflict, setCancelConflict] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const params = useMemo(
    () => ({
      ...state.filters,
      PageNumber: state.pageNumber,
      PageSize: state.pageSize,
    }),
    [state.filters, state.pageNumber, state.pageSize],
  );

  const loadList = useCallback(
    () => dispatch(fetchShipments(params)),
    [dispatch, params],
  );

  const loadDashboard = useCallback(async () => {
    try {
      const response = await shipmentReportService.dashboard();
      setDashboard(response.data ?? null);
      setDashboardError("");
    } catch (error) {
      setDashboard(null);
      setDashboardError(
        getApiErrorMessage(error, "Unable to load shipment totals."),
      );
    }
  }, []);

  const refresh = useCallback(async () => {
    await Promise.all([loadList(), loadDashboard()]);
  }, [loadDashboard, loadList]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadList(), 180);
    return () => window.clearTimeout(timeout);
  }, [loadList]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadDashboard(), 0);
    return () => window.clearTimeout(timeout);
  }, [loadDashboard]);

  useEffect(() => {
    let current = true;
    const load = async () => {
      try {
        const response = await supplyChainWarehouseService.dropdown({
          channelId: state.filters.ChannelId || undefined,
        });
        if (!current) return;
        setWarehouses(
          Array.isArray(response.data)
            ? response.data
            : getItems(response),
        );
      } catch {
        if (current) setWarehouses([]);
      }
    };
    void load();
    return () => {
      current = false;
    };
  }, [state.filters.ChannelId]);


  const setFilters = (patch) => dispatch(setShipmentFilters(patch));
  const activeFilterCount = Object.values(state.filters).filter(Boolean).length;

  const confirmCancel = async (reason) => {
    if (!cancelShipment) return;

    setCancelling(true);
    setCancelConflict(null);
    try {
      const response = await shipmentService.cancel(cancelShipment.id, reason);
      await shipmentService.getById(cancelShipment.id);
      toast.success(response.message || "Shipment cancelled.");
      setCancelShipment(null);
      await refresh();
    } catch (error) {
      const message = getShipmentMutationMessage(
        error,
        "Unable to cancel this shipment.",
      );
      if (isConflictError(error)) setCancelConflict(error);
      toast.error(message);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <section className="min-w-0 space-y-5">
      <PageHeader
        badge="Shipment Operations"
        description="Run the operational work list from packing through dispatch, delivery, returns and closure."
        title="Shipment work list"
        actions={
          <>
            <AppButton
              disabled={state.loading}
              variant="secondary"
              onClick={() => void refresh()}
            >
              <RefreshCw
                className={`h-4 w-4 ${state.loading ? "animate-spin" : ""}`}
              />
              Refresh
            </AppButton>
            {capabilities.canCreate ? (
              <>
                <AppButton
                  variant="secondary"
                  onClick={() => navigate("/shipments/work-list/new-from-plan")}
                >
                  <Route className="h-4 w-4" />
                  From dispatch plan
                </AppButton>
                <AppButton onClick={() => navigate("/shipments/work-list/new")}>
                  <Plus className="h-4 w-4" />
                  Manual shipment
                </AppButton>
              </>
            ) : null}
          </>
        }
      />

      <StatCards
        loading={!dashboard && !dashboardError}
        cards={[
          {
            icon: Boxes,
            label: "Draft",
            value: dashboard?.draftCount,
          },
          {
            icon: PackageCheck,
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
            label: "Returns in progress",
            value: dashboard?.returnInProgressCount,
          },
        ]}
      />

      <SupplyChainFilterBar
        activeFilterCount={activeFilterCount}
        onClear={() =>
          setFilters({
            ChannelId: "",
            FromDate: "",
            Search: "",
            SourceType: "",
            Status: "",
            ToDate: "",
            WarehouseId: "",
          })
        }
      >
        <AppInput
          className="w-64"
          label="Search"
          placeholder="Shipment, invoice or STO"
          value={state.filters.Search}
          onChange={(event) => setFilters({ Search: event.target.value })}
        />
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
        <AppSelect
          className="w-48"
          label="Source"
          options={[
            { label: "All sources", value: "" },
            ...toShipmentOptions(SHIPMENT_SOURCE_TYPE_LABELS),
          ]}
          value={state.filters.SourceType}
          onChange={(value) => setFilters({ SourceType: value })}
        />
<AppDateRangeFilter
            className="w-full sm:col-span-2 sm:min-w-[260px]"
            fromDate={state.filters.FromDate}
            toDate={state.filters.ToDate}
            allowLifetime={true}
            onChange={({ fromDate, toDate }) => setFilters({ FromDate: fromDate, ToDate: toDate })}
          />
      </SupplyChainFilterBar>

      <SupplyChainInlineError
        message={channelError}
        title="Channels unavailable"
      />
      <SupplyChainInlineError
        message={dashboardError}
        title="Shipment totals unavailable"
        onRetry={loadDashboard}
      />
      <SupplyChainInlineError
        message={state.error}
        title="Shipment work list unavailable"
        onRetry={loadList}
      />

      <DataTableShell
        colGroup={
          <colgroup>
            <col className="w-[56px]" />
            <col className="w-40" />
            <col className="w-32" />
            <col className="w-28" />
            <col className="w-52" />
            <col className="w-40" />
            <col className="w-24" />
            <col className="w-24" />
            <col className="w-28" />
            <col className="w-24" />
            <col className="w-28" />
            <col className="w-44" />
            <col className="w-24" />
          </colgroup>
        }
        columnCount={13}
        emptyHint="Adjust the filters or create a manual shipment."
        emptyTitle={
          !state.loading && state.list.length === 0
            ? "No shipments match this work list"
            : undefined
        }
        head={
          <>
            <th className={DATA_TABLE_HEADER_CLASS}>#</th>
            <th className={DATA_TABLE_HEADER_CLASS}>Shipment no.</th>
            <th className={DATA_TABLE_HEADER_CLASS}>Date</th>
            <th className={DATA_TABLE_HEADER_CLASS}>Channel</th>
            <th className={DATA_TABLE_HEADER_CLASS}>Warehouse</th>
            <th className={DATA_TABLE_HEADER_CLASS}>Source</th>
            <th className={`${DATA_TABLE_HEADER_CLASS} text-right`}>
              Planned
            </th>
            <th className={`${DATA_TABLE_HEADER_CLASS} text-right`}>
              Packed
            </th>
            <th className={`${DATA_TABLE_HEADER_CLASS} text-right`}>
              Dispatched
            </th>
            <th className={`${DATA_TABLE_HEADER_CLASS} text-right`}>
              Packages
            </th>
            <th className={DATA_TABLE_HEADER_CLASS}>Priority</th>
            <th className={DATA_TABLE_HEADER_CLASS}>Status</th>
            <th className={`${DATA_TABLE_HEADER_CLASS} text-right`}>
              Actions
            </th>
          </>
        }
        loading={state.loading}
        minWidth="min-w-[1540px]"
      >
        {state.list.map((shipment, index) => {
          const actions = getShipmentActions(shipment, capabilities);

          return (
            <tr
              className="cursor-pointer"
              key={shipment.id}
              onClick={() =>
                navigate(`/shipments/work-list/${shipment.id}`)
              }
            >
              <td className="px-4 py-3.5 text-xs font-semibold tabular-nums text-slate-400">
                {(state.pageNumber - 1) * state.pageSize + index + 1}
              </td>
              <td className="font-semibold text-slate-900">
                {shipment.shipmentNumber}
              </td>
              <td>{formatShipmentDate(shipment.shipmentDate)}</td>
              <td>{shipment.channelCode || "—"}</td>
              <td>
                <p className="font-medium text-slate-900">
                  {shipment.warehouseCode || "—"}
                </p>
                <p className="text-xs text-slate-500">
                  {shipment.warehouseName}
                </p>
              </td>
              <td>
                <ShipmentSourcePill sourceType={shipment.sourceType} />
              </td>
              <td className="text-right tabular-nums">
                {formatShipmentNumber(shipment.totalPlannedQuantity, "0")}
              </td>
              <td className="text-right tabular-nums">
                {formatShipmentNumber(shipment.totalPackedQuantity, "0")}
              </td>
              <td className="text-right font-semibold tabular-nums text-amber-700">
                {formatShipmentNumber(shipment.totalDispatchedQuantity, "0")}
              </td>
              <td className="text-right tabular-nums">
                {formatShipmentNumber(shipment.totalPackages, "0")}
              </td>
              <td>
                <ShipmentPriorityPill priority={shipment.priority} />
              </td>
              <td>
                <ShipmentStatusPill status={shipment.status} />
              </td>
              <td onClick={(event) => event.stopPropagation()}>
                <div className="flex items-center justify-end gap-0.5">
                  <AppTooltip label="Open shipment">
                    <button
                      aria-label={`Open ${shipment.shipmentNumber}`}
                      className={DATA_TABLE_ROW_ACTION_CLASS}
                      type="button"
                      onClick={() =>
                        navigate(`/shipments/work-list/${shipment.id}`)
                      }
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </AppTooltip>
                  {actions.cancel.enabled ? (
                    <AppTooltip label="Cancel shipment">
                      <button
                        aria-label={`Cancel ${shipment.shipmentNumber}`}
                        className={DATA_TABLE_ROW_ACTION_DANGER_CLASS}
                        type="button"
                        onClick={() => setCancelShipment(shipment)}
                      >
                        <Ban className="h-4 w-4" />
                      </button>
                    </AppTooltip>
                  ) : (
                    <AppTooltip label={actions.cancel.reason}>
                      <button
                        aria-label={`Cannot cancel ${shipment.shipmentNumber}`}
                        className={DATA_TABLE_ROW_ACTION_DANGER_CLASS}
                        disabled
                        type="button"
                      >
                        <Ban className="h-4 w-4" />
                      </button>
                    </AppTooltip>
                  )}
                </div>
              </td>
            </tr>
          );
        })}
      </DataTableShell>

      <SupplyChainPagination
        disabled={state.loading}
        pageNumber={state.pageNumber}
        pageSize={state.pageSize}
        totalCount={state.totalCount}
        totalPages={state.totalPages}
        onPageChange={(value) => dispatch(setShipmentPage(value))}
        onPageSizeChange={(value) => dispatch(setShipmentPageSize(value))}
      />

      <CancelShipmentModal
        conflict={cancelConflict}
        loading={cancelling}
        shipment={cancelShipment}
        onClose={() => {
          setCancelShipment(null);
          setCancelConflict(null);
        }}
        onConfirm={(reason) => void confirmCancel(reason)}
        onRefresh={() => {
          setCancelConflict(null);
          void refresh();
        }}
      />
    </section>
  );
};

export default ShipmentWorkListPage;
