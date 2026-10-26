# COSMOS — Current Status and Roadmap
**Reviewed:** 2026-10-26 · **Repository base:** `main@7046dbd61592f1c10c442d19b75cdbde78a64b42`.
**Evidence level:** Repository source, documents and historical tests. **No live deployment, full test suite, or SQL deployment verification was executed as part of this consolidation.**

## Executive assessment
The project has implemented broad ERP APIs and a substantial React interface, but **enterprise production sign-off remains unverified**. Older progress reports mention successful builds and test counts at the time; they do not certify this revision. The integrated QA dated 2026-10-09 said **NOT READY FOR SIGN-OFF**.

## Domain status
| Domain | Source-evidenced capabilities | Remaining gate |
|---|---|---|
| Platform | JWT, roles/pages/permissions, System Owner, centralized business Activity Logs | Secret management, live role isolation and security tests |
| Masters and Trading | Items, categories/units, parties, sales invoices, purchase/expense and stock movements | Full transactional SQL tests, correctness of reports and API contracts |
| HR/OEE | Attendance, leave, payroll, OEE entries/dashboards | Lifecycle and environment integration checks |
| Reporting | General dashboard, sales/purchase/party/inventory reports | Numbers, permissions and exports verified with real data |
| Rojmel | Company/user/external wallets, transfers, income/expense, reports | Provisioning, RBAC and concurrency on staging |
| Supply Chain | Shared channels/mappings, Procurement, Dispatch, Shipment operations | Real workbook parity, warehouse/SKU grain and stock reconciliation |
| Manufacturing | Effective/versioned BOM and production foundations; shared Procurement BOM | Full migration, concurrency, rollback and workflow acceptance |
| Website/Data Book | Independent website CMS/warranty APIs; public/private Data Book | Public endpoint and attachment integration verification |
| GST/HSN | GST registrations/verification/session/log assets; HSN/SAC, rate-history and mapping routes/pages; compliance snapshot foundation and persisted-data eligibility endpoint | **Legal E-Invoice/E-Way Bill generation is deliberately blocked pending approved sales snapshot fields/confirmation policy and provider-contract verification** |

## Decisions and release blockers
1. **P0 — Security:** Prior QA identifies committed sensitive config; Compose contains literal System Owner password. Rotate and inject secured values. Do not rely on `.gitignore` to undo history.
2. **P0 — Deployment:** `deploy` workflow trigger currently pulls `main`; verify release identity, HTTPS, trusted proxy and frontend API routing.
3. **P1 — SQL:** Formal migration inventory and disposable/staging verification remain necessary; `backend/database/002_Verify_Database_Setup.sql` was a placeholder in the repository audit.
4. **P1 — GST compliance:** [Remediation report](COSMOS_GST_EINVOICE_EWAYBILL_MASTER_REMEDIATION_REPORT.md) documents `409 GST_SERVER_GENERATION_NOT_AVAILABLE`, not a finished compliant generation flow.
5. **P1 — Business assurance:** Reconcile stock, Rojmel transfers, shipment dispatch/returns, purchasing, manufacturing posting and cancellation with concrete test data.
6. **P2 — Documentation:** Use masters in this portal; retain dated source evidence in [register](DOCUMENT_REGISTER.md) until a safe archival migration.

## Roadmap
**Gate A:** rotate secrets, fix release branch selection and secure transport.
**Gate B:** reproducible clean build, tests, dependency audit and deployment/migration manifest.
**Gate C:** full RBAC, financial/stock, importer and GST test matrix in a disposable/staging environment.
**Gate D:** business acceptance and sign-off per module, then controlled production release.

### Historical evidence
[Legacy project progress](PROJECT_PROGRESS.md) · [backend milestones](../backend/docs/PROJECT_PROGRESS.md) · [QA reports](../qa-reports/) · [2026-10-26 audit](COSMOS_REPOSITORY_AUDIT_2026-10-26.md).
