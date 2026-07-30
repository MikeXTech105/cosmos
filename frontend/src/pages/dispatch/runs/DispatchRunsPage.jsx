import {
  Ban,
  Boxes,
  Calculator,
  ClipboardList,
  Download,
  Eye,
  Flag,
  Plus,
  RefreshCw,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import AppButton from "../../../components/common/AppButton";
import AppInput from "../../../components/common/AppInput";
import AppModal from "../../../components/common/AppModal";
import AppSelect from "../../../components/common/AppSelect";
import AppTooltip from "../../../components/common/AppTooltip";
import DataTableShell, {
  DATA_TABLE_HEADER_CLASS,
  DATA_TABLE_ROW_ACTION_CLASS,
  DATA_TABLE_ROW_ACTION_DANGER_CLASS,
} from "../../../components/common/DataTableShell";
import PageHeader from "../../../components/common/PageHeader";
import StatCards from "../../../components/common/StatCards";
import {
  DISPATCH_COMPANY_STOCK_SOURCE_TYPE,
  DISPATCH_IMPORT_STATUS,
  DISPATCH_IMPORT_TYPES,
  DISPATCH_RUN_STATUS,
  DISPATCH_RUN_STATUS_LABELS,
  toDispatchOptions,
} from "../../../constants/dispatchEnums";
import {
  dispatchImportService,
  dispatchRunService,
} from "../../../services/dispatch";
import {
  fetchDispatchRuns,
  setRunFilters,
  setRunPage,
  setRunPageSize,
} from "../../../store/slices/dispatch/runSlice";
import {
  getApiFieldErrors,
  getApiStatus,
} from "../../../utils/apiError";
import { downloadCsv } from "../../../utils/csv";
import { getRunActions } from "../../../utils/dispatchRunLifecycle";
import { formatDateInput } from "../../../utils/format";
import {
  SupplyChainFilterBar,
  SupplyChainInlineError,
  SupplyChainPagination,
} from "../../supplyChain/SupplyChainShared";
import useSupplyChainChannels from "../../supplyChain/useSupplyChainChannels";
import {
  DisabledDispatchAction,
  DispatchRunStatusPill,
} from "../DispatchShared";
import {
  formatDispatchDate,
  formatDispatchDateTime,
  formatDispatchNumber,
  getDispatchError,
} from "../dispatchDisplay";
import {
  dispatchRunSchema,
  getDispatchSchemaErrors,
} from "../dispatchSchemas";
import useDispatchCapabilities from "../useDispatchCapabilities";

const today = () => {
  return formatDateInput(new Date());
};

const emptyRun = () => ({
  channelId: "",
  notes: "",
  planningDate: today(),
  salesImportBatchId: "",
  warehouseInboundImportBatchId: "",
  warehouseStockImportBatchId: "",
});

const getBatchLabel = (batch) =>
  `${batch.originalFileName || `Batch ${batch.id}`} · ${formatDispatchDateTime(batch.committedAtUtc || batch.uploadedAtUtc)}`;

const NewRunModal = ({ channels, isOpen, onClose, onCreated }) => {
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyRun);
  const [errors, setErrors] = useState({});
  const [batches, setBatches] = useState({
    inbound: [],
    sales: [],
    stock: [],
  });
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return undefined;
    const timeout = window.setTimeout(() => {
      setForm(emptyRun());
      setErrors({});
      setBatches({ inbound: [], sales: [], stock: [] });
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !form.channelId) return undefined;
    let current = true;
    const timeout = window.setTimeout(async () => {
      setLoadingBatches(true);
      setErrors((existing) => ({ ...existing, batches: "" }));
      const base = {
        ChannelId: form.channelId,
        PageNumber: 1,
        PageSize: 200,
        Status: DISPATCH_IMPORT_STATUS.Committed,
      };
      try {
        const [sales, stock, inbound] = await Promise.all([
          dispatchImportService.list({
            ...base,
            ImportType: DISPATCH_IMPORT_TYPES.Sales,
          }),
          dispatchImportService.list({
            ...base,
            ImportType: DISPATCH_IMPORT_TYPES.WarehouseStock,
          }),
          dispatchImportService.list({
            ...base,
            ImportType: DISPATCH_IMPORT_TYPES.Inbound,
          }),
        ]);
        if (current) {
          setBatches({
            inbound: Array.isArray(inbound.data?.items)
              ? inbound.data.items
              : [],
            sales: Array.isArray(sales.data?.items) ? sales.data.items : [],
            stock: Array.isArray(stock.data?.items) ? stock.data.items : [],
          });
        }
      } catch (error) {
        if (current) {
          setBatches({ inbound: [], sales: [], stock: [] });
          setErrors((existing) => ({
            ...existing,
            batches: getDispatchError(
              error,
              "Unable to load committed import batches.",
            ),
          }));
        }
      } finally {
        if (current) setLoadingBatches(false);
      }
    }, 150);
    return () => {
      current = false;
      window.clearTimeout(timeout);
    };
  }, [form.channelId, isOpen]);

  const setField = (field, value) => {
    setForm((current) => {
      if (field !== "channelId") return { ...current, [field]: value };
      return {
        ...current,
        channelId: value,
        salesImportBatchId: "",
        warehouseInboundImportBatchId: "",
        warehouseStockImportBatchId: "",
      };
    });
    setErrors((current) => ({ ...current, [field]: "", form: "" }));
  };
  const missingSales = Boolean(form.channelId) && !loadingBatches && batches.sales.length === 0;
  const missingStock = Boolean(form.channelId) && !loadingBatches && batches.stock.length === 0;
  const blocked = missingSales || missingStock || Boolean(errors.batches);

  const submit = async () => {
    const parsed = dispatchRunSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(getDispatchSchemaErrors(parsed));
      return;
    }
    if (blocked) {
      setErrors((current) => ({
        ...current,
        form: "Committed Sales and Warehouse stock batches are required.",
      }));
      return;
    }

    setSaving(true);
    setErrors({});
    try {
      const response = await dispatchRunService.create({
        ...parsed.data,
        companyStockSourceType:
          DISPATCH_COMPANY_STOCK_SOURCE_TYPE.SystemCompanyStock,
      });
      const created = response.data;
      toast.success(response.message || "Dispatch planning run created.");
      await onCreated();
      onClose();
      if (created?.id) navigate(`/dispatch/runs/${created.id}`);
    } catch (error) {
      const fields = getApiFieldErrors(error);
      const message = getDispatchError(
        error,
        "Unable to create the planning run.",
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

  const batchOptions = (records, optional = false) => [
    ...(optional ? [{ label: "No inbound batch", value: "" }] : []),
    ...records.map((batch) => ({
      label: getBatchLabel(batch),
      value: batch.id,
    })),
  ];

  return (
    <AppModal
      isBusy={saving}
      isOpen={isOpen}
      maxWidth="max-w-3xl"
      title="New dispatch planning run"
      onClose={saving ? undefined : onClose}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <AppSelect
          disabled={saving}
          error={errors.channelId}
          label="Channel"
          options={channels.map((channel) => ({
            label: `${channel.code} — ${channel.name}`,
            value: channel.id,
          }))}
          placeholder="Select a channel"
          required
          value={form.channelId}
          onChange={(value) => setField("channelId", value)}
        />
        <AppInput
          disabled={saving}
          error={errors.planningDate}
          label="Planning date"
          required
          type="date"
          value={form.planningDate}
          onChange={(event) => setField("planningDate", event.target.value)}
        />
        <AppSelect
          disabled={!form.channelId || loadingBatches || saving}
          emptyMessage="No committed Sales batches for this channel"
          error={errors.salesImportBatchId}
          label="Sales batch"
          options={batchOptions(batches.sales)}
          placeholder={loadingBatches ? "Loading batches…" : "Select Sales batch"}
          required
          value={form.salesImportBatchId}
          onChange={(value) => setField("salesImportBatchId", value)}
        />
        <AppSelect
          disabled={!form.channelId || loadingBatches || saving}
          emptyMessage="No committed Warehouse stock batches for this channel"
          error={errors.warehouseStockImportBatchId}
          label="Warehouse stock batch"
          options={batchOptions(batches.stock)}
          placeholder={
            loadingBatches ? "Loading batches…" : "Select Warehouse stock batch"
          }
          required
          value={form.warehouseStockImportBatchId}
          onChange={(value) => setField("warehouseStockImportBatchId", value)}
        />
        <div className="sm:col-span-2">
          <AppSelect
            disabled={!form.channelId || loadingBatches || saving}
            emptyMessage="No committed Inbound batches for this channel"
            error={errors.warehouseInboundImportBatchId}
            label="Inbound batch (optional)"
            options={batchOptions(batches.inbound, true)}
            value={form.warehouseInboundImportBatchId}
            onChange={(value) =>
              setField("warehouseInboundImportBatchId", value)
            }
          />
        </div>
        <div className="sm:col-span-2">
          <label
            className="mb-1.5 block text-[13px] font-medium text-slate-700"
            htmlFor="dispatch-run-notes"
          >
            Notes
          </label>
          <textarea
            className="min-h-24 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
            disabled={saving}
            title={saving ? "The planning run is already saving" : undefined}
            id="dispatch-run-notes"
            value={form.notes}
            onChange={(event) => setField("notes", event.target.value)}
          />
          {errors.notes ? (
            <p className="mt-1 text-xs text-red-600">{errors.notes}</p>
          ) : null}
        </div>
      </div>
      {missingSales || missingStock ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p className="font-semibold">Committed snapshots are missing</p>
          <p className="mt-1 text-xs leading-5">
            Import and commit{" "}
            {[missingSales ? "Sales" : "", missingStock ? "Warehouse stock" : ""]
              .filter(Boolean)
              .join(" and ")}{" "}
            for this channel before creating a run.{" "}
            <Link className="font-semibold text-brand hover:underline" to="/dispatch/imports">
              Open Imports
            </Link>
          </p>
        </div>
      ) : null}
      <div className="mt-4">
        <SupplyChainInlineError
          message={errors.batches || errors.form}
          title="Cannot create run"
        />
      </div>
      <p className="mt-4 text-xs leading-5 text-slate-500">
        Company stock is read from the system when the run is calculated. This
        creates a planning record only; it does not move stock.
      </p>
      <div className="mt-5 flex justify-end gap-2">
        <AppButton disabled={saving} variant="secondary" onClick={onClose}>
          Back
        </AppButton>
        {blocked ? (
          <DisabledDispatchAction reason="Committed Sales and Warehouse stock batches are required for the selected channel.">
            <AppButton disabled>Create run</AppButton>
          </DisabledDispatchAction>
        ) : (
          <AppButton
            isLoading={saving}
            loadingText="Creating…"
            onClick={submit}
          >
            Create run
          </AppButton>
        )}
      </div>
    </AppModal>
  );
};

