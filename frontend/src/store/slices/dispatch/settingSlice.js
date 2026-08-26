import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { dispatchSettingService } from "../../../services/dispatch";
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
  EffectiveOn: "",
  IsActive: "",
  ItemId: "",
  Search: "",
});

export const fetchDispatchSettings = createAsyncThunk(
  "dispatchSettings/fetchList",
  async (params, { rejectWithValue }) => {
    try {
      return await dispatchSettingService.list(params);
    } catch (error) {
      return rejectDispatchThunk(
        error,
        rejectWithValue,
        "Unable to load dispatch settings.",
      );
    }
  },
);

const slice = createSlice({
  name: "dispatchSettings",
  initialState,
  reducers: {
    setSettingFilters: setDispatchFilters,
    setSettingPage: setDispatchPage,
    setSettingPageSize: setDispatchPageSize,
  },
  extraReducers: (builder) => addDispatchListCases(builder, fetchDispatchSettings),
});

export const { setSettingFilters, setSettingPage, setSettingPageSize } =
  slice.actions;
export default slice.reducer;
