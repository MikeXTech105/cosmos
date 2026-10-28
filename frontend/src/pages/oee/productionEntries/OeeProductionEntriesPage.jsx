import {
  AlertTriangle,
  CalendarDays,
  ClipboardList,
  Plus,
  RefreshCw,
  Save,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import AppButton from "../../../components/common/AppButton";
import {
  parseIsoDate,
  toIsoDate,
} from "../../../components/common/datePickerUtils";
import AppInput from "../../../components/common/AppInput";
import AppDateRangeFilter from "../../../components/common/AppDateRangeFilter";
import AppModal from "../../../components/common/AppModal";
import PageHeader from "../../../components/common/PageHeader";
import useCreatePermission from "../../../hooks/useCreatePermission";
import useUnsavedChanges from "../../../hooks/useUnsavedChanges";
import { oeeDowntimeReasonService } from "../../../services/oee/oeeDowntimeReasonService";
import { oeeMachineService } from "../../../services/oee/oeeMachineService";
import { oeeMouldService } from "../../../services/oee/oeeMouldService";
import {
  createOeeProductionEntriesBulk,
  deleteOeeProductionEntry,
  fetchOeeProductionEntryById,
  setOeeProductionEntryFilters,
  setOeeProductionEntryPage,
  setOeeProductionEntryPageSize,
  updateOeeProductionEntry,
} from "../../../store/slices/oee/oeeProductionEntrySlice";
import {
  buildOeeProductionQueryParams,
  extractOeeEntity,
  formatOeeDate,
  getOeeActionError,
  getOeeRecordId,
  getOeeSuccessMessage,
  getTodayInputValue,
} from "../oeeHelpers";
import { OeeConfirmDialog, OeeNumberInput } from "../OeeShared";
import useOeeCapabilities from "../useOeeCapabilities";
import { oeeProductionEntryService } from "../../../services/oee/oeeProductionEntryService";
import { loadDowntimeEntries } from "../dashboard/downtimeAnalysis";
import ProductionHistoryByDate from "./ProductionHistoryByDate";
import OeeStoppedDayPanel from "./OeeStoppedDayPanel";
import AppLookup from "../../../components/common/AppLookup";
import { lookupPage } from "../../../utils/lookupPage";

const getItems = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data?.items)) {
    return response.data.items;
  }

  if (Array.isArray(response?.data)) {
    return response.data;
  }

  return [];
};

const normalizeMachineOnTime = (value) => {
  const trimmed = String(value ?? "").trim();

  if (!trimmed) {
    return "";
  }

  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    return `${trimmed} HR`;
  }

  return trimmed;
};

const createRowsFromMachines = (machines, defaultDowntimeReasonId) => {
  return machines.map((machine) => ({
    id: String(getOeeRecordId(machine, "machine")),
    machineCode: machine.machineCode ?? "",
    machineId: getOeeRecordId(machine, "machine"),
    machineName: machine.machineName ?? "",
    isRunning: false,
    machineOnTime: "",
    mouldId: "",
    shotCount: "0",
    downtimeReasonId: defaultDowntimeReasonId,
    remarks: "",
  }));
};

const resourceServices = {
  machine: { list: oeeMachineService.getMachines, get: oeeMachineService.getMachineById, label: item => `${item.machineCode ?? ""} · ${item.machineName ?? ""}` },
  mould: { list: oeeMouldService.getMoulds, get: oeeMouldService.getMouldById, label: item => item.mouldName ?? "" },
  reason: { list: oeeDowntimeReasonService.getDowntimeReasons, get: oeeDowntimeReasonService.getDowntimeReasonById, label: item => item.reasonName ?? "" },
};
const ResourceLookup = ({ kind, ...props }) => {
  const service = resourceServices[kind];
  return <AppLookup {...props} getOptionValue={getOeeRecordId} getOptionLabel={service.label}
    loadPage={async ({ search, page, pageSize }) => lookupPage(await service.list({ IsActive: true, Search: search, Page: page, PageSize: pageSize }), page, pageSize)}
    loadById={async id => { const response = await service.get(id); return extractOeeEntity(response.data, kind === "reason" ? "downtimeReason" : kind); }} />;
};

