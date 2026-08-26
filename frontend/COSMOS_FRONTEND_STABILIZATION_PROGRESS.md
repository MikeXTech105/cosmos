# COSMOS Frontend Stabilization Progress

Last updated: 2026-07-20 (Asia/Calcutta)

## Foundation and baseline

- [x] Read every repository file required by the stabilization brief before editing.
- [x] Verified that no earlier stabilization ledger existed.
- [x] Created this repository-root resumable ledger as the first codebase change.
- [x] Run and record baseline `npm install`.
- [x] Run and record baseline `npm run lint`.
- [x] Run and record baseline `npm run test`.
- [x] Run and record baseline `npm run build` and entry-bundle size.
- [x] Record baseline source/search counts.
- [ ] Preserve the public auth UI (`src/pages/auth/**`, `src/layouts/AuthLayout.jsx`).
- [ ] Verify no duplicate replacement files were introduced.

### Baseline command results

- `npm install` — PASS; up to date, audited 277 packages in 4s, 0 vulnerabilities.
- `npm run lint` — PASS; ESLint exited 0 with no findings.
- `npm run test` — PASS; 3 files, 50 tests, duration 1.23s.
- `npm run build` — PASS; Vite 8.0.16, 3,426 modules, built in 4.57s.
- Baseline entry chunk: `dist/assets/index-BZAX0fNn.js` 535.68 kB / 154.19 kB gzip; Vite emitted the >500 kB warning.

### Baseline searches

- Source files below `src`: 388.
- Placeholder export copy: 3 matches (`Users.jsx`, `Roles.jsx`, `PartyPage.jsx`).
- `/profile` and `/preferences` links: 2 matches, both in `UserMenu.jsx`; no matching routes existed.
- `bg-white/` in procurement/components: 4 matches (2 procurement translucent content surfaces, 1 active-step treatment, 1 public auth theme class).
- `indigo-` under the requested settings/components/pages roots: 2 unique settings matches (reported twice by overlapping roots).
- `react-hot-toast`: 1 manifest match; no source imports.

## Phase 1 — Shared reliability primitives

- [x] Move `useLatestRequest` to `src/hooks/useLatestRequest.js` and migrate all imports.
- [x] Add abortable request lifecycle (`beginAbortableRequest`, `cancelAllRequests`) and unmount cleanup.
- [x] Add normalized API status, field-error, correlation-id, and common-status helpers.
- [x] Make procurement helpers reuse the shared API-error utilities.
- [x] Add safe blob download, RFC filename parsing, and JSON-blob error handling.
- [x] Extend CSV export with BOM, explicit columns, nested getters, action exclusion, download, and progress support.
- [x] Add shared `StatScopeBadge`.
- [x] Add primitive unit tests.
- [x] Phase verification: lint / test / build.

## Phase 2 — Shared controls and accessibility

- [x] Upgrade `AppButton` loading copy, props, disabled state, and ARIA.
- [x] Give every loading button action-specific copy.
- [x] Upgrade `AppInput` with `forwardRef`, generated IDs, and label/error/helper ARIA.
- [x] Upgrade `AppSelect` to a collision-aware portal with resilient keyboard/focus/outside behavior.
- [x] Upgrade `AppModal` with configurable close behavior, busy protection, internal scrolling, and focus management.
- [x] Make the command palette a truthful, accessible keyboard dialog and update Header copy.
- [x] Phase verification: lint / test / build.

## Phase 3 — Personal pages, navigation, and mobile shell

- [x] Add real Profile page/service and `/api/auth/me` endpoint handling with read-only unsupported fallback.
- [x] Update the Redux auth snapshot and active auth storage immediately after profile save.
- [x] Add real Preferences page with namespaced storage and default page-size preference.
- [x] Route `/profile` and `/preferences`; align UserMenu behavior.
- [x] Remove generic `Owner` privileged bypass while retaining exact Super Admin/System Owner aliases.
- [x] Add longest-route sidebar matching utility and tests.
- [x] Make RBAC breadcrumbs link Home to the default authorized route.
- [x] Implement a real mobile sidebar drawer with focus, scroll lock, Escape, backdrop, and navigation close behavior.
- [x] Phase verification: lint / test / build.

