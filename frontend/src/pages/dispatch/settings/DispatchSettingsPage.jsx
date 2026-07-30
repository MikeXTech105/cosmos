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
import { toast } from "sonner";

import AppButton from "../../../components/common/AppButton";
import DataTableShell, {
  DATA_TABLE_HEADER_CLASS,
  DATA_TABLE_ROW_ACTION_CLASS,
  DATA_TABLE_ROW_ACTION_DANGER_CLASS,
} from "../../../components/common/DataTableShell";
import AppInput from "../../../components/common/AppInput";
import AppModal from "../../../components/common/AppModal";
import AppSelect from "../../../components/common/AppSelect";
import AppTooltip from "../../../components/common/AppTooltip";
import PageHeader from "../../../components/common/PageHeader";
import StatCards from "../../../components/common/StatCards";
import {
  DISPATCH_ROUNDING_MODE_HELP,
  DISPATCH_ROUNDING_MODE_LABELS,
  DISPATCH_ROUNDING_MODES,
  DISPATCH_TIER_LABELS,
  DISPATCH_TIERS,
  toDispatchOptions,
} from "../../../constants/dispatchEnums";
import { dispatchSettingService } from "../../../services/dispatch";
import { supplyChainPackagingProfileService } from "../../../services/supplyChain/packagingProfileService";
import {
  fetchDispatchSettings,
  setSettingFilters,
  setSettingPage,
  setSettingPageSize,
} from "../../../store/slices/dispatch/settingSlice";
import {
  getApiFieldErrors,
  getApiStatus,
  isConflictError,
} from "../../../utils/apiError";
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
import {
  dispatchSettingSchema,
  getDispatchSchemaErrors,
} from "../dispatchSchemas";
import useDispatchCapabilities from "../useDispatchCapabilities";
import useSupplyChainChannels from "../../supplyChain/useSupplyChainChannels";

const getItemId = (item) => item?.id ?? item?.itemId ?? "";
const emptyForm = () => ({
  allocationPriority: 0,
  allowLooseQuantity: false,
  channelId: "",
  effectiveFrom: "",
  effectiveTo: "",
  isActive: true,
  item: null,
  minimumDispatchQuantity: 0,
  packagingProfileId: "",
  recurringDemandFactor: 1,
  roundingMode: DISPATCH_ROUNDING_MODES.Exact,
  safetyStockFactor: 1,
  tier: DISPATCH_TIERS.Tier1,
});

