import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { gstService } from "../../../pages/party/gstService";
import { getApiErrorMessage } from "../../../utils/apiError";

const initialState = {
  verify: {
    loading: false,
    data: null,
    error: null,
    staleGstin: "",
  },
  config: {
    loading: false,
    loaded: false,
    available: false,
    data: null,
    error: null,
    missingSettings: [],
  },
};

const getMissingSettings = (data) => {
  return Array.isArray(data?.missingSettings) ? data.missingSettings : [];
};

export const verifyGstin = createAsyncThunk(
  "partyGst/verifyGstin",
  async ({ forceRefresh = false, gstin }, { rejectWithValue }) => {
    try {
      return await gstService.verifyGstin({ forceRefresh, gstin });
    } catch (error) {
      return rejectWithValue(
        getApiErrorMessage(error, "Unable to verify GSTIN."),
      );
    }
  },
);

export const fetchGstConfigStatus = createAsyncThunk(
  "partyGst/fetchConfigStatus",
  async (_, { rejectWithValue }) => {
    try {
      return await gstService.getGstConfigStatus();
    } catch (error) {
      return rejectWithValue(
        getApiErrorMessage(error, "GST verification is unavailable."),
      );
    }
  },
);

const gstSlice = createSlice({
  name: "partyGst",
  initialState,
  reducers: {
    clearGstVerification: (state) => {
      state.verify.data = null;
      state.verify.error = null;
      state.verify.staleGstin = "";
    },
    markGstVerificationStale: (state, action) => {
      state.verify.data = null;
      state.verify.error = null;
      state.verify.staleGstin = action.payload ?? "";
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchGstConfigStatus.pending, (state) => {
        state.config.loading = true;
        state.config.error = null;
      })
      .addCase(fetchGstConfigStatus.fulfilled, (state, action) => {
        const data = action.payload?.data ?? null;
        const missingSettings = getMissingSettings(data);

        state.config.loading = false;
        state.config.loaded = true;
        state.config.available = missingSettings.length === 0;
        state.config.data = data;
        state.config.error = null;
        state.config.missingSettings = missingSettings;
      })
      .addCase(fetchGstConfigStatus.rejected, (state, action) => {
        state.config.loading = false;
        state.config.loaded = true;
        state.config.available = false;
        state.config.data = null;
        state.config.error = action.payload ?? action.error.message;
        state.config.missingSettings = [];
      })
      .addCase(verifyGstin.pending, (state) => {
        state.verify.loading = true;
        state.verify.error = null;
      })
      .addCase(verifyGstin.fulfilled, (state, action) => {
        state.verify.loading = false;
        state.verify.data = action.payload?.data ?? null;
        state.verify.error = null;
        state.verify.staleGstin = "";
      })
      .addCase(verifyGstin.rejected, (state, action) => {
        state.verify.loading = false;
        state.verify.error = action.payload ?? action.error.message;
      });
  },
});

export const { clearGstVerification, markGstVerificationStale } =
  gstSlice.actions;

export default gstSlice.reducer;
