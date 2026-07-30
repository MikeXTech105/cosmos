# UX 95+ Program Progress

> **Ledger for the 6-run UX program.** Codex updates this file at the end of every run.
>
> **Protocol — read before every run:**
> 1. Read this ledger to see what is done.
> 2. **Verify it against the actual repo.** A crashed run leaves stale ticks. **Trust the code, not this file.** If a run is marked Complete but the code says otherwise, correct the ledger first, then proceed.
> 3. Run **exactly one run per session.** Do not start the next one.
> 4. Every step must be idempotent — grep before adding any import, export, route, or sidebar entry. Repair half-written files in place; **never create `Foo2.jsx`**.
> 5. Finish on green `npm run lint` + `npm run test` + `npm run build`, then update this file and hand back.

## Score tracking

| Area | Start | Target | Current | Run |
|---|---|---|---|---|
| Visual consistency | 82 | 95 | 95 | 2 |
| Component quality | 80 | 95 | 95 | 1 |
| Information architecture | 55 | 95 | 70 | 3, 4 |
| Feedback & affordance | 58 | 95 | 95 | 2 |
| Data presentation | 60 | 95 | 95 | 2 |
| Empty / first-run | 40 | 95 | 95 | 3 |
| Mobile | 45 | 95 | 95 | 5 |
| Accessibility | 35 | 95 | 95 | 6 |

---

## Run 1 — Component foundation
**Prompt:** `RUN1_component_foundation.md`
**Depends on:** nothing
**Status:** Complete

Scope: `twMerge`/`clsx` in all shared primitives · hero button fix · `forwardRef` on Button/Input/Select · controlled-input discipline · prop API (`disabledReason`, `label`, `hint`, `error`, `id`, `loadingText`).

- Files changed:
  - `src/components/common/AppButton.jsx`
  - `src/components/common/AppButton.test.jsx`
  - `src/components/common/ComponentPrimitives.test.jsx`
  - `src/components/common/AppInput.jsx`
  - `src/components/common/AppModal.jsx`
  - `src/components/common/AppSelect.jsx`
  - `src/components/common/AppTooltip.jsx`
  - `src/components/common/DataTableShell.jsx`
  - `src/components/common/MaterialTypePill.jsx`
  - `src/components/common/PageHeader.jsx`
  - `src/components/common/StatCards.jsx`
  - `src/components/layout/SearchCommand.jsx`
  - `src/components/layout/Sidebar.jsx`
  - `src/components/layout/SidebarGroup.jsx`
  - `src/components/layout/SidebarItem.jsx`
  - `src/components/layout/UserMenu.jsx`
  - `src/pages/procurement/home/ProcurementHomePage.jsx`
  - `UX_95_PROGRESS.md`
- **Elements whose appearance changed in the app-wide sweep:**
  - Procurement hero **Export CSV**, disabled only: opacity increased from 60% to 90%; approximate Indigo contrast improved from 2.9:1 to 4.5:1.
  - Procurement hero **Save draft**, disabled only: opacity increased from 60% to 80%; approximate Indigo contrast improved from 3.3:1 to 4.6:1.
  - No other element changed appearance. The caller-wins `AppButton` merge and legible hero colour overrides were already present in the baseline; this run retained and regression-tested them.
- Verified: lint ✅ test ✅ (30 files / 206 tests) build ✅
- Deviations / notes:
  - Source sweep covered 441 buttons, 226 inputs, 195 selects, 71 modals, 102 tooltips, 59 page headers, 4 material pills, 11 stat grids, and 15 data-table shells across Inventory, RBAC, Party, Sales, Purchase, Procurement, HR, OEE, Reports, Rojmel, Settings, Dispatch, and Supply Chain.
  - The compiled primitive showcase verified three legible hero labels, zero controlled/uncontrolled warnings, real ref targets (`BUTTON`, `INPUT`, `BUTTON`), and live Indigo → Emerald accent recolouring.
  - Authenticated route traversal was unavailable because the configured staging API timed out and this workspace has no local .NET runtime. No auth code or configuration was changed.
  - No prop addition required a breaking change; existing `helperText`, `disabled`, `className`, `maxWidth`, and all button variants remain supported.
- Open `// BACKEND:` / `// CONFIRM:` / `// DEPENDENCY:` items: None.

> ⚠️ **Commit this run on its own commit/branch.** It changes primitives used by every page; it must be revertable in isolation.

---

## Run 2 — Data presentation + feedback
**Prompt:** `RUN2_data_presentation_and_feedback.md`
**Depends on:** Run 1 (`disabledReason` prop)
**Status:** Complete (2026-07-29)

Scope: `src/utils/format.js` (one date + number format app-wide) · numeric column discipline · `materialItemName`/`materialItemCode` fix incl. CSV export · buy-list `#` column + pluralisation · radius/padding/stat-grid drift · zero hardcoded hex · no unexplained disabled control · no silent sidebar drop · consistent loading states · error contract (400/409/404/403/network) · destructive-action discipline · specific success toasts.