const SettingModal = ({
  channels,
  isOpen,
  mode,
  onClose,
  onSaved,
  record,
}) => {
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [packaging, setPackaging] = useState([]);
  const [packagingLoading, setPackagingLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [finishedProductsOnly, setFinishedProductsOnly] = useState(true);
  const readOnly = mode === "view";

  useEffect(() => {
    if (!isOpen) return undefined;
    const timeout = window.setTimeout(() => {
      setForm({
        allocationPriority: record?.allocationPriority ?? 0,
        allowLooseQuantity: record?.allowLooseQuantity ?? false,
        channelId: record?.channelId ?? "",
        effectiveFrom: record?.effectiveFrom?.slice?.(0, 10) ?? "",
        effectiveTo: record?.effectiveTo?.slice?.(0, 10) ?? "",
        isActive: record?.isActive ?? true,
        item: record?.itemId
          ? {
              id: record.itemId,
              itemCode: record.itemCode,
              name: record.itemName,
            }
          : null,
        minimumDispatchQuantity: record?.minimumDispatchQuantity ?? 0,
        packagingProfileId: record?.packagingProfileId ?? "",
        recurringDemandFactor: record?.recurringDemandFactor ?? 1,
        roundingMode:
          record?.roundingMode ?? DISPATCH_ROUNDING_MODES.Exact,
        safetyStockFactor: record?.safetyStockFactor ?? 1,
        tier: record?.tier ?? DISPATCH_TIERS.Tier1,
      });
      setErrors({});
      setFinishedProductsOnly(true);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [isOpen, record]);

  useEffect(() => {
    const itemId = getItemId(form.item);
    if (!isOpen || !itemId) {
      setPackaging([]);
      return undefined;
    }

    let current = true;
    const timeout = window.setTimeout(async () => {
      setPackagingLoading(true);
      try {
        const response = await supplyChainPackagingProfileService.list({
          IsActive: true,
          ItemId: itemId,
          PageNumber: 1,
          PageSize: 200,
        });
        if (current) {
          setPackaging(
            Array.isArray(response.data?.items) ? response.data.items : [],
          );
        }
      } catch (error) {
        if (current) {
          setPackaging([]);
          setErrors((existing) => ({
            ...existing,
            packagingProfileId: getDispatchError(
              error,
              "Unable to load packaging profiles.",
            ),
          }));
        }
      } finally {
        if (current) setPackagingLoading(false);
      }
    }, 200);

    return () => {
      current = false;
      window.clearTimeout(timeout);
    };
  }, [form.item, isOpen]);

  const setField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "", form: "" }));
  };

  const submit = async () => {
    const result = dispatchSettingSchema.safeParse({
      ...form,
      itemId: getItemId(form.item),
    });
    if (!result.success) {
      setErrors(getDispatchSchemaErrors(result));
      return;
    }

    setSaving(true);
    setErrors({});
    try {
      const response = record?.id
        ? await dispatchSettingService.update(record.id, result.data)
        : await dispatchSettingService.create(result.data);
      toast.success(
        response.message ||
          `Dispatch setting ${record?.id ? "updated" : "created"}.`,
      );
      await onSaved();
      onClose();
    } catch (error) {
      if (getApiStatus(error) === 404) {
        toast.error("This setting no longer exists. The list was refreshed.");
        await onSaved();
        onClose();
        return;
      }
      const fields = getApiFieldErrors(error);
      const message = getDispatchError(error, "Unable to save the setting.");
      const overlapMessage = isConflictError(error) ? message : "";
      setErrors({
        ...fields,
        ...(overlapMessage
          ? {
              effectiveFrom: fields.effectiveFrom || overlapMessage,
              effectiveTo: fields.effectiveTo || overlapMessage,
            }
          : {}),
        form: Object.keys(fields).length > 0 || overlapMessage ? "" : message,
      });
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const numeric = (field, label, min = "0") => (
    <AppInput
      disabled={readOnly || saving}
      error={errors[field]}
      label={label}
      min={min}
      step="any"
      type="number"
      value={form[field]}
      onChange={(event) => setField(field, event.target.value)}
    />
  );

  return (
    <AppModal
      isBusy={saving}
      isOpen={isOpen}
      maxWidth="max-w-4xl"
      title={
        readOnly
          ? "Dispatch setting details"
          : record?.id
            ? "Edit dispatch setting"
            : "New dispatch setting"
      }
      onClose={saving ? undefined : onClose}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="sm:col-span-2 lg:col-span-3">
          <ProcurementItemAutocomplete
            disabled={readOnly || saving}
            error={errors.itemId}
            label="Existing Item"
            mode={finishedProductsOnly ? "finished" : "any"}
            required
            value={form.item}
            onChange={(item) => {
              setField("item", item);
              setField("packagingProfileId", "");
            }}
          />
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <ProcurementToggle
            checked={finishedProductsOnly}
            description="Uses ProcurementClassification = 1. Turn this off when legacy Item classifications are incomplete."
            disabled={readOnly || saving}
            label="Finished products only"
            onChange={(checked) => {
              setFinishedProductsOnly(checked);
              setField("item", null);
              setField("packagingProfileId", "");
            }}
          />
        </div>
        <AppSelect
          disabled={readOnly || saving}
          error={errors.channelId}
          label="Scope"
          options={[
            { label: "All channels (global)", value: "" },
            ...channels.map((channel) => ({
              label: `${channel.code} — ${channel.name}`,
              value: channel.id,
            })),
          ]}
          value={form.channelId}
          onChange={(value) => setField("channelId", value)}
        />
        <AppSelect
          disabled={readOnly || saving || packagingLoading}
          error={errors.packagingProfileId}
          label="Packaging profile"
          options={[
            { label: "Use precedence defaults", value: "" },
            ...packaging.map((profile) => ({
              label: `${profile.packagingCode} — ${profile.packagingName}`,
              value: profile.id,
            })),
          ]}
          value={form.packagingProfileId}
          onChange={(value) => setField("packagingProfileId", value)}
        />
        <AppSelect
          disabled={readOnly || saving}
          error={errors.tier}
          label="Tier"
          options={toDispatchOptions(DISPATCH_TIER_LABELS)}
          value={form.tier}
          onChange={(value) => setField("tier", value)}
        />
        {numeric("safetyStockFactor", "Safety stock factor", "0.000001")}
        {numeric("recurringDemandFactor", "Recurring demand factor", "0.000001")}
        {numeric("minimumDispatchQuantity", "Minimum dispatch quantity")}
        <div className={form.allowLooseQuantity ? "opacity-60" : ""}>
          <AppSelect
            disabled={readOnly || saving}
            error={errors.roundingMode}
            label="Rounding mode"
            options={toDispatchOptions(DISPATCH_ROUNDING_MODE_LABELS)}
            value={form.roundingMode}
            onChange={(value) => setField("roundingMode", value)}
          />
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {DISPATCH_ROUNDING_MODE_HELP[form.roundingMode]}
          </p>
        </div>
        {numeric("allocationPriority", "Allocation priority")}
        <AppInput
          disabled={readOnly || saving}
          error={errors.effectiveFrom}
          label="Effective from"
          type="date"
          value={form.effectiveFrom}
          onChange={(event) => setField("effectiveFrom", event.target.value)}
        />
        <AppInput
          disabled={readOnly || saving}
          error={errors.effectiveTo}
          label="Effective to"
          min={form.effectiveFrom || undefined}
          type="date"
          value={form.effectiveTo}
          onChange={(event) => setField("effectiveTo", event.target.value)}
        />
        <label className="flex items-center gap-2 self-end pb-3 text-sm text-slate-700">
          <input
            checked={form.allowLooseQuantity}
            className="h-4 w-4 rounded border-slate-300 accent-brand"
            disabled={readOnly || saving}
            type="checkbox"
            onChange={(event) =>
              setField("allowLooseQuantity", event.target.checked)
            }
          />
          Allow loose quantity
        </label>
        <label className="flex items-center gap-2 self-end pb-3 text-sm text-slate-700">
          <input
            checked={form.isActive}
            className="h-4 w-4 rounded border-slate-300 accent-brand"
            disabled={readOnly || saving}
            type="checkbox"
            onChange={(event) => setField("isActive", event.target.checked)}
          />
          Setting is active
        </label>
      </div>
      {form.allowLooseQuantity ? (
        <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
          Loose quantity is allowed, so box rounding may be bypassed by the
          backend policy.
        </p>
      ) : null}
      <div className="mt-4">
        <SupplyChainInlineError
          message={errors.form}
          title="Setting conflict"
          onRetry={onSaved}
        />
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <AppButton variant="secondary" onClick={onClose}>
          {readOnly ? "Close" : "Back"}
        </AppButton>
        {!readOnly ? (
          <AppButton
            isLoading={saving}
            loadingText="Saving…"
            onClick={submit}
          >
            Save setting
          </AppButton>
        ) : null}
      </div>
    </AppModal>
  );
};

const DispatchSettingsPage = () => {
  const dispatch = useDispatch();
  const state = useSelector((root) => root.dispatchSettings);
  const { channels, error: channelError } = useSupplyChainChannels();
  const [filterItem, setFilterItem] = useState(null);
  const [filterFinishedProductsOnly, setFilterFinishedProductsOnly] =
    useState(true);
  const [modal, setModal] = useState({ mode: "", record: null });
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
                onClick={() => setModal({ mode: "create", record: null })}
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
                    onClick={() => setModal({ mode: "view", record: row })}
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
                      onClick={() => setModal({ mode: "edit", record: row })}
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

      <SettingModal
        channels={channels}
        isOpen={Boolean(modal.record) || modal.mode === "create"}
        mode={modal.mode}
        record={modal.record}
        onClose={() => setModal({ mode: "", record: null })}
        onSaved={load}
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
