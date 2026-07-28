import {
  Box,
  Download,
  Eye,
  Package,
  Pencil,
  Plus,
  RotateCw,
  Star,
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
  SUPPLY_CHAIN_DIMENSION_UNITS,
  SUPPLY_CHAIN_WEIGHT_UNITS,
} from "../../../constants/supplyChainEnums";
import { supplyChainPackagingProfileService } from "../../../services/supplyChain/packagingProfileService";
import {
  fetchSupplyChainPackagingProfiles,
  setPackagingFilters,
  setPackagingPage,
  setPackagingPageSize,
} from "../../../store/slices/supplyChain/packagingProfileSlice";
import {
  getApiErrorMessage,
  getApiFieldErrors,
  isConflictError,
} from "../../../utils/apiError";
import { downloadCsv } from "../../../utils/csv";
import { ProcurementItemAutocomplete } from "../../procurement/ProcurementShared";
import {
  getSchemaErrors,
  packagingProfileSchema,
} from "../supplyChainSchemas";
import {
  DisabledAction,
  SupplyChainBadge,
  SupplyChainDeleteModal,
  SupplyChainFilterBar,
  SupplyChainInlineError,
  SupplyChainPagination,
  SupplyChainStatusPill,
} from "../SupplyChainShared";
import { formatSupplyChainNumber } from "../supplyChainDisplay";
import useSupplyChainCapabilities from "../useSupplyChainCapabilities";
import useSupplyChainChannels from "../useSupplyChainChannels";

const getItemId = (item) => item?.id ?? item?.itemId ?? "";

const emptyForm = () => ({
  channelId: "",
  dimensionUnit: "CM",
  effectiveFrom: "",
  effectiveTo: "",
  grossWeight: "",
  height: "",
  isActive: true,
  isDefault: false,
  item: null,
  length: "",
  netWeight: "",
  packagingCode: "",
  packagingName: "",
  unitsPerBox: 1,
  volumetricDivisor: "",
  weightUnit: "KG",
  width: "",
});

