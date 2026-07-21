import {
  AlertTriangle,
  CheckCircle2,
  Inbox,
  Link2,
  Pencil,
  RefreshCw,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import AppButton from "../../../components/common/AppButton";
import AppInput from "../../../components/common/AppInput";
import AppModal from "../../../components/common/AppModal";
import AppSelect from "../../../components/common/AppSelect";
import PageHeader from "../../../components/common/PageHeader";
import { PROCUREMENT_ITEM_CLASSIFICATION_LABELS } from "../../../constants/procurementEnums";
import { skuMappingService } from "../../../services/procurement/skuMappingService";
import {
  ProcurementChannelSelect,
  ProcurementEmptyState,
  ProcurementErrorState,
  ProcurementInlineError,
  ProcurementItemAutocomplete,
  ProcurementLoadingRows,
  ProcurementPagination,
  ProcurementPill,
  ProcurementSectionCard,
  ProcurementTabs,
} from "../ProcurementShared";
import {
  formatProcurementDate,
  formatProcurementInteger,
  getApiStatus,
  getCollection,
  getFieldErrorMap,
  getItemCode,
  getItemName,
  getPagination,
  getProcurementBoolean,
  getProcurementError,
  getRecordId,
} from "../procurementHelpers";
import useProcurementCapabilities from "../useProcurementCapabilities";
import useActiveSalesChannels from "../useProcurementChannels";
import useLatestRequest from "../../../hooks/useLatestRequest";

const emptyForm = () => ({
  channelProductName: "",
  channelSku: "",
  isActive: true,
  item: null,
  salesChannelId: "",
});

const MappingModal = ({
  channels,
  isOpen,
  onClose,
  onSaved,
  record,
}) => {
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const item = record?.item ??
      (record?.itemId
        ? {
            itemCode: record.itemCode,
            itemId: record.itemId,
            itemName: record.itemName,
            procurementClassification: record.procurementClassification,
          }
        : null);
    const timeout = window.setTimeout(() => {
      setForm({
        channelProductName: record?.channelProductName ?? "",
        channelSku: record?.channelSku ?? "",
        isActive: getProcurementBoolean(record?.isActive, true),
        item,
        salesChannelId:
          record?.salesChannelId ?? record?.channelId ?? "",
      });
      setErrors({});
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [isOpen, record]);

  const submit = async () => {
    const validation = {};
    if (!form.salesChannelId) validation.salesChannelId = "Choose a sales channel.";
    if (!form.channelSku.trim()) validation.channelSku = "Channel SKU is required.";
    if (!form.item) validation.itemId = "Choose a finished-product item.";

    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      return;
    }

    const payload = {
      salesChannelId: form.salesChannelId,
      channelSku: form.channelSku.trim(),
      channelProductName: form.channelProductName.trim() || null,
      itemId: getRecordId(form.item, ["itemId"]),
      isActive: form.isActive,
    };
    const id = getRecordId(record, ["skuMappingId"]);
    setSaving(true);
    setErrors({});

    try {
      const response = id
        ? await skuMappingService.update(id, payload)
        : await skuMappingService.create(payload);
      toast.success(response.message || `SKU mapping ${id ? "updated" : "created"}.`);
      await onSaved();
      onClose();
    } catch (error) {
      const status = getApiStatus(error);
      if (status === 409) {
        setErrors({
          channelSku: getProcurementError(
            error,
            "An active mapping already exists for this channel and SKU.",
          ),
        });
      } else if ([400, 422].includes(status)) {
        setErrors(getFieldErrorMap(error));
      } else {
        setErrors({
          form: getProcurementError(error, "Unable to save the SKU mapping."),
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const classification =
    form.item?.procurementClassification ?? form.item?.classification ?? null;
  const legacyItem = Boolean(form.item) && classification === null;

  return (
    <AppModal
      isBusy={saving}
      isOpen={isOpen}
      maxWidth="max-w-2xl"
      title={
        getRecordId(record, ["skuMappingId"])
          ? "Edit channel SKU mapping"
          : "Map channel SKU"
      }
      onClose={saving ? undefined : onClose}
    >
      <div className="space-y-4">
        <ProcurementChannelSelect
          channels={channels}
          disabled={saving}
          error={errors.salesChannelId}
          label="Sales channel"
          required
          value={form.salesChannelId}
          onChange={(salesChannelId) =>
            setForm((current) => ({ ...current, salesChannelId }))
          }
        />
        <AppInput
          error={errors.channelSku}
          label="Channel SKU"
          required
          value={form.channelSku}
          onChange={(event) => {
            setForm((current) => ({ ...current, channelSku: event.target.value }));
            setErrors((current) => ({ ...current, channelSku: "" }));
          }}
        />
        <AppInput
          error={errors.channelProductName}
          label="Channel product name"
          value={form.channelProductName}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              channelProductName: event.target.value,
            }))
          }
        />
        <ProcurementItemAutocomplete
          error={errors.itemId}
          includeLegacy
          label="Finished-product item"
          mode="finished"
          required
          value={form.item}
          onChange={(item) => setForm((current) => ({ ...current, item }))}
        />
        {legacyItem && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="text-sm font-semibold">Legacy item classification</p>
              <p className="mt-0.5 text-xs leading-5">
                This item has no procurement classification. It remains selectable for compatibility, but classify it as a finished product in Item Master.
              </p>
            </div>
          </div>
        )}
        {getRecordId(record, ["skuMappingId"]) && (
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 accent-brand"
              checked={form.isActive}
              onChange={(event) =>
                setForm((current) => ({ ...current, isActive: event.target.checked }))
              }
            />
            Mapping is active
          </label>
        )}
        <ProcurementInlineError message={errors.form} />
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <AppButton variant="secondary" onClick={onClose}>Cancel</AppButton>
        <AppButton isLoading={saving} loadingText="Saving…" onClick={submit}>
          <Link2 className="h-4 w-4" />Save mapping
        </AppButton>
      </div>
    </AppModal>
  );
};

const SkuMappingPage = () => {
  const [tab, setTab] = useState("unmapped");
  const [unmappedData, setUnmappedData] = useState(null);
  const [mappingData, setMappingData] = useState(null);
  const [unmappedLoading, setUnmappedLoading] = useState(true);
  const [mappingLoading, setMappingLoading] = useState(false);
  const [unmappedError, setUnmappedError] = useState(null);
  const [mappingError, setMappingError] = useState(null);
  const [unmappedPage, setUnmappedPage] = useState(1);
  const [mappingPage, setMappingPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [channelId, setChannelId] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [modal, setModal] = useState({ open: false, record: null });
  const {
    beginRequest: beginUnmappedRequest,
    isLatestRequest: isLatestUnmappedRequest,
  } = useLatestRequest();
  const {
    beginRequest: beginMappingRequest,
    isLatestRequest: isLatestMappingRequest,
  } = useLatestRequest();
  const { channels, error: channelsError } = useActiveSalesChannels();
  const capabilities = useProcurementCapabilities({
    label: "ProcurementPlanning.SkuMapping",
    resource: "ProcurementPlanning.SkuMapping",
    route: "/procurement/sku-mapping",
  });

  const loadUnmapped = useCallback(async () => {
    const requestId = beginUnmappedRequest();
    setUnmappedLoading(true);
    setUnmappedError(null);
    try {
      const response = await skuMappingService.unmapped({
        Search: search.trim() || undefined,
        SalesChannelId: channelId || undefined,
        PageNumber: unmappedPage,
        PageSize: pageSize,
      });
      if (isLatestUnmappedRequest(requestId)) {
        setUnmappedData(response.data);
      }
    } catch (error) {
      if (isLatestUnmappedRequest(requestId)) {
        setUnmappedError(error);
      }
    } finally {
      if (isLatestUnmappedRequest(requestId)) {
        setUnmappedLoading(false);
      }
    }
  }, [beginUnmappedRequest, channelId, isLatestUnmappedRequest, pageSize, search, unmappedPage]);

  const loadMappings = useCallback(async () => {
    const requestId = beginMappingRequest();
    setMappingLoading(true);
    setMappingError(null);
    try {
      const response = await skuMappingService.list({
        Search: search.trim() || undefined,
        SalesChannelId: channelId || undefined,
        IsActive:
          activeFilter === "all" ? undefined : activeFilter === "active",
        PageNumber: mappingPage,
        PageSize: pageSize,
      });
      if (isLatestMappingRequest(requestId)) {
        setMappingData(response.data);
      }
    } catch (error) {
      if (isLatestMappingRequest(requestId)) {
        setMappingError(error);
      }
    } finally {
      if (isLatestMappingRequest(requestId)) {
        setMappingLoading(false);
      }
    }
  }, [activeFilter, beginMappingRequest, channelId, isLatestMappingRequest, mappingPage, pageSize, search]);

  useEffect(() => {
    if (tab === "unmapped") beginUnmappedRequest();
    else beginMappingRequest();
    const timeout = window.setTimeout(() => {
      if (tab === "unmapped") void loadUnmapped();
      else void loadMappings();
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [beginMappingRequest, beginUnmappedRequest, loadMappings, loadUnmapped, tab]);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadUnmapped(), loadMappings()]);
  }, [loadMappings, loadUnmapped]);

  const unmappedRows = getCollection(unmappedData, ["unmapped", "unmappedSkus"]);
  const mappingRows = getCollection(mappingData, ["mappings", "skuMappings"]);
  const unmappedPagination = getPagination(unmappedData, unmappedRows.length);
  const mappingPagination = getPagination(mappingData, mappingRows.length);
  const unmappedCount = unmappedPagination.totalCount;
  const currentLoading = tab === "unmapped" ? unmappedLoading : mappingLoading;
  const currentError = tab === "unmapped" ? unmappedError : mappingError;

  const tabs = useMemo(
    () => [
      { id: "unmapped", label: "Unmapped queue", icon: Inbox, count: unmappedCount },
      { id: "all", label: "All mappings", icon: Link2 },
    ],
    [unmappedCount],
  );

  return (
    <section className="min-w-0 space-y-5">
      <PageHeader
        badge={<><Link2 className="h-3.5 w-3.5" />Procurement Planning</>}
        title="Channel SKU Mapping"
        description="Clear unresolved channel SKUs like an inbox so every sales row resolves to a finished product."
        actions={
          <>
            <AppButton variant="secondary" disabled={currentLoading} onClick={() => tab === "unmapped" ? void loadUnmapped() : void loadMappings()}>
              <RefreshCw className={`h-4 w-4 ${currentLoading ? "animate-spin" : ""}`} />Refresh
            </AppButton>
            {capabilities.canCreate && (
              <AppButton onClick={() => setModal({ open: true, record: null })}>
                <Link2 className="h-4 w-4" />New mapping
              </AppButton>
            )}
          </>
        }
      />
      {unmappedCount > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="text-sm font-semibold">{unmappedCount} channel SKU{unmappedCount === 1 ? "" : "s"} still block planning</p>
            <p className="mt-0.5 text-xs leading-5">Map the most frequently seen SKUs first to unlock the largest share of sales history.</p>
          </div>
        </div>
      )}
      <ProcurementTabs active={tab} tabs={tabs} onChange={(value) => { setTab(value); setSearch(""); setChannelId(""); }} />
      <ProcurementSectionCard>
        <div className="grid gap-3 border-b border-slate-100 p-4 md:grid-cols-[minmax(0,1fr)_260px_180px]">
          <AppInput label="Search" placeholder="Channel SKU, product, or item" value={search} onChange={(event) => { setSearch(event.target.value); setUnmappedPage(1); setMappingPage(1); }} />
          <ProcurementChannelSelect channels={channels} label="Sales channel" placeholder="All active channels" value={channelId} onChange={(value) => { setChannelId(value); setUnmappedPage(1); setMappingPage(1); }} />
          {tab === "all" && <AppSelect label="Status" options={[{ label: "All status", value: "all" }, { label: "Active", value: "active" }, { label: "Inactive", value: "inactive" }]} value={activeFilter} onChange={(value) => { setActiveFilter(value); setMappingPage(1); }} />}
        </div>
        {channelsError && <div className="p-4 pb-0"><ProcurementInlineError title="Channels unavailable" message={getProcurementError(channelsError)} /></div>}
        {currentLoading ? <ProcurementLoadingRows columns={tab === "unmapped" ? 7 : 8} /> : currentError ? <ProcurementErrorState error={currentError} onRetry={tab === "unmapped" ? loadUnmapped : loadMappings} /> : tab === "unmapped" ? (
          unmappedRows.length === 0 ? <ProcurementEmptyState icon={CheckCircle2} title="Unmapped inbox is clear" description="Every channel SKU in retained sales history has an active product mapping." /> : (
            <div className="overflow-x-auto"><table className="min-w-[980px] w-full text-left"><thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">#</th><th className="px-4 py-3">Channel</th><th className="px-4 py-3">Channel SKU</th><th className="px-4 py-3">Product name</th><th className="px-4 py-3 text-right">Occurrences</th><th className="px-4 py-3">Seen between</th><th className="px-4 py-3 text-right">Action</th></tr></thead><tbody className="divide-y divide-slate-100 text-sm">{unmappedRows.map((row, index) => <tr key={`${row.salesChannelId ?? row.channelCode}-${row.channelSku}`} className="hover:bg-amber-50/40"><td className="border-b border-slate-100 px-4 py-3.5 text-xs font-semibold tabular-nums text-slate-400">{(unmappedPage - 1) * pageSize + index + 1}</td><td className="px-4 py-3"><ProcurementPill tone="slate">{row.channelCode ?? row.channelName}</ProcurementPill></td><td className="px-4 py-3 font-semibold text-slate-800">{row.channelSku}</td><td className="max-w-72 px-4 py-3 text-slate-600">{row.channelProductName ?? "-"}</td><td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-900">{formatProcurementInteger(row.occurrenceCount ?? row.count)}</td><td className="px-4 py-3 text-xs text-slate-600">{formatProcurementDate(row.firstSeenDate ?? row.fromDate)} – {formatProcurementDate(row.lastSeenDate ?? row.toDate)}</td><td className="px-4 py-3 text-right"><div className="flex items-center justify-end gap-0.5">{capabilities.canCreate && <AppButton className="h-8 px-3" onClick={() => setModal({ open: true, record: row })}><Link2 className="h-4 w-4" />Map</AppButton>}</div></td></tr>)}</tbody></table></div>
          )
        ) : mappingRows.length === 0 ? <ProcurementEmptyState title="No SKU mappings found" /> : (
          <div className="overflow-x-auto"><table className="min-w-[980px] w-full text-left"><thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">#</th><th className="px-4 py-3">Channel</th><th className="px-4 py-3">Channel SKU</th><th className="px-4 py-3">Channel product</th><th className="px-4 py-3">Resolved item</th><th className="px-4 py-3">Classification</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Action</th></tr></thead><tbody className="divide-y divide-slate-100 text-sm">{mappingRows.map((row, index) => { const active = getProcurementBoolean(row.isActive, true); const classification = row.procurementClassification ?? row.item?.procurementClassification; return <tr key={getRecordId(row, ["skuMappingId"])}><td className="border-b border-slate-100 px-4 py-3.5 text-xs font-semibold tabular-nums text-slate-400">{(mappingPage - 1) * pageSize + index + 1}</td><td className="px-4 py-3 text-slate-600">{row.channelCode ?? row.channelName}</td><td className="px-4 py-3 font-semibold text-slate-800">{row.channelSku}</td><td className="px-4 py-3 text-slate-600">{row.channelProductName ?? "-"}</td><td className="px-4 py-3"><p className="font-medium text-slate-800">{getItemCode(row.item) || row.itemCode}</p><p className="text-xs text-slate-500">{getItemName(row.item) || row.itemName}</p></td><td className="px-4 py-3"><ProcurementPill tone={classification == null ? "amber" : "slate"}>{classification == null ? "Legacy / unclassified" : PROCUREMENT_ITEM_CLASSIFICATION_LABELS[classification] ?? classification}</ProcurementPill></td><td className="px-4 py-3"><ProcurementPill tone={active ? "emerald" : "slate"}>{active ? "Active" : "Inactive"}</ProcurementPill></td><td className="px-4 py-3 text-right"><div className="flex items-center justify-end gap-0.5">{capabilities.canEdit && <AppButton className="h-8 px-3" variant="secondary" onClick={() => setModal({ open: true, record: row })}><Pencil className="h-4 w-4" />Edit</AppButton>}</div></td></tr>; })}</tbody></table></div>
        )}
        {tab === "unmapped" ? <ProcurementPagination disabled={unmappedLoading} {...unmappedPagination} onPageChange={setUnmappedPage} onPageSizeChange={(value) => { setPageSize(Number(value)); setUnmappedPage(1); }} /> : <ProcurementPagination disabled={mappingLoading} {...mappingPagination} onPageChange={setMappingPage} onPageSizeChange={(value) => { setPageSize(Number(value)); setMappingPage(1); }} />}
      </ProcurementSectionCard>
      <MappingModal channels={channels} isOpen={modal.open} record={modal.record} onClose={() => setModal({ open: false, record: null })} onSaved={refreshAll} />
    </section>
  );
};

export default SkuMappingPage;
