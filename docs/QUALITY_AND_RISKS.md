# COSMOS — Quality Gates, Risk Register and Audit Evidence
**Reviewed:** 2026-10-26 · **Baseline:** GitHub `main@7046dbd61592f1c10c442d19b75cdbde78a64b42`.

## Release gates
| Gate | Evidence required | Current documentary status |
|---|---|---|
| Secrets | Rotated production-like values, masked CI, no tracked credentials | **Open** |
| Deployment | Pinned release SHA, HTTPS, correct frontend API origin, safe environment | **Needs live verification** |
| Code quality | Clean restore/build, backend tests, frontend lint/test/build, security scan | **Current run not performed** |
| SQL | Migration inventory, clean apply, upgrades, rollback and module smoke tests | **Current run not performed** |
| Security | JWT lifecycle, RBAC, owner/private scoping, audit redaction | **Needs integrated tests** |
| Finance/Stock | Invoice/stock, purchase/stock, Rojmel and manufacturing/shipment reversals | **Needs integrated tests** |
| GST/legal | Approved policy, historical snapshots, statutory generation and reconciliation | **Generation currently deliberately blocked** |
| Product acceptance | Client workbook mapping, user workflows, reports and exports | **Needs signed acceptance** |

## Source-grounded high-priority risk register
- **Critical — Secrets:** Earlier QA documented repository credentials; Compose has hardcoded System Owner bootstrap secret. See [repository audit](COSMOS_REPOSITORY_AUDIT_2026-10-26.md) and [historical QA](../qa-reports/COSMOS_FULL_QA_AUDIT_REPORT.md).
- **High — Deployment/ref selection:** GitHub workflow triggers `deploy` and pulls `main`.
- **High — HTTPS and API routing:** Historical 2026-10-09 live QA found HTTP-only access and SPA routes returning HTML instead of API JSON; re-test present deployment.
- **High — GST compliance:** [E-document remediation](COSMOS_GST_EINVOICE_EWAYBILL_MASTER_REMEDIATION_REPORT.md) states required immutable legal snapshots, approved rules and provider reconciliation are incomplete.
- **High — Database confidence:** Scripts and tests exist, but applied target SQL, live user permissions and stock consistency need evidence.
- **Medium — Documentation drift:** Dated source ledgers are often mistaken for current status; this portal distinguishes canonical overview from historical evidence.

## Audit evidence (retained; do not treat as fresh)
- [Integrated QA audit](../qa-reports/COSMOS_FULL_QA_AUDIT_REPORT.md) — 2026-10-09, includes explicit out-of-scope/public website qualifications.
- [Full live QA audit](../COSMOS_FULL_QA_AUDIT_REPORT.md) — same date, different coverage/scope; not assumed identical.
- [API contract / runtime / UI reports](../qa-reports/) — multiple distinct verification surfaces.
- [Dispatch parity and policy decisions](../qa-reports/dispatch-excel-fix/) — retain for client business-rule traceability.
- [Historical technical debt](../backend/TECHNICAL_DEBT.md) — issue inventory, not automatically current.
- [Current repo review](COSMOS_REPOSITORY_AUDIT_2026-10-26.md) — source-only; no live test.

## Closing an issue
Attach change/commit, verification command and date, environment, data/role scenario, result, rollback concern and reviewer. Never close an issue because a migration or source file merely exists.