## Phase 4 — Session lifecycle and crash containment

- [x] Add cross-tab auth synchronization.
- [x] Add JWT expiry helpers and a singleton refresh/session service.
- [x] Gate protected routes on validated/refreshed sessions.
- [x] Add an application error boundary with recovery UI.
- [x] Phase verification: lint / test / build.

## Phase 5 — KPI and summary correctness

- [x] Preserve optional `summary` and `summaryScope` list metadata centrally.
- [x] Correct inventory Item/Category/Unit KPI scope.
- [x] Correct Party KPI scope.
- [x] Correct Sales Invoice KPI scope.
- [x] Correct Purchase document, Expense, Supplier Payment, and Expense Category KPI scope.
- [x] Correct Department, Designation, and Shift KPI scope.
- [x] Correct OEE master KPI scope.
- [x] Audit remaining statistic cards and document selected/detail, page-scoped, backend-summary, or complete-collection decisions.
- [x] Phase verification: lint / test / build.

## Phase 6 — Party filtering, pagination, and async safety

- [x] Map the final Party query contract (`PartyType`, `HasGstin`, `HasCreditLimit`, `Search`, `IsActive`, pagination, sort).
- [x] Reset page number for every filtering/grouping change.
- [x] Prefer backend-filtered paged results and summary metadata without current-page re-filtering.
- [x] Add bounded all-page fallback (200 rows/batch, 5,000-row cap) for unsupported server filters.
- [x] Add a clear fallback/cap note and correct result/footer/group-count copy.
- [x] Abort/ignore stale list, detail, and settings responses. Export request safety is completed with the Phase 7 export implementation.
- [x] Phase verification: lint / test / build.

## Phase 7 — Real exports

- [x] Add Users, Roles, Parties, and Report export endpoints without duplicates.
- [x] Implement server blob exports with safe 404/405/501 client fallbacks for Users/Roles/Parties.
- [x] Implement full report export with backend POST and bounded all-page client fallback.
- [x] Dedupe fallback rows, cap safely, support abort/progress, enforce permission, and surface structured errors.
- [x] Phase verification: lint / test / build.

## Phase 8 — Redux request ordering

- [x] Harden inventory list/detail slices with request IDs.
- [x] Harden HR list/detail slices with request IDs.
- [x] Harden OEE list/detail slices with request IDs.
- [x] Harden Sales and Purchase list/detail slices with request IDs.
- [x] Prevent stale modal detail responses from replacing the currently selected record.
- [x] Phase verification: lint / test / build.

## Phase 9 — Form/API error integration

- [x] Add and test shared `formApiErrors` application helper.
- [x] Upgrade Category, Unit, and Item forms.
- [x] Upgrade Party form.
- [x] Upgrade User, Role, and Page forms.
- [x] Upgrade Expense Category form.
- [x] Upgrade Department, Designation, and Shift forms.
- [x] Upgrade OEE master forms.
- [x] Handle 400/422 fields, 409 conflict, 404 stale record, 403 permission, and network errors consistently.
- [x] Phase verification: lint / test / build.

## Phase 10 — Design and metadata cleanup

- [x] Remove settings-only indigo styling in favor of shared brand tokens.
- [x] Remove procurement translucent white surfaces that violate the shell design.
- [x] Update title, description, theme metadata, and favicon.
- [x] Add route-aware `useDocumentTitle` without touching public auth page styling.
- [x] Phase verification: lint / test / build.

## Phase 11 — Runtime configuration and deployment

