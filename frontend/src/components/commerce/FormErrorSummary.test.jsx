// @vitest-environment jsdom
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import AppSelect from "../common/AppSelect";
import FormErrorSummary from "./FormErrorSummary";
import { applyApiErrorsToForm } from "../../utils/formApiErrors";

function Harness({label="Document"}) {
  const [tab,setTab]=useState("pricing");
  const {control,register,setError,formState:{errors}}=useForm({defaultValues:{supplierId:"2",minimumStock:"0",items:[{quantity:"1"},{quantity:"2"},{quantity:"3"}]}});
  const {fields,remove}=useFieldArray({control,name:"items"});
  return <form aria-label={label}><FormErrorSummary errors={errors} onNavigate={field=>{if(field==="minimumStock")setTab("stock");}}/>
    <Controller control={control} name="supplierId" render={({field})=><AppSelect label="Supplier" name={field.name} value={field.value} onChange={field.onChange} options={[{value:"2",label:"Existing supplier"}]}/>}/>
    {fields.map((row,index)=><div key={row.id}><label>Quantity {index+1}<input {...register(`items.${index}.quantity`)}/></label><button type="button" onClick={()=>remove(index)}>Remove row {index+1}</button></div>)}
    {tab==="stock"&&<label>Minimum stock<input {...register("minimumStock")}/></label>}
    <button type="button" onClick={()=>applyApiErrorsToForm({error:{response:{status:422,data:{errors:{"Request.Items[2].Quantity":["Exceeds remaining quantity."],SupplierId:["Choose the original supplier."],MinimumStock:["Review stock boundary."],ServerOnly:["The source document changed."]}}}},formFieldNames:["items.2.quantity","supplierId","minimumStock"],setError})}>Show server errors</button>
  </form>;
}
beforeEach(()=>{Element.prototype.scrollIntoView=vi.fn();});afterEach(cleanup);
describe("Persistent form error summary and real focus targets",()=>{
  it("binds bracketed line errors and keeps the correct row focusable after removal",async()=>{
    render(<Harness/>);fireEvent.click(screen.getByRole("button",{name:"Show server errors"}));
    fireEvent.click(screen.getByRole("button",{name:"Review Line 3: Quantity"}));
    await waitFor(()=>expect(document.activeElement.name).toBe("items.2.quantity"));expect(document.activeElement.value).toBe("3");
    fireEvent.click(screen.getByRole("button",{name:"Remove row 1"}));fireEvent.click(screen.getByRole("button",{name:"Review Line 2: Quantity"}));
    await waitFor(()=>expect(document.activeElement.name).toBe("items.1.quantity"));expect(document.activeElement.value).toBe("3");
    expect(screen.getByText("The source document changed.")).toBeTruthy();expect(screen.queryByRole("button",{name:/Server only/})).toBeNull();
  });
  it("mounts a hidden tab before focusing its field and supports custom selector buttons",async()=>{
    render(<Harness/>);fireEvent.click(screen.getByRole("button",{name:"Show server errors"}));expect(screen.queryByLabelText("Minimum stock")).toBeNull();
    fireEvent.click(screen.getByRole("button",{name:"Review Minimum stock"}));await waitFor(()=>expect(document.activeElement.name).toBe("minimumStock"));
    fireEvent.click(screen.getByRole("button",{name:"Review Supplier"}));await waitFor(()=>expect(document.activeElement.getAttribute("role")).toBe("combobox"));expect(document.activeElement.name).toBe("supplierId");
  });
  it("scopes duplicate field names to the containing form",async()=>{
    render(<><Harness label="Outer document"/><Harness label="Inline item"/></>);const inline=within(screen.getByRole("form",{name:"Inline item"}));
    fireEvent.click(inline.getByRole("button",{name:"Show server errors"}));fireEvent.click(inline.getByRole("button",{name:"Review Supplier"}));
    await waitFor(()=>expect(screen.getByRole("form",{name:"Inline item"}).contains(document.activeElement)).toBe(true));
    expect(screen.getByRole("form",{name:"Outer document"}).contains(document.activeElement)).toBe(false);
  });
});
