// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import CommerceFilterLookup from "./CommerceFilterLookup";
import { categoryService } from "../../services/inventory/categoryService";
import { partyService } from "./partyService";
vi.mock("../../services/inventory/categoryService",()=>({categoryService:{getCategories:vi.fn(),getCategoryById:vi.fn()}}));
vi.mock("./partyService",()=>({partyService:{getParties:vi.fn(),getPartyById:vi.fn()}}));
const page=(items,totalCount=items.length)=>({data:{items,totalCount}});
const oldId="9007199254740993",lateId="9007199254740995";
beforeEach(()=>{vi.resetAllMocks();categoryService.getCategories.mockResolvedValue(page([]));partyService.getParties.mockResolvedValue(page([]));});afterEach(cleanup);
const Controlled=({kind,initial="all",onChange=()=>{}})=>{const[value,setValue]=useState(initial);return <CommerceFilterLookup kind={kind} value={value} aria-label="Master filter" onChange={id=>{setValue(id);onChange(id);}}/>;};
describe("Historical commerce filters",()=>{
  it("hydrates an inactive exact category, searches later pages and can reset to all",async()=>{
    const changed=vi.fn();categoryService.getCategoryById.mockResolvedValue({data:{id:oldId,name:"Historical category",isActive:false}});
    categoryService.getCategories.mockImplementation(async query=>page([{id:query.PageNumber===1?"1":lateId,name:`Category page ${query.PageNumber}`,isActive:query.PageNumber!==2}],41));
    render(<Controlled kind="category" initial={oldId} onChange={changed}/>);
    const input=screen.getByRole("combobox");await waitFor(()=>expect(input.value).toBe("Historical category (inactive)"));
    fireEvent.focus(input);fireEvent.click(await screen.findByRole("button",{name:"Load more results"}));
    fireEvent.click(await screen.findByRole("option",{name:"Category page 2 (inactive)"}));
    expect(changed).toHaveBeenLastCalledWith(lateId);expect(input.value).toBe("Category page 2 (inactive)");
    expect(categoryService.getCategories).toHaveBeenCalledWith(expect.objectContaining({PageNumber:2,PageSize:40}),expect.objectContaining({signal:expect.any(AbortSignal)}));
    expect(categoryService.getCategories.mock.calls[0][0]).not.toHaveProperty("IsActive");
    fireEvent.click(input);fireEvent.click(screen.getByRole("option",{name:"All categories"}));expect(changed).toHaveBeenLastCalledWith("all");
  });
  it.each([["customer","Customer"],["supplier","Supplier"]])("%s includes canonical Both pages and retained inactive history",async(kind,role)=>{
    const id="f6408e25-e804-480f-a4a2-875fa65852aa",changed=vi.fn();partyService.getPartyById.mockResolvedValue({data:{id,partyName:"Historical Party",partyType:role,isActive:false}});
    partyService.getParties.mockImplementation(async query=>query.PartyType==="Both"?page([{id:"both-guid",partyName:"Both-role Party",partyType:"Both"}]):page([{id:`${role}-${query.PageNumber}`,partyName:`${role} page ${query.PageNumber}`,partyType:role}],41));
    render(<Controlled kind={kind} initial={id} onChange={changed}/>);const input=screen.getByRole("combobox");
    await waitFor(()=>expect(input.value).toBe("Historical Party (inactive)"));fireEvent.focus(input);
    expect(await screen.findByRole("option",{name:"Both-role Party"})).toBeTruthy();fireEvent.click(await screen.findByRole("button",{name:"Load more results"}));
    fireEvent.click(await screen.findByRole("option",{name:`${role} page 2`}));expect(changed).toHaveBeenLastCalledWith(`${role}-2`);
    expect(partyService.getParties).toHaveBeenCalledWith(expect.objectContaining({PartyType:role,PageNumber:2}),expect.any(Object));expect(partyService.getParties).toHaveBeenCalledWith(expect.objectContaining({PartyType:"Both",PageNumber:2}),expect.any(Object));
    expect(partyService.getPartyById).toHaveBeenCalledWith(id,expect.objectContaining({signal:expect.any(AbortSignal)}));
  });
  it("discards an earlier search while retaining the selected filter",async()=>{
    let finish;const pending=new Promise(resolve=>{finish=resolve;});categoryService.getCategories.mockImplementation(query=>query.Search==="earlier"?pending:Promise.resolve(page([{id:lateId,name:"Current result"}])));
    render(<Controlled kind="category"/>);const input=screen.getByRole("combobox");fireEvent.focus(input);fireEvent.change(input,{target:{value:"earlier"}});await waitFor(()=>expect(categoryService.getCategories).toHaveBeenCalledWith(expect.objectContaining({Search:"earlier"}),expect.any(Object)));fireEvent.change(input,{target:{value:"current"}});expect(await screen.findByRole("option",{name:"Current result"})).toBeTruthy();await act(async()=>finish(page([{id:"1",name:"Obsolete result"}])));expect(screen.queryByRole("option",{name:"Obsolete result"})).toBeNull();
  });
});