- [x] Add runtime config loader and `public/runtime-config.js` fallback.
- [x] Remove API module-import throws and provide a clear runtime configuration failure path.
- [x] Add documented `.env.example`.
- [x] Use `npm ci` and runtime environment injection in Docker.
- [x] Add `.dockerignore`.
- [x] Add nginx SPA routing, cache rules, gzip, and security headers.
- [x] Phase verification: lint / test / build.

## Phase 12 — Dependency and bundle cleanup

- [x] Remove `react-hot-toast` from manifest/lock and verify no imports.
- [x] Preserve lazy PDF imports.
- [x] Add conservative stable vendor chunks.
- [x] Record before/after bundle output and remove/reduce the >500 KB entry warning.
- [x] Phase verification: lint / test / build.

## Phase 13 — Regression coverage

- [x] Add `sidebarRoute` tests.
- [x] Update `permissionResolver` tests for Owner/System Owner behavior.
- [x] Add `apiError` tests.
- [x] Add `fileDownload` tests.
- [x] Extend CSV/export tests.
- [x] Add `formApiErrors` tests.
- [x] Extend auth-storage/synchronization tests.
- [x] Add JWT tests and verify the shared session-service integration.
- [x] Add summary normalization and Party query/fallback tests.
- [x] Add export fallback tests.
- [x] Final verification: lint / test / build.
- [x] Browser smoke-test matrix completed or exact environmental blocker recorded: the Vite server started normally at `127.0.0.1:4173`, but the Codex in-app Browser exposed no existing tabs and timed out waiting for its webview to attach on three fresh-tab attempts. The documented visibility recovery remained `false`. Authenticated desktop/mobile/keyboard/cross-tab flows therefore could not be exercised on this host. Docker and nginx executables are also unavailable for a container smoke test.

## Exact files changed

- `COSMOS_FRONTEND_STABILIZATION_PROGRESS.md` — created the required resumable implementation ledger.
- `src/hooks/useLatestRequest.js` — shared latest/abortable request lifecycle.
- `src/pages/procurement/useLatestRequest.js` — removed after import migration.
- `src/pages/procurement/ProcurementShared.jsx`, `useProcurementChannels.js`, and procurement feature pages — migrated shared hook imports.
- `src/utils/apiError.js`, `src/pages/procurement/procurementHelpers.js` — centralized structured API metadata parsing.
- `src/utils/fileDownload.js`, `src/utils/csv.js`, `src/components/common/StatScopeBadge.jsx` — shared download/export/scope primitives.
- `src/utils/apiError.test.js`, `src/utils/fileDownload.test.js`, `src/utils/csv.test.js` — primitive regression coverage.
- `src/components/common/AppButton.jsx`, `AppInput.jsx`, `AppSelect.jsx`, `AppModal.jsx` — shared control accessibility and modal/portal reliability.
- `src/components/layout/SearchCommand.jsx`, `Header.jsx`, `src/utils/searchCommand.js`, `src/utils/searchCommand.test.js` — accessible command palette and truthful search copy.
- Form, confirmation, export, procurement, HR, OEE, sales, purchase, inventory, and RBAC call sites — action-specific loading text and modal busy state.

- `src/pages/profile/**`, `src/services/profile/profileService.js`, `src/api/endpoints.js`, `src/store/slices/authSlice.js`, `src/utils/authStorage.js` - self-profile API, fallback screen, validation, and immediate auth snapshot persistence.
- `src/pages/preferences/**`, `src/utils/preferencesStorage.js`, `src/utils/preferencesStorage.test.js` - personal appearance and table-default preferences.
- `src/routes/AppRoutes.jsx`, `src/utils/authorizedRoute.js`, `src/components/layout/UserMenu.jsx` - authenticated personal routes and keyboard-safe user menu.
- `src/utils/permissionResolver.js`, `src/utils/permissionResolver.test.js` - exact privileged-role aliases without the generic Owner bypass.
- `src/utils/sidebarRoute.js`, `src/utils/sidebarRoute.test.js`, `src/hooks/useSidebar.js`, `src/components/layout/SidebarItem.jsx` - longest-route active navigation.
- `src/components/layout/Breadcrumbs.jsx`, `Header.jsx`, `Sidebar.jsx`, `SidebarGroup.jsx`, `src/store/slices/sidebarSlice.js` - RBAC-aware Home and accessible off-canvas mobile navigation.

