import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Download,
  FileClock,
  FileSpreadsheet,
  FileUp,
  History,
  Layers3,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  UploadCloud,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import AppButton from "../../../components/common/AppButton";
import AppInput from "../../../components/common/AppInput";
import AppModal from "../../../components/common/AppModal";
import AppSelect from "../../../components/common/AppSelect";
import PageHeader from "../../../components/common/PageHeader";
import { SalesImportBatchStatus } from "../../../constants/procurementEnums";
import { salesImportService } from "../../../services/procurement/salesImportService";
import {
  InventoryBasisNote,
  ProcurementChannelSelect,
  ProcurementDateRangeFields,
  ProcurementEmptyState,
  ProcurementErrorState,
  ProcurementInlineError,
  ProcurementItemAutocomplete,
  ProcurementLoadingRows,
  ProcurementPagination,
  ProcurementPill,
  ProcurementSectionCard,
  ProcurementStatTile,
  ProcurementTabs,
} from "../ProcurementShared";
import {
  formatProcurementDate,
  formatProcurementDateTime,
  formatProcurementDecimal,
  formatProcurementInteger,
  getApiStatus,
  getCollection,
  getDefaultProcurementRange,
  getFieldErrorMap,
  getItemCode,
  getItemName,
  getPagination,
  getProcurementError,
  getRecordId,
  hasDecimalPrecision,
  isManualSalesRow,
  toIsoDate,
  validateDateRange,
} from "../procurementHelpers";
import useProcurementCapabilities from "../useProcurementCapabilities";
import useActiveSalesChannels from "../useProcurementChannels";
import useLatestRequest from "../../../hooks/useLatestRequest";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = ["csv", "xlsx"];
const EXPECTED_HEADER =
  "SalesDate,ChannelCode,ChannelSku,ChannelProductName,Quantity";

const getPreviewRows = (preview) =>
  getCollection(preview, ["previewRows", "salesRows"]);

const getRowErrors = (row) => {
  if (Array.isArray(row?.errors)) {
    return row.errors.map((error) =>
      typeof error === "string" ? error : error.message ?? String(error),
    );
  }

  return [];
};

const getPreviewRowStatus = (row) => {
  const status = String(row?.status ?? "").toLowerCase();
  const errors = getRowErrors(row);

  if (errors.length > 0 || row?.isValid === false || status.includes("invalid")) {
    return "invalid";
  }
  if (
    row?.isMapped === false ||
    row?.isUnmapped === true ||
    status.includes("unmapped")
  ) {
    return "unmapped";
  }
  if (row?.isDuplicate === true || status.includes("duplicate")) {
    return "duplicate";
  }

  return "valid";
};

const getPreviewCounts = (preview, rows) => {
  const computed = rows.reduce(
    (result, row) => {
      const status = getPreviewRowStatus(row);
      result.total += 1;
      result[status] += 1;
      return result;
    },
    { duplicate: 0, invalid: 0, total: 0, unmapped: 0, valid: 0 },
  );

  return {
    total: Number(preview?.totalRows ?? preview?.totalCount) || computed.total,
    valid: Number(preview?.validRows ?? preview?.validCount) || computed.valid,
    invalid:
      Number(preview?.invalidRows ?? preview?.invalidCount) || computed.invalid,
    unmapped:
      Number(preview?.unmappedRows ?? preview?.unmappedCount) ||
      computed.unmapped,
    duplicate:
      Number(preview?.duplicateRows ?? preview?.duplicateCount) ||
      computed.duplicate,
  };
};

