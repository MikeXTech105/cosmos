import { expenseCategoryService } from "../../../services/purchase/expenseCategoryService";
import { createPurchaseCrudSlice } from "./purchaseSliceFactory";

const resource = createPurchaseCrudSlice({
  entityKey: "expenseCategory",
  initialFilters: {
    Search: "",
    IsActive: "all",
    SortBy: "",
    SortDirection: "",
  },
  name: "expenseCategories",
  service: expenseCategoryService,
  serviceMethods: {
    create: "createExpenseCategory",
    delete: "deleteExpenseCategory",
    detail: "getExpenseCategoryById",
    list: "getExpenseCategories",
    update: "updateExpenseCategory",
  },
});

export const fetchExpenseCategories = resource.fetchList;
export const fetchExpenseCategoryById = resource.fetchById;
export const createExpenseCategory = resource.createRecord;
export const updateExpenseCategory = resource.updateRecord;
export const deleteExpenseCategory = resource.deleteRecord;

export const {
  clearError: clearExpenseCategoryError,
  setFilters: setExpenseCategoryFilters,
  setPage: setExpenseCategoryPage,
  setPageSize: setExpenseCategoryPageSize,
  setSelected: setSelectedExpenseCategory,
} = resource.actions;

export default resource.reducer;
