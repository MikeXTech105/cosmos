import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Inbox,
  Link2,
  ListChecks,
  RotateCw,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import AppButton from "../../../components/common/AppButton";
import AppInput from "../../../components/common/AppInput";
import AppModal from "../../../components/common/AppModal";
import AppSelect from "../../../components/common/AppSelect";
import AppTooltip from "../../../components/common/AppTooltip";
import MaterialTypePill from "../../../components/common/MaterialTypePill";
import PageHeader from "../../../components/common/PageHeader";
import { skuMappingService } from "../../../services/procurement/skuMappingService";
import {
  ProcurementChannelSelect,
  ProcurementErrorState,
  ProcurementInlineError,
  ProcurementItemAutocomplete,
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
import useActiveSalesChannels from "../useProcurementChannels";
import useLatestRequest from "../../../hooks/useLatestRequest";
import ProcurementStatCards from "../ProcurementStatCards";
import ProcurementTable, {
  PROCUREMENT_ROW_ACTION_CLASS,
  PROCUREMENT_TABLE_HEADER_CLASS,
} from "../ProcurementTable";

const emptyForm = () => ({
  channelProductName: "",
  channelSku: "",
  isActive: true,
  item: null,
  salesChannelId: "",
});

const downloadMappingsCsv = (rows) => {
  const escape = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const csvRows = [
    ["Channel", "Channel SKU", "Channel product", "Resolved item", "Status"],
    ...rows.map((row) => [
      row.channelCode ?? row.channelName,
      row.channelSku,
      row.channelProductName,
      getItemCode(row.item) || row.itemCode,
      getProcurementBoolean(row.isActive, true) ? "Active" : "Inactive",
    ]),
  ];
  const url = URL.createObjectURL(
    new Blob(
      [`\uFEFF${csvRows.map((row) => row.map(escape).join(",")).join("\r\n")}`],
      { type: "text/csv;charset=utf-8" },
    ),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "procurement-sku-mappings.csv";
  anchor.click();
  URL.revokeObjectURL(url);
};

export const MappingModal = ({
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
              <p className="text-sm font-semibold">Legacy material type</p>
              <p className="mt-0.5 text-xs leading-5">
                This item has no material type. It remains selectable for compatibility, but classify it as a finished product in Item Master.
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

const SkuMappingPage = ({ embedded = false, moduleTabs = null }) => {
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
  const {
    beginRequest: beginUnmappedRequest,
    isLatestRequest: isLatestUnmappedRequest,
  } = useLatestRequest();
  const {
    beginRequest: beginMappingRequest,
    isLatestRequest: isLatestMappingRequest,
  } = useLatestRequest();
  const { channels, error: channelsError } = useActiveSalesChannels();
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

  const unmappedRows = getCollection(unmappedData, ["unmapped", "unmappedSkus"]);
  const mappingRows = getCollection(mappingData, ["mappings", "skuMappings"]);
  const unmappedPagination = getPagination(unmappedData, unmappedRows.length);
  const mappingPagination = getPagination(mappingData, mappingRows.length);
  const unmappedCount = unmappedPagination.totalCount;
  const currentLoading = tab === "unmapped" ? unmappedLoading : mappingLoading;
  const currentError = tab === "unmapped" ? unmappedError : mappingError;
  const totalMappings =
    mappingData?.totalCount ??
    mappingData?.summary?.totalCount ??
    mappingPagination.totalCount;
  const activeMappings =
    mappingData?.activeCount ??
    mappingData?.summary?.activeCount ??
    (activeFilter === "active"
      ? mappingPagination.totalCount
      : mappingData !== null &&
          activeFilter === "all" &&
          mappingPagination.totalCount === mappingRows.length
        ? mappingRows.filter((row) => getProcurementBoolean(row.isActive, true)).length
        : null);
  const activeFilterCount = [
    Boolean(search.trim()),
    Boolean(channelId),
    tab === "all" && activeFilter !== "all",
  ].filter(Boolean).length;

  const tabs = useMemo(
    () => [
      { id: "all", label: "Mappings", icon: Link2 },
      { id: "unmapped", label: "Unmapped", icon: Inbox, count: unmappedCount },
    ],
    [unmappedCount],
  );

  return (
    <section className="min-w-0 space-y-5">
      {!embedded && <PageHeader
        badge={<><Link2 className="h-3.5 w-3.5" />Procurement Planning</>}
        title="Channel SKU Mapping"
        description="Clear unresolved channel SKUs like an inbox so every sales row resolves to a finished product."
        actions={
          <>
            <AppButton variant="secondary" disabled={currentLoading} onClick={() => tab === "unmapped" ? void loadUnmapped() : void loadMappings()}>
              <RotateCw className={`h-4 w-4 ${currentLoading ? "animate-spin" : ""}`} />Refresh
            </AppButton>
            <AppButton
              disabled={mappingRows.length === 0}
              variant="secondary"
              onClick={() => downloadMappingsCsv(mappingRows)}
            >
              <Download className="h-4 w-4" />Export
            </AppButton>
            <Link to="/supply-chain/item-mappings">
              <AppButton>
                <Link2 className="h-4 w-4" />Manage in Supply Chain
              </AppButton>
            </Link>
          </>
        }
      />}
      <ProcurementStatCards
        cards={[
          mappingLoading || mappingData !== null
            ? {
                icon: ListChecks,
                label: "Total mappings",
                loading: mappingLoading || mappingData === null,
                value: totalMappings,
              }
            : null,
          activeMappings === null || activeMappings === undefined
            ? null
            : { icon: CheckCircle2, label: "Active", value: activeMappings },
          unmappedLoading || unmappedData !== null
            ? {
                icon: Inbox,
                label: "Unmapped SKUs",
                loading: unmappedLoading,
                value: unmappedCount,
              }
            : null,
        ]}
      />
      {moduleTabs}
      <div className="rounded-xl border border-brand/20 bg-brand-light px-4 py-3 text-sm text-slate-700">
        This is a read-only compatibility view.{" "}
        <Link
          className="font-semibold text-brand hover:underline"
          to="/supply-chain/item-mappings"
        >
          Mappings are managed in Supply Chain → Item Mappings
        </Link>
      </div>
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
        <div className="m-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_260px_180px]">
          <AppInput label="Search" placeholder="Channel SKU, product, or item" value={search} onChange={(event) => { setSearch(event.target.value); setUnmappedPage(1); setMappingPage(1); }} />
          <ProcurementChannelSelect channels={channels} label="Sales channel" placeholder="All active channels" value={channelId} onChange={(value) => { setChannelId(value); setUnmappedPage(1); setMappingPage(1); }} />
          {tab === "all" && <AppSelect label="Status" options={[{ label: "All status", value: "all" }, { label: "Active", value: "active" }, { label: "Inactive", value: "inactive" }]} value={activeFilter} onChange={(value) => { setActiveFilter(value); setMappingPage(1); }} />}
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
            <p className="text-xs text-slate-500">{activeFilterCount} active filter{activeFilterCount === 1 ? "" : "s"}</p>
            {activeFilterCount > 0 && <AppButton variant="ghost" onClick={() => { setSearch(""); setChannelId(""); setActiveFilter("all"); setUnmappedPage(1); setMappingPage(1); }}>Clear</AppButton>}
          </div>
        </div>
        {channelsError && <div className="p-4 pb-0"><ProcurementInlineError title="Channels unavailable" message={getProcurementError(channelsError)} /></div>}
        {currentError ? <ProcurementErrorState error={currentError} onRetry={tab === "unmapped" ? loadUnmapped : loadMappings} /> : tab === "unmapped" ? (
          <ProcurementTable
            columnCount={7}
            emptyIcon={CheckCircle2}
            emptyHint="Every channel SKU in retained sales history has an active product mapping."
            emptyTitle={!unmappedLoading && unmappedRows.length === 0 ? "Unmapped inbox is clear" : undefined}
            head={<><th className={PROCUREMENT_TABLE_HEADER_CLASS}>#</th><th className={PROCUREMENT_TABLE_HEADER_CLASS}>Channel</th><th className={PROCUREMENT_TABLE_HEADER_CLASS}>Channel SKU</th><th className={PROCUREMENT_TABLE_HEADER_CLASS}>Product name</th><th className={`${PROCUREMENT_TABLE_HEADER_CLASS} text-right`}>Occurrences</th><th className={PROCUREMENT_TABLE_HEADER_CLASS}>Seen between</th><th className={`${PROCUREMENT_TABLE_HEADER_CLASS} text-right`}>Action</th></>}
            loading={unmappedLoading}
            minWidth="min-w-[980px]"
          >
            {unmappedRows.map((row, index) => <tr key={`${row.salesChannelId ?? row.channelCode}-${row.channelSku}`}><td className="text-xs font-semibold tabular-nums text-slate-400">{(unmappedPage - 1) * pageSize + index + 1}</td><td><ProcurementPill tone="slate">{row.channelCode ?? row.channelName}</ProcurementPill></td><td className="font-semibold text-slate-800">{row.channelSku}</td><td>{row.channelProductName ?? "-"}</td><td className="text-right font-semibold tabular-nums text-slate-900">{formatProcurementInteger(row.occurrenceCount ?? row.count)}</td><td className="text-xs">{formatProcurementDate(row.firstSeenDate ?? row.fromDate)} – {formatProcurementDate(row.lastSeenDate ?? row.toDate)}</td><td><div className="flex items-center justify-end gap-0.5"><AppTooltip label="Manage this SKU in Supply Chain"><Link aria-label="Manage SKU in Supply Chain" className={PROCUREMENT_ROW_ACTION_CLASS} to="/supply-chain/item-mappings"><Link2 className="h-4 w-4" /></Link></AppTooltip></div></td></tr>)}
          </ProcurementTable>
        ) : (
          <ProcurementTable
            columnCount={8}
            emptyHint="Mappings created in Supply Chain will appear here. Clear the current filters if needed."
            emptyTitle={!mappingLoading && mappingRows.length === 0 ? "No SKU mappings yet" : undefined}
            head={<><th className={PROCUREMENT_TABLE_HEADER_CLASS}>#</th><th className={PROCUREMENT_TABLE_HEADER_CLASS}>Channel</th><th className={PROCUREMENT_TABLE_HEADER_CLASS}>Channel SKU</th><th className={PROCUREMENT_TABLE_HEADER_CLASS}>Channel product</th><th className={PROCUREMENT_TABLE_HEADER_CLASS}>Resolved item</th><th className={PROCUREMENT_TABLE_HEADER_CLASS}>Material type</th><th className={PROCUREMENT_TABLE_HEADER_CLASS}>Status</th><th className={`${PROCUREMENT_TABLE_HEADER_CLASS} text-right`}>Action</th></>}
            loading={mappingLoading}
            minWidth="min-w-[980px]"
          >
            {mappingRows.map((row, index) => { const active = getProcurementBoolean(row.isActive, true); const classification = row.procurementClassification ?? row.item?.procurementClassification; return <tr key={getRecordId(row, ["skuMappingId"])}><td className="text-xs font-semibold tabular-nums text-slate-400">{(mappingPage - 1) * pageSize + index + 1}</td><td>{row.channelCode ?? row.channelName}</td><td className="font-semibold text-slate-800">{row.channelSku}</td><td>{row.channelProductName ?? "-"}</td><td><p className="font-medium text-slate-800">{getItemCode(row.item) || row.itemCode}</p><p className="text-xs text-slate-500">{getItemName(row.item) || row.itemName}</p></td><td><MaterialTypePill value={classification} /></td><td><ProcurementPill tone={active ? "emerald" : "slate"}>{active ? "Active" : "Inactive"}</ProcurementPill></td><td><div className="flex items-center justify-end gap-0.5"><AppTooltip label="Manage this mapping in Supply Chain"><Link aria-label="Manage mapping in Supply Chain" className={PROCUREMENT_ROW_ACTION_CLASS} to="/supply-chain/item-mappings"><Link2 className="h-4 w-4" /></Link></AppTooltip></div></td></tr>; })}
          </ProcurementTable>
        )}
        {tab === "unmapped" ? <ProcurementPagination disabled={unmappedLoading} {...unmappedPagination} onPageChange={setUnmappedPage} onPageSizeChange={(value) => { setPageSize(Number(value)); setUnmappedPage(1); }} /> : <ProcurementPagination disabled={mappingLoading} {...mappingPagination} onPageChange={setMappingPage} onPageSizeChange={(value) => { setPageSize(Number(value)); setMappingPage(1); }} />}
      </ProcurementSectionCard>
    </section>
  );
};

export default SkuMappingPage;
