import {
  Boxes,
  Download,
  ListChecks,
  RefreshCw,
  Warehouse,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";

import AppButton from "../../../components/common/AppButton";
import AppInput from "../../../components/common/AppInput";
import AppSelect from "../../../components/common/AppSelect";
import DataTableShell, {
  DATA_TABLE_HEADER_CLASS,
} from "../../../components/common/DataTableShell";
import PageHeader from "../../../components/common/PageHeader";
import StatCards from "../../../components/common/StatCards";
import {
  DISPATCH_RUN_STATUS_LABELS,
  toDispatchOptions,
} from "../../../constants/dispatchEnums";
import { dispatchReportService } from "../../../services/dispatch";
import { supplyChainWarehouseService } from "../../../services/supplyChain/warehouseService";
import {
  fetchDispatchReports,
  setReportFilters,
  setReportPage,
  setReportPageSize,
} from "../../../store/slices/dispatch/reportSlice";
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
import { DisabledDispatchAction, DispatchRunStatusPill } from "../DispatchShared";
import {
  formatDispatchDate,
  formatDispatchNumber,
  getDispatchTierLabel,
} from "../dispatchDisplay";
import useDispatchCapabilities from "../useDispatchCapabilities";

const DispatchReportsPage = () => {
  const dispatch = useDispatch();
  const state = useSelector((root) => root.dispatchReports);
  const { channels, error: channelError } = useSupplyChainChannels();
  const [warehouses, setWarehouses] = useState([]);
  const [warehouseError, setWarehouseError] = useState("");
  const [exporting, setExporting] = useState(false);
  const capabilities = useDispatchCapabilities({
    label: "DispatchPlanning.Reports",
    route: "/dispatch/reports",
  });
  const params = useMemo(
    () => ({
      ...state.filters,
      PageNumber: state.pageNumber,
      PageSize: state.pageSize,
    }),
    [state.filters, state.pageNumber, state.pageSize],
  );
  const load = useCallback(
    () => dispatch(fetchDispatchReports(params)),
    [dispatch, params],
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 200);
    return () => window.clearTimeout(timeout);
  }, [load]);

  useEffect(() => {
    let current = true;
    const timeout = window.setTimeout(async () => {
      try {
        const response = await supplyChainWarehouseService.dropdown({
          channelId: state.filters.ChannelId || undefined,
        });
        if (current) {
          setWarehouses(
            Array.isArray(response.data)
              ? response.data
              : Array.isArray(response.data?.items)
                ? response.data.items
                : [],
          );
          setWarehouseError("");
        }
      } catch {
        if (current) {
          setWarehouses([]);
          setWarehouseError("Unable to load warehouse filters.");
        }
      }
    }, 0);
    return () => {
      current = false;
      window.clearTimeout(timeout);
    };
  }, [state.filters.ChannelId]);

  const exportReport = async () => {
    setExporting(true);
    try {
      const response = await dispatchReportService.export({
        ...state.filters,
        PageNumber: 1,
        PageSize: 500,
      });
      const filename = await downloadResponseBlob(
        response,
        "dispatch-recommendations.csv",
      );
      toast.success(`${filename} downloaded.`);
    } catch (error) {
      toast.error(
        await getDownloadErrorMessage(
          error,
          "Unable to export dispatch recommendations.",
        ),
      );
    } finally {
      setExporting(false);
    }
  };

  const setFilters = (patch) => dispatch(setReportFilters(patch));
  const activeFilterCount = [
    Boolean(state.filters.ChannelId),
    Boolean(state.filters.WarehouseId),
    Boolean(state.filters.FromDate),
    Boolean(state.filters.ToDate),
    Boolean(state.filters.Status),
  ].filter(Boolean).length;
  const pageTotals = state.list.reduce(
    (result, row) => {
      result.recommended += Number(row.recommendedQuantity) || 0;
      result.allocated += Number(row.allocatedQuantity) || 0;
      if (row.warehouseCode) result.warehouses.add(row.warehouseCode);
      return result;
    },
    { allocated: 0, recommended: 0, warehouses: new Set() },
  );
  const summary = state.summary ?? {};

  return (
    <section className="min-w-0 space-y-5">
      <PageHeader
        badge="Dispatch Planning"
        description="Review finalized and in-progress recommendation lines across runs, items and warehouses."
        title="Recommendation reports"
        actions={
          <>
            {state.loading ? (
              <DisabledDispatchAction reason="Wait for the current refresh to finish.">
                <AppButton disabled variant="secondary">
                  <RefreshCw aria-hidden="true" className="h-4 w-4 animate-spin" />
                  Refresh
                </AppButton>
              </DisabledDispatchAction>
            ) : (
              <AppButton variant="secondary" onClick={() => void load()}>
                <RefreshCw aria-hidden="true" className="h-4 w-4" />
                Refresh
              </AppButton>
            )}
            {capabilities.canExport ? (
              <AppButton
                isLoading={exporting}
                loadingText="Exporting…"
                variant="secondary"
                onClick={exportReport}
              >
                <Download aria-hidden="true" className="h-4 w-4" />
                Export
              </AppButton>
            ) : null}
          </>
        }
      />

      {capabilities.canExport ? (
        <p className="-mt-3 text-right text-xs text-slate-500">
          Exports up to 500 rows matching the current filters.
        </p>
      ) : null}

      <StatCards
        loading={state.loading}
        cards={[
          {
            icon: ListChecks,
            label: "Matching rows",
            value: state.totalCount,
          },
          {
            hint: summary.totalRecommendedQuantity == null ? "On this page" : undefined,
            icon: Boxes,
            label: "Recommended quantity",
            value:
              summary.totalRecommendedQuantity ?? pageTotals.recommended,
            formatValue: formatDispatchNumber,
          },
          {
            hint: summary.totalAllocatedQuantity == null ? "On this page" : undefined,
            icon: Boxes,
            label: "Allocated quantity",
            value: summary.totalAllocatedQuantity ?? pageTotals.allocated,
            formatValue: formatDispatchNumber,
          },
          {
            hint: summary.warehouseCount == null ? "On this page" : undefined,
            icon: Warehouse,
            label: "Warehouses",
            value: summary.warehouseCount ?? pageTotals.warehouses.size,
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
        <AppInput
          className="w-44"
          label="From date"
          max={state.filters.ToDate || undefined}
          type="date"
          value={state.filters.FromDate}
          onChange={(event) => setFilters({ FromDate: event.target.value })}
        />
        <AppInput
          className="w-44"
          label="To date"
          min={state.filters.FromDate || undefined}
          type="date"
          value={state.filters.ToDate}
          onChange={(event) => setFilters({ ToDate: event.target.value })}
        />
        <AppSelect
          className="w-44"
          label="Run status"
          options={[
            { label: "All statuses", value: "" },
            ...toDispatchOptions(DISPATCH_RUN_STATUS_LABELS),
          ]}
          value={state.filters.Status}
          onChange={(value) => setFilters({ Status: value })}
        />
      </SupplyChainFilterBar>

      <SupplyChainInlineError message={channelError} title="Channels unavailable" />
      <SupplyChainInlineError message={warehouseError} title="Warehouses unavailable" />
      <SupplyChainInlineError
        message={state.error}
        title="Recommendation report unavailable"
        onRetry={load}
      />

      <DataTableShell
        colGroup={
          <colgroup>
            <col className="w-[56px]" />
            <col className="w-40" />
            <col className="w-32" />
            <col className="w-28" />
            <col className="w-48" />
            <col className="w-56" />
            <col className="w-40" />
            <col className="w-24" />
            <col className="w-32" />
            <col className="w-32" />
            <col className="w-24" />
            <col className="w-32" />
          </colgroup>
        }
        columnCount={12}
        mobileConfig={{
          fields: [1, 4, 8, 9],
          serial: 0,
          status: 11,
          subtitle: 6,
          title: 5,
        }}
        emptyAction={
          state.error ? (
            <AppButton variant="secondary" onClick={load}>Retry</AppButton>
          ) : activeFilterCount > 0 ? (
            <AppButton
              variant="secondary"
              onClick={() =>
                setFilters({
                  ChannelId: "",
                  FromDate: "",
                  Status: "",
                  ToDate: "",
                  WarehouseId: "",
                })
              }
            >
              Clear filters
            </AppButton>
          ) : undefined
        }
        emptyContext="This report combines finalized planning recommendations across channels and warehouses."
        emptyHint={
          state.error
            ? "Check the connection and try loading the recommendation report again."
            : activeFilterCount > 0
              ? "Clear the current filters to see recommendations from other periods."
              : "Finalize a dispatch planning run to populate this report."
        }
        emptyTitle={
          !state.loading && (state.error || state.list.length === 0)
            ? state.error
              ? "Couldn't load recommendation report"
              : activeFilterCount > 0
                ? "No recommendation rows match these filters"
                : "No finalized recommendations yet"
            : undefined
        }
        emptyVariant={state.error ? "error" : activeFilterCount > 0 ? "filtered" : "empty"}
        head={
          <>
            <th scope="col" aria-label="Row number" className={DATA_TABLE_HEADER_CLASS}><span aria-hidden="true">#</span></th>
            <th scope="col" className={DATA_TABLE_HEADER_CLASS}>Run no.</th>
            <th scope="col" className={DATA_TABLE_HEADER_CLASS}>Planning date</th>
            <th scope="col" className={DATA_TABLE_HEADER_CLASS}>Channel</th>
            <th scope="col" className={DATA_TABLE_HEADER_CLASS}>Warehouse</th>
            <th scope="col" className={DATA_TABLE_HEADER_CLASS}>Item</th>
            <th scope="col" className={DATA_TABLE_HEADER_CLASS}>Channel SKU</th>
            <th scope="col" className={DATA_TABLE_HEADER_CLASS}>Tier</th>
            <th scope="col" className={`${DATA_TABLE_HEADER_CLASS} text-right`}>Recommended</th>
            <th scope="col" className={`${DATA_TABLE_HEADER_CLASS} text-right`}>Allocated</th>
            <th scope="col" className={`${DATA_TABLE_HEADER_CLASS} text-right`}>Boxes</th>
            <th scope="col" className={DATA_TABLE_HEADER_CLASS}>Run status</th>
          </>
        }
        loading={state.loading}
        minWidth="min-w-[1500px]"
      >
        {state.list.map((row, index) => (
          <tr
            key={`${row.runNumber}-${row.warehouseCode}-${row.itemCode}-${index}`}
          >
            <td className="text-xs font-semibold tabular-nums text-slate-500">
              {(state.pageNumber - 1) * state.pageSize + index + 1}
            </td>
            <td className="font-medium text-slate-900">{row.runNumber}</td>
            <td>{formatDispatchDate(row.planningDate)}</td>
            <td>{row.channelCode}</td>
            <td>
              <p className="font-medium">{row.warehouseCode}</p>
              <p className="text-xs text-slate-500">{row.warehouseName}</p>
            </td>
            <td>
              <p className="font-medium text-slate-900">{row.itemName}</p>
              <p className="text-xs text-slate-500">{row.itemCode}</p>
            </td>
            <td>{row.channelSku || "—"}</td>
            <td>{getDispatchTierLabel(row.tier)}</td>
            <td className="text-right tabular-nums">{formatDispatchNumber(row.recommendedQuantity, "0")}</td>
            <td className="text-right tabular-nums">{formatDispatchNumber(row.allocatedQuantity, "0")}</td>
            <td className="text-right tabular-nums">{formatDispatchNumber(row.boxCount, "0")}</td>
            <td><DispatchRunStatusPill status={row.runStatus} /></td>
          </tr>
        ))}
      </DataTableShell>

      <SupplyChainPagination
        disabled={state.loading}
        pageNumber={state.pageNumber}
        pageSize={state.pageSize}
        totalCount={state.totalCount}
        totalPages={state.totalPages}
        onPageChange={(value) => dispatch(setReportPage(value))}
        onPageSizeChange={(value) => dispatch(setReportPageSize(value))}
      />
    </section>
  );
};

export default DispatchReportsPage;
