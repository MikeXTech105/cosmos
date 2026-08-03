import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { supplyChainChannelService } from "../../../services/supplyChain/channelService";
import {
  addSupplyChainListCases,
  createSupplyChainListState,
  getSupplyChainThunkError,
  setSupplyChainFilters,
  setSupplyChainPage,
  setSupplyChainPageSize,
} from "./supplyChainSliceUtils";

const initialState = createSupplyChainListState({
  IsActive: "",
  Search: "",
  SortBy: "",
  SortDirection: "",
});

export const fetchSupplyChainChannels = createAsyncThunk(
  "supplyChainChannels/fetchList",
  async (params, { rejectWithValue }) => {
    try {
      return await supplyChainChannelService.list(params);
    } catch (error) {
      return rejectWithValue(
        getSupplyChainThunkError(error, "Unable to load channels."),
      );
    }
  },
);

const slice = createSlice({
  name: "supplyChainChannels",
  initialState,
  reducers: {
    setChannelFilters: setSupplyChainFilters,
    setChannelPage: setSupplyChainPage,
    setChannelPageSize: setSupplyChainPageSize,
  },
  extraReducers: (builder) => {
    addSupplyChainListCases(builder, fetchSupplyChainChannels);
  },
});

export const { setChannelFilters, setChannelPage, setChannelPageSize } =
  slice.actions;

export default slice.reducer;
