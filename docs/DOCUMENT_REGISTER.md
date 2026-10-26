# COSMOS — Documentation Register and Lifecycle
**Reviewed:** 2026-10-26 · **Inventory:** 158 tracked Markdown files in `main` at review time.

## One document of record per purpose
| Purpose | Canonical entrypoint | Retained detailed evidence |
|---|---|---|
| Discover docs | [README.md](README.md) | Root [README](../README.md) |
| Architecture | [SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md) | Backend architecture, backend knowledge |
| Progress/readiness | [PROJECT_STATUS.md](PROJECT_STATUS.md) | [Historical ledger](PROJECT_PROGRESS.md), [backend change log](../backend/docs/PROJECT_PROGRESS.md) |
| Module behaviour | [MODULES.md](MODULES.md) | `backend/docs/*_MODULE.md`, procurement/dispatch/shipment implementation documents |
| API and required fields | [API_AND_DATA_CONTRACTS.md](API_AND_DATA_CONTRACTS.md) | 3 large source matrices, audits and `backend/docs/required-fields/*.md` |
| Deployment and operations | [OPERATIONS.md](OPERATIONS.md) | DB README, System Owner, staging clean, proxy, GST runbook |
| QA and risk | [QUALITY_AND_RISKS.md](QUALITY_AND_RISKS.md) | `qa-reports/`, original historical technical debt and external provider decision records |
| Folder policy | [REPOSITORY_STRUCTURE.md](REPOSITORY_STRUCTURE.md) | Historical cleanup/audit PRs |

## Status legend
- **Current/maintained:** Portal masters. Update in normal feature PRs.
- **Reference/contract:** Deep implementation details, APIs, SQL/validators, security policies and client acceptance evidence. Keep intact until deliberate contract replacement.
- **Historical:** Audit reports, implementation trackers, UI test captures and dated progress notes. Retain for traceability, but avoid consulting them as the sole authority for today's state.
- **Candidate for archival:** Repeated status narrations without unique decisions, reproducible generated summaries, obsolete screenshots. Require comparison, owner confirmation and link migration before deletion.
- **Disposable:** Confirmed generated caches/logs with no reference value; not considered authoritative documentation.

## Important non-deletion decisions
1. The two 2026-10-09 COSMOS QA reports have different scope and length; **do not call them identical duplicates**.
2. `backend/docs/REQUIRED_FIELDS_MASTER.md`, `API_REQUIRED_FIELDS_MATRIX.md` and `DATABASE_REQUIRED_FIELDS.md` are complementary evidence with distinct derivations. Keep.
3. `docs/COSMOS_HSN_GST_*` and `docs/COSMOS_GST_EINVOICE_EWAYBILL_*` document sequential implementation, legal policy and blocked readiness. Preserve policy decisions even if implementation plans are superseded.
4. Historical `qa-reports/dispatch-excel-*` include business-rule decisions, verification and acceptance evidence; retain until explicit archival classification.
5. SQL migrations, SQL verification files, handwritten sample datasets and client handover are **not** document clutter.

## Document-retirement process
For each proposed removal, record: old path, destination or replacement master section, distinct information transferred, inbound Markdown/code/deployment references corrected, business/legal retention decision, reviewer, and link validation. Delete only after this checklist is completed. Use a separate cleanup PR so business facts cannot disappear silently.

## Scope of this consolidation
The first consolidation introduces canonical master documents and re-routes readers. It does not assert that any historic Markdown file is content-identical to another. **No unique historical or compliance documentation is deleted in this batch.** The objective is one maintained entrypoint per niche without destroying evidence.