- `src/components/auth/AuthSessionSync.jsx`, `src/utils/authStorage.js`, `src/utils/authStorage.test.js` - cross-tab and same-tab auth snapshot synchronization.
- `src/utils/jwt.js`, `src/utils/jwt.test.js`, `src/services/sessionService.js`, `src/api/axios.js`, `src/routes/ProtectedRoute.jsx` - expired-safe JWT startup gate and singleton refresh lifecycle.
- `src/components/errors/AppErrorBoundary.jsx`, `src/main.jsx` - global render recovery while retaining Provider and app theme context.

- `src/store/slices/inventory/inventorySliceHelpers.js`, inventory/HR/OEE/Sales/Purchase slice helpers and slices, plus `inventorySliceHelpers.test.js` - optional summary preservation and scope metadata.
- Inventory, Party, Sales Invoice, Purchase, HR, and OEE KPI pages/components - backend-summary consumption with explicit all-matching/current-page scope badges.

- `src/pages/party/partyHelpers.js`, `partyHelpers.test.js`, `partyService.js`, `PartyPage.jsx`, `PartyFilters.jsx`, and `PartyStats.jsx` - final Party query mapping, server-summary mode, bounded client compatibility mode, accurate pagination copy, and stale-request protection.

- `src/api/endpoints.js`, RBAC/Party services and pages, `src/utils/fileDownload.js` - real Users/Roles/Parties blob exports with structured-error handling and complete filtered CSV fallbacks.
- `src/services/reports/reportExportService.js`, `reportExportService.test.js`, `src/pages/reports/ReportView.jsx` - backend report export plus abortable, deduplicated, progress-aware all-page fallback capped at 10,000 rows.

- `src/store/slices/inventory/inventorySliceHelpers.js`, Item/Category/Unit slices, `src/store/slices/hr/hrSliceUtils.js`, `payrollSlice.js`, `src/store/slices/oee/oeeSliceUtils.js`, dashboard/report slices, Sales Invoice, Purchase factory/Bill/Order, and RBAC Page slices - request/entity identity tracking that ignores stale list and detail completions without suppressing independent mutations.
- `src/pages/inventory/items/ItemsPage.jsx`, `categories/CategoriesPage.jsx`, `units/UnitsPage.jsx`, `src/pages/rbac/users/Users.jsx`, `roles/Roles.jsx`, `pages/PagesPage.jsx`, `src/pages/hr/departments/DepartmentsPage.jsx`, `designations/DesignationsPage.jsx`, `shifts/ShiftsPage.jsx`, and `src/pages/oee/OeeMasterPage.jsx` - shared latest-request modal invariants with close/switch invalidation and abort where supported.
- `src/services/rbac/userService.js`, `roleService.js` - abort-signal support for detail requests.
- `src/store/slices/hr/hrSliceUtils.test.js` - stale list/detail request regression coverage.

- `src/utils/formApiErrors.js`, `formApiErrors.test.js` - tested PascalCase/alias-aware API field binding, conflict metadata, unbound/global errors, and first-field focus requests.
- Inventory Category/Unit/Item, Party, RBAC User/Role/Page, Expense Category, HR Department/Designation/Shift, and shared OEE master forms/pages - inline 400/422/409 errors with preserved values; contextual 404 close-and-refresh behavior; shared 403/server/network messages.

