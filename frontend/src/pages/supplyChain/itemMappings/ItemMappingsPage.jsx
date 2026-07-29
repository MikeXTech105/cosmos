import {
  CheckCircle2,
  Download,
  Eye,
  Inbox,
  Link2,
  Pencil,
  Plus,
  Power,
  RotateCw,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useSearchParams } from "react-router-dom";
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
import { supplyChainItemMappingService } from "../../../services/supplyChain/itemMappingService";
import {
  fetchSupplyChainItemMappings,
  setItemMappingFilters,
  setItemMappingPage,
  setItemMappingPageSize,
} from "../../../store/slices/supplyChain/itemMappingSlice";
import {
  getApiErrorMessage,
  getApiFieldErrors,
  isConflictError,
} from "../../../utils/apiError";
import { downloadCsv } from "../../../utils/csv";
import {
  ProcurementItemAutocomplete,
  ProcurementTabs,
} from "../../procurement/ProcurementShared";
import {
  getSchemaErrors,
  itemMappingSchema,
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
import {
  formatSupplyChainDate,
  formatSupplyChainNumber,
} from "../supplyChainDisplay";
import useSupplyChainCapabilities from "../useSupplyChainCapabilities";
import useSupplyChainChannels from "../useSupplyChainChannels";

const getItemId = (item) => item?.id ?? item?.itemId ?? "";

const emptyForm = () => ({
  channelId: "",
  channelProductName: "",
  channelSku: "",
  effectiveFrom: "",
  effectiveTo: "",
  externalItemId: "",
  isActive: true,
  isPrimary: false,
  item: null,
});

const MappingModal = ({
  channels,
  isOpen,
  mode,
  onClose,
  onSaved,
  record,
}) => {
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState(emptyForm);
  const [primaryWarning, setPrimaryWarning] = useState("");
  const [saving, setSaving] = useState(false);
  const readOnly = mode === "view";

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const item = record?.itemId
      ? {
          id: record.itemId,
          itemCode: record.itemCode,
          name: record.itemName,
        }
      : null;
    const timeout = window.setTimeout(() => {
      setForm({
        channelId: record?.channelId ?? "",
        channelProductName: record?.channelProductName ?? "",
        channelSku: record?.channelSku ?? "",
        effectiveFrom: record?.effectiveFrom?.slice?.(0, 10) ?? "",
        effectiveTo: record?.effectiveTo?.slice?.(0, 10) ?? "",
        externalItemId: record?.externalItemId ?? "",
        isActive: record?.isActive ?? true,
        isPrimary: record?.isPrimary ?? false,
        item,
      });
      setErrors({});
      setPrimaryWarning("");
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [isOpen, record]);

  useEffect(() => {
    if (
      !isOpen ||
      readOnly ||
      !form.isPrimary ||
      !form.channelId ||
      !getItemId(form.item)
    ) {
      return undefined;
    }

    let active = true;
    const timeout = window.setTimeout(async () => {
      try {
        const response = await supplyChainItemMappingService.list({
          ChannelId: form.channelId,
          IsActive: true,
          IsPrimary: true,
          ItemId: getItemId(form.item),
          PageNumber: 1,
          PageSize: 20,
        });
        const matches = Array.isArray(response.data?.items)
          ? response.data.items
          : [];
        const existing = matches.find(
          (row) => String(row.id) !== String(record?.id ?? ""),
        );

        if (active) {
          setPrimaryWarning(
            existing
              ? "An active primary mapping already exists for this Item and Channel. The server remains the authority if you continue."
              : "",
          );
        }
      } catch (error) {
        if (active) {
          setPrimaryWarning(
            "The existing primary mapping could not be checked. The server will validate this choice.",
          );
          toast.error(
            getApiErrorMessage(
              error,
              "Unable to check the existing primary mapping.",
            ),
          );
        }
      }
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [form.channelId, form.isPrimary, form.item, isOpen, readOnly, record?.id]);

  const setField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
  };

  const submit = async () => {
    const result = itemMappingSchema.safeParse({
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
        ? await supplyChainItemMappingService.update(record.id, result.data)
        : await supplyChainItemMappingService.create(result.data);
      toast.success(
        response.message || `Item mapping ${record?.id ? "updated" : "created"}.`,
      );
      await onSaved();
      onClose();
    } catch (error) {
      const fieldErrors = getApiFieldErrors(error);
      const message = getApiErrorMessage(error, "Unable to save the mapping.");
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
          ? "Item mapping details"
          : record?.id
            ? "Edit item mapping"
            : "Create item mapping"
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
          required
          value={form.channelId}
          onChange={(value) => setField("channelId", value)}
        />
        <AppInput
          disabled={readOnly || saving}
          error={errors.channelSku}
          label="Channel SKU"
          required
          value={form.channelSku}
          onChange={(event) => setField("channelSku", event.target.value)}
        />
        <div className="sm:col-span-2">
          <ProcurementItemAutocomplete
            disabled={readOnly || saving}
            title={readOnly ? "This mapping is read only" : saving ? "The mapping is already saving" : undefined}
            error={errors.itemId}
            label="Existing Item"
            required
            value={form.item}
            onChange={(item) => setField("item", item)}
          />
        </div>
        <AppInput
          disabled={readOnly || saving}
          error={errors.channelProductName}
          helperText="Descriptive only. This value never resolves an Item."
          label="Channel product name"
          value={form.channelProductName}
          onChange={(event) =>
            setField("channelProductName", event.target.value)
          }
        />
        <AppInput
          disabled={readOnly || saving}
          error={errors.externalItemId}
          helperText="Descriptive only. Item resolution uses the Channel SKU mapping."
          label="External item ID"
          value={form.externalItemId}
          onChange={(event) => setField("externalItemId", event.target.value)}
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
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            checked={form.isPrimary}
            className="h-4 w-4 rounded border-slate-300 accent-brand"
            disabled={readOnly || saving}
            title={readOnly ? "This mapping is read only" : saving ? "The mapping is already saving" : undefined}
            type="checkbox"
            onChange={(event) => setField("isPrimary", event.target.checked)}
          />
          Primary mapping
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            checked={form.isActive}
            className="h-4 w-4 rounded border-slate-300 accent-brand"
            disabled={readOnly || saving}
            title={readOnly ? "This mapping is read only" : saving ? "The mapping is already saving" : undefined}
            type="checkbox"
            onChange={(event) => setField("isActive", event.target.checked)}
          />
          Mapping is active
        </label>
      </div>
      {primaryWarning ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
          {primaryWarning}
        </div>
      ) : null}
      <div className="mt-4">
        <SupplyChainInlineError message={errors.form} />
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <AppButton variant="secondary" onClick={onClose}>
          {readOnly ? "Close" : "Back"}
        </AppButton>
        {!readOnly ? (
          <AppButton isLoading={saving} loadingText="Saving…" onClick={submit}>
            Save mapping
          </AppButton>
        ) : null}
      </div>
    </AppModal>
  );
};

const ItemMappingsPage = () => {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const state = useSelector((root) => root.supplyChainItemMappings);
  const { channels, error: channelError } = useSupplyChainChannels();
  const requestedTab = searchParams.get("tab");
  const tab = requestedTab === "unmatched" ? "unmatched" : "mappings";
  const [filterItem, setFilterItem] = useState(null);
  const [modal, setModal] = useState({ mode: "", record: null });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [rowConflicts, setRowConflicts] = useState({});
  const [unmatched, setUnmatched] = useState([]);
  const [unmatchedError, setUnmatchedError] = useState(null);
  const [unmatchedLoading, setUnmatchedLoading] = useState(true);
  const [unmatchedPage, setUnmatchedPage] = useState(1);
  const [unmatchedPageSize, setUnmatchedPageSize] = useState(20);
  const capabilities = useSupplyChainCapabilities({
    label: "SupplyChain.ItemMappings",
    resource: "SupplyChain.ItemMappings",
    route: "/supply-chain/item-mappings",
  });

  const changeTab = (nextTab) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);

      if (nextTab === "mappings") {
        next.delete("tab");
      } else {
        next.set("tab", nextTab);
      }

      return next;
    });
  };
  const params = useMemo(
    () => ({
      ...state.filters,
      PageNumber: state.pageNumber,
      PageSize: state.pageSize,
    }),
    [state.filters, state.pageNumber, state.pageSize],
  );
  const loadMappings = useCallback(
    () => dispatch(fetchSupplyChainItemMappings(params)),
    [dispatch, params],
  );
  const loadUnmatched = useCallback(async () => {
    setUnmatchedLoading(true);
    setUnmatchedError(null);

    try {
      const response = await supplyChainItemMappingService.unmatched();
      const data = Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data?.items)
          ? response.data.items
          : [];
      setUnmatched(data);
    } catch (error) {
      setUnmatched([]);
      setUnmatchedError(error);
    } finally {
      setUnmatchedLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadMappings(), 250);

    return () => window.clearTimeout(timeout);
  }, [loadMappings]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadUnmatched(), 0);

    return () => window.clearTimeout(timeout);
  }, [loadUnmatched]);

  const refreshAll = async () => {
    await Promise.all([loadMappings(), loadUnmatched()]);
  };
  const setFilters = (patch) => dispatch(setItemMappingFilters(patch));
  const changeStatus = async (record) => {
    try {
      const response = await supplyChainItemMappingService.changeStatus(
        record.id,
        !record.isActive,
      );
      toast.success(response.message || "Mapping status updated.");
      await refreshAll();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Unable to change mapping status."));
    }
  };
  const remove = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError("");

    try {
      const response = await supplyChainItemMappingService.remove(deleteTarget.id);
      toast.success(response.message || "Mapping deleted.");
      setDeleteTarget(null);
      await refreshAll();
    } catch (error) {
      const message = getApiErrorMessage(error, "Unable to delete the mapping.");
      setDeleteError(message);
      if (isConflictError(error)) {
        setRowConflicts((current) => ({ ...current, [deleteTarget.id]: message }));
      } else {
        toast.error(message);
      }
    } finally {
      setDeleting(false);
    }
  };

  const mappingRows = state.list;
  const primaryCount = mappingRows.filter((row) => row.isPrimary).length;
  const activeCount = mappingRows.filter((row) => row.isActive).length;
  const activeFilterCount = [
    Boolean(state.filters.Search.trim()),
    Boolean(state.filters.ChannelId),
    Boolean(state.filters.ItemId),
    state.filters.IsActive !== "",
    state.filters.IsPrimary !== "",
  ].filter(Boolean).length;
  const unmatchedTotalPages = Math.max(
    1,
    Math.ceil(unmatched.length / unmatchedPageSize),
  );
  const unmatchedRows = unmatched.slice(
    (unmatchedPage - 1) * unmatchedPageSize,
    unmatchedPage * unmatchedPageSize,
  );
  const currentRows = tab === "mappings" ? mappingRows : unmatched;
  const currentLoading = tab === "mappings" ? state.loading : unmatchedLoading;

  const exportRows = () =>
    downloadCsv({
      columns:
        tab === "mappings"
          ? [
              { key: "channelCode", label: "Channel" },
              { key: "channelSku", label: "Channel SKU" },
              { key: "itemCode", label: "Item code" },
              { key: "itemName", label: "Item name" },
              { key: "channelProductName", label: "Channel product name" },
              { key: "isPrimary", label: "Primary" },
              { key: "effectiveFrom", label: "Effective from" },
              { key: "effectiveTo", label: "Effective to" },
              { key: "isActive", label: "Active" },
            ]
          : [
              { key: "channelCode", label: "Channel" },
              { key: "channelSku", label: "Channel SKU" },
              { key: "channelProductName", label: "Channel product name" },
              { key: "occurrenceCount", label: "Occurrences" },
              { key: "firstSeenDate", label: "First seen" },
              { key: "lastSeenDate", label: "Last seen" },
            ],
      filename:
        tab === "mappings"
          ? "supply-chain-item-mappings.csv"
          : "supply-chain-unmatched-skus.csv",
      rows: currentRows,
    });

  return (
    <section className="min-w-0 space-y-5">
      <PageHeader
        badge="Supply Chain"
        description="Resolve channel SKUs to authoritative existing Items. Descriptive names never create or auto-match an Item."
        title="Item mappings"
        actions={
          <>
            <AppButton disabled={currentLoading} variant="secondary" onClick={() => void (tab === "mappings" ? loadMappings() : loadUnmatched())}>
              <RotateCw className={`h-4 w-4 ${currentLoading ? "animate-spin" : ""}`} />Refresh
            </AppButton>
            {capabilities.canExport ? (
              <AppButton disabled={currentLoading || currentRows.length === 0} variant="secondary" onClick={() => void exportRows()}><Download className="h-4 w-4" />Export</AppButton>
            ) : (
              <DisabledAction reason="Export requires Supply Chain Item Mappings export permission."><AppButton disabled variant="secondary"><Download className="h-4 w-4" />Export</AppButton></DisabledAction>
            )}
            {capabilities.canCreate ? (
              <AppButton onClick={() => setModal({ mode: "create", record: null })}><Plus className="h-4 w-4" />New mapping</AppButton>
            ) : (
              <DisabledAction reason="Creating mappings requires create permission."><AppButton disabled><Plus className="h-4 w-4" />New mapping</AppButton></DisabledAction>
            )}
          </>
        }
      />

      <StatCards
        loading={state.loading}
        cards={[
          { icon: Link2, label: "Total mappings", value: state.totalCount },
          { icon: CheckCircle2, hint: "On this page", label: "Active", value: activeCount },
          { hint: "On this page", label: "Primary mappings", value: primaryCount },
        ]}
      />

      <div className="rounded-xl border border-brand/20 bg-brand-light px-4 py-3 text-sm text-slate-700">
        Procurement keeps a read-only compatibility view.{" "}
        <Link className="font-semibold text-brand hover:underline" to="/procurement/setup?tab=sku">
          View it in Procurement Planning
        </Link>
      </div>

      <ProcurementTabs
        active={tab}
        tabs={[
          { id: "mappings", icon: Link2, label: "Mappings" },
          { id: "unmatched", icon: Inbox, label: "Unmatched SKUs", count: unmatched.length },
        ]}
        onChange={changeTab}
      />

      {tab === "mappings" ? (
        <>
          <SupplyChainFilterBar
            activeFilterCount={activeFilterCount}
            onClear={() => {
              setFilterItem(null);
              setFilters({ ChannelId: "", IsActive: "", IsPrimary: "", ItemId: "", Search: "" });
            }}
          >
            <AppInput className="min-w-56" label="Search" placeholder="Channel SKU, item, or product" value={state.filters.Search} onChange={(event) => setFilters({ Search: event.target.value })} />
            <AppSelect className="w-52" label="Channel" options={[{ label: "All channels", value: "" }, ...channels.map((channel) => ({ label: `${channel.code} — ${channel.name}`, value: channel.id }))]} value={state.filters.ChannelId} onChange={(value) => setFilters({ ChannelId: value })} />
            <div className="min-w-64">
              <ProcurementItemAutocomplete label="Item" value={filterItem} onChange={(item) => { setFilterItem(item); setFilters({ ItemId: getItemId(item) }); }} />
            </div>
            <AppSelect className="w-40" label="Status" options={[{ label: "All", value: "" }, { label: "Active", value: true }, { label: "Inactive", value: false }]} value={state.filters.IsActive} onChange={(value) => setFilters({ IsActive: value })} />
            <AppSelect className="w-40" label="Primary" options={[{ label: "All", value: "" }, { label: "Primary", value: true }, { label: "Not primary", value: false }]} value={state.filters.IsPrimary} onChange={(value) => setFilters({ IsPrimary: value })} />
          </SupplyChainFilterBar>
          <SupplyChainInlineError message={channelError} title="Channels unavailable" />
          <SupplyChainInlineError message={state.error} title="Item mappings unavailable" onRetry={loadMappings} />
          <DataTableShell
            colGroup={<colgroup><col className="w-[56px]" /><col className="w-32" /><col className="w-40" /><col className="w-56" /><col className="w-52" /><col className="w-24" /><col className="w-44" /><col className="w-28" /><col className="w-44" /></colgroup>}
            columnCount={9}
            emptyHint="Create the first mapping or clear the current filters."
            emptyTitle={!state.loading && mappingRows.length === 0 ? "No item mappings yet" : undefined}
            head={<><th className={DATA_TABLE_HEADER_CLASS}>#</th><th className={DATA_TABLE_HEADER_CLASS}>Channel</th><th className={DATA_TABLE_HEADER_CLASS}>Channel SKU</th><th className={DATA_TABLE_HEADER_CLASS}>Item</th><th className={DATA_TABLE_HEADER_CLASS}>Channel product name</th><th className={DATA_TABLE_HEADER_CLASS}>Primary</th><th className={DATA_TABLE_HEADER_CLASS}>Effective</th><th className={DATA_TABLE_HEADER_CLASS}>Status</th><th className={`${DATA_TABLE_HEADER_CLASS} text-right`}>Actions</th></>}
            loading={state.loading}
            minWidth="min-w-[1420px]"
          >
            {mappingRows.map((row, index) => (
              <tr key={row.id}>
                <td className="px-4 py-3.5 text-xs font-semibold tabular-nums text-slate-400">{(state.pageNumber - 1) * state.pageSize + index + 1}</td>
                <td><p className="font-semibold text-slate-900">{row.channelCode}</p><p className="text-xs text-slate-500">{row.channelName}</p></td>
                <td className="font-semibold text-slate-900">{row.channelSku}</td>
                <td><p className="font-medium text-slate-800">{row.itemName}</p><p className="text-xs text-slate-500">{row.itemCode}</p></td>
                <td className="truncate" title={row.channelProductName ?? ""}>{row.channelProductName || "—"}</td>
                <td>{row.isPrimary ? <SupplyChainBadge tone="brand">Primary</SupplyChainBadge> : "—"}</td>
                <td className="text-xs">{formatSupplyChainDate(row.effectiveFrom)} – {formatSupplyChainDate(row.effectiveTo)}</td>
                <td><SupplyChainStatusPill active={row.isActive} /></td>
                <td>
                  <div className="flex items-center justify-end gap-0.5">
                    <AppTooltip label="View mapping"><button aria-label="View mapping" className={DATA_TABLE_ROW_ACTION_CLASS} type="button" onClick={() => setModal({ mode: "view", record: row })}><Eye className="h-4 w-4" /></button></AppTooltip>
                    {capabilities.canEdit ? <><AppTooltip label="Edit mapping"><button aria-label="Edit mapping" className={DATA_TABLE_ROW_ACTION_CLASS} type="button" onClick={() => setModal({ mode: "edit", record: row })}><Pencil className="h-4 w-4" /></button></AppTooltip><AppTooltip label={row.isActive ? "Deactivate mapping" : "Activate mapping"}><button aria-label={row.isActive ? "Deactivate mapping" : "Activate mapping"} className={DATA_TABLE_ROW_ACTION_CLASS} type="button" onClick={() => void changeStatus(row)}><Power className="h-4 w-4" /></button></AppTooltip></> : null}
                    {capabilities.canDelete ? rowConflicts[row.id] ? <AppTooltip label={rowConflicts[row.id]}><button aria-label="Delete mapping unavailable" className={DATA_TABLE_ROW_ACTION_DANGER_CLASS} disabled type="button"><Trash2 className="h-4 w-4" /></button></AppTooltip> : <AppTooltip label="Delete mapping"><button aria-label="Delete mapping" className={DATA_TABLE_ROW_ACTION_DANGER_CLASS} type="button" onClick={() => { setDeleteError(""); setDeleteTarget(row); }}><Trash2 className="h-4 w-4" /></button></AppTooltip> : null}
                  </div>
                  {rowConflicts[row.id] ? <p className="mt-1 text-right text-[10px] text-red-600">In use</p> : null}
                </td>
              </tr>
            ))}
          </DataTableShell>
          <SupplyChainPagination disabled={state.loading} pageNumber={state.pageNumber} pageSize={state.pageSize} totalCount={state.totalCount} totalPages={state.totalPages} onPageChange={(value) => dispatch(setItemMappingPage(value))} onPageSizeChange={(value) => dispatch(setItemMappingPageSize(value))} />
        </>
      ) : (
        <>
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Resolve each SKU by explicitly choosing an existing Item. Item creation and product-name auto-matching are intentionally unavailable here.
          </div>
          <SupplyChainInlineError message={unmatchedError} title="Unmatched SKUs unavailable" onRetry={loadUnmatched} />
          <DataTableShell
            colGroup={<colgroup><col className="w-[56px]" /><col className="w-32" /><col className="w-44" /><col /><col className="w-28" /><col className="w-32" /><col className="w-32" /><col className="w-40" /></colgroup>}
            columnCount={8}
            emptyHint="Every imported SKU resolves to an item."
            emptyTitle={!unmatchedLoading && unmatched.length === 0 ? "No unmatched SKUs" : undefined}
            head={<><th className={DATA_TABLE_HEADER_CLASS}>#</th><th className={DATA_TABLE_HEADER_CLASS}>Channel</th><th className={DATA_TABLE_HEADER_CLASS}>Channel SKU</th><th className={DATA_TABLE_HEADER_CLASS}>Channel product name</th><th className={`${DATA_TABLE_HEADER_CLASS} text-right`}>Occurrences</th><th className={DATA_TABLE_HEADER_CLASS}>First seen</th><th className={DATA_TABLE_HEADER_CLASS}>Last seen</th><th className={`${DATA_TABLE_HEADER_CLASS} text-right`}>Action</th></>}
            loading={unmatchedLoading}
            minWidth="min-w-[1120px]"
          >
            {unmatchedRows.map((row, index) => (
              <tr key={`${row.channelId}-${row.channelSku}`}>
                <td className="px-4 py-3.5 text-xs font-semibold tabular-nums text-slate-400">{(unmatchedPage - 1) * unmatchedPageSize + index + 1}</td>
                <td className="font-semibold text-slate-900">{row.channelCode}</td>
                <td className="font-semibold text-slate-900">{row.channelSku}</td>
                <td>{row.channelProductName || "—"}</td>
                <td className="text-right tabular-nums">{formatSupplyChainNumber(row.occurrenceCount, "0", 0)}</td>
                <td>{formatSupplyChainDate(row.firstSeenDate)}</td>
                <td>{formatSupplyChainDate(row.lastSeenDate)}</td>
                <td>
                  <div className="flex items-center justify-end gap-0.5">
                    {capabilities.canCreate ? (
                      <AppButton className="h-8 px-3" variant="secondary" onClick={() => setModal({ mode: "create", record: row })}><Link2 className="h-4 w-4" />Create mapping</AppButton>
                    ) : (
                      <DisabledAction reason="Creating mappings requires create permission."><AppButton className="h-8 px-3" disabled variant="secondary">Create mapping</AppButton></DisabledAction>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </DataTableShell>
          <SupplyChainPagination disabled={unmatchedLoading} pageNumber={unmatchedPage} pageSize={unmatchedPageSize} totalCount={unmatched.length} totalPages={unmatchedTotalPages} onPageChange={setUnmatchedPage} onPageSizeChange={(value) => { setUnmatchedPageSize(Number(value)); setUnmatchedPage(1); }} />
        </>
      )}

      <MappingModal channels={channels} isOpen={Boolean(modal.record) || modal.mode === "create"} mode={modal.mode} record={modal.record} onClose={() => setModal({ mode: "", record: null })} onSaved={refreshAll} />
      <SupplyChainDeleteModal entityLabel="item mapping" error={deleteError} isOpen={Boolean(deleteTarget)} loading={deleting} onClose={() => { setDeleteError(""); setDeleteTarget(null); }} onConfirm={remove} />
    </section>
  );
};

export default ItemMappingsPage;
