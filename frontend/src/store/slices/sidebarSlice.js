import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  isCollapsed: false,
  isMobileOpen: false,
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
    toggleSidebar: (state) => {
      state.isCollapsed = !state.isCollapsed;
    },

    setSidebarCollapsed: (state, action) => {
      if (state.isCollapsed === action.payload) {
        return;
      }

      state.isCollapsed = action.payload;
    },

    openMobileSidebar: (state) => {
      if (state.isMobileOpen) {
        return;
      }

      state.isMobileOpen = true;
    },

    closeMobileSidebar: (state) => {
      if (!state.isMobileOpen) {
        return;
      }

      state.isMobileOpen = false;
    },

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
  toggleSidebar,
  setSidebarCollapsed,
  openMobileSidebar,
  closeMobileSidebar,
  toggleSidebarGroup,
  expandSidebarGroups,
  setSidebarSearchQuery,
  resetSidebarSearch,
  openCommand,
  closeCommand,
} = sidebarSlice.actions;

export default sidebarSlice.reducer;
