const source = (label, pageName, route) => ({ label, pageName, route });

export const DEEP_SOURCES = {
  production: source(
    "Production readings",
    "OEE.ProductionEntries",
    "/oee/production-entries",
  ),
  productionPrior: source(
    "Previous-period production",
    "OEE.ProductionEntries",
    "/oee/production-entries",
  ),
  planning: source(
    "Procurement planning",
    "ProcurementPlanning.PlanningHistory",
    "/procurement/planning-history",
  ),
  dispatch: source(
    "Dispatch allocation",
    "DispatchPlanning.Reports",
    "/dispatch/reports",
  ),
  summary: source("Rojmel summary", "Rojmel.Dashboard", "/rojmel/dashboard"),
  wallets: source("Wallet balances", "Rojmel.Dashboard", "/rojmel/dashboard"),
  transactions: source(
    "Transaction ledger",
    "Rojmel.Transactions",
    "/rojmel/transactions",
  ),
  cashflow: source("Daily cashflow", "Rojmel.Reports", "/rojmel/reports"),
  configuration: source(
    "GST configuration",
    "GST.Configuration",
    "/gst/configuration",
  ),
  registrations: source(
    "GST registrations",
    "GST.Registration",
    "/gst/registrations",
  ),
  logs: source("GST operation logs", "GST.Logs", "/gst/api-logs"),
};

export const DEEP_PAGES = [
  {
    id: "executive",
    slug: "executive-command-center",
    label: "Executive Command Center",
    short: "Command Center",
    icon: "analytics",
    description:
      "One view of planning, production, allocation and financial movement.",
    sources: [
      "planning",
      "dispatch",
      "production",
      "summary",
      "cashflow",
      "transactions",
      "logs",
    ],
  },
  {
    id: "oee",
    slug: "oee-telemetry",
    label: "Machine performance",
    short: "Manufacturing",
    icon: "oee",
    description:
      "Explore saved machine performance, daily output and recorded production issues.",
    sources: ["production", "productionPrior"],
  },
  {
    id: "finance",
    slug: "rojmel-financial-hub",
    label: "Rojmel Financial Hub",
    short: "Financial Hub",
    icon: "wallet",
    description:
      "Understand wallet reserves and the income and expenses behind each day.",
    sources: ["summary", "wallets", "transactions", "cashflow"],
  },
  {
    id: "gst",
    slug: "gst-intelligence",
    label: "GST status",
    short: "GST Intelligence",
    icon: "invoice",
    description:
      "Inspect registration coverage, configuration and observed API outcomes.",
    sources: ["configuration", "registrations", "logs"],
  },
  {
    id: "cross",
    slug: "cross-module-intelligence",
    label: "Business overview",
    short: "Cross-Module",
    icon: "reports",
    description:
      "Follow operational signals across modules, with the evidence behind every finding.",
    sources: [
      "planning",
      "dispatch",
      "production",
      "summary",
      "cashflow",
      "logs",
    ],
  },
].map((page) => ({ ...page, route: `/deep-dive-analytics/${page.slug}` }));

export const getAvailableDeepDivePages = (access) =>
  DEEP_PAGES.filter((page) => page.sources.some((key) => access[key]));

// Keep one entry in the sidebar; each workspace is available through the
// navigation inside Deep Dive. Its landing page chooses an authorized view.
export const deepDiveModules = {
  deepDive: {
    id: "deepDive",
    label: "Deep Dive",
    route: "/deep-dive-analytics",
    permissionTargets: [...new Map(
      Object.values(DEEP_SOURCES).map((target) => [target.route, target]),
    ).values()],
    preservePresentation: true,
    icon: "analytics",
    description: "Command Center, Manufacturing, Financial Hub, GST Intelligence and Cross-Module analytics",
    sortOrder: 81,
  },
};
