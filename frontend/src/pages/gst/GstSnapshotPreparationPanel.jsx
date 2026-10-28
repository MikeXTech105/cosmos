import { useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import AppButton from "../../components/common/AppButton";
import AppSelect from "../../components/common/AppSelect";
import useCapabilities from "../../hooks/useCapabilities";
import { gstService } from "../../services/gst/gstService";
import { gstError } from "../../utils/gstCompliance";
import { formatCurrency } from "../../utils/reportFormat";

export default function GstSnapshotPreparationPanel({invoiceId,confirmed}) {
  const access=useCapabilities({actions:["view","create"],pageName:"GST.EInvoice",route:"/gst/e-invoices"});
  const [params,setParams]=useSearchParams();
  const commandRef=useRef(params.get("gstPreparationKey")||crypto.randomUUID());
  const [pending,setPending]=useState(Boolean(params.get("gstPreparationKey")));
  const [state,setState]=useState({busy:false,error:"",preparation:null,saved:null});
  const [reviewed,setReviewed]=useState(false);
  const [choices,setChoices]=useState({rounding:"Undecided",headerDiscount:"Undecided"});
  if(!access.canView||!confirmed)return null;
  const run=async task=>{
    if(state.busy)return;setState(current=>({...current,busy:true,error:""}));
    try{await task();}catch(error){setState(current=>({...current,error:gstError(error)}));}finally{setState(current=>({...current,busy:false}));}
  };
  const load=()=>run(async()=>{const response=await gstService.snapshotPreparation(invoiceId);setState(current=>({...current,preparation:response.data}));setReviewed(false);});
  const readback=()=>run(async()=>{
    try{const response=await gstService.preparedSnapshot(invoiceId,commandRef.current);setState(current=>({...current,saved:response.data}));}
    catch(error){if(error?.response?.status===404){setPending(false);commandRef.current=crypto.randomUUID();setParams(current=>{const next=new URLSearchParams(current);next.delete("gstPreparationKey");return next;},{replace:true});}throw error;}
  });
  const freeze=()=>run(async()=>{
    if(!access.canCreate||!reviewed||!state.preparation||pending)return;
    const source=state.preparation.source;setPending(true);
    setParams(current=>{const next=new URLSearchParams(current);next.set("gstPreparationKey",commandRef.current);return next;},{replace:true});
    try{
      const response=await gstService.prepareSnapshot(invoiceId,{requestKey:commandRef.current,sourceVersion:source.sourceVersion,sourceFingerprint:source.sourceFingerprint,currentMasterDetailsReviewed:true,roundingCandidate:choices.rounding,headerDiscountCandidate:choices.headerDiscount});
      setState(current=>({...current,saved:response.data}));
    }catch(error){
      // A 4xx validation/conflict proves no new snapshot was committed; transport failures require command readback.
      if([400,409].includes(error?.response?.status)){setPending(false);commandRef.current=crypto.randomUUID();setParams(current=>{const next=new URLSearchParams(current);next.delete("gstPreparationKey");return next;},{replace:true});}
      throw error;
    }
  });
  const document=state.preparation?.source.document;
  const frozen=state.saved?.frozenSource;
  return <section className="no-print space-y-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950"><h3 className="font-semibold">GST source preparation · policy decision pending</h3><p>Review and freeze source details for future compliance work. Policy options remain proposals until approved. This does not issue a government document or change invoice tax, payment or stock.</p>
    {state.error&&<p role="alert" className="rounded-lg bg-red-50 p-3 text-red-800">{state.error}</p>}
    {state.saved?<p className="rounded-lg bg-white p-3">Preparation version {state.saved.snapshotVersion} saved as <strong>{state.saved.status}</strong>. Reference: <span className="break-all">{state.saved.id}</span>. Issuance remains unavailable until the policy decision and statutory validation are complete.</p>:pending?<div className="space-y-2"><p>An earlier preparation may already be saved. Read back its result before creating another.</p><AppButton variant="secondary" isLoading={state.busy} onClick={readback}>Check saved preparation</AppButton></div>:<AppButton variant="secondary" isLoading={state.busy} onClick={load}>{document?"Reload source for review":"Review source details"}</AppButton>}
    {frozen&&<dl className="grid gap-3 rounded-lg bg-white p-3 sm:grid-cols-2"><div><dt className="text-xs text-slate-500">Frozen seller evidence</dt><dd>{frozen.sellerCurrentMaster.LegalName||frozen.sellerCurrentMaster.TradeName} · {frozen.sellerCurrentMaster.Gstin}</dd><dd>{frozen.sellerCurrentMaster.AddressLine1}</dd></div><div><dt className="text-xs text-slate-500">Frozen buyer evidence</dt><dd>{frozen.buyerCurrentMaster.LegalName||frozen.buyerCurrentMaster.PartyName}</dd><dd>{frozen.buyerCurrentMaster.BillingAddressLine1}</dd></div></dl>}
    {document&&!state.saved&&!pending&&<><dl className="grid gap-3 rounded-lg bg-white p-3 sm:grid-cols-2"><div><dt className="text-xs text-slate-500">Seller · current registration</dt><dd>{document.sellerCurrentMaster.LegalName||document.sellerCurrentMaster.TradeName||"Name missing"} · {document.sellerCurrentMaster.Gstin}</dd><dd>{[document.sellerCurrentMaster.AddressLine1,document.sellerCurrentMaster.AddressLine2,document.sellerCurrentMaster.City,document.sellerCurrentMaster.Pincode].filter(Boolean).join(", ")||"Address missing"}</dd></div><div><dt className="text-xs text-slate-500">Buyer · current Party details</dt><dd>{document.buyerCurrentMaster.LegalName||document.buyerCurrentMaster.PartyName} · {document.buyerCurrentMaster.GSTIN||"GSTIN not recorded"}</dd><dd>{[document.buyerCurrentMaster.BillingAddressLine1,document.buyerCurrentMaster.BillingAddressLine2,document.buyerCurrentMaster.BillingCity,document.buyerCurrentMaster.BillingPincode].filter(Boolean).join(", ")||"Address missing"}</dd></div><div><dt className="text-xs text-slate-500">Confirmed invoice</dt><dd>{document.invoice.InvoiceNumber} · {document.invoice.InvoiceDate} · {document.lines.length} lines</dd></div><div><dt className="text-xs text-slate-500">Persisted invoice total</dt><dd>{formatCurrency(document.invoice.GrandTotal)}</dd></div></dl>
      <p className="text-xs">Addresses and legal identities are the current master details reviewed now. They are not represented as immutable facts from the original invoice date. Stored line HSN values and current effective classification evidence are frozen separately.</p>
      <div className="grid gap-3 sm:grid-cols-2">{state.preparation.policyChoices.map(group=><AppSelect key={group.key} label={group.label} value={choices[group.key]} disabled={state.busy} options={group.options.map(option=>({value:option.key,label:option.label}))} onChange={value=>setChoices(current=>({...current,[group.key]:value}))}/>)}</div>
      <label className="flex items-start gap-2"><input type="checkbox" className="mt-1" checked={reviewed} disabled={state.busy} onChange={event=>setReviewed(event.target.checked)}/>I reviewed the current seller and buyer details above. Save an immutable preparation with these policy proposals; issuance stays unavailable.</label>
      {access.canCreate&&<AppButton disabled={!reviewed} isLoading={state.busy} onClick={freeze}>Freeze preparation as PendingPolicy</AppButton>}
    </>}
  </section>;
}
