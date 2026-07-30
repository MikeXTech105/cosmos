import {
  AlertTriangle,
  CheckCircle2,
  Clipboard,
  Download,
  Eye,
  FileSpreadsheet,
  History,
  Inbox,
  Plus,
  RotateCw,
  Upload,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
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
  SUPPLY_CHAIN_IMPORT_EXTENSIONS,
  SUPPLY_CHAIN_IMPORT_STATUSES,
  SUPPLY_CHAIN_IMPORT_TYPE_OPTIONS,
  SUPPLY_CHAIN_IMPORT_TYPES,
  SUPPLY_CHAIN_MAX_IMPORT_BYTES,
} from "../../../constants/supplyChainEnums";
import { supplyChainImportService } from "../../../services/supplyChain/importService";
import {
  fetchSupplyChainImports,
  setImportFilters,
  setImportPage,
  setImportPageSize,
} from "../../../store/slices/supplyChain/importSlice";
import {
  getApiErrorMessage,
  getApiStatus,
} from "../../../utils/apiError";
import { downloadCsv } from "../../../utils/csv";
import {
  downloadResponseBlob,
  getDownloadErrorMessage,
} from "../../../utils/fileDownload";
import { ProcurementTabs } from "../../procurement/ProcurementShared";
import {
  formatSupplyChainDate,
  formatSupplyChainNumber,
} from "../supplyChainDisplay";
import {
  DisabledAction,
  SupplyChainBadge,
  SupplyChainFilterBar,
  SupplyChainInlineError,
  SupplyChainPagination,
} from "../SupplyChainShared";
import useSupplyChainCapabilities from "../useSupplyChainCapabilities";
import useSupplyChainChannels from "../useSupplyChainChannels";

const WIZARD_STEPS = ["Choose", "Validate", "Commit", "Result"];

const getBatch = (details) => details?.batch ?? details;
const getBatchId = (record) => record?.batchId ?? record?.id;
const normalizeStatus = (value) => String(value ?? "").trim().toLowerCase();
const isCommittedBatch = (batch) =>
  normalizeStatus(batch?.status) === "committed";
const isCancelledBatch = (batch) =>
  normalizeStatus(batch?.status) === "cancelled";

const validateImportFile = (file) => {
  if (!file) {
    return "Choose a CSV or XLSX file.";
  }

  const extension = `.${String(file.name).split(".").pop()?.toLowerCase()}`;

  if (!SUPPLY_CHAIN_IMPORT_EXTENSIONS.includes(extension)) {
    return "Only .csv and .xlsx files are supported.";
  }

  if (file.size > SUPPLY_CHAIN_MAX_IMPORT_BYTES) {
    return "The file must be 10 MB or smaller.";
  }

  return "";
};

const getValidationRows = (validation) =>
  Array.isArray(validation?.rowErrors) ? validation.rowErrors : [];

const isDuplicateFileValidation = (validation) => {
  if (validation?.isDuplicateFile === true || validation?.duplicateFileHash) {
    return true;
  }

  return (validation?.warnings ?? []).some((warning) =>
    /previously committed|duplicate file|file hash/i.test(
      warning?.message ?? warning,
    ),
  );
};

const getCommitDisabledReason = ({
  canApprove,
  committing,
  validation,
}) => {
  if (!validation) return "Validate a file before committing.";
  if (committing) return "The batch is being committed.";
  if (validation.canCommit === false) {
    return (
      validation.commitBlockingReason ??
      validation.blockingReason ??
      "Validation found blocking errors. Resolve them and validate again."
    );
  }
  if (!canApprove) {
    return "Commit requires Supply Chain Imports approval permission.";
  }

  return "";
};

const validationChips = (validation) => [
  { key: "all", label: "Total rows", value: validation?.totalRows },
  { key: "valid", label: "Valid", value: validation?.validRows },
  { key: "invalid", label: "Invalid", value: validation?.invalidRows },
  { key: "duplicates", label: "Duplicates", value: validation?.duplicateRows },
  {
    key: "items",
    label: "Unmatched items",
    value: validation?.unmatchedItemCount,
  },
  {
    key: "channels",
    label: "Unmatched channels",
    value: validation?.unmatchedChannelCount,
  },
  {
    key: "warehouses",
    label: "Unmatched warehouses",
    value: validation?.unmatchedWarehouseCount,
  },
];