const QuickCreateModal = ({ isOpen, isSaving, onClose, onSubmit, type }) => {
  const isMould = type === "mould";
  const [values, setValues] = useState({
    cavity: "",
    cycleTime: "",
    mouldName: "",
    reasonName: "",
    targetShotPerDay: "0",
  });

  const setValue = (name, value) => {
    if (isSaving) return;
    setValues((current) => ({ ...current, [name]: value }));
  };

  const submit = (event) => {
    event.preventDefault();
    onSubmit(values);
  };

  return (
    <AppModal
      isBusy={isSaving}
      isOpen={isOpen}
      maxWidth="max-w-xl"
      title={isMould ? "Create Mould" : "Create Downtime Reason"}
      onClose={isSaving ? undefined : onClose}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-light text-brand">
          {isMould ? (
            <Plus className="h-5 w-5" />
          ) : (
            <AlertTriangle className="h-5 w-5" />
          )}
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            {isMould ? "Create Mould" : "Create Downtime Reason"}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Add the missing lookup without leaving daily entry.
          </p>
        </div>
      </div>

      <form className="mt-6 space-y-5" onSubmit={submit}>
        <fieldset className="contents" disabled={isSaving}>
        {isMould ? (
          <div className="grid gap-4 md:grid-cols-2">
            <AppInput
              id="quickMouldName"
              label="Mould Name"
              required
              value={values.mouldName}
              onChange={(event) => setValue("mouldName", event.target.value)}
            />
            <OeeNumberInput
              id="quickTargetShot"
              label="Target Shots/Day"
              required
              value={values.targetShotPerDay}
              onChange={(value) => setValue("targetShotPerDay", value)}
            />
            <OeeNumberInput
              id="quickCavity"
              label="Cavity"
              allowDecimal={false}
              value={values.cavity}
              onChange={(value) => setValue("cavity", value)}
            />
            <OeeNumberInput
              id="quickCycleTime"
              label="Cycle Time"
              value={values.cycleTime}
              onChange={(value) => setValue("cycleTime", value)}
            />
          </div>
        ) : (
          <AppInput
            id="quickReasonName"
            label="Reason Name"
            required
            value={values.reasonName}
            onChange={(event) => setValue("reasonName", event.target.value)}
          />
        )}

        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
          <AppButton variant="secondary" disabled={isSaving} onClick={onClose}>
            Cancel
          </AppButton>
          <AppButton type="submit" isLoading={isSaving} loadingText="Saving…">
            Create
          </AppButton>
        </div>
        </fieldset>
      </form>
    </AppModal>
  );
};

