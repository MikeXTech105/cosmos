import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { supplyChainPackagingProfileService } from "../../../services/supplyChain/packagingProfileService";
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
  IsDefault: "",
  ItemId: "",
  Search: "",
  SortBy: "",
  SortDirection: "",
});

export const fetchSupplyChainPackagingProfiles = createAsyncThunk(
  "supplyChainPackagingProfiles/fetchList",
  async (params, { rejectWithValue }) => {
    try {
      return await supplyChainPackagingProfileService.list(params);
    } catch (error) {
      return rejectWithValue(
        getSupplyChainThunkError(error, "Unable to load packaging profiles."),
      );
    }
  },
);

const slice = createSlice({
  name: "supplyChainPackagingProfiles",
  initialState,
  reducers: {
    setPackagingFilters: setSupplyChainFilters,
    setPackagingPage: setSupplyChainPage,
    setPackagingPageSize: setSupplyChainPageSize,
  },
  extraReducers: (builder) => {
    addSupplyChainListCases(builder, fetchSupplyChainPackagingProfiles);
  },
});

export const {
  setPackagingFilters,
  setPackagingPage,
  setPackagingPageSize,
} = slice.actions;

export default slice.reducer;
