import { expenseService } from "../../../services/purchase/expenseService";
import { createPurchaseCrudSlice } from "./purchaseSliceFactory";

const resource = createPurchaseCrudSlice({
  entityKey: "expense",
  initialFilters: {
    Search: "",
    CategoryId: "all",
    FromDate: "",
    ToDate: "",
    SortBy: "",
    SortDirection: "",
  },
  name: "expenses",
  service: expenseService,
  serviceMethods: {
    create: "createExpense",
    delete: "deleteExpense",
    detail: "getExpenseById",
    list: "getExpenses",
    update: "updateExpense",
  },
});

export const fetchExpenses = resource.fetchList;
export const fetchExpenseById = resource.fetchById;
export const createExpense = resource.createRecord;
export const updateExpense = resource.updateRecord;
export const deleteExpense = resource.deleteRecord;

export const {
  clearError: clearExpenseError,
  setFilters: setExpenseFilters,
  setPage: setExpensePage,
  setPageSize: setExpensePageSize,
  setSelected: setSelectedExpense,
} = resource.actions;

export default resource.reducer;