const PreviewGrid = ({ filter, preview, onFilter }) => {
  const [expandedRows, setExpandedRows] = useState(new Set());
  const rows = getPreviewRows(preview);
  const filteredRows =
    filter === "total"
      ? rows
      : rows.filter((row) => getPreviewRowStatus(row) === filter);

  if (rows.length === 0) {
    return (
      <ProcurementEmptyState
        title="The file has no preview rows"
        description="Check the expected header and make sure the file contains at least one sales row."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-[1180px] w-full text-left">
        <thead className="sticky top-0 z-10 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3">Row</th>
            <th className="px-4 py-3">Sales date</th>
            <th className="px-4 py-3">Channel</th>
            <th className="px-4 py-3">Channel SKU</th>
            <th className="px-4 py-3">Product name</th>
            <th className="px-4 py-3 text-right">Quantity</th>
            <th className="px-4 py-3">Resolved item</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-sm">
          {filteredRows.map((row, index) => {
            const rowNumber = row.rowNumber ?? index + 1;
            const status = getPreviewRowStatus(row);
            const errors = getRowErrors(row);
            const expanded = expandedRows.has(rowNumber);
            const item = row.resolvedItem ?? row.item;

            return (
              <tr
                key={`${rowNumber}-${row.channelSku ?? "row"}`}
                className={
                  status === "invalid"
                    ? "bg-red-50/60"
                    : status === "unmapped"
                      ? "bg-amber-50/60"
                      : "bg-white"
                }
              >
                <td className="px-4 py-3 align-top font-medium text-slate-600">
                  {rowNumber}
                </td>
                <td className="px-4 py-3 align-top text-slate-600">
                  {formatProcurementDate(row.salesDate)}
                </td>
                <td className="px-4 py-3 align-top text-slate-700">
                  {row.channelCode ?? "-"}
                </td>
                <td className="px-4 py-3 align-top font-medium text-slate-800">
                  {row.channelSku ?? "-"}
                </td>
                <td className="max-w-56 px-4 py-3 align-top text-slate-600">
                  <span className="line-clamp-2">{row.channelProductName ?? "-"}</span>
                </td>
                <td className="px-4 py-3 text-right align-top font-medium tabular-nums text-slate-800">
                  {formatProcurementDecimal(row.quantity)}
                </td>
                <td className="px-4 py-3 align-top">
                  {item || row.itemCode ? (
                    <div>
                      <p className="font-medium text-slate-800">
                        {getItemCode(item) || row.itemCode}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {getItemName(item) || row.itemName}
                      </p>
                    </div>
                  ) : (
                    <span className="text-slate-400">Not resolved</span>
                  )}
                </td>
                <td className="px-4 py-3 align-top">
                  <div className="space-y-2">
                    <ProcurementPill
                      tone={
                        status === "invalid"
                          ? "red"
                          : status === "unmapped"
                            ? "amber"
                            : status === "duplicate"
                              ? "violet"
                              : "emerald"
                      }
                    >
                      {status}
                    </ProcurementPill>
                    {errors.length > 0 && (
                      <div>
                        <button
                          type="button"
                          className="text-xs font-semibold text-red-700 underline decoration-red-300 underline-offset-2"
                          onClick={() => {
                            setExpandedRows((current) => {
                              const next = new Set(current);
                              if (next.has(rowNumber)) {
                                next.delete(rowNumber);
                              } else {
                                next.add(rowNumber);
                              }
                              return next;
                            });
                          }}
                        >
                          {expanded ? "Hide" : "Show"} {errors.length} row error
                          {errors.length === 1 ? "" : "s"}
                        </button>
                        {expanded && (
                          <ul className="mt-2 max-w-64 space-y-1 text-xs leading-5 text-red-700">
                            {errors.map((error) => (
                              <li key={error} className="flex gap-1.5">
                                <span aria-hidden="true">•</span>
                                <span>{error}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {filteredRows.length === 0 && (
        <ProcurementEmptyState
          title={`No ${filter} rows`}
          description="Choose another preview summary card to inspect those rows."
          action={
            <AppButton variant="secondary" onClick={() => onFilter("total")}>
              Show all rows
            </AppButton>
          }
        />
      )}
    </div>
  );
};

const ImportTab = ({ canCreate, canExport }) => {
  const initialRange = useMemo(() => getDefaultProcurementRange(), []);
  const [range, setRange] = useState(initialRange);
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState("");
  const [preview, setPreview] = useState(null);
  const [previewError, setPreviewError] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const [filter, setFilter] = useState("total");
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [correctionReason, setCorrectionReason] = useState("");
  const [correctionError, setCorrectionError] = useState("");
  const inputRef = useRef(null);
  const { beginRequest, isLatestRequest } = useLatestRequest();

  const previewFile = useCallback(async (nextFile) => {
    if (!nextFile) {
      return;
    }

    const requestId = beginRequest();
    const extension = nextFile.name.split(".").pop()?.toLowerCase();

    if (!ACCEPTED_EXTENSIONS.includes(extension)) {
      setFile(null);
      setFileError("Choose a .csv or .xlsx file.");
      setPreview(null);
      setPreviewLoading(false);
      return;
    }
    if (nextFile.size > MAX_FILE_SIZE) {
      setFile(null);
      setFileError("The file is larger than 10 MB.");
      setPreview(null);
      setPreviewLoading(false);
      return;
    }

    setFile(nextFile);
    setFileError("");
    setPreview(null);
    setPreviewError("");
    setPreviewLoading(true);
    setFilter("total");

    try {
      const response = await salesImportService.preview(nextFile);
      if (isLatestRequest(requestId)) {
        setPreview(response.data);
      }
    } catch (error) {
      if (isLatestRequest(requestId)) {
        setPreviewError(
          getProcurementError(error, "Unable to preview this sales file."),
        );
      }
    } finally {
      if (isLatestRequest(requestId)) {
        setPreviewLoading(false);
      }
    }
  }, [beginRequest, isLatestRequest]);

  const confirmImport = async (allowDuplicate, reason) => {
    if (!file || !canCreate) {
      return;
    }

    setConfirmLoading(true);
    setPreviewError("");
    try {
      const response = await salesImportService.confirm(
        file,
        allowDuplicate,
        reason,
      );
      toast.success(response.message || "Sales import confirmed successfully.");
      setPreview(null);
      setFile(null);
      setCorrectionOpen(false);
      setCorrectionReason("");
    } catch (error) {
      const message = getProcurementError(
        error,
        "Unable to confirm the sales import.",
      );
      if (allowDuplicate && correctionOpen) {
        setCorrectionError(message);
      } else {
        setPreviewError(message);
      }
    } finally {
      setConfirmLoading(false);
    }
  };

  const rows = getPreviewRows(preview);
  const counts = getPreviewCounts(preview, rows);
  const duplicateFile = Boolean(preview?.duplicateFile ?? preview?.isDuplicateFile);
  const rangeError = validateDateRange(range.fromDate, range.toDate);

  return (
    <div className="space-y-4">
      <ProcurementSectionCard
        title="Import sales workbook"
        description="Use the retained file to preview row-level validation before confirming the import."
      >
        <div className="grid gap-5 p-5 xl:grid-cols-[360px_minmax(0,1fr)]">
          <div className="space-y-4">
            <ProcurementDateRangeFields
              {...range}
              error={rangeError}
              max={toIsoDate(new Date())}
              onChange={(patch) => setRange((current) => ({ ...current, ...patch }))}
            />
            {canExport && (
              <AppButton
                className="w-full"
                isLoading={downloadLoading}
                loadingText="Downloading…"
                variant="secondary"
                onClick={async () => {
                  setDownloadLoading(true);
                  setDownloadError("");
                  try {
                    await salesImportService.downloadTemplate();
                  } catch (error) {
                    const message = getProcurementError(
                      error,
                      "Unable to download the template.",
                    );
                    setDownloadError(message);
                    if (getApiStatus(error) !== 409) toast.error(message);
                  } finally {
                    setDownloadLoading(false);
                  }
                }}
              >
                <Download className="h-4 w-4" />
                Download template
              </AppButton>
            )}
          </div>
          <div>
            <button
              type="button"
              disabled={!canCreate}
              className="flex min-h-48 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center transition-colors hover:border-brand hover:bg-brand-light disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => inputRef.current?.click()}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                void previewFile(event.dataTransfer.files?.[0]);
              }}
            >
              <span className="rounded-2xl bg-white p-3 text-brand shadow-sm">
                <UploadCloud className="h-6 w-6" />
              </span>
              <span className="mt-4 text-sm font-semibold text-slate-800">
                {file ? file.name : "Drop CSV/XLSX here or choose a file"}
              </span>
              <span className="mt-1 text-xs text-slate-500">
                Maximum 10 MB · CSV or XLSX
              </span>
            </button>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.xlsx"
              className="hidden"
              onChange={(event) => void previewFile(event.target.files?.[0])}
            />
            <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 font-mono text-[11px] text-slate-600">
              Expected header: {EXPECTED_HEADER}
            </p>
            {fileError && <p className="mt-2 text-xs text-red-600">{fileError}</p>}
          </div>
        </div>
      </ProcurementSectionCard>
      <ProcurementInlineError message={downloadError} title="Template could not be downloaded" />

      {previewLoading && (
        <ProcurementSectionCard title="Validating file">
          <ProcurementLoadingRows columns={5} rows={5} />
        </ProcurementSectionCard>
      )}

      <ProcurementInlineError message={previewError} title="Import could not be completed" />

      {preview && !previewLoading && (
        <>
          {duplicateFile && (
            <div className="flex items-start gap-3 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-violet-800">
              <FileClock className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="text-sm font-semibold">This file was imported before</p>
                <p className="mt-0.5 text-xs leading-5">
                  Confirming it again is treated as a correction and requires a reason.
                </p>
              </div>
            </div>
          )}
          {counts.unmapped > 0 && (
            <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="text-sm font-semibold">
                    {counts.unmapped} unmapped row{counts.unmapped === 1 ? "" : "s"} block planning
                  </p>
                  <p className="mt-0.5 text-xs leading-5">
                    Clear these channel SKUs from the mapping inbox before generating a plan.
                  </p>
                </div>
              </div>
              <Link
                className="shrink-0 text-xs font-semibold underline underline-offset-2"
                to="/procurement/sku-mapping"
              >
                Open SKU Mapping
              </Link>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <ProcurementStatTile
              active={filter === "total"}
              icon={Layers3}
              label="Total"
              value={counts.total}
              onClick={() => setFilter("total")}
            />
            <ProcurementStatTile
              active={filter === "valid"}
              icon={CheckCircle2}
              label="Valid"
              tone="emerald"
              value={counts.valid}
              onClick={() => setFilter("valid")}
            />
            <ProcurementStatTile
              active={filter === "invalid"}
              icon={XCircle}
              label="Invalid"
              tone="red"
              value={counts.invalid}
              onClick={() => setFilter("invalid")}
            />
            <ProcurementStatTile
              active={filter === "unmapped"}
              icon={AlertTriangle}
              label="Unmapped"
              tone="amber"
              value={counts.unmapped}
              onClick={() => setFilter("unmapped")}
            />
            <ProcurementStatTile
              active={filter === "duplicate"}
              icon={FileClock}
              label="Duplicate"
              tone="slate"
              value={counts.duplicate}
              onClick={() => setFilter("duplicate")}
            />
          </div>
          <ProcurementSectionCard
            title="Preview rows"
            description="Invalid-row messages stay attached to the exact workbook row that needs correction."
            actions={
              canCreate && (
                <AppButton
                  disabled={counts.invalid > 0}
                  isLoading={confirmLoading}
                  loadingText="Confirming…"
                  onClick={() => {
                    if (duplicateFile) {
                      setCorrectionReason("");
                      setCorrectionError("");
                      setCorrectionOpen(true);
                    } else {
                      void confirmImport(false);
                    }
                  }}
                >
                  <FileUp className="h-4 w-4" />
                  Confirm import
                </AppButton>
              )
            }
          >
            {counts.invalid > 0 && (
              <div className="border-b border-red-100 bg-red-50 px-4 py-2 text-xs font-medium text-red-700">
                Confirm is disabled until every invalid row is corrected and previewed again.
              </div>
            )}
            <PreviewGrid filter={filter} preview={preview} onFilter={setFilter} />
          </ProcurementSectionCard>
        </>
      )}

      <AppModal
        isBusy={confirmLoading}
        isOpen={correctionOpen}
        title="Confirm duplicate file as a correction"
        onClose={() => !confirmLoading && setCorrectionOpen(false)}
      >
        <p className="text-sm leading-6 text-slate-600">
          Explain why this previously imported file must be accepted again. The reason is retained with the batch audit trail.
        </p>
        <div className="mt-4">
          <label className="text-xs font-semibold text-slate-700" htmlFor="correction-reason">
            Correction reason <span className="text-red-500">*</span>
          </label>
          <textarea
            id="correction-reason"
            rows={4}
            value={correctionReason}
            onChange={(event) => {
              setCorrectionReason(event.target.value);
              setCorrectionError("");
            }}
            className={`mt-1.5 w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 ${
              correctionError ? "border-red-400" : "border-slate-200"
            }`}
          />
          {correctionError && (
            <p className="mt-1 text-xs text-red-600">{correctionError}</p>
          )}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <AppButton variant="secondary" onClick={() => setCorrectionOpen(false)}>
            Back
          </AppButton>
          <AppButton
            isLoading={confirmLoading}
            loadingText="Confirming…"
            onClick={() => {
              if (!correctionReason.trim()) {
                setCorrectionError("A correction reason is required.");
                return;
              }
              void confirmImport(true, correctionReason.trim());
            }}
          >
            Confirm correction
          </AppButton>
        </div>
      </AppModal>
    </div>
  );
};

const emptyManualForm = () => ({
  channelProductName: "",
  channelSku: "",
  item: null,
  notes: "",
  quantity: "",
  salesChannelId: "",
  salesDate: toIsoDate(new Date()),
});

const ManualSaleModal = ({
  channels,
  isOpen,
  onClose,
  onSaved,
  record,
}) => {
  const [form, setForm] = useState(emptyManualForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setForm(
        record
          ? {
              channelProductName: record.channelProductName ?? "",
              channelSku: record.channelSku ?? "",
              item: record.item ??
                (record.itemId
                  ? {
                      itemCode: record.itemCode,
                      itemId: record.itemId,
                      itemName: record.itemName,
                    }
                  : null),
              notes: record.notes ?? "",
              quantity: String(record.quantity ?? ""),
              salesChannelId: record.salesChannelId ?? record.channelId ?? "",
              salesDate: String(record.salesDate ?? "").slice(0, 10),
            }
          : emptyManualForm(),
      );
      setErrors({});
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [isOpen, record]);

  const submit = async () => {
    const validation = {};
    const quantity = Number(form.quantity);

    if (!form.salesDate) validation.salesDate = "Sales date is required.";
    if (!form.salesChannelId) validation.salesChannelId = "Choose a channel.";
    if (!form.channelSku.trim()) validation.channelSku = "Channel SKU is required.";
    if (!form.item) validation.itemId = "Choose the resolved item.";
    if (!(quantity > 0)) validation.quantity = "Quantity must be greater than zero.";
    if (!hasDecimalPrecision(form.quantity)) {
      validation.quantity = "Use no more than 6 decimal places.";
    }

    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      return;
    }

    setSaving(true);
    setErrors({});
    const payload = {
      salesDate: form.salesDate,
      salesChannelId: form.salesChannelId,
      channelSku: form.channelSku.trim(),
      channelProductName: form.channelProductName.trim() || null,
      itemId: getRecordId(form.item, ["itemId"]),
      quantity,
      notes: form.notes.trim() || null,
    };

    try {
      const id = getRecordId(record, ["salesHistoryId", "manualSalesId"]);
      const response = id
        ? await salesImportService.updateManual(id, payload)
        : await salesImportService.createManual(payload);
      toast.success(response.message || `Manual sale ${id ? "updated" : "added"}.`);
      onSaved();
      onClose();
    } catch (error) {
      const status = getApiStatus(error);
      if ([400, 422].includes(status)) {
        setErrors(getFieldErrorMap(error));
      } else {
        setErrors({ form: getProcurementError(error, "Unable to save the sale.") });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppModal
      isBusy={saving}
      isOpen={isOpen}
      maxWidth="max-w-3xl"
      title={record ? "Edit manual sales entry" : "Add manual sales entry"}
      onClose={saving ? undefined : onClose}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <AppInput
          error={errors.salesDate}
          label="Sales date"
          required
          type="date"
          value={form.salesDate}
          onChange={(event) => setForm((current) => ({ ...current, salesDate: event.target.value }))}
        />
        <ProcurementChannelSelect
          channels={channels}
          error={errors.salesChannelId}
          label="Sales channel"
          required
          value={form.salesChannelId}
          onChange={(value) => setForm((current) => ({ ...current, salesChannelId: value }))}
        />
        <AppInput
          error={errors.channelSku}
          label="Channel SKU"
          required
          value={form.channelSku}
          onChange={(event) => setForm((current) => ({ ...current, channelSku: event.target.value }))}
        />
        <AppInput
          error={errors.channelProductName}
          label="Channel product name"
          value={form.channelProductName}
          onChange={(event) =>
            setForm((current) => ({ ...current, channelProductName: event.target.value }))
          }
        />
        <div className="sm:col-span-2">
          <ProcurementItemAutocomplete
            error={errors.itemId}
            label="Resolved item"
            required
            value={form.item}
            onChange={(item) => setForm((current) => ({ ...current, item }))}
          />
        </div>
        <AppInput
          error={errors.quantity}
          label="Quantity"
          min="0"
          required
          step="any"
          type="number"
          value={form.quantity}
          onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))}
        />
        <AppInput
          error={errors.notes}
          label="Notes"
          value={form.notes}
          onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
        />
      </div>
      <div className="mt-4">
        <ProcurementInlineError message={errors.form} />
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <AppButton variant="secondary" onClick={onClose}>Cancel</AppButton>
        <AppButton isLoading={saving} loadingText="Saving…" onClick={submit}>Save manual entry</AppButton>
      </div>
    </AppModal>
  );
};

const HistoryTab = ({
  canCreate,
  canDelete,
  canEdit,
  channelError,
  channels,
  channelsLoading,
  onRetryChannels,
}) => {
  const initialRange = useMemo(() => getDefaultProcurementRange(), []);
  const [filters, setFilters] = useState({
    ...initialRange,
    importBatchId: "",
    isMapped: "all",
    item: null,
    salesChannelId: "",
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState({ open: false, record: null });
  const [deleteRecord, setDeleteRecord] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const { beginRequest, isLatestRequest } = useLatestRequest();

  const load = useCallback(async () => {
    const rangeValidation = validateDateRange(filters.fromDate, filters.toDate);
    if (rangeValidation) {
      setError(rangeValidation);
      setLoading(false);
      return;
    }

    const requestId = beginRequest();
    setLoading(true);
    setError(null);
    try {
      const response = await salesImportService.getHistory({
        FromDate: filters.fromDate,
        ToDate: filters.toDate,
        SalesChannelId: filters.salesChannelId || undefined,
        ItemId: getRecordId(filters.item, ["itemId"]) || undefined,
        ImportBatchId: filters.importBatchId || undefined,
        IsMapped: filters.isMapped === "all" ? undefined : filters.isMapped === "true",
        PageNumber: page,
        PageSize: pageSize,
      });
      if (isLatestRequest(requestId)) {
        setData(response.data);
      }
    } catch (loadError) {
      if (isLatestRequest(requestId)) {
        setError(loadError);
      }
    } finally {
      if (isLatestRequest(requestId)) {
        setLoading(false);
      }
    }
  }, [beginRequest, filters, isLatestRequest, page, pageSize]);

  useEffect(() => {
    beginRequest();
    const timeout = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeout);
  }, [beginRequest, load]);

  const rows = getCollection(data, ["sales", "history"]);
  const pagination = getPagination(data, rows.length);
  const rangeError = validateDateRange(filters.fromDate, filters.toDate);

  return (
    <div className="space-y-4">
      <ProcurementSectionCard
        title="Sales history"
        description="Imported entries are read-only. Manual entries retain edit and delete controls."
        actions={
          canCreate && (
            <AppButton disabled={channelsLoading || Boolean(channelError)} onClick={() => setModal({ open: true, record: null })}>
              <Plus className="h-4 w-4" />Add manual entry
            </AppButton>
          )
        }
      >
        {channelError && <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between"><ProcurementInlineError title="Sales channels unavailable" message={getProcurementError(channelError, "Unable to load active sales channels.")} /><AppButton className="shrink-0" variant="secondary" onClick={onRetryChannels}><RefreshCw className="h-4 w-4" />Retry channels</AppButton></div>}
        <div className="grid gap-4 border-b border-slate-100 p-4 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <ProcurementDateRangeFields
              fromDate={filters.fromDate}
              toDate={filters.toDate}
              error={rangeError}
              onChange={(patch) => {
                setFilters((current) => ({ ...current, ...patch }));
                setPage(1);
              }}
            />
          </div>
          <ProcurementChannelSelect
            channels={channels}
            disabled={channelsLoading || Boolean(channelError)}
            label="Channel"
            placeholder="All channels"
            value={filters.salesChannelId}
            onChange={(salesChannelId) => {
              setFilters((current) => ({ ...current, salesChannelId }));
              setPage(1);
            }}
          />
          <AppSelect
            label="Mapping status"
            options={[
              { label: "All rows", value: "all" },
              { label: "Mapped", value: "true" },
              { label: "Unmapped", value: "false" },
            ]}
            value={filters.isMapped}
            onChange={(isMapped) => {
              setFilters((current) => ({ ...current, isMapped }));
              setPage(1);
            }}
          />
          <div className="lg:col-span-2">
            <ProcurementItemAutocomplete
              label="Item"
              value={filters.item}
              onChange={(item) => {
                setFilters((current) => ({ ...current, item }));
                setPage(1);
              }}
            />
          </div>
          <AppInput
            label="Import batch id"
            placeholder="Filter retained batch rows"
            value={filters.importBatchId}
            onChange={(event) => {
              setFilters((current) => ({ ...current, importBatchId: event.target.value }));
              setPage(1);
            }}
          />
          <div className="flex items-end">
            <AppButton className="w-full" variant="secondary" disabled={loading} onClick={load}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />Refresh
            </AppButton>
          </div>
        </div>
        {loading ? (
          <ProcurementLoadingRows columns={8} />
        ) : error ? (
          <ProcurementErrorState error={error} onRetry={load} />
        ) : rows.length === 0 ? (
          <ProcurementEmptyState title="No sales in this range" />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1000px] w-full text-left">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Date</th><th className="px-4 py-3">Channel</th>
                  <th className="px-4 py-3">Channel SKU</th><th className="px-4 py-3">Item</th>
                  <th className="px-4 py-3 text-right">Quantity</th><th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {rows.map((row, index) => {
                  const manual = isManualSalesRow(row);
                  return (
                    <tr key={getRecordId(row, ["salesHistoryId", "manualSalesId"])} className="hover:bg-slate-50/70">
                      <td className="border-b border-slate-100 px-4 py-3.5 text-xs font-semibold tabular-nums text-slate-400">{(page - 1) * pageSize + index + 1}</td>
                      <td className="px-4 py-3 text-slate-600">{formatProcurementDate(row.salesDate)}</td>
                      <td className="px-4 py-3 text-slate-700">{row.channelCode ?? row.channelName ?? "-"}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{row.channelSku ?? "-"}</td>
                      <td className="px-4 py-3"><p className="font-medium text-slate-800">{row.itemCode ?? "Unmapped"}</p><p className="text-xs text-slate-500">{row.itemName}</p></td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums">{formatProcurementDecimal(row.quantity)}</td>
                      <td className="px-4 py-3"><ProcurementPill tone={manual ? "brand" : "slate"}>{manual ? "Manual" : "Imported"}</ProcurementPill></td>
                      <td className="px-4 py-3"><div className="flex items-center justify-end gap-0.5">
                        {manual && canEdit && <button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-all hover:bg-slate-100 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 disabled:cursor-not-allowed disabled:opacity-40" onClick={() => setModal({ open: true, record: row })}><Pencil className="h-4 w-4" /></button>}
                        {manual && canDelete && <button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-all hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 disabled:cursor-not-allowed disabled:opacity-40" onClick={() => { setDeleteError(""); setDeleteRecord(row); }}><Trash2 className="h-4 w-4" /></button>}
                      </div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <ProcurementPagination
          disabled={loading}
          pageNumber={pagination.pageNumber}
          pageSize={pagination.pageSize}
          totalCount={pagination.totalCount}
          totalPages={pagination.totalPages}
          onPageChange={setPage}
          onPageSizeChange={(value) => { setPageSize(Number(value)); setPage(1); }}
        />
      </ProcurementSectionCard>
      <ManualSaleModal
        channels={channels}
        isOpen={modal.open}
        record={modal.record}
        onClose={() => setModal({ open: false, record: null })}
        onSaved={load}
      />
      <AppModal isBusy={deleteLoading} isOpen={Boolean(deleteRecord)} title="Delete manual sales entry?" onClose={() => !deleteLoading && setDeleteRecord(null)}>
        <p className="text-sm leading-6 text-slate-600">This removes only the selected manual entry. Imported batch rows are never deleted here.</p>
        <div className="mt-4"><ProcurementInlineError message={deleteError} title="Entry could not be deleted" /></div>
        <div className="mt-5 flex justify-end gap-2">
          <AppButton variant="secondary" onClick={() => setDeleteRecord(null)}>Keep entry</AppButton>
          <AppButton variant="danger" isLoading={deleteLoading} loadingText="Deleting…" onClick={async () => {
            setDeleteLoading(true);
            try {
              await salesImportService.deleteManual(getRecordId(deleteRecord, ["salesHistoryId", "manualSalesId"]));
              toast.success("Manual sales entry deleted."); setDeleteRecord(null); await load();
            } catch (requestError) {
              const message = getProcurementError(requestError, "Unable to delete the entry.");
              setDeleteError(message);
              if (getApiStatus(requestError) !== 409) toast.error(message);
            }
            finally { setDeleteLoading(false); }
          }}><Trash2 className="h-4 w-4" />Delete entry</AppButton>
        </div>
      </AppModal>
    </div>
  );
};

const BatchesTab = ({ canEdit }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelError, setCancelError] = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);
  const {
    beginRequest: beginListRequest,
    isLatestRequest: isLatestListRequest,
  } = useLatestRequest();
  const {
    beginRequest: beginDetailRequest,
    isLatestRequest: isLatestDetailRequest,
  } = useLatestRequest();

  const load = useCallback(async () => {
    const requestId = beginListRequest();
    setLoading(true); setError(null);
    try {
      const response = await salesImportService.listBatches({ PageNumber: page, PageSize: pageSize });
      if (isLatestListRequest(requestId)) setData(response.data);
    }
    catch (loadError) { if (isLatestListRequest(requestId)) setError(loadError); }
    finally { if (isLatestListRequest(requestId)) setLoading(false); }
  }, [beginListRequest, isLatestListRequest, page, pageSize]);

  useEffect(() => {
    beginListRequest();
    const timeout = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeout);
  }, [beginListRequest, load]);
  const rows = getCollection(data, ["batches", "importBatches"]);
  const pagination = getPagination(data, rows.length);

  const openDetail = async (batch) => {
    const requestId = beginDetailRequest();
    setDetail(batch); setDetailError(null); setDetailLoading(true);
    try {
      const response = await salesImportService.getBatch(getRecordId(batch, ["importBatchId"]));
      if (isLatestDetailRequest(requestId)) setDetail(response.data);
    }
    catch (detailError) {
      if (!isLatestDetailRequest(requestId)) return;
      if (getApiStatus(detailError) === 404) { toast.error("This import batch no longer exists."); setDetail(null); }
      else { setDetailError(detailError); }
    } finally { if (isLatestDetailRequest(requestId)) setDetailLoading(false); }
  };

  return (
    <ProcurementSectionCard title="Import batches" description="Open a batch to inspect its retained source rows and audit status." actions={<AppButton variant="secondary" disabled={loading} onClick={load}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />Refresh</AppButton>}>
      {cancelError && <div className="p-4 pb-0"><ProcurementInlineError title="Batch conflict" message={cancelError} /></div>}
      {loading ? <ProcurementLoadingRows columns={7} /> : error ? <ProcurementErrorState error={error} onRetry={load} /> : rows.length === 0 ? <ProcurementEmptyState title="No import batches yet" /> : (
        <div className="overflow-x-auto"><table className="min-w-[900px] w-full text-left"><thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">#</th><th className="px-4 py-3">File</th><th className="px-4 py-3">Imported</th><th className="px-4 py-3 text-right">Rows</th><th className="px-4 py-3 text-right">Unmapped</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
        <tbody className="divide-y divide-slate-100 text-sm">{rows.map((batch, index) => { const cancelled = Number(batch.status) === SalesImportBatchStatus.Cancelled || String(batch.status).toLowerCase().includes("cancel"); return <tr key={getRecordId(batch, ["importBatchId"])}><td className="border-b border-slate-100 px-4 py-3.5 text-xs font-semibold tabular-nums text-slate-400">{(page - 1) * pageSize + index + 1}</td><td className="px-4 py-3"><button type="button" className="font-semibold text-brand hover:underline" onClick={() => void openDetail(batch)}>{batch.fileName ?? batch.originalFileName ?? "Import batch"}</button><p className="text-xs text-slate-500">{batch.batchNumber ?? getRecordId(batch, ["importBatchId"])}</p></td><td className="px-4 py-3 text-slate-600">{formatProcurementDateTime(batch.importedAt ?? batch.createdAt)}</td><td className="px-4 py-3 text-right tabular-nums">{formatProcurementInteger(batch.totalRows ?? batch.rowCount)}</td><td className="px-4 py-3 text-right tabular-nums">{formatProcurementInteger(batch.unmappedRows ?? batch.unmappedCount, "0")}</td><td className="px-4 py-3"><ProcurementPill tone={cancelled ? "red" : "emerald"}>{cancelled ? "Cancelled" : "Completed"}</ProcurementPill></td><td className="px-4 py-3"><div className="flex items-center justify-end gap-0.5"><AppButton className="h-8 px-3" variant="secondary" onClick={() => void openDetail(batch)}>View</AppButton>{canEdit && <AppButton className="h-8 px-3" variant="ghost" disabled={cancelled} onClick={() => { setCancelTarget(batch); setCancelReason(""); setCancelError(""); }}>Cancel</AppButton>}</div></td></tr>; })}</tbody></table></div>
      )}
      <ProcurementPagination disabled={loading} {...pagination} onPageChange={setPage} onPageSizeChange={(value) => { setPageSize(Number(value)); setPage(1); }} />

      <AppModal isOpen={Boolean(detail)} maxWidth="max-w-5xl" title="Import batch detail" onClose={() => { setDetail(null); setDetailError(null); }}>
        {detailLoading ? <ProcurementLoadingRows columns={5} rows={4} /> : detailError ? <ProcurementErrorState error={detailError} onRetry={() => void openDetail(detail)} /> : detail && <div className="space-y-4"><div className="grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-4"><div><p className="text-[11px] uppercase text-slate-500">File</p><p className="mt-1 text-sm font-semibold text-slate-800">{detail.fileName ?? detail.originalFileName ?? "-"}</p></div><div><p className="text-[11px] uppercase text-slate-500">Imported</p><p className="mt-1 text-sm text-slate-700">{formatProcurementDateTime(detail.importedAt ?? detail.createdAt)}</p></div><div><p className="text-[11px] uppercase text-slate-500">Rows</p><p className="mt-1 text-sm font-semibold">{formatProcurementInteger(detail.totalRows ?? detail.rowCount)}</p></div><div><p className="text-[11px] uppercase text-slate-500">Status</p><p className="mt-1 text-sm">{detail.statusName ?? detail.status ?? "-"}</p></div></div>{getCollection(detail, ["salesRows", "retainedRows"]).length === 0 ? <ProcurementEmptyState title="No retained batch rows" /> : <div className="max-h-[50vh] overflow-auto rounded-xl border border-slate-200"><table className="min-w-[760px] w-full text-left"><thead className="sticky top-0 bg-slate-50 text-[11px] uppercase text-slate-500"><tr><th className="px-3 py-2">Row</th><th className="px-3 py-2">Date</th><th className="px-3 py-2">Channel SKU</th><th className="px-3 py-2">Item</th><th className="px-3 py-2 text-right">Quantity</th></tr></thead><tbody className="divide-y divide-slate-100 text-sm">{getCollection(detail, ["salesRows", "retainedRows"]).map((row, index) => <tr key={row.id ?? index}><td className="px-3 py-2">{row.rowNumber ?? index + 1}</td><td className="px-3 py-2">{formatProcurementDate(row.salesDate)}</td><td className="px-3 py-2 font-medium">{row.channelSku}</td><td className="px-3 py-2">{row.itemCode ?? "Unmapped"}</td><td className="px-3 py-2 text-right">{formatProcurementDecimal(row.quantity)}</td></tr>)}</tbody></table></div>}</div>}
      </AppModal>
      <AppModal isBusy={cancelLoading} isOpen={Boolean(cancelTarget)} title="Cancel import batch" onClose={() => !cancelLoading && setCancelTarget(null)}>
        <p className="text-sm leading-6 text-slate-600">Cancelling removes this batch from planning inputs while preserving its audit trail. Provide a reason.</p>
        <label className="mt-4 block text-xs font-semibold text-slate-700" htmlFor="batch-cancel-reason">Cancellation reason <span className="text-red-500">*</span></label><textarea id="batch-cancel-reason" rows={4} value={cancelReason} onChange={(event) => { setCancelReason(event.target.value); setCancelError(""); }} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" />
        <ProcurementInlineError message={cancelError} title="Batch conflict" />
        <div className="mt-5 flex justify-end gap-2"><AppButton variant="secondary" onClick={() => setCancelTarget(null)}>Back</AppButton><AppButton variant="danger" isLoading={cancelLoading} loadingText="Cancelling…" onClick={async () => { if (!cancelReason.trim()) { setCancelError("A cancellation reason is required."); return; } setCancelLoading(true); try { await salesImportService.cancelBatch(getRecordId(cancelTarget, ["importBatchId"]), cancelReason.trim()); toast.success("Import batch cancelled."); setCancelTarget(null); await load(); } catch (cancelRequestError) { const message = getProcurementError(cancelRequestError, "Unable to cancel the batch."); setCancelError(message); if (getApiStatus(cancelRequestError) !== 409) toast.error(message); } finally { setCancelLoading(false); } }}>Cancel batch</AppButton></div>
      </AppModal>
    </ProcurementSectionCard>
  );
};

const getChannelQuantity = (product, channel) => {
  const values = product?.channelQuantities ?? product?.quantitiesByChannel ?? {};
  const id = getRecordId(channel, ["salesChannelId", "channelId"]);
  const code = channel.channelCode ?? channel.code;

  if (Array.isArray(values)) {
    return values.find((entry) =>
      String(entry.salesChannelId ?? entry.channelId ?? entry.channelCode) ===
      String(id ?? code),
    )?.quantity;
  }

  return values[id] ?? values[String(id)] ?? values[code] ?? 0;
};

const ProductSummaryTab = () => {
  const initialRange = useMemo(() => getDefaultProcurementRange(), []);
  const [range, setRange] = useState(initialRange);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { beginRequest, isLatestRequest } = useLatestRequest();
  const rangeError = validateDateRange(range.fromDate, range.toDate, 366);

  const load = useCallback(async () => {
    const validation = validateDateRange(range.fromDate, range.toDate, 366);
    if (validation) { setError(validation); setData(null); setLoading(false); return; }
    const requestId = beginRequest();
    setLoading(true); setError(null);
    try {
      const response = await salesImportService.getSummary(range);
      if (isLatestRequest(requestId)) setData(response.data);
    }
    catch (loadError) { if (isLatestRequest(requestId)) setError(loadError); }
    finally { if (isLatestRequest(requestId)) setLoading(false); }
  }, [beginRequest, isLatestRequest, range]);

  useEffect(() => {
    beginRequest();
    const timeout = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeout);
  }, [beginRequest, load]);
  const channels = getCollection(data, ["channels", "salesChannels"]);
  const products = getCollection(data, ["products", "summary", "productSummaries"]);

  return (
    <div className="space-y-4">
      <InventoryBasisNote message="This sales matrix shows demand inputs only. Planning later compares the derived material demand with global physical on-hand inventory." />
      <ProcurementSectionCard title="Product summary" description="A workbook-style product × channel matrix; channel columns come from the server in its supplied order." actions={<AppButton disabled={Boolean(rangeError) || loading} onClick={load}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />Refresh matrix</AppButton>}>
        <div className="max-w-2xl border-b border-slate-100 p-4"><ProcurementDateRangeFields {...range} error={rangeError} onChange={(patch) => setRange((current) => ({ ...current, ...patch }))} /></div>
        {loading ? <ProcurementLoadingRows columns={Math.max(3, channels.length + 2)} /> : error ? <ProcurementErrorState error={error} onRetry={rangeError ? undefined : load} /> : products.length === 0 ? <ProcurementEmptyState title="No product sales in this range" /> : (
          <div className="max-h-[65vh] overflow-auto"><table className="min-w-max w-full border-separate border-spacing-0 text-left"><thead className="sticky top-0 z-20 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500"><tr><th className="sticky left-0 z-30 min-w-64 border-b border-r border-slate-200 bg-slate-50 px-4 py-3">Product</th>{channels.map((channel) => <th key={getRecordId(channel, ["salesChannelId", "channelId"])} className="min-w-32 border-b border-slate-200 px-4 py-3 text-right">{channel.channelCode ?? channel.channelName}</th>)}<th className="min-w-32 border-b border-l border-slate-200 bg-brand-light px-4 py-3 text-right text-brand">Total</th></tr></thead>
          <tbody>{products.map((product) => <tr key={getRecordId(product, ["productId", "itemId"])} className="group"><td className="sticky left-0 z-10 border-b border-r border-slate-100 bg-white px-4 py-3 group-hover:bg-slate-50"><p className="text-sm font-semibold text-slate-800">{product.itemCode ?? product.productCode}</p><p className="mt-0.5 text-xs text-slate-500">{product.itemName ?? product.productName}</p></td>{channels.map((channel) => <td key={getRecordId(channel, ["salesChannelId", "channelId"])} className="border-b border-slate-100 px-4 py-3 text-right text-sm tabular-nums text-slate-700">{formatProcurementDecimal(getChannelQuantity(product, channel), "0")}</td>)}<td className="border-b border-l border-slate-100 bg-brand-light/40 px-4 py-3 text-right text-sm font-semibold tabular-nums text-slate-900">{formatProcurementDecimal(product.totalQuantity ?? product.total, "0")}</td></tr>)}</tbody></table></div>
        )}
      </ProcurementSectionCard>
    </div>
  );
};

const SalesImportPage = () => {
  const [tab, setTab] = useState("import");
  const {
    channels,
    error: channelError,
    loading: channelsLoading,
    reload: reloadChannels,
  } = useActiveSalesChannels();
  const capabilities = useProcurementCapabilities({
    label: "ProcurementPlanning.SalesImport",
    resource: "ProcurementPlanning.SalesImport",
    route: "/procurement/sales-import",
  });
  const tabs = [
    { id: "import", label: "Import", icon: FileUp },
    { id: "history", label: "History", icon: History },
    { id: "batches", label: "Batches", icon: FileSpreadsheet },
    { id: "summary", label: "Product Summary", icon: CalendarDays },
  ];

  return (
    <section className="min-w-0 space-y-5">
      <PageHeader
        badge={<><FileUp className="h-3.5 w-3.5" />Procurement Planning</>}
        title="Sales Import"
        description="Bring channel demand into planning with row-level validation, mapping visibility, and a complete batch audit trail."
      />
      <ProcurementTabs active={tab} tabs={tabs} onChange={setTab} />
      {tab === "import" && <ImportTab canCreate={capabilities.canCreate} canExport={capabilities.canExport} />}
      {tab === "history" && <HistoryTab channels={channels} channelError={channelError} channelsLoading={channelsLoading} onRetryChannels={reloadChannels} canCreate={capabilities.canCreate} canEdit={capabilities.canEdit} canDelete={capabilities.canDelete} />}
      {tab === "batches" && <BatchesTab canEdit={capabilities.canEdit} />}
      {tab === "summary" && <ProductSummaryTab />}
    </section>
  );
};

export default SalesImportPage;
