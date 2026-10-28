// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import ItemFormModal from "./ItemFormModal";
vi.mock("../../../hooks/useManufacturingPreference",()=>({default:()=>({manufacturingEnabled:false})}));
const item={name:"Reviewed item",itemCode:"ERR-1",itemType:1,categoryId:"2",unitId:"3",purchasePrice:"1",salesPrice:"2",minimumStock:"0",trackInventory:true};
beforeEach(()=>{sessionStorage.clear();localStorage.clear();Element.prototype.scrollIntoView=vi.fn();});afterEach(cleanup);
describe("Item modal actual server validation recovery",()=>{
  it("preserves input and opens stock for a server minimum-stock error",async()=>{
    const onSubmit=vi.fn().mockRejectedValue({response:{status:422,data:{errors:{MinimumStock:["Minimum stock must fit this item."]}}}});
    render(<ItemFormModal isOpen mode="create" item={item} onClose={vi.fn()} onSubmit={onSubmit} categoryOptions={[{value:"2",label:"Category"}]} unitOptions={[{value:"3",label:"Unit"}]}/>);
    fireEvent.click(screen.getByRole("button",{name:"Save Item"}));
    const summary=await screen.findByRole("button",{name:"Review Minimum stock"});fireEvent.click(summary);
    await waitFor(()=>expect(document.activeElement.name).toBe("minimumStock"));expect(screen.getByLabelText(/Item Name/).value).toBe("Reviewed item");expect(onSubmit).toHaveBeenCalledOnce();
  });
});
