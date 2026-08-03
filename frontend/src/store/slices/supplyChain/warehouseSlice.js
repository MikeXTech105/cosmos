import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { supplyChainWarehouseService } from "../../../services/supplyChain/warehouseService";
import {
  addSupplyChainListCases,
  createSupplyChainListState,
  getSupplyChainThunkError,
  setSupplyChainFilters,
  setSupplyChainPage,
  setSupplyChainPageSize,
} from "./supplyChainSliceUtils";

const initialState = createSupplyChainListState({
  ChannelId: "",
  City: "",
  IsActive: "",
  Search: "",
  SortBy: "",
  SortDirection: "",
  State: "",
});

export const fetchSupplyChainWarehouses = createAsyncThunk(
  "supplyChainWarehouses/fetchList",
  async (params, { rejectWithValue }) => {
    try {
      return await supplyChainWarehouseService.list(params);
    } catch (error) {
      return rejectWithValue(
        getSupplyChainThunkError(error, "Unable to load warehouses."),
      );
    }
  },
);

const slice = createSlice({
  name: "supplyChainWarehouses",
  initialState,
  reducers: {
    setWarehouseFilters: setSupplyChainFilters,
    setWarehousePage: setSupplyChainPage,
    setWarehousePageSize: setSupplyChainPageSize,
  },
  extraReducers: (builder) => {
    addSupplyChainListCases(builder, fetchSupplyChainWarehouses);
  },
});

export const {
  setWarehouseFilters,
  setWarehousePage,
  setWarehousePageSize,
} = slice.actions;

export default slice.reducer;
