import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  searchQuery: "",
  expandedGroupIds: {
    "category-rbac": true,
  },
  commandOpen: false,
};

const sidebarSlice = createSlice({
  name: "sidebar",
  initialState,
  reducers: {
    toggleSidebarGroup: (state, action) => {
      const groupId = action.payload;

      state.expandedGroupIds[groupId] = !state.expandedGroupIds[groupId];
    },

    expandSidebarGroups: (state, action) => {
      action.payload.forEach((groupId) => {
        if (!state.expandedGroupIds[groupId]) {
          state.expandedGroupIds[groupId] = true;
        }
      });
    },

    setSidebarSearchQuery: (state, action) => {
      if (state.searchQuery === action.payload) {
        return;
      }

      state.searchQuery = action.payload;
    },

    resetSidebarSearch: (state) => {
      if (!state.searchQuery) {
        return;
      }

      state.searchQuery = "";
    },

    openCommand: (state) => {
      if (state.commandOpen) {
        return;
      }

      state.commandOpen = true;
    },

    closeCommand: (state) => {
      if (!state.commandOpen) {
        return;
      }

      state.commandOpen = false;
    },
  },
});

export const {
  toggleSidebarGroup,
  expandSidebarGroups,
  setSidebarSearchQuery,
  resetSidebarSearch,
  openCommand,
  closeCommand,
} = sidebarSlice.actions;

export default sidebarSlice.reducer;
