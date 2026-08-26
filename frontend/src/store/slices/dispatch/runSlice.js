import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { dispatchRunService } from "../../../services/dispatch";
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
});

export const fetchDispatchRuns = createAsyncThunk(
  "dispatchRuns/fetchList",
  async (params, { rejectWithValue }) => {
    try {
      return await dispatchRunService.list(params);
    } catch (error) {
      return rejectDispatchThunk(
        error,
        rejectWithValue,
        "Unable to load planning runs.",
      );
    }
  },
);

const slice = createSlice({
  name: "dispatchRuns",
  initialState,
  reducers: {
    setRunFilters: setDispatchFilters,
    setRunPage: setDispatchPage,
    setRunPageSize: setDispatchPageSize,
  },
  extraReducers: (builder) => addDispatchListCases(builder, fetchDispatchRuns),
});

export const { setRunFilters, setRunPage, setRunPageSize } = slice.actions;
export default slice.reducer;