const filterValidationErrors = (rows, filter) => {
  if (filter === "all" || filter === "invalid") return rows;
  if (filter === "valid") return [];

  const patterns = {
    channels: /channel/i,
    duplicates: /duplicate|already exists/i,
    items: /item|sku|mapping/i,
    warehouses: /warehouse/i,
  };
  const pattern = patterns[filter];

  return pattern
    ? rows.filter((row) =>
        pattern.test(`${row.field ?? ""} ${row.message ?? ""}`),
      )
    : rows;
};

const StatusPill = ({ status }) => {
  const normalized = normalizeStatus(status);
  const tone =
    normalized === "committed"
      ? "emerald"
      : normalized === "cancelled"
        ? "slate"
        : normalized === "failed"
          ? "red"
          : normalized === "validated"
            ? "amber"
            : "brand";

  return <SupplyChainBadge tone={tone}>{status || "Unknown"}</SupplyChainBadge>;
};

const ErrorRowsTable = ({ offset = 0, rows }) => (
  <DataTableShell
    colGroup={
      <colgroup>
        <col className="w-[56px]" />
        <col className="w-28" />
        <col className="w-40" />
        <col />
        <col className="w-52" />
      </colgroup>
    }
    columnCount={5}
    emptyHint="The selected validation category has no row errors."
    emptyTitle={rows.length === 0 ? "No matching row errors" : undefined}
    head={
      <>
        <th className={DATA_TABLE_HEADER_CLASS}>#</th>
        <th className={`${DATA_TABLE_HEADER_CLASS} text-right`}>Row number</th>
        <th className={DATA_TABLE_HEADER_CLASS}>Field</th>
        <th className={DATA_TABLE_HEADER_CLASS}>Message</th>
        <th className={DATA_TABLE_HEADER_CLASS}>Original value</th>
      </>
    }
    minWidth="min-w-[920px]"
  >
    {rows.map((row, index) => (
      <tr key={`${row.rowNumber}-${row.field}-${index}`}>
        <td className="px-4 py-3.5 text-xs font-semibold tabular-nums text-slate-400">
          {offset + index + 1}
        </td>
        <td className="text-right tabular-nums">
          {formatSupplyChainNumber(row.rowNumber, "—", 0)}
        </td>
        <td className="font-medium text-slate-800">{row.field || "—"}</td>
        <td>{row.message || "—"}</td>
        <td className="truncate" title={String(row.originalValue ?? "")}>
          {String(row.originalValue ?? "—").slice(0, 160)}
        </td>
      </tr>
    ))}
  </DataTableShell>
);

