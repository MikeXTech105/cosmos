// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { createMemoryRouter, Outlet, RouterProvider, useLocation } from "react-router-dom";
import PartyPage from "./PartyPage";
import PartyFormPage from "./PartyFormPage";
import { partyService } from "./partyService";
import gstReducer from "../../store/slices/party/gstSlice";
import { CompanyDraftScopeContext } from "../../hooks/companyDraftScopeContext";
import DirtyWorkRouteGuard from "../../components/common/DirtyWorkRouteGuard";
import { readListReturnSnapshot } from "../../utils/listReturnContext";

vi.mock("./partyService",()=>({partyService:{getParties:vi.fn(),getPartyById:vi.fn(),createParty:vi.fn(),updateParty:vi.fn(),getPartySettings:vi.fn()}}));
const scope="party-return-account-company",savedId="41078b23-0367-49ee-ac8b-9492b5821bb4",newId="57eb0d8c-b235-40f4-b442-bf4760f24ce5";
const origin="/party?review=retained";
let currentParty;
const deferred=()=>{let resolve;const promise=new Promise(done=>{resolve=done;});return{promise,resolve};};
const GuardLayout=()=>{const location=useLocation();return <><DirtyWorkRouteGuard/><output data-testid="route">{location.pathname}{location.search}</output><Outlet/></>;};
function mount() {
  const auth={roles:[],user:{id:1},pages:[{pageName:"Party",name:"Party",route:"/party",canView:true,canCreate:true,canEdit:true,canDelete:false,canExport:false,canApprove:false}]};
  const base=gstReducer(undefined,{type:"@init"});
  const store=configureStore({reducer:{auth:()=>auth,partyGst:gstReducer},preloadedState:{partyGst:{...base,config:{...base.config,loaded:true,available:false}}}});
  const router=createMemoryRouter([{element:<GuardLayout/>,children:[{path:"/party",element:<PartyPage/>},{path:"/party/new",element:<PartyFormPage/>},{path:"/party/:id/edit",element:<PartyFormPage/>}]}],{initialEntries:[origin]});
  render(<Provider store={store}><CompanyDraftScopeContext.Provider value={scope}><RouterProvider router={router}/></CompanyDraftScopeContext.Provider></Provider>);
  return router;
}
const choose=async(label,name)=>{fireEvent.click(screen.getByRole("combobox",{name:label}));fireEvent.click(await screen.findByRole("option",{name}));};
async function prepareList() {
  await screen.findByRole("tab",{name:/Customers/});
  fireEvent.change(screen.getByLabelText("Search parties"),{target:{value:"Buyer"}});
  await waitFor(()=>expect(partyService.getParties).toHaveBeenLastCalledWith(expect.objectContaining({Search:"Buyer"}),expect.any(Object)));
  fireEvent.click(screen.getByRole("tab",{name:/Customers/}));
  await choose("Filter parties by status","Active");await choose("Filter parties by credit limit","With credit limit");await choose("Filter parties by GST","With GSTIN");await choose("Rows per page","25");
  await waitFor(()=>expect(screen.getByRole("button",{name:"Next page"}).disabled).toBe(false));fireEvent.click(screen.getByRole("button",{name:"Next page"}));
  await waitFor(()=>expect(partyService.getParties).toHaveBeenLastCalledWith(expect.objectContaining({PageNumber:2}),expect.any(Object)));
  await waitFor(()=>expect(screen.getByRole("button",{name:"Next page"}).disabled).toBe(false));fireEvent.click(screen.getByRole("button",{name:"Next page"}));
  await waitFor(()=>expect(partyService.getParties).toHaveBeenLastCalledWith(expect.objectContaining({PageNumber:3,PageSize:25,Search:"Buyer",PartyType:"Customer",IsActive:true,HasCreditLimit:true,HasGstin:true}),expect.any(Object)));
  await waitFor(()=>expect(screen.getByRole("button",{name:"Next page"}).disabled).toBe(false));
}
async function expectRetained() {
  await waitFor(()=>expect(screen.getByTestId("route").textContent).toBe(origin));
  await waitFor(()=>expect(partyService.getParties).toHaveBeenLastCalledWith(expect.objectContaining({PageNumber:3,PageSize:25,Search:"Buyer",PartyType:"Customer",IsActive:true,HasCreditLimit:true,HasGstin:true}),expect.any(Object)));
  await act(async()=>new Promise(resolve=>setTimeout(resolve,400)));
  expect(screen.getByLabelText("Search parties").value).toBe("Buyer");expect(screen.getByRole("tab",{name:/Customers/}).getAttribute("aria-selected")).toBe("true");
  expect(partyService.getParties.mock.calls.at(-1)[0].PageNumber).toBe(3);
  await waitFor(()=>expect(window.scrollTo).toHaveBeenCalledWith(expect.objectContaining({left:0,top:640})));
}
beforeEach(()=>{
  vi.resetAllMocks();sessionStorage.clear();localStorage.clear();vi.spyOn(window,"confirm").mockReturnValue(false);vi.spyOn(window,"scrollTo").mockImplementation(()=>{});vi.stubGlobal("requestAnimationFrame",callback=>setTimeout(callback,0));vi.stubGlobal("cancelAnimationFrame",id=>clearTimeout(id));Element.prototype.scrollIntoView=vi.fn();HTMLElement.prototype.scrollTo=vi.fn();Object.defineProperty(window,"scrollY",{configurable:true,value:640});
  currentParty={id:savedId,partyCode:"BUYER",partyName:"Buyer existing",partyType:"Customer",isActive:true,gstin:"24AADCG4992P1ZZ",creditLimit:100,openingBalance:0,openingBalanceType:0,creditPeriodDays:0,gstTreatment:1};
  partyService.getPartySettings.mockResolvedValue({data:{enablePartyGrouping:true,enableShippingAddress:true,enablePartyStatus:true}});
  partyService.getPartyById.mockImplementation(async id=>({data:{...currentParty,id}}));
  partyService.getParties.mockImplementation(async query=>({data:{items:[currentParty],pageNumber:query.PageNumber,pageSize:query.PageSize,totalCount:300,totalPages:Math.ceil(300/query.PageSize),summary:{allCount:300,customerCount:250,supplierCount:50,bothCount:0}}}));
});
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals();});