- Files changed (exact, grouped by layer/module):
  - Shared application layer: `src/components/common/{AppButton.jsx, AppInput.jsx, AppSelect.jsx, StatCards.jsx}`, `src/config/sidebarThemes.js`, `src/hooks/useSidebar.js`, `src/services/reports/reportExportService.js`, `src/utils/{apiError.js, apiError.test.js, csvParse.js, format.js, format.test.js, reportFormat.js}`.
  - Dashboard: `src/pages/dashboard/dashboardHelpers.js`, `src/pages/dashboard/widgets/{OverviewStats.jsx, RevenueExpenseTrendChart.jsx, SalesPurchaseTrendChart.jsx, WidgetState.jsx}`.
  - Dispatch: `src/pages/dispatch/dispatchDisplay.js`, `src/pages/dispatch/dashboard/DispatchDashboardPage.jsx`, `src/pages/dispatch/imports/DispatchImportsPage.jsx`, `src/pages/dispatch/runs/{DispatchRecommendationMatrix.jsx, DispatchRunDetailPage.jsx, DispatchRunsPage.jsx}`, `src/pages/dispatch/settings/DispatchSettingsPage.jsx`.
  - HR: `src/pages/hr/{HrShared.jsx, hrHelpers.js}`, `src/pages/hr/attendance/AttendancePage.jsx`, `src/pages/hr/dashboard/HrDashboardPage.jsx`, `src/pages/hr/departments/{DepartmentFormModal.jsx, DepartmentStats.jsx, DepartmentTable.jsx, DepartmentsPage.jsx}`, `src/pages/hr/designations/{DesignationFormModal.jsx, DesignationStats.jsx, DesignationTable.jsx, DesignationsPage.jsx}`, `src/pages/hr/employees/{EmployeeLifecycleModal.jsx, EmployeeList.jsx, EmployeeProfilePanel.jsx, EmployeeStats.jsx, EmployeesPage.jsx, employeeFormMappers.js}`, `src/pages/hr/leaves/LeavesPage.jsx`, `src/pages/hr/payroll/PayrollPage.jsx`, `src/pages/hr/shifts/{ShiftFormModal.jsx, ShiftGrid.jsx, ShiftStats.jsx, ShiftsPage.jsx}`.
  - Inventory: `src/pages/inventory/{InventoryShared.jsx, inventoryHelpers.js}`, `src/pages/inventory/categories/{CategoriesPage.jsx, CategoryFormModal.jsx, CategoryStats.jsx, CategoryTable.jsx}`, `src/pages/inventory/items/{ItemDetailsPanel.jsx, ItemFormModal.jsx, ItemStats.jsx, ItemTable.jsx, ItemsPage.jsx, itemHelpers.js}`, `src/pages/inventory/units/{UnitFormModal.jsx, UnitStats.jsx, UnitTable.jsx, UnitsPage.jsx}`.
  - OEE: `src/pages/oee/{OeeMasterPage.jsx, OeeShared.jsx, OeeSpeedometer.jsx, oeeHelpers.js}`, `src/pages/oee/dashboard/OeeDashboardPage.jsx`, `src/pages/oee/productionEntries/OeeProductionEntriesPage.jsx`, `src/pages/oee/reports/OeeReportsPage.jsx`.
  - Party: `src/pages/party/{PartyFilters.jsx, PartyFormModal.jsx, PartyPage.jsx, PartyStats.jsx, PartyTable.jsx, partyHelpers.js}`.
  - Procurement: `src/pages/procurement/{ProcurementShared.jsx, procurementHelpers.js, procurementHelpers.test.js}`, `src/pages/procurement/bomMapping/BomMappingPage.jsx`, `src/pages/procurement/generatePlan/GeneratePlanPage.jsx`, `src/pages/procurement/home/{ProcurementHomePage.jsx, procurementHomeHelpers.js}`, `src/pages/procurement/planningHistory/PlanningHistoryPage.jsx`, `src/pages/procurement/salesImport/SalesImportPage.jsx`, `src/pages/procurement/settings/ProcurementSettingsPage.jsx`.
  - Profile: `src/pages/profile/ProfilePage.jsx`.
  - Purchase: `src/pages/purchase/{PurchaseLineItems.jsx, PurchaseShared.jsx, purchaseHelpers.js}`, `src/pages/purchase/documents/{PurchaseDocumentDetailPage.jsx, PurchaseDocumentListPage.jsx}`, `src/pages/purchase/expenseCategories/ExpenseCategoriesPage.jsx`, `src/pages/purchase/expenses/ExpensesPage.jsx`, `src/pages/purchase/reports/PurchaseReportsPage.jsx`, `src/pages/purchase/supplierPayments/SupplierPaymentsPage.jsx`.
  - RBAC: `src/pages/rbac/pages/{PageActions.jsx, PageFilters.jsx, PageFormModal.jsx, PageModal.jsx, PageStats.jsx, PageTable.jsx, PageTree.jsx, PagesPage.jsx}`, `src/pages/rbac/permissions/{Permissions.jsx, PermissionsTable.jsx}`, `src/pages/rbac/roles/{RoleFilters.jsx, RoleModal.jsx, RoleStats.jsx, RoleTable.jsx, Roles.jsx}`, `src/pages/rbac/users/{UserFilters.jsx, UserModal.jsx, UserStats.jsx, UserTable.jsx, Users.jsx}`.
  - Reports: `src/pages/reports/{ReportTable.jsx, ReportView.jsx}`, `src/pages/reports/filters/filterRegistry.js`.
  - Rojmel: `src/pages/rojmel/{RojmelShared.jsx, rojmelHelpers.js}`, `src/pages/rojmel/components/TransactionTable.jsx`, `src/pages/rojmel/dashboard/RojmelDashboardPage.jsx`, `src/pages/rojmel/transfers/TransfersPage.jsx`, `src/pages/rojmel/wallets/WalletsPage.jsx`.
  - Sales: `src/pages/sales/invoiceTemplates/{CompactTemplate.jsx, CorporateTemplate.jsx, InvoiceTemplateShared.jsx, ModernTemplate.jsx, exportInvoicePdf.jsx}`, `src/pages/sales/invoices/{InvoiceActions.jsx, InvoiceDetailPage.jsx, InvoiceFormModal.jsx, InvoiceShared.jsx, InvoiceStats.jsx, InvoiceTable.jsx, SalesInvoicesPage.jsx, invoiceHelpers.js}`.
  - Settings: `src/pages/settings/components/SettingsCard.jsx`, `src/pages/settings/sections/{AppearanceSection.jsx, InvoiceTemplateSection.jsx}`.
  - Supply Chain: `src/pages/supplyChain/{SupplyChainShared.jsx, supplyChainDisplay.js}`, `src/pages/supplyChain/channels/ChannelsPage.jsx`, `src/pages/supplyChain/imports/ImportsPage.jsx`, `src/pages/supplyChain/itemMappings/ItemMappingsPage.jsx`, `src/pages/supplyChain/packagingProfiles/PackagingProfilesPage.jsx`, `src/pages/supplyChain/warehouses/WarehousesPage.jsx`.
  - Ledger: `UX_95_PROGRESS.md`.
