# COSMOS Documentation Portal
**Document status:** Current navigation index · **Reviewed:** 2026-10-28 · **Evidence:** GitHub `main` at `7046dbd61592f1c10c442d19b75cdbde78a64b42`.

## Start here

The 28 October complete-brief delivery is indexed in [current status](PROJECT_STATUS.md), with [Gujarati client flows](../handoff/COSMOS_CLIENT_FLOW_GUIDE_GU.md), [user-run SQL verification](OPERATIONS.md#complete-brief-verification-28-october) and [exact automated evidence](../output/implementation-verification/verification-results.json). SQL/authenticated/provider acceptance remains explicit in those records.

| Topic | Canonical document | What it answers |
|---|---|---|
| Project overview and architecture | [SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md) | Architecture, module dependencies and technical rules |
| Current state, readiness and roadmap | [PROJECT_STATUS.md](PROJECT_STATUS.md) | Source-evidenced implementation and outstanding verification |
| Enterprise module guide | [MODULES.md](MODULES.md) | Business boundaries, main workflows and authoritative module specifications |
| Interfaces and required fields | [API_AND_DATA_CONTRACTS.md](API_AND_DATA_CONTRACTS.md) | API convention, validation evidence and database contracts |
| Installation, database and security | [OPERATIONS.md](OPERATIONS.md) | Deployment controls, migrations, secrets and verification |
| QA and incident management | [QUALITY_AND_RISKS.md](QUALITY_AND_RISKS.md) | Release gates, audit evidence, backlog and open risks |
| Historical documents and ownership | [DOCUMENT_REGISTER.md](DOCUMENT_REGISTER.md) | Authoritative vs retained evidence; retirement/deletion rules |
| Structure and cleanup | [REPOSITORY_STRUCTURE.md](REPOSITORY_STRUCTURE.md) | Folder ownership and safe cleanup plan |

## Documentation policy
1. Update the appropriate **master document** alongside a business or architecture change. Do not create an additional "final report" or "tracker" for every change.
2. Module-specific detail stays in existing `backend/docs/*_MODULE.md`, implementation, migration, and integration records where it is more precise than this portal. Refer to it rather than copying data into multiple places.
3. Historic audit findings and dated test results are evidence **as of their dates**, not current production certifications. Check code, staging and logs before marking them closed.
4. Do not delete SQL migrations, field-mapping evidence, compliance decisions, client acceptance records or handover artifacts based solely on age.
5. Every master document should contain owner/scope, last reviewed date, verified evidence, unknowns, and required update triggers. Where source records disagree, preserve that disagreement and require verification.
6. The [historical progress ledger](PROJECT_PROGRESS.md) and [backend change log](../backend/docs/PROJECT_PROGRESS.md) remain accessible. This portal is the primary entrypoint; those are not today's readiness verdict.

## Change workflow
Architecture discussion → source and DB contract review → implementation and migration → tests → staging checks → documentation update → approved merge/deployment. Source code and deployed schema remain the runtime authorities.
