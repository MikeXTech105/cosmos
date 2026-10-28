import {
  AlertTriangle,
  CheckCircle2,
  Clipboard,
  Download,
  Eye,
  FileSpreadsheet,
  History,
  Plus,
  RefreshCw,
  Upload,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
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
  DISPATCH_IMPORT_HEADERS,
  DISPATCH_IMPORT_STATUS,
  DISPATCH_IMPORT_STATUS_LABELS,
  DISPATCH_IMPORT_TYPE_LABELS,
  DISPATCH_IMPORT_TYPES,
  DISPATCH_INBOUND_STATUS_LABELS,
  DISPATCH_MAX_IMPORT_BYTES,
  toDispatchOptions,
} from "../../../constants/dispatchEnums";
import { dispatchImportService } from "../../../services/dispatch";
import { supplyChainWarehouseService } from "../../../services/supplyChain/warehouseService";
import {
  fetchDispatchImports,
  setImportFilters,
  setImportPage,
  setImportPageSize,
} from "../../../store/slices/dispatch/importSlice";
import { isConflictError } from "../../../utils/apiError";
import {
  buildDispatchImportRows,
  parseCsv,
} from "../../../utils/csvParse";
import { downloadCsv } from "../../../utils/csv";
import { ProcurementTabs } from "../../procurement/ProcurementShared";
import {
  SupplyChainFilterBar,
  SupplyChainInlineError,
  SupplyChainPagination,
} from "../../supplyChain/SupplyChainShared";
import useSupplyChainChannels from "../../supplyChain/useSupplyChainChannels";
import {
  DisabledDispatchAction,
  DispatchPill,
} from "../DispatchShared";
import {
  formatDispatchDateTime,
  formatDispatchNumber,
  getDispatchError,
  getDispatchImportStatusLabel,
  getDispatchImportTypeLabel,
} from "../dispatchDisplay";
import useDispatchCapabilities from "../useDispatchCapabilities";

const WIZARD_STEPS = ["Choose", "Parse & validate", "Commit", "Result"];
const getBatchId = (record) => record?.batchId ?? record?.id;
const normalizeStatus = (status) => String(status ?? "").toLowerCase();
const isCommitted = (batch) =>
  Number(batch?.status) === DISPATCH_IMPORT_STATUS.Committed ||
  normalizeStatus(batch?.status) === "committed";
const isCancelled = (batch) =>
  Number(batch?.status) === DISPATCH_IMPORT_STATUS.Cancelled ||
  normalizeStatus(batch?.status) === "cancelled";

const validateFile = (file) => {
  if (!file) return "Choose a CSV file.";
  if (!String(file.name).toLowerCase().endsWith(".csv")) {
    return "Only CSV files are supported in this release.";
  }
  if (file.size > DISPATCH_MAX_IMPORT_BYTES) {
    return "The CSV must be 10 MB or smaller.";
  }
  return "";
};

const statusTone = (status) => {
  if (isCommitted({ status })) return "emerald";
  if (isCancelled({ status })) return "red";
  return "amber";
};