- Call sites migrated to `format.js`: **58 direct formatter calls across 23 files**, plus all manually assembled ISO date-input producers.
- Tables whose column mapping was wrong against its DTO: **3** — Procurement Home buy list, Generate Plan calculation review, and Planning History line detail. The Home and Generate Plan CSV mappings were corrected at the same time and retain raw numeric precision.
- Disabled controls given a reason: **212 audited** — 138 `AppButton` controls and 74 native controls. Explicit `disabledReason` values use `AppTooltip`; the primitive safety net supplies a native title when a caller omits one.
- Verified: lint ✅ test ✅ (31 files / 227 tests) build ✅
- Deviations / notes:
  - Authenticated acceptance navigation stopped at `/login` because no reusable signed-in browser session was available; the login surface loaded without console errors. No credential, auth code, or auth configuration was changed.
  - The hardcoded-colour scan is zero in the editable Run 2 scope. One pre-existing `indigo-*` occurrence remains in protected `src/layouts/AuthLayout.jsx`, which this program explicitly forbids editing.
  - The frontend DTO corrections use the documented `materialItemName`, `materialItemCode`, `unitName`, and `unitShortName` fields. No backend change or `// BACKEND:` marker was required.
- Open items: No open code items. Repeat the protected-page visual walkthrough when an authenticated session is available.

---

## Run 3 — Empty states, first run, URL state
**Prompt:** `RUN3_empty_states_and_url_state.md`
**Depends on:** Runs 1–2 (`format.js`, skeleton/empty patterns)
**Status:** Complete (2026-07-29)

Scope: shared `EmptyState` with three variants (`empty` / `filtered` / `error`) · zero-value KPI hints · `/getting-started` checklist from existing endpoints only · first-use hints · `useUrlFilters` hook · pilot conversion of `ItemsPage`, `PlanningHistoryPage`, `RBAC Users`.

- Files changed (grouped by part):
  - **Part A — shared and first run:** `src/components/common/{EmptyState.jsx, EmptyState.test.jsx, DataTableShell.jsx}`, `src/components/layout/SearchCommand.jsx`, `src/config/sidebar.js`, `src/routes/AppRoutes.jsx`, `src/pages/gettingStarted/{GettingStartedCard.jsx, GettingStartedPage.jsx, GettingStartedProgress.jsx, gettingStartedConfig.js, gettingStartedPreference.js, index.js, useGettingStartedProgress.js}`, `src/pages/settings/settingsNav.js`, `src/pages/settings/sections/GettingStartedSection.jsx`, `src/pages/dashboard/{DashboardPage.jsx, widgets/OverviewStats.jsx, widgets/WidgetState.jsx}`.
  - **Part A — list migrations:** Inventory `src/pages/inventory/{categories/{CategoriesPage.jsx, CategoryTable.jsx}, items/{ItemsPage.jsx, ItemTable.jsx}, units/{UnitsPage.jsx, UnitTable.jsx}}`; RBAC `src/pages/rbac/{pages/{PagesPage.jsx, PageTable.jsx, PageTree.jsx}, permissions/PermissionsTable.jsx, roles/{Roles.jsx, RoleTable.jsx}, users/{Users.jsx, UserTable.jsx}}`; Party `src/pages/party/{PartyPage.jsx, PartyTable.jsx}`; Sales `src/pages/sales/invoices/{SalesInvoicesPage.jsx, InvoiceTable.jsx, InvoiceDetailPage.jsx}`; Purchase `src/pages/purchase/{documents/{PurchaseDocumentListPage.jsx, PurchaseDocumentDetailPage.jsx}, expenseCategories/ExpenseCategoriesPage.jsx, expenses/ExpensesPage.jsx, reports/PurchaseReportsPage.jsx, supplierPayments/SupplierPaymentsPage.jsx}`; Reports `src/pages/reports/ReportTable.jsx`.
  - **Part A — module families:** HR `src/pages/hr/{HrShared.jsx, attendance/AttendancePage.jsx, departments/{DepartmentsPage.jsx, DepartmentTable.jsx}, designations/{DesignationsPage.jsx, DesignationTable.jsx, DesignationFormModal.jsx}, employees/{EmployeesPage.jsx, EmployeeList.jsx}, leaves/LeavesPage.jsx, shifts/{ShiftsPage.jsx, ShiftGrid.jsx}}`; OEE `src/pages/oee/{OeeShared.jsx, OeeMasterPage.jsx, dashboard/OeeDashboardPage.jsx, productionEntries/OeeProductionEntriesPage.jsx, reports/OeeReportsPage.jsx}`; Rojmel `src/pages/rojmel/{RojmelShared.jsx, components/TransactionTable.jsx, myWallet/MyWalletPage.jsx, transactions/TransactionsPage.jsx, transfers/TransfersPage.jsx, wallets/WalletsPage.jsx}`; Procurement `src/pages/procurement/{ProcurementShared.jsx, bomMapping/BomMappingPage.jsx, generatePlan/GeneratePlanPage.jsx, planningHistory/PlanningHistoryPage.jsx, salesImport/SalesImportPage.jsx, settings/ProcurementSettingsPage.jsx, skuMapping/SkuMappingPage.jsx}`; Supply Chain `src/pages/supplyChain/{channels/ChannelsPage.jsx, imports/ImportsPage.jsx, itemMappings/ItemMappingsPage.jsx, packagingProfiles/PackagingProfilesPage.jsx, warehouses/WarehousesPage.jsx}`; Dispatch `src/pages/dispatch/{dashboard/DispatchDashboardPage.jsx, imports/DispatchImportsPage.jsx, reports/DispatchReportsPage.jsx, runs/{DispatchRecommendationMatrix.jsx, DispatchRunDetailPage.jsx, DispatchRunsPage.jsx}, settings/DispatchSettingsPage.jsx}`.
  - **Part B — URL foundation and pilots:** `src/hooks/{useUrlFilters.js, useUrlFilters.test.js}`, `src/pages/inventory/items/ItemsPage.jsx`, `src/pages/procurement/planningHistory/PlanningHistoryPage.jsx`, `src/pages/rbac/users/Users.jsx`, and the existing compatibility contract in `src/pages/procurement/setup/ProcurementSetupPage.jsx`.