- `src/pages/settings/sections/AppearanceSection.jsx`, `components/SettingsCard.jsx` - removed hardcoded indigo/brand gradients and use shared brand tokens; moon color remains semantic slate.
- `src/pages/procurement/ProcurementShared.jsx`, `generatePlan/GeneratePlanPage.jsx` - replaced translucent white content/detail surfaces with solid semantic surfaces.
- `index.html`, `public/favicon.svg`, `src/hooks/useDocumentTitle.js`, `src/layouts/MainLayout.jsx` - COSMOS metadata/source favicon and authenticated route-aware titles; public auth page components/layout were not restyled or refactored.

- `src/config/runtimeConfig.js`, `runtimeConfig.test.js`, `src/components/errors/RuntimeConfigGate.jsx`, `public/runtime-config.js`, `src/api/axios.js`, `src/main.jsx`, `index.html`, `.env.example` - runtime/build/same-origin API resolution, non-throwing validation, and visible invalid-configuration UI while retaining the existing local `.env` fallback.
- `Dockerfile`, `.dockerignore`, `docker/40-cosmos-runtime-config.sh`, `nginx.conf` - reproducible `npm ci` image build, escaped runtime `API_BASE_URL` injection, SPA fallback, immutable assets, no-cache shell/runtime config, gzip, and conservative security headers.

- `package.json`, `package-lock.json` - removed unused `react-hot-toast` (275 installed packages, zero audit vulnerabilities).
- `vite.config.js` - conservative React/Redux/forms/motion/charts/PDF/UI vendor chunks; PDF document/render libraries remain below 500 kB and are still requested only by the existing dynamic export path.
- `src/utils/csv.js` - static shared download import removes the ineffective dynamic-import advisory.

## Final working-tree file manifest

This is the exact final path inventory for the implementation. The repository had pre-existing local changes; they were preserved, and this manifest records the resulting unstaged working tree without claiming authorship of unrelated pre-existing edits.

### Added (37)

- `.dockerignore`
- `.env.example`
- `COSMOS_FRONTEND_STABILIZATION_PROGRESS.md`
- `docker/40-cosmos-runtime-config.sh`
- `public/runtime-config.js`
- `src/components/auth/AuthSessionSync.jsx`
- `src/components/common/StatScopeBadge.jsx`
- `src/components/errors/AppErrorBoundary.jsx`
- `src/components/errors/RuntimeConfigGate.jsx`
- `src/config/runtimeConfig.js`
- `src/config/runtimeConfig.test.js`
- `src/hooks/useDocumentTitle.js`
- `src/hooks/useLatestRequest.js`
- `src/pages/party/partyHelpers.test.js`
- `src/pages/preferences/PreferencesPage.jsx`
- `src/pages/preferences/index.js`
- `src/pages/profile/ProfilePage.jsx`
- `src/pages/profile/index.js`
- `src/services/profile/profileService.js`
- `src/services/reports/reportExportService.js`
- `src/services/reports/reportExportService.test.js`
- `src/services/sessionService.js`
- `src/store/slices/hr/hrSliceUtils.test.js`
- `src/store/slices/inventory/inventorySliceHelpers.test.js`
- `src/utils/apiError.test.js`
- `src/utils/fileDownload.js`
- `src/utils/fileDownload.test.js`
- `src/utils/formApiErrors.js`
- `src/utils/formApiErrors.test.js`
- `src/utils/jwt.js`
- `src/utils/jwt.test.js`
- `src/utils/preferencesStorage.js`
- `src/utils/preferencesStorage.test.js`
- `src/utils/searchCommand.js`
- `src/utils/searchCommand.test.js`
- `src/utils/sidebarRoute.js`
- `src/utils/sidebarRoute.test.js`

### Modified (118)

