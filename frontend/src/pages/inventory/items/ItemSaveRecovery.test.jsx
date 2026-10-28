// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import ItemFormModal from "./ItemFormModal";
import itemReducer,{createItem,updateItem} from "../../../store/slices/inventory/itemSlice";
import { itemService } from "../../../services/inventory/itemService";
import { CompanyDraftScopeContext } from "../../../hooks/companyDraftScopeContext";
vi.mock("../../../hooks/useManufacturingPreference",()=>({default:()=>({manufacturingEnabled:false})}));
vi.mock("../../../services/inventory/itemService",()=>({itemService:{createItem:vi.fn(),updateItem:vi.fn(),getItemById:vi.fn()}}));
const item={id:"9",name:"Reviewed item",itemCode:"REVIEW-9",itemType:1,categoryId:"2",unitId:"3",purchasePrice:"1",salesPrice:"2",minimumStock:"0",trackInventory:true};
const deferred=()=>{let reject;const promise=new Promise((_,fail)=>{reject=fail;});return{promise,reject};};
const mount=(mode="edit")=>{const store=configureStore({reducer:{items:itemReducer}});const view=render(<Provider store={store}><CompanyDraftScopeContext.Provider value="save-account-company"><ItemFormModal isOpen mode={mode} item={item} onClose={vi.fn()} onSubmit={payload=>store.dispatch(mode==="edit"?updateItem({id:item.id,payload}):createItem(payload)).unwrap()} categoryOptions={[{value:"2",label:"Category"}]} unitOptions={[{value:"3",label:"Unit"}]}/></CompanyDraftScopeContext.Provider></Provider>);return{...view,store};};
beforeEach(()=>{vi.resetAllMocks();sessionStorage.clear();localStorage.clear();Element.prototype.scrollIntoView=vi.fn();});afterEach(cleanup);
describe("Actual Redux Item save recovery",()=>{
  it("keeps structured400 field errors editable after actual thunk unwrap",async()=>{
    itemService.createItem.mockRejectedValue({response:{status:400,data:{message:"Review stock",errors:{MinimumStock:["Minimum stock exceeds item limit."]}}}});const {store}=mount("create");
    fireEvent.click(screen.getByRole("button",{name:"Save Item"}));fireEvent.click(await screen.findByRole("button",{name:"Review Minimum stock"}));await waitFor(()=>expect(document.activeElement.name).toBe("minimumStock"));
    expect(screen.queryByText("Save result needs review")).toBeNull();expect(typeof store.getState().items.error).toBe("string");expect(itemService.createItem).toHaveBeenCalledOnce();expect(screen.getByLabelText(/Item Name/).value).toBe(item.name);
  });
  it.each(["edit","create"])("journals %s503 immediately, survives remount, and unlocks only after explicit history review",async mode=>{
    const pending=deferred();const mutate=mode==="edit"?itemService.updateItem:itemService.createItem;const saveLabel=mode==="edit"?"Save Changes":"Save Item";const journalKey=`cosmos:draft:save-account-company:item%3Asave-outcome:${mode==="edit"?"9":"new"}`;mutate.mockReturnValue(pending.promise);itemService.getItemById.mockResolvedValue({data:{...item,minimumStock:"0"}});
    const first=mount(mode);const save=screen.getByRole("button",{name:saveLabel});fireEvent.click(save);fireEvent.click(save);await waitFor(()=>expect(mutate).toHaveBeenCalledOnce());
    expect(JSON.parse(localStorage.getItem(journalKey)).values.marker).toBeTruthy();
    await act(async()=>pending.reject({response:{status:503,data:{message:"Gateway lost result"}}}));await screen.findByText("Save result needs review");first.unmount();
    mount(mode);expect(screen.getByText("Save result needs review")).toBeTruthy();fireEvent.submit(screen.getByRole("button",{name:saveLabel}).closest("form"));await act(async()=>{});expect(mutate).toHaveBeenCalledOnce();
    if(mode==="edit"){fireEvent.click(screen.getByRole("button",{name:"Read current saved record"}));await screen.findByText(/Saved Item REVIEW-9/);}else{expect(screen.getByRole("link",{name:"Open saved history in another tab"}).getAttribute("href")).toBe("/items");}expect(mutate).toHaveBeenCalledOnce();
    expect(screen.getByRole("button",{name:"Allow a reviewed retry"}).disabled).toBe(true);fireEvent.click(screen.getByRole("checkbox",{name:/I reviewed saved records/}));fireEvent.click(screen.getByRole("button",{name:"Allow a reviewed retry"}));
    expect(screen.queryByText("Save result needs review")).toBeNull();expect(localStorage.getItem(journalKey)).toBeNull();
    mutate.mockResolvedValue({data:item});fireEvent.click(screen.getByRole("button",{name:saveLabel}));await waitFor(()=>expect(mutate).toHaveBeenCalledTimes(2));
  });
});