- **Final URL key vocabulary (the contract for later runs):** common keys `q`, `tab`, `page`, `size`, `sort`, `dir`, `isActive`, `from`, `to`; entity keys `category`, `classification`, `channel`, `item`, `status`, `role`. Keys are camelCase presentation state only; API request casing is unchanged.
- How `ProcurementSetupPage`'s `?tab=` scheme was matched: retained `tab=sku|bom|settings` exactly. The first permission-visible tab is the omitted default, unknown values fall back and are removed with `replace`, and switching tabs atomically drops the legacy `productId` child filter. Existing links such as `/procurement/setup?tab=bom` did not change shape.
- **Pages still to convert (later runs):**
  - Dashboard: Dashboard filters.
  - Inventory: Categories, Units.
  - RBAC: Roles, Pages, Permissions.
  - Party and Sales: Party Master, Sales Invoices.
  - Purchase: Bills, Orders, Returns, Supplier Payments, Expenses, Expense Categories, Purchase Reports.
  - HR: Departments, Designations, Employees, Attendance, Leaves, Shifts, Payroll.
  - OEE: Dashboard, Production Entries, Machines, Moulds, Downtime Reasons, OEE Reports.
  - Reports: report filters in `ReportView`.
  - Rojmel: Dashboard, My Wallet, Wallets, Transactions, Transfers, Reports.
  - Procurement: Home, Sales Import, Generate Plan, SKU Mapping, BOM Mapping, Settings, and saved-plan detail line filters. Planning History's top-level run list is complete.
  - Supply Chain: Channels, Warehouses, Item Mappings, Packaging Profiles, Imports.
  - Dispatch: Dashboard, Runs, Run Detail recommendation filters, Imports, Settings, Reports.
  - Existing direct URL readers to migrate through the hook are Dashboard, Report View, Procurement BOM Mapping, Supply Chain Item Mappings, and Dispatch Runs.
- Getting-started dismissal persisted to: API ⬜ / localStorage ✅ — reason: no user-preferences endpoint exists. Key: `cosmos.gettingStarted.dismissed`; Settings exposes “Show getting started again”.
- Verified: lint ✅ (0 errors, 0 warnings) · test ✅ (32 files / 231 tests, including URL-hook and empty-state variants) · build ✅
- Deviations / notes:
  - The URL hook, required unit coverage, three pilot conversions, and setup-tab compatibility were already present in the verified repository baseline despite this ledger still saying “Not started”; this run retained and re-verified them rather than creating a second implementation.
  - Getting-started uses existing paged endpoints only with `PageNumber: 1` / `PageSize: 1`, permission-adjusted steps, and `Promise.allSettled`. Supply Chain steps are included because both endpoints exist.
  - The Dashboard's “filters unavailable through the current URL” note remains, and no copy-link control was added.
  - Auth files, dependencies, API parameter shapes, and routes were not changed or removed.
- Open items: API-backed/authenticated manual acceptance remains environment-dependent; automated lint, all tests, and the production build are green.

---

## Run 4 — Global search, Action Centre, navigation
**Prompt:** `RUN4_search_action_centre_navigation.md`
**Depends on:** Run 3 (URL key vocabulary for deep links)
**Status:** Complete (2026-07-29)

Scope: ⌘K searches records across permitted entities (debounce 300 ms, min 2 chars, request-id guard, `Promise.allSettled`) · `/action-centre` registry-driven signals · Procurement nav consolidated to 4 entries with old routes redirecting.

- Files changed (grouped by part):
  - **Part A — global search:** `src/components/layout/{SearchCommand.jsx, Header.jsx, globalSearch.js, globalSearch.test.js}`, `src/services/{inventory/itemService.js, sales/invoiceService.js, supplyChain/itemMappingService.js}`, `src/pages/party/PartyPage.jsx`, `src/pages/supplyChain/itemMappings/ItemMappingsPage.jsx`.
  - **Part B — Action Centre:** `src/pages/actionCentre/{ActionCentrePage.jsx, actionSignals.js, actionSignals.test.js}`, `src/config/sidebar.js`.
  - **Part C — navigation depth:** `src/components/layout/Breadcrumbs.jsx`, `src/config/sidebar.js`, `src/pages/procurement/setup/{ProcurementSetupPage.jsx, procurementSetupTabs.js}`.
  - **Ledger:** `UX_95_PROGRESS.md`.
