import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { shipmentReportService } from "../../../services/shipments";
import {
  addShipmentListCases,
  createShipmentListState,
  rejectShipmentThunk,
  setShipmentFilters,
  setShipmentPage,
  setShipmentPageSize,
} from "./shipmentSliceUtils";

const initialState = createShipmentListState({
  ChannelId: "",
  FromDate: "",
  Status: "",
  ToDate: "",
  WarehouseId: "",
});

export const fetchShipmentReports = createAsyncThunk(
  "shipmentReports/fetchList",
  async (params, { rejectWithValue }) => {
    try {
      return await shipmentReportService.list(params);
    } catch (error) {
      return rejectShipmentThunk(
        error,
        rejectWithValue,
        "Unable to load shipment reports.",
      );
    }
  },
);

const slice = createSlice({
  name: "shipmentReports",
  initialState,
  reducers: {
    setShipmentReportFilters: setShipmentFilters,
    setShipmentReportPage: setShipmentPage,
    setShipmentReportPageSize: setShipmentPageSize,
  },
  extraReducers: (builder) =>
    addShipmentListCases(builder, fetchShipmentReports),
});

export const {
  setShipmentReportFilters,
  setShipmentReportPage,
  setShipmentReportPageSize,
} = slice.actions;
export default slice.reducer;

