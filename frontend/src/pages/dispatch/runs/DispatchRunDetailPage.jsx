import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  Boxes,
  Calculator,
  CheckCircle2,
  Download,
  List,
  RefreshCw,
  Send,
  TableProperties,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import AppButton from "../../../components/common/AppButton";
import AppInput from "../../../components/common/AppInput";
import AppModal from "../../../components/common/AppModal";
import AppSelect from "../../../components/common/AppSelect";
import DataTableShell, {
  DATA_TABLE_HEADER_CLASS,
} from "../../../components/common/DataTableShell";
import PageHeader from "../../../components/common/PageHeader";
import StatCards from "../../../components/common/StatCards";
import {
  DISPATCH_RUN_STATUS,
  DISPATCH_TIER_LABELS,
  toDispatchOptions,
} from "../../../constants/dispatchEnums";
import { dispatchRunService } from "../../../services/dispatch";
import {
  getApiFieldErrors,
  getApiStatus,
  isConflictError,
} from "../../../utils/apiError";
import { downloadCsv } from "../../../utils/csv";
import {
  getRunActions,
  normalizeDispatchRunStatus,
} from "../../../utils/dispatchRunLifecycle";
import { ProcurementItemAutocomplete } from "../../procurement/ProcurementShared";
import {
  SupplyChainFilterBar,
  SupplyChainInlineError,
} from "../../supplyChain/SupplyChainShared";
import {
  DisabledDispatchAction,
  DispatchPill,
  DispatchRunStatusPill,
} from "../DispatchShared";
import {
  formatDispatchDate,
  formatDispatchDateTime,
  formatDispatchNumber,
  getDispatchError,
} from "../dispatchDisplay";
import useDispatchCapabilities from "../useDispatchCapabilities";
import DispatchRecommendationMatrix from "./DispatchRecommendationMatrix";

const getItemId = (item) => item?.id ?? item?.itemId ?? "";

const extractBlockingItems = (error) => {
  const data =
    error?.response?.data?.data ??
    error?.apiError?.data ??
    error?.response?.data ??
    {};
  const candidates = [
    data.affectedItems,
    data.blockingItems,
    data.missingItems,
    data.items,
    data.lines,
  ].find(Array.isArray);

  if (!candidates) return [];
  return candidates
    .map((item) => ({
      code: item?.itemCode ?? item?.code ?? "",
      id: item?.itemId ?? item?.id ?? "",
      name: item?.itemName ?? item?.name ?? "",
      reason:
        item?.reason ??
        item?.message ??
        item?.missingConfiguration ??
        "Missing dispatch setting or packaging.",
    }))
    .filter((item) => item.code || item.name || item.id);
};

