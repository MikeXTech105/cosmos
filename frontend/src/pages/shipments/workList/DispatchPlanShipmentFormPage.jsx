import { ArrowLeft, Save } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import AppButton from "../../../components/common/AppButton";
import AppInput from "../../../components/common/AppInput";
import AppSelect from "../../../components/common/AppSelect";
import PageHeader from "../../../components/common/PageHeader";
import { DISPATCH_RUN_STATUS } from "../../../constants/dispatchEnums";
import { dispatchRunService } from "../../../services/dispatch";
import { shipmentService, shipmentTransporterService } from "../../../services/shipments";
import { getApiErrorMessage, getApiFieldErrors, isConflictError } from "../../../utils/apiError";
import { SupplyChainInlineError } from "../../supplyChain/SupplyChainShared";
import { ShipmentConflict } from "../ShipmentShared";
import { formatShipmentNumber, getShipmentMutationMessage } from "../shipmentDisplay";
import { dispatchShipmentSchema, getShipmentSchemaErrors } from "../shipmentSchemas";
import useShipmentCapabilities from "../useShipmentCapabilities";
import { MasterDataNotice, NotesField } from "./ShipmentFormShared";
import { getItems, today } from "./shipmentFormUtils";

const emptyDispatchForm = () => ({
  allocations: [],
  dispatchPlanningRunId: "",
  expectedDeliveryDate: "",
  invoiceNumber: "",
  notes: "",
  shipmentDate: today(),
  stoNumber: "",
  transporterPartyId: "",
  warehouseId: "",
});

const DispatchPlanShipmentFormPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const capabilities = useShipmentCapabilities();
  const [form, setForm] = useState(emptyDispatchForm);
  const [runs, setRuns] = useState([]);
  const [run, setRun] = useState(null);
  const [transporters, setTransporters] = useState([]);
  const [errors, setErrors] = useState({});
  const [conflict, setConflict] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [runPage, setRunPage] = useState(1), [hasMoreRuns, setHasMoreRuns] = useState(false);
  const [availableAllocations, setAvailableAllocations] = useState([]);
  const [transporterState, setTransporterState] = useState({ loading: false, error: "" });
  const runRequest = useRef(0);

  const loadRuns = useCallback(async () => {
    setLoading(true);
    try {
      const response = await dispatchRunService.list({ PageNumber: runPage, PageSize: 40, Status: DISPATCH_RUN_STATUS.Finalized });

      setRuns(getItems(response));
      setHasMoreRuns(Number(response.data?.totalPages ?? 0) > runPage || (response.data?.totalPages == null && getItems(response).length === 40));
      setErrors((current) => ({ ...current, runs: "" }));
    } catch (error) {
      setRuns([]);
      setErrors((current) => ({ ...current, runs: getApiErrorMessage(error, "Unable to load finalized dispatch runs.") }));
    } finally {
      setLoading(false);
    }
  }, [runPage]);

  const loadTransporters = useCallback(async () => {
    setTransporterState({ loading: true, error: "" });
    try {
      const response = await shipmentTransporterService.list();
      setTransporters(Array.isArray(response.data) ? response.data : getItems(response));
      setTransporterState({ loading: false, error: "" });
    } catch (failure) {
      setTransporterState({ loading: false, error: getApiErrorMessage(failure, "Transporters could not be loaded. Check your access or retry.") });
    }
  }, []);

  useEffect(() => {
    void loadRuns();

    void loadTransporters();
  }, [loadRuns, loadTransporters]);

  const selectRun = async (value) => {
    const request = ++runRequest.current;
    setForm((current) => ({ ...current, allocations: [], dispatchPlanningRunId: value, warehouseId: "" }));
    setRun(null);
    setAvailableAllocations([]);
    setErrors((current) => ({ ...current, dispatchPlanningRunId: "", run: "" }));
    if (!value) return;

    setLoading(true);
    try {
      const [response, allocationResponse] = await Promise.all([dispatchRunService.getById(value), shipmentService.dispatchAllocations(value)]);
      if (request !== runRequest.current) return;
      const detail = response.data;

      if (detail?.status !== DISPATCH_RUN_STATUS.Finalized) {
        throw new Error("Only finalized dispatch runs can create shipments.");
      }

      setRun(detail);
      setAvailableAllocations(Array.isArray(allocationResponse.data) ? allocationResponse.data : []);
      const warehouseId = searchParams.get("warehouseId");
      if (warehouseId && allocationResponse.data?.some(row => String(row.warehouseId) === warehouseId)) setForm(current => ({ ...current, warehouseId }));
    } catch (error) {
      if (request !== runRequest.current) return;
      setErrors((current) => ({ ...current, run: getApiErrorMessage(error, "Unable to load this dispatch run.") }));
    } finally {
      if (request === runRequest.current) setLoading(false);
    }
  };

  useEffect(() => {
    const runId = searchParams.get("runId");
    if (runId) void selectRun(runId);
    // The verified linked source is loaded once; ordinary selection remains explicit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const recommendations = availableAllocations;
  const warehouseOptions = Array.from(
    new Map(
      recommendations.map((recommendation) => [
        String(recommendation.warehouseId),
        { label: `${recommendation.warehouseCode} — ${recommendation.warehouseName}`, value: recommendation.warehouseId },
      ]),
    ).values(),
  );
  const allocations = recommendations.filter(
    (recommendation) => String(recommendation.warehouseId) === String(form.warehouseId) && Number(recommendation.remainingQuantity) > 0,
  );

  const chooseWarehouse = (value) => {
    setForm((current) => ({ ...current, allocations: [], warehouseId: value }));
    setErrors((current) => ({ ...current, warehouseId: "", allocations: "" }));
  };

  const toggleAllocation = (recommendation, checked) => {
    setForm((current) => {
      const without = current.allocations.filter(
        (allocation) => String(allocation.dispatchPlanningAllocationId) !== String(recommendation.id),
      );

      if (!checked) return { ...current, allocations: without };

      return {
        ...current,
        allocations: [
          ...without,
          {
            dispatchPlanningAllocationId: recommendation.id,
            plannedQuantity: recommendation.remainingQuantity,
          },
        ],
      };
    });
  };

  const setAllocationQuantity = (id, value) => {
    setForm((current) => ({
      ...current,
      allocations: current.allocations.map((allocation) =>
        String(allocation.dispatchPlanningAllocationId) === String(id) ? { ...allocation, plannedQuantity: value } : allocation,
      ),
    }));
  };

  const saveDisabledReason = capabilities.canCreate ? "" : "You need create permission for shipments.";

  const submit = async () => {
    if (saveDisabledReason) {
      toast.error(saveDisabledReason);
      return;
    }

    const parsed = dispatchShipmentSchema.safeParse(form);

    if (!parsed.success) {
      setErrors(getShipmentSchemaErrors(parsed));
      return;
    }

    setSaving(true);
    setErrors({});
    setConflict(null);

    try {
      const response = await shipmentService.createFromDispatchPlan(parsed.data);
      const created = response.data;

      if (created?.id) {
        await shipmentService.getById(created.id);
      }

      toast.success(response.message || "Shipment created from dispatch plan.");
      navigate(created?.id ? `/shipments/work-list/${created.id}` : "/shipments/work-list");
    } catch (error) {
      const fieldErrors = getApiFieldErrors(error);
      const message = getShipmentMutationMessage(error, "Unable to create shipment from this dispatch run.");

      setErrors({ ...fieldErrors, form: Object.keys(fieldErrors).length > 0 ? "" : message });
      if (isConflictError(error)) setConflict(error);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-6">
      <PageHeader
        badge="Shipment Operations"
        title="Create from dispatch plan"
        description="Create a shipment from a finalized dispatch run's allocations. This does not reserve or move stock."
        actions={
          <>
            <AppButton variant="secondary" onClick={() => navigate("/shipments/work-list")}>
              <ArrowLeft className="h-4 w-4" /> Back
            </AppButton>
            <AppButton isLoading={saving} loadingText="Creating…" disabled={Boolean(saveDisabledReason)} title={saveDisabledReason || undefined} onClick={submit}>
              <Save className="h-4 w-4" /> Create shipment
            </AppButton>
          </>
        }
      />

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="xl:col-span-2">
            <AppSelect
              disabled={loading || saving}
              error={errors.dispatchPlanningRunId || errors.runs}
              label="Finalized dispatch run"
              options={[...new Map([...(run ? [run] : []), ...runs].map(item => [String(item.id), item])).values()].map((item) => ({ label: `${item.runNumber} — ${item.channelCode}`, value: item.id }))}
              required
              value={form.dispatchPlanningRunId}
              onChange={(value) => void selectRun(value)}
            />
            <div className="mt-2 flex items-center gap-3 text-xs"><AppButton variant="secondary" disabled={loading || runPage <= 1} onClick={() => setRunPage(page => page - 1)}>Previous runs</AppButton><span>Page {runPage}</span><AppButton variant="secondary" disabled={loading || !hasMoreRuns} onClick={() => setRunPage(page => page + 1)}>More runs</AppButton></div>
          </div>
          <AppSelect disabled={!run || loading || saving} error={errors.warehouseId} label="Warehouse" options={warehouseOptions} required value={form.warehouseId} onChange={chooseWarehouse} />
          <AppInput
            disabled={saving}
            error={errors.shipmentDate}
            label="Shipment date"
            required
            type="date"
            value={form.shipmentDate}
            onChange={(event) => setForm((current) => ({ ...current, shipmentDate: event.target.value }))}
          />
          <AppInput
            disabled={saving}
            error={errors.expectedDeliveryDate}
            label="Expected delivery"
            min={form.shipmentDate}
            type="date"
            value={form.expectedDeliveryDate}
            onChange={(event) => setForm((current) => ({ ...current, expectedDeliveryDate: event.target.value }))}
          />
          <AppSelect
            disabled={saving || transporterState.loading || Boolean(transporterState.error)}
            error={errors.transporterPartyId || transporterState.error}
            label="Transporter"
            options={[
              { label: "Not assigned", value: "" },
              ...transporters.filter((party) => party.isTransporter).map((party) => ({ label: `${party.partyCode} — ${party.partyName}`, value: String(party.partyId) })),
            ]}
            value={form.transporterPartyId}
            onChange={(value) => setForm((current) => ({ ...current, transporterPartyId: String(value) }))}
          />
          {transporterState.error ? <AppButton variant="secondary" disabled={transporterState.loading} onClick={loadTransporters}>Retry transporters</AppButton> : !transporterState.loading && transporters.length === 0 ? <Link className="text-sm text-brand" to="/shipments/transporters">Assign the Transporter role to an existing Party</Link> : null}
          <AppInput
            disabled={saving}
            error={errors.invoiceNumber}
            label="Invoice number"
            value={form.invoiceNumber}
            onChange={(event) => setForm((current) => ({ ...current, invoiceNumber: event.target.value }))}
          />
          <AppInput
            disabled={saving}
            error={errors.stoNumber}
            label="STO number"
            value={form.stoNumber}
            onChange={(event) => setForm((current) => ({ ...current, stoNumber: event.target.value }))}
          />
        </div>

        <div className="mt-5 rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-900">Finalized allocations</h3>
            <p className="mt-0.5 text-xs text-slate-500">Select operational allocations. The server is the authority on whether any quantity has already been consumed.</p>
          </div>
          {!form.warehouseId ? (
            <p className="px-4 py-8 text-center text-sm text-slate-500">Select a finalized run and warehouse.</p>
          ) : allocations.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-slate-500">This warehouse has no positive finalized allocations.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {allocations.map((recommendation) => {
                const selected = form.allocations.find(
                  (allocation) => String(allocation.dispatchPlanningAllocationId) === String(recommendation.id),
                );

                return (
                  <div className="grid gap-3 px-4 py-3 md:grid-cols-[auto_minmax(0,1fr)_180px]" key={recommendation.id}>
                    <label className="flex items-center">
                      <input
                        checked={Boolean(selected)}
                        className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand/20"
                        disabled={saving}
                        type="checkbox"
                        onChange={(event) => toggleAllocation(recommendation, event.target.checked)}
                      />
                    </label>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{recommendation.itemName}</p>
                      <p className="text-xs text-slate-500">
                        {recommendation.itemCode} · {recommendation.channelSku} · remaining {formatShipmentNumber(recommendation.remainingQuantity, "0")} of {formatShipmentNumber(recommendation.allocatedQuantity, "0")} · already in shipments {formatShipmentNumber(recommendation.convertedQuantity, "0")}
                      </p>
                    </div>
                    <AppInput
                      disabled={!selected || saving}
                      error={errors[`allocations.${form.allocations.indexOf(selected)}.plannedQuantity`]}
                      label="Planned quantity"
                      min="0"
                      required={selected}
                      step="any"
                      type="number"
                      value={selected?.plannedQuantity ?? ""}
                      onChange={(event) => setAllocationQuantity(recommendation.id, event.target.value)}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-4">
          <NotesField disabled={saving} error={errors.notes} id="dispatch-shipment-notes" label="Notes" value={form.notes} onChange={(value) => setForm((current) => ({ ...current, notes: value }))} />
        </div>
        <div className="mt-4">
          <MasterDataNotice>
            Creating from a finalized dispatch plan does not reserve or move stock. If another shipment consumed an allocation, refresh and resolve the server conflict.
          </MasterDataNotice>
        </div>
        <div className="mt-4">
          <SupplyChainInlineError message={errors.run || errors.form} title="Cannot create shipment" />
        </div>
        <div className="mt-4">
          <ShipmentConflict error={conflict} onRefresh={() => { setConflict(null); void selectRun(form.dispatchPlanningRunId); }} />
        </div>
      </section>

      <div className="sticky bottom-4 flex flex-col-reverse gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-lg sm:flex-row sm:justify-end">
        <AppButton disabled={saving} variant="secondary" onClick={() => navigate("/shipments/work-list")}>
          Cancel
        </AppButton>
        <AppButton isLoading={saving} loadingText="Creating…" disabled={Boolean(saveDisabledReason)} title={saveDisabledReason || undefined} onClick={submit}>
          Create shipment
        </AppButton>
      </div>
    </section>
  );
};

export default DispatchPlanShipmentFormPage;
