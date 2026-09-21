import {
  AlertTriangle,
  CalendarDays,
  ClipboardList,
  Edit3,
  Plus,
  RefreshCw,
  Save,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";

import AppButton from "../../../components/common/AppButton";
import AppInput from "../../../components/common/AppInput";
import AppDateRangeFilter from "../../../components/common/AppDateRangeFilter";
import AppModal from "../../../components/common/AppModal";
import AppSelect from "../../../components/common/AppSelect";
import PageHeader from "../../../components/common/PageHeader";
import useCreatePermission from "../../../hooks/useCreatePermission";
import { oeeDowntimeReasonService } from "../../../services/oee/oeeDowntimeReasonService";
import { oeeMachineService } from "../../../services/oee/oeeMachineService";
import { oeeMouldService } from "../../../services/oee/oeeMouldService";
import {
  createOeeProductionEntriesBulk,
  deleteOeeProductionEntry,
  fetchOeeProductionEntries,
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
  formatOeeNumber,
  formatOeePercent,
  getOeeActionError,
  getOeeRating,
  getOeeRecordId,
  getOeeSuccessMessage,
  getTodayInputValue,
} from "../oeeHelpers";
import {
  OeeConfirmDialog,
  OeeEmptyState,
  OeeNumberInput,
  OeePagination,
  OeeRatingPill,
} from "../OeeShared";
import useOeeCapabilities from "../useOeeCapabilities";

const getItems = (response) => {
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

const createRowsFromMachines = (machines) => {
  return machines.map((machine) => ({
    id: String(getOeeRecordId(machine, "machine")),
    machineCode: machine.machineCode ?? "",
    machineId: getOeeRecordId(machine, "machine"),
    machineName: machine.machineName ?? "",
    isRunning: false,
    machineOnTime: "",
    mouldId: "",
    shotCount: "0",
    downtimeReasonId: "",
    remarks: "",
  }));
};

const toOptions = (items, getLabel) => {
  return items.map((item) => ({
    value: getOeeRecordId(item),
    label: getLabel(item),
  }));
};

const QuickCreateModal = ({
  isOpen,
  isSaving,
  onClose,
  onSubmit,
  type,
}) => {
  const isMould = type === "mould";
  const [values, setValues] = useState({
    cavity: "",
    cycleTime: "",
    mouldName: "",
    reasonName: "",
    targetShotPerDay: "0",
  });

  const setValue = (name, value) => {
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
      onClose={isSaving ? undefined : onClose}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-light text-brand">
          {isMould ? <Plus className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
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

  const machineOptions = useMemo(
    () =>
      toOptions(
        lookups.machines,
        (machine) =>
          [machine.machineCode, machine.machineName].filter(Boolean).join(" - "),
      ),
    [lookups.machines],
  );
  const mouldOptions = useMemo(
    () => toOptions(lookups.moulds, (mould) => mould.mouldName ?? "-"),
    [lookups.moulds],
  );
  const reasonOptions = useMemo(
    () =>
      toOptions(
        lookups.reasons,
        (reason) => reason.reasonName ?? "-",
      ),
    [lookups.reasons],
  );

  const setValue = (name, value) => {
    setValues((current) => ({ ...current, [name]: value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      await onSubmit({
        productionDate: values.productionDate,
        machineId: Number(values.machineId),
        machineOnTime: normalizeMachineOnTime(values.machineOnTime),
        mouldId: Number(values.mouldId),
        shotCount: Number(values.shotCount) || 0,
        downtimeReasonId: values.downtimeReasonId
          ? Number(values.downtimeReasonId)
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
            Update the single production record and let the backend recalculate OEE.
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
            <AppSelect
              label="Machine"
              required
              value={values.machineId}
              onChange={(value) => setValue("machineId", value)}
              options={machineOptions}
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
            <AppSelect
              label="Mould"
              required
              value={values.mouldId}
              onChange={(value) => setValue("mouldId", value)}
              options={mouldOptions}
            />
            <OeeNumberInput
              id="editShotCount"
              label="Shot Count"
              required
              allowDecimal={false}
              value={values.shotCount}
              onChange={(value) => setValue("shotCount", value)}
            />
            <AppSelect
              label="Downtime Reason"
              value={values.downtimeReasonId}
              onChange={(value) => setValue("downtimeReasonId", value)}
              options={reasonOptions}
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
            <AppButton variant="secondary" disabled={isSubmitting} onClick={onClose}>
              Cancel
            </AppButton>
            <AppButton type="submit" isLoading={isSubmitting} loadingText="Saving…">
              Save Changes
            </AppButton>
          </div>
        </form>
      )}
    </AppModal>
  );
};

const HistoryTable = ({
  actions,
  entries,
  error,
  isLoading,
  onPageChange,
  onPageSizeChange,
  onRetry,
  pageNumber,
  pageSize,
  totalCount,
  totalPages,
}) => {
  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="space-y-3 p-4">
          {Array.from({ length: 7 }, (_, index) => (
            <div
              key={index}
              className="h-12 animate-pulse rounded-xl bg-slate-100"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error || entries.length === 0) {
    return (
      <OeeEmptyState
        icon={ClipboardList}
        title="No production entries found"
        description="Saved daily machine entries will appear here for review and edits."
        error={error}
        onRetry={onRetry}
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-semibold">#</th>
              <th className="px-4 py-3 font-semibold">Date</th>
              <th className="px-4 py-3 font-semibold">Machine</th>
              <th className="px-4 py-3 font-semibold">Mould</th>
              <th className="px-4 py-3 font-semibold">On-Time</th>
              <th className="px-4 py-3 font-semibold">Shots</th>
              <th className="px-4 py-3 font-semibold">Target</th>
              <th className="px-4 py-3 font-semibold">OEE</th>
              <th className="px-4 py-3 font-semibold">Downtime</th>
              <th className="px-4 py-3 font-semibold">Remarks</th>
              <th className="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, index) => (
              <tr key={getOeeRecordId(entry)} className="border-t border-slate-100">
                <td className="border-b border-slate-100 px-4 py-3.5 text-xs font-semibold tabular-nums text-slate-400">
                  {(pageNumber - 1) * pageSize + index + 1}
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {formatOeeDate(entry.productionDate)}
                </td>
                <td className="px-4 py-3">
                  <p className="font-semibold text-slate-900">
                    {entry.machineCode || entry.machineName || "-"}
                  </p>
                  {entry.machineCode && entry.machineName && (
                    <p className="text-xs text-slate-500">{entry.machineName}</p>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {entry.mouldName || "-"}
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {entry.machineOnTime || "-"}
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {formatOeeNumber(entry.shotCount, { maximumFractionDigits: 0 })}
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {formatOeeNumber(entry.calculatedTargetShot)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col items-start gap-1">
                    <span className="font-semibold text-slate-900">
                      {formatOeePercent(entry.calculatedOeePercentage)}
                    </span>
                    <OeeRatingPill
                      rating={getOeeRating(entry.calculatedOeePercentage)}
                    />
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {entry.downtimeReasonName || "-"}
                </td>
                <td className="max-w-56 truncate px-4 py-3 text-slate-500">
                  {entry.remarks || "-"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-0.5">
                    {actions.canEdit && (
                      <button
                        type="button"
                        aria-label="Edit entry"
                        title="Edit entry"
                        onClick={() => actions.onEdit(entry)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-all hover:bg-slate-100 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                    )}
                    {actions.canDelete && (
                      <button
                        type="button"
                        aria-label="Delete entry"
                        title="Delete entry"
                        onClick={() => actions.onDelete(entry)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-all hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <OeePagination
        disabled={isLoading}
        itemCount={entries.length}
        itemLabel="entries"
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        pageNumber={pageNumber}
        pageSize={pageSize}
        totalCount={totalCount}
        totalPages={totalPages}
      />
    </div>
  );
};

const OeeProductionEntriesPage = () => {
  const dispatch = useDispatch();
  const production = useSelector((state) => state.oeeProductionEntries);
  const capabilities = useOeeCapabilities({
    label: "OEE Production Entries",
    resource: "oeeProductionEntries",
    route: "/oee/production-entries",
  });
  const canCreateMould = useCreatePermission({
    label: "Moulds",
    resource: "oeeMoulds",
    route: "/oee/moulds",
  });
  const canCreateDowntimeReason = useCreatePermission({
    label: "Downtime Reasons",
    resource: "oeeDowntimeReasons",
    route: "/oee/downtime-reasons",
  });
  const [productionDate, setProductionDate] = useState(getTodayInputValue());
  const [lookups, setLookups] = useState({
    error: "",
    loading: false,
    machines: [],
    moulds: [],
    reasons: [],
  });
  const [rows, setRows] = useState([]);
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

  const mouldOptions = useMemo(
    () => toOptions(lookups.moulds, (mould) => mould.mouldName ?? "-"),
    [lookups.moulds],
  );
  const reasonOptions = useMemo(
    () =>
      toOptions(
        lookups.reasons,
        (reason) => reason.reasonName ?? "-",
      ),
    [lookups.reasons],
  );

  const queryParams = useMemo(
    () =>
      buildOeeProductionQueryParams({
        filters: production.filters,
        pageNumber: production.pageNumber,
        pageSize: production.pageSize,
      }),
    [production.filters, production.pageNumber, production.pageSize],
  );

  const loadHistory = useCallback(() => {
    return dispatch(fetchOeeProductionEntries(queryParams));
  }, [dispatch, queryParams]);

  const loadLookups = useCallback(async () => {
    setLookups((current) => ({ ...current, error: "", loading: true }));

    try {
      const [machines, moulds, reasons] = await Promise.all([
        oeeMachineService.getMachines({
          IsActive: true,
          Page: 1,
          PageSize: 200,
          SortBy: "displayOrder",
          SortDirection: "asc",
        }),
        oeeMouldService.getMoulds({
          IsActive: true,
          Page: 1,
          PageSize: 200,
          SortBy: "mouldName",
          SortDirection: "asc",
        }),
        oeeDowntimeReasonService.getDowntimeReasons({
          IsActive: true,
          Page: 1,
          PageSize: 200,
          SortBy: "reasonName",
          SortDirection: "asc",
        }),
      ]);

      const nextMachines = getItems(machines);

      setLookups({
        error: "",
        loading: false,
        machines: nextMachines,
        moulds: getItems(moulds),
        reasons: getItems(reasons),
      });
      setRows((current) => {
        const existing = new Map(current.map((row) => [row.id, row]));
        return createRowsFromMachines(nextMachines).map((row) => ({
          ...row,
          ...existing.get(row.id),
          machineCode: row.machineCode,
          machineName: row.machineName,
        }));
      });
    } catch (error) {
      setLookups((current) => ({
        ...current,
        error: getOeeActionError(error, "Unable to load OEE lookups."),
        loading: false,
      }));
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadLookups);
  }, [loadLookups]);

  useEffect(() => {
    void Promise.resolve().then(loadHistory);
  }, [loadHistory]);

  const updateRow = (rowId, patch) => {
    setRows((current) =>
      current.map((row) => (row.id === rowId ? { ...row, ...patch } : row)),
    );
    setRowErrors((current) => ({ ...current, [rowId]: undefined }));
  };

  const validateRows = () => {
    const nextErrors = {};

    rows.filter((row) => row.isRunning).forEach((row) => {
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
      entries: rows.filter((row) => row.isRunning).map((row) => ({
        machineId: Number(row.machineId),
        machineOnTime: normalizeMachineOnTime(row.machineOnTime),
        mouldId: Number(row.mouldId),
        shotCount: Number(row.shotCount) || 0,
        downtimeReasonId: row.downtimeReasonId
          ? Number(row.downtimeReasonId)
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
      await loadHistory();
    } catch (error) {
      toast.error(
        getOeeActionError(error, "Unable to save daily production entries."),
      );
    }
  };

  const submitQuickCreate = async (values) => {
    const isAllowed =
      quickCreate.type === "mould"
        ? canCreateMould
        : canCreateDowntimeReason;

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

  const filterMachineOptions = useMemo(
    () => [
      { value: "", label: "All machines" },
      ...toOptions(
        lookups.machines,
        (machine) =>
          [machine.machineCode, machine.machineName].filter(Boolean).join(" - "),
      ),
    ],
    [lookups.machines],
  );
  const filterMouldOptions = useMemo(
    () => [{ value: "", label: "All moulds" }, ...mouldOptions],
    [mouldOptions],
  );
  const filterReasonOptions = useMemo(
    () => [{ value: "", label: "All reasons" }, ...reasonOptions],
    [reasonOptions],
  );

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

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-light px-3 py-1 text-xs font-semibold text-brand ring-1 ring-inset ring-brand/10">
              <CalendarDays className="h-3.5 w-3.5" />
              Bulk Daily Entry
            </div>
            <h2 className="mt-3 text-lg font-semibold text-slate-900">
              {rows.filter((row) => row.isRunning).length} of {rows.length} machines running
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Switch on the machines running on this date. Only running machines will be saved.
              Enter on-time as 12 HR or a number of hours.
            </p>
          </div>
          <AppInput
            id="productionDate"
            label="Production Date"
            type="date"
            required
            value={productionDate}
            disabled={production.bulkSaving}
            onChange={(event) => setProductionDate(event.target.value)}
            className="h-10"
          />
        </div>

        <div className="mt-5 space-y-3">
          <div className="hidden rounded-xl bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 xl:grid xl:grid-cols-[minmax(170px,0.9fr)_120px_minmax(190px,1fr)_110px_minmax(190px,1fr)_minmax(190px,1fr)] xl:gap-3">
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
                  "grid gap-3 rounded-xl border bg-white p-3",
                  rowErrors[row.id] ? "border-red-200" : "border-slate-200",
                  "xl:grid-cols-[minmax(170px,0.9fr)_120px_minmax(190px,1fr)_110px_minmax(190px,1fr)_minmax(190px,1fr)]",
                ].join(" ")}
              >
                <div className="min-w-0">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={row.isRunning}
                    aria-label={`Running machine ${row.machineCode || row.machineName}`}
                    disabled={!capabilities.canCreate || production.bulkSaving}
                    onClick={() => updateRow(row.id, { isRunning: !row.isRunning })}
                    className="mb-2 inline-flex items-center gap-2 rounded-md text-xs font-semibold text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className={`inline-flex h-5 w-9 items-center rounded-full p-0.5 transition-colors ${row.isRunning ? "bg-emerald-500" : "bg-slate-300"}`}>
                      <span className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${row.isRunning ? "translate-x-4" : "translate-x-0"}`} />
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
                <AppInput
                  id={`machineOnTime-${row.id}`}
                  disabled={!row.isRunning || production.bulkSaving || !capabilities.canCreate}
                  aria-label="Machine on-time"
                  value={row.machineOnTime}
                  placeholder="12 HR"
                  onChange={(event) =>
                    updateRow(row.id, { machineOnTime: event.target.value })
                  }
                  className="h-10 px-3"
                />
                <AppSelect
                  value={row.mouldId}
                  disabled={!row.isRunning || production.bulkSaving || !capabilities.canCreate}
                  onChange={(value) => updateRow(row.id, { mouldId: value })}
                  options={mouldOptions}
                  placeholder="Select mould"
                  creatable={canCreateMould}
                  createLabel="Create mould"
                  onCreateClick={() => {
                    if (canCreateMould) {
                      setQuickCreate({
                        isOpen: true,
                        isSaving: false,
                        rowId: row.id,
                        type: "mould",
                      });
                    }
                  }}
                  aria-label="Mould"
                />
                <OeeNumberInput
                  id={`shotCount-${row.id}`}
                  disabled={!row.isRunning || production.bulkSaving || !capabilities.canCreate}
                  allowDecimal={false}
                  value={row.shotCount}
                  onChange={(value) => updateRow(row.id, { shotCount: value })}
                />
                <AppSelect
                  value={row.downtimeReasonId}
                  disabled={!row.isRunning || production.bulkSaving || !capabilities.canCreate}
                  onChange={(value) =>
                    updateRow(row.id, { downtimeReasonId: value })
                  }
                  options={reasonOptions}
                  placeholder="Select reason"
                  creatable={canCreateDowntimeReason}
                  createLabel="Create reason"
                  onCreateClick={() => {
                    if (canCreateDowntimeReason) {
                      setQuickCreate({
                        isOpen: true,
                        isSaving: false,
                        rowId: row.id,
                        type: "reason",
                      });
                    }
                  }}
                  aria-label="Downtime reason"
                />
                <AppInput
                  id={`remarks-${row.id}`}
                  disabled={!row.isRunning || production.bulkSaving || !capabilities.canCreate}
                  aria-label="Remarks"
                  value={row.remarks}
                  placeholder="Remarks"
                  onChange={(event) =>
                    updateRow(row.id, { remarks: event.target.value })
                  }
                  className="h-10 px-3"
                />
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
              Filter saved entries by period, machine, mould, or downtime reason.
            </p>
          </div>
          <AppButton
            variant="secondary"
            className="h-10"
            disabled={production.loading}
            onClick={loadHistory}
          >
            <RefreshCw
              className={`h-4 w-4 ${production.loading ? "animate-spin" : ""}`}
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
            onChange={({ fromDate, toDate }) => { dispatch(setOeeProductionEntryFilters({ FromDate: fromDate, ToDate: toDate })); dispatch(setOeeProductionEntryPage(1)); }}
          />
          <AppSelect
            value={production.filters.MachineId}
            onChange={(value) => {
              dispatch(setOeeProductionEntryFilters({ MachineId: value }));
              dispatch(setOeeProductionEntryPage(1));
            }}
            options={filterMachineOptions}
            aria-label="Machine filter"
          />
          <AppSelect
            value={production.filters.MouldId}
            onChange={(value) => {
              dispatch(setOeeProductionEntryFilters({ MouldId: value }));
              dispatch(setOeeProductionEntryPage(1));
            }}
            options={filterMouldOptions}
            aria-label="Mould filter"
          />
          <AppSelect
            value={production.filters.DowntimeReasonId}
            onChange={(value) => {
              dispatch(
                setOeeProductionEntryFilters({ DowntimeReasonId: value }),
              );
              dispatch(setOeeProductionEntryPage(1));
            }}
            options={filterReasonOptions}
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

      <HistoryTable
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
        entries={production.list}
        error={production.error}
        isLoading={production.loading}
        onPageChange={(value) => dispatch(setOeeProductionEntryPage(value))}
        onPageSizeChange={(value) =>
          dispatch(setOeeProductionEntryPageSize(value))
        }
        onRetry={loadHistory}
        pageNumber={production.pageNumber}
        pageSize={production.pageSize}
        totalCount={production.totalCount}
        totalPages={production.totalPages}
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
        onClose={() => setModal({ entity: null, isLoading: false, isOpen: false })}
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
