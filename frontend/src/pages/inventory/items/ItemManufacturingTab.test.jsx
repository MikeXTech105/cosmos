// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProductionEditor } from "./ItemManufacturingTab";
import { manufacturingBomService, manufacturingProductionService } from "../../../services/manufacturing/manufacturingService";

vi.mock("../../../services/manufacturing/manufacturingService",()=>({manufacturingBomService:{applicable:vi.fn()},manufacturingProductionService:{create:vi.fn(),update:vi.fn()}}));
const bom=(id,version)=>({id,version,status:2,components:[{id:1,componentItemName:`Material ${version}`,quantity:"1",wastagePercentage:0}]});
const deferred=()=>{let resolve;const promise=new Promise(done=>{resolve=done;});return{resolve,promise};};
beforeEach(()=>vi.resetAllMocks());afterEach(cleanup);
describe("Legacy production date and effective BOM",()=>{
  it("clears stale BOM selection immediately and ignores an older date response",async()=>{
    const first=deferred(),second=deferred();
    manufacturingBomService.applicable.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    manufacturingProductionService.create.mockResolvedValue({data:{id:8}});
    render(<ProductionEditor open businessDate="2026-10-28" applicableBom={bom("1","TODAY")} boms={[]} item={{id:"9007199254740993",name:"Product"}} onClose={vi.fn()} onSaved={vi.fn()}/>);
    fireEvent.click(screen.getByLabelText(/Production date/));fireEvent.click(screen.getByRole("gridcell",{name:"29 October 2026"}));
    expect(screen.getByRole("button",{name:"Save production draft"}).disabled).toBe(true);
    fireEvent.click(screen.getByLabelText(/Production date/));fireEvent.click(screen.getByRole("gridcell",{name:"30 October 2026"}));
    await act(async()=>second.resolve({data:bom("9007199254740995","CURRENT")}));
    await act(async()=>first.resolve({data:bom("2","STALE")}));
    expect(screen.getByLabelText(/BOM version/).textContent).toContain("CURRENT");
    expect(screen.queryByText("Material STALE")).toBeNull();
    fireEvent.change(screen.getByLabelText(/Planned quantity/),{target:{value:"9999999999999999.123456"}});
    fireEvent.change(screen.getByLabelText(/Produced quantity/),{target:{value:"0.000001"}});
    fireEvent.click(screen.getByRole("button",{name:"Save production draft"}));
    await waitFor(()=>expect(manufacturingProductionService.create).toHaveBeenCalledOnce());
    const payload=manufacturingProductionService.create.mock.calls[0][0];
    expect(String(payload.bomId)).toBe("9007199254740995");expect(String(payload.plannedQuantity)).toBe("9999999999999999.123456");
    expect(payload.productionDate).toBe("2026-10-30");
  });
  it("keeps the saved production BOM snapshot when editing historical dates",()=>{
    render(<ProductionEditor open businessDate="2026-10-28" applicableBom={bom("17","HISTORICAL")} boms={[]} item={{id:"1"}} production={{bomId:"17",productionDate:"2026-10-20",plannedQuantity:"2",producedQuantity:"2"}} onClose={vi.fn()} onSaved={vi.fn()}/>);
    fireEvent.click(screen.getByLabelText(/Production date/));fireEvent.click(screen.getByRole("gridcell",{name:"21 October 2026"}));
    expect(manufacturingBomService.applicable).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/BOM version/).textContent).toContain("HISTORICAL");
  });
});
