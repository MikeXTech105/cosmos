import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { dispatchReportService } from "../../../services/dispatch";
import {
  addDispatchListCases,
  createDispatchListState,
  rejectDispatchThunk,
  setDispatchFilters,
  setDispatchPage,
  setDispatchPageSize,
} from "./dispatchSliceUtils";

const initialState = createDispatchListState({
  ChannelId: "",
  FromDate: "",
  Status: "",
  ToDate: "",
  WarehouseId: "",
});

export const fetchDispatchReports = createAsyncThunk(
  "dispatchReports/fetchList",
  async (params, { rejectWithValue }) => {
    try {
      return await dispatchReportService.list(params);
    } catch (error) {
      return rejectDispatchThunk(
        error,
        rejectWithValue,
        "Unable to load dispatch recommendations.",
      );
    }
  },
);

const slice = createSlice({
  name: "dispatchReports",
  initialState,
  reducers: {
    setReportFilters: setDispatchFilters,
    setReportPage: setDispatchPage,
    setReportPageSize: setDispatchPageSize,
  },
  extraReducers: (builder) => addDispatchListCases(builder, fetchDispatchReports),
});

export const { setReportFilters, setReportPage, setReportPageSize } =
  slice.actions;
export default slice.reducer;
