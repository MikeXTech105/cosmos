import { Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import AppButton from "../../../components/common/AppButton";
import AppInput from "../../../components/common/AppInput";
import AppModal from "../../../components/common/AppModal";
import useLatestRequest from "../../../hooks/useLatestRequest";
import { procurementSettingService } from "../../../services/procurement/procurementSettingService";
import {
  ProcurementErrorState,
  ProcurementInlineError,
  ProcurementSectionCard,
} from "../ProcurementShared";
import ProcurementTable, {
  PROCUREMENT_TABLE_HEADER_CLASS,
} from "../ProcurementTable";
import {
  formatProcurementDate,
  formatProcurementDecimal,
  getCollection,
  getFieldErrorMap,
  getItemLabel,
  getProcurementError,
  getRecordId,
  toIsoDate,
} from "../procurementHelpers";

const LeadTimeHistoryModal = ({ canManage, item, isOpen, onClose }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ notes: "", orderedDate: "", receivedDate: "", reference: "" });
  const [formErrors, setFormErrors] = useState({});
  const { beginRequest, isLatestRequest } = useLatestRequest();

  const load = useCallback(async () => {
    if (!item) return;
    const requestId = beginRequest();
    setLoading(true); setError(null);
    try {
      const response = await procurementSettingService.getLeadTimeHistory(getRecordId(item, ["itemId"]), { PageNumber: 1, PageSize: 200 });
      if (isLatestRequest(requestId)) setData(response.data);
    }
    catch (loadError) { if (isLatestRequest(requestId)) setError(loadError); }
    finally { if (isLatestRequest(requestId)) setLoading(false); }
  }, [beginRequest, isLatestRequest, item]);

  useEffect(() => {
    beginRequest();
    if (isOpen) {
      const timeout = window.setTimeout(() => {
        setData(null);
        setError(null);
        setForm({ notes: "", orderedDate: "", receivedDate: "", reference: "" });
        setFormErrors({});
        void load();
      }, 0);

      return () => window.clearTimeout(timeout);
    }

    return undefined;
  }, [beginRequest, isOpen, load]);
  const rows = getCollection(data, ["history", "leadTimeHistory"]);
  const average = data?.averageLeadTimeDays ?? data?.historyAverageLeadTimeDays;

  const submit = async () => {
    const validation = {};
    if (!form.reference.trim()) validation.reference = "Reference is required.";
    if (!form.orderedDate) validation.orderedDate = "Ordered date is required.";
    if (!form.receivedDate) validation.receivedDate = "Received date is required.";
    if (form.orderedDate && form.receivedDate && form.receivedDate < form.orderedDate) validation.receivedDate = "Received date must be on or after ordered date.";
    if (Object.keys(validation).length) { setFormErrors(validation); return; }
    setAdding(true); setFormErrors({});
    try { await procurementSettingService.addLeadTimeHistory({ itemId: getRecordId(item, ["itemId"]), reference: form.reference.trim(), orderedDate: form.orderedDate, receivedDate: form.receivedDate, notes: form.notes.trim() || null }); toast.success("Lead-time record added."); setForm({ notes: "", orderedDate: "", receivedDate: "", reference: "" }); await load(); }
    catch (addError) { setFormErrors({ ...getFieldErrorMap(addError), form: getProcurementError(addError, "Unable to add the record.") }); }
    finally { setAdding(false); }
  };

  return (
    <AppModal isBusy={adding} isOpen={isOpen} maxWidth="max-w-5xl" title={`Lead-time history · ${getItemLabel(item)}`} onClose={adding ? undefined : onClose}>
      <div className="max-h-[76vh] space-y-5 overflow-y-auto pr-1">
        <div className="grid gap-3 rounded-xl border border-brand/20 bg-brand-light/40 p-4 md:grid-cols-[160px_minmax(0,1fr)]"><div><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Computed average</p><p className="mt-1 text-xl font-semibold text-slate-900">{formatProcurementDecimal(average)} days</p></div><p className="self-center text-xs leading-5 text-slate-600">Completed order receipts feed the history-average lead-time source used by automatic planning.</p></div>
        {canManage && <ProcurementSectionCard title="Add received order" description="Received date must be on or after the ordered date."><div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4"><AppInput error={formErrors.reference} label="Reference" required value={form.reference} onChange={(event) => setForm((current) => ({ ...current, reference: event.target.value }))} /><AppInput error={formErrors.orderedDate} label="Ordered date" required type="date" max={form.receivedDate || toIsoDate(new Date())} value={form.orderedDate} onChange={(event) => setForm((current) => ({ ...current, orderedDate: event.target.value }))} /><AppInput error={formErrors.receivedDate} label="Received date" required type="date" min={form.orderedDate} max={toIsoDate(new Date())} value={form.receivedDate} onChange={(event) => setForm((current) => ({ ...current, receivedDate: event.target.value }))} /><AppInput error={formErrors.notes} label="Notes" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} /></div><div className="flex items-center justify-between gap-3 px-4 pb-4"><ProcurementInlineError message={formErrors.form} /><AppButton isLoading={adding} loadingText="Adding…" onClick={submit}><Plus className="h-4 w-4" />Add record</AppButton></div></ProcurementSectionCard>}
        <ProcurementSectionCard title="Received-order history">
          {error ? <ProcurementErrorState error={error} onRetry={load} /> : (
            <ProcurementTable
              columnCount={5}
              emptyHint="Add a completed receipt to begin calculating historical lead time."
              emptyTitle={!loading && rows.length === 0 ? "No lead-time history" : undefined}
              head={<><th className={PROCUREMENT_TABLE_HEADER_CLASS}>Reference</th><th className={PROCUREMENT_TABLE_HEADER_CLASS}>Ordered</th><th className={PROCUREMENT_TABLE_HEADER_CLASS}>Received</th><th className={`${PROCUREMENT_TABLE_HEADER_CLASS} text-right`}>Lead time</th><th className={PROCUREMENT_TABLE_HEADER_CLASS}>Notes</th></>}
              loading={loading}
              minWidth="min-w-[760px]"
              rows={4}
            >
              {rows.map((record, index) => <tr key={getRecordId(record, ["leadTimeHistoryId"]) ?? index}><td className="font-semibold text-slate-800">{record.reference}</td><td>{formatProcurementDate(record.orderedDate)}</td><td>{formatProcurementDate(record.receivedDate)}</td><td className="text-right font-semibold tabular-nums">{formatProcurementDecimal(record.leadTimeDays ?? record.numberOfDays)}</td><td>{record.notes ?? "-"}</td></tr>)}
            </ProcurementTable>
          )}
        </ProcurementSectionCard>
      </div>
    </AppModal>
  );
};

export default LeadTimeHistoryModal;
