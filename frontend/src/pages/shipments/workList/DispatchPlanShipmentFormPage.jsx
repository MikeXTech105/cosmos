import { ArrowLeft, Save } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  const capabilities = useShipmentCapabilities();
  const [form, setForm] = useState(emptyDispatchForm);
  const [runs, setRuns] = useState([]);
  const [run, setRun] = useState(null);
  const [transporters, setTransporters] = useState([]);
  const [errors, setErrors] = useState({});
  const [conflict, setConflict] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadRuns = useCallback(async () => {
    setLoading(true);
    try {
      const response = await dispatchRunService.list({ PageNumber: 1, PageSize: 200, Status: DISPATCH_RUN_STATUS.Finalized });

      setRuns(getItems(response));
      setErrors((current) => ({ ...current, runs: "" }));
    } catch (error) {
      setRuns([]);
      setErrors((current) => ({ ...current, runs: getApiErrorMessage(error, "Unable to load finalized dispatch runs.") }));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRuns();

    void shipmentTransporterService
      .list()
      .then((response) => setTransporters(Array.isArray(response.data) ? response.data : getItems(response)))
      .catch(() => setTransporters([]));
  }, [loadRuns]);

  const selectRun = async (value) => {
    setForm((current) => ({ ...current, allocations: [], dispatchPlanningRunId: value, warehouseId: "" }));
    setRun(null);
    setErrors((current) => ({ ...current, dispatchPlanningRunId: "", run: "" }));
    if (!value) return;

    setLoading(true);
    try {
      const response = await dispatchRunService.getById(value);
      const detail = response.data;

      if (detail?.status !== DISPATCH_RUN_STATUS.Finalized) {
        throw new Error("Only finalized dispatch runs can create shipments.");
      }

      setRun(detail);
    } catch (error) {
      setErrors((current) => ({ ...current, run: getApiErrorMessage(error, "Unable to load this dispatch run.") }));
    } finally {
      setLoading(false);
    }
  };

  const recommendations = Array.isArray(run?.recommendations) ? run.recommendations : [];
  const warehouseOptions = Array.from(
    new Map(
      recommendations.map((recommendation) => [
        String(recommendation.warehouseId),
        { label: `${recommendation.warehouseCode} — ${recommendation.warehouseName}`, value: recommendation.warehouseId },
      ]),
    ).values(),
  );
  const allocations = recommendations.filter(
    (recommendation) => String(recommendation.warehouseId) === String(form.warehouseId) && Number(recommendation.allocatedQuantity) > 0,
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
            // BACKEND: The finalized Dispatch DTO publishes recommendation.id,
            // while Shipment Operations names this foreign key
            // dispatchPlanningAllocationId. The integration contract provides
            // no separate allocation-list endpoint.
            dispatchPlanningAllocationId: recommendation.id,
            plannedQuantity: recommendation.allocatedQuantity,
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
              options={runs.map((item) => ({ label: `${item.runNumber} — ${item.channelCode}`, value: item.id }))}
              required
              value={form.dispatchPlanningRunId}
              onChange={(value) => void selectRun(value)}
            />
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
            disabled={saving}
            error={errors.transporterPartyId}
            label="Transporter"
            options={[
              { label: "Not assigned", value: "" },
              ...transporters.filter((party) => party.isTransporter).map((party) => ({ label: `${party.partyCode} — ${party.partyName}`, value: String(party.partyId) })),
            ]}
            value={form.transporterPartyId}
            onChange={(value) => setForm((current) => ({ ...current, transporterPartyId: String(value) }))}
          />
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
                        {recommendation.itemCode} · {recommendation.channelSku} · allocated {formatShipmentNumber(recommendation.allocatedQuantity, "0")}
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
