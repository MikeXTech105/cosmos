import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { shipmentService } from "../../../services/shipments";
import {
  addShipmentListCases,
  createShipmentListState,
  rejectShipmentThunk,
  setShipmentFilters as applyShipmentFilters,
  setShipmentPage as applyShipmentPage,
  setShipmentPageSize as applyShipmentPageSize,
} from "./shipmentSliceUtils";

const initialState = createShipmentListState({
  ChannelId: "",
  FromDate: "",
  Search: "",
  SourceType: "",
  Status: "",
  ToDate: "",
  WarehouseId: "",
});

export const fetchShipments = createAsyncThunk(
  "shipments/fetchList",
  async (params, { rejectWithValue }) => {
    try {
      return await shipmentService.list(params);
    } catch (error) {
      return rejectShipmentThunk(
        error,
        rejectWithValue,
        "Unable to load shipments.",
      );
    }
  },
);

const slice = createSlice({
  name: "shipments",
  initialState,
  reducers: {
    setShipmentFilters: applyShipmentFilters,
    setShipmentPage: applyShipmentPage,
    setShipmentPageSize: applyShipmentPageSize,
  },
  extraReducers: (builder) => addShipmentListCases(builder, fetchShipments),
});

export const {
  setShipmentFilters,
  setShipmentPage,
  setShipmentPageSize,
} = slice.actions;
export default slice.reducer;
