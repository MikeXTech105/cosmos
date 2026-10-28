import { useWatch } from "react-hook-form";
import useScopedDraft from "../../../hooks/useScopedDraft";
import useUnsavedChanges from "../../../hooks/useUnsavedChanges";
export const itemDraftValues=values=>Object.fromEntries(Object.entries(values??{}).filter(([key])=>!["imageFile","currentStock","reservedStock"].includes(key)));
export default function useItemDraft({control,isDirty,context,enabled=true,persist=true}) {
  const values=useWatch({control});
  // Files cannot be recovered and stock balances must always come from the current server record.
  const recoverable=itemDraftValues(values);
  const draft=useScopedDraft({entity:"item",context,version:3,values:recoverable,enabled:enabled&&persist&&isDirty});
  const {confirmLeave}=useUnsavedChanges({when:enabled&&isDirty,message:"Leave this Item with unsaved changes?"});
  return{draft:{...draft,saveDraft:values=>draft.saveDraft(itemDraftValues(values??recoverable))},confirmLeave};
}
