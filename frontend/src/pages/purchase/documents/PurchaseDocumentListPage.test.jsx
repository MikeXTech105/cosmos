import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { MemoryRouter } from "react-router-dom";
import PurchaseDocumentListPage from "./PurchaseDocumentListPage";
import { purchaseDocumentConfigs } from "./documentConfigs";
import bills from "../../../store/slices/purchase/purchaseBillSlice";
vi.mock("../../../hooks/useCapabilities",()=>({default:()=>({canView:true,canCreate:true,canUpdate:true,canDelete:true,canConfirm:true,canCancel:true,canConvert:true})}));
const view=(kind,record)=>{
  const config=purchaseDocumentConfigs[kind];const state={...bills(undefined,{type:"@init"}),list:[{id:1,supplierName:"Supplier",billNo:"B1",orderNo:"O1",returnNo:"R1",...record}],totalCount:1};
  const store=configureStore({reducer:()=>({[config.selectorKey]:state,auth:{pages:[],roles:[],user:{}}})});
  return renderToStaticMarkup(<Provider store={store}><MemoryRouter><PurchaseDocumentListPage config={config}/></MemoryRouter></Provider>);
};
describe("Purchase list lifecycle actions",()=>{
  it.each([
    ["bills",{status:1},["Edit","Confirm","Cancel"],[]],
    ["bills",{status:2},["Cancel"],["Edit","Confirm"]],
    ["bills",{status:5},[],["Edit","Confirm","Cancel"]],
    ["orders",{status:2},["Edit","Cancel","Convert to Bill"],[]],
    ["orders",{status:3},["Convert to Bill"],["Edit","Cancel"]],
    ["orders",{status:4},[],["Edit","Cancel","Convert to Bill"]],
    ["returns",{status:1,physicalReceiptReturnId:9},[],["Edit"]],
  ])("%s state %j exposes only supported lifecycle actions",(kind,record,shown,hidden)=>{
    const html=view(kind,record);for(const action of shown)expect(html).toContain(`aria-label="${action}"`);for(const action of hidden)expect(html).not.toContain(`aria-label="${action}"`);
  });
});
