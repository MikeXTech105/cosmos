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
      state.isCollapsed = action.payload;
    },

    openMobileSidebar: (state) => {
      state.isMobileOpen = true;
    },

    closeMobileSidebar: (state) => {
      state.isMobileOpen = false;
    },

    toggleSidebarGroup: (state, action) => {
      const groupId = action.payload;

      state.expandedGroupIds[groupId] = !state.expandedGroupIds[groupId];
    },

    expandSidebarGroups: (state, action) => {
      action.payload.forEach((groupId) => {
        state.expandedGroupIds[groupId] = true;
      });
    },

    setSidebarSearchQuery: (state, action) => {
      state.searchQuery = action.payload;
    },

    resetSidebarSearch: (state) => {
      state.searchQuery = "";
    },

    openCommand: (state) => {
      state.commandOpen = true;
    },

    closeCommand: (state) => {
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