const ErrorTable = ({ offset = 0, rows }) => (
  <DataTableShell
    colGroup={
      <colgroup>
        <col className="w-[56px]" />
        <col className="w-28" />
        <col className="w-44" />
        <col />
        <col className="w-56" />
      </colgroup>
    }
    columnCount={5}
    emptyHint="The selected error category has no rows."
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
      <tr key={`${row.rowNumber}-${row.field}-${offset + index}`}>
        <td className="px-4 py-3.5 text-xs font-semibold tabular-nums text-slate-400">
          {offset + index + 1}
        </td>
        <td className="text-right tabular-nums">
          {formatDispatchNumber(row.rowNumber, "—", 0)}
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

const emptyManualEntry = () => ({
  channelId: "",
  importType: DISPATCH_IMPORT_TYPES.Sales,
  warehouseId: "",
  channelSku: "",
  periodFrom: "",
  periodTo: "",
  snapshotDate: "",
  salesQuantity: "",
  availableQuantity: "",
  reservedQuantity: "0",
  damagedQuantity: "0",
  inboundQuantity: "",
  inboundStatus: "",
  expectedArrivalDate: "",
  referenceNumber: "",
  sourceReference: "",
});

export const ManualEntryWizard = ({ canCreate, channels, onCommitted, onHistory }) => {
  const navigate = useNavigate();
  const [entry, setEntry] = useState(emptyManualEntry);
  const [warehouseState, setWarehouseState] = useState({ channelId: "", items: [], error: "" });
  const warehouses = String(warehouseState.channelId) === String(entry.channelId) ? warehouseState.items : [];
  const warehouseError = String(warehouseState.channelId) === String(entry.channelId) ? warehouseState.error : "";
  const [error, setError] = useState("");
  const [validation, setValidation] = useState(null);
  const [saving, setSaving] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [result, setResult] = useState(null);
  const [correctionReason, setCorrectionReason] = useState("");
  const [duplicateConflict, setDuplicateConflict] = useState(false);

  useEffect(() => {
    if (!entry.channelId) {
      return undefined;
    }

    let active = true;
    void supplyChainWarehouseService.dropdown({ channelId: entry.channelId })
      .then((response) => {
        if (!active) return;
        setWarehouseState({ channelId: entry.channelId, items: Array.isArray(response.data) ? response.data : response.data?.items ?? [], error: "" });
      })
      .catch((requestError) => {
        if (!active) return;
        setWarehouseState({ channelId: entry.channelId, items: [], error: getDispatchError(requestError, "Unable to resolve channel warehouses.") });
      });
    return () => { active = false; };
  }, [entry.channelId]);

  const update = (field, value) => {
    setEntry((current) => ({ ...current, [field]: value, ...(field === "channelId" ? { warehouseId: "" } : {}) }));
    setError("");
    setValidation(null);
    setDuplicateConflict(false);
  };

  const createRow = () => {
    const type = Number(entry.importType);
    const quantity = (field) => Number(entry[field]);
    const base = {
      rowNumber: 1,
      warehouseId: Number(entry.warehouseId),
      channelSku: entry.channelSku.trim(),
      sourceReference: entry.sourceReference.trim() || null,
    };
    if (type === DISPATCH_IMPORT_TYPES.Sales) {
      return { ...base, periodFrom: entry.periodFrom || null, periodTo: entry.periodTo || null, salesQuantity: quantity("salesQuantity") };
    }
    if (type === DISPATCH_IMPORT_TYPES.WarehouseStock) {
      return { ...base, snapshotDate: entry.snapshotDate || null, availableQuantity: quantity("availableQuantity"), reservedQuantity: quantity("reservedQuantity"), damagedQuantity: quantity("damagedQuantity") };
    }
    return { ...base, snapshotDate: entry.snapshotDate || null, inboundQuantity: quantity("inboundQuantity"), inboundStatus: Number(entry.inboundStatus), expectedArrivalDate: entry.expectedArrivalDate || null, referenceNumber: entry.referenceNumber.trim() || null };
  };

  const validateEntry = async () => {
    const type = Number(entry.importType);
    const required = [
      [entry.channelId, "Choose a channel."],
      [entry.warehouseId, "Choose a warehouse."],
      [entry.channelSku.trim(), "Enter the channel SKU."],
      [type === DISPATCH_IMPORT_TYPES.Sales ? entry.periodFrom : entry.snapshotDate, type === DISPATCH_IMPORT_TYPES.Sales ? "Enter the sales period start date." : "Enter the snapshot date."],
      [type === DISPATCH_IMPORT_TYPES.Sales ? entry.periodTo : true, "Enter the sales period end date."],
      [type === DISPATCH_IMPORT_TYPES.Sales ? entry.salesQuantity : type === DISPATCH_IMPORT_TYPES.WarehouseStock ? entry.availableQuantity : entry.inboundQuantity, "Enter a quantity."],
      [type !== DISPATCH_IMPORT_TYPES.Inbound || entry.inboundStatus, "Choose the inbound status."],
    ].find(([value]) => !String(value ?? "").trim());
    if (required) {
      setError(required[1]);
      return;
    }
    if (warehouseError) {
      setError(warehouseError);
      return;
    }

    const row = createRow();
    if (Object.values(row).some((value) => typeof value === "number" && !Number.isFinite(value))) {
      setError("Quantities must be valid numbers.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const response = await dispatchImportService.validateManual({
        channelId: Number(entry.channelId),
        importType: type,
        row,
      });
      setValidation(response.data);
      toast.success(response.message || "Manual dispatch entry validated.");
    } catch (requestError) {
      const message = getDispatchError(requestError, "Manual entry could not be validated.");
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const commit = async (allowDuplicate = false) => {
    if (allowDuplicate && !correctionReason.trim()) {
      setError("A correction reason is required to repeat this entry.");
      return;
    }
    setCommitting(true);
    setError("");
    try {
      const response = await dispatchImportService.commit(validation.batchId, {
        allowDuplicate,
        correctionReason: allowDuplicate ? correctionReason.trim() : null,
      });
      setResult(response.data ?? { id: validation.batchId, committedRows: validation.validRows });
      await onCommitted();
      toast.success(response.message || "Manual dispatch entry committed.");
    } catch (requestError) {
      const message = getDispatchError(requestError, "Manual entry could not be committed.");
      setDuplicateConflict(isConflictError(requestError) && /duplicate|previously committed|hash/i.test(message));
      setError(message);
      toast.error(message);
    } finally {
      setCommitting(false);
    }
  };

  if (result) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm">
        <CheckCircle2 className="h-10 w-10 text-emerald-600" />
        <h2 className="mt-4 text-xl font-semibold text-slate-900">Manual snapshot committed</h2>
        <p className="mt-1 text-sm text-slate-500">The entry is now an immutable planning input, just like a CSV import.</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <AppButton variant="secondary" onClick={onHistory}>View history</AppButton>
          <AppButton variant="secondary" onClick={() => { setEntry(emptyManualEntry()); setValidation(null); setResult(null); }}>Add another entry</AppButton>
          <AppButton onClick={() => navigate("/dispatch/runs?new=1")}>Create a planning run</AppButton>
        </div>
      </div>
    );
  }

  const type = Number(entry.importType);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-slate-900">Manual snapshot entry</h2>
      <p className="mt-1 text-sm text-slate-500">Enter one warehouse/SKU snapshot. It uses the same server validation and commit audit trail as CSV imports.</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <AppSelect label="Snapshot type" required options={toDispatchOptions(DISPATCH_IMPORT_TYPE_LABELS)} value={entry.importType} onChange={(value) => update("importType", value)} />
        <AppSelect label="Channel" required options={channels.map((channel) => ({ label: `${channel.code} — ${channel.name}`, value: channel.id }))} value={entry.channelId} onChange={(value) => update("channelId", value)} />
        <AppSelect label="Warehouse" required error={warehouseError} options={warehouses.map((warehouse) => ({ label: `${warehouse.warehouseCode} — ${warehouse.warehouseName}`, value: warehouse.id }))} value={entry.warehouseId} onChange={(value) => update("warehouseId", value)} />
        <AppInput label="Channel SKU" required value={entry.channelSku} onChange={(event) => update("channelSku", event.target.value)} />
        {type === DISPATCH_IMPORT_TYPES.Sales ? <><AppInput label="Period from" required type="date" value={entry.periodFrom} onChange={(event) => update("periodFrom", event.target.value)} /><AppInput label="Period to" required min={entry.periodFrom} type="date" value={entry.periodTo} onChange={(event) => update("periodTo", event.target.value)} /><AppInput label="Sales quantity" required min="0" step="0.000001" type="number" value={entry.salesQuantity} onChange={(event) => update("salesQuantity", event.target.value)} /></> : null}
        {type === DISPATCH_IMPORT_TYPES.WarehouseStock ? <><AppInput label="Snapshot date" required type="date" value={entry.snapshotDate} onChange={(event) => update("snapshotDate", event.target.value)} /><AppInput label="Available quantity" required min="0" step="0.000001" type="number" value={entry.availableQuantity} onChange={(event) => update("availableQuantity", event.target.value)} /><AppInput label="Reserved quantity" min="0" step="0.000001" type="number" value={entry.reservedQuantity} onChange={(event) => update("reservedQuantity", event.target.value)} /><AppInput label="Damaged quantity" min="0" step="0.000001" type="number" value={entry.damagedQuantity} onChange={(event) => update("damagedQuantity", event.target.value)} /></> : null}
        {type === DISPATCH_IMPORT_TYPES.Inbound ? <><AppInput label="Snapshot date" required type="date" value={entry.snapshotDate} onChange={(event) => update("snapshotDate", event.target.value)} /><AppInput label="Inbound quantity" required min="0" step="0.000001" type="number" value={entry.inboundQuantity} onChange={(event) => update("inboundQuantity", event.target.value)} /><AppSelect label="Inbound status" required options={toDispatchOptions(DISPATCH_INBOUND_STATUS_LABELS)} value={entry.inboundStatus} onChange={(value) => update("inboundStatus", value)} /><AppInput label="Expected arrival" type="date" value={entry.expectedArrivalDate} onChange={(event) => update("expectedArrivalDate", event.target.value)} /><AppInput label="Reference number" value={entry.referenceNumber} onChange={(event) => update("referenceNumber", event.target.value)} /></> : null}
        <AppInput label="Source reference" helperText="Optional note or source reference for this snapshot." value={entry.sourceReference} onChange={(event) => update("sourceReference", event.target.value)} />
      </div>
      <SupplyChainInlineError message={error} title="Manual entry unavailable" />
      {validation?.rowErrors?.length ? <div className="mt-5"><ErrorTable rows={validation.rowErrors} /></div> : null}
      {duplicateConflict ? <div className="mt-4"><AppInput label="Correction reason" required value={correctionReason} onChange={(event) => setCorrectionReason(event.target.value)} /></div> : null}
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <AppButton variant="secondary" onClick={() => { setEntry(emptyManualEntry()); setValidation(null); setError(""); }}>Clear</AppButton>
        {!validation ? <AppButton disabled={!canCreate || saving} isLoading={saving} loadingText="Validating…" onClick={() => void validateEntry()}>Validate entry</AppButton> : validation.canCommit ? <AppButton disabled={!canCreate || committing} isLoading={committing} loadingText="Committing…" onClick={() => void commit(duplicateConflict)}>Commit entry</AppButton> : null}
      </div>
    </div>
  );
};

