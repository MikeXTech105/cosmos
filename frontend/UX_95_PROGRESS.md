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
| Information architecture | 55 | 95 | — | 3, 4 |
| Feedback & affordance | 58 | 95 | 95 | 2 |
| Data presentation | 60 | 95 | 95 | 2 |
| Empty / first-run | 40 | 95 | — | 3 |
| Mobile | 45 | 95 | — | 5 |
| Accessibility | 35 | 95 | — | 6 |

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
**Status:** Not started

Scope: shared `EmptyState` with three variants (`empty` / `filtered` / `error`) · zero-value KPI hints · `/getting-started` checklist from existing endpoints only · first-use hints · `useUrlFilters` hook · pilot conversion of `ItemsPage`, `PlanningHistoryPage`, `RBAC Users`.

- Files changed: —
- **Final URL key vocabulary (the contract for later runs):** —
- How `ProcurementSetupPage`'s `?tab=` scheme was matched: —
- **Pages still to convert (later runs):** —
- Getting-started dismissal persisted to: API ⬜ / localStorage ⬜ — reason: —
- Verified: lint ⬜ test ⬜ build ⬜
- Deviations / notes: —
- Open items: —

---

## Run 4 — Global search, Action Centre, navigation
**Prompt:** `RUN4_search_action_centre_navigation.md`
**Depends on:** Run 3 (URL key vocabulary for deep links)
**Status:** Not started

Scope: ⌘K searches records across permitted entities (debounce 300 ms, min 2 chars, request-id guard, `Promise.allSettled`) · `/action-centre` registry-driven signals · Procurement nav consolidated to 4 entries with old routes redirecting.

- Files changed: —
- Entities the palette searches: —
- Entities omitted (no `Search` param): —
- **Status enum values confirmed:** —
- **Signals omitted because a value couldn't be confirmed:** —
- "Items not classified" shipped? ⬜ — reason: —
- Redirect map for old procurement routes: —
- Every remaining sidebar id verified against a backend page permission? ⬜
- Verified: lint ⬜ test ⬜ build ⬜
- Deviations / notes: —
- Open items: —

---

## Run 5 — Mobile
**Prompt:** `RUN5_mobile.md`
**Depends on:** Run 3 (`activeCount` for the filter sheet)
**Status:** Not started

Scope: shared `MobileRecordCard` below `md` · 44 px touch targets · sidebar drawer below `lg` (focus trap, Esc, scroll lock, closes on route change) · filter bottom sheet · full-screen modals with sticky header/footer · inputs ≥ 16 px · zero horizontal scroll at 375 px.

- Files changed: —
- Mobile field set chosen per list: —
- Lists using per-action buttons vs overflow menu: —
- Pages needing more than a mechanical fix: —
- **Desktop confirmed unchanged?** ⬜ — how verified: —
- Tested at: 375 ⬜ 390 ⬜ 768 ⬜
- Verified: lint ⬜ test ⬜ build ⬜
- Deviations / notes: —
- Open items: —

---

## Run 6 — Accessibility
**Prompt:** `RUN6_accessibility.md`
**Depends on:** Run 1 (`forwardRef` — focus return is impossible without it), and Runs 2–5 (audits the finished surface)
**Status:** Not started

Scope: keyboard operability + skip link · focus management (`src/utils/focus.js`) · semantics/ARIA · **`AppSelect` combobox pattern** · live regions · contrast across all 12 accent themes · `prefers-reduced-motion` + 200 % zoom · `@axe-core/react` + `eslint-plugin-jsx-a11y`.

> **Authorised devDependencies for this run only:** `@axe-core/react`, `eslint-plugin-jsx-a11y`. Neither ships in the production bundle.

- Files changed: —
- **`AppSelect` outcome:** full combobox ⬜ / native fallback on: — (reason: —)
- Contrast failures found and how fixed (incl. which accent themes failed): —
- a11y lint rules disabled (with inline reason): —
- **What the screen-reader spot-check revealed that tooling did not:** —
- Auth-page issues found — **reported, not fixed:** —
- Keyboard-only pass ⬜ · Screen-reader spot-check ⬜ · Zero axe violations ⬜
- Verified: lint ⬜ test ⬜ build ⬜
- Deviations / notes: —

---

## Program completion gate

Tick only when all six runs are Complete.

- [ ] `npm run lint` — 0 errors, 0 warnings (including jsx-a11y)
- [ ] `npm run test` — all pass, incl. `format.js`, `useUrlFilters`, signal registry, empty-state variants
- [ ] `npm run build` — passes
- [ ] **Zero** axe violations across all pages
- [ ] **Zero** horizontal scroll at 375 px
- [ ] **Zero** hardcoded hex outside `src/index.css`
- [ ] **Zero** disabled controls without a reason
- [ ] **Zero** "No data" empty states
- [ ] Auth untouched
- [ ] No functionality removed
- [ ] No routes deleted (old routes redirect)

## Deferred / parked

Items raised during the program but deliberately out of scope. Add as they come up.

| Item | Raised in run | Why deferred |
|---|---|---|
| Header notification bell rewiring | 4 | Wait until Action Centre counts prove stable |
| Dismiss / snooze on action signals | 4 | Needs backend persistence |
| Remaining URL-state page conversions | 3 | Pilot first; list captured in Run 3 notes |
| Auth-page accessibility issues | 6 | Auth is off-limits; needs separate sign-off |