const StageStrip = ({ status }) => {
  const normalized = normalizeDispatchRunStatus(status);
  const stages = [
    { label: "Draft", status: DISPATCH_RUN_STATUS.Draft },
    { label: "Calculated", status: DISPATCH_RUN_STATUS.Calculated },
    { label: "Allocated", status: DISPATCH_RUN_STATUS.Allocated },
    { label: "Finalized", status: DISPATCH_RUN_STATUS.Finalized },
  ];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex min-w-0 items-center overflow-x-auto">
        {stages.map((stage, index) => {
          const current = normalized === stage.status;
          const complete =
            normalized !== DISPATCH_RUN_STATUS.Cancelled &&
            normalized > stage.status;
          return (
            <div key={stage.status} className="contents">
              {index > 0 ? (
                <div
                  className={`h-px min-w-10 flex-1 ${complete || current ? "bg-brand/40" : "bg-slate-200"}`}
                />
              ) : null}
              <div className="flex min-w-24 flex-col items-center gap-1.5">
                <span
                  className={[
                    "grid h-8 w-8 place-items-center rounded-full ring-1 ring-inset",
                    current
                      ? "bg-brand text-white ring-brand"
                      : complete
                        ? "bg-brand-light text-brand ring-brand/20"
                        : "bg-slate-50 text-slate-400 ring-slate-200",
                  ].join(" ")}
                >
                  {complete ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <span className="text-xs font-semibold">{index + 1}</span>
                  )}
                </span>
                <span
                  className={`text-xs font-medium ${current ? "text-brand" : "text-slate-500"}`}
                >
                  {stage.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      {normalized === DISPATCH_RUN_STATUS.Cancelled ? (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          <Ban className="h-3.5 w-3.5" />
          This run was cancelled and is read only.
        </div>
      ) : null}
    </div>
  );
};

const OverrideModal = ({ onClose, onSaved, recommendation, runId }) => {
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!recommendation) return undefined;
    const timeout = window.setTimeout(() => {
      setQuantity(recommendation.finalRecommendationQuantity ?? "");
      setReason("");
      setErrors({});
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [recommendation]);

  const submit = async () => {
    const number = Number(quantity);
    const nextErrors = {
      finalRecommendationQuantity:
        quantity === "" || !Number.isFinite(number) || number < 0
          ? "Final recommendation must be a non-negative number."
          : "",
      overrideReason: reason.trim() ? "" : "Override reason is required.",
    };
    if (Object.values(nextErrors).some(Boolean)) {
      setErrors(nextErrors);
      return;
    }

    setSaving(true);
    setErrors({});
    try {
      const response = await dispatchRunService.updateRecommendation(
        runId,
        recommendation.id,
        {
          finalRecommendationQuantity: number,
          overrideReason: reason.trim(),
        },
      );
      toast.success(response.message || "Recommendation overridden.");
      await onSaved();
      onClose();
    } catch (error) {
      const fields = getApiFieldErrors(error);
      const message = getDispatchError(
        error,
        "Unable to override the recommendation.",
      );
      setErrors({
        ...fields,
        form: Object.keys(fields).length > 0 ? "" : message,
      });
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppModal
      isBusy={saving}
      isOpen={Boolean(recommendation)}
      title="Override recommendation"
      onClose={saving ? undefined : onClose}
    >
      <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
        {recommendation?.itemCode} · {recommendation?.warehouseCode}
      </div>
      <div className="mt-4">
        <AppInput
          disabled={saving}
          title={saving ? "The override is already saving" : undefined}
          error={errors.finalRecommendationQuantity}
          label="Final recommendation quantity"
          min="0"
          required
          step="any"
          type="number"
          value={quantity}
          onChange={(event) => {
            setQuantity(event.target.value);
            setErrors((current) => ({
              ...current,
              finalRecommendationQuantity: "",
            }));
          }}
        />
      </div>
      <div className="mt-4">
        <label
          className="mb-1.5 block text-[13px] font-medium text-slate-700"
          htmlFor="dispatch-override-reason"
        >
          Override reason <span className="text-red-500">*</span>
        </label>
        <textarea
          className="min-h-24 w-full rounded-lg border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
          disabled={saving}
          title={saving ? "The allocation is already saving" : undefined}
          id="dispatch-override-reason"
          value={reason}
          onChange={(event) => {
            setReason(event.target.value);
            setErrors((current) => ({ ...current, overrideReason: "" }));
          }}
        />
        {errors.overrideReason ? (
          <p className="mt-1 text-xs text-red-600">{errors.overrideReason}</p>
        ) : null}
      </div>
      <SupplyChainInlineError message={errors.form} title="Override conflict" />
      <div className="mt-5 flex justify-end gap-2">
        <AppButton disabled={saving} variant="secondary" onClick={onClose}>
          Back
        </AppButton>
        <AppButton
          disabled={
            quantity === "" ||
            !Number.isFinite(Number(quantity)) ||
            Number(quantity) < 0 ||
            !reason.trim()
          }
          isLoading={saving}
          loadingText="Saving…"
          onClick={submit}
        >
          Save override
        </AppButton>
      </div>
    </AppModal>
  );
};

const AllocationModal = ({ isOpen, onClose, onSaved, runId }) => {
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return undefined;
    const timeout = window.setTimeout(() => {
      setNotes("");
      setError("");
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [isOpen]);

  const submit = async () => {
    setSaving(true);
    setError("");
    try {
      const response = await dispatchRunService.allocate(runId, notes.trim() || null);
      toast.success(response.message || "Company stock allocated.");
      await onSaved();
      onClose();
    } catch (requestError) {
      const message = getDispatchError(requestError, "Unable to allocate the run.");
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppModal
      isBusy={saving}
      isOpen={isOpen}
      title="Allocate company stock"
      onClose={saving ? undefined : onClose}
    >
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
        This allocates company stock across recommendations by priority. It
        cannot be re-run.
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Allocated by allocation priority, then tier, then warehouse priority.
        The backend revalidates all limits and is authoritative.
      </p>
      <div className="mt-4">
        <label
          className="mb-1.5 block text-[13px] font-medium text-slate-700"
          htmlFor="dispatch-allocation-notes"
        >
          Allocation notes
        </label>
        <textarea
          className="min-h-24 w-full rounded-lg border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
          disabled={saving}
          title={saving ? "The allocation is already saving" : undefined}
          id="dispatch-allocation-notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </div>
      <SupplyChainInlineError message={error} title="Allocation conflict" />
      <div className="mt-5 flex justify-end gap-2">
        <AppButton disabled={saving} variant="secondary" onClick={onClose}>
          Back
        </AppButton>
        <AppButton
          isLoading={saving}
          loadingText="Allocating…"
          onClick={submit}
        >
          Confirm allocation
        </AppButton>
      </div>
    </AppModal>
  );
};

const ReasonModal = ({
  confirmLabel,
  description,
  isOpen,
  loading,
  onClose,
  onConfirm,
  title,
}) => {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return undefined;
    const timeout = window.setTimeout(() => {
      setReason("");
      setError("");
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [isOpen]);

  return (
    <AppModal
      isBusy={loading}
      isOpen={isOpen}
      title={title}
      onClose={loading ? undefined : onClose}
    >
      <p className="text-sm leading-6 text-slate-600">{description}</p>
      <div className="mt-4">
        <label
          className="mb-1.5 block text-[13px] font-medium text-slate-700"
          htmlFor="dispatch-reason"
        >
          Reason <span className="text-red-500">*</span>
        </label>
        <textarea
          className="min-h-24 w-full rounded-lg border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
          id="dispatch-reason"
          value={reason}
          onChange={(event) => {
            setReason(event.target.value);
            setError("");
          }}
        />
        {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <AppButton disabled={loading} variant="secondary" onClick={onClose}>
          Back
        </AppButton>
        <AppButton
          isLoading={loading}
          loadingText="Working…"
          variant="danger"
          onClick={() => {
            if (!reason.trim()) {
              setError("A reason is required.");
              return;
            }
            void onConfirm(reason.trim());
          }}
        >
          {confirmLabel}
        </AppButton>
      </div>
    </AppModal>
  );
};

const FinalizeModal = ({ isOpen, loading, onClose, onConfirm }) => (
  <AppModal
    isBusy={loading}
    isOpen={isOpen}
    title="Finalize recommendations"
    onClose={loading ? undefined : onClose}
  >
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
      Finalization makes this recommendation immutable. It records the
      recommendation only and does not create a shipment or move stock.
    </div>
    <div className="mt-5 flex justify-end gap-2">
      <AppButton disabled={loading} variant="secondary" onClick={onClose}>
        Back
      </AppButton>
      <AppButton
        isLoading={loading}
        loadingText="Finalizing…"
        onClick={onConfirm}
      >
        Finalize run
      </AppButton>
    </div>
  </AppModal>
);

const CompanyStockSnapshots = ({ snapshots }) => (
  <div className="space-y-3">
    <div>
      <h2 className="text-base font-semibold text-slate-900">
        Company stock allocation
      </h2>
      <p className="mt-1 text-xs text-slate-500">
        Allocated by allocation priority, then tier, then warehouse priority.
        Zero allocations remain visible.
      </p>
    </div>
    <DataTableShell
      columnCount={7}
      emptyHint="Company stock snapshots appear after the one-shot allocation."
      emptyTitle={
        snapshots.length === 0 ? "No company stock snapshots yet" : undefined
      }
      head={
        <>
          <th className={DATA_TABLE_HEADER_CLASS}>#</th>
          <th className={DATA_TABLE_HEADER_CLASS}>Item</th>
          <th className={`${DATA_TABLE_HEADER_CLASS} text-right`}>Available</th>
          <th className={`${DATA_TABLE_HEADER_CLASS} text-right`}>Reserved elsewhere</th>
          <th className={`${DATA_TABLE_HEADER_CLASS} text-right`}>Allocatable</th>
          <th className={`${DATA_TABLE_HEADER_CLASS} text-right`}>Allocated</th>
          <th className={DATA_TABLE_HEADER_CLASS}>Allocation</th>
        </>
      }
      minWidth="min-w-[980px]"
    >
      {snapshots.map((snapshot, index) => {
        const allocatable = Number(snapshot.allocatableQuantity) || 0;
        const allocated = Number(snapshot.allocatedQuantity) || 0;
        const percent =
          allocatable > 0
            ? Math.max(0, Math.min(100, (allocated / allocatable) * 100))
            : 0;
        return (
          <tr key={snapshot.id}>
            <td className="text-xs font-semibold tabular-nums text-slate-400">
              {index + 1}
            </td>
            <td>
              <p className="font-medium text-slate-900">{snapshot.itemName}</p>
              <p className="text-xs text-slate-500">{snapshot.itemCode}</p>
            </td>
            <td className="text-right tabular-nums">{formatDispatchNumber(snapshot.availableQuantity, "0")}</td>
            <td className="text-right tabular-nums">{formatDispatchNumber(snapshot.reservedForOtherOperations, "0")}</td>
            <td className="text-right tabular-nums">{formatDispatchNumber(snapshot.allocatableQuantity, "0")}</td>
            <td className="text-right font-semibold tabular-nums">{formatDispatchNumber(snapshot.allocatedQuantity, "0")}</td>
            <td>
              {allocated === 0 ? (
                <DispatchPill>Not allocated</DispatchPill>
              ) : (
                <div className="min-w-32">
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-brand"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[10px] tabular-nums text-slate-500">
                    {formatDispatchNumber(percent, "0", 0)}%
                  </p>
                </div>
              )}
            </td>
          </tr>
        );
      })}
    </DataTableShell>
  </div>
);

const DispatchRunDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [run, setRun] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [mutation, setMutation] = useState("");
  const [conflict, setConflict] = useState("");
  const [blockingItems, setBlockingItems] = useState([]);
  const [overrideTarget, setOverrideTarget] = useState(null);
  const [allocateOpen, setAllocateOpen] = useState(false);
  const [finalizeOpen, setFinalizeOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [view, setView] = useState("matrix");
  const [filterItem, setFilterItem] = useState(null);
  const [filters, setFilters] = useState({
    AllocatedOnly: false,
    ItemId: "",
    Search: "",
    Tier: "",
    WarehouseId: "",
  });
  const capabilities = useDispatchCapabilities({
    label: "DispatchPlanning.PlanningRuns",
    route: "/dispatch/runs",
  });

  const loadRun = useCallback(async () => {
    const response = await dispatchRunService.getById(id);
    const nextRun = response.data;
    setRun(nextRun);
    return nextRun;
  }, [id]);

  const loadRecommendations = useCallback(async () => {
    setRecommendationsLoading(true);
    try {
      const response = await dispatchRunService.recommendations(id, filters);
      setRecommendations(
        Array.isArray(response.data?.items) ? response.data.items : [],
      );
    } catch (requestError) {
      if (getApiStatus(requestError) !== 409) {
        setConflict(
          getDispatchError(
            requestError,
            "Unable to load dispatch recommendations.",
          ),
        );
      }
      setRecommendations([]);
    } finally {
      setRecommendationsLoading(false);
    }
  }, [filters, id]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError("");
    setNotFound(false);
    try {
      const nextRun = await loadRun();
      const status = normalizeDispatchRunStatus(nextRun?.status);
      if (status !== DISPATCH_RUN_STATUS.Draft) {
        await loadRecommendations();
      } else {
        setRecommendations([]);
      }
    } catch (requestError) {
      if (getApiStatus(requestError) === 404) {
        setNotFound(true);
      } else {
        setError(getDispatchError(requestError, "Unable to load this run."));
      }
    } finally {
      setLoading(false);
    }
  }, [loadRecommendations, loadRun]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadAll(), 0);
    return () => window.clearTimeout(timeout);
  }, [loadAll]);

  const refreshAfterMutation = async () => {
    await loadRun();
    await loadRecommendations();
  };

  const act = async (name, request, successMessage) => {
    setMutation(name);
    setConflict("");
    setBlockingItems([]);
    try {
      const response = await request();
      toast.success(response.message || successMessage);
      await refreshAfterMutation();
      return true;
    } catch (requestError) {
      const message = getDispatchError(requestError, `Unable to ${name} the run.`);
      const affected = extractBlockingItems(requestError);
      if (affected.length > 0) setBlockingItems(affected);
      setConflict(message);
      toast.error(message);
      if (isConflictError(requestError)) await loadRun();
      return false;
    } finally {
      setMutation("");
    }
  };

  const calculate = () =>
    act("calculate", () => dispatchRunService.calculate(id), "Run calculated.");
  const allocateDone = () => refreshAfterMutation();
  const finalize = async () => {
    await act(
      "finalize",
      () => dispatchRunService.finalize(id),
      "Run finalized.",
    );
    setFinalizeOpen(false);
  };
  const cancel = async (reason) => {
    await act(
      "cancel",
      () => dispatchRunService.cancel(id, reason),
      "Run cancelled.",
    );
    setCancelOpen(false);
  };

  const status = normalizeDispatchRunStatus(run?.status);
  const actions = getRunActions(run?.status, capabilities);
  const allRecords = useMemo(() => {
    const runRecords = Array.isArray(run?.recommendations)
      ? run.recommendations
      : [];
    const map = new Map();
    [...runRecords, ...recommendations].forEach((record) => {
      if (record?.id != null) map.set(String(record.id), record);
    });
    return [...map.values()];
  }, [recommendations, run]);
  const warehouseOptions = useMemo(() => {
    const map = new Map();
    allRecords.forEach((record) => {
      if (record.warehouseId != null) {
        map.set(String(record.warehouseId), {
          label: `${record.warehouseCode} — ${record.warehouseName}`,
          value: record.warehouseId,
        });
      }
    });
    return [...map.values()];
  }, [allRecords]);
  const incompleteItems = useMemo(() => {
    const map = new Map();
    allRecords.forEach((record) => {
      if (!record.dispatchSkuSettingId || !record.packagingProfileId) {
        map.set(String(record.itemId), {
          code: record.itemCode,
          id: record.itemId,
          name: record.itemName,
          reason: !record.dispatchSkuSettingId
            ? "No effective dispatch SKU setting."
            : "No packaging profile resolved.",
        });
      }
    });
    return [...map.values()];
  }, [allRecords]);
  const configurationConflict = /setting|packaging|configuration/i.test(
    conflict,
  );
  const activeFilterCount = [
    Boolean(filters.Search.trim()),
    Boolean(filters.WarehouseId),
    Boolean(filters.ItemId),
    Boolean(filters.Tier),
    filters.AllocatedOnly,
  ].filter(Boolean).length;
  const snapshots = Array.isArray(run?.companyStockSnapshots)
    ? run.companyStockSnapshots
    : [];

  if (notFound) {
    return (
      <section className="space-y-5">
        <PageHeader
          description="The requested planning run may have been removed or is no longer available."
          title="Planning run not found"
        />
        <SupplyChainInlineError message="This planning run could not be found." />
        <AppButton variant="secondary" onClick={() => navigate("/dispatch/runs")}>
          <ArrowLeft className="h-4 w-4" />
          Back to planning runs
        </AppButton>
      </section>
    );
  }

  const primaryAction =
    status === DISPATCH_RUN_STATUS.Draft
      ? actions.calculate
        ? (
            <AppButton
              isLoading={mutation === "calculate"}
              loadingText="Calculating…"
              onClick={() => void calculate()}
            >
              <Calculator className="h-4 w-4" />
              Calculate
            </AppButton>
          )
        : (
            <DisabledDispatchAction reason={actions.reasons.calculate}>
              <AppButton disabled>
                <Calculator className="h-4 w-4" />
                Calculate
              </AppButton>
            </DisabledDispatchAction>
          )
      : status === DISPATCH_RUN_STATUS.Calculated
        ? actions.allocate
          ? (
              <AppButton onClick={() => setAllocateOpen(true)}>
                <Boxes className="h-4 w-4" />
                Allocate
              </AppButton>
            )
          : (
              <DisabledDispatchAction reason={actions.reasons.allocate}>
                <AppButton disabled>
                  <Boxes className="h-4 w-4" />
                  Allocate
                </AppButton>
              </DisabledDispatchAction>
            )
        : status === DISPATCH_RUN_STATUS.Allocated
          ? actions.finalize
            ? (
                <AppButton onClick={() => setFinalizeOpen(true)}>
                  <Send className="h-4 w-4" />
                  Finalize
                </AppButton>
              )
            : (
                <DisabledDispatchAction reason={actions.reasons.finalize}>
                  <AppButton disabled>
                    <Send className="h-4 w-4" />
                    Finalize
                  </AppButton>
                </DisabledDispatchAction>
              )
          : null;

  return (
    <section className="min-w-0 space-y-5">
      <PageHeader
        badge="Dispatch Planning"
        description="Review the server calculation, override before allocation, then finalize an immutable recommendation."
        title={loading ? "Planning run" : run?.runNumber || "Planning run"}
        actions={
          <>
            {loading ? (
              <DisabledDispatchAction reason="Wait for the current refresh to finish.">
                <AppButton disabled variant="secondary">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Refresh
                </AppButton>
              </DisabledDispatchAction>
            ) : (
              <AppButton variant="secondary" onClick={() => void loadAll()}>
                <RefreshCw className="h-4 w-4" />
                Refresh
              </AppButton>
            )}
            {status !== DISPATCH_RUN_STATUS.Cancelled
              ? recommendations.length === 0
                ? (
                    <DisabledDispatchAction reason="There are no recommendation rows in the current view to export.">
                      <AppButton disabled variant="secondary">
                        <Download className="h-4 w-4" />
                        Export
                      </AppButton>
                    </DisabledDispatchAction>
                  )
                : (
                    <AppButton
                      variant="secondary"
                      onClick={() =>
                        void downloadCsv({
                          columns: [
                            { key: "itemCode", label: "Item code" },
                            { key: "itemName", label: "Item name" },
                            { key: "warehouseCode", label: "Warehouse code" },
                            { key: "channelSku", label: "Channel SKU" },
                            {
                              key: "calculatedRecommendationQuantity",
                              label: "Calculated recommendation",
                            },
                            {
                              key: "finalRecommendationQuantity",
                              label: "Final recommendation",
                            },
                            { key: "allocatedQuantity", label: "Allocated" },
                            { key: "boxCount", label: "Boxes" },
                            { key: "overrideReason", label: "Override reason" },
                          ],
                          filename: `${run?.runNumber || "dispatch-run"}-recommendations.csv`,
                          rows: recommendations,
                        })
                      }
                    >
                      <Download className="h-4 w-4" />
                      Export
                    </AppButton>
                  )
              : null}
            {!actions.immutable && actions.cancel ? (
              <AppButton variant="danger" onClick={() => setCancelOpen(true)}>
                <Ban className="h-4 w-4" />
                Cancel
              </AppButton>
            ) : null}
            {primaryAction}
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <AppButton
          className="h-8 px-3"
          variant="ghost"
          onClick={() => navigate("/dispatch/runs")}
        >
          <ArrowLeft className="h-4 w-4" />
          Planning runs
        </AppButton>
        {run ? <DispatchRunStatusPill status={run.status} /> : null}
        <span className="text-xs text-slate-500">
          {run?.channelCode || "—"} · {formatDispatchDate(run?.planningDate)}
        </span>
        <span className="text-xs text-slate-500">
          Calculation version {run?.calculationVersion || "—"}
        </span>
        {run?.notes ? (
          <span className="min-w-0 flex-1 truncate text-xs text-slate-500">
            Notes: {run.notes}
          </span>
        ) : null}
      </div>

      <StageStrip status={run?.status} />

      <StatCards
        loading={loading}
        cards={[
          { icon: List, label: "Recommendation lines", value: run?.lineCount },
          {
            icon: Calculator,
            label: "Recommended quantity",
            value: run?.totalRecommendedQuantity,
            formatValue: formatDispatchNumber,
          },
          {
            icon: Boxes,
            label: "Allocated quantity",
            value: run?.totalAllocatedQuantity,
            formatValue: formatDispatchNumber,
          },
          {
            icon: TableProperties,
            label: "Company stock items",
            value: snapshots.length,
          },
        ]}
      />

      <SupplyChainInlineError
        message={error}
        title="Planning run unavailable"
        onRetry={loadAll}
      />
      <SupplyChainInlineError
        message={conflict}
        title="Dispatch lifecycle conflict"
        onRetry={loadAll}
      />

      {blockingItems.length > 0 ||
      incompleteItems.length > 0 ||
      configurationConflict ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold">
                Settings or packaging need attention
              </p>
              <p className="mt-1 text-xs leading-5">
                Dispatch calculation intentionally requires an effective SKU
                policy and resolved packaging. Fix these items, then calculate
                again.
              </p>
              <ul className="mt-2 space-y-1 text-xs">
                {[...blockingItems, ...incompleteItems]
                  .filter(
                    (item, index, collection) =>
                      collection.findIndex(
                        (candidate) =>
                          String(candidate.id || candidate.code) ===
                          String(item.id || item.code),
                      ) === index,
                  )
                  .map((item) => (
                    <li key={item.id || item.code}>
                      <span className="font-semibold">
                        {item.code || item.name || `Item ${item.id}`}
                      </span>
                      {" — "}
                      {item.reason}
                    </li>
                  ))}
              </ul>
              {blockingItems.length === 0 && incompleteItems.length === 0 ? (
                <p className="mt-2 text-xs">
                  The API did not return affected item identifiers. Open SKU
                  Settings to review active policy and packaging coverage.
                </p>
              ) : null}
              <Link
                className="mt-3 inline-flex font-semibold text-brand hover:underline"
                to="/dispatch/settings"
              >
                Fix in SKU Settings
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      {status !== DISPATCH_RUN_STATUS.Draft ? (
        <>
          <SupplyChainFilterBar
            activeFilterCount={activeFilterCount}
            onClear={() => {
              setFilterItem(null);
              setFilters({
                AllocatedOnly: false,
                ItemId: "",
                Search: "",
                Tier: "",
                WarehouseId: "",
              });
            }}
          >
            <AppInput
              className="min-w-56 flex-1"
              label="Search"
              placeholder="Item, warehouse or channel SKU"
              value={filters.Search}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  Search: event.target.value,
                }))
              }
            />
            <AppSelect
              className="w-56"
              label="Warehouse"
              options={[
                { label: "All warehouses", value: "" },
                ...warehouseOptions,
              ]}
              value={filters.WarehouseId}
              onChange={(value) =>
                setFilters((current) => ({
                  ...current,
                  WarehouseId: value,
                }))
              }
            />
            <div className="min-w-60">
              <ProcurementItemAutocomplete
                label="Item"
                value={filterItem}
                onChange={(item) => {
                  setFilterItem(item);
                  setFilters((current) => ({
                    ...current,
                    ItemId: getItemId(item),
                  }));
                }}
              />
            </div>
            <AppSelect
              className="w-36"
              label="Tier"
              options={[
                { label: "All tiers", value: "" },
                ...toDispatchOptions(DISPATCH_TIER_LABELS),
              ]}
              value={filters.Tier}
              onChange={(value) =>
                setFilters((current) => ({ ...current, Tier: value }))
              }
            />
            <label className="flex h-10 items-center gap-2 self-end rounded-lg border border-slate-200 px-3 text-sm text-slate-700">
              <input
                checked={filters.AllocatedOnly}
                className="h-4 w-4 rounded border-slate-300 accent-brand"
                type="checkbox"
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    AllocatedOnly: event.target.checked,
                  }))
                }
              />
              Allocated only
            </label>
            <div className="ml-auto flex self-end rounded-lg border border-slate-200 bg-slate-50 p-1">
              <button
                className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-medium ${view === "matrix" ? "bg-white text-brand shadow-sm" : "text-slate-500"}`}
                type="button"
                onClick={() => setView("matrix")}
              >
                <TableProperties className="h-3.5 w-3.5" />
                Matrix
              </button>
              <button
                className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-medium ${view === "flat" ? "bg-white text-brand shadow-sm" : "text-slate-500"}`}
                type="button"
                onClick={() => setView("flat")}
              >
                <List className="h-3.5 w-3.5" />
                Flat
              </button>
            </div>
          </SupplyChainFilterBar>

          <DispatchRecommendationMatrix
            canOverride={status === DISPATCH_RUN_STATUS.Calculated && actions.override}
            loading={recommendationsLoading}
            recommendations={recommendations}
            view={view}
            onOverride={setOverrideTarget}
          />
        </>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-10 text-center shadow-sm">
          <Calculator className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-900">
            Calculate this draft to create recommendations
          </p>
          <p className="mt-1 text-xs text-slate-500">
            The server will apply effective settings, packaging precedence and
            eligible inbound rules.
          </p>
        </div>
      )}

      {status === DISPATCH_RUN_STATUS.Allocated ||
      status === DISPATCH_RUN_STATUS.Finalized ? (
        <CompanyStockSnapshots snapshots={snapshots} />
      ) : null}

      <OverrideModal
        recommendation={overrideTarget}
        runId={id}
        onClose={() => setOverrideTarget(null)}
        onSaved={refreshAfterMutation}
      />
      <AllocationModal
        isOpen={allocateOpen}
        runId={id}
        onClose={() => setAllocateOpen(false)}
        onSaved={allocateDone}
      />
      <FinalizeModal
        isOpen={finalizeOpen}
        loading={mutation === "finalize"}
        onClose={() => setFinalizeOpen(false)}
        onConfirm={() => void finalize()}
      />
      <ReasonModal
        confirmLabel="Cancel run"
        description="Cancellation is an auditable lifecycle action. It does not delete snapshots or move stock."
        isOpen={cancelOpen}
        loading={mutation === "cancel"}
        title="Cancel planning run"
        onClose={() => setCancelOpen(false)}
        onConfirm={cancel}
      />

      {run ? (
        <p className="text-[11px] text-slate-400">
          Created {formatDispatchDateTime(run.createdAtUtc)}
          {run.createdBy ? ` by ${run.createdBy}` : ""}. Finalize records an
          immutable recommendation only.
        </p>
      ) : null}
    </section>
  );
};

export default DispatchRunDetailPage;