const ImportWizard = ({
  canCreate,
  channels,
  onCommitted,
  onHistory,
}) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [choice, setChoice] = useState({
    channelId: "",
    file: null,
    importType: DISPATCH_IMPORT_TYPES.Sales,
  });
  const [warehouses, setWarehouses] = useState([]);
  const [warehouseError, setWarehouseError] = useState("");
  const [fileError, setFileError] = useState("");
  const [parsing, setParsing] = useState(false);
  const [localResult, setLocalResult] = useState(null);
  const [validation, setValidation] = useState(null);
  const [validationError, setValidationError] = useState("");
  const [validating, setValidating] = useState(false);
  const [filter, setFilter] = useState("all");
  const [errorPage, setErrorPage] = useState(1);
  const [errorPageSize, setErrorPageSize] = useState(20);
  const [commitError, setCommitError] = useState("");
  const [duplicateConflict, setDuplicateConflict] = useState(false);
  const [correctionReason, setCorrectionReason] = useState("");
  const [confirmDuplicate, setConfirmDuplicate] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [result, setResult] = useState(null);
  const [canCreateRun, setCanCreateRun] = useState(false);

  useEffect(() => {
    if (!choice.channelId) {
      const timeout = window.setTimeout(() => {
        setWarehouses([]);
        setWarehouseError("");
      }, 0);
      return () => window.clearTimeout(timeout);
    }

    let current = true;
    const timeout = window.setTimeout(async () => {
      try {
        const response = await supplyChainWarehouseService.dropdown({
          channelId: choice.channelId,
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
      } catch (error) {
        if (current) {
          setWarehouses([]);
          setWarehouseError(
            getDispatchError(error, "Unable to resolve channel warehouses."),
          );
        }
      }
    }, 0);

    return () => {
      current = false;
      window.clearTimeout(timeout);
    };
  }, [choice.channelId]);

  const chooseFile = (file) => {
    const message = validateFile(file);
    setFileError(message);
    setChoice((current) => ({ ...current, file: message ? null : file }));
    setLocalResult(null);
    setValidation(null);
  };

  const parseFile = async () => {
    const message = validateFile(choice.file);
    if (message) {
      setFileError(message);
      return;
    }
    if (!choice.channelId) {
      setFileError("Choose a channel before parsing the CSV.");
      return;
    }
    if (warehouseError) return;

    setParsing(true);
    setValidationError("");
    try {
      const text = await choice.file.text();
      const parsed = parseCsv(text);
      const built =
        parsed.errors.length > 0
          ? { errors: parsed.errors, rows: [] }
          : buildDispatchImportRows({
              headers: parsed.headers,
              importType: choice.importType,
              rows: parsed.rows,
              warehouses,
            });
      setLocalResult({
        errors: built.errors,
        rows: built.rows,
        rowsRead: parsed.rows.length,
      });
      setStep(2);
      setFilter("all");
      setErrorPage(1);
    } catch (error) {
      setValidationError(
        getDispatchError(error, "Unable to parse the CSV file."),
      );
    } finally {
      setParsing(false);
    }
  };

  const validateServer = async () => {
    if (!localResult || localResult.errors.length > 0) return;
    setValidating(true);
    setValidationError("");
    try {
      const response = await dispatchImportService.validate({
        channelId: Number(choice.channelId),
        importType: Number(choice.importType),
        originalFileName: choice.file.name,
        rows: localResult.rows,
      });
      setValidation({
        ...response.data,
        correlationId: response.correlationId ?? response.data?.correlationId,
      });
      setStep(3);
      toast.success(response.message || "Dispatch snapshot validated.");
    } catch (error) {
      const message = getDispatchError(
        error,
        "Server validation could not be completed.",
      );
      setValidationError(message);
      toast.error(message);
    } finally {
      setValidating(false);
    }
  };

  const verifyRunReadiness = async () => {
    const base = {
      ChannelId: choice.channelId,
      PageNumber: 1,
      PageSize: 1,
      Status: DISPATCH_IMPORT_STATUS.Committed,
    };
    const [sales, stock] = await Promise.all([
      dispatchImportService.list({
        ...base,
        ImportType: DISPATCH_IMPORT_TYPES.Sales,
      }),
      dispatchImportService.list({
        ...base,
        ImportType: DISPATCH_IMPORT_TYPES.WarehouseStock,
      }),
    ]);
    setCanCreateRun(
      Number(sales.data?.totalCount) > 0 && Number(stock.data?.totalCount) > 0,
    );
  };

  const commit = async (allowDuplicate) => {
    const reason = correctionReason.trim();
    if (allowDuplicate && !reason) {
      setCommitError("A correction reason is required.");
      return;
    }

    setCommitting(true);
    setCommitError("");
    try {
      const response = await dispatchImportService.commit(
        validation.batchId,
        {
          allowDuplicate,
          correctionReason: allowDuplicate ? reason : null,
        },
      );
      const batch = response.data ?? {
        id: validation.batchId,
        committedRows: validation.validRows,
      };
      setResult({
        batch,
        correlationId:
          response.correlationId ??
          batch.correlationId ??
          validation.correlationId,
      });
      setConfirmDuplicate(false);
      setStep(4);
      toast.success(response.message || "Dispatch import committed.");
      await onCommitted();
      try {
        await verifyRunReadiness();
      } catch (error) {
        setCanCreateRun(false);
        toast.error(
          getDispatchError(
            error,
            "Import committed, but run readiness could not be checked.",
          ),
        );
      }
    } catch (error) {
      const message = getDispatchError(error, "Unable to commit the import.");
      if (isConflictError(error) && /duplicate|previously committed|hash/i.test(message)) {
        setDuplicateConflict(true);
        setCommitError(
          "This file was previously committed. Enter a correction reason to continue.",
        );
      } else {
        setCommitError(message);
      }
      toast.error(message);
    } finally {
      setCommitting(false);
    }
  };

  const reset = () => {
    setStep(1);
    setChoice({
      channelId: "",
      file: null,
      importType: DISPATCH_IMPORT_TYPES.Sales,
    });
    setFileError("");
    setLocalResult(null);
    setValidation(null);
    setValidationError("");
    setDuplicateConflict(false);
    setCorrectionReason("");
    setCommitError("");
    setResult(null);
    setCanCreateRun(false);
  };

  const localErrors = localResult?.errors ?? [];
  const serverErrors = Array.isArray(validation?.rowErrors)
    ? validation.rowErrors
    : [];
  const allErrors = validation ? serverErrors : localErrors;
  const filteredErrors =
    filter === "all" || filter === "invalid"
      ? allErrors
      : filter === "valid"
        ? []
        : allErrors.filter((error) =>
            filter === "duplicates"
              ? /duplicate/i.test(`${error.field} ${error.message}`)
              : /sku|mapping/i.test(`${error.field} ${error.message}`),
          );
  const totalPages = Math.max(
    1,
    Math.ceil(filteredErrors.length / errorPageSize),
  );
  const pagedErrors = filteredErrors.slice(
    (errorPage - 1) * errorPageSize,
    errorPage * errorPageSize,
  );
  const validationBlockers = [
    Number(validation?.invalidRows) > 0
      ? `${formatDispatchNumber(validation.invalidRows, "0", 0)} invalid row${Number(validation.invalidRows) === 1 ? "" : "s"}`
      : "",
    Number(validation?.unmatchedSkuCount) > 0
      ? `${formatDispatchNumber(validation.unmatchedSkuCount, "0", 0)} unmatched SKU${Number(validation.unmatchedSkuCount) === 1 ? "" : "s"}`
      : "",
  ].filter(Boolean);
  const commitReason =
    validation?.canCommit === false
      ? validationBlockers.length > 0
        ? `Commit is blocked by ${validationBlockers.join(" and ")}.`
        : "Server validation blocked commit without a more specific reason."
      : !canCreate
        ? "Commit requires Dispatch Planning Imports create permission."
        : "";
  const chips = validation
    ? [
        ["all", "Total", validation.totalRows],
        ["valid", "Valid", validation.validRows],
        ["invalid", "Invalid", validation.invalidRows],
        ["duplicates", "Duplicates", validation.duplicateRows],
        ["unmatched", "Unmatched SKUs", validation.unmatchedSkuCount],
      ]
    : [
        ["all", "Rows read", localResult?.rowsRead],
        ["valid", "Ready for server", localResult?.rows?.length],
        ["invalid", "Local errors", localErrors.length],
      ];

  return (
    <div className="space-y-5">
      <div className="grid gap-2 sm:grid-cols-4">
        {WIZARD_STEPS.map((label, index) => {
          const number = index + 1;
          return (
            <div
              key={label}
              className={`rounded-xl border px-4 py-3 text-sm ${
                number === step
                  ? "border-brand bg-brand-light text-brand"
                  : number < step
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 bg-white text-slate-500"
              }`}
            >
              <span className="font-semibold">{number}. {label}</span>
            </div>
          );
        })}
      </div>

      {step === 1 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Choose the snapshot</h2>
          <p className="mt-1 text-sm text-slate-500">
            The browser parses the CSV and sends typed JSON rows. It never
            creates an Item, Warehouse, or mapping.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <AppSelect
              label="Import type"
              options={toDispatchOptions(DISPATCH_IMPORT_TYPE_LABELS)}
              required
              value={choice.importType}
              onChange={(importType) => {
                setChoice((current) => ({ ...current, importType }));
                setLocalResult(null);
              }}
            />
            <AppSelect
              label="Channel"
              options={channels.map((channel) => ({
                label: `${channel.code} — ${channel.name}`,
                value: channel.id,
              }))}
              required
              value={choice.channelId}
              onChange={(channelId) => {
                setChoice((current) => ({ ...current, channelId }));
                setLocalResult(null);
              }}
            />
          </div>
          <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3">
            <p className="text-xs font-medium text-slate-600">Expected header</p>
            <code className="mt-1 block overflow-x-auto whitespace-nowrap text-xs text-brand">
              {DISPATCH_IMPORT_HEADERS[choice.importType].join(", ")}
            </code>
          </div>
          <label className="mt-5 flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center hover:border-brand/50 hover:bg-brand-light">
            <Upload className="h-8 w-8 text-slate-400" />
            <span className="mt-3 text-sm font-semibold text-slate-800">
              {choice.file?.name ?? "Choose or drop a CSV file"}
            </span>
            <span className="mt-1 text-xs text-slate-500">CSV only · maximum 10 MB</span>
            <input
              accept=".csv,text/csv"
              className="sr-only"
              type="file"
              onChange={(event) => chooseFile(event.target.files?.[0])}
            />
          </label>
          <p className="mt-2 text-xs text-slate-500">
            XLSX support is coming. Save your sheet as CSV for now.
          </p>
          {fileError ? <p className="mt-2 text-xs font-medium text-red-600">{fileError}</p> : null}
          <div className="mt-4">
            <SupplyChainInlineError message={warehouseError || validationError} />
          </div>
          <div className="mt-5 flex justify-end">
            <AppButton isLoading={parsing} loadingText="Parsing…" onClick={parseFile}>
              Parse CSV
            </AppButton>
          </div>
        </div>
      ) : null}

      {step === 2 || step === 3 ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {chips.map(([key, label, value]) => (
              <button
                key={key}
                className={`rounded-xl border bg-white p-4 text-left shadow-sm ${
                  filter === key ? "border-brand ring-2 ring-brand/10" : "border-slate-200"
                }`}
                type="button"
                onClick={() => {
                  setFilter(key);
                  setErrorPage(1);
                }}
              >
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">
                  {formatDispatchNumber(value, "0", 0)}
                </p>
              </button>
            ))}
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
            <p>SKUs resolve only through an exact active channel mapping.{" "}
              <Link className="font-semibold text-brand hover:underline" to="/supply-chain/item-mappings">
                Open unmatched SKU mappings
              </Link>
            </p>
            {validation && Number(validation.duplicateRows) > 0 ? (
              <p className="mt-2 text-amber-700">
                Duplicate rows remain visible in the audit preview but are
                excluded from committed snapshots.
              </p>
            ) : null}
          </div>
          <SupplyChainInlineError
            message={validationError}
            title="Validation could not be completed"
          />
          <ErrorTable
            offset={(errorPage - 1) * errorPageSize}
            rows={pagedErrors}
          />
          <SupplyChainPagination
            disabled={false}
            pageNumber={errorPage}
            pageSize={errorPageSize}
            totalCount={filteredErrors.length}
            totalPages={totalPages}
            onPageChange={setErrorPage}
            onPageSizeChange={(value) => {
              setErrorPageSize(Number(value));
              setErrorPage(1);
            }}
          />
          {step === 2 ? (
            <div className="flex justify-end gap-2">
              <AppButton variant="secondary" onClick={reset}>Start over</AppButton>
              {localErrors.length > 0 ? (
                <DisabledDispatchAction reason="Fix local parse and warehouse errors before server validation.">
                  <AppButton disabled>Validate with server</AppButton>
                </DisabledDispatchAction>
              ) : (
                <AppButton
                  isLoading={validating}
                  loadingText="Validating…"
                  onClick={validateServer}
                >
                  Validate with server
                </AppButton>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold text-slate-900">Commit the staged snapshot</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Commit records dispatch planning inputs only. It does not move
                stock or create a shipment.
              </p>
              {duplicateConflict ? (
                <div className="mt-4">
                  <AppInput
                    error={commitError}
                    label="Correction reason"
                    required
                    value={correctionReason}
                    onChange={(event) => {
                      setCorrectionReason(event.target.value);
                      setCommitError("");
                    }}
                  />
                </div>
              ) : (
                <div className="mt-4">
                  <SupplyChainInlineError message={commitError} title="Commit conflict" />
                </div>
              )}
              <div className="mt-5 flex justify-end gap-2">
                <AppButton variant="secondary" onClick={reset}>Start over</AppButton>
                {commitReason ? (
                  <DisabledDispatchAction reason={commitReason}>
                    <AppButton disabled>Commit snapshot</AppButton>
                  </DisabledDispatchAction>
                ) : duplicateConflict ? (
                  correctionReason.trim() ? (
                    <AppButton onClick={() => setConfirmDuplicate(true)}>
                      Review duplicate commit
                    </AppButton>
                  ) : (
                    <DisabledDispatchAction reason="Enter a correction reason to continue.">
                      <AppButton disabled>Review duplicate commit</AppButton>
                    </DisabledDispatchAction>
                  )
                ) : (
                  <AppButton
                    isLoading={committing}
                    loadingText="Committing…"
                    onClick={() => void commit(false)}
                  >
                    Commit snapshot
                  </AppButton>
                )}
              </div>
            </div>
          )}
        </>
      ) : null}

      {step === 4 && result ? (
        <div className="rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm">
          <CheckCircle2 className="h-10 w-10 text-emerald-600" />
          <h2 className="mt-4 text-xl font-semibold text-slate-900">Snapshot committed</h2>
          <p className="mt-1 text-sm text-slate-500">
            {formatDispatchNumber(result.batch?.committedRows, "—", 0)} rows committed.
          </p>
          <dl className="mt-5 grid gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-slate-500">Batch ID</dt>
              <dd className="mt-1 text-sm font-semibold text-slate-900">{getBatchId(result.batch) ?? validation.batchId}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Correlation ID</dt>
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
                          toast.error(getDispatchError(error, "Unable to copy the correlation ID."));
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
            <AppButton variant="secondary" onClick={onHistory}>View in History</AppButton>
            <AppButton variant="secondary" onClick={reset}>Start another import</AppButton>
            {canCreateRun ? (
              <AppButton onClick={() => navigate("/dispatch/runs?new=1")}>
                Create a planning run
              </AppButton>
            ) : null}
          </div>
        </div>
      ) : null}

      <AppModal
        isBusy={committing}
        isOpen={confirmDuplicate}
        title="Confirm duplicate-file correction"
        onClose={committing ? undefined : () => setConfirmDuplicate(false)}
      >
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="text-sm leading-6">
            This file was previously committed. Continuing explicitly allows
            the duplicate hash and records the correction reason.
          </p>
        </div>
        <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
          {correctionReason}
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <AppButton variant="secondary" onClick={() => setConfirmDuplicate(false)}>Back</AppButton>
          <AppButton
            isLoading={committing}
            loadingText="Committing…"
            onClick={() => void commit(true)}
          >
            Confirm and commit
          </AppButton>
        </div>
      </AppModal>
    </div>
  );
};

const DispatchImportsPage = () => {
  const dispatch = useDispatch();
  const state = useSelector((root) => root.dispatchImports);
  const { channels, error: channelError } = useSupplyChainChannels();
  const [tab, setTab] = useState("new");
  const [detail, setDetail] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelError, setCancelError] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const capabilities = useDispatchCapabilities({
    label: "DispatchPlanning.Imports",
    route: "/dispatch/imports",
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
    () => dispatch(fetchDispatchImports(params)),
    [dispatch, params],
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeout);
  }, [load]);

  const cancelBatch = async () => {
    if (!cancelReason.trim()) {
      setCancelError("A cancellation reason is required.");
      return;
    }
    setCancelling(true);
    setCancelError("");
    try {
      const response = await dispatchImportService.cancel(
        getBatchId(cancelTarget),
        cancelReason.trim(),
      );
      toast.success(response.message || "Dispatch import cancelled.");
      setCancelTarget(null);
      setCancelReason("");
      await load();
    } catch (error) {
      const message = getDispatchError(error, "Unable to cancel the import.");
      setCancelError(message);
      toast.error(message);
    } finally {
      setCancelling(false);
    }
  };

  const committedCount = state.list.filter(isCommitted).length;
  const cancelledCount = state.list.filter(isCancelled).length;
  const activeFilterCount = [
    Boolean(state.filters.ImportType),
    Boolean(state.filters.ChannelId),
    Boolean(state.filters.Status),
  ].filter(Boolean).length;
  const setFilters = (patch) => dispatch(setImportFilters(patch));

  return (
    <section className="min-w-0 space-y-5">
      <PageHeader
        badge="Dispatch Planning"
        description="Add warehouse snapshots manually or import CSV files, then validate and commit them explicitly."
        title="Imports"
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
                    : "There are no import batches on this page to export."
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
                      { key: "originalFileName", label: "File name" },
                      { key: "importType", label: "Import type" },
                      { key: "channelCode", label: "Channel" },
                      { key: "status", label: "Status" },
                      { key: "committedRows", label: "Committed rows" },
                    ],
                    filename: "dispatch-import-history.csv",
                    rows: state.list,
                  })
                }
              >
                <Download className="h-4 w-4" />
                Export
              </AppButton>
            )}
            {capabilities.canCreate ? (
              <AppButton onClick={() => setTab("new")}><Plus className="h-4 w-4" />New snapshot</AppButton>
            ) : (
              <DisabledDispatchAction reason="Starting an import requires Imports create permission.">
                <AppButton disabled><Plus className="h-4 w-4" />New snapshot</AppButton>
              </DisabledDispatchAction>
            )}
          </>
        }
      />
      <StatCards
        loading={state.loading}
        cards={[
          { icon: FileSpreadsheet, label: "Total batches", value: state.totalCount },
          { hint: "On this page", label: "Committed", value: committedCount },
          { hint: "On this page", label: "Cancelled", value: cancelledCount },
        ]}
      />
      <ProcurementTabs
        active={tab}
        tabs={[
          { id: "new", icon: Upload, label: "CSV import" },
          { id: "manual", icon: Plus, label: "Manual entry" },
          { id: "history", icon: History, label: "History" },
        ]}
        onChange={setTab}
      />
      {tab === "new" ? (
        capabilities.canCreate ? (
          <ImportWizard
            canCreate={capabilities.canCreate}
            channels={channels}
            onCommitted={load}
            onHistory={() => setTab("history")}
          />
        ) : (
          <SupplyChainInlineError message="You do not have permission to validate or commit imports." />
        )
      ) : tab === "manual" ? (
        capabilities.canCreate ? (
          <ManualEntryWizard
            canCreate={capabilities.canCreate}
            channels={channels}
            onCommitted={load}
            onHistory={() => setTab("history")}
          />
        ) : (
          <SupplyChainInlineError message="You do not have permission to validate or commit manual entries." />
        )
      ) : (
        <>
          <SupplyChainFilterBar
            activeFilterCount={activeFilterCount}
            onClear={() => setFilters({ ChannelId: "", ImportType: "", Status: "" })}
          >
            <AppSelect
              className="w-52"
              label="Import type"
              options={[{ label: "All types", value: "" }, ...toDispatchOptions(DISPATCH_IMPORT_TYPE_LABELS)]}
              value={state.filters.ImportType}
              onChange={(value) => setFilters({ ImportType: value })}
            />
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
              onChange={(value) => setFilters({ ChannelId: value })}
            />
            <AppSelect
              className="w-44"
              label="Status"
              options={[{ label: "All statuses", value: "" }, ...toDispatchOptions(DISPATCH_IMPORT_STATUS_LABELS)]}
              value={state.filters.Status}
              onChange={(value) => setFilters({ Status: value })}
            />
          </SupplyChainFilterBar>
          <SupplyChainInlineError message={channelError} title="Channels unavailable" />
          <SupplyChainInlineError message={state.error} title="Import history unavailable" onRetry={load} />
          <DataTableShell
            colGroup={<colgroup><col className="w-[56px]" /><col className="w-60" /><col className="w-40" /><col className="w-32" /><col className="w-24" /><col className="w-24" /><col className="w-24" /><col className="w-28" /><col className="w-28" /><col className="w-40" /><col className="w-32" /></colgroup>}
            columnCount={11}
            emptyHint="Validated and committed dispatch snapshots will appear here."
            emptyTitle={!state.loading && state.list.length === 0 ? "No dispatch imports yet" : undefined}
            head={<><th className={DATA_TABLE_HEADER_CLASS}>#</th><th className={DATA_TABLE_HEADER_CLASS}>File name</th><th className={DATA_TABLE_HEADER_CLASS}>Type</th><th className={DATA_TABLE_HEADER_CLASS}>Channel</th><th className={`${DATA_TABLE_HEADER_CLASS} text-right`}>Total</th><th className={`${DATA_TABLE_HEADER_CLASS} text-right`}>Valid</th><th className={`${DATA_TABLE_HEADER_CLASS} text-right`}>Invalid</th><th className={`${DATA_TABLE_HEADER_CLASS} text-right`}>Committed</th><th className={DATA_TABLE_HEADER_CLASS}>Status</th><th className={DATA_TABLE_HEADER_CLASS}>Uploaded at</th><th className={`${DATA_TABLE_HEADER_CLASS} text-right`}>Actions</th></>}
            loading={state.loading}
            minWidth="min-w-[1420px]"
          >
            {state.list.map((batch, index) => (
              <tr key={getBatchId(batch)}>
                <td className="px-4 py-3.5 text-xs font-semibold tabular-nums text-slate-400">{(state.pageNumber - 1) * state.pageSize + index + 1}</td>
                <td className="truncate font-medium text-slate-900" title={batch.originalFileName}>{batch.originalFileName}</td>
                <td>{getDispatchImportTypeLabel(batch.importType)}</td>
                <td>{batch.channelCode}</td>
                <td className="text-right tabular-nums">{formatDispatchNumber(batch.totalRows, "0", 0)}</td>
                <td className="text-right tabular-nums">{formatDispatchNumber(batch.validRows, "0", 0)}</td>
                <td className="text-right tabular-nums">{formatDispatchNumber(batch.invalidRows, "0", 0)}</td>
                <td className="text-right tabular-nums">{formatDispatchNumber(batch.committedRows, "0", 0)}</td>
                <td><DispatchPill tone={statusTone(batch.status)}>{getDispatchImportStatusLabel(batch.status)}</DispatchPill></td>
                <td>{formatDispatchDateTime(batch.uploadedAtUtc)}</td>
                <td>
                  <div className="flex items-center justify-end gap-0.5">
                    <AppTooltip label="View batch">
                      <button aria-label="View batch" className={DATA_TABLE_ROW_ACTION_CLASS} type="button" onClick={() => setDetail(batch)}>
                        <Eye className="h-4 w-4" />
                      </button>
                    </AppTooltip>
                    {capabilities.canDelete && !isCommitted(batch) && !isCancelled(batch) ? (
                      <AppTooltip label="Cancel staged import">
                        <button
                          aria-label="Cancel staged import"
                          className={DATA_TABLE_ROW_ACTION_DANGER_CLASS}
                          type="button"
                          onClick={() => {
                            setCancelTarget(batch);
                            setCancelReason("");
                            setCancelError("");
                          }}
                        >
                          <XCircle className="h-4 w-4" />
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
            onPageChange={(value) => dispatch(setImportPage(value))}
            onPageSizeChange={(value) => dispatch(setImportPageSize(value))}
          />
        </>
      )}

      <AppModal isOpen={Boolean(detail)} title="Dispatch import details" onClose={() => setDetail(null)}>
        {detail ? (
          <dl className="grid gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
            {[
              ["File", detail.originalFileName],
              ["Type", getDispatchImportTypeLabel(detail.importType)],
              ["Channel", detail.channelCode],
              ["Status", getDispatchImportStatusLabel(detail.status)],
              ["Total rows", formatDispatchNumber(detail.totalRows, "0", 0)],
              ["Committed rows", formatDispatchNumber(detail.committedRows, "0", 0)],
            ].map(([label, value]) => (
              <div key={label}><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 text-sm font-medium text-slate-900">{value || "—"}</dd></div>
            ))}
          </dl>
        ) : null}
        <div className="mt-5 flex justify-end"><AppButton variant="secondary" onClick={() => setDetail(null)}>Close</AppButton></div>
      </AppModal>
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
          {cancelReason.trim() ? (
            <AppButton isLoading={cancelling} loadingText="Cancelling…" variant="danger" onClick={cancelBatch}>Cancel import</AppButton>
          ) : (
            <DisabledDispatchAction reason="Enter a cancellation reason to continue.">
              <AppButton disabled variant="danger">Cancel import</AppButton>
            </DisabledDispatchAction>
          )}
        </div>
      </AppModal>
    </section>
  );
};

export default DispatchImportsPage;