const EditEntryModal = ({
  entry,
  isLoading,
  isOpen,
  lookups,
  onClose,
  onSubmit,
}) => {
  const [values, setValues] = useState(() => ({
    downtimeReasonId: entry?.downtimeReasonId ?? "",
    machineId: entry?.machineId ?? "",
    machineOnTime: entry?.machineOnTime ?? "",
    mouldId: entry?.mouldId ?? "",
    productionDate: entry?.productionDate?.slice(0, 10) ?? getTodayInputValue(),
    remarks: entry?.remarks ?? "",
    shotCount: String(entry?.shotCount ?? 0),
  }));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setValue = (name, value) => {
    if (isSubmitting) return;
    setValues((current) => ({ ...current, [name]: value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      await onSubmit({
        productionDate: values.productionDate,
        machineId: values.machineId,
        machineOnTime: normalizeMachineOnTime(values.machineOnTime),
        mouldId: values.mouldId,
        shotCount: Number(values.shotCount) || 0,
        downtimeReasonId: values.downtimeReasonId
          ? values.downtimeReasonId
          : null,
        remarks: values.remarks.trim(),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppModal
      isBusy={isSubmitting}
      isOpen={isOpen}
      maxWidth="max-w-3xl"
      title="Edit Production Entry"
      onClose={isSubmitting ? undefined : onClose}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-light text-brand">
          <ClipboardList className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Edit Production Entry
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Update the single production record and let the backend recalculate
            OEE.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {Array.from({ length: 6 }, (_, index) => (
            <div
              key={index}
              className="h-12 animate-pulse rounded-xl bg-slate-100"
            />
          ))}
        </div>
      ) : (
        <form className="mt-6 space-y-5" onSubmit={submit}>
        <fieldset className="contents" disabled={isSubmitting}>
          <div className="grid gap-4 md:grid-cols-2">
            <AppInput
              id="editProductionDate"
              label="Production Date"
              type="date"
              required
              value={values.productionDate}
              onChange={(event) =>
                setValue("productionDate", event.target.value)
              }
            />
            <ResourceLookup kind="machine"
              label="Machine"
              required
              value={values.machineId}
              onChange={(value) => setValue("machineId", value)}
              initialOptions={lookups.machines}
            />
            <AppInput
              id="editMachineOnTime"
              label="Machine On-Time"
              required
              value={values.machineOnTime}
              placeholder="12 HR"
              onChange={(event) =>
                setValue("machineOnTime", event.target.value)
              }
            />
            <ResourceLookup kind="mould"
              label="Mould"
              required
              value={values.mouldId}
              onChange={(value) => setValue("mouldId", value)}
              initialOptions={lookups.moulds}
            />
            <OeeNumberInput
              id="editShotCount"
              label="Shot Count"
              required
              allowDecimal={false}
              value={values.shotCount}
              onChange={(value) => setValue("shotCount", value)}
            />
            <ResourceLookup kind="reason"
              label="Downtime Reason"
              value={values.downtimeReasonId}
              onChange={(value) => setValue("downtimeReasonId", value)}
              initialOptions={lookups.reasons}
              placeholder="Select reason"
            />
          </div>

          <div>
            <label
              htmlFor="editRemarks"
              className="mb-1.5 block text-xs font-semibold text-slate-700"
            >
              Remarks
            </label>
            <textarea
              id="editRemarks"
              rows={3}
              value={values.remarks}
              onChange={(event) => setValue("remarks", event.target.value)}
              className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
            <AppButton
              variant="secondary"
              disabled={isSubmitting}
              onClick={onClose}
            >
              Cancel
            </AppButton>
            <AppButton
              type="submit"
              isLoading={isSubmitting}
              loadingText="Saving…"
            >
              Save Changes
            </AppButton>
          </div>
          </fieldset>
      </form>
      )}
    </AppModal>
  );
};

const OeeProductionEntriesPage = () => {
  const dispatch = useDispatch();
  const production = useSelector((state) => state.oeeProductionEntries);
  const capabilities = useOeeCapabilities({
    label: "OEE Production Entries",
    pageName: "OEE.ProductionEntries",
    resource: "oeeProductionEntries",
    route: "/oee/production-entries",
  });
  const canCreateMould = useCreatePermission({
    label: "Moulds",
    pageName: "OEE.Moulds",
    resource: "oeeMoulds",
    route: "/oee/moulds",
  });
  const canCreateDowntimeReason = useCreatePermission({
    label: "Downtime Reasons",
    pageName: "OEE.DowntimeReasons",
    resource: "oeeDowntimeReasons",
    route: "/oee/downtime-reasons",
  });
  const [searchParams] = useSearchParams();
  const [productionDate, setProductionDate] = useState(
    () =>
      toIsoDate(parseIsoDate(searchParams.get("date"))) || getTodayInputValue(),
  );
  const [lookups, setLookups] = useState({
    error: "",
    loading: false,
    machines: [],
    moulds: [],
    reasons: [],
  });
  const [rows, setRows] = useState([]);
  const [acknowledgementDirty, setAcknowledgementDirty] = useState(false);
  const dirtyReadings = rows.some(row => row.isRunning || row.machineOnTime || row.mouldId || row.remarks);
  const { confirmLeave } = useUnsavedChanges({ when: dirtyReadings || acknowledgementDirty, message: "Unsaved OEE readings or stopped-day notes will be discarded. Leave this work?" });
  const [machinePage, setMachinePage] = useState(1), [moreMachines, setMoreMachines] = useState(false), [machinesLoading, setMachinesLoading] = useState(false);
  const [rowErrors, setRowErrors] = useState({});
  const [quickCreate, setQuickCreate] = useState({
    isOpen: false,
    isSaving: false,
    rowId: null,
    type: null,
  });
  const [modal, setModal] = useState({
    entity: null,
    isLoading: false,
    isOpen: false,
  });
  const [confirmation, setConfirmation] = useState({
    entity: null,
    isLoading: false,
    isOpen: false,
  });

  const queryParams = useMemo(
    () =>
      buildOeeProductionQueryParams({
        filters: production.filters,
        pageNumber: 1,
        pageSize: 200,
      }),
    [production.filters],
  );

  const [historyRevision, setHistoryRevision] = useState(0);
  const [history, setHistory] = useState({ key: "", entries: [], error: "" });
  const historyKey = JSON.stringify([queryParams, historyRevision]);
  const historyLoading = history.key !== historyKey;
  const loadHistory = useCallback(
    () => setHistoryRevision((value) => value + 1),
    [],
  );

  const loadLookups = useCallback(async () => {
    setLookups((current) => ({ ...current, error: "", loading: true }));

    try {
      const [machines, moulds, reasons] = await Promise.all([
        oeeMachineService.getMachines({
          IsActive: true,
          PageSize: 40,
          SortBy: "displayOrder",
          SortDirection: "asc",
          Page: 1}),
        oeeMouldService.getMoulds({
          IsActive: true,
          PageSize: 40,
          SortBy: "mouldName",
          SortDirection: "asc",
          Page: 1}),
        oeeDowntimeReasonService.getDowntimeReasons({
          IsActive: true,
          PageSize: 40,
          SortBy: "reasonName",
          SortDirection: "asc",
          Page: 1}),
      ]);

      const nextMachines = getItems(machines);
      setMachinePage(1);
      setMoreMachines(lookupPage(machines, 1, 40).hasMore);
      const nextReasons = getItems(reasons);
      const noneReason = nextReasons.find(
        (reason) =>
          String(reason.reasonName ?? "")
            .trim()
            .toUpperCase() === "NONE",
      );
      const defaultDowntimeReasonId = noneReason
        ? getOeeRecordId(noneReason)
        : "";

      setLookups({
        error: "",
        loading: false,
        machines: nextMachines,
        moulds: getItems(moulds),
        reasons: nextReasons,
      });
      setRows((current) => {
        const existing = new Map(current.map((row) => [row.id, row]));
        const refreshed = createRowsFromMachines(
          nextMachines,
          defaultDowntimeReasonId,
        ).map((row) => ({
          ...row,
          ...existing.get(row.id),
          machineCode: row.machineCode,
          machineName: row.machineName,
        }));
        return [...new Map([...current, ...refreshed].map(row => [row.id, row])).values()];
      });
    } catch (error) {
      setLookups((current) => ({
        ...current,
        error: getOeeActionError(error, "Unable to load OEE lookups."),
        loading: false,
      }));
    }
  }, []);

  const loadMoreMachines = async () => {
    if (machinesLoading || !moreMachines) return;
    setMachinesLoading(true);
    try {
      const response = await oeeMachineService.getMachines({ IsActive: true, Page: machinePage + 1, PageSize: 40, SortBy: "displayOrder", SortDirection: "asc" });
      const next = getItems(response);
      setLookups(current => ({ ...current, machines: [...new Map([...current.machines, ...next].map(item => [String(getOeeRecordId(item)), item])).values()] }));
      setRows(current => [...new Map([...createRowsFromMachines(next, ""), ...current].map(row => [row.id, row])).values()]);
      setMachinePage(value => value + 1); setMoreMachines(lookupPage(response, machinePage + 1, 40).hasMore);
    } catch (failure) { setLookups(current => ({ ...current, error: getOeeActionError(failure, "More machines could not be loaded. Your typed rows are retained.") })); }
    finally { setMachinesLoading(false); }
  };

  useEffect(() => {
    void Promise.resolve().then(loadLookups);
  }, [loadLookups]);

  useEffect(() => {
    const controller = new AbortController();
    // Group only after every API page has loaded, so a date is never split.
    loadDowntimeEntries(
      oeeProductionEntryService.getProductionEntries,
      queryParams,
      controller.signal,
    )
      .then((entries) => {
        if (!controller.signal.aborted)
          setHistory({ key: historyKey, entries, error: "" });
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setHistory({
            key: historyKey,
            entries: [],
            error: getOeeActionError(
              error,
              "Unable to load production history.",
            ),
          });
      });
    return () => controller.abort();
  }, [queryParams, historyKey]);

  const updateRow = (rowId, patch) => {
    setRows((current) =>
      current.map((row) => (row.id === rowId ? { ...row, ...patch } : row)),
    );
    setRowErrors((current) => ({ ...current, [rowId]: undefined }));
  };

  const validateRows = () => {
    const nextErrors = {};

    rows
      .filter((row) => row.isRunning)
      .forEach((row) => {
        const errors = [];

        if (!row.machineOnTime.trim()) {
          errors.push("on-time");
        }

        if (!row.mouldId) {
          errors.push("mould");
        }

        if (Number(row.shotCount) < 0) {
          errors.push("shots");
        }

        if (errors.length > 0) {
          nextErrors[row.id] = `Check ${errors.join(", ")}.`;
        }
      });

    setRowErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  };

  const saveAll = async () => {
    if (!capabilities.canCreate || production.bulkSaving) {
      return;
    }

    if (!productionDate) {
      toast.error("Production date is required.");
      return;
    }

    if (rows.length === 0) {
      toast.error("No active machines available for production entry.");
      return;
    }

    if (!rows.some((row) => row.isRunning)) {
      toast.error("Switch on at least one running machine to save an entry.");
      return;
    }

    if (!validateRows()) {
      toast.error("Please complete required fields before saving.");
      return;
    }

    const payload = {
      productionDate,
      entries: rows
        .filter((row) => row.isRunning)
        .map((row) => ({
          machineId: row.machineId,
          machineOnTime: normalizeMachineOnTime(row.machineOnTime),
          mouldId: row.mouldId,
          shotCount: Number(row.shotCount) || 0,
          downtimeReasonId: row.downtimeReasonId
            ? row.downtimeReasonId
            : null,
          remarks: row.remarks.trim(),
        })),
    };

    try {
      const response = await dispatch(
        createOeeProductionEntriesBulk(payload),
      ).unwrap();

      toast.success(
        getOeeSuccessMessage(response, "Daily production saved successfully"),
      );
      setRows(current => current.map(row => ({ ...row, isRunning: false, machineOnTime: "", mouldId: "", shotCount: "0", remarks: "" })));
      await loadHistory();
    } catch (error) {
      toast.error(
        getOeeActionError(error, "Unable to save daily production entries."),
      );
    }
  };

  const submitQuickCreate = async (values) => {
    const isAllowed =
      quickCreate.type === "mould" ? canCreateMould : canCreateDowntimeReason;

    if (!isAllowed || quickCreate.isSaving) {
      return;
    }

    setQuickCreate((current) => ({ ...current, isSaving: true }));

    try {
      const response =
        quickCreate.type === "mould"
          ? await oeeMouldService.createMould({
              mouldName: values.mouldName.trim(),
              targetShotPerDay: Number(values.targetShotPerDay) || 0,
              cavity: values.cavity ? Number(values.cavity) : null,
              cycleTime: values.cycleTime ? Number(values.cycleTime) : null,
              isActive: true,
            })
          : await oeeDowntimeReasonService.createDowntimeReason({
              reasonName: values.reasonName.trim(),
              isActive: true,
            });
      const entity = extractOeeEntity(
        response.data,
        quickCreate.type === "mould" ? "mould" : "downtimeReason",
      );
      const id = getOeeRecordId(entity);

      await loadLookups();

      if (quickCreate.rowId && id) {
        updateRow(
          quickCreate.rowId,
          quickCreate.type === "mould"
            ? { mouldId: id }
            : { downtimeReasonId: id },
        );
      }

      toast.success(
        getOeeSuccessMessage(response, "Lookup created successfully"),
      );
      setQuickCreate({
        isOpen: false,
        isSaving: false,
        rowId: null,
        type: null,
      });
    } catch (error) {
      toast.error(getOeeActionError(error, "Unable to create lookup."));
      setQuickCreate((current) => ({ ...current, isSaving: false }));
    }
  };

  const openEdit = async (entry) => {
    if (!capabilities.canUpdate) {
      return;
    }

    const id = getOeeRecordId(entry);

    if (!id) {
      toast.error("Unable to find production entry id.");
      return;
    }

    setModal({ entity: entry, isLoading: true, isOpen: true });

    try {
      const response = await dispatch(fetchOeeProductionEntryById(id)).unwrap();

      setModal({
        entity: extractOeeEntity(response.data, "productionEntry"),
        isLoading: false,
        isOpen: true,
      });
    } catch (error) {
      toast.error(
        getOeeActionError(error, "Unable to load production entry details."),
      );
      setModal((current) => ({ ...current, isLoading: false }));
    }
  };

  const submitEdit = async (payload) => {
    if (!capabilities.canUpdate) {
      return;
    }

    try {
      const response = await dispatch(
        updateOeeProductionEntry({
          id: getOeeRecordId(modal.entity),
          payload,
        }),
      ).unwrap();

      toast.success(
        getOeeSuccessMessage(response, "Production entry updated successfully"),
      );
      setModal({ entity: null, isLoading: false, isOpen: false });
      await loadHistory();
    } catch (error) {
      toast.error(
        getOeeActionError(error, "Unable to update production entry."),
      );
      throw error;
    }
  };

  const confirmDelete = async () => {
    if (!capabilities.canDelete || !confirmation.entity) {
      return;
    }

    const id = getOeeRecordId(confirmation.entity);

    if (!id) {
      toast.error("Unable to find production entry id.");
      return;
    }

    setConfirmation((current) => ({ ...current, isLoading: true }));

    try {
      const result = await dispatch(deleteOeeProductionEntry(id)).unwrap();
      toast.success(
        getOeeSuccessMessage(
          result.response,
          "Production entry deleted successfully",
        ),
      );
      setConfirmation({ entity: null, isLoading: false, isOpen: false });
      await loadHistory();
    } catch (error) {
      toast.error(
        getOeeActionError(error, "Unable to delete production entry."),
      );
      setConfirmation((current) => ({ ...current, isLoading: false }));
    }
  };

  return (
    <section className="min-w-0 space-y-5">
      <PageHeader
        badge={
          <>
            <ClipboardList className="h-3.5 w-3.5" />
            OEE / Production Entries
          </>
        }
        title="Production Entries"
        description="Capture daily machine runtime, mould, shots, and downtime in one fast grid."
        actions={
          <>
            <AppButton
              variant="secondary"
              className="h-10"
              disabled={lookups.loading || production.bulkSaving}
              onClick={loadLookups}
            >
              <RefreshCw
                className={`h-4 w-4 ${lookups.loading ? "animate-spin" : ""}`}
              />
              Refresh Lookups
            </AppButton>
            {capabilities.canCreate && (
              <AppButton
                className="h-10"
                isLoading={production.bulkSaving}
                loadingText="Saving…"
                onClick={saveAll}
              >
                <Save className="h-4 w-4" />
                Save Running Machines
              </AppButton>
            )}
          </>
        }
      />

      {lookups.error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-inset ring-red-100">
          {lookups.error}
        </div>
      )}
      <p className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">Machine runtime and shots feed OEE analysis. They never post physical production stock. Record accepted output and material use in <a className="font-semibold underline" href="/manufacturing/daily">Daily Production</a>; retain legacy Item production for its separate stock history.</p>
      {moreMachines && <AppButton variant="secondary" disabled={machinesLoading || production.bulkSaving} onClick={loadMoreMachines}>{machinesLoading ? "Loading machines…" : "Load more machines"} · {rows.length} currently available</AppButton>}
      <OeeStoppedDayPanel key={productionDate} productionDate={productionDate} canView={capabilities.canView} canCreate={capabilities.canCreate} canUpdate={capabilities.canUpdate} onDirtyChange={setAcknowledgementDirty} />

      <div className="oee-entry-form rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-light px-3 py-1 text-xs font-semibold text-brand ring-1 ring-inset ring-brand/10">
              <CalendarDays className="h-3.5 w-3.5" />
              Bulk Daily Entry
            </div>
            <h2 className="mt-3 text-lg font-semibold text-slate-900">
              {rows.filter((row) => row.isRunning).length} of {rows.length}{" "}
              machines running
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Switch on the machines running on this date. Only running machines
              will be saved. Enter on-time as 12 HR or a number of hours.
            </p>
          </div>
          <div className="w-full shrink-0 lg:w-52">
            <AppInput
              id="productionDate"
              label="Production Date"
              type="date"
              required
              value={productionDate}
              disabled={production.bulkSaving}
              onChange={(event) => confirmLeave(() => { setProductionDate(event.target.value); setRows(current => current.map(row => ({ ...row, isRunning: false, machineOnTime: "", mouldId: "", shotCount: "0", remarks: "" }))); })}
              className="h-10"
            />
          </div>
        </div>

        <div className="mt-5 space-y-3">
          <div className="oee-entry-grid-heading">
            <span>Machine</span>
            <span>On-Time</span>
            <span>Mould</span>
            <span>Shots</span>
            <span>Downtime</span>
            <span>Remarks</span>
          </div>

          {lookups.loading ? (
            Array.from({ length: 4 }, (_, index) => (
              <div
                key={index}
                className="h-24 animate-pulse rounded-xl bg-slate-100"
              />
            ))
          ) : rows.length === 0 ? (
            <div className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              No active machines loaded.
            </div>
          ) : (
            rows.map((row) => (
              <div
                key={row.id}
                className={[
                  "oee-entry-row rounded-xl border bg-white",
                  rowErrors[row.id]
                    ? "oee-entry-invalid border-red-200"
                    : "border-slate-200",
                  row.isRunning ? "oee-entry-running" : "",
                ].join(" ")}
              >
                <div className="oee-entry-machine min-w-0">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={row.isRunning}
                    aria-label={`Running machine ${row.machineCode || row.machineName}`}
                    disabled={!capabilities.canCreate || production.bulkSaving}
                    onClick={() =>
                      updateRow(row.id, { isRunning: !row.isRunning })
                    }
                    className="mb-2 inline-flex items-center gap-2 rounded-md text-xs font-semibold text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span
                      className={`inline-flex h-5 w-9 items-center rounded-full p-0.5 transition-colors ${row.isRunning ? "bg-emerald-500" : "bg-slate-300"}`}
                    >
                      <span
                        className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${row.isRunning ? "translate-x-4" : "translate-x-0"}`}
                      />
                    </span>
                    {row.isRunning ? "Running" : "Off · skipped"}
                  </button>
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {row.machineCode || row.machineName}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    {row.machineName || "Machine"}
                  </p>
                  {rowErrors[row.id] && (
                    <p className="mt-1 text-xs font-medium text-red-600">
                      {rowErrors[row.id]}
                    </p>
                  )}
                </div>
                <div className="oee-entry-field ">
                  <span className="oee-entry-field-label">On-time</span>
                  <AppInput
                    id={`machineOnTime-${row.id}`}
                    disabled={
                      !row.isRunning ||
                      production.bulkSaving ||
                      !capabilities.canCreate
                    }
                    aria-label="Machine on-time"
                    value={row.machineOnTime}
                    placeholder="12 HR"
                    onChange={(event) =>
                      updateRow(row.id, { machineOnTime: event.target.value })
                    }
                    className="h-10 px-3"
                  />
                </div>
                <div className="oee-entry-field ">
                  <span className="oee-entry-field-label">Mould</span>
                  <ResourceLookup kind="mould"
                    value={row.mouldId}
                    disabled={
                      !row.isRunning ||
                      production.bulkSaving ||
                      !capabilities.canCreate
                    }
                    onChange={(value) => updateRow(row.id, { mouldId: value })}
                    initialOptions={lookups.moulds}
                    placeholder="Select mould"

                    createLabel="Create mould"
                    onCreate={canCreateMould ? () => {
                      if (canCreateMould) {
                        setQuickCreate({
                          isOpen: true,
                          isSaving: false,
                          rowId: row.id,
                          type: "mould",
                        });
                      }
                    } : undefined}
                    aria-label="Mould"
                  />
                </div>
                <div className="oee-entry-field ">
                  <span className="oee-entry-field-label">Shots</span>
                  <OeeNumberInput
                    id={`shotCount-${row.id}`}
                    disabled={
                      !row.isRunning ||
                      production.bulkSaving ||
                      !capabilities.canCreate
                    }
                    allowDecimal={false}
                    value={row.shotCount}
                    onChange={(value) =>
                      updateRow(row.id, { shotCount: value })
                    }
                  />
                </div>
                <div className="oee-entry-field ">
                  <span className="oee-entry-field-label">Downtime</span>
                  <ResourceLookup kind="reason"
                    value={row.downtimeReasonId}
                    disabled={
                      !row.isRunning ||
                      production.bulkSaving ||
                      !capabilities.canCreate
                    }
                    onChange={(value) =>
                      updateRow(row.id, { downtimeReasonId: value })
                    }
                    initialOptions={lookups.reasons}
                    placeholder="Select reason"

                    createLabel="Create reason"
                    onCreate={canCreateDowntimeReason ? () => {
                      if (canCreateDowntimeReason) {
                        setQuickCreate({
                          isOpen: true,
                          isSaving: false,
                          rowId: row.id,
                          type: "reason",
                        });
                      }
                    } : undefined}
                    aria-label="Downtime reason"
                  />
                </div>
                <div className="oee-entry-field oee-entry-remarks">
                  <span className="oee-entry-field-label">Remarks</span>
                  <AppInput
                    id={`remarks-${row.id}`}
                    disabled={
                      !row.isRunning ||
                      production.bulkSaving ||
                      !capabilities.canCreate
                    }
                    aria-label="Remarks"
                    value={row.remarks}
                    placeholder="Remarks"
                    onChange={(event) =>
                      updateRow(row.id, { remarks: event.target.value })
                    }
                    className="h-10 px-3"
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Entry History
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              One record per production date. Open a date to review and edit its
              machine entries.
            </p>
          </div>
          <AppButton
            variant="secondary"
            className="h-10"
            disabled={historyLoading}
            onClick={loadHistory}
          >
            <RefreshCw
              className={`h-4 w-4 ${historyLoading ? "animate-spin" : ""}`}
            />
            Refresh History
          </AppButton>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <AppDateRangeFilter
            className="w-full sm:col-span-2 sm:min-w-[260px]"
            fromDate={production.filters.FromDate}
            toDate={production.filters.ToDate}
            allowLifetime={true}
            onChange={({ fromDate, toDate }) => {
              dispatch(
                setOeeProductionEntryFilters({
                  FromDate: fromDate,
                  ToDate: toDate,
                }),
              );
              dispatch(setOeeProductionEntryPage(1));
            }}
          />
          <ResourceLookup kind="machine"
            value={production.filters.MachineId}
            onChange={(value) => {
              dispatch(setOeeProductionEntryFilters({ MachineId: value }));
              dispatch(setOeeProductionEntryPage(1));
            }}
            initialOptions={lookups.machines}
            aria-label="Machine filter"
          />
          <ResourceLookup kind="mould"
            value={production.filters.MouldId}
            onChange={(value) => {
              dispatch(setOeeProductionEntryFilters({ MouldId: value }));
              dispatch(setOeeProductionEntryPage(1));
            }}
            initialOptions={lookups.moulds}
            aria-label="Mould filter"
          />
          <ResourceLookup kind="reason"
            value={production.filters.DowntimeReasonId}
            onChange={(value) => {
              dispatch(
                setOeeProductionEntryFilters({ DowntimeReasonId: value }),
              );
              dispatch(setOeeProductionEntryPage(1));
            }}
            initialOptions={lookups.reasons}
            aria-label="Downtime reason filter"
          />
          <AppButton
            variant="secondary"
            className="h-10 rounded-lg px-3"
            onClick={() => {
              dispatch(
                setOeeProductionEntryFilters({
                  FromDate: "",
                  ToDate: "",
                  MachineId: "",
                  MouldId: "",
                  DowntimeReasonId: "",
                }),
              );
              dispatch(setOeeProductionEntryPage(1));
            }}
          >
            Clear
          </AppButton>
        </div>
      </div>

      <ProductionHistoryByDate
        key={historyKey}
        actions={{
          ...capabilities,
          onDelete: (entry) =>
            setConfirmation({
              entity: entry,
              isLoading: false,
              isOpen: true,
            }),
          onEdit: openEdit,
        }}
        entries={historyLoading ? [] : history.entries}
        error={historyLoading ? "" : history.error}
        isLoading={historyLoading}
        onPageChange={(value) => dispatch(setOeeProductionEntryPage(value))}
        onPageSizeChange={(value) =>
          dispatch(setOeeProductionEntryPageSize(value))
        }
        onRetry={loadHistory}
        pageNumber={production.pageNumber}
        pageSize={production.pageSize}
      />

      <QuickCreateModal
        key={quickCreate.type ?? "closed"}
        isOpen={quickCreate.isOpen}
        isSaving={quickCreate.isSaving}
        onClose={() =>
          setQuickCreate({
            isOpen: false,
            isSaving: false,
            rowId: null,
            type: null,
          })
        }
        onSubmit={submitQuickCreate}
        type={quickCreate.type}
      />

      <EditEntryModal
        key={[
          modal.isLoading ? "loading" : "ready",
          getOeeRecordId(modal.entity) ?? "new",
        ].join("-")}
        entry={modal.entity}
        isLoading={modal.isLoading}
        isOpen={modal.isOpen}
        lookups={lookups}
        onClose={() =>
          setModal({ entity: null, isLoading: false, isOpen: false })
        }
        onSubmit={submitEdit}
      />

      <OeeConfirmDialog
        isLoading={confirmation.isLoading}
        isOpen={confirmation.isOpen}
        title="Delete Production Entry?"
        description={`${confirmation.entity?.machineName ?? "This entry"} for ${formatOeeDate(confirmation.entity?.productionDate)} will be permanently removed.`}
        onCancel={() =>
          setConfirmation({
            entity: null,
            isLoading: false,
            isOpen: false,
          })
        }
        onConfirm={confirmDelete}
      />
    </section>
  );
};

export default OeeProductionEntriesPage;
