import { itemDraftValues } from "./useItemDraft";
export default function ItemDraftRecovery({draft,onRestore,disabled=false}) {
  return <div className="space-y-2 text-sm">
    {(!draft.available||draft.storageError)&&<p className="rounded-lg bg-amber-50 p-3 text-amber-900">{draft.storageError||"Draft recovery is unavailable until this account and company are verified. Save before leaving."}</p>}
    {draft.recoveredDraft&&<div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900"><p>{draft.stale?"An older Item draft needs review against the current form.":"An Item draft is available. Review it against the current saved values before saving."} Images must be selected again.</p><div className="mt-2 flex gap-4"><button type="button" disabled={disabled} className="underline" onClick={()=>{onRestore(itemDraftValues(draft.recoveredDraft.values));draft.acknowledgeRecovery();}}>Restore and review</button><button type="button" disabled={disabled} className="underline" onClick={draft.clearDraft}>Discard saved draft</button></div></div>}
  </div>;
}
