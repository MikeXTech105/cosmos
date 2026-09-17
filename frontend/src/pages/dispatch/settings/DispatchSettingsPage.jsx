import {
  Download,
  Eye,
  Pencil,
  Plus,
  RefreshCw,
  Settings2,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import AppButton from "../../../components/common/AppButton";
import DataTableShell, {
  DATA_TABLE_HEADER_CLASS,
  DATA_TABLE_ROW_ACTION_CLASS,
  DATA_TABLE_ROW_ACTION_DANGER_CLASS,
} from "../../../components/common/DataTableShell";
import AppInput from "../../../components/common/AppInput";
import AppSelect from "../../../components/common/AppSelect";
import AppTooltip from "../../../components/common/AppTooltip";
import PageHeader from "../../../components/common/PageHeader";
import StatCards from "../../../components/common/StatCards";
import { dispatchSettingService } from "../../../services/dispatch";
import {
  fetchDispatchSettings,
  setSettingFilters,
  setSettingPage,
  setSettingPageSize,
} from "../../../store/slices/dispatch/settingSlice";
import { downloadCsv } from "../../../utils/csv";
import {
  ProcurementItemAutocomplete,
  ProcurementToggle,
} from "../../procurement/ProcurementShared";
import {
  SupplyChainDeleteModal,
  SupplyChainFilterBar,
  SupplyChainInlineError,
  SupplyChainPagination,
  SupplyChainStatusPill,
} from "../../supplyChain/SupplyChainShared";
import {
  DisabledDispatchAction,
  DispatchPill,
} from "../DispatchShared";
import {
  formatDispatchDate,
  formatDispatchNumber,
  getDispatchError,
  getDispatchRoundingLabel,
  getDispatchTierLabel,
} from "../dispatchDisplay";
import useDispatchCapabilities from "../useDispatchCapabilities";
import useSupplyChainChannels from "../../supplyChain/useSupplyChainChannels";

const getItemId = (item) => item?.id ?? item?.itemId ?? "";

const DispatchSettingsPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const state = useSelector((root) => root.dispatchSettings);
  const { channels, error: channelError } = useSupplyChainChannels();
  const [filterItem, setFilterItem] = useState(null);
  const [filterFinishedProductsOnly, setFilterFinishedProductsOnly] =
    useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const capabilities = useDispatchCapabilities({
    label: "DispatchPlanning.SkuSettings",
    route: "/dispatch/settings",
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
    () => dispatch(fetchDispatchSettings(params)),
    [dispatch, params],
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 250);
    return () => window.clearTimeout(timeout);
  }, [load]);

  const remove = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError("");
    try {
      const response = await dispatchSettingService.remove(deleteTarget.id);
      toast.success(response.message || "Dispatch setting deleted.");
      setDeleteTarget(null);
      await load();
    } catch (error) {
      const message = getDispatchError(error, "Unable to delete the setting.");
      setDeleteError(message);
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  };

  const activeCount = state.list.filter((row) => row.isActive).length;
  const channelCount = state.list.filter((row) => row.channelId != null).length;
  const activeFilterCount = [
    Boolean(state.filters.Search.trim()),
    Boolean(state.filters.ItemId),
    Boolean(state.filters.ChannelId),
    state.filters.IsActive !== "",
    Boolean(state.filters.EffectiveOn),
  ].filter(Boolean).length;
  const setFilters = (patch) => dispatch(setSettingFilters(patch));

  return (
    <section className="min-w-0 space-y-5">
      <PageHeader
        badge="Dispatch Planning"
        description="Define global and channel-specific SKU policies used by dispatch calculations."
        title="SKU settings"
        actions={
          <>
            {state.loading ? (
              <DisabledDispatchAction reason="Wait for the current refresh to finish.">
                <AppButton disabled variant="secondary">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Refresh
                </AppButton>
              </DisabledDispatchAction>
            ) : (
              <AppButton variant="secondary" onClick={() => void load()}>
                <RefreshCw className="h-4 w-4" />
                Refresh
              </AppButton>
            )}
            {state.loading || state.list.length === 0 ? (
              <DisabledDispatchAction
                reason={
                  state.loading
                    ? "Wait for the current refresh to finish."
                    : "There are no settings on this page to export."
                }
              >
                <AppButton disabled variant="secondary">
                  <Download className="h-4 w-4" />
                  Export
                </AppButton>
              </DisabledDispatchAction>
            ) : (
              <AppButton
                variant="secondary"
                onClick={() =>
                  void downloadCsv({
                    columns: [
                      { key: "itemCode", label: "Item code" },
                      { key: "itemName", label: "Item name" },
                      { key: "channelCode", label: "Channel" },
                      { key: "tier", label: "Tier" },
                      { key: "roundingMode", label: "Rounding mode" },
                      { key: "allocationPriority", label: "Priority" },
                    ],
                    filename: "dispatch-sku-settings.csv",
                    rows: state.list,
                  })
                }
              >
                <Download className="h-4 w-4" />
                Export
              </AppButton>
            )}
            {capabilities.canCreate ? (
              <AppButton
                onClick={() => navigate("/dispatch/settings/new")}
              >
                <Plus className="h-4 w-4" />
                New setting
              </AppButton>
            ) : (
              <DisabledDispatchAction reason="Creating settings requires SKU Settings create permission.">
                <AppButton disabled>
                  <Plus className="h-4 w-4" />
                  New setting
                </AppButton>
              </DisabledDispatchAction>
            )}
          </>
        }
      />

      <StatCards
        loading={state.loading}
        cards={[
          { icon: Settings2, label: "Total settings", value: state.totalCount },
          { hint: "On this page", label: "Active", value: activeCount },
          {
            hint: "On this page",
            label: "Channel-specific",
            value: channelCount,
          },
        ]}
      />

      <div className="rounded-xl border border-brand/20 bg-brand-light px-4 py-3 text-sm leading-6 text-slate-700">
        Channel-specific active policy wins over global, within effective
        dates. Packaging: explicit profile → channel default → global default.
      </div>

      <SupplyChainFilterBar
        activeFilterCount={activeFilterCount}
        onClear={() => {
          setFilterItem(null);
          setFilters({
            ChannelId: "",
            EffectiveOn: "",
            IsActive: "",
            ItemId: "",
            Search: "",
          });
        }}
      >
        <AppInput
          className="min-w-56 flex-1"
          label="Search"
          placeholder="Item or packaging code"
          value={state.filters.Search}
          onChange={(event) => setFilters({ Search: event.target.value })}
        />
        <div className="min-w-64">
          <ProcurementItemAutocomplete
            label="Item"
            mode={filterFinishedProductsOnly ? "finished" : "any"}
            value={filterItem}
            onChange={(item) => {
              setFilterItem(item);
              setFilters({ ItemId: getItemId(item) });
            }}
          />
        </div>
        <div className="min-w-72 flex-1">
          <ProcurementToggle
            checked={filterFinishedProductsOnly}
            description="Visible Item picker filter; turn off for legacy classifications."
            label="Finished products only"
            onChange={(checked) => {
              setFilterFinishedProductsOnly(checked);
              setFilterItem(null);
              setFilters({ ItemId: "" });
            }}
          />
        </div>
        <AppSelect
          className="w-52"
          label="Channel"
          options={[
            { label: "All scopes", value: "" },
            ...channels.map((channel) => ({
              label: `${channel.code} — ${channel.name}`,
              value: channel.id,
            })),
          ]}
          value={state.filters.ChannelId}
          onChange={(value) => setFilters({ ChannelId: value })}
        />
        <AppSelect
          className="w-40"
          label="Status"
          options={[
            { label: "All", value: "" },
            { label: "Active", value: true },
            { label: "Inactive", value: false },
          ]}
          value={state.filters.IsActive}
          onChange={(value) => setFilters({ IsActive: value })}
        />
        <AppInput
          className="w-44"
          label="Effective on"
          type="date"
          value={state.filters.EffectiveOn}
          onChange={(event) => setFilters({ EffectiveOn: event.target.value })}
        />
      </SupplyChainFilterBar>

      <SupplyChainInlineError message={channelError} title="Channels unavailable" />
      <SupplyChainInlineError
        message={state.error}
        title="SKU settings unavailable"
        onRetry={load}
      />

      <DataTableShell
        colGroup={
          <colgroup>
            <col className="w-[56px]" />
            <col className="w-56" />
            <col className="w-28" />
            <col className="w-24" />
            <col className="w-36" />
            <col className="w-28" />
            <col className="w-28" />
            <col className="w-28" />
            <col className="w-40" />
            <col className="w-24" />
            <col className="w-24" />
            <col className="w-44" />
            <col className="w-28" />
            <col className="w-36" />
          </colgroup>
        }
        columnCount={14}
        emptyHint="Create a global policy or clear the current filters."
        emptyTitle={
          !state.loading && state.list.length === 0
            ? "No dispatch settings yet"
            : undefined
        }
        head={
          <>
            <th className={DATA_TABLE_HEADER_CLASS}>#</th>
            <th className={DATA_TABLE_HEADER_CLASS}>Item</th>
            <th className={DATA_TABLE_HEADER_CLASS}>Scope</th>
            <th className={DATA_TABLE_HEADER_CLASS}>Tier</th>
            <th className={DATA_TABLE_HEADER_CLASS}>Packaging</th>
            <th className={`${DATA_TABLE_HEADER_CLASS} text-right`}>Safety factor</th>
            <th className={`${DATA_TABLE_HEADER_CLASS} text-right`}>Recurring factor</th>
            <th className={`${DATA_TABLE_HEADER_CLASS} text-right`}>Min qty</th>
            <th className={DATA_TABLE_HEADER_CLASS}>Rounding</th>
            <th className={DATA_TABLE_HEADER_CLASS}>Loose</th>
            <th className={`${DATA_TABLE_HEADER_CLASS} text-right`}>Priority</th>
            <th className={DATA_TABLE_HEADER_CLASS}>Effective</th>
            <th className={DATA_TABLE_HEADER_CLASS}>Status</th>
            <th className={`${DATA_TABLE_HEADER_CLASS} text-right`}>Actions</th>
          </>
        }
        loading={state.loading}
        minWidth="min-w-[1780px]"
      >
        {state.list.map((row, index) => (
          <tr key={row.id}>
            <td className="px-4 py-3.5 text-xs font-semibold tabular-nums text-slate-400">
              {(state.pageNumber - 1) * state.pageSize + index + 1}
            </td>
            <td>
              <p className="font-medium text-slate-900">{row.itemName}</p>
              <p className="text-xs text-slate-500">{row.itemCode}</p>
            </td>
            <td>
              {row.channelId == null ? (
                <DispatchPill>Global</DispatchPill>
              ) : (
                <DispatchPill tone="violet">{row.channelCode}</DispatchPill>
              )}
            </td>
            <td><DispatchPill tone="sky">{getDispatchTierLabel(row.tier)}</DispatchPill></td>
            <td>{row.packagingCode || "Precedence default"}</td>
            <td className="text-right tabular-nums">{formatDispatchNumber(row.safetyStockFactor)}</td>
            <td className="text-right tabular-nums">{formatDispatchNumber(row.recurringDemandFactor)}</td>
            <td className="text-right tabular-nums">{formatDispatchNumber(row.minimumDispatchQuantity)}</td>
            <td>{getDispatchRoundingLabel(row.roundingMode)}</td>
            <td>{row.allowLooseQuantity ? "Yes" : "No"}</td>
            <td className="text-right tabular-nums">{formatDispatchNumber(row.allocationPriority, "0", 0)}</td>
            <td className="text-xs">{formatDispatchDate(row.effectiveFrom)} – {formatDispatchDate(row.effectiveTo)}</td>
            <td><SupplyChainStatusPill active={row.isActive} /></td>
            <td>
              <div className="flex items-center justify-end gap-0.5">
                <AppTooltip label="View setting">
                  <button
                    aria-label="View setting"
                    className={DATA_TABLE_ROW_ACTION_CLASS}
                    type="button"
                    onClick={() => navigate(`/dispatch/settings/${row.id}/edit?mode=view`)}
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                </AppTooltip>
                {capabilities.canEdit ? (
                  <AppTooltip label="Edit setting">
                    <button
                      aria-label="Edit setting"
                      className={DATA_TABLE_ROW_ACTION_CLASS}
                      type="button"
                      onClick={() => navigate(`/dispatch/settings/${row.id}/edit`)}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </AppTooltip>
                ) : null}
                {capabilities.canDelete ? (
                  <AppTooltip label="Delete setting">
                    <button
                      aria-label="Delete setting"
                      className={DATA_TABLE_ROW_ACTION_DANGER_CLASS}
                      type="button"
                      onClick={() => {
                        setDeleteError("");
                        setDeleteTarget(row);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </AppTooltip>
                ) : null}
              </div>
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
        onPageChange={(value) => dispatch(setSettingPage(value))}
        onPageSizeChange={(value) => dispatch(setSettingPageSize(value))}
      />

      <SupplyChainDeleteModal
        entityLabel="dispatch setting"
        error={deleteError}
        isOpen={Boolean(deleteTarget)}
        loading={deleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={remove}
      />
    </section>
  );
};

export default DispatchSettingsPage;
