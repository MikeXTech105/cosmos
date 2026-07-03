import { supplierPaymentService } from "../../../services/purchase/supplierPaymentService";
import { createPurchaseCrudSlice } from "./purchaseSliceFactory";

const resource = createPurchaseCrudSlice({
  entityKey: "supplierPayment",
  initialFilters: {
    Search: "",
    SupplierId: "all",
    FromDate: "",
    ToDate: "",
    SortBy: "",
    SortDirection: "",
  },
  name: "supplierPayments",
  service: supplierPaymentService,
  serviceMethods: {
    create: "createSupplierPayment",
    delete: "deleteSupplierPayment",
    detail: "getSupplierPaymentById",
    list: "getSupplierPayments",
    update: "updateSupplierPayment",
  },
});

export const fetchSupplierPayments = resource.fetchList;
export const fetchSupplierPaymentById = resource.fetchById;
export const createSupplierPayment = resource.createRecord;
export const updateSupplierPayment = resource.updateRecord;
export const deleteSupplierPayment = resource.deleteRecord;

export const {
  clearError: clearSupplierPaymentError,
  setFilters: setSupplierPaymentFilters,
  setPage: setSupplierPaymentPage,
  setPageSize: setSupplierPaymentPageSize,
  setSelected: setSelectedSupplierPayment,
} = resource.actions;

export default resource.reducer;
