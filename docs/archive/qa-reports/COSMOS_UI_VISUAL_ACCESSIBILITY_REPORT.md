# COSMOS ERP — Visual and Accessibility Report

## Responsive observations

`/party` was inspected at 1440×900, 1366×768, 768×1024 and 390×844. At each viewport the measured document/body width matched viewport width (no document-level horizontal overflow). The Party Master heading, controls and table shell remained present. This is a sampled layout result, not a blanket assertion that every grid/form is responsive.

## Accessibility observations

| Check | Result |
|---|---|
| Landmark structure | PASS (sampled): sidebar/navigation, banner, breadcrumbs and main landmarks were exposed. |
| Names/labels | PASS (sampled): buttons, table controls and filters had accessible names, e.g. `Open navigation menu`, `Search parties`, `Filter parties by status`, `Rows per page`. |
| Mobile navigation | PASS (sampled): 390px view offers a named menu dialog and close control. |
| Empty/error states | PASS for visibility: empty states were readable; Users showed a visible failure state. |
| Keyboard focus order, visible focus | UNVERIFIED — no exhaustive tab walk. |
| Dialog Escape/focus trap/restore | UNVERIFIED — dialog opened; Escape dismissal was not conclusively verified. |
| Contrast and screen-reader announcements | UNVERIFIED — no automated contrast scanner or assistive-technology run. |
| WCAG conformance | Not claimed. |

## Visual defects

No confirmed visual clipping, overlap, unreadable text or horizontal document overflow was observed on the Party Master sample across the four required viewports. UI-001 is an error-rendering defect; additionally, exposing a minified-style message (`t.find is not a function`) is a usability/accessibility concern because it offers no actionable explanation.

## Evidence

Browser screenshots were captured during dashboard, Users and responsive checks in the audit session. They contain no credentials, tokens or personal-data extracts and were not exported from the browser tooling. Re-run with an approved evidence-storage location if durable image attachments are required.
