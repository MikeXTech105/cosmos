import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import AppButton from "../../components/common/AppButton";
import AppInput from "../../components/common/AppInput";
import { gstService } from "../../services/gst/gstService";
import { GstDetails, GstError, GstFrame, GstNotice } from "./GstShared";
import { useGstOperation } from "./useGst";

export default function GstSessionPage() {
  const [search] = useSearchParams();
  const [id, setId] = useState(() => search.get("registrationId") ?? "");
  const [record, setRecord] = useState(null);
  const operation = useGstOperation();
  return <GstFrame title="GST session status" description="Inspect a stored registration session without exposing authentication tokens.">
    <form className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-end" onSubmit={event => {
      event.preventDefault();
      if (!Number.isSafeInteger(Number(id)) || Number(id) <= 0) return;
      operation.run(async () => { setRecord(null); const response = await gstService.session(id); setRecord(response.data); });
    }}><div className="flex-1"><AppInput label="Company GST registration ID" required type="number" min="1" step="1" value={id} disabled={operation.busy} onChange={event => { setId(event.target.value); setRecord(null); }} /></div><AppButton type="submit" isLoading={operation.busy}>Look up session</AppButton></form>
    <GstError error={operation.error} />
    {record && <div className="rounded-xl border border-slate-200 bg-white p-5"><GstDetails entries={[["Registration ID", record.companyGstRegistrationId], ["Session status", record.status], ["Session type", record.sessionType], ["Expires at", record.tokenExpiresAt], ["OTP verified at", record.otpVerifiedAt], ["Updated at", record.updatedAt]]} /></div>}
    <GstNotice>OTP generation and authentication need verified provider mappings. These operations are unavailable in this integration.</GstNotice>
  </GstFrame>;
}

