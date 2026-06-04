export const enabledModules = [
  "dashboard",
  "users",
  "roles",
  "pages",
  "permissions",
];

export const sidebarCategories = [
  {
    id: "rbac",
    label: "RBAC",
    icon: "shieldcheck",
    sortOrder: 20,
  },
  {
    id: "master-data",
    label: "Master Data",
    icon: "folderkanban",
    sortOrder: 30,
  },
  {
    id: "inventory",
    label: "Inventory",
    icon: "inventory",
    sortOrder: 40,
  },
  {
    id: "system",
    label: "System",
    icon: "settings",
    sortOrder: 90,
  },
];

export const sidebarModules = {
  dashboard: {
    id: "dashboard",
    label: "Dashboard",
    route: "/dashboard",
    icon: "dashboard",
    sortOrder: 10,
  },
  users: {
    id: "users",
    label: "Users",
    route: "/users",
    icon: "users",
    categoryId: "rbac",
    sortOrder: 10,
  },
  roles: {
    id: "roles",
    label: "Roles",
    route: "/roles",
    icon: "roles",
    categoryId: "rbac",
    sortOrder: 20,
  },
  pages: {
    id: "pages",
    label: "Pages",
    route: "/pages",
    icon: "pages",
    categoryId: "rbac",
    sortOrder: 30,
  },
  permissions: {
    id: "permissions",
    label: "Permissions",
    route: "/permissions",
    icon: "permissions",
    categoryId: "rbac",
    sortOrder: 40,
  },
  customers: {
    id: "customers",
    label: "Customers",
    route: "/customers",
    icon: "customers",
    categoryId: "master-data",
    sortOrder: 10,
  },
  suppliers: {
    id: "suppliers",
    label: "Suppliers",
    route: "/suppliers",
    icon: "business",
    categoryId: "master-data",
    sortOrder: 20,
  },
  categories: {
    id: "categories",
    label: "Categories",
    route: "/categories",
    icon: "categories",
    categoryId: "master-data",
    sortOrder: 30,
  },
  products: {
    id: "products",
    label: "Products",
    route: "/products",
    icon: "products",
    categoryId: "inventory",
    sortOrder: 10,
  },
  stock: {
    id: "stock",
    label: "Stock",
    route: "/stock",
    icon: "stock",
    categoryId: "inventory",
    sortOrder: 20,
  },
  warehouses: {
    id: "warehouses",
    label: "Warehouses",
    route: "/warehouses",
    icon: "warehouses",
    categoryId: "inventory",
    sortOrder: 30,
  },
};

export const getEnabledSidebarModules = () => {
  return enabledModules
    .map((moduleId) => sidebarModules[moduleId])
    .filter(Boolean);
};

export const getSidebarCategory = (categoryId) => {
  return sidebarCategories.find((category) => category.id === categoryId);
};
