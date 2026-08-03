import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { supplyChainItemMappingService } from "../../../services/supplyChain/itemMappingService";
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
  IsActive: "",
  IsPrimary: "",
  ItemId: "",
  Search: "",
  SortBy: "",
  SortDirection: "",
});

export const fetchSupplyChainItemMappings = createAsyncThunk(
  "supplyChainItemMappings/fetchList",
  async (params, { rejectWithValue }) => {
    try {
      return await supplyChainItemMappingService.list(params);
    } catch (error) {
      return rejectWithValue(
        getSupplyChainThunkError(error, "Unable to load item mappings."),
      );
    }
  },
);

const slice = createSlice({
  name: "supplyChainItemMappings",
  initialState,
  reducers: {
    setItemMappingFilters: setSupplyChainFilters,
    setItemMappingPage: setSupplyChainPage,
    setItemMappingPageSize: setSupplyChainPageSize,
  },
  extraReducers: (builder) => {
    addSupplyChainListCases(builder, fetchSupplyChainItemMappings);
  },
});

export const {
  setItemMappingFilters,
  setItemMappingPage,
  setItemMappingPageSize,
} = slice.actions;

export default slice.reducer;
