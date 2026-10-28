import { useId } from "react";
import { collectFormErrors, formErrorLabel, focusFormError } from "./formErrors";

/** Links resolve against the containing form, so nested quick-create forms never steal focus. */
export default function FormErrorSummary({errors,onNavigate,labels={}}) {
  const id=useId();const entries=collectFormErrors(errors);
  if(!entries.length)return null;
  const jump=(event,field)=>{
    const form=event.currentTarget.closest("form");onNavigate?.(field);
    // A tab may need to mount its field before the focus target exists.
    window.requestAnimationFrame(()=>{if(!focusFormError(form,field))window.requestAnimationFrame(()=>focusFormError(form,field));});
  };
  return <section role="alert" aria-labelledby={id} className="space-y-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><h2 id={id} className="font-semibold">Review these details before saving</h2><ul className="space-y-2">{entries.map(({field,message},index)=><li key={`${field??"request"}:${index}`}>{field?<button type="button" className="text-left underline decoration-red-300 underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500" aria-label={`Review ${formErrorLabel(field,labels)}`} onClick={event=>jump(event,field)}><span className="font-semibold">{formErrorLabel(field,labels)}:</span> {message}</button>:<p>{message}</p>}</li>)}</ul></section>;
}
