import {
  Download,
  Eye,
  MapPin,
  Pencil,
  Plus,
  Power,
  RotateCw,
  Trash2,
  Warehouse,
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
import { supplyChainWarehouseService } from "../../../services/supplyChain/warehouseService";
import {
  fetchSupplyChainWarehouses,
  setWarehouseFilters,
  setWarehousePage,
  setWarehousePageSize,
} from "../../../store/slices/supplyChain/warehouseSlice";
import {
  getApiErrorMessage,
  getApiFieldErrors,
  isConflictError,
} from "../../../utils/apiError";
import { downloadCsv } from "../../../utils/csv";
import {
  getSchemaErrors,
  warehouseSchema,
} from "../supplyChainSchemas";
import {
  DisabledAction,
  SupplyChainDeleteModal,
  SupplyChainFilterBar,
  SupplyChainInlineError,
  SupplyChainPagination,
  SupplyChainStatusPill,
} from "../SupplyChainShared";
import useSupplyChainCapabilities from "../useSupplyChainCapabilities";
import useSupplyChainChannels from "../useSupplyChainChannels";

const emptyForm = () => ({
  addressLine1: "",
  addressLine2: "",
  channelId: "",
  city: "",
  isActive: true,
  postalCode: "",
  priority: 0,
  region: "",
  sortOrder: 0,
  state: "",
  warehouseCode: "",
  warehouseName: "",
});

const WarehouseModal = ({
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
        addressLine1: record?.addressLine1 ?? "",
        addressLine2: record?.addressLine2 ?? "",
        channelId: record?.channelId ?? "",
        city: record?.city ?? "",
        isActive: record?.isActive ?? true,
        postalCode: record?.postalCode ?? "",
        priority: record?.priority ?? 0,
        region: record?.region ?? "",
        sortOrder: record?.sortOrder ?? 0,
        state: record?.state ?? "",
        warehouseCode: record?.warehouseCode ?? "",
        warehouseName: record?.warehouseName ?? "",
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
    const result = warehouseSchema.safeParse(form);

    if (!result.success) {
      setErrors(getSchemaErrors(result));
      return;
    }

    setSaving(true);
    setErrors({});

    try {
      const response = record?.id
        ? await supplyChainWarehouseService.update(record.id, result.data)
        : await supplyChainWarehouseService.create(result.data);
      toast.success(
        response.message || `Warehouse ${record?.id ? "updated" : "created"}.`,
      );
      await onSaved();
      onClose();
    } catch (error) {
      const fieldErrors = getApiFieldErrors(error);
      const message = getApiErrorMessage(error, "Unable to save the warehouse.");
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

  return (
    <AppModal
      isBusy={saving}
      isOpen={isOpen}
      maxWidth="max-w-3xl"
      title={
        readOnly
          ? "Warehouse details"
          : record?.id
            ? "Edit warehouse"
            : "New warehouse"
      }
      onClose={saving ? undefined : onClose}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <AppSelect
          disabled={readOnly || saving}
          error={errors.channelId}
          label="Channel"
          options={channels.map((channel) => ({
            label: `${channel.code} — ${channel.name}`,
            value: channel.id,
          }))}
          placeholder="Choose a channel"
          required
          value={form.channelId}
          onChange={(value) => setField("channelId", value)}
        />
        <AppInput
          disabled={readOnly || saving}
          error={errors.warehouseCode}
          label="Warehouse code"
          placeholder="Enter warehouse code"
          required
          value={form.warehouseCode}
          onChange={(event) => setField("warehouseCode", event.target.value)}
        />
        <AppInput
          disabled={readOnly || saving}
          error={errors.warehouseName}
          label="Warehouse name"
          required
          value={form.warehouseName}
          onChange={(event) => setField("warehouseName", event.target.value)}
        />
        <AppInput
          disabled={readOnly || saving}
          error={errors.region}
          label="Region"
          value={form.region}
          onChange={(event) => setField("region", event.target.value)}
        />
        <AppInput
          disabled={readOnly || saving}
          error={errors.city}
          label="City"
          value={form.city}
          onChange={(event) => setField("city", event.target.value)}
        />
        <AppInput
          disabled={readOnly || saving}
          error={errors.state}
          label="State"
          value={form.state}
          onChange={(event) => setField("state", event.target.value)}
        />
        <AppInput
          disabled={readOnly || saving}
          error={errors.addressLine1}
          label="Address line 1"
          value={form.addressLine1}
          onChange={(event) => setField("addressLine1", event.target.value)}
        />
        <AppInput
          disabled={readOnly || saving}
          error={errors.addressLine2}
          label="Address line 2"
          value={form.addressLine2}
          onChange={(event) => setField("addressLine2", event.target.value)}
        />
        <AppInput
          disabled={readOnly || saving}
          error={errors.postalCode}
          label="Postal code"
          value={form.postalCode}
          onChange={(event) => setField("postalCode", event.target.value)}
        />
        <AppInput
          disabled={readOnly || saving}
          error={errors.priority}
          label="Priority"
          min="0"
          type="number"
          value={form.priority}
          onChange={(event) => setField("priority", event.target.value)}
        />
        <AppInput
          disabled={readOnly || saving}
          error={errors.sortOrder}
          label="Sort order"
          min="0"
          type="number"
          value={form.sortOrder}
          onChange={(event) => setField("sortOrder", event.target.value)}
        />
        <label className="flex items-center gap-2 self-end pb-3 text-sm text-slate-700">
          <input
            checked={form.isActive}
            className="h-4 w-4 rounded border-slate-300 accent-brand"
            disabled={readOnly || saving}
            title={readOnly ? "This warehouse is read only" : saving ? "The warehouse is already saving" : undefined}
            type="checkbox"
            onChange={(event) => setField("isActive", event.target.checked)}
          />
          Warehouse is active
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
            Save warehouse
          </AppButton>
        ) : null}
      </div>
    </AppModal>
  );
};

const WarehousesPage = () => {
  const dispatch = useDispatch();
  const state = useSelector((root) => root.supplyChainWarehouses);
  const { channels, error: channelError, loading: channelsLoading } =
    useSupplyChainChannels();
  const [modal, setModal] = useState({ mode: "", record: null });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [rowConflicts, setRowConflicts] = useState({});
  const capabilities = useSupplyChainCapabilities({
    label: "SupplyChain.Warehouses",
    resource: "SupplyChain.Warehouses",
    route: "/supply-chain/warehouses",
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
    () => dispatch(fetchSupplyChainWarehouses(params)),
    [dispatch, params],
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 250);

    return () => window.clearTimeout(timeout);
  }, [load]);

  const setFilters = (patch) => dispatch(setWarehouseFilters(patch));
  const exportRows = () =>
    downloadCsv({
      columns: [
        { key: "warehouseCode", label: "Warehouse code" },
        { key: "warehouseName", label: "Warehouse name" },
        { key: "channelCode", label: "Channel" },
        { key: "city", label: "City" },
        { key: "state", label: "State" },
        { key: "priority", label: "Priority" },
        {
          key: "status",
          label: "Status",
          getValue: (row) => (row.isActive ? "Active" : "Inactive"),
        },
      ],
      filename: "supply-chain-warehouses.csv",
      rows: state.list,
    });

  const changeStatus = async (record) => {
    try {
      const response = await supplyChainWarehouseService.changeStatus(
        record.id,
        !record.isActive,
      );
      toast.success(response.message || "Warehouse status updated.");
      await load();
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, "Unable to change warehouse status."),
      );
    }
  };

  const remove = async () => {
    if (!deleteTarget) {
      return;
    }

    setDeleting(true);
    setDeleteError("");

    try {
      const response = await supplyChainWarehouseService.remove(deleteTarget.id);
      toast.success(response.message || "Warehouse deleted.");
      setDeleteTarget(null);
      await load();
    } catch (error) {
      const message = getApiErrorMessage(
        error,
        "Unable to delete the warehouse.",
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
    Boolean(state.filters.ChannelId),
    state.filters.IsActive !== "",
    Boolean(state.filters.City.trim()),
    Boolean(state.filters.State.trim()),
  ].filter(Boolean).length;
  const activeCount = state.list.filter((row) => row.isActive).length;
  const channelsCovered = new Set(
    state.list.map((row) => row.channelId).filter(Boolean),
  ).size;

  return (
    <section className="min-w-0 space-y-5">
      <PageHeader
        badge="Supply Chain"
        description="Map operational warehouses to channels without inferring or pre-seeding warehouse codes."
        title="Warehouses"
        actions={
          <>
            <AppButton disabled={state.loading} variant="secondary" onClick={() => void load()}>
              <RotateCw className={`h-4 w-4 ${state.loading ? "animate-spin" : ""}`} />
              Refresh
            </AppButton>
            {capabilities.canExport ? (
              <AppButton disabled={state.loading || state.list.length === 0} variant="secondary" onClick={() => void exportRows()}>
                <Download className="h-4 w-4" />
                Export
              </AppButton>
            ) : (
              <DisabledAction reason="Export requires Supply Chain Warehouses export permission.">
                <AppButton disabled variant="secondary"><Download className="h-4 w-4" />Export</AppButton>
              </DisabledAction>
            )}
            {capabilities.canCreate ? (
              <AppButton disabled={channelsLoading} onClick={() => setModal({ mode: "create", record: null })}>
                <Plus className="h-4 w-4" />
                New warehouse
              </AppButton>
            ) : (
              <DisabledAction reason="Creating warehouses requires create permission.">
                <AppButton disabled><Plus className="h-4 w-4" />New warehouse</AppButton>
              </DisabledAction>
            )}
          </>
        }
      />

      <StatCards
        loading={state.loading}
        cards={[
          { icon: Warehouse, label: "Total warehouses", value: state.totalCount },
          { icon: Power, hint: "On this page", label: "Active", value: activeCount },
          { icon: MapPin, hint: "On this page", label: "Channels covered", value: channelsCovered },
        ]}
      />

      <SupplyChainFilterBar
        activeFilterCount={activeFilterCount}
        onClear={() =>
          setFilters({
            ChannelId: "",
            City: "",
            IsActive: "",
            Search: "",
            State: "",
          })
        }
      >
        <AppInput className="min-w-56 flex-1" label="Search" placeholder="Code or warehouse name" value={state.filters.Search} onChange={(event) => setFilters({ Search: event.target.value })} />
        <AppSelect className="w-52" label="Channel" options={[{ label: "All channels", value: "" }, ...channels.map((channel) => ({ label: `${channel.code} — ${channel.name}`, value: channel.id }))]} value={state.filters.ChannelId} onChange={(value) => setFilters({ ChannelId: value })} />
        <AppSelect className="w-40" label="Status" options={[{ label: "All", value: "" }, { label: "Active", value: true }, { label: "Inactive", value: false }]} value={state.filters.IsActive} onChange={(value) => setFilters({ IsActive: value })} />
        <AppInput className="w-44" label="City" value={state.filters.City} onChange={(event) => setFilters({ City: event.target.value })} />
        <AppInput className="w-44" label="State" value={state.filters.State} onChange={(event) => setFilters({ State: event.target.value })} />
      </SupplyChainFilterBar>

      <SupplyChainInlineError message={channelError} title="Channels unavailable" />
      <SupplyChainInlineError message={state.error} title="Warehouses unavailable" onRetry={load} />

      <DataTableShell
        colGroup={<colgroup><col className="w-[56px]" /><col className="w-36" /><col className="w-52" /><col className="w-36" /><col className="w-36" /><col className="w-36" /><col className="w-24" /><col className="w-28" /><col className="w-44" /></colgroup>}
        columnCount={9}
        emptyHint="Create the first warehouse or clear the current filters."
        emptyTitle={!state.loading && state.list.length === 0 ? "No warehouses yet" : undefined}
        head={<><th className={DATA_TABLE_HEADER_CLASS}>#</th><th className={DATA_TABLE_HEADER_CLASS}>Warehouse code</th><th className={DATA_TABLE_HEADER_CLASS}>Warehouse name</th><th className={DATA_TABLE_HEADER_CLASS}>Channel</th><th className={DATA_TABLE_HEADER_CLASS}>City</th><th className={DATA_TABLE_HEADER_CLASS}>State</th><th className={`${DATA_TABLE_HEADER_CLASS} text-right`}>Priority</th><th className={DATA_TABLE_HEADER_CLASS}>Status</th><th className={`${DATA_TABLE_HEADER_CLASS} text-right`}>Actions</th></>}
        loading={state.loading}
        minWidth="min-w-[1240px]"
      >
        {state.list.map((row, index) => (
          <tr key={row.id}>
            <td className="px-4 py-3.5 text-xs font-semibold tabular-nums text-slate-400">{(state.pageNumber - 1) * state.pageSize + index + 1}</td>
            <td className="font-semibold text-slate-900">{row.warehouseCode}</td>
            <td className="font-medium text-slate-800">{row.warehouseName}</td>
            <td><p className="font-medium text-slate-800">{row.channelCode}</p><p className="text-xs text-slate-500">{row.channelName}</p></td>
            <td>{row.city || "—"}</td>
            <td>{row.state || "—"}</td>
            <td className="text-right tabular-nums">{row.priority ?? 0}</td>
            <td><SupplyChainStatusPill active={row.isActive} /></td>
            <td>
              <div className="flex items-center justify-end gap-0.5">
                <AppTooltip label="View warehouse"><button aria-label="View warehouse" className={DATA_TABLE_ROW_ACTION_CLASS} type="button" onClick={() => setModal({ mode: "view", record: row })}><Eye className="h-4 w-4" /></button></AppTooltip>
                {capabilities.canEdit ? <><AppTooltip label="Edit warehouse"><button aria-label="Edit warehouse" className={DATA_TABLE_ROW_ACTION_CLASS} type="button" onClick={() => setModal({ mode: "edit", record: row })}><Pencil className="h-4 w-4" /></button></AppTooltip><AppTooltip label={row.isActive ? "Deactivate warehouse" : "Activate warehouse"}><button aria-label={row.isActive ? "Deactivate warehouse" : "Activate warehouse"} className={DATA_TABLE_ROW_ACTION_CLASS} type="button" onClick={() => void changeStatus(row)}><Power className="h-4 w-4" /></button></AppTooltip></> : null}
                {capabilities.canDelete ? rowConflicts[row.id] ? <AppTooltip label={rowConflicts[row.id]}><button aria-label="Delete warehouse unavailable" className={DATA_TABLE_ROW_ACTION_DANGER_CLASS} disabled type="button"><Trash2 className="h-4 w-4" /></button></AppTooltip> : <AppTooltip label="Delete warehouse"><button aria-label="Delete warehouse" className={DATA_TABLE_ROW_ACTION_DANGER_CLASS} type="button" onClick={() => { setDeleteError(""); setDeleteTarget(row); }}><Trash2 className="h-4 w-4" /></button></AppTooltip> : null}
              </div>
              {rowConflicts[row.id] ? <p className="mt-1 text-right text-[10px] text-red-600">In use</p> : null}
            </td>
          </tr>
        ))}
      </DataTableShell>

      <SupplyChainPagination disabled={state.loading} pageNumber={state.pageNumber} pageSize={state.pageSize} totalCount={state.totalCount} totalPages={state.totalPages} onPageChange={(value) => dispatch(setWarehousePage(value))} onPageSizeChange={(value) => dispatch(setWarehousePageSize(value))} />

      <WarehouseModal channels={channels} isOpen={Boolean(modal.record) || modal.mode === "create"} mode={modal.mode} record={modal.record} onClose={() => setModal({ mode: "", record: null })} onSaved={load} />
      <SupplyChainDeleteModal entityLabel="warehouse" error={deleteError} isOpen={Boolean(deleteTarget)} loading={deleting} onClose={() => { setDeleteError(""); setDeleteTarget(null); }} onConfirm={remove} />
    </section>
  );
};

export default WarehousesPage;