const CancelRunModal = ({
  loading,
  onClose,
  onConfirm,
  requestError,
  run,
}) => {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!run) return undefined;
    const timeout = window.setTimeout(() => {
      setReason("");
      setError("");
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [run]);

  return (
    <AppModal
      isBusy={loading}
      isOpen={Boolean(run)}
      title="Cancel planning run"
      onClose={loading ? undefined : onClose}
    >
      <p className="text-sm leading-6 text-slate-600">
        Cancel {run?.runNumber || "this run"} as an auditable lifecycle action.
        It does not reverse or move stock.
      </p>
      <div className="mt-4">
        <label
          className="mb-1.5 block text-[13px] font-medium text-slate-700"
          htmlFor="dispatch-run-cancel-reason"
        >
          Cancellation reason <span className="text-red-500">*</span>
        </label>
        <textarea
          className="min-h-24 w-full rounded-lg border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
          disabled={loading}
          title={loading ? "The cancellation is already being submitted" : undefined}
          id="dispatch-run-cancel-reason"
          value={reason}
          onChange={(event) => {
            setReason(event.target.value);
            setError("");
          }}
        />
        {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
      </div>
      <div className="mt-4">
        <SupplyChainInlineError
          message={requestError}
          title="Cancellation conflict"
        />
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <AppButton disabled={loading} variant="secondary" onClick={onClose}>
          Back
        </AppButton>
        <AppButton
          isLoading={loading}
          loadingText="Cancelling…"
          variant="danger"
          onClick={() => {
            if (!reason.trim()) {
              setError("Cancellation reason is required.");
              return;
            }
            void onConfirm(reason.trim());
          }}
        >
          Cancel run
        </AppButton>
      </div>
    </AppModal>
  );
};

const DispatchRunsPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const state = useSelector((root) => root.dispatchRuns);
  const { channels, error: channelError } = useSupplyChainChannels();
  const [createOpen, setCreateOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelRequestError, setCancelRequestError] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const capabilities = useDispatchCapabilities({
    label: "DispatchPlanning.PlanningRuns",
    route: "/dispatch/runs",
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
    () => dispatch(fetchDispatchRuns(params)),
    [dispatch, params],
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 200);
    return () => window.clearTimeout(timeout);
  }, [load]);

  useEffect(() => {
    if (searchParams.get("new") !== "1" || !capabilities.canCreate) {
      return undefined;
    }
    const timeout = window.setTimeout(() => {
      setCreateOpen(true);
      setSearchParams({}, { replace: true });
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [capabilities.canCreate, searchParams, setSearchParams]);

  const cancelRun = async (reason) => {
    if (!cancelTarget) return;
    setCancelling(true);
    setCancelRequestError("");
    try {
      const response = await dispatchRunService.cancel(cancelTarget.id, reason);
      toast.success(response.message || "Planning run cancelled.");
      setCancelTarget(null);
      await load();
    } catch (error) {
      const message = getDispatchError(error, "Unable to cancel the run.");
      setCancelRequestError(message);
      toast.error(message);
      if (getApiStatus(error) === 409) await load();
    } finally {
      setCancelling(false);
    }
  };

  const pageCounts = state.list.reduce(
    (result, row) => {
      const status = getRunActions(row.status, capabilities).status;
      if (status === DISPATCH_RUN_STATUS.Draft) result.drafts += 1;
      if (
        status === DISPATCH_RUN_STATUS.Calculated ||
        status === DISPATCH_RUN_STATUS.Allocated
      ) {
        result.awaiting += 1;
      }
      if (status === DISPATCH_RUN_STATUS.Finalized) result.finalized += 1;
      return result;
    },
    { awaiting: 0, drafts: 0, finalized: 0 },
  );
  const summary = state.summary ?? {};
  const activeFilterCount = [
    Boolean(state.filters.ChannelId),
    Boolean(state.filters.Status),
    Boolean(state.filters.FromDate),
    Boolean(state.filters.ToDate),
  ].filter(Boolean).length;
  const setFilters = (patch) => dispatch(setRunFilters(patch));

  return (
    <section className="min-w-0 space-y-5">
      <PageHeader
        badge="Dispatch Planning"
        description="Create, calculate, allocate and finalize recommendations for marketplace warehouses."
        title="Planning runs"
        actions={
          <>
            {state.loading ? (
              <DisabledDispatchAction reason="Wait for the current refresh to finish.">
                <AppButton disabled variant="secondary">
                  <RefreshCw aria-hidden="true" className="h-4 w-4 animate-spin" />
                  Refresh
                </AppButton>
              </DisabledDispatchAction>
            ) : (
              <AppButton variant="secondary" onClick={() => void load()}>
                <RefreshCw aria-hidden="true" className="h-4 w-4" />
                Refresh
              </AppButton>
            )}
            {state.list.length === 0 ? (
              <DisabledDispatchAction reason="There are no runs on this page to export.">
                <AppButton disabled variant="secondary">
                  <Download aria-hidden="true" className="h-4 w-4" />
                  Export
                </AppButton>
              </DisabledDispatchAction>
            ) : (
              <AppButton
                variant="secondary"
                onClick={() =>
                  void downloadCsv({
                    columns: [
                      { key: "runNumber", label: "Run number" },
                      { key: "channelCode", label: "Channel" },
                      { key: "planningDate", label: "Planning date" },
                      { key: "status", label: "Status" },
                      { key: "lineCount", label: "Lines" },
                      {
                        key: "totalRecommendedQuantity",
                        label: "Recommended quantity",
                      },
                      {
                        key: "totalAllocatedQuantity",
                        label: "Allocated quantity",
                      },
                    ],
                    filename: "dispatch-planning-runs.csv",
                    rows: state.list,
                  })
                }
              >
                <Download aria-hidden="true" className="h-4 w-4" />
                Export
              </AppButton>
            )}
            {capabilities.canCreate ? (
              <AppButton onClick={() => setCreateOpen(true)}>
                <Plus aria-hidden="true" className="h-4 w-4" />
                New run
              </AppButton>
            ) : (
              <DisabledDispatchAction reason="Creating runs requires Planning Runs create permission.">
                <AppButton disabled>
                  <Plus aria-hidden="true" className="h-4 w-4" />
                  New run
                </AppButton>
              </DisabledDispatchAction>
            )}
          </>
        }
      />

      <StatCards
        loading={state.loading}
        cards={[
          {
            icon: ClipboardList,
            label: "Total runs",
            value: summary.totalRuns ?? state.totalCount,
          },
          {
            hint: summary.draftRuns == null ? "On this page" : undefined,
            icon: Calculator,
            label: "Drafts",
            value: summary.draftRuns ?? pageCounts.drafts,
          },
          {
            hint: summary.awaitingFinalize == null ? "On this page" : undefined,
            icon: Boxes,
            label: "Awaiting finalize",
            value: summary.awaitingFinalize ?? pageCounts.awaiting,
          },
          {
            hint: summary.finalizedRuns == null ? "On this page" : undefined,
            icon: Flag,
            label: "Finalized",
            value: summary.finalizedRuns ?? pageCounts.finalized,
          },
        ]}
      />

      <SupplyChainFilterBar
        activeFilterCount={activeFilterCount}
        onClear={() =>
          setFilters({
            ChannelId: "",
            FromDate: "",
            Status: "",
            ToDate: "",
          })
        }
      >
        <AppSelect
          className="w-56"
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
          options={[
            { label: "All statuses", value: "" },
            ...toDispatchOptions(DISPATCH_RUN_STATUS_LABELS),
          ]}
          value={state.filters.Status}
          onChange={(value) => setFilters({ Status: value })}
        />
        <AppInput
          className="w-44"
          label="From date"
          max={state.filters.ToDate || undefined}
          type="date"
          value={state.filters.FromDate}
          onChange={(event) => setFilters({ FromDate: event.target.value })}
        />
        <AppInput
          className="w-44"
          label="To date"
          min={state.filters.FromDate || undefined}
          type="date"
          value={state.filters.ToDate}
          onChange={(event) => setFilters({ ToDate: event.target.value })}
        />
      </SupplyChainFilterBar>

      <SupplyChainInlineError message={channelError} title="Channels unavailable" />
      <SupplyChainInlineError
        message={state.error}
        title="Planning runs unavailable"
        onRetry={load}
      />

      <DataTableShell
        colGroup={
          <colgroup>
            <col className="w-[56px]" />
            <col className="w-44" />
            <col className="w-32" />
            <col className="w-32" />
            <col className="w-32" />
            <col className="w-24" />
            <col className="w-36" />
            <col className="w-36" />
            <col className="w-44" />
            <col className="w-28" />
          </colgroup>
        }
        columnCount={10}
        mobileConfig={{
          actions: 9,
          fields: [2, 5, 6, 7],
          serial: 0,
          status: 4,
          subtitle: 3,
          title: 1,
        }}
        emptyAction={
          state.error ? (
            <AppButton variant="secondary" onClick={load}>Retry</AppButton>
          ) : activeFilterCount > 0 ? (
            <AppButton
              variant="secondary"
              onClick={() =>
                setFilters({
                  ChannelId: "",
                  FromDate: "",
                  Status: "",
                  ToDate: "",
                })
              }
            >
              Clear filters
            </AppButton>
          ) : capabilities.canCreate ? (
            <AppButton onClick={() => setCreateOpen(true)}>Create planning run</AppButton>
          ) : undefined
        }
        emptyContext="Planning runs turn committed sales and stock snapshots into reviewable warehouse recommendations."
        emptyHint={
          state.error
            ? "Check the connection and try loading the planning runs again."
            : activeFilterCount > 0
              ? "Clear the current filters to see other planning runs."
              : "Commit Sales and Warehouse stock snapshots, then create the first run."
        }
        emptyTitle={
          !state.loading && (state.error || state.list.length === 0)
            ? state.error
              ? "Couldn't load planning runs"
              : activeFilterCount > 0
                ? "No planning runs match these filters"
                : "No planning runs yet"
            : undefined
        }
        emptyVariant={state.error ? "error" : activeFilterCount > 0 ? "filtered" : "empty"}
        head={
          <>
            <th scope="col" aria-label="Row number" className={DATA_TABLE_HEADER_CLASS}><span aria-hidden="true">#</span></th>
            <th scope="col" className={DATA_TABLE_HEADER_CLASS}>Run no.</th>
            <th scope="col" className={DATA_TABLE_HEADER_CLASS}>Channel</th>
            <th scope="col" className={DATA_TABLE_HEADER_CLASS}>Planning date</th>
            <th scope="col" className={DATA_TABLE_HEADER_CLASS}>Status</th>
            <th scope="col" className={`${DATA_TABLE_HEADER_CLASS} text-right`}>Lines</th>
            <th scope="col" className={`${DATA_TABLE_HEADER_CLASS} text-right`}>Recommended qty</th>
            <th scope="col" className={`${DATA_TABLE_HEADER_CLASS} text-right`}>Allocated qty</th>
            <th scope="col" className={DATA_TABLE_HEADER_CLASS}>Created at</th>
            <th scope="col" className={`${DATA_TABLE_HEADER_CLASS} text-right`}>Actions</th>
          </>
        }
        loading={state.loading}
        minWidth="min-w-[1260px]"
      >
        {state.list.map((row, index) => {
          const actions = getRunActions(row.status, capabilities);
          return (
            <tr key={row.id}>
              <td className="text-xs font-semibold tabular-nums text-slate-500">
                {(state.pageNumber - 1) * state.pageSize + index + 1}
              </td>
              <td className="font-medium text-slate-900">{row.runNumber}</td>
              <td>{row.channelCode}</td>
              <td>{formatDispatchDate(row.planningDate)}</td>
              <td><DispatchRunStatusPill status={row.status} /></td>
              <td className="text-right tabular-nums">{formatDispatchNumber(row.lineCount, "0", 0)}</td>
              <td className="text-right tabular-nums">{formatDispatchNumber(row.totalRecommendedQuantity, "0")}</td>
              <td className="text-right tabular-nums">{formatDispatchNumber(row.totalAllocatedQuantity, "0")}</td>
              <td>{formatDispatchDateTime(row.createdAtUtc)}</td>
              <td>
                <div className="flex items-center justify-end gap-0.5">
                  <AppTooltip label="View run">
                    <button
                      aria-label="View run"
                      className={DATA_TABLE_ROW_ACTION_CLASS}
                      type="button"
                      onClick={() => navigate(`/dispatch/runs/${row.id}`)}
                    >
                      <Eye aria-hidden="true" className="h-4 w-4" />
                    </button>
                  </AppTooltip>
                  {actions.cancel ? (
                    <AppTooltip label="Cancel run">
                      <button
                        aria-label="Cancel run"
                        className={DATA_TABLE_ROW_ACTION_DANGER_CLASS}
                        type="button"
                        onClick={() => {
                          setCancelRequestError("");
                          setCancelTarget(row);
                        }}
                      >
                        <Ban aria-hidden="true" className="h-4 w-4" />
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
        disabled={state.loading}
        pageNumber={state.pageNumber}
        pageSize={state.pageSize}
        totalCount={state.totalCount}
        totalPages={state.totalPages}
        onPageChange={(value) => dispatch(setRunPage(value))}
        onPageSizeChange={(value) => dispatch(setRunPageSize(value))}
      />

      <NewRunModal
        channels={channels}
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={load}
      />
      <CancelRunModal
        loading={cancelling}
        requestError={cancelRequestError}
        run={cancelTarget}
        onClose={() => {
          setCancelRequestError("");
          setCancelTarget(null);
        }}
        onConfirm={cancelRun}
      />
    </section>
  );
};

export default DispatchRunsPage;