- Entities the palette searches: **Items, Parties, Sales invoices, Channel SKUs**. Each request uses `{ Search, PageNumber: 1, PageSize: 5 }`, is permission-gated, abortable, settled independently, and mapped from `data.items`.
- Entities omitted (no authoritative `Search` param): **Users** — the backend RBAC users list has no search query contract; **Plans** — the procurement plan-run list has no authoritative search query contract. No speculative parameter was sent.
- **Status enum values confirmed:** Procurement plan `Draft = 1` (`PlanningRunStatus.Draft`), verified against the 2026-07-29 live response; the code carries the required `// CONFIRM:` evidence note.
- **Signals omitted because a value couldn't be confirmed:** Dispatch runs awaiting finalize (Calculated/Allocated numeric values unconfirmed) and import batches uncommitted (Validated numeric value unconfirmed). Both remain documented in `omittedActionSignals`.
- "Items not classified" shipped? ❌ — the Items API has no documented null-classification filter; no `0`/`-1` sentinel was invented.
- Redirect map for old procurement routes:
  - `/procurement/sku-mapping` → `/procurement/setup?tab=sku`
  - `/procurement/bom-mapping` → `/procurement/setup?tab=bom`
  - `/procurement/settings` → `/procurement/setup?tab=settings`
  - `/procurement/generate-plan` remains live but is not a top-level sidebar entry.
- Every remaining sidebar id verified against a backend page permission? ✅ — `ppHome` → `ProcurementPlanning.GeneratePlan`; `ppSalesImport` → `ProcurementPlanning.SalesImport`; `ppPlanningHistory` → `ProcurementPlanning.PlanningHistory`; `ppSetup` → any permitted `ProcurementPlanning.SkuMapping` / `.BomMapping` / `.Settings`. The sidebar now carries these explicit permission targets, matching the guarded route identities.
- Verified: lint ✅ (0 errors, 0 warnings) · test ✅ (33 files / 232 tests) · build ✅
- Deviations / notes:
  - Items, Parties, and Channel SKUs use Run 3's `q` deep-link vocabulary because those modules have no standalone record-detail route; Sales invoices open the existing `/sales/invoices/:id` detail route.
  - The existing `/action-centre` route, `actionCentre` sidebar id, and `BellRing` icon mapping were already present in the baseline and were retained. This run tightened paged counts, inline failure handling, shared all-clear state, and immediate-after-Dashboard ordering.
  - The local browser smoke test reached the app with zero console warnings/errors, but the available browser session was not authenticated; protected-page interaction remains covered by source audits and automated tests.
- Open items: Repeat the protected-page manual acceptance matrix when an authenticated browser session is available.

---

## Run 5 — Mobile
**Prompt:** `RUN5_mobile.md`
**Depends on:** Run 3 (`activeCount` for the filter sheet)
**Status:** Complete (2026-07-29)

Scope: shared `MobileRecordCard` below `md` · 44 px touch targets · sidebar drawer below `lg` (focus trap, Esc, scroll lock, closes on route change) · filter bottom sheet · full-screen modals with sticky header/footer · inputs ≥ 16 px · zero horizontal scroll at 375 px.

