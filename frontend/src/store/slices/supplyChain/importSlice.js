import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { supplyChainImportService } from "../../../services/supplyChain/importService";
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
  ImportType: "",
  ModuleType: "",
  Status: "",
});

export const fetchSupplyChainImports = createAsyncThunk(
  "supplyChainImports/fetchList",
  async (params, { rejectWithValue }) => {
    try {
      return await supplyChainImportService.list(params);
    } catch (error) {
      return rejectWithValue(
        getSupplyChainThunkError(error, "Unable to load import history."),
      );
    }
  },
);

const slice = createSlice({
  name: "supplyChainImports",
  initialState,
  reducers: {
    setImportFilters: setSupplyChainFilters,
    setImportPage: setSupplyChainPage,
    setImportPageSize: setSupplyChainPageSize,
  },
  extraReducers: (builder) => {
    addSupplyChainListCases(builder, fetchSupplyChainImports);
  },
});

export const { setImportFilters, setImportPage, setImportPageSize } =
  slice.actions;

export default slice.reducer;
