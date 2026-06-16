export const ENDPOINTS = {
  LOGIN: "/api/auth/login",

  REFRESH_TOKEN: "/api/auth/refresh-token",

  LOGOUT: "/api/auth/logout",

  CHANGE_PASSWORD: "/api/auth/change-password",

  FORGOT_PASSWORD: "/api/auth/forgot-password",

  RESET_PASSWORD: "/api/auth/reset-password",

  ROLES: "/api/roles",

  ROLE_BY_ID: (id) => `/api/roles/${id}`,

  PAGES: "/api/pages",

  PAGE_BY_ID: (id) => `/api/pages/${id}`,

  ROLE_PERMISSIONS: (roleId) => `/api/permissions/role/${roleId}`,

  USERS: "/api/users",

  USER_BY_ID: (id) => `/api/users/${id}`,

  USER_ACTIVATE: (id) => `/api/users/${id}/activate`,

  USER_DEACTIVATE: (id) => `/api/users/${id}/deactivate`,

  USER_ROLES: (id) => `/api/users/${id}/roles`,

  PARTIES: "/api/v1/parties",

  PARTY_BY_ID: (id) => `/api/v1/parties/${id}`,

  PARTY_STATUS: (id) => `/api/v1/parties/${id}/status`,

  PARTY_SETTINGS: "/api/v1/settings/party",

  CATEGORIES: "/api/categories",

  CATEGORY_BY_ID: (id) => `/api/categories/${id}`,

  UNITS: "/api/units",

  UNIT_BY_ID: (id) => `/api/units/${id}`,

  ITEMS: "/api/items",

  ITEM_BY_ID: (id) => `/api/items/${id}`,

  // Swagger currently exposes no multipart image-upload endpoint.
  // Set this to the backend upload path when available.
  UPLOAD_IMAGE: null,
};
