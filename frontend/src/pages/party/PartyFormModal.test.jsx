// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import PartyFormModal from "./PartyFormModal";
import { PARTY_COMMAND_FIELDS, PARTY_SETTINGS_COMMAND_FIELDS, PARTY_SETTINGS_SECTIONS } from "./partyColumns";
import { CompanyDraftScopeContext } from "../../hooks/companyDraftScopeContext";
import { partyService } from "./partyService";

vi.mock("./partyService", () => ({ partyService: { getPartySettings: vi.fn() } }));
const settings={enablePartyGrouping:true,enableShippingAddress:false,printShippingAddress:false,enablePartyStatus:false};
const scope="test-account-company";
const renderForm=props=>render(<Provider store={configureStore({reducer:{partyGst:()=>({config:{loaded:true,available:false},verify:{}})}})}><CompanyDraftScopeContext.Provider value={scope}><PartyFormModal isOpen fields={PARTY_COMMAND_FIELDS} onSubmit={vi.fn()} onClose={vi.fn()} {...props}/></CompanyDraftScopeContext.Provider></Provider>);
beforeEach(()=>{sessionStorage.clear();localStorage.clear();partyService.getPartySettings.mockResolvedValue({data:settings});vi.spyOn(window,"confirm").mockReturnValue(false);Element.prototype.scrollIntoView=vi.fn();});
afterEach(()=>{cleanup();vi.restoreAllMocks();});

describe("Party forms with supported settings and scoped recovery",()=>{
  it("offers scoped recovery explicitly and guards close after restored changes",async()=>{
    sessionStorage.setItem(`cosmos:draft:${scope}:party:create%3ACustomer`,JSON.stringify({version:2,values:{partyCode:"DRAFT",partyName:"Recovered buyer",partyType:"Customer"}}));
    const onClose=vi.fn();renderForm({source:{partyType:"Customer"},onClose});
    expect(screen.getByLabelText(/Party Code/).value).toBe("");
    fireEvent.click(screen.getByText("Restore and review"));
    expect(screen.getByLabelText(/Party Code/).value).toBe("DRAFT");
    expect(screen.getByLabelText(/Party Type/).textContent).toContain("Customer");
    fireEvent.click(screen.getByRole("button",{name:"Cancel"}));
    expect(window.confirm).toHaveBeenCalled();expect(onClose).not.toHaveBeenCalled();
  });
  it("preserves historical shipping and status when settings disable editing",async()=>{
    const onSubmit=vi.fn().mockResolvedValue({});renderForm({mode:"edit",source:{id:"buyer-guid",partyCode:"BUY",partyName:"Buyer",partyType:"Customer",billingAddressLine1:"Old billing",shippingAddressLine1:"Stored warehouse",isActive:false},onSubmit});
    await waitFor(()=>expect(partyService.getPartySettings).toHaveBeenCalled());
    expect(screen.getByLabelText("Shipping Address Line1").disabled).toBe(true);
    expect(screen.getByLabelText(/Is Active/).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Billing Address Line1"),{target:{value:"New billing"}});
    fireEvent.click(screen.getByRole("button",{name:"Save"}));
    await waitFor(()=>expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toMatchObject({shippingAddressLine1:"Stored warehouse",billingAddressLine1:"New billing",isActive:false,partyType:"Customer"});
  });
  it("keeps unsupported settings unavailable and preserves their stored values",async()=>{
    const onSubmit=vi.fn().mockResolvedValue({});renderForm({mode:"settings",fields:PARTY_SETTINGS_COMMAND_FIELDS,sections:PARTY_SETTINGS_SECTIONS,source:{enableLoyaltyPoints:true,enablePaymentReminder:true,reminderDays:7},onSubmit});
    expect(screen.getByLabelText("Enable Loyalty Points").disabled).toBe(true);
    expect(screen.getByLabelText("Enable Payment Reminder").disabled).toBe(true);
    expect(screen.getByLabelText("Enable Party Grouping").disabled).toBe(false);
    fireEvent.click(screen.getByRole("button",{name:"Save"}));
    await waitFor(()=>expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toMatchObject({enableLoyaltyPoints:true,enablePaymentReminder:true,reminderDays:7});
  });
  it("leaves nested or already-consumed Escape events to the owning control",()=>{
    const onClose=vi.fn();renderForm({onClose});
    const event=new KeyboardEvent("keydown",{key:"Escape",cancelable:true});event.preventDefault();window.dispatchEvent(event);expect(onClose).not.toHaveBeenCalled();
    const child=document.createElement("div");child.setAttribute("aria-modal","true");document.body.appendChild(child);
    fireEvent.keyDown(window,{key:"Escape"});expect(onClose).not.toHaveBeenCalled();child.remove();
    fireEvent.keyDown(window,{key:"Escape"});expect(onClose).toHaveBeenCalledOnce();
  });
});