const NewImportWizard = ({
  canApprove,
  canExport,
  channels,
  onCommitted,
  onOpenHistory,
}) => {
  const [step, setStep] = useState(1);
  const [choice, setChoice] = useState({
    channelId: "",
    file: null,
    importType: SUPPLY_CHAIN_IMPORT_TYPES.ProcurementSales,
  });
  const [fileError, setFileError] = useState("");
  const [validation, setValidation] = useState(null);
  const [validationCorrelationId, setValidationCorrelationId] = useState("");
  const [validationError, setValidationError] = useState("");
  const [validating, setValidating] = useState(false);
  const [errorFilter, setErrorFilter] = useState("all");
  const [errorPage, setErrorPage] = useState(1);
  const [errorPageSize, setErrorPageSize] = useState(20);
  const [correctionReason, setCorrectionReason] = useState("");
  const [commitError, setCommitError] = useState("");
  const [committing, setCommitting] = useState(false);
  const [duplicateConfirmOpen, setDuplicateConfirmOpen] = useState(false);
  const [result, setResult] = useState(null);

  const chooseFile = (file) => {
    const message = validateImportFile(file);
    setFileError(message);
    setChoice((current) => ({
      ...current,
      file: message ? null : file,
    }));
  };

  const validate = async () => {
    const message = validateImportFile(choice.file);

    if (message) {
      setFileError(message);
      return;
    }

    setValidating(true);
    setValidationError("");

    try {
      const response = await supplyChainImportService.validate(choice);
      setValidation(response.data);
      setValidationCorrelationId(response.correlationId ?? "");
      setErrorFilter("all");
      setErrorPage(1);
      setStep(2);
      toast.success(response.message || "Import validation completed.");
    } catch (error) {
      const errorMessage = getApiErrorMessage(
        error,
        "Unable to validate the import.",
      );
      setValidationError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setValidating(false);
    }
  };

  const downloadErrors = async () => {
    try {
      const response = await supplyChainImportService.downloadErrors(
        validation.batchId,
      );
      await downloadResponseBlob(
        response,
        `supply-chain-import-${validation.batchId}-errors.csv`,
      );
    } catch (error) {
      toast.error(
        await getDownloadErrorMessage(
          error,
          "Unable to download the error CSV.",
        ),
      );
    }
  };

  const commit = async (allowDuplicate) => {
    const reason = correctionReason.trim();

    if (allowDuplicate && !reason) {
      setCommitError(
        "A correction reason is required before recommitting this file.",
      );
      return;
    }

    setCommitting(true);
    setCommitError("");

    try {
      const response = await supplyChainImportService.commit(
        validation.batchId,
        {
          allowDuplicate,
          correctionReason: allowDuplicate ? reason : null,
        },
      );
      const details = await supplyChainImportService.getById(
        validation.batchId,
      );
      setResult({
        batch: getBatch(details.data),
        correlationId:
          response.correlationId ??
          details.correlationId ??
          getBatch(details.data)?.correlationId ??
          validationCorrelationId,
      });
      setDuplicateConfirmOpen(false);
      setStep(4);
      toast.success(response.message || "Import committed successfully.");
      await onCommitted();
    } catch (error) {
      const message = getApiErrorMessage(error, "Unable to commit the import.");
      setCommitError(message);
      toast.error(message);
    } finally {
      setCommitting(false);
    }
  };

  const beginCommit = () => {
    if (isDuplicateFileValidation(validation)) {
      if (!correctionReason.trim()) {
        setCommitError(
          "A correction reason is required because this file was previously committed.",
        );
        return;
      }
      setDuplicateConfirmOpen(true);
      return;
    }

    void commit(false);
  };

  const reset = () => {
    setStep(1);
    setChoice({
      channelId: "",
      file: null,
      importType: SUPPLY_CHAIN_IMPORT_TYPES.ProcurementSales,
    });
    setFileError("");
    setValidation(null);
    setValidationCorrelationId("");
    setValidationError("");
    setErrorFilter("all");
    setErrorPage(1);
    setCorrectionReason("");
    setCommitError("");
    setResult(null);
  };

  const allErrorRows = getValidationRows(validation);
  const filteredRows = filterValidationErrors(allErrorRows, errorFilter);
  const errorTotalPages = Math.max(
    1,
    Math.ceil(filteredRows.length / errorPageSize),
  );
  const pagedRows = filteredRows.slice(
    (errorPage - 1) * errorPageSize,
    errorPage * errorPageSize,
  );
  const disabledReason = getCommitDisabledReason({
    canApprove,
    committing,
    validation,
  });
  const unmatchedCount =
    Number(validation?.unmatchedItemCount ?? 0) +
    Number(validation?.unmatchedChannelCount ?? 0) +
    Number(validation?.unmatchedWarehouseCount ?? 0);
  const duplicateFile = isDuplicateFileValidation(validation);

  return (
    <div className="space-y-5">
      <div className="grid gap-2 sm:grid-cols-4">
        {WIZARD_STEPS.map((label, index) => {
          const number = index + 1;
          const active = number === step;
          const complete = number < step;

          return (
            <div
              key={label}
              className={[
                "rounded-xl border px-4 py-3 text-sm",
                active
                  ? "border-brand bg-brand-light text-brand"
                  : complete
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 bg-white text-slate-500",
              ].join(" ")}
            >
              <span className="font-semibold">{number}. {label}</span>
            </div>
          );
        })}
      </div>

      {step === 1 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Choose the import</h2>
          <p className="mt-1 text-sm text-slate-500">
            Validation creates a staged batch only. It never creates an Item or Warehouse from a spreadsheet row.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <AppSelect
              label="Import type"
              options={SUPPLY_CHAIN_IMPORT_TYPE_OPTIONS}
              required
              value={choice.importType}
              onChange={(importType) =>
                setChoice((current) => ({ ...current, importType }))
              }
            />
            <AppSelect
              label="Channel"
              options={[
                { label: "No channel scope", value: "" },
                ...channels.map((channel) => ({
                  label: `${channel.code} — ${channel.name}`,
                  value: channel.id,
                })),
              ]}
              value={choice.channelId}
              onChange={(channelId) =>
                setChoice((current) => ({ ...current, channelId }))
              }
            />
          </div>
          <label
            className={[
              "mt-5 flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors",
              fileError
                ? "border-red-300 bg-red-50"
                : "border-slate-300 bg-slate-50 hover:border-brand/50 hover:bg-brand-light",
            ].join(" ")}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              chooseFile(event.dataTransfer.files?.[0]);
            }}
          >
            <Upload className="h-8 w-8 text-slate-400" />
            <span className="mt-3 text-sm font-semibold text-slate-800">
              {choice.file?.name ?? "Drop a CSV or XLSX file here"}
            </span>
            <span className="mt-1 text-xs text-slate-500">
              Maximum 10 MB. The file is staged for validation before commit.
            </span>
            <input
              accept=".csv,.xlsx"
              className="sr-only"
              type="file"
              onChange={(event) => chooseFile(event.target.files?.[0])}
            />
          </label>
          {fileError ? (
            <p className="mt-2 text-xs font-medium text-red-600">{fileError}</p>
          ) : null}
          <div className="mt-4">
            <SupplyChainInlineError
              message={validationError}
              title="Validation failed"
            />
          </div>
          <div className="mt-5 flex justify-end">
            <AppButton
              isLoading={validating}
              loadingText="Validating…"
              onClick={validate}
            >
              Validate file
            </AppButton>
          </div>
        </div>
      ) : null}

      {step === 2 || step === 3 ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {validationChips(validation).map((chip) => {
              const count = Number(chip.value ?? 0);

              return (
                <button
                  key={chip.key}
                  className={[
                    "rounded-xl border bg-white p-4 text-left shadow-sm transition-colors",
                    errorFilter === chip.key
                      ? "border-brand ring-2 ring-brand/10"
                      : "border-slate-200 hover:border-brand/40",
                    count > 0 ? "" : "cursor-default opacity-60",
                  ].join(" ")}
                  disabled={count === 0}
                  type="button"
                  onClick={() => {
                    setErrorFilter(chip.key);
                    setErrorPage(1);
                  }}
                >
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                    {chip.label}
                  </p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">
                    {formatSupplyChainNumber(count, "0", 0)}
                  </p>
                </button>
              );
            })}
          </div>

          {(validation?.warnings ?? []).length > 0 ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <AlertTriangle className="h-4 w-4" />
                Validation warnings
              </div>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-5">
                {validation.warnings.map((warning, index) => (
                  <li key={warning?.code ?? index}>
                    {warning?.message ?? String(warning)}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium text-slate-700">
              Row errors: {formatSupplyChainNumber(filteredRows.length, "0", 0)}
            </p>
            {canExport ? (
              <AppButton
                disabled={!validation?.batchId || allErrorRows.length === 0}
                variant="secondary"
                onClick={() => void downloadErrors()}
              >
                <Download className="h-4 w-4" />
                Download error CSV
              </AppButton>
            ) : (
              <DisabledAction reason="Downloading errors requires export permission.">
                <AppButton disabled variant="secondary">
                  <Download className="h-4 w-4" />
                  Download error CSV
                </AppButton>
              </DisabledAction>
            )}
          </div>
          <ErrorRowsTable
            offset={(errorPage - 1) * errorPageSize}
            rows={pagedRows}
          />
          <SupplyChainPagination
            disabled={false}
            pageNumber={errorPage}
            pageSize={errorPageSize}
            totalCount={filteredRows.length}
            totalPages={errorTotalPages}
            onPageChange={setErrorPage}
            onPageSizeChange={(value) => {
              setErrorPageSize(Number(value));
              setErrorPage(1);
            }}
          />

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">
              Commit the staged batch
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Commit writes compatible sales history only. It does not create Items, Warehouses, purchase documents, stock movements, or accounting entries.
            </p>
            {unmatchedCount > 0 ? (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
                Unmatched rows may still be committed, but Procurement calculations will remain blocked until their SKUs are mapped.{" "}
                <Link className="font-semibold text-brand hover:underline" to="/supply-chain/item-mappings">
                  Resolve unmatched SKUs
                </Link>
              </div>
            ) : null}
            {duplicateFile ? (
              <div className="mt-4">
                <AppInput
                  error={
                    commitError.includes("correction reason")
                      ? commitError
                      : undefined
                  }
                  helperText="Required because this file appears to have been committed before."
                  label="Correction reason"
                  required
                  value={correctionReason}
                  onChange={(event) => {
                    setCorrectionReason(event.target.value);
                    setCommitError("");
                  }}
                />
              </div>
            ) : null}
            <div className="mt-4">
              <SupplyChainInlineError
                message={
                  commitError.includes("correction reason") ? "" : commitError
                }
                title="Commit failed"
              />
            </div>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <AppButton variant="secondary" onClick={reset}>
                Start over
              </AppButton>
              {disabledReason ? (
                <DisabledAction reason={disabledReason}>
                  <AppButton disabled>Commit import</AppButton>
                </DisabledAction>
              ) : (
                <AppButton
                  isLoading={committing}
                  loadingText="Committing…"
                  onClick={beginCommit}
                >
                  Commit import
                </AppButton>
              )}
            </div>
          </div>
        </>
      ) : null}

      {step === 4 && result ? (
        <div className="rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm">
          <CheckCircle2 className="h-10 w-10 text-emerald-600" />
          <h2 className="mt-4 text-xl font-semibold text-slate-900">
            Import committed
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {formatSupplyChainNumber(result.batch?.committedRows, "0", 0)} rows were committed.
          </p>
          <dl className="mt-5 grid gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium text-slate-500">Batch ID</dt>
              <dd className="mt-1 break-all text-sm font-semibold text-slate-900">
                {getBatchId(result.batch)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">Correlation ID</dt>
              <dd className="mt-1 flex items-center gap-2 break-all text-xs text-slate-400">
                {result.correlationId || "Not supplied"}
                {result.correlationId ? (
                  <AppTooltip label="Copy correlation ID">
                    <button
                      aria-label="Copy correlation ID"
                      className={DATA_TABLE_ROW_ACTION_CLASS}
                      type="button"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(result.correlationId);
                          toast.success("Correlation ID copied.");
                        } catch (error) {
                          toast.error(
                            getApiErrorMessage(
                              error,
                              "Unable to copy the correlation ID.",
                            ),
                          );
                        }
                      }}
                    >
                      <Clipboard className="h-4 w-4" />
                    </button>
                  </AppTooltip>
                ) : null}
              </dd>
            </div>
          </dl>
          <div className="mt-5 flex flex-wrap gap-2">
            <AppButton variant="secondary" onClick={onOpenHistory}>
              View in History
            </AppButton>
            <AppButton variant="secondary" onClick={reset}>
              Start another import
            </AppButton>
            {unmatchedCount > 0 ? (
              <Link to="/supply-chain/item-mappings">
                <AppButton>Resolve unmatched SKUs</AppButton>
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}

      <AppModal
        isBusy={committing}
        isOpen={duplicateConfirmOpen}
        title="Confirm duplicate-file correction"
        onClose={committing ? undefined : () => setDuplicateConfirmOpen(false)}
      >
        <p className="text-sm leading-6 text-slate-600">
          This file was previously committed. Continuing explicitly sets
          <span className="font-semibold text-slate-900"> allowDuplicate</span>{" "}
          and records your correction reason.
        </p>
        <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
          {correctionReason}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <AppButton variant="secondary" onClick={() => setDuplicateConfirmOpen(false)}>
            Back
          </AppButton>
          <AppButton isLoading={committing} loadingText="Committing…" onClick={() => void commit(true)}>
            Confirm and commit
          </AppButton>
        </div>
      </AppModal>
    </div>
  );
};

const ImportDetailsModal = ({ detail, isOpen, loading, onClose }) => {
  const batch = getBatch(detail);
  const errors = Array.isArray(detail?.errors) ? detail.errors : [];

  return (
    <AppModal
      isOpen={isOpen}
      maxWidth="max-w-4xl"
      title="Import batch details"
      onClose={onClose}
    >
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="h-5 animate-pulse rounded bg-slate-100" />
          ))}
        </div>
      ) : (
        <>
          <dl className="grid gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <div><dt className="text-xs text-slate-500">File</dt><dd className="mt-1 text-sm font-medium text-slate-900">{batch?.originalFileName || "—"}</dd></div>
            <div><dt className="text-xs text-slate-500">Status</dt><dd className="mt-1"><StatusPill status={batch?.status} /></dd></div>
            <div><dt className="text-xs text-slate-500">Total rows</dt><dd className="mt-1 text-sm font-medium tabular-nums">{formatSupplyChainNumber(batch?.totalRows, "0", 0)}</dd></div>
            <div><dt className="text-xs text-slate-500">Committed rows</dt><dd className="mt-1 text-sm font-medium tabular-nums">{formatSupplyChainNumber(batch?.committedRows, "0", 0)}</dd></div>
          </dl>
          <div className="mt-5">
            <ErrorRowsTable rows={errors} />
          </div>
        </>
      )}
      <div className="mt-5 flex justify-end">
        <AppButton variant="secondary" onClick={onClose}>Close</AppButton>
      </div>
    </AppModal>
  );
};

