import { createSlice } from "@reduxjs/toolkit";
import { getAuthData } from "../../utils/authStorage";

const emptyAuthState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  roles: [],
  pages: [],
};

const initialState = {
  ...emptyAuthState,
  ...getAuthData(),
};

const authSlice = createSlice({
  name: "auth",
  initialState,

  reducers: {
    setCredentials: (state, action) => {
      state.user = action.payload.user ?? null;
      state.accessToken = action.payload.accessToken ?? null;
      state.refreshToken = action.payload.refreshToken ?? null;
      state.roles = action.payload.roles ?? [];
      state.pages = action.payload.pages ?? [];
    },

    setTokens: (state, action) => {
      state.accessToken = action.payload.accessToken ?? null;
      state.refreshToken = action.payload.refreshToken ?? state.refreshToken;
    },

    clearCredentials: () => {
      return { ...emptyAuthState };
    },

    logout: (state) => {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.roles = [];
      state.pages = [];
    },
  },
});

export const { setCredentials, setTokens, clearCredentials, logout } =
  authSlice.actions;

export default authSlice.reducer;
