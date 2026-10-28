export const workspaces = [
  { id: "production", label: "Production", description: "Record daily output, review readiness and hand work to the next stage.", routes: ["/manufacturing/daily", "/manufacturing/board", "/manufacturing/orders", "/manufacturing/planning", "/manufacturing/imports", "/oee/production-entries"] },
  { id: "purchase", label: "Purchase / Stores", description: "Check follow-ups, receive stock and review material requirements.", routes: ["/purchase/orders", "/purchase/operations", "/purchase/bills", "/procurement/generate-plan", "/items", "/purchase/returns"] },
  { id: "sales", label: "Sales / Dispatch", description: "Review invoices, dispatch plans and shipment work.", routes: ["/sales/invoices", "/dispatch/runs", "/shipments/work-list", "/party", "/dispatch/imports", "/shipments/freight"] },
  { id: "accounts", label: "Accounts", description: "Review daily cash, outstanding payments and transfers.", routes: ["/rojmel/my-wallet", "/rojmel/transactions", "/purchase/supplier-payments", "/purchase/expenses", "/rojmel/transfers", "/rojmel/reports"] },
  { id: "hr", label: "HR", description: "Record attendance, review requests and prepare payroll.", routes: ["/hr/attendance", "/hr/leaves", "/hr/employees", "/hr/payroll", "/hr/shifts", "/hr/dashboard"] },
];

export const allowedWorkspaces = (items) => workspaces.map((workspace) => ({ ...workspace, tasks: workspace.routes.map((route) => items.find((item) => item.route === route)).filter(Boolean) })).filter((workspace) => workspace.tasks.length > 0);

export const allowedSavedDestinations = (saved, items) => saved.map((route) => items.find((item) => item.route === route)).filter(Boolean);
