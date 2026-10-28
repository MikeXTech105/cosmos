// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { CompanyDraftScopeContext } from "../../hooks/companyDraftScopeContext";
import { writeListReturnSnapshot } from "../../utils/listReturnContext";
import ItemsPage from "../inventory/items/ItemsPage";
import SalesInvoicesPage from "../sales/invoices/SalesInvoicesPage";
import PurchaseDocumentListPage from "../purchase/documents/PurchaseDocumentListPage";
import { purchaseDocumentConfigs } from "../purchase/documents/documentConfigs";
import itemReducer from "../../store/slices/inventory/itemSlice";
import invoiceReducer from "../../store/slices/sales/invoiceSlice";
import billReducer from "../../store/slices/purchase/purchaseBillSlice";
import { itemService } from "../../services/inventory/itemService";
import { invoiceService } from "../../services/sales/invoiceService";
import { purchaseBillService } from "../../services/purchase/purchaseBillService";
import { categoryService } from "../../services/inventory/categoryService";
import { partyService } from "./partyService";

vi.mock("../../services/inventory/itemService",()=>({itemService:{getItems:vi.fn(),getItemById:vi.fn()}}));
vi.mock("../../services/sales/invoiceService",()=>({invoiceService:{getInvoices:vi.fn(),getInvoiceById:vi.fn()}}));
vi.mock("../../services/purchase/purchaseBillService",()=>({purchaseBillService:{getPurchaseBills:vi.fn(),getPurchaseBillById:vi.fn()}}));
vi.mock("../../services/inventory/categoryService",()=>({categoryService:{getCategories:vi.fn(),getCategoryById:vi.fn(),createCategory:vi.fn()}}));
vi.mock("./partyService",()=>({partyService:{getParties:vi.fn(),getPartyById:vi.fn(),createParty:vi.fn(),getPartySettings:vi.fn()}}));
vi.mock("../../services/documentLookupService",()=>({documentLookupService:{items:vi.fn(async()=>({data:{items:[]}}))}}));
vi.mock("../../services/manufacturing/productionApi",()=>({default:{get:vi.fn(async url=>{
  if(url!=="/api/v1/manufacturing/runtime")throw new Error(`Unexpected context request: ${url}`);
  return{data:{succeeded:true,data:{businessDate:"2026-10-28",companyKey:"fixture-catalog"}}};
})}}));

const scope="list-test-account-company",savedId="9007199254740997";
const oldCategory="9007199254740993",lateCategory="9007199254740995";
const oldParty="499e3b64-de5d-4f56-a2b0-29d168f74230",lateParty="d9275709-0257-4d03-a718-1ed407a6c22b";
const result=(query,items)=>({data:{items,pageNumber:query.PageNumber,pageSize:query.PageSize,totalCount:400,totalPages:20}});
const cases=[
  {key:"items",path:"/items",slice:"items",reducer:itemReducer,field:"CategoryId",old:oldCategory,late:lateCategory,label:"Filter items by category",newLabel:"Add Item",Component:ItemsPage,request:()=>itemService.getItems,record:{id:savedId,name:"Saved item",itemCode:"I-1",currentStock:"10",minimumStock:"0",itemType:1,isActive:true}},
  {key:"sales-invoices",path:"/sales/invoices",slice:"salesInvoices",reducer:invoiceReducer,field:"CustomerPartyId",old:oldParty,late:lateParty,label:"Filter invoices by customer",newLabel:"New Invoice",Component:SalesInvoicesPage,request:()=>invoiceService.getInvoices,record:{id:savedId,invoiceNumber:"INV-1",customerName:"Buyer",grandTotal:100,status:1,paymentStatus:1}},
  {key:"purchase-bills",path:"/purchase/bills",slice:"purchaseBills",reducer:billReducer,field:"SupplierId",old:oldParty,late:lateParty,label:"Filter by supplier",newLabel:"New",Component:()=> <PurchaseDocumentListPage config={purchaseDocumentConfigs.bills}/>,request:()=>purchaseBillService.getPurchaseBills,record:{id:savedId,billNo:"BILL-1",supplierName:"Supplier",grandTotal:100,status:1,paymentStatus:1}},
];
const Probe=()=>{const location=useLocation();return <output data-testid="destination">{JSON.stringify({pathname:location.pathname,state:location.state})}</output>;};
beforeEach(()=>{
  vi.resetAllMocks();sessionStorage.clear();localStorage.clear();vi.spyOn(window,"scrollTo").mockImplementation(()=>{});
  vi.stubGlobal("requestAnimationFrame",callback=>setTimeout(callback,0));vi.stubGlobal("cancelAnimationFrame",id=>clearTimeout(id));Element.prototype.scrollIntoView=vi.fn();
  categoryService.getCategoryById.mockResolvedValue({data:{id:oldCategory,name:"Historical filter",isActive:false}});
  partyService.getPartyById.mockResolvedValue({data:{id:oldParty,partyName:"Historical filter",isActive:false}});
  partyService.getPartySettings.mockResolvedValue({data:{enableShippingAddress:true,enablePartyStatus:true}});
  categoryService.getCategories.mockImplementation(async query=>({data:{items:query.PageSize===200?[]:[{id:query.PageNumber===1?"1":lateCategory,name:`Remote page ${query.PageNumber}`}],totalCount:41}}));
  partyService.getParties.mockImplementation(async query=>({data:{items:query.PageSize===200||query.PartyType==="Both"?[]:[{id:query.PageNumber===1?"9b9f2775-af39-4ccc-9689-13d7ac648920":lateParty,partyName:`Remote page ${query.PageNumber}`,partyType:query.PartyType}],totalCount:query.PartyType==="Both"?0:41}}));
});
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals();});