- `Dockerfile`
- `index.html`
- `nginx.conf`
- `package-lock.json`
- `package.json`
- `public/favicon.svg`
- `src/api/axios.js`
- `src/api/endpoints.js`
- `src/components/common/AppButton.jsx`
- `src/components/common/AppInput.jsx`
- `src/components/common/AppModal.jsx`
- `src/components/common/AppSelect.jsx`
- `src/components/layout/Breadcrumbs.jsx`
- `src/components/layout/Header.jsx`
- `src/components/layout/SearchCommand.jsx`
- `src/components/layout/Sidebar.jsx`
- `src/components/layout/SidebarItem.jsx`
- `src/components/layout/UserMenu.jsx`
- `src/hooks/useSidebar.js`
- `src/layouts/MainLayout.jsx`
- `src/main.jsx`
- `src/pages/hr/HrShared.jsx`
- `src/pages/hr/attendance/AttendancePage.jsx`
- `src/pages/hr/departments/DepartmentFormModal.jsx`
- `src/pages/hr/departments/DepartmentStats.jsx`
- `src/pages/hr/departments/DepartmentsPage.jsx`
- `src/pages/hr/designations/DesignationFormModal.jsx`
- `src/pages/hr/designations/DesignationStats.jsx`
- `src/pages/hr/designations/DesignationsPage.jsx`
- `src/pages/hr/employees/EmployeeBankModal.jsx`
- `src/pages/hr/employees/EmployeeDocumentModal.jsx`
- `src/pages/hr/employees/EmployeeFormModal.jsx`
- `src/pages/hr/employees/EmployeeLifecycleModal.jsx`
- `src/pages/hr/leaves/LeavesPage.jsx`
- `src/pages/hr/payroll/PayrollPage.jsx`
- `src/pages/hr/shifts/ShiftFormModal.jsx`
- `src/pages/hr/shifts/ShiftStats.jsx`
- `src/pages/hr/shifts/ShiftsPage.jsx`
- `src/pages/inventory/InventoryShared.jsx`
- `src/pages/inventory/categories/CategoriesPage.jsx`
- `src/pages/inventory/categories/CategoryFormModal.jsx`
- `src/pages/inventory/categories/CategoryStats.jsx`
- `src/pages/inventory/items/ItemFormModal.jsx`
- `src/pages/inventory/items/ItemStats.jsx`
- `src/pages/inventory/items/ItemsPage.jsx`
- `src/pages/inventory/units/UnitFormModal.jsx`
- `src/pages/inventory/units/UnitStats.jsx`
- `src/pages/inventory/units/UnitsPage.jsx`
- `src/pages/oee/OeeMasterPage.jsx`
- `src/pages/oee/OeeShared.jsx`
- `src/pages/oee/productionEntries/OeeProductionEntriesPage.jsx`
- `src/pages/oee/reports/OeeReportsPage.jsx`
- `src/pages/party/PartyFilters.jsx`
- `src/pages/party/PartyFormModal.jsx`
- `src/pages/party/PartyPage.jsx`
- `src/pages/party/PartyStats.jsx`
- `src/pages/party/partyHelpers.js`
- `src/pages/party/partyService.js`
- `src/pages/procurement/ProcurementShared.jsx`
- `src/pages/procurement/bomMapping/BomMappingPage.jsx`
- `src/pages/procurement/generatePlan/GeneratePlanPage.jsx`
- `src/pages/procurement/planningHistory/PlanningHistoryPage.jsx`
- `src/pages/procurement/procurementHelpers.js`
- `src/pages/procurement/salesImport/SalesImportPage.jsx`
- `src/pages/procurement/settings/ProcurementSettingsPage.jsx`
- `src/pages/procurement/skuMapping/SkuMappingPage.jsx`
- `src/pages/procurement/useProcurementChannels.js`
- `src/pages/purchase/PurchaseShared.jsx`
- `src/pages/purchase/documents/ConvertOrderModal.jsx`
- `src/pages/purchase/documents/PurchaseDocumentFormModal.jsx`
- `src/pages/purchase/documents/PurchaseDocumentListPage.jsx`
- `src/pages/purchase/expenseCategories/ExpenseCategoriesPage.jsx`
- `src/pages/purchase/expenses/ExpensesPage.jsx`
- `src/pages/purchase/supplierPayments/SupplierPaymentsPage.jsx`
- `src/pages/rbac/pages/PageFormModal.jsx`
- `src/pages/rbac/pages/PagesPage.jsx`
- `src/pages/rbac/roles/RoleModal.jsx`
- `src/pages/rbac/roles/Roles.jsx`
- `src/pages/rbac/users/UserModal.jsx`
- `src/pages/rbac/users/Users.jsx`
- `src/pages/reports/ReportView.jsx`
- `src/pages/sales/invoices/InvoiceFormModal.jsx`
- `src/pages/sales/invoices/InvoiceShared.jsx`
- `src/pages/sales/invoices/InvoiceStats.jsx`
- `src/pages/sales/invoices/PaymentModal.jsx`
- `src/pages/sales/invoices/SalesInvoicesPage.jsx`
- `src/pages/settings/components/SettingsCard.jsx`
- `src/pages/settings/sections/AppearanceSection.jsx`
- `src/routes/AppRoutes.jsx`
- `src/routes/ProtectedRoute.jsx`
- `src/services/rbac/roleService.js`
- `src/services/rbac/userService.js`
- `src/store/slices/authSlice.js`
- `src/store/slices/hr/hrSliceUtils.js`
- `src/store/slices/hr/payrollSlice.js`
- `src/store/slices/inventory/categorySlice.js`
- `src/store/slices/inventory/inventorySliceHelpers.js`
- `src/store/slices/inventory/itemSlice.js`
- `src/store/slices/inventory/unitSlice.js`
- `src/store/slices/oee/oeeDashboardSlice.js`
- `src/store/slices/oee/oeeReportSlice.js`
- `src/store/slices/oee/oeeSliceUtils.js`
- `src/store/slices/procurement/procurementSliceUtils.js`
- `src/store/slices/purchase/purchaseBillSlice.js`
- `src/store/slices/purchase/purchaseOrderSlice.js`
- `src/store/slices/purchase/purchaseSliceFactory.js`
- `src/store/slices/rbac/pageSlice.js`
- `src/store/slices/sales/invoiceSlice.js`
- `src/store/slices/sidebarSlice.js`
- `src/utils/apiError.js`
- `src/utils/authStorage.js`
- `src/utils/authStorage.test.js`
- `src/utils/authorizedRoute.js`
- `src/utils/csv.js`
- `src/utils/csv.test.js`
- `src/utils/permissionResolver.js`
- `src/utils/permissionResolver.test.js`
- `vite.config.js`

