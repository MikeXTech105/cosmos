// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import GstSnapshotPreparationPanel from "./GstSnapshotPreparationPanel";
import { gstService } from "../../services/gst/gstService";

vi.mock("../../hooks/useCapabilities",()=>({default:()=>({canView:true,canCreate:true})}));
vi.mock("../../services/gst/gstService",()=>({gstService:{snapshotPreparation:vi.fn(),prepareSnapshot:vi.fn(),preparedSnapshot:vi.fn()}}));
const preparation={source:{sourceVersion:"0x0000000000000001",sourceFingerprint:"A".repeat(64),document:{invoice:{InvoiceNumber:"INV-1",InvoiceDate:"2026-10-28",GrandTotal:"9999999999999999.99"},sellerCurrentMaster:{LegalName:"Seller",Gstin:"24AADCG4992P1ZZ",AddressLine1:"Seller current address"},buyerCurrentMaster:{PartyName:"Buyer",BillingAddressLine1:"Buyer current address"},lines:[{}]}},policyChoices:[{key:"rounding",label:"Rounding policy (proposal only)",options:[{key:"Undecided",label:"Decide later"}]},{key:"headerDiscount",label:"Invoice discount allocation (proposal only)",options:[{key:"Undecided",label:"Decide later"}]}],canIssue:false};
const open=(initial="/")=>render(<MemoryRouter initialEntries={[initial]}><GstSnapshotPreparationPanel invoiceId="9007199254740993" confirmed/></MemoryRouter>);
beforeEach(()=>{vi.resetAllMocks();gstService.snapshotPreparation.mockResolvedValue({data:preparation});});afterEach(cleanup);
describe("GST source preparation with deferred policy",()=>{
  it("requires source review and freezes only PendingPolicy proposals",async()=>{
    gstService.prepareSnapshot.mockResolvedValue({data:{id:"snapshot-key",snapshotVersion:1,status:"PendingPolicy"}});open();
    expect(gstService.snapshotPreparation).not.toHaveBeenCalled();fireEvent.click(screen.getByRole("button",{name:"Review source details"}));
    const button=await screen.findByRole("button",{name:"Freeze preparation as PendingPolicy"});expect(button.disabled).toBe(true);
    expect(screen.getByText("Buyer current address")).toBeTruthy();expect(screen.getByText(/\.99$/).textContent.replace(/[^\d.]/g,"")).toBe("9999999999999999.99");
    fireEvent.click(screen.getByRole("checkbox"));fireEvent.click(button);
    await waitFor(()=>expect(gstService.prepareSnapshot).toHaveBeenCalledOnce());
    expect(gstService.prepareSnapshot.mock.calls[0]).toEqual(["9007199254740993",{requestKey:expect.any(String),sourceVersion:preparation.source.sourceVersion,sourceFingerprint:preparation.source.sourceFingerprint,currentMasterDetailsReviewed:true,roundingCandidate:"Undecided",headerDiscountCandidate:"Undecided"}]);
    expect(await screen.findByText("PendingPolicy",{selector:"strong"})).toBeTruthy();expect(gstService.preparedSnapshot).not.toHaveBeenCalled();
  });
  it("a transport failure keeps the command for readback and does not offer another freeze",async()=>{
    gstService.prepareSnapshot.mockRejectedValue(new Error("timeout"));gstService.preparedSnapshot.mockResolvedValue({data:{id:"saved-before-timeout",snapshotVersion:1,status:"PendingPolicy"}});open();
    fireEvent.click(screen.getByRole("button",{name:"Review source details"}));await screen.findByRole("button",{name:"Freeze preparation as PendingPolicy"});fireEvent.click(screen.getByRole("checkbox"));fireEvent.click(screen.getByRole("button",{name:"Freeze preparation as PendingPolicy"}));
    const readback=await screen.findByRole("button",{name:"Check saved preparation"});await waitFor(()=>expect(readback.disabled).toBe(false));expect(screen.queryByRole("button",{name:"Freeze preparation as PendingPolicy"})).toBeNull();
    fireEvent.click(readback);await screen.findByText(/saved-before-timeout/);expect(gstService.prepareSnapshot).toHaveBeenCalledOnce();expect(gstService.preparedSnapshot).toHaveBeenCalledOnce();
  });
  it("recovers an existing command after reload with a read-only status check",async()=>{
    gstService.preparedSnapshot.mockResolvedValue({data:{id:"restored",snapshotVersion:2,status:"PendingPolicy"}});open("/?gstPreparationKey=prior-command");
    fireEvent.click(screen.getByRole("button",{name:"Check saved preparation"}));await screen.findByText(/restored/);
    expect(gstService.preparedSnapshot).toHaveBeenCalledWith("9007199254740993","prior-command");expect(gstService.prepareSnapshot).not.toHaveBeenCalled();
  });
});
