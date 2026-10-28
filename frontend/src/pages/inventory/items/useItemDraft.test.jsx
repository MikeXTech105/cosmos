// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CompanyDraftScopeContext } from "../../../hooks/companyDraftScopeContext";
import useItemDraft from "./useItemDraft";
const wrapper=({children})=><CompanyDraftScopeContext.Provider value="account-company">{children}</CompanyDraftScopeContext.Provider>;
beforeEach(()=>{sessionStorage.clear();localStorage.clear();});afterEach(cleanup);
describe("Item draft safety",()=>{
  it("preserves entered exact decimals but never freezes live stock balances or file objects",()=>{
    const {result}=renderHook(()=>{const form=useForm({defaultValues:{minimumStock:"0",currentStock:"12",reservedStock:"3",imageFile:null}});return{form,...useItemDraft({control:form.control,isDirty:form.formState.isDirty,context:"new"})};},{wrapper});
    act(()=>{result.current.form.setValue("minimumStock","9999999999999999.123456",{shouldDirty:true});result.current.form.setValue("imageFile",new File(["image"],"upload.png"),{shouldDirty:true});});
    act(()=>result.current.draft.saveDraft());
    const draft=JSON.parse(localStorage.getItem("cosmos:draft:account-company:item:new"));expect(draft.values.minimumStock).toBe("9999999999999999.123456");for(const key of ["currentStock","reservedStock","imageFile"])expect(draft.values).not.toHaveProperty(key);
    const unload=new Event("beforeunload",{cancelable:true});window.dispatchEvent(unload);expect(unload.defaultPrevented).toBe(true);
  });
});
