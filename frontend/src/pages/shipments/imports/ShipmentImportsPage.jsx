import {
  Ban,
  FileCheck2,
  FileUp,
  RefreshCw,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import AppButton from "../../../components/common/AppButton";
import AppInput from "../../../components/common/AppInput";
import AppModal from "../../../components/common/AppModal";
import AppSelect from "../../../components/common/AppSelect";
import AppTooltip from "../../../components/common/AppTooltip";
import DataTableShell, {
  DATA_TABLE_HEADER_CLASS,
  DATA_TABLE_ROW_ACTION_DANGER_CLASS,
} from "../../../components/common/DataTableShell";
import PageHeader from "../../../components/common/PageHeader";
import {
  SHIPMENT_IMPORT_BATCH_STATUS_LABELS,
  SHIPMENT_MAX_IMPORT_BYTES,
  SHIPMENT_STATUS_LABELS,
  toShipmentOptions,
} from "../../../constants/shipmentEnums";
import { shipmentImportService } from "../../../services/shipments";
import {
  fetchShipmentImports,
  setShipmentImportFilters,
  setShipmentImportPage,
  setShipmentImportPageSize,
} from "../../../store/slices/shipments/importSlice";
import {
  getApiErrorMessage,
  isConflictError,
} from "../../../utils/apiError";
import { parseCsv, sha256Hex } from "../../../utils/csvParse";
import {
  SupplyChainInlineError,
  SupplyChainPagination,
} from "../../supplyChain/SupplyChainShared";
import {
  DisabledShipmentAction,
  ShipmentConflict,
  ShipmentPill,
} from "../ShipmentShared";
import {
  formatShipmentDateTime,
  formatShipmentNumber,
  getShipmentMutationMessage,
} from "../shipmentDisplay";
import useShipmentCapabilities from "../useShipmentCapabilities";

const IMPORT_FIELDS = [
  ["sourceShipmentReference", "Source shipment reference", false],
  ["channelCode", "Channel code", true],
  ["warehouseCode", "Warehouse code", true],
  ["channelSku", "Channel SKU", true],
  ["quantity", "Quantity", true],
  ["shipmentDate", "Shipment date", true],
  ["status", "Shipment status", true],
  ["docketNumber", "Docket number", false],
  ["invoiceNumber", "Invoice number", false],
  ["stoNumber", "STO number", false],
  ["transporterPartyCode", "Transporter party code", false],
  ["freightAmount", "Freight amount", false],
  ["notes", "Notes", false],
];

const REQUIRED_FIELDS = IMPORT_FIELDS.filter(([, , required]) => required).map(
  ([field]) => field,
);

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const isIsoDate = (value) => {
  if (!ISO_DATE.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
};

const getCell = (headers, values, mapping, field) => {
  const header = mapping[field];
  const index = headers.indexOf(header);
  return index >= 0 ? String(values[index] ?? "").trim() : "";
};

const buildLocalRows = ({ headers, mapping, rows, statusMapping }) => {
  const missingRequired = REQUIRED_FIELDS.filter((field) => !mapping[field]);
  const mappedHeaders = Object.values(mapping).filter(Boolean);
  const duplicateHeaders = mappedHeaders.filter(
    (header, index) => mappedHeaders.indexOf(header) !== index,
  );
  const errors = [];

  if (missingRequired.length > 0) {
    errors.push({
      field: "Mapping",
      message: `Map required fields: ${missingRequired.join(", ")}.`,
      rowNumber: 1,
    });
  }
  if (duplicateHeaders.length > 0) {
    errors.push({
      field: "Mapping",
      message: "Each CSV column can be mapped to only one shipment field.",
      rowNumber: 1,
    });
  }

  const normalizedRows = rows.map((values, index) => {
    const rowNumber = index + 2;
    const rawQuantity = getCell(headers, values, mapping, "quantity");
    const rawFreight = getCell(headers, values, mapping, "freightAmount");
    const shipmentDate = getCell(headers, values, mapping, "shipmentDate");
    const sourceStatus = getCell(headers, values, mapping, "status");
    const quantity = Number(rawQuantity);
    const freightAmount = rawFreight === "" ? undefined : Number(rawFreight);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      errors.push({
        field: "quantity",
        message: "Quantity must be a positive number.",
        originalValue: rawQuantity,
        rowNumber,
      });
    }
    if (
      rawFreight !== "" &&
      (!Number.isFinite(freightAmount) || freightAmount < 0)
    ) {
      errors.push({
        field: "freightAmount",
        message: "Freight amount must be a non-negative number.",
        originalValue: rawFreight,
        rowNumber,
      });
    }
    if (!isIsoDate(shipmentDate)) {
      errors.push({
        field: "shipmentDate",
        message: "Shipment date must use yyyy-MM-dd.",
        originalValue: shipmentDate,
        rowNumber,
      });
    }
    if (!statusMapping[sourceStatus]) {
      errors.push({
        field: "status",
        message: "Map this source status to a ShipmentStatus name.",
        originalValue: sourceStatus,
        rowNumber,
      });
    }
    ["channelCode", "warehouseCode", "channelSku"].forEach((field) => {
      const value = getCell(headers, values, mapping, field);
      if (!value) {
        errors.push({
          field,
          message: `${field} is required.`,
          originalValue: value,
          rowNumber,
        });
      }
    });

    return {
      channelCode: getCell(headers, values, mapping, "channelCode") || undefined,
      channelSku: getCell(headers, values, mapping, "channelSku") || undefined,
      docketNumber:
        getCell(headers, values, mapping, "docketNumber") || undefined,
      freightAmount,
      invoiceNumber:
        getCell(headers, values, mapping, "invoiceNumber") || undefined,
      notes: getCell(headers, values, mapping, "notes") || undefined,
      quantity,
      rowNumber,
      shipmentDate,
      sourceShipmentReference:
        getCell(headers, values, mapping, "sourceShipmentReference") ||
        undefined,
      status: statusMapping[sourceStatus],
      stoNumber: getCell(headers, values, mapping, "stoNumber") || undefined,
      transporterPartyCode:
        getCell(headers, values, mapping, "transporterPartyCode") || undefined,
      warehouseCode:
        getCell(headers, values, mapping, "warehouseCode") || undefined,
    };
  });
  const invalidRows = new Set(errors.map((error) => error.rowNumber));

  return {
    errors,
    malformedRows: [...invalidRows].filter((rowNumber) => rowNumber > 1)
      .length,
    missingRequired,
    rows: errors.some((error) => error.rowNumber === 1)
      ? []
      : normalizedRows.filter((row) => !invalidRows.has(row.rowNumber)),
    rowsRead: rows.length,
  };
};

const Notice = () => (
  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
    <p className="font-semibold">
      Historical import never changes current stock.
    </p>
    <p className="mt-1 text-xs leading-5">
      SKUs resolve only through an exact active channel mapping. Review
      unmatched records in{" "}
      <Link
        className="font-semibold text-brand hover:underline"
        to="/supply-chain/item-mappings?tab=unmatched"
      >
        Supply Chain → Item Mappings → Unmatched
      </Link>
      .
    </p>
  </div>
);

const MappingStep = ({
  headers,
  mapping,
  onMappingChange,
  onStatusChange,
  statusMapping,
  statusValues,
}) => (
  <div className="space-y-5">
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">
        Map CSV columns
      </h3>
      <p className="mt-1 text-xs leading-5 text-slate-500">
        The source workbook headers were not supplied, so every field is
        mapped explicitly. Required fields are marked.
      </p>
      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {IMPORT_FIELDS.map(([field, label, required]) => (
          <AppSelect
            key={field}
            label={`${label}${required ? " *" : ""}`}
            options={[
              { label: "Not mapped", value: "" },
              ...headers.map((header) => ({ label: header, value: header })),
            ]}
            value={mapping[field] || ""}
            onChange={(value) => onMappingChange(field, value)}
          />
        ))}
      </div>
    </div>

    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">
        Map source status values
      </h3>
      <p className="mt-1 text-xs leading-5 text-slate-500">
        Map every distinct source value to a named ShipmentStatus. Values are
        never guessed or converted to numbers.
      </p>
      {!mapping.status ? (
        <p className="mt-4 rounded-lg bg-slate-50 px-3 py-3 text-xs text-slate-500">
          Map the Shipment status column first.
        </p>
      ) : statusValues.length === 0 ? (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-3 text-xs text-red-700">
          The mapped status column contains no values.
        </p>
      ) : (
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {statusValues.map((sourceValue) => (
            <AppSelect
              key={sourceValue}
              label={sourceValue}
              options={[
                { label: "Choose a shipment status", value: "" },
                ...toShipmentOptions(SHIPMENT_STATUS_LABELS),
              ]}
              value={statusMapping[sourceValue] || ""}
              onChange={(value) => onStatusChange(sourceValue, value)}
            />
          ))}
        </div>
      )}
    </div>
  </div>
);

const ValidationChips = ({ active, onChange, validation }) => {
  const chips = [
    ["all", "Total", validation.totalRows, "slate"],
    ["valid", "Valid", validation.validRows, "emerald"],
    ["invalid", "Invalid", validation.invalidRows, "red"],
    ["duplicate", "Duplicates", validation.duplicateRows, "amber"],
    ["sku", "Unmatched SKUs", validation.unmatchedSkuCount, "amber"],
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {chips.map(([key, label, value, tone]) => (
        <button
          className={[
            "rounded-full ring-2 transition",
            active === key ? "ring-brand/30" : "ring-transparent",
          ].join(" ")}
          key={key}
          type="button"
          onClick={() => onChange(key)}
        >
          <ShipmentPill tone={tone}>
            {label} {formatShipmentNumber(value, "0")}
          </ShipmentPill>
        </button>
      ))}
    </div>
  );
};

const CommitConfirmationModal = ({
  correctionReason,
  duplicateRows,
  isOpen,
  loading,
  onClose,
  onConfirm,
}) => (
  <AppModal
    isBusy={loading}
    isOpen={isOpen}
    maxWidth="max-w-xl"
    title="Commit historical import"
    onClose={loading ? undefined : onClose}
  >
    <Notice />
    <p className="mt-4 text-sm leading-6 text-slate-600">
      Commit this validated batch
      {duplicateRows > 0
        ? ` with ${duplicateRows} duplicate row${duplicateRows === 1 ? "" : "s"} as an audited correction`
        : ""}
      ? The import records shipment history only.
    </p>
    {correctionReason ? (
      <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
        Correction reason: {correctionReason}
      </div>
    ) : null}
    <div className="mt-5 flex justify-end gap-2">
      <AppButton disabled={loading} variant="secondary" onClick={onClose}>
        Back
      </AppButton>
      <AppButton
        isLoading={loading}
        loadingText="Committing…"
        onClick={onConfirm}
      >
        Commit import
      </AppButton>
    </div>
  </AppModal>
);

const CancelImportModal = ({
  batch,
  conflict,
  loading,
  onClose,
  onConfirm,
  onRefresh,
}) => {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!batch) return undefined;
    const timeout = window.setTimeout(() => {
      setReason("");
      setError("");
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [batch]);

  const submit = () => {
    if (!reason.trim()) {
      setError("A reversal reason is required.");
      return;
    }
    onConfirm(reason.trim());
  };

  return (
    <AppModal
      isBusy={loading}
      isOpen={Boolean(batch)}
      maxWidth="max-w-xl"
      title="Reverse uncommitted import"
      onClose={loading ? undefined : onClose}
    >
      <p className="text-sm leading-6 text-slate-600">
        Cancel this uncommitted validation batch as an auditable reversal.
        Historical imports never change stock.
      </p>
      <div className="mt-4">
        <label
          className="mb-1.5 block text-[13px] font-medium text-slate-700"
          htmlFor="shipment-import-cancel-reason"
        >
          Reversal reason <span className="text-red-500">*</span>
        </label>
        <textarea
          className="min-h-24 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
          disabled={loading}
          id="shipment-import-cancel-reason"
          value={reason}
          onChange={(event) => {
            setReason(event.target.value);
            setError("");
          }}
        />
        {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
      </div>
      <div className="mt-4">
        <ShipmentConflict error={conflict} onRefresh={onRefresh} />
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <AppButton disabled={loading} variant="secondary" onClick={onClose}>
          Back
        </AppButton>
        <AppButton
          isLoading={loading}
          loadingText="Reversing…"
          variant="danger"
          onClick={submit}
        >
          Reverse batch
        </AppButton>
      </div>
    </AppModal>
  );
};

const ShipmentImportsPage = () => {
  const dispatch = useDispatch();
  const history = useSelector((root) => root.shipmentImports);
  const capabilities = useShipmentCapabilities();
  const [tab, setTab] = useState("new");
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [csv, setCsv] = useState({ errors: [], headers: [], rows: [] });
  const [mapping, setMapping] = useState({});
  const [rememberedMapping, setRememberedMapping] = useState({});
  const [statusMapping, setStatusMapping] = useState({});
  const [localResult, setLocalResult] = useState(null);
  const [validation, setValidation] = useState(null);
  const [fileHash, setFileHash] = useState("");
  const [errorFilter, setErrorFilter] = useState("all");
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState(null);
  const [working, setWorking] = useState(false);
  const [allowDuplicate, setAllowDuplicate] = useState(false);
  const [correctionReason, setCorrectionReason] = useState("");
  const [confirmCommit, setConfirmCommit] = useState(false);
  const [cancelBatch, setCancelBatch] = useState(null);
  const [cancelConflict, setCancelConflict] = useState(null);

  const historyParams = useMemo(
    () => ({
      ...history.filters,
      PageNumber: history.pageNumber,
      PageSize: history.pageSize,
    }),
    [history.filters, history.pageNumber, history.pageSize],
  );
  const loadHistory = useCallback(
    () => dispatch(fetchShipmentImports(historyParams)),
    [dispatch, historyParams],
  );

  useEffect(() => {
    if (tab !== "history") return undefined;
    const timeout = window.setTimeout(() => void loadHistory(), 0);
    return () => window.clearTimeout(timeout);
  }, [loadHistory, tab]);

  const statusValues = useMemo(() => {
    if (!mapping.status) return [];
    const index = csv.headers.indexOf(mapping.status);
    if (index < 0) return [];
    return [
      ...new Set(
        csv.rows
          .map((row) => String(row[index] ?? "").trim())
          .filter(Boolean),
      ),
    ].sort((a, b) => a.localeCompare(b));
  }, [csv.headers, csv.rows, mapping.status]);

  const chooseFile = async (event) => {
    const selected = event.target.files?.[0] ?? null;
    setError("");
    setConflict(null);
    setValidation(null);
    setLocalResult(null);
    setFileHash("");

    if (!selected) {
      setFile(null);
      setCsv({ errors: [], headers: [], rows: [] });
      return;
    }
    // DEPENDENCY: XLSX remains intentionally unsupported until a parser
    // dependency is explicitly approved for this frontend.
    if (!selected.name.toLowerCase().endsWith(".csv")) {
      setError("Choose a .csv file. XLSX support requires a separate dependency decision.");
      event.target.value = "";
      return;
    }
    if (selected.size > SHIPMENT_MAX_IMPORT_BYTES) {
      setError("The CSV must be 10 MB or smaller.");
      event.target.value = "";
      return;
    }

    try {
      const text = await selected.text();
      const parsed = parseCsv(text);
      if (parsed.errors.length > 0 || parsed.headers.length === 0) {
        setError(
          parsed.errors[0]?.message ||
            "The CSV has no readable header row.",
        );
        return;
      }
      const restored = Object.fromEntries(
        Object.entries(rememberedMapping).filter(([, header]) =>
          parsed.headers.includes(header),
        ),
      );
      setFile(selected);
      setCsv(parsed);
      setMapping(restored);
      setStatusMapping({});
      setStep(1);
    } catch (requestError) {
      setError(
        getApiErrorMessage(requestError, "Unable to read this CSV file."),
      );
    }
  };

  const mapField = (field, header) => {
    setMapping((current) => {
      const next = { ...current, [field]: header };
      setRememberedMapping(next);
      return next;
    });
    if (field === "status") setStatusMapping({});
    setError("");
  };

  const validateFile = async () => {
    const result = buildLocalRows({
      headers: csv.headers,
      mapping,
      rows: csv.rows,
      statusMapping,
    });
    setLocalResult(result);
    setError("");
    setConflict(null);
    setValidation(null);
    setStep(3);

    if (result.errors.length > 0) return;

    setWorking(true);
    try {
      const hash = await sha256Hex(file);
      const response = await shipmentImportService.validate({
        fileHash: hash,
        originalFileName: file.name,
        rows: result.rows,
      });
      setFileHash(hash);
      setValidation(response.data ?? null);
      setStep(4);
      toast.success(response.message || "Historical import validated.");
    } catch (requestError) {
      const message = getShipmentMutationMessage(
        requestError,
        "Unable to validate this historical import.",
      );
      setError(message);
      if (isConflictError(requestError)) setConflict(requestError);
      toast.error(message);
    } finally {
      setWorking(false);
    }
  };

  const resetWizard = () => {
    setStep(1);
    setFile(null);
    setCsv({ errors: [], headers: [], rows: [] });
    setMapping({});
    setStatusMapping({});
    setLocalResult(null);
    setValidation(null);
    setFileHash("");
    setErrorFilter("all");
    setError("");
    setConflict(null);
    setAllowDuplicate(false);
    setCorrectionReason("");
  };

  const commit = async () => {
    if (!validation?.batchId) return;
    setWorking(true);
    setError("");
    setConflict(null);
    try {
      const response = await shipmentImportService.commit(
        validation.batchId,
        {
          allowDuplicate:
            Number(validation.duplicateRows || 0) > 0 && allowDuplicate,
          correctionReason:
            Number(validation.duplicateRows || 0) > 0
              ? correctionReason.trim()
              : undefined,
        },
      );
      toast.success(response.message || "Historical import committed.");
      setConfirmCommit(false);
      resetWizard();
      setTab("history");
      await loadHistory();
    } catch (requestError) {
      const message = getShipmentMutationMessage(
        requestError,
        "Unable to commit this historical import.",
      );
      setError(message);
      if (isConflictError(requestError)) setConflict(requestError);
      setConfirmCommit(false);
      toast.error(message);
    } finally {
      setWorking(false);
    }
  };

  const cancelImport = async (reason) => {
    if (!cancelBatch) return;
    setWorking(true);
    setCancelConflict(null);
    try {
      const response = await shipmentImportService.cancel(
        cancelBatch.id,
        reason,
      );
      toast.success(response.message || "Import batch reversed.");
      setCancelBatch(null);
      await loadHistory();
    } catch (requestError) {
      const message = getShipmentMutationMessage(
        requestError,
        "Unable to reverse this import batch.",
      );
      if (isConflictError(requestError)) setCancelConflict(requestError);
      toast.error(message);
    } finally {
      setWorking(false);
    }
  };

  const serverErrors = validation?.rowErrors ?? [];
  const filteredErrors = serverErrors.filter((rowError) => {
    const text = `${rowError.field} ${rowError.message}`.toLowerCase();
    if (errorFilter === "duplicate") return text.includes("duplicate");
    if (errorFilter === "sku") return text.includes("sku");
    if (errorFilter === "valid") return false;
    return true;
  });
  const duplicatesPresent = Number(validation?.duplicateRows || 0) > 0;
  const duplicateReady =
    !duplicatesPresent ||
    (allowDuplicate && correctionReason.trim().length > 0);
  const canCommit =
    Boolean(validation?.canCommit) &&
    duplicateReady &&
    capabilities.canManageImports;

  return (
    <section className="min-w-0 space-y-5">
      <PageHeader
        badge="Shipment Operations"
        description="Map and validate historical shipment CSV data without changing current stock."
        title="Historical import"
        actions={
          tab === "history" ? (
            <AppButton
              disabled={history.loading}
              variant="secondary"
              onClick={() => void loadHistory()}
            >
              <RefreshCw
                className={`h-4 w-4 ${history.loading ? "animate-spin" : ""}`}
              />
              Refresh
            </AppButton>
          ) : null
        }
      />

      <div className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
        {[
          ["new", "New import"],
          ["history", "History"],
        ].map(([value, label]) => (
          <button
            className={[
              "rounded-lg px-4 py-2 text-sm font-medium transition",
              tab === value
                ? "bg-brand-light text-brand"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900",
            ].join(" ")}
            key={value}
            type="button"
            onClick={() => setTab(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "new" ? (
        <>
          <Notice />
          <div className="grid grid-cols-4 gap-2">
            {["File", "Map columns", "Parse & validate", "Commit"].map(
              (label, index) => (
                <div key={label}>
                  <div
                    className={[
                      "h-1.5 rounded-full",
                      step >= index + 1 ? "bg-brand" : "bg-slate-200",
                    ].join(" ")}
                  />
                  <p
                    className={[
                      "mt-1 text-[11px] font-medium",
                      step >= index + 1 ? "text-brand" : "text-slate-400",
                    ].join(" ")}
                  >
                    {index + 1}. {label}
                  </p>
                </div>
              ),
            )}
          </div>

          {step === 1 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mx-auto max-w-2xl rounded-xl border-2 border-dashed border-slate-200 p-8 text-center">
                <FileUp className="mx-auto h-10 w-10 text-slate-300" />
                <h3 className="mt-3 text-sm font-semibold text-slate-900">
                  Choose historical shipment CSV
                </h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  CSV only, up to 10 MB. XLSX is not enabled because no parser
                  dependency is approved.
                </p>
                <input
                  accept=".csv,text/csv"
                  className="mt-5 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-light file:px-3 file:py-2 file:text-xs file:font-semibold file:text-brand"
                  type="file"
                  onChange={(event) => void chooseFile(event)}
                />
                {file ? (
                  <p className="mt-3 text-xs font-medium text-slate-600">
                    {file.name} · {formatShipmentNumber(file.size, "0")} bytes ·{" "}
                    {csv.rows.length} data rows
                  </p>
                ) : null}
              </div>
              {error ? (
                <p className="mt-4 text-center text-sm text-red-600">
                  {error}
                </p>
              ) : null}
              <div className="mt-5 flex justify-end">
                {file ? (
                  <AppButton onClick={() => setStep(2)}>
                    Map columns
                  </AppButton>
                ) : (
                  <DisabledShipmentAction reason="Choose a valid CSV file first.">
                    <AppButton disabled>Map columns</AppButton>
                  </DisabledShipmentAction>
                )}
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <>
              <MappingStep
                headers={csv.headers}
                mapping={mapping}
                statusMapping={statusMapping}
                statusValues={statusValues}
                onMappingChange={mapField}
                onStatusChange={(sourceValue, value) =>
                  setStatusMapping((current) => ({
                    ...current,
                    [sourceValue]: value,
                  }))
                }
              />
              <div className="flex justify-between gap-2">
                <AppButton variant="secondary" onClick={() => setStep(1)}>
                  Back
                </AppButton>
                <AppButton onClick={() => void validateFile()}>
                  Parse and validate
                </AppButton>
              </div>
            </>
          ) : null}

          {step >= 3 && localResult ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900">
                  Local parse summary
                </h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  <ShipmentPill tone="slate">
                    Rows read {localResult.rowsRead}
                  </ShipmentPill>
                  <ShipmentPill
                    tone={
                      localResult.missingRequired.length > 0 ? "red" : "emerald"
                    }
                  >
                    Unmapped required {localResult.missingRequired.length}
                  </ShipmentPill>
                  <ShipmentPill
                    tone={localResult.malformedRows > 0 ? "red" : "emerald"}
                  >
                    Malformed rows {localResult.malformedRows}
                  </ShipmentPill>
                </div>
                {localResult.errors.length > 0 ? (
                  <div className="mt-4 max-h-64 overflow-auto rounded-lg border border-red-200 bg-red-50">
                    {localResult.errors.map((rowError, index) => (
                      <div
                        className="border-b border-red-100 px-3 py-2 text-xs text-red-700 last:border-b-0"
                        key={`${rowError.rowNumber}-${rowError.field}-${index}`}
                      >
                        Row {rowError.rowNumber} · {rowError.field}:{" "}
                        {rowError.message}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              {working ? (
                <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                  <RefreshCw className="mx-auto h-6 w-6 animate-spin text-brand" />
                  <p className="mt-3 text-sm font-medium text-slate-700">
                    Computing SHA-256 and validating with the server…
                  </p>
                </div>
              ) : null}

              {localResult.errors.length > 0 ? (
                <div className="flex justify-between gap-2">
                  <AppButton variant="secondary" onClick={() => setStep(2)}>
                    Fix mapping
                  </AppButton>
                  <DisabledShipmentAction reason="Resolve every local parse and mapping error before server validation.">
                    <AppButton disabled>Continue to commit</AppButton>
                  </DisabledShipmentAction>
                </div>
              ) : null}
            </div>
          ) : null}

          {step === 4 && validation ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      Server validation
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Batch {validation.batchId} · SHA-256{" "}
                      <span className="font-mono">{fileHash.slice(0, 16)}…</span>
                    </p>
                  </div>
                  <ValidationChips
                    active={errorFilter}
                    validation={validation}
                    onChange={setErrorFilter}
                  />
                </div>
              </div>

              <DataTableShell
                colGroup={
                  <colgroup>
                    <col className="w-[56px]" />
                    <col className="w-28" />
                    <col className="w-44" />
                    <col className="w-96" />
                    <col className="w-64" />
                  </colgroup>
                }
                columnCount={5}
                emptyHint={
                  errorFilter === "valid"
                    ? "Valid rows do not have row-error records."
                    : "This validation category has no row errors."
                }
                emptyTitle={
                  filteredErrors.length === 0
                    ? errorFilter === "valid"
                      ? "Valid rows have no errors"
                      : "No row errors in this category"
                    : undefined
                }
                head={
                  <>
                    <th className={DATA_TABLE_HEADER_CLASS}>#</th>
                    <th className={DATA_TABLE_HEADER_CLASS}>Row number</th>
                    <th className={DATA_TABLE_HEADER_CLASS}>Field</th>
                    <th className={DATA_TABLE_HEADER_CLASS}>Message</th>
                    <th className={DATA_TABLE_HEADER_CLASS}>Original value</th>
                  </>
                }
                minWidth="min-w-[1040px]"
              >
                {filteredErrors.map((rowError, index) => (
                  <tr
                    key={`${rowError.rowNumber}-${rowError.field}-${index}`}
                  >
                    <td className="px-4 py-3.5 text-xs font-semibold tabular-nums text-slate-400">
                      {index + 1}
                    </td>
                    <td>{rowError.rowNumber}</td>
                    <td className="font-medium text-slate-900">
                      {rowError.field}
                    </td>
                    <td>{rowError.message}</td>
                    <td className="max-w-64 truncate">
                      {rowError.originalValue || "—"}
                    </td>
                  </tr>
                ))}
              </DataTableShell>

              {duplicatesPresent ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <label className="flex items-start gap-2 text-sm font-medium text-amber-900">
                    <input
                      checked={allowDuplicate}
                      className="mt-0.5 h-4 w-4 rounded border-amber-300 text-brand focus:ring-brand/20"
                      type="checkbox"
                      onChange={(event) =>
                        setAllowDuplicate(event.target.checked)
                      }
                    />
                    Commit duplicate rows as an audited correction
                  </label>
                  {allowDuplicate ? (
                    <div className="mt-3">
                      <label
                        className="mb-1.5 block text-xs font-semibold text-amber-900"
                        htmlFor="shipment-import-correction-reason"
                      >
                        Correction reason
                      </label>
                      <textarea
                        className="min-h-20 w-full rounded-lg border border-amber-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                        id="shipment-import-correction-reason"
                        value={correctionReason}
                        onChange={(event) =>
                          setCorrectionReason(event.target.value)
                        }
                      />
                    </div>
                  ) : null}
                </div>
              ) : null}

              <SupplyChainInlineError
                message={error}
                title="Historical import action failed"
              />
              <ShipmentConflict
                error={conflict}
                onRefresh={() => void validateFile()}
              />

              <div className="flex justify-between gap-2">
                <AppButton variant="secondary" onClick={() => setStep(2)}>
                  Back to mapping
                </AppButton>
                {canCommit ? (
                  <AppButton onClick={() => setConfirmCommit(true)}>
                    <FileCheck2 className="h-4 w-4" />
                    Commit import
                  </AppButton>
                ) : (
                  <DisabledShipmentAction
                    reason={
                      !capabilities.canManageImports
                        ? "Committing requires Shipment Operations Imports permission."
                        : !validation.canCommit
                          ? "The server marked this validation batch as not committable."
                          : duplicatesPresent && !allowDuplicate
                            ? "Confirm that duplicate rows are an audited correction."
                            : "Enter a non-empty correction reason."
                    }
                  >
                    <AppButton disabled>
                      <FileCheck2 className="h-4 w-4" />
                      Commit import
                    </AppButton>
                  </DisabledShipmentAction>
                )}
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <>
          <Notice />
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-end gap-3">
              <AppInput
                className="w-72"
                helperText="The API publishes an integer but no mapping. Enter only a value confirmed from a live response."
                label="Batch status code"
                min="0"
                step="1"
                type="number"
                value={history.filters.Status}
                onChange={(event) =>
                  dispatch(
                    setShipmentImportFilters({
                      Status: event.target.value,
                    }),
                  )
                }
              />
              {history.filters.Status ? (
                <AppButton
                  variant="ghost"
                  onClick={() =>
                    dispatch(setShipmentImportFilters({ Status: "" }))
                  }
                >
                  Clear
                </AppButton>
              ) : null}
            </div>
          </div>
          <SupplyChainInlineError
            message={history.error}
            title="Import history unavailable"
            onRetry={loadHistory}
          />
          <DataTableShell
            colGroup={
              <colgroup>
                <col className="w-[56px]" />
                <col className="w-72" />
                {Array.from({ length: 4 }, (_, index) => (
                  <col className="w-24" key={index} />
                ))}
                <col className="w-32" />
                <col className="w-44" />
                <col className="w-44" />
                <col className="w-24" />
              </colgroup>
            }
            columnCount={10}
            emptyHint="Validate a CSV or adjust the numeric status filter."
            emptyTitle={
              !history.loading && history.list.length === 0
                ? "No historical import batches match"
                : undefined
            }
            head={
              <>
                <th className={DATA_TABLE_HEADER_CLASS}>#</th>
                <th className={DATA_TABLE_HEADER_CLASS}>File name</th>
                <th className={`${DATA_TABLE_HEADER_CLASS} text-right`}>
                  Total
                </th>
                <th className={`${DATA_TABLE_HEADER_CLASS} text-right`}>
                  Valid
                </th>
                <th className={`${DATA_TABLE_HEADER_CLASS} text-right`}>
                  Invalid
                </th>
                <th className={`${DATA_TABLE_HEADER_CLASS} text-right`}>
                  Committed
                </th>
                <th className={DATA_TABLE_HEADER_CLASS}>Status</th>
                <th className={DATA_TABLE_HEADER_CLASS}>Uploaded at</th>
                <th className={DATA_TABLE_HEADER_CLASS}>Committed at</th>
                <th className={`${DATA_TABLE_HEADER_CLASS} text-right`}>
                  Actions
                </th>
              </>
            }
            loading={history.loading}
            minWidth="min-w-[1320px]"
          >
            {history.list.map((batch, index) => {
              // CONFIRM: Until the backend publishes the integer status
              // mapping, committedAtUtc is the only unambiguous committed
              // signal available to the client. The server remains the
              // authority for cancellation.
              const uncommitted =
                !batch.committedAtUtc && Number(batch.committedRows || 0) === 0;

              return (
                <tr key={batch.id}>
                  <td className="px-4 py-3.5 text-xs font-semibold tabular-nums text-slate-400">
                    {(history.pageNumber - 1) * history.pageSize + index + 1}
                  </td>
                  <td className="font-medium text-slate-900">
                    {batch.originalFileName || `Batch ${batch.id}`}
                  </td>
                  {[
                    batch.totalRows,
                    batch.validRows,
                    batch.invalidRows,
                    batch.committedRows,
                  ].map((value, valueIndex) => (
                    <td
                      className="text-right tabular-nums"
                      key={valueIndex}
                    >
                      {formatShipmentNumber(value, "0")}
                    </td>
                  ))}
                  <td>
                    <ShipmentPill
                      tone={
                        batch.committedAtUtc
                          ? "emerald"
                          : batch.invalidRows > 0
                            ? "amber"
                            : "slate"
                      }
                    >
                      {SHIPMENT_IMPORT_BATCH_STATUS_LABELS[batch.status] ||
                        `Status ${batch.status}`}
                    </ShipmentPill>
                  </td>
                  <td>{formatShipmentDateTime(batch.uploadedAtUtc)}</td>
                  <td>{formatShipmentDateTime(batch.committedAtUtc)}</td>
                  <td>
                    <div className="flex items-center justify-end">
                      {uncommitted && capabilities.canManageImports ? (
                        <AppTooltip label="Reverse uncommitted batch">
                          <button
                            aria-label={`Reverse ${batch.originalFileName}`}
                            className={DATA_TABLE_ROW_ACTION_DANGER_CLASS}
                            type="button"
                            onClick={() => setCancelBatch(batch)}
                          >
                            <Ban className="h-4 w-4" />
                          </button>
                        </AppTooltip>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </DataTableShell>
          <SupplyChainPagination
            disabled={history.loading}
            pageNumber={history.pageNumber}
            pageSize={history.pageSize}
            totalCount={history.totalCount}
            totalPages={history.totalPages}
            onPageChange={(value) =>
              dispatch(setShipmentImportPage(value))
            }
            onPageSizeChange={(value) =>
              dispatch(setShipmentImportPageSize(value))
            }
          />
        </>
      )}

      <CommitConfirmationModal
        correctionReason={correctionReason.trim()}
        duplicateRows={Number(validation?.duplicateRows || 0)}
        isOpen={confirmCommit}
        loading={working}
        onClose={() => setConfirmCommit(false)}
        onConfirm={() => void commit()}
      />
      <CancelImportModal
        batch={cancelBatch}
        conflict={cancelConflict}
        loading={working}
        onClose={() => {
          setCancelBatch(null);
          setCancelConflict(null);
        }}
        onConfirm={(reason) => void cancelImport(reason)}
        onRefresh={() => {
          setCancelConflict(null);
          void loadHistory();
        }}
      />
    </section>
  );
};

export default ShipmentImportsPage;
