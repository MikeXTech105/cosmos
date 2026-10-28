import { useState } from "react";
import { getApiErrorMessage } from "../../utils/apiError";
import { withoutDirtyPrompt } from "../../utils/dirtyWork";

export default function UncertainSaveNotice({recovery,onReviewHistory,historyHref,readRecord}) {
  const [reviewed,setReviewed]=useState(false);
  const [reading,setReading]=useState(false);
  const [observation,setObservation]=useState("");
  if(!recovery.uncertain)return null;
  const check=async()=>{
    if(reading)return;setReading(true);setObservation("");
    try{setObservation(await readRecord());}catch(error){setObservation(getApiErrorMessage(error,"Saved details could not be read. The save outcome is still unconfirmed."));}finally{setReading(false);}
  };
  return <section role="alert" className="space-y-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"><h2 className="font-semibold">Save result needs review</h2><p>The request may already have saved. Your submitted values are retained and saving is locked to avoid a duplicate. Check the saved record or history before deciding what to do next.</p>
    <p className="text-xs">Attempt reference: {recovery.marker.attemptId} · {recovery.marker.startedAt}</p>
    {(!recovery.available||recovery.storageError)&&<p>{recovery.storageError||"Recovery storage is unavailable. Keep this window open until you have checked saved history."}</p>}
    <div className="flex flex-wrap gap-4">{readRecord&&<button type="button" className="underline" disabled={reading} onClick={check}>{reading?"Reading saved details…":"Read current saved record"}</button>}{onReviewHistory&&<button type="button" className="underline" onClick={()=>withoutDirtyPrompt(onReviewHistory)}>Review saved history and keep draft</button>}{historyHref&&<a className="underline" href={historyHref} target="_blank" rel="noreferrer">Open saved history in another tab</a>}</div>
    {observation&&<p role="status" className="rounded-lg bg-white p-3">{observation} Compare this result with your retained values. Readback does not repeat the save.</p>}
    <label className="flex items-start gap-2"><input type="checkbox" checked={reviewed} onChange={event=>setReviewed(event.target.checked)}/>I reviewed saved records and confirmed this attempt did not save; I want to retry the retained values.</label>
    <button type="button" className="rounded-lg border border-amber-400 bg-white px-3 py-2 font-medium disabled:opacity-50" disabled={!reviewed||reading} onClick={()=>{recovery.allowReviewedRetry();setReviewed(false);}}>Allow a reviewed retry</button>
  </section>;
}
