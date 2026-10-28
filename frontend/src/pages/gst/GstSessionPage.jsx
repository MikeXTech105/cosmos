import { useCallback, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import AppButton from "../../components/common/AppButton";
import AppInput from "../../components/common/AppInput";
import GstRegistrationLookup from "./GstRegistrationLookup";
import { gstService } from "../../services/gst/gstService";
import { GstDetails, GstError, GstFrame, GstNotice } from "./GstShared";
import { useGstAccess, useGstOperation, useGstQuery } from "./useGst";

export default function GstSessionPage() {
  const [search] = useSearchParams();
  const [id, setId] = useState(() => search.get("registrationId") ?? "");
  const selectedId = useRef(id);
  const [record, setRecord] = useState(null);
  const [username, setUsername] = useState("");
  const [otp, setOtp] = useState("");
  const [needsReadback, setNeedsReadback] = useState(false);
  const operation = useGstOperation();
  const access = useGstAccess();
  const loadConfiguration = useCallback(options => gstService.configuration(options), []);
  const configuration = useGstQuery(loadConfiguration);
  const configured = configuration.data?.enabledFeatures?.includes("GST Session/OTP");
  const chooseRegistration = (value, registration) => { selectedId.current = String(value); setId(String(value)); setRecord(null); setOtp(""); setUsername(registration?.gstPortalUsername ?? ""); setNeedsReadback(false); };
  const lookup = async event => {
    event?.preventDefault();
    if (!id) return;
    const requestedId = id;
    await operation.run(async () => { const response = await gstService.session(requestedId); if (selectedId.current === requestedId) { setRecord(response.data); setNeedsReadback(false); } });
  };
  const mutate = async authenticate => {
    if (!configured || !id || needsReadback || !access("GST.Session", "update")) return;
    const requestedId = id;
    const completed = await operation.run(async () => {
      const response = authenticate ? await gstService.authenticateOtp({ companyGstRegistrationId: requestedId, otp }) : await gstService.generateOtp({ companyGstRegistrationId: requestedId, gstPortalUsername: username });
      if (selectedId.current === requestedId) { setRecord(response.data); setOtp(""); }
      return true;
    });
    if (completed !== true && selectedId.current === requestedId) setNeedsReadback(true);
  };
  return <GstFrame title="GST session" description="Select a company registration, inspect its session and authenticate using the OTP received from the GST portal.">
    <form className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-end" onSubmit={lookup}>
      <div className="flex-1"><GstRegistrationLookup label="GST registration" required value={id} disabled={operation.busy} onChange={chooseRegistration} /></div><AppButton type="submit" disabled={!id} isLoading={operation.busy}>Refresh stored session</AppButton>
    </form>
    <GstError error={operation.error} />
    {needsReadback && <GstNotice>The previous request did not return a confirmed result. Refresh the stored session and review it before requesting another OTP or authenticating again.</GstNotice>}
    {record && <div className="rounded-xl border border-slate-200 bg-white p-5"><GstDetails entries={[["Session status", record.status], ["Session type", record.sessionType], ["Expires at", record.tokenExpiresAt], ["OTP verified at", record.otpVerifiedAt], ["Updated at", record.updatedAt]]} /></div>}
    {access("GST.Session", "update") && <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5"><h2 className="font-semibold">Authenticate the selected registration</h2>{configuration.loading ? <p role="status">Checking session configuration…</p> : !configured ? <GstNotice>Ask an administrator to configure the GSTN REST access token for this environment. Provider credentials stay on the server.</GstNotice> : <><AppInput label="GST portal username" value={username} autoComplete="off" disabled={operation.busy || needsReadback} onChange={event => setUsername(event.target.value)} /><AppButton disabled={!id || !username.trim() || needsReadback} isLoading={operation.busy} onClick={() => mutate(false)}>Send OTP</AppButton><div className="border-t border-slate-100 pt-4"><AppInput label="OTP received from GST portal" value={otp} autoComplete="one-time-code" inputMode="numeric" maxLength={20} disabled={operation.busy || needsReadback} onChange={event => setOtp(event.target.value)} /><AppButton className="mt-3" disabled={!id || !otp.trim() || needsReadback} isLoading={operation.busy} onClick={() => mutate(true)}>Authenticate OTP</AppButton><p className="mt-2 text-xs text-slate-500">OTP values are cleared after success and are never saved as browser drafts.</p></div></>}<GstError error={configuration.error} retry={configuration.retry} /></section>}
  </GstFrame>;
}

