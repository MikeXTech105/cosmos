// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { RegistrationForm } from "./GstRegistrationsPage";
import { gstService } from "../../services/gst/gstService";
vi.mock("../../services/gst/gstService",()=>({gstService:{saveRegistration:vi.fn()}}));
beforeEach(()=>{vi.resetAllMocks();gstService.saveRegistration.mockResolvedValue({data:{}});});afterEach(cleanup);
describe("GST registration business identity entry",()=>{
  it("derives state and preserves opaque integration IDs without requiring operators to edit them",async()=>{
    render(<RegistrationForm record={{id:"7",gstin:"24AADCG4992P1ZZ",legalName:"Seller",companyId:"9007199254740993",branchId:"9007199254740995",status:"Active"}} onClose={vi.fn()} onSaved={vi.fn()}/>);
    expect(screen.queryByLabelText("Company ID")).toBeNull();expect(screen.queryByLabelText("Branch ID")).toBeNull();expect(screen.getByLabelText("GST state").value).toBe("Gujarat");expect(screen.getByLabelText("GST state code").readOnly).toBe(true);
    fireEvent.change(screen.getByLabelText(/GSTIN/),{target:{value:"27AADCG4992P1ZZ"}});expect(screen.getByLabelText("GST state").value).toBe("Maharashtra");
    fireEvent.click(screen.getByRole("button",{name:"Save registration"}));await waitFor(()=>expect(gstService.saveRegistration).toHaveBeenCalledOnce());
    expect(gstService.saveRegistration.mock.calls[0]).toEqual(["7",expect.objectContaining({stateCode:"27",stateName:"Maharashtra",companyId:"9007199254740993",branchId:"9007199254740995"})]);
  });
  it("does not save a syntactically valid GSTIN with an unsupported state prefix",async()=>{
    render(<RegistrationForm record={{id:"7",gstin:"99AADCG4992P1ZZ",status:"Active"}} onClose={vi.fn()} onSaved={vi.fn()}/>);
    fireEvent.click(screen.getByRole("button",{name:"Save registration"}));await screen.findByText("GSTIN must begin with a supported GST state code.");expect(gstService.saveRegistration).not.toHaveBeenCalled();
  });
});