function mount(testCase,highlight=savedId) {
  const auth={roles:["SuperAdmin"],pages:[],user:{id:1}};
  const store=configureStore({reducer:{items:itemReducer,salesInvoices:invoiceReducer,purchaseBills:billReducer,auth:()=>auth,partyGst:()=>({config:{loaded:true,available:false},verify:{}})}});
  const base=testCase.reducer(undefined,{type:"@init"});
  const remembered={filters:{...base.filters,Search:"remembered",[testCase.field]:testCase.old},pageNumber:3,pageSize:20};
  const context={version:1,scope,key:testCase.key,token:"captured-origin-token",path:testCase.path};
  writeListReturnSnapshot({...context,filters:remembered,scroll:{x:0,y:480},highlight:{id:highlight,token:"save-token"}});
  testCase.request().mockImplementation(async query=>result(query,[testCase.record]));
  render(<Provider store={store}><CompanyDraftScopeContext.Provider value={scope}><MemoryRouter initialEntries={[{pathname:testCase.path,state:{listReturn:context,returnTo:testCase.path}}]}><Routes><Route path={testCase.path} element={<testCase.Component/>}/><Route path="*" element={<Probe/>}/></Routes></MemoryRouter></CompanyDraftScopeContext.Provider></Provider>);
  return{store,remembered};
}

describe("Commerce list filter and return integration",()=>{
  it.each(cases)("$key retains page, inactive filter and scroll, then selects a later remote record and resets only that query",async testCase=>{
    const{store}=mount(testCase);const input=screen.getByRole("combobox",{name:testCase.label});
    await waitFor(()=>expect(input.value).toBe("Historical filter (inactive)"));
    await waitFor(()=>expect(store.getState()[testCase.slice].pageNumber).toBe(3));
    await act(async()=>new Promise(resolve=>setTimeout(resolve,400)));
    expect(store.getState()[testCase.slice].pageNumber).toBe(3);
    expect(testCase.request()).toHaveBeenCalledWith(expect.objectContaining({PageNumber:3,[testCase.field]:testCase.old}));
    await waitFor(()=>expect(window.scrollTo).toHaveBeenCalledWith(expect.objectContaining({left:0,top:480})));
    expect(document.querySelector(`tr[data-record-id="${savedId}"]`)?.getAttribute("data-saved-highlight")).toBe("true");
    fireEvent.focus(input);fireEvent.click(await screen.findByRole("button",{name:"Load more results"}));fireEvent.click(await screen.findByRole("option",{name:"Remote page 2"}));
    await waitFor(()=>expect(store.getState()[testCase.slice].filters[testCase.field]).toBe(testCase.late));
    expect(store.getState()[testCase.slice].pageNumber).toBe(1);expect(store.getState()[testCase.slice].filters.Search).toBe("remembered");
    await waitFor(()=>expect(testCase.request()).toHaveBeenLastCalledWith(expect.objectContaining({PageNumber:1,[testCase.field]:testCase.late})));
    fireEvent.click(screen.getByRole("button",{name:testCase.newLabel}));
    const destination=JSON.parse((await screen.findByTestId("destination")).textContent);expect(destination.state.returnTo).toBe(testCase.path);expect(destination.state.listReturn.key).toBe(testCase.key);
  });
  it("keeps saved-record notice outside the current page without resetting the filter",async()=>{
    const{store}=mount(cases[0],"off-page-record");await screen.findByText(/It is outside the current filtered page/);expect(document.querySelector('[data-saved-highlight="true"]')).toBeNull();expect(store.getState().items.filters.CategoryId).toBe(oldCategory);expect(store.getState().items.pageNumber).toBe(3);
  });
  it.each(cases)("$key selects a canonical inline-created filter without first-page reload dependence",async testCase=>{
    const{store}=mount(testCase);const input=screen.getByRole("combobox",{name:testCase.label});await waitFor(()=>expect(input.value).toBe("Historical filter (inactive)"));
    const isCategory=testCase.key==="items",kind=isCategory?"category":testCase.key==="sales-invoices"?"customer":"supplier";
    const created=isCategory?{id:lateCategory,name:"New canonical category",isActive:true}:{id:lateParty,partyName:"New canonical Party",partyType:kind==="customer"?"Customer":"Supplier",isActive:true};
    (isCategory?categoryService.createCategory:partyService.createParty).mockResolvedValue({data:created});
    const firstPageCalls=()=>isCategory?categoryService.getCategories.mock.calls.filter(([query])=>query.PageSize===200).length:partyService.getParties.mock.calls.filter(([query])=>query.PageSize===200).length;
    const initialCalls=firstPageCalls();fireEvent.focus(input);fireEvent.click(screen.getByRole("button",{name:`Create new ${kind}`}));
    if(isCategory){fireEvent.change(await screen.findByLabelText(/Category Name/),{target:{value:created.name}});fireEvent.click(screen.getByRole("button",{name:"Create Category"}));}
    else{fireEvent.change(await screen.findByLabelText(/Party Code/),{target:{value:"NEW"}});fireEvent.change(screen.getByLabelText(/Party Name/),{target:{value:created.partyName}});fireEvent.click(screen.getByRole("button",{name:kind==="customer"?"Create Customer":"Create Supplier"}));}
    await waitFor(()=>expect(store.getState()[testCase.slice].filters[testCase.field]).toBe(testCase.late));
    expect(store.getState()[testCase.slice].pageNumber).toBe(1);expect(firstPageCalls()).toBe(initialCalls);
    await waitFor(()=>expect(input.value).toBe(isCategory?created.name:created.partyName));
    expect(input.getAttribute("aria-expanded")).toBe("false");
    await waitFor(()=>expect(document.activeElement).toBe(input));
  });
});
