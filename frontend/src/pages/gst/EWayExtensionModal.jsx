import { useState } from "react";
import { useForm, useWatch, Controller } from "react-hook-form";
import AppButton from "../../components/common/AppButton";
import AppInput from "../../components/common/AppInput";
import AppModal from "../../components/common/AppModal";
import AppSelect from "../../components/common/AppSelect";
import { gstService } from "../../services/gst/gstService";
import { getApiErrorMessage } from "../../utils/apiError";
import { GST_STATE_CODE_MAP } from "../../constants/gstStateCodes";
import { generateUUID } from "../../utils/uuid";

const modes=[{value:"1",label:"Road"},{value:"2",label:"Rail"},{value:"3",label:"Air"},{value:"4",label:"Ship"},{value:"5",label:"Goods in transit / at warehouse"}];
const fields=[["fromPlace","Current place"],["fromPincode","Current PIN code"],["remainingDistance","Remaining distance (km)"],["extensionReasonCode","Approved provider reason code"],["extensionRemark","Reason and circumstances"]];

export default function EWayExtensionModal({ record, commandKey, onAttempt, onClose, onComplete, onRejected }) {
  const [key,setKey]=useState(()=>commandKey??generateUUID());
  const [uncertain,setUncertain]=useState(Boolean(commandKey));
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const {control,register,handleSubmit,formState:{errors}}=useForm({defaultValues:{vehicleNumber:record.vehicleNumber??"",transportMode:String(record.transportMode??"1"),extensionReasonCode:"",extensionRemark:"",fromPlace:"",fromState:"",fromPincode:"",remainingDistance:"",transportDocumentNumber:"",transportDocumentDate:"",transitType:"W",addressLine1:"",addressLine2:"",addressLine3:""}});
  const mode=useWatch({control,name:"transportMode"});
  const submit=async values=>{
    if(busy||uncertain)return;
    setBusy(true);setError("");onAttempt(key);
    try{
      const payload={...values,companyGstRegistrationId:record.companyGstRegistrationId,eWayBillNumber:record.eWayBillNumber,fromState:Number(values.fromState),transportDocumentDate:values.transportDocumentDate||null,consignmentStatus:mode==="5"?"T":"M",idempotencyKey:key,version:record.concurrencyVersion};
      const response=await gstService.extendWayBill(payload);onComplete(response.data);
    }catch(failure){
      const data=failure?.response?.data?.data??failure?.apiError?.data;
      if(data?.code==="GST_PROVIDER_REJECTED" || failure?.response?.status===400){setUncertain(false);setKey(generateUUID());onRejected?.();}
      else setUncertain(true);
      setError(getApiErrorMessage(failure,"The extension result is unconfirmed. Use provider readback; do not submit it again."));
    }finally{setBusy(false);}
  };
  const reconcile=async()=>{
    if(busy)return;setBusy(true);setError("");
    try{const response=await gstService.reconcileWayBillExtension(key);onComplete(response.data);}
    catch(failure){setError(getApiErrorMessage(failure,"Provider readback has not confirmed the extension. Keep this command for reconciliation."));if(failure?.response?.status===404){setUncertain(false);setKey(generateUUID());onRejected?.();}}
    finally{setBusy(false);}
  };
  return <AppModal isOpen title="Review E-Way Bill validity extension" isBusy={busy} onClose={onClose} maxWidth="max-w-3xl"><form className="space-y-4" onSubmit={handleSubmit(submit)}>
    <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900">E-Way Bill {record.eWayBillNumber}. The provider decides eligibility and new validity from the reviewed circumstances and remaining route. This action does not change the accounting invoice or stock.</p>
    <p className="text-sm text-slate-600">Stored validity: {record.validUpTo??"Unavailable"}. Review the current consignment location and the actual reason for delay. Provider reason codes must match the current approved provider list.</p>
    {error&&<p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {uncertain?<div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><p>This command already has a pending or unknown outcome. Provider readback checks its result without issuing another extension.</p><p className="break-all text-xs">Command reference: {key}</p><AppButton isLoading={busy} onClick={reconcile}>Reconcile extension from provider</AppButton></div>:<>
      <Controller control={control} name="transportMode" render={({field})=><AppSelect label="Current transport / consignment mode" disabled={busy} value={field.value} onChange={field.onChange} options={modes}/>}/>
      <Controller control={control} name="fromState" rules={{required:"Current state is required."}} render={({field})=><AppSelect label="Current state" required disabled={busy} value={field.value} onChange={field.onChange} error={errors.fromState?.message} options={Object.entries(GST_STATE_CODE_MAP).map(([value,label])=>({value,label:`${label} (${value})`}))}/>}/>
      <div className="grid gap-4 sm:grid-cols-2">{fields.map(([name,label])=><AppInput key={name} label={label} required disabled={busy} error={errors[name]?.message} {...register(name,{required:`${label} is required.`})}/>)}</div>
      {mode==="1"&&<AppInput label="Current vehicle number" required disabled={busy} error={errors.vehicleNumber?.message} {...register("vehicleNumber",{required:"Current vehicle is required for road transport."})}/>}
      {mode!=="1"&&mode!=="5"&&<div className="grid gap-4 sm:grid-cols-2"><AppInput label="Transport document number" required disabled={busy} {...register("transportDocumentNumber",{required:"Transport document number is required."})}/><AppInput label="Transport document date" type="date" required disabled={busy} {...register("transportDocumentDate",{required:"Transport document date is required."})}/></div>}
      {mode==="5"&&<><Controller control={control} name="transitType" render={({field})=><AppSelect label="Transit location" disabled={busy} value={field.value} onChange={field.onChange} options={[{value:"R",label:"Road"},{value:"W",label:"Warehouse"},{value:"O",label:"Other"}]}/>}/><div className="grid gap-3 sm:grid-cols-3">{[1,2,3].map(number=><AppInput key={number} label={`Transit address line ${number}`} required disabled={busy} {...register(`addressLine${number}`,{required:"Transit location address is required."})}/>)}</div></>}
    </>}
    <div className="flex justify-end gap-3"><AppButton variant="secondary" disabled={busy} onClick={onClose}>{uncertain?"Close and keep command":"Back"}</AppButton>{!uncertain&&<AppButton type="submit" isLoading={busy}>Confirm reviewed extension</AppButton>}</div>
  </form></AppModal>;
}