### Removed (1)

- `src/pages/procurement/useLatestRequest.js`

## Backend-dependent features and fallback status

- Self-profile depends on `GET /api/auth/me` and `PUT /api/auth/me`. A 404/405/501 GET response falls back to the persisted Redux user snapshot in read-only mode; no privileged Users/Edit endpoint is used.
- Party server mode depends on the documented `data.summary` counts. Without it, the client loads base Search/IsActive results in batches of 200 up to 5,000 records and filters/paginates the complete collection; larger datasets show a clear server-support requirement and retain base Search/IsActive paging.
- Exports prefer `GET /api/users/export`, `GET /api/roles/export`, `GET /api/v1/parties/export`, and `POST /api/v1/reports/export`. A 404/405/501 response activates complete-collection CSV fallback; Party fallback is capped at 5,000 rows and paged report fallback at 10,000 rows, after which backend export is explicitly required.
- Live endpoint behavior still requires capability verification against an authenticated deployed backend. All requested frontend paths and bounded compatibility fallbacks are implemented.

## KPI scope decisions

- Backend-summary when present, with current-page fallback badges: inventory product/service/low-stock and active/inactive counts; sales amounts/unpaid/overdue; purchase financial totals; expenses; supplier payments; HR master counts; OEE master counts.
- Server pagination totals remain all-matching: total item/category/unit/invoice/document/expense/payment/HR/OEE counts.
- Party fallback metrics are explicitly current-page until Phase 6 detects the required server summary; total server count remains all-matching.
- Attendance and Leave status cards are intentionally current-page and are visibly labeled as such.
- Payroll cards are derived from the selected payroll run, not a paginated list, and remain valid without a page-scope badge.
- RBAC Users, Roles, and Pages currently consume unpaged complete collections and calculate client-side totals over that complete response.

