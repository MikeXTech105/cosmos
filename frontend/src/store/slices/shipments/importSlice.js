import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { shipmentImportService } from "../../../services/shipments";
import {
  addShipmentListCases,
  createShipmentListState,
  rejectShipmentThunk,
  setShipmentFilters,
  setShipmentPage,
  setShipmentPageSize,
} from "./shipmentSliceUtils";

const initialState = createShipmentListState({
  Status: "",
});

export const fetchShipmentImports = createAsyncThunk(
  "shipmentImports/fetchList",
  async (params, { rejectWithValue }) => {
    try {
      return await shipmentImportService.list(params);
    } catch (error) {
      return rejectShipmentThunk(
        error,
        rejectWithValue,
        "Unable to load shipment imports.",
      );
    }
  },
);

const slice = createSlice({
  name: "shipmentImports",
  initialState,
  reducers: {
    setShipmentImportFilters: setShipmentFilters,
    setShipmentImportPage: setShipmentPage,
    setShipmentImportPageSize: setShipmentPageSize,
  },
  extraReducers: (builder) =>
    addShipmentListCases(builder, fetchShipmentImports),
});

export const {
  setShipmentImportFilters,
  setShipmentImportPage,
  setShipmentImportPageSize,
} = slice.actions;
export default slice.reducer;