const ImportsPage = () => {
  const dispatch = useDispatch();
  const state = useSelector((root) => root.supplyChainImports);
  const { channels, error: channelError } = useSupplyChainChannels();
  const [tab, setTab] = useState("new");
  const [detail, setDetail] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelError, setCancelError] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const capabilities = useSupplyChainCapabilities({
    label: "SupplyChain.Imports",
    resource: "SupplyChain.Imports",
    route: "/supply-chain/imports",
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
    () => dispatch(fetchSupplyChainImports(params)),
    [dispatch, params],
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 0);

    return () => window.clearTimeout(timeout);
  }, [load]);

  const openDetail = async (batch) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetail(null);

    try {
      const response = await supplyChainImportService.getById(getBatchId(batch));
      setDetail(response.data);
    } catch (error) {
      if (getApiStatus(error) === 404) {
        toast.error("This import batch no longer exists. The list was refreshed.");
        setDetailOpen(false);
        await load();
      } else {
        toast.error(
          getApiErrorMessage(error, "Unable to load import batch details."),
        );
      }
    } finally {
      setDetailLoading(false);
    }
  };
  const downloadErrors = async (batch) => {
    try {
      const response = await supplyChainImportService.downloadErrors(
        getBatchId(batch),
      );
      await downloadResponseBlob(
        response,
        `supply-chain-import-${getBatchId(batch)}-errors.csv`,
      );
    } catch (error) {
      toast.error(
        await getDownloadErrorMessage(
          error,
          "Unable to download the error CSV.",
        ),
      );
    }
  };
  const cancelBatch = async () => {
    const reason = cancelReason.trim();
    if (!reason) {
      setCancelError("A cancellation reason is required.");
      return;
    }

    setCancelling(true);
    setCancelError("");

    try {
      const response = await supplyChainImportService.cancel(
        getBatchId(cancelTarget),
        reason,
      );
      toast.success(response.message || "Import batch cancelled.");
      setCancelTarget(null);
      setCancelReason("");
      await load();
    } catch (error) {
      const message = getApiErrorMessage(
        error,
        "Unable to cancel the import batch.",
      );
      setCancelError(message);
      toast.error(message);
    } finally {
      setCancelling(false);
    }
  };
  const setFilters = (patch) => dispatch(setImportFilters(patch));
  const activeFilterCount = [
    Boolean(state.filters.ImportType),
    Boolean(state.filters.ChannelId),
    Boolean(state.filters.Status),
  ].filter(Boolean).length;
  const committedCount = state.list.filter(isCommittedBatch).length;
  const cancelledCount = state.list.filter(isCancelledBatch).length;
  const exportRows = () =>
    downloadCsv({
      columns: [
        { key: "originalFileName", label: "File name" },
        { key: "importType", label: "Import type" },
        { key: "channelCode", label: "Channel" },
        { key: "periodFrom", label: "Period from" },
        { key: "periodTo", label: "Period to" },
        { key: "totalRows", label: "Total rows" },
        { key: "validRows", label: "Valid rows" },
        { key: "invalidRows", label: "Invalid rows" },
        { key: "committedRows", label: "Committed rows" },
        { key: "status", label: "Status" },
        { key: "uploadedAtUtc", label: "Uploaded at" },
      ],
      filename: "supply-chain-import-history.csv",
      rows: state.list,
    });

  return (
    <section className="min-w-0 space-y-5">
      <PageHeader
        badge="Supply Chain"
        description="Validate, review, and explicitly commit staged sales-history imports."
        title="Imports"
        actions={
          <>
            <AppButton disabled={state.loading} variant="secondary" onClick={() => void load()}>
              <RotateCw className={`h-4 w-4 ${state.loading ? "animate-spin" : ""}`} />Refresh
            </AppButton>
            {capabilities.canExport ? (
              <AppButton disabled={state.loading || state.list.length === 0} variant="secondary" onClick={() => void exportRows()}><Download className="h-4 w-4" />Export</AppButton>
            ) : (
              <DisabledAction reason="Export requires Supply Chain Imports export permission."><AppButton disabled variant="secondary"><Download className="h-4 w-4" />Export</AppButton></DisabledAction>
            )}
            {capabilities.canCreate ? (
              <AppButton onClick={() => setTab("new")}><Plus className="h-4 w-4" />New import</AppButton>
            ) : (
              <DisabledAction reason="Starting an import requires create permission."><AppButton disabled><Plus className="h-4 w-4" />New import</AppButton></DisabledAction>
            )}
          </>
        }
      />

      <StatCards
        loading={state.loading && tab === "history"}
        cards={[
          { icon: FileSpreadsheet, label: "Total batches", value: state.totalCount },
          { icon: CheckCircle2, hint: "On this page", label: "Committed", value: committedCount },
          { icon: XCircle, hint: "On this page", label: "Cancelled", value: cancelledCount },
        ]}
      />

      <ProcurementTabs
        active={tab}
        tabs={[
          { id: "new", icon: Upload, label: "New import" },
          { id: "history", icon: History, label: "History" },
        ]}
        onChange={setTab}
      />

      {tab === "new" ? (
        capabilities.canCreate ? (
          <NewImportWizard
            canApprove={capabilities.canApprove}
            canExport={capabilities.canExport}
            channels={channels}
            onCommitted={load}
            onOpenHistory={() => setTab("history")}
          />
        ) : (
          <SupplyChainInlineError
            message="You do not have permission to start a Supply Chain import."
            title="Import unavailable"
          />
        )
      ) : (
        <>
          <SupplyChainFilterBar
            activeFilterCount={activeFilterCount}
            onClear={() =>
              setFilters({ ChannelId: "", ImportType: "", Status: "" })
            }
          >
            <AppSelect className="w-52" label="Import type" options={[{ label: "All types", value: "" }, { label: "Procurement sales", value: SUPPLY_CHAIN_IMPORT_TYPES.ProcurementSales }]} value={state.filters.ImportType} onChange={(value) => setFilters({ ImportType: value })} />
            <AppSelect className="w-52" label="Channel" options={[{ label: "All channels", value: "" }, ...channels.map((channel) => ({ label: `${channel.code} — ${channel.name}`, value: channel.id }))]} value={state.filters.ChannelId} onChange={(value) => setFilters({ ChannelId: value })} />
            <AppSelect className="w-44" label="Status" options={[{ label: "All statuses", value: "" }, ...SUPPLY_CHAIN_IMPORT_STATUSES.map((status) => ({ label: status, value: status }))]} value={state.filters.Status} onChange={(value) => setFilters({ Status: value })} />
          </SupplyChainFilterBar>
          <SupplyChainInlineError message={channelError} title="Channels unavailable" />
          <SupplyChainInlineError message={state.error} title="Import history unavailable" onRetry={load} />
          <DataTableShell
            colGroup={<colgroup><col className="w-[56px]" /><col className="w-56" /><col className="w-40" /><col className="w-32" /><col className="w-44" /><col className="w-24" /><col className="w-24" /><col className="w-24" /><col className="w-28" /><col className="w-28" /><col className="w-40" /><col className="w-44" /></colgroup>}
            columnCount={12}
            emptyIcon={Inbox}
            emptyHint="Validated and committed import batches will appear here."
            emptyTitle={!state.loading && state.list.length === 0 ? "No import batches yet" : undefined}
            head={<><th className={DATA_TABLE_HEADER_CLASS}>#</th><th className={DATA_TABLE_HEADER_CLASS}>File name</th><th className={DATA_TABLE_HEADER_CLASS}>Import type</th><th className={DATA_TABLE_HEADER_CLASS}>Channel</th><th className={DATA_TABLE_HEADER_CLASS}>Period</th><th className={`${DATA_TABLE_HEADER_CLASS} text-right`}>Total</th><th className={`${DATA_TABLE_HEADER_CLASS} text-right`}>Valid</th><th className={`${DATA_TABLE_HEADER_CLASS} text-right`}>Invalid</th><th className={`${DATA_TABLE_HEADER_CLASS} text-right`}>Committed</th><th className={DATA_TABLE_HEADER_CLASS}>Status</th><th className={DATA_TABLE_HEADER_CLASS}>Uploaded at</th><th className={`${DATA_TABLE_HEADER_CLASS} text-right`}>Actions</th></>}
            loading={state.loading}
            minWidth="min-w-[1660px]"
          >
            {state.list.map((batch, index) => {
              const committed = isCommittedBatch(batch);
              const cancelled = isCancelledBatch(batch);
              const canCancel = !committed && !cancelled;

              return (
                <tr key={getBatchId(batch)}>
                  <td className="px-4 py-3.5 text-xs font-semibold tabular-nums text-slate-400">{(state.pageNumber - 1) * state.pageSize + index + 1}</td>
                  <td className="truncate font-medium text-slate-800" title={batch.originalFileName}>{batch.originalFileName || "—"}</td>
                  <td>{batch.importType || "—"}</td>
                  <td>{batch.channelCode || "All"}</td>
                  <td className="text-xs">{formatSupplyChainDate(batch.periodFrom)} – {formatSupplyChainDate(batch.periodTo)}</td>
                  <td className="text-right tabular-nums">{formatSupplyChainNumber(batch.totalRows, "0", 0)}</td>
                  <td className="text-right tabular-nums">{formatSupplyChainNumber(batch.validRows, "0", 0)}</td>
                  <td className="text-right tabular-nums">{formatSupplyChainNumber(batch.invalidRows, "0", 0)}</td>
                  <td className="text-right tabular-nums">{formatSupplyChainNumber(batch.committedRows, "0", 0)}</td>
                  <td><StatusPill status={batch.status} /></td>
                  <td>{formatSupplyChainDate(batch.uploadedAtUtc)}</td>
                  <td>
                    <div className="flex items-center justify-end gap-0.5">
                      <AppTooltip label="View batch details"><button aria-label="View batch details" className={DATA_TABLE_ROW_ACTION_CLASS} type="button" onClick={() => void openDetail(batch)}><Eye className="h-4 w-4" /></button></AppTooltip>
                      {capabilities.canExport && Number(batch.invalidRows) > 0 ? <AppTooltip label="Download errors"><button aria-label="Download errors" className={DATA_TABLE_ROW_ACTION_CLASS} type="button" onClick={() => void downloadErrors(batch)}><Download className="h-4 w-4" /></button></AppTooltip> : null}
                      {capabilities.canDelete && canCancel ? <AppTooltip label="Cancel staged batch"><button aria-label="Cancel staged batch" className={DATA_TABLE_ROW_ACTION_DANGER_CLASS} type="button" onClick={() => { setCancelError(""); setCancelReason(""); setCancelTarget(batch); }}><XCircle className="h-4 w-4" /></button></AppTooltip> : committed ? <AppTooltip label="Committed Procurement imports are cancelled from Procurement history"><Link aria-label="Open Procurement import history" className={DATA_TABLE_ROW_ACTION_CLASS} to="/procurement/sales-import?tab=history"><History className="h-4 w-4" /></Link></AppTooltip> : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </DataTableShell>
          <SupplyChainPagination disabled={state.loading} pageNumber={state.pageNumber} pageSize={state.pageSize} totalCount={state.totalCount} totalPages={state.totalPages} onPageChange={(value) => dispatch(setImportPage(value))} onPageSizeChange={(value) => dispatch(setImportPageSize(value))} />
        </>
      )}

      <ImportDetailsModal detail={detail} isOpen={detailOpen} loading={detailLoading} onClose={() => setDetailOpen(false)} />
      <AppModal
        isBusy={cancelling}
        isOpen={Boolean(cancelTarget)}
        title="Cancel staged import"
        onClose={cancelling ? undefined : () => setCancelTarget(null)}
      >
        <p className="text-sm leading-6 text-slate-600">
          This records an auditable reversal of an uncommitted batch. It is not a delete.
        </p>
        <div className="mt-4">
          <AppInput
            error={cancelError}
            label="Cancellation reason"
            required
            value={cancelReason}
            onChange={(event) => {
              setCancelReason(event.target.value);
              setCancelError("");
            }}
          />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <AppButton variant="secondary" onClick={() => setCancelTarget(null)}>Back</AppButton>
          {!cancelReason.trim() ? (
            <DisabledAction reason="Enter a cancellation reason to continue.">
              <AppButton disabled variant="danger">Cancel batch</AppButton>
            </DisabledAction>
          ) : (
            <AppButton isLoading={cancelling} loadingText="Cancelling…" variant="danger" onClick={cancelBatch}>Cancel batch</AppButton>
          )}
        </div>
      </AppModal>
    </section>
  );
};

export default ImportsPage;
