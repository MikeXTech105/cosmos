import { useState } from "react";
import AppButton from "../../components/common/AppButton";
import AppInput from "../../components/common/AppInput";
import { gstService } from "../../services/gst/gstService";
import { GSTIN_PATTERN } from "../../utils/gstCompliance";
import { GstDetails, GstError, GstFrame } from "./GstShared";
import { useGstOperation } from "./useGst";

export default function GstVerificationPage() {
  const [gstin, setGstin] = useState("");
  const [record, setRecord] = useState(null);
  const [invalid, setInvalid] = useState(false);
  const operation = useGstOperation();
  const submit = event => {
    event.preventDefault();
    if (!GSTIN_PATTERN.test(gstin.trim().toUpperCase())) { setInvalid(true); return; }
    operation.run(async () => {
      setRecord(null);
      setInvalid(false);
      const response = await gstService.verifyGstin(gstin);
      setRecord(response.data);
    });
  };
  return <GstFrame title="GSTIN verification" description="Check a GSTIN with the configured provider or its valid cached verification.">
    <form onSubmit={submit} className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-end"><div className="flex-1"><AppInput label="GSTIN" value={gstin} maxLength={15} required disabled={operation.busy} error={invalid ? "Enter a valid 15-character GSTIN." : undefined} onChange={event => { setGstin(event.target.value.toUpperCase()); setRecord(null); }} /></div><AppButton type="submit" isLoading={operation.busy}>Verify GSTIN</AppButton></form>
    <GstError error={operation.error} />
    {record && <div className="rounded-xl border border-slate-200 bg-white p-5"><GstDetails entries={[["GSTIN", record.gstin], ["Legal name", record.legalName], ["Trade name", record.tradeName], ["GST status", record.status], ["State code", record.stateCode], ["Taxpayer type", record.taxpayerType], ["Registration date", record.registrationDate], ["Verified at", record.verifiedAt], ["Cache expires at", record.cacheExpiresAt]]} /></div>}
  </GstFrame>;
}

