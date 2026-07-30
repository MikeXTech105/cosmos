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
| Visual consistency | 82 | 95 | — | 2 |
| Component quality | 80 | 95 | 95 | 1 |
| Information architecture | 55 | 95 | — | 3, 4 |
| Feedback & affordance | 58 | 95 | — | 2 |
| Data presentation | 60 | 95 | — | 2 |
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
**Status:** Not started

Scope: `src/utils/format.js` (one date + number format app-wide) · numeric column discipline · `materialItemName`/`materialItemCode` fix incl. CSV export · buy-list `#` column + pluralisation · radius/padding/stat-grid drift · zero hardcoded hex · no unexplained disabled control · no silent sidebar drop · consistent loading states · error contract (400/409/404/403/network) · destructive-action discipline · specific success toasts.

- Files changed: —
- Call sites migrated to `format.js`: —
- Tables whose column mapping was wrong against its DTO: —
- Disabled controls given a reason: —
- Verified: lint ⬜ test ⬜ build ⬜
- Deviations / notes: —
- Open items: —

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
