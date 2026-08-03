import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { dispatchImportService } from "../../../services/dispatch";
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
  ImportType: "",
  Status: "",
});

export const fetchDispatchImports = createAsyncThunk(
  "dispatchImports/fetchList",
  async (params, { rejectWithValue }) => {
    try {
      return await dispatchImportService.list(params);
    } catch (error) {
      return rejectDispatchThunk(
        error,
        rejectWithValue,
        "Unable to load dispatch imports.",
      );
    }
  },
);

const slice = createSlice({
  name: "dispatchImports",
  initialState,
  reducers: {
    setImportFilters: setDispatchFilters,
    setImportPage: setDispatchPage,
    setImportPageSize: setDispatchPageSize,
  },
  extraReducers: (builder) => addDispatchListCases(builder, fetchDispatchImports),
});

export const { setImportFilters, setImportPage, setImportPageSize } =
  slice.actions;
export default slice.reducer;