- Files changed (exact, grouped by layer/module):
  - Shared responsive system: `src/components/common/{AppButton.jsx, AppInput.jsx, AppModal.jsx, AppSelect.jsx, ComponentPrimitives.test.jsx, DataTableShell.jsx, MobileFilterSheet.jsx, MobileRecordCard.jsx, MobileRecordCard.test.jsx, MobileResponsivePrimitives.test.jsx, ResponsiveTableRegion.jsx, mobileTableCards.jsx}`, `src/components/layout/{Breadcrumbs.jsx, Header.jsx, SearchCommand.jsx, Sidebar.jsx, SidebarGroup.jsx, SidebarItem.jsx, UserMenu.jsx}`, `src/index.css`.
  - Dashboard / Action Centre / Profile: `src/pages/actionCentre/ActionCentrePage.jsx`, `src/pages/dashboard/{DashboardFilters.jsx, DashboardPage.jsx}`, `src/pages/dashboard/widgets/{AlertsPanel.jsx, OverviewStats.jsx, WidgetState.jsx}`, `src/pages/profile/ProfilePage.jsx`.
  - Dispatch: `src/pages/dispatch/dashboard/DispatchDashboardPage.jsx`, `src/pages/dispatch/imports/DispatchImportsPage.jsx`, `src/pages/dispatch/reports/DispatchReportsPage.jsx`, `src/pages/dispatch/runs/{DispatchRecommendationMatrix.jsx, DispatchRunDetailPage.jsx, DispatchRunsPage.jsx}`, `src/pages/dispatch/settings/DispatchSettingsPage.jsx`.
  - HR: `src/pages/hr/HrShared.jsx`, `src/pages/hr/attendance/AttendancePage.jsx`, `src/pages/hr/departments/{DepartmentActions.jsx, DepartmentFilters.jsx, DepartmentTable.jsx, DepartmentsPage.jsx}`, `src/pages/hr/designations/{DesignationActions.jsx, DesignationFilters.jsx, DesignationFormModal.jsx, DesignationTable.jsx, DesignationsPage.jsx}`, `src/pages/hr/employees/{EmployeeFilters.jsx, EmployeeFormModal.jsx, EmployeeList.jsx, EmployeeProfilePanel.jsx, EmployeesPage.jsx}`, `src/pages/hr/leaves/LeavesPage.jsx`, `src/pages/hr/payroll/PayrollPage.jsx`, `src/pages/hr/shifts/{ShiftActions.jsx, ShiftFilters.jsx, ShiftGrid.jsx, ShiftsPage.jsx}`.
  - Inventory / Party / Sales: `src/pages/inventory/InventoryShared.jsx`, `src/pages/inventory/categories/{CategoriesPage.jsx, CategoryActions.jsx, CategoryFilters.jsx, CategoryTable.jsx}`, `src/pages/inventory/items/{ItemActions.jsx, ItemFilters.jsx, ItemTable.jsx, ItemsPage.jsx}`, `src/pages/inventory/units/{UnitActions.jsx, UnitFilters.jsx, UnitTable.jsx, UnitsPage.jsx}`, `src/pages/party/{PartyFilters.jsx, PartyFormModal.jsx, PartyPage.jsx, PartyTable.jsx}`, `src/pages/sales/invoices/{InvoiceActions.jsx, InvoiceDetailPage.jsx, InvoiceFilters.jsx, InvoiceFormModal.jsx, InvoiceShared.jsx, InvoiceTable.jsx, SalesInvoicesPage.jsx}`.
  - OEE / Reports: `src/pages/oee/{OeeMasterPage.jsx, OeeShared.jsx}`, `src/pages/oee/dashboard/OeeDashboardPage.jsx`, `src/pages/oee/productionEntries/OeeProductionEntriesPage.jsx`, `src/pages/oee/reports/OeeReportsPage.jsx`, `src/pages/reports/{ReportTable.jsx, filters/ReportFilterBar.jsx}`.
  - Procurement / Purchase: `src/pages/procurement/ProcurementShared.jsx`, `src/pages/procurement/{bomMapping/BomMappingPage.jsx, generatePlan/GeneratePlanPage.jsx, home/ProcurementHomePage.jsx, planningHistory/PlanningHistoryPage.jsx, salesImport/SalesImportPage.jsx, settings/ProcurementSettingsPage.jsx, setup/ProcurementSetupPage.jsx, skuMapping/SkuMappingPage.jsx}`, `src/pages/purchase/PurchaseLineItems.jsx`, `src/pages/purchase/{documents/PurchaseDocumentDetailPage.jsx, documents/PurchaseDocumentListPage.jsx, expenseCategories/ExpenseCategoriesPage.jsx, expenses/ExpensesPage.jsx, reports/PurchaseReportsPage.jsx, supplierPayments/SupplierPaymentsPage.jsx}`.
  - RBAC: `src/pages/rbac/pages/{PageActions.jsx, PageFilters.jsx, PageTable.jsx, PageTree.jsx, PagesPage.jsx}`, `src/pages/rbac/permissions/PermissionsTable.jsx`, `src/pages/rbac/roles/{RoleActions.jsx, RoleFilters.jsx, RoleTable.jsx, Roles.jsx}`, `src/pages/rbac/users/{UserActions.jsx, UserFilters.jsx, UserTable.jsx, Users.jsx}`.
  - Rojmel / Supply Chain: `src/pages/rojmel/RojmelShared.jsx`, `src/pages/rojmel/components/{ReversalModal.jsx, RojmelFilterBar.jsx, TransactionEntryModal.jsx, TransactionTable.jsx, TransferFormModal.jsx, WalletFormModal.jsx}`, `src/pages/rojmel/{dashboard/RojmelDashboardPage.jsx, myWallet/MyWalletPage.jsx, transactions/TransactionsPage.jsx, transfers/TransfersPage.jsx, wallets/WalletsPage.jsx}`, `src/pages/supplyChain/SupplyChainShared.jsx`, `src/pages/supplyChain/{channels/ChannelsPage.jsx, imports/ImportsPage.jsx, itemMappings/ItemMappingsPage.jsx, packagingProfiles/PackagingProfilesPage.jsx, warehouses/WarehousesPage.jsx}`.
  - Ledger: `UX_95_PROGRESS.md`.
- Mobile field set chosen per list:
  - RBAC: Users = name / username, email, role, created, active status; Roles = name, description, created, status; Pages = display name / route, internal name, icon, parent, sort order, status; Permissions = page / hierarchy, route, name, enabled-permission count, permission toggles.
  - Inventory / Party / Sales: Items = item name / code and category, type, material type, stock, category, status; Categories and Units = name / description, code or short name, created, status; Parties = display name / type, contact, location, balance, GSTIN, status; Invoices = invoice number / customer, invoice date, due date, amount, payment state, invoice state.
  - HR: Employees = employee / code, designation, department, status; Departments and Designations = name / description, code, department where applicable, created, status; Attendance = employee / date, check-in, check-out, hours, status; Leaves = employee / leave type, start, end, days, status; Payroll = employee / code, gross, deductions, net pay; Shifts = name / code, start, end, grace, weekly hours, status and day/night type.
  - Purchase: document lists = document number / party with date, type, total and status; document lines = item with quantity, unit, rate and total; supplier allocation/payment lists = document or reference with supplier, date, amount/mode and status; expenses = date / reference with category, paid-from, amount and tax; expense categories = name, description and status; report rows = row label plus four selected business values.
  - OEE / Reports: production entries = machine / date, mould, shots, OEE and downtime; master lists = name / code plus three operational fields and status; report lists = record label plus the three or four primary metrics selected by each report definition.
  - Procurement: requirement and plan rows = material / product code with required, stock, shortage, buy quantity and cover values; planning history = run / code, date, status and counts; import rows = file or source with validation/count/status fields; SKU/BOM mappings = channel SKU or product with mapped item/components, occurrence/effective data and status; settings = item with lead time, safety stock, minimum order and active state.
  - Rojmel: transactions and transfers = reference / date, type or source/destination, category, amount, balance and status; wallets = wallet / code, type, owner, balance, default and status.
  - Supply Chain / Dispatch: master lists use name or SKU / code plus type, location/channel, capacity or pack data and status; mapping/import lists use item or file / source plus mapped product, counts, validation and status; dispatch runs/recommendations/snapshots use run or item / warehouse/channel plus demand, stock, allocatable, allocated or recommended quantity and status.
