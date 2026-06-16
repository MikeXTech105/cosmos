import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import categoryReducer from "./slices/categorySlice";
import itemReducer from "./slices/itemSlice";
import sidebarReducer from "./slices/sidebarSlice";
import unitReducer from "./slices/unitSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    categories: categoryReducer,
    items: itemReducer,
    sidebar: sidebarReducer,
    units: unitReducer,
  },
});