## Verification history

- 2026-07-20 Phase 13 final — lint PASS with zero errors/warnings; tests PASS (15 files / 101 tests); build PASS (3,445 modules, entry 206.54 kB / 45.16 kB gzip, largest lazy chunk 400.95 kB / 130.31 kB gzip, no build warnings). Browser smoke was attempted after a normal local Vite startup and is blocked by the in-app Browser webview attachment failure recorded above.
- 2026-07-20 Phase 12 - lint PASS; tests PASS (15 files / 97 tests); build PASS. Entry reduced from baseline 535.68 kB / 154.19 kB gzip to 206.54 kB / 45.18 kB gzip; largest chunk is lazy `pdf-document-vendor` at 400.95 kB / 130.31 kB gzip; no >500 kB or ineffective-import warnings.
- 2026-07-20 Phase 11 - lint PASS; tests PASS (15 files / 97 tests); build PASS (entry 471.04 kB / 128.45 kB gzip; no size warning). Built output contains runtime config before the module entry. Docker/nginx execution is deferred to final deployment smoke because Docker and nginx executables are absent on this host.
- 2026-07-20 Phase 10 - lint PASS; tests PASS (14 files / 94 tests); build PASS (entry 470.17 kB / 128.24 kB gzip; no size warning; zero settings indigo/procurement translucent-panel matches).
- 2026-07-20 Phase 9 - lint PASS; tests PASS (14 files / 94 tests); build PASS (entry 470.17 kB / 128.26 kB gzip; no size warning; ineffective dynamic-import advisory remains queued for Phase 12).
- 2026-07-20 Phase 8 - lint PASS; tests PASS (13 files / 91 tests); build PASS (entry 470.04 kB / 128.21 kB gzip; no size warning; ineffective dynamic-import advisory remains queued for Phase 12).
- 2026-07-20 Phase 7 - lint PASS; tests PASS (12 files / 89 tests); build PASS (entry 463.61 kB / 127.63 kB gzip; no size warning; one ineffective dynamic-import advisory queued for Phase 12).
- 2026-07-20 Phase 6 - lint PASS; tests PASS (11 files / 86 tests); build PASS (entry 463.50 kB / 127.59 kB gzip; no >500 kB entry warning).
- 2026-07-20 Phase 5 - lint PASS; tests PASS (10 files / 82 tests); build PASS (entry 463.41 kB / 127.56 kB gzip; no >500 kB entry warning).
- 2026-07-20 Phase 4 - lint PASS; tests PASS (9 files / 80 tests); build PASS (entry 451.51 kB / 123.49 kB gzip; no >500 kB entry warning observed).
- 2026-07-20 Phase 3 - lint PASS; tests PASS (8 files / 71 tests); build PASS (entry 547.44 kB / 157.44 kB gzip, warning retained for Phase 12).
- 2026-07-20 baseline — install PASS; lint PASS; tests PASS (50); build PASS with one >500 kB chunk warning.
- 2026-07-20 Phase 1 — lint PASS; tests PASS (60); build PASS (entry 536.26 kB / 154.38 kB gzip, warning retained for Phase 12).
- 2026-07-20 Phase 2 — lint PASS; tests PASS (62); build PASS (entry 536.26 kB / 154.37 kB gzip, warning retained for Phase 12).