- Lists using per-action buttons vs overflow menu: descriptor-based cards keep one or two primary actions as 44 px direct buttons (for example payslip and employee-profile actions); three or more descriptor actions automatically use the overflow menu (for example leave approval/rejection/cancellation). All legacy table action clusters are collected into a 44 px overflow trigger with 44 px menu rows, while permission toggles remain in the card footer because they are the row's primary interaction.
- Pages needing more than a mechanical fix: the responsive drawer and focus lifecycle; filter-sheet portal stacking and URL count state; full-screen modal focus/body-lock/sticky action regions; the Party wizard; HR attendance/leaves/payroll custom tables and employee profile; RBAC page tree and permission matrix; Sales Import overflow; Procurement and Supply Chain mapping/import correction flows; Rojmel entry/transfer/reversal forms; and table-derived action extraction all required page-specific treatment.
- **Desktop confirmed unchanged?** Yes — all 66 authenticated routes were opened at 1280 x 900: the desktop sidebar remained visible, mobile menu/filter triggers remained hidden, and document/body width stayed within the viewport. At 768 x 1024 the `md` table layouts returned and mobile cards were hidden on populated list pages; intentional wide tables remained contained in their local horizontal scrollers.
- Tested at: 375 x 812 ✅ 390 x 844 ✅ 768 x 1024 ✅ landscape 667 x 375 ✅ desktop 1280 x 900 ✅
- Verified: lint ✅ (0 errors, 0 warnings) · test ✅ (35 files / 237 tests) · build ✅
- Deviations / notes:
  - The authenticated route matrix covered 66/66 application routes. No editable route produced document/body horizontal scroll at 375, 390, 667-landscape, 768, or 1280 px. Hidden `sr-only` file inputs are intentionally 1 px; their visible upload controls meet the touch-target requirement.
  - Drawer open/close, backdrop, route-change close, Esc, focus placement/return and body lock were exercised live. The filter sheet's pinned actions, active-count URL update, Escape/focus return and body lock were exercised live. Representative short, long, wizard and financial-entry modals were exercised live; import correction modal action regions were source-verified because reaching those states requires uploading or duplicating operational data.
  - `src/pages/auth/**` and `src/layouts/AuthLayout.jsx` remain untouched, as required. The protected Change Password page has a pre-existing 28 px password-visibility button; it caused no overflow but is reported for Run 6 instead of being changed here.
  - No dependency, API parameter, auth, permission, route, or desktop interaction contract was changed.
- Open items: No editable Run 5 items. The protected auth touch-target issue remains deferred to the program's auth accessibility report.

---

## Run 6 — Accessibility
**Prompt:** `RUN6_accessibility.md`
**Depends on:** Run 1 (`forwardRef` — focus return is impossible without it), and Runs 2–5 (audits the finished surface)
**Status:** Complete (2026-07-29)

Scope: keyboard operability + skip link · focus management (`src/utils/focus.js`) · semantics/ARIA · **`AppSelect` combobox pattern** · live regions · contrast across all 12 accent themes · `prefers-reduced-motion` + 200 % zoom · `@axe-core/react` + `eslint-plugin-jsx-a11y`.

> **Authorised devDependencies for this run only:** `@axe-core/react`, `eslint-plugin-jsx-a11y`. Neither ships in the production bundle.

- Files changed (grouped by area):
  - **Keyboard / focus:** `src/utils/focus.js`, `src/layouts/MainLayout.jsx`, `src/components/common/{AppButton.jsx, AppModal.jsx, AppTooltip.jsx, MobileFilterSheet.jsx, MobileRecordCard.jsx}`, `src/components/layout/{SearchCommand.jsx, Sidebar.jsx}`, and the custom Party/RBAC dialog implementations. The shared utility now supplies first-focus, trapping, error focus, safe neighbour/trigger restoration, and Escape handling. The skip link is the first focusable element and route changes focus the page `h1`.
  - **Semantics / forms / tables / tabs:** `src/components/common/{AppInput.jsx, AppSelect.jsx, AppTabs.jsx, DataTableShell.jsx, ResponsiveTableRegion.jsx, AccessibleChartTable.jsx, mobileTableCards.jsx}`, `src/utils/tableAccessibility.jsx`, application tables/forms across Inventory, Party, Sales, Purchase, Procurement, Dispatch, Supply Chain, HR, OEE, RBAC, Reports, Rojmel, Settings, Dashboard, and invoice templates. This includes associated visible labels, required/error/hint relationships, named/scoped tables, accessible row-number headers, sortable state, chart data alternatives, landmarks, and full tab semantics.
  - **Live regions / icon naming:** `src/components/common/AccessibleToaster.jsx`, `src/main.jsx`, the shared empty/loading/error primitives, result-count regions, and the app-wide icon/button call-site sweep. Success/info toasts announce politely; error toasts and async/form errors announce assertively.
  - **Contrast / motion / reflow:** `src/config/sidebarThemes.js`, `src/index.css`, `src/pages/settings/{Settings.jsx, components/LoginThemeOption.jsx}`, and semantic muted-text call sites. Reduced-motion CSS and Framer Motion user preference support are app-wide; long tab sets and tables scroll locally and remain keyboard accessible at narrow widths.
  - **Tooling:** `eslint.config.js`, `package.json`, `package-lock.json`. Direct additions are exactly `@axe-core/react@4.12.1` and `eslint-plugin-jsx-a11y@6.10.2`, both dev-only. Production output contains zero `axe-core` references.