const PackagingModal = ({
  channels,
  isOpen,
  mode,
  onClose,
  onSaved,
  record,
}) => {
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const readOnly = mode === "view";

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const timeout = window.setTimeout(() => {
      setForm({
        channelId: record?.channelId ?? "",
        dimensionUnit: record?.dimensionUnit ?? "CM",
        effectiveFrom: record?.effectiveFrom?.slice?.(0, 10) ?? "",
        effectiveTo: record?.effectiveTo?.slice?.(0, 10) ?? "",
        grossWeight: record?.grossWeight ?? "",
        height: record?.height ?? "",
        isActive: record?.isActive ?? true,
        isDefault: record?.isDefault ?? false,
        item: record?.itemId
          ? {
              id: record.itemId,
              itemCode: record.itemCode,
              name: record.itemName,
            }
          : null,
        length: record?.length ?? "",
        netWeight: record?.netWeight ?? "",
        packagingCode: record?.packagingCode ?? "",
        packagingName: record?.packagingName ?? "",
        unitsPerBox: record?.unitsPerBox ?? 1,
        volumetricDivisor: record?.volumetricDivisor ?? "",
        weightUnit: record?.weightUnit ?? "KG",
        width: record?.width ?? "",
      });
      setErrors({});
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [isOpen, record]);

  const setField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
  };

  const submit = async () => {
    const result = packagingProfileSchema.safeParse({
      ...form,
      itemId: getItemId(form.item),
    });

    if (!result.success) {
      setErrors(getSchemaErrors(result));
      return;
    }

    setSaving(true);
    setErrors({});

    try {
      const response = record?.id
        ? await supplyChainPackagingProfileService.update(record.id, result.data)
        : await supplyChainPackagingProfileService.create(result.data);
      toast.success(
        response.message ||
          `Packaging profile ${record?.id ? "updated" : "created"}.`,
      );
      await onSaved();
      onClose();
    } catch (error) {
      const fieldErrors = getApiFieldErrors(error);
      const message = getApiErrorMessage(
        error,
        "Unable to save the packaging profile.",
      );
      setErrors(
        Object.keys(fieldErrors).length > 0
          ? fieldErrors
          : { form: message },
      );
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const numericField = (key, label, { min = "0", ...props } = {}) => (
    <AppInput
      {...props}
      disabled={readOnly || saving}
      error={errors[key]}
      label={label}
      min={min}
      step="any"
      type="number"
      value={form[key]}
      onChange={(event) => setField(key, event.target.value)}
    />
  );

  return (
    <AppModal
      isBusy={saving}
      isOpen={isOpen}
      maxWidth="max-w-4xl"
      title={
        readOnly
          ? "Packaging profile details"
          : record?.id
            ? "Edit packaging profile"
            : "New packaging profile"
      }
      onClose={saving ? undefined : onClose}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="sm:col-span-2 lg:col-span-3">
          <ProcurementItemAutocomplete
            disabled={readOnly || saving}
            error={errors.itemId}
            label="Existing Item"
            required
            value={form.item}
            onChange={(item) => setField("item", item)}
          />
        </div>
        <AppSelect
          disabled={readOnly || saving}
          error={errors.channelId}
          label="Channel"
          options={[
            { label: "All channels", value: "" },
            ...channels.map((channel) => ({
              label: `${channel.code} — ${channel.name}`,
              value: channel.id,
            })),
          ]}
          value={form.channelId}
          onChange={(value) => setField("channelId", value)}
        />
        <AppInput
          disabled={readOnly || saving}
          error={errors.packagingCode}
          label="Packaging code"
          required
          value={form.packagingCode}
          onChange={(event) => setField("packagingCode", event.target.value)}
        />
        <AppInput
          disabled={readOnly || saving}
          error={errors.packagingName}
          label="Packaging name"
          required
          value={form.packagingName}
          onChange={(event) => setField("packagingName", event.target.value)}
        />
        {numericField("unitsPerBox", "Units per box", { min: "0.000001" })}
        {numericField("length", "Length")}
        {numericField("width", "Width")}
        {numericField("height", "Height")}
        <AppSelect
          disabled={readOnly || saving}
          error={errors.dimensionUnit}
          label="Dimension unit"
          options={SUPPLY_CHAIN_DIMENSION_UNITS}
          value={form.dimensionUnit}
          onChange={(value) => setField("dimensionUnit", value)}
        />
        {numericField("grossWeight", "Gross weight")}
        {numericField("netWeight", "Net weight")}
        <AppSelect
          disabled={readOnly || saving}
          error={errors.weightUnit}
          label="Weight unit"
          options={SUPPLY_CHAIN_WEIGHT_UNITS}
          value={form.weightUnit}
          onChange={(value) => setField("weightUnit", value)}
        />
        {numericField("volumetricDivisor", "Volumetric divisor", {
          min: "0.000001",
        })}
        <AppInput
          disabled
          helperText={
            form.volumetricDivisor
              ? `Calculated by the API using divisor ${form.volumetricDivisor}.`
              : "Calculated by the API after save."
          }
          label="Calculated volumetric weight"
          value={
            record?.calculatedVolumetricWeight === null ||
            record?.calculatedVolumetricWeight === undefined
              ? ""
              : record.calculatedVolumetricWeight
          }
        />
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
          <input checked={form.isDefault} className="h-4 w-4 rounded border-slate-300 accent-brand" disabled={readOnly || saving} type="checkbox" onChange={(event) => setField("isDefault", event.target.checked)} />
          Default profile
        </label>
        <label className="flex items-center gap-2 self-end pb-3 text-sm text-slate-700">
          <input checked={form.isActive} className="h-4 w-4 rounded border-slate-300 accent-brand" disabled={readOnly || saving} type="checkbox" onChange={(event) => setField("isActive", event.target.checked)} />
          Profile is active
        </label>
      </div>
      <div className="mt-4">
        <SupplyChainInlineError message={errors.form} />
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <AppButton variant="secondary" onClick={onClose}>
          {readOnly ? "Close" : "Back"}
        </AppButton>
        {!readOnly ? (
          <AppButton isLoading={saving} loadingText="Saving…" onClick={submit}>
            Save profile
          </AppButton>
        ) : null}
      </div>
    </AppModal>
  );
};

const PackagingProfilesPage = () => {
  const dispatch = useDispatch();
  const state = useSelector((root) => root.supplyChainPackagingProfiles);
  const { channels, error: channelError } = useSupplyChainChannels();
  const [filterItem, setFilterItem] = useState(null);
  const [modal, setModal] = useState({ mode: "", record: null });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [rowConflicts, setRowConflicts] = useState({});
  const [settingDefaultId, setSettingDefaultId] = useState(null);
  const capabilities = useSupplyChainCapabilities({
    label: "SupplyChain.PackagingProfiles",
    resource: "SupplyChain.PackagingProfiles",
    route: "/supply-chain/packaging-profiles",
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
    () => dispatch(fetchSupplyChainPackagingProfiles(params)),
    [dispatch, params],
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 250);

    return () => window.clearTimeout(timeout);
  }, [load]);

  const setFilters = (patch) => dispatch(setPackagingFilters(patch));
  const setDefault = async (record) => {
    setSettingDefaultId(record.id);

    try {
      const response =
        await supplyChainPackagingProfileService.setDefault(record.id);
      await supplyChainPackagingProfileService.list({
        ChannelId: record.channelId || undefined,
        ItemId: record.itemId,
        PageNumber: 1,
        PageSize: 200,
      });
      await load();
      toast.success(response.message || "Default packaging profile updated.");
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, "Unable to set the default profile."),
      );
    } finally {
      setSettingDefaultId(null);
    }
  };
  const remove = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError("");

    try {
      const response = await supplyChainPackagingProfileService.remove(
        deleteTarget.id,
      );
      toast.success(response.message || "Packaging profile deleted.");
      setDeleteTarget(null);
      await load();
    } catch (error) {
      const message = getApiErrorMessage(
        error,
        "Unable to delete the packaging profile.",
      );
      setDeleteError(message);
      if (isConflictError(error)) {
        setRowConflicts((current) => ({
          ...current,
          [deleteTarget.id]: message,
        }));
      } else {
        toast.error(message);
      }
    } finally {
      setDeleting(false);
    }
  };
  const activeFilterCount = [
    Boolean(state.filters.Search.trim()),
    Boolean(state.filters.ItemId),
    Boolean(state.filters.ChannelId),
    state.filters.IsActive !== "",
    state.filters.IsDefault !== "",
  ].filter(Boolean).length;
  const defaultCount = state.list.filter((row) => row.isDefault).length;
  const itemCount = new Set(state.list.map((row) => row.itemId).filter(Boolean))
    .size;
  const dimensions = (row) => {
    const values = [row.length, row.width, row.height];

    return values.every(
      (value) => value !== null && value !== undefined && value !== "",
    )
      ? `${values.map((value) => formatSupplyChainNumber(value)).join(" × ")} ${row.dimensionUnit ?? ""}`.trim()
      : "—";
  };
  const weights = (row) => {
    const gross = formatSupplyChainNumber(row.grossWeight);
    const net = formatSupplyChainNumber(row.netWeight);

    return `${gross} / ${net} ${row.weightUnit ?? ""}`.trim();
  };
  const exportRows = () =>
    downloadCsv({
      columns: [
        { key: "itemCode", label: "Item code" },
        { key: "itemName", label: "Item name" },
        { key: "packagingCode", label: "Packaging code" },
        { key: "packagingName", label: "Packaging name" },
        { key: "channelCode", label: "Channel" },
        { key: "unitsPerBox", label: "Units per box" },
        { key: "dimensions", label: "Dimensions", getValue: dimensions },
        { key: "grossWeight", label: "Gross weight" },
        { key: "netWeight", label: "Net weight" },
        { key: "calculatedVolumetricWeight", label: "Volumetric weight" },
        { key: "isDefault", label: "Default" },
        { key: "isActive", label: "Active" },
      ],
      filename: "supply-chain-packaging-profiles.csv",
      rows: state.list,
    });

  return (
    <section className="min-w-0 space-y-5">
      <PageHeader
        badge="Supply Chain"
        description="Maintain channel-aware packaging data while keeping API-calculated volumetric weight authoritative."
        title="Packaging profiles"
        actions={
          <>
            <AppButton disabled={state.loading} variant="secondary" onClick={() => void load()}><RotateCw className={`h-4 w-4 ${state.loading ? "animate-spin" : ""}`} />Refresh</AppButton>
            {capabilities.canExport ? <AppButton disabled={state.loading || state.list.length === 0} variant="secondary" onClick={() => void exportRows()}><Download className="h-4 w-4" />Export</AppButton> : <DisabledAction reason="Export requires Supply Chain Packaging Profiles export permission."><AppButton disabled variant="secondary"><Download className="h-4 w-4" />Export</AppButton></DisabledAction>}
            {capabilities.canCreate ? <AppButton onClick={() => setModal({ mode: "create", record: null })}><Plus className="h-4 w-4" />New profile</AppButton> : <DisabledAction reason="Creating packaging profiles requires create permission."><AppButton disabled><Plus className="h-4 w-4" />New profile</AppButton></DisabledAction>}
          </>
        }
      />

      <StatCards
        loading={state.loading}
        cards={[
          { icon: Package, label: "Total profiles", value: state.totalCount },
          { icon: Star, hint: "On this page", label: "Default profiles", value: defaultCount },
          { icon: Box, hint: "On this page", label: "Items covered", value: itemCount },
        ]}
      />

      <SupplyChainFilterBar
        activeFilterCount={activeFilterCount}
        onClear={() => {
          setFilterItem(null);
          setFilters({ ChannelId: "", IsActive: "", IsDefault: "", ItemId: "", Search: "" });
        }}
      >
        <AppInput className="min-w-56" label="Search" placeholder="Item or packaging code" value={state.filters.Search} onChange={(event) => setFilters({ Search: event.target.value })} />
        <div className="min-w-64"><ProcurementItemAutocomplete label="Item" value={filterItem} onChange={(item) => { setFilterItem(item); setFilters({ ItemId: getItemId(item) }); }} /></div>
        <AppSelect className="w-52" label="Channel" options={[{ label: "All channels", value: "" }, ...channels.map((channel) => ({ label: `${channel.code} — ${channel.name}`, value: channel.id }))]} value={state.filters.ChannelId} onChange={(value) => setFilters({ ChannelId: value })} />
        <AppSelect className="w-40" label="Status" options={[{ label: "All", value: "" }, { label: "Active", value: true }, { label: "Inactive", value: false }]} value={state.filters.IsActive} onChange={(value) => setFilters({ IsActive: value })} />
        <AppSelect className="w-40" label="Default" options={[{ label: "All", value: "" }, { label: "Default", value: true }, { label: "Not default", value: false }]} value={state.filters.IsDefault} onChange={(value) => setFilters({ IsDefault: value })} />
      </SupplyChainFilterBar>

      <SupplyChainInlineError message={channelError} title="Channels unavailable" />
      <SupplyChainInlineError message={state.error} title="Packaging profiles unavailable" onRetry={load} />

      <DataTableShell
        colGroup={<colgroup><col className="w-[56px]" /><col className="w-56" /><col className="w-36" /><col className="w-36" /><col className="w-28" /><col className="w-44" /><col className="w-44" /><col className="w-36" /><col className="w-24" /><col className="w-28" /><col className="w-44" /></colgroup>}
        columnCount={11}
        emptyHint="Create the first profile or clear the current filters."
        emptyTitle={!state.loading && state.list.length === 0 ? "No packaging profiles yet" : undefined}
        head={<><th className={DATA_TABLE_HEADER_CLASS}>#</th><th className={DATA_TABLE_HEADER_CLASS}>Item</th><th className={DATA_TABLE_HEADER_CLASS}>Packaging code</th><th className={DATA_TABLE_HEADER_CLASS}>Channel</th><th className={`${DATA_TABLE_HEADER_CLASS} text-right`}>Units per box</th><th className={DATA_TABLE_HEADER_CLASS}>Dimensions</th><th className={`${DATA_TABLE_HEADER_CLASS} text-right`}>Gross / Net weight</th><th className={`${DATA_TABLE_HEADER_CLASS} text-right`}>Volumetric weight</th><th className={DATA_TABLE_HEADER_CLASS}>Default</th><th className={DATA_TABLE_HEADER_CLASS}>Status</th><th className={`${DATA_TABLE_HEADER_CLASS} text-right`}>Actions</th></>}
        loading={state.loading}
        minWidth="min-w-[1580px]"
      >
        {state.list.map((row, index) => (
          <tr key={row.id}>
            <td className="px-4 py-3.5 text-xs font-semibold tabular-nums text-slate-400">{(state.pageNumber - 1) * state.pageSize + index + 1}</td>
            <td><p className="font-medium text-slate-800">{row.itemName}</p><p className="text-xs text-slate-500">{row.itemCode}</p></td>
            <td><p className="font-semibold text-slate-900">{row.packagingCode}</p><p className="text-xs text-slate-500">{row.packagingName}</p></td>
            <td>{row.channelCode || "All channels"}</td>
            <td className="text-right tabular-nums">{formatSupplyChainNumber(row.unitsPerBox)}</td>
            <td>{dimensions(row)}</td>
            <td className="text-right tabular-nums">{weights(row)}</td>
            <td className="text-right font-medium tabular-nums">{formatSupplyChainNumber(row.calculatedVolumetricWeight)}</td>
            <td>{row.isDefault ? <SupplyChainBadge tone="brand">Default</SupplyChainBadge> : "—"}</td>
            <td><SupplyChainStatusPill active={row.isActive} /></td>
            <td>
              <div className="flex items-center justify-end gap-0.5">
                <AppTooltip label="View profile"><button aria-label="View profile" className={DATA_TABLE_ROW_ACTION_CLASS} type="button" onClick={() => setModal({ mode: "view", record: row })}><Eye className="h-4 w-4" /></button></AppTooltip>
                {capabilities.canEdit ? <><AppTooltip label="Edit profile"><button aria-label="Edit profile" className={DATA_TABLE_ROW_ACTION_CLASS} type="button" onClick={() => setModal({ mode: "edit", record: row })}><Pencil className="h-4 w-4" /></button></AppTooltip>{row.isDefault ? <AppTooltip label="This is already the default profile"><button aria-label="Already default" className={DATA_TABLE_ROW_ACTION_CLASS} disabled type="button"><Star className="h-4 w-4" /></button></AppTooltip> : <AppTooltip label="Set as default"><button aria-label="Set as default" className={DATA_TABLE_ROW_ACTION_CLASS} disabled={settingDefaultId === row.id} type="button" onClick={() => void setDefault(row)}><Star className="h-4 w-4" /></button></AppTooltip>}</> : null}
                {capabilities.canDelete ? rowConflicts[row.id] ? <AppTooltip label={rowConflicts[row.id]}><button aria-label="Delete profile unavailable" className={DATA_TABLE_ROW_ACTION_DANGER_CLASS} disabled type="button"><Trash2 className="h-4 w-4" /></button></AppTooltip> : <AppTooltip label="Delete profile"><button aria-label="Delete profile" className={DATA_TABLE_ROW_ACTION_DANGER_CLASS} type="button" onClick={() => { setDeleteError(""); setDeleteTarget(row); }}><Trash2 className="h-4 w-4" /></button></AppTooltip> : null}
              </div>
              {rowConflicts[row.id] ? <p className="mt-1 text-right text-[10px] text-red-600">In use</p> : null}
            </td>
          </tr>
        ))}
      </DataTableShell>

      <SupplyChainPagination disabled={state.loading} pageNumber={state.pageNumber} pageSize={state.pageSize} totalCount={state.totalCount} totalPages={state.totalPages} onPageChange={(value) => dispatch(setPackagingPage(value))} onPageSizeChange={(value) => dispatch(setPackagingPageSize(value))} />

      <PackagingModal channels={channels} isOpen={Boolean(modal.record) || modal.mode === "create"} mode={modal.mode} record={modal.record} onClose={() => setModal({ mode: "", record: null })} onSaved={load} />
      <SupplyChainDeleteModal entityLabel="packaging profile" error={deleteError} isOpen={Boolean(deleteTarget)} loading={deleting} onClose={() => { setDeleteError(""); setDeleteTarget(null); }} onConfirm={remove} />
    </section>
  );
};

export default PackagingProfilesPage;
