import { purchaseReturnService } from "../../../services/purchase/purchaseReturnService";
import { createPurchaseCrudSlice } from "./purchaseSliceFactory";

const resource = createPurchaseCrudSlice({
  entityKey: "purchaseReturn",
  initialFilters: {
    Search: "",
    SupplierId: "all",
    FromDate: "",
    ToDate: "",
    SortBy: "",
    SortDirection: "",
  },
  name: "purchaseReturns",
  service: purchaseReturnService,
  serviceMethods: {
    create: "createPurchaseReturn",
    delete: "deletePurchaseReturn",
    detail: "getPurchaseReturnById",
    list: "getPurchaseReturns",
    update: "updatePurchaseReturn",
  },
});

export const fetchPurchaseReturns = resource.fetchList;
export const fetchPurchaseReturnById = resource.fetchById;
export const createPurchaseReturn = resource.createRecord;
export const updatePurchaseReturn = resource.updateRecord;
export const deletePurchaseReturn = resource.deleteRecord;

export const {
  clearError: clearPurchaseReturnError,
  setFilters: setPurchaseReturnFilters,
  setPage: setPurchaseReturnPage,
  setPageSize: setPurchaseReturnPageSize,
  setSelected: setSelectedPurchaseReturn,
} = resource.actions;

export default resource.reducer;