- **`AppSelect` outcome:** full combobox ✅; native fallback on: **none**. Trigger/listbox/option roles, label-derived accessible name, `aria-expanded`/`aria-controls`/`aria-activedescendant`, arrows, Enter/Space, Escape, Home/End, 600 ms type-ahead, disabled-option skipping, scroll-into-view, Tab-close, and forwarded RHF refs are implemented.
- Contrast failures found and fixed:

  | Theme | White on accent | Accent on light | Result |
  |---|---:|---:|---|
  | Indigo | 5.88:1 | 5.36:1 | Pass |
  | Navy | 6.82:1 | 6.26:1 | Pass |
  | Royal Blue | 5.26:1 | 4.82:1 | Pass |
  | Sky | 5.85:1 | 5.49:1 | Pass |
  | Teal | 5.39:1 | 5.17:1 | Pass |
  | Emerald | 5.37:1 | 5.09:1 | Pass |
  | Violet | 5.88:1 | 5.36:1 | Pass |
  | Plum | 5.53:1 | 5.16:1 | Pass |
  | Rose | 6.06:1 | 5.51:1 | Pass |
  | Orange | 5.23:1 | 4.93:1 | Pass |
  | Amber | 5.05:1 | 4.87:1 | Pass |
  | Slate | 7.56:1 | 6.90:1 | Pass |

  Sky, Teal, Emerald, Orange, and Amber moved from `600` to `700` accents with `800` dark states. The live audit then found Rose-on-Rose-50 at 4.10:1, so Rose also moved to `700`/`800` (now 5.51:1). Dark-sidebar supporting text/placeholder opacity moved to 70%; light Orange/Amber and Slate navigation text moved one step darker; meaningful `slate-400` text moved to `slate-500` or `600`. The lowest audited supporting-text/placeholder pair is 4.77:1.
- a11y lint rules disabled (with inline reason): **one protected-scope exception only** — `jsx-a11y/alt-text` is off for `src/components/auth/FloatingIcons.jsx` because Run 6 forbids auth changes and the issue is reported below. `jsx-a11y/no-noninteractive-tabindex` remains an error but permits `role="region"` for deliberately focusable horizontal table scrollers, as required for keyboard scrolling.
- **What the accessibility-tree spot-check revealed that tooling did not:** modal focus originally landed on the header close button rather than the first logical field; mobile legacy action menus exposed plain buttons instead of menu items; long OEE tabs widened the main scroller at 320 px; and the protected auth password-visibility target is only 16 × 16 px. Those interaction/target-size problems were not fully described by static lint. After fixes, the browser accessibility tree presented logical page/list/form/dialog names, the first invalid control, labelled tables, live result counts, and roving tabs without confusing duplicate editable-app labels.
- Auth-page issues found — **reported, not fixed:** 36 decorative floating `<img>` elements have no `alt=""`/`aria-hidden`; sign-in content is outside a `main` landmark (`axe` region finding); and the password-visibility button is 16 × 16 px. Auth source diffs are zero. These require separate auth sign-off.
- Browser verification:
  - Keyboard: skip link first; route `h1` focus; `AppSelect` arrows/type-ahead/selection/Tab-close; modal first-focus, first-invalid focus, and trigger return; command-palette focus/return; drawer and filter-sheet traps/Escape/return; tab arrows/roving selection; record-menu arrows/Escape/return.
  - Reflow: Party list, OEE tabs/tables, and User modal passed at a 320 × 800 CSS viewport with body width equal to the viewport and no main-region horizontal overflow. The harness has no browser-zoom or reduced-motion emulation capability; the stricter 320 px reflow, `MotionConfig reducedMotion="user"`, and the global `prefers-reduced-motion` rule were verified instead.
  - Live `@axe-core/react`: zero editable findings on Dashboard, Party, Users, OEE Reports, Purchase Reports, Settings, Action Centre, the User create modal, and the mobile navigation drawer after resolving the discovered contrast and scroll-region findings. Protected auth findings are the exceptions listed above.
  - Screen-reader spot-check method: browser accessibility-tree snapshots on login, Dashboard, Party list, User create/error form, command palette, tabs, drawer, sheet, and modal. Native NVDA is not installed in this environment, so an OS-level speech-output pass remains a separate human acceptance step.
- Keyboard-only pass ✅ · Accessibility-tree spot-check ✅ · Zero editable-scope axe violations ✅
- Verified: lint ✅ (0 errors, 0 warnings, JSX a11y recommended) · test ✅ (35 files / 237 tests) · build ✅ · production axe references **0**
- Deviations / notes:
  - No production records were created or deleted during manual checks; invalid submit, wizard navigation, focus restoration, and deletion-neighbour logic were exercised without mutating operational data.
  - `eslint-plugin-jsx-a11y@6.10.2` does not yet declare ESLint 10 in its peer range, so the authorised install used legacy peer resolution. Runtime compatibility is verified by the clean lint gate.
  - `react-is@19.2.8` remains Recharts' transitive dependency and was not added directly. No unauthorised direct dependency, API, permission, function, or route change was made.

---

## Program completion gate

Tick only when all six runs are Complete.

- [x] `npm run lint` — 0 errors, 0 warnings (including jsx-a11y)
- [x] `npm run test` — 35 files / 237 tests pass, incl. `format.js`, `useUrlFilters`, signal registry, empty-state variants
- [x] `npm run build` — passes
- [x] **Zero** axe violations in editable application scope; protected auth exceptions are documented for sign-off
- [x] **Zero** horizontal scroll at 375 px (Run 5 matrix) and 320 px (Run 6 reflow)
- [x] **Zero** hardcoded hex outside `src/index.css`
- [x] **Zero** disabled controls without a reason
- [x] **Zero** "No data" empty states
- [x] Auth untouched
- [x] No functionality removed
- [x] No routes deleted (old routes redirect)

## Deferred / parked

Items raised during the program but deliberately out of scope. Add as they come up.

| Item | Raised in run | Why deferred |
|---|---|---|
| Header notification bell rewiring | 4 | Wait until Action Centre counts prove stable |
| Dismiss / snooze on action signals | 4 | Needs backend persistence |
| Remaining URL-state page conversions | 3 | Pilot first; list captured in Run 3 notes |
| Auth-page accessibility issues: 36 decorative images lack empty alt text; sign-in content has no `main` landmark; password-visibility target is 16 × 16 px | 6 | Auth is off-limits; needs separate sign-off |