describe("Party captured list → authoritative form save → retained return",()=>{
  // Two full route roundtrips retain real debounce-settling windows and all per-step assertions.
  it("retains the full query/page/scroll after edit and consumes the saved-row highlight once",async()=>{
    const pending=deferred();partyService.updateParty.mockImplementation(async(id,payload)=>{await pending.promise;currentParty={...currentParty,...payload,id};return{data:currentParty};});
    mount();await prepareList();fireEvent.click(screen.getAllByRole("button",{name:"Edit Party"})[0]);
    await screen.findByRole("button",{name:"Save Changes"});fireEvent.change(screen.getByLabelText(/Party Name/),{target:{value:"Buyer revised"}});fireEvent.click(screen.getByRole("button",{name:"Save Changes"}));
    await waitFor(()=>expect(partyService.updateParty).toHaveBeenCalledOnce());expect(screen.getByTestId("route").textContent).toBe(`/party/${savedId}/edit`);expect(readListReturnSnapshot(scope,"party").highlight).toBeUndefined();
    await act(async()=>pending.resolve());await expectRetained();
    expect(document.querySelector(`tr[data-record-id="${savedId}"]`)?.getAttribute("data-saved-highlight")).toBe("true");expect(screen.getByText(/The saved Party is highlighted below/)).toBeTruthy();expect(readListReturnSnapshot(scope,"party").highlight).toBeUndefined();expect(window.confirm).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button",{name:"Add Party"}));await screen.findByRole("button",{name:"Create Party"});fireEvent.click(screen.getByRole("button",{name:"Cancel"}));await expectRetained();expect(document.querySelector('[data-saved-highlight="true"]')).toBeNull();expect(screen.queryByText(/Party saved/)).toBeNull();
  },10000);
  it("returns a created Party outside the filter without resetting the originating list",async()=>{
    const pending=deferred();partyService.createParty.mockImplementation(async payload=>{await pending.promise;return{data:{...payload,id:newId}};});mount();await prepareList();fireEvent.click(screen.getByRole("button",{name:"Add Party"}));
    await screen.findByRole("button",{name:"Create Party"});fireEvent.change(screen.getByLabelText(/Party Code/),{target:{value:"VENDOR"}});fireEvent.change(screen.getByLabelText(/Party Name/),{target:{value:"Outside vendor"}});await choose(/Party Type/,"Supplier");fireEvent.click(screen.getByRole("button",{name:"Create Party"}));
    await waitFor(()=>expect(partyService.createParty).toHaveBeenCalledOnce());expect(screen.getByTestId("route").textContent).toBe("/party/new");expect(readListReturnSnapshot(scope,"party").highlight).toBeUndefined();
    await act(async()=>pending.resolve());await expectRetained();expect(screen.getByText(/It is outside the current filtered page/)).toBeTruthy();expect(document.querySelector('[data-saved-highlight="true"]')).toBeNull();expect(window.confirm).not.toHaveBeenCalled();
  });
  it("keeps the edited values and scoped draft after a404 save failure",async()=>{
    partyService.updateParty.mockRejectedValue(Object.assign(new Error("Party no longer exists"),{response:{status:404,data:{message:"Party no longer exists"}}}));mount();await prepareList();fireEvent.click(screen.getAllByRole("button",{name:"Edit Party"})[0]);await screen.findByRole("button",{name:"Save Changes"});fireEvent.change(screen.getByLabelText(/Party Name/),{target:{value:"Buyer unsaved"}});fireEvent.click(screen.getByRole("button",{name:"Save Changes"}));
    await waitFor(()=>expect(partyService.updateParty).toHaveBeenCalledOnce());await waitFor(()=>expect(screen.getByRole("button",{name:"Save Changes"}).disabled).toBe(false));expect(screen.getByTestId("route").textContent).toBe(`/party/${savedId}/edit`);expect(screen.getByLabelText(/Party Name/).value).toBe("Buyer unsaved");
    await waitFor(()=>expect(JSON.parse(localStorage.getItem(`cosmos:draft:${scope}:party:edit%3A${savedId}`))?.values.partyName).toBe("Buyer unsaved"));expect(readListReturnSnapshot(scope,"party").highlight).toBeUndefined();fireEvent.click(screen.getByRole("button",{name:"Cancel"}));await waitFor(()=>expect(window.confirm).toHaveBeenCalled());expect(screen.getByTestId("route").textContent).toBe(`/party/${savedId}/edit`);
  });
  it("returns to the captured query and position when an edit source no longer exists",async()=>{
    partyService.getPartyById.mockRejectedValue(Object.assign(new Error("Party missing"),{response:{status:404}}));mount();await prepareList();fireEvent.click(screen.getAllByRole("button",{name:"Edit Party"})[0]);await waitFor(()=>expect(partyService.getPartyById).toHaveBeenCalled());await expectRetained();expect(readListReturnSnapshot(scope,"party").highlight).toBeUndefined();expect(screen.queryByText(/Party saved/)).toBeNull();expect(partyService.updateParty).not.toHaveBeenCalled();
  });
});
