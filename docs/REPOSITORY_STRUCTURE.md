# COSMOS ERP — Repository Layout and Cleanup Policy

Updated: 2026-10-26. Based on a source tree inventory of `main` (1,785 files before this cleanup). This is a directory ownership guide, not a build/runtime certification.

## Canonical source locations

| Path | Purpose | Policy |
| --- | --- | --- |
| `backend/src/` | .NET 10 API, Application, Domain, Contracts, Infrastructure, Persistence and Shared projects | Keep structure; refactor only with tests |
| `backend/tests/` | .NET automated tests | Keep alongside solution |
| `backend/database/` | Base schema, migrations, verification, staging and smoke assets | **Never delete or rename by appearance alone**; deployment references and migration history must be analyzed |
| `frontend/src/`, `frontend/public/` | React/Vite UI and served assets | Preserve import paths and runtime configuration contract |
| `backend/docs/` | Backend module specifications, architecture and implementation trackers | Keep active docs; update as modules change |
| `docs/` | Cross-system architecture, GST policy, operations, main progress ledger | Cross-link rather than duplicate canonical rules |
| `qa-reports/` | Historical and current QA evidence | Retain where used for defect traceability |
| `output/` | Generated reports, handbook assets and presentations | Candidate for artifact storage, not automatic deletion |
| `tmp/` | Scripts and intermediate generation inputs | Separate reproducible scripts from disposable outputs before archiving |
| `Database_Verification_Output/` | Historical SQL remediation/verification outputs | Review for unreconciled fixes before moving |
| `.github/workflows/` | CI/CD automation | Preserve paths; make trigger and deployed ref consistent |

## Cleanup decisions, batch 1
- Remove only three committed `tmp/handbook/__pycache__/*.pyc` interpreter cache files.
- Ignore `__pycache__/`, `*.py[cod]`, and common Python analysis caches.
- Keep `tmp/handbook/*.py` scripts, generated handbook files, QA reports, SQL scripts and production configuration unchanged.
- No active C# / React / SQL / Docker logic was touched in this batch.

## Next safe cleanup batches (NOT executed)
1. **Secrets:** rotate compromised database/JWT/GST/owner values and replace embedded configuration, with explicit deployment validation; removing from HEAD does not remove Git history. Avoid showing values in reports.
2. **Build/deployment mapping:** map file references in Dockerfiles, Compose, GitHub workflow, frontend public paths, docs and scripts before moving directories.
3. **Generated artifact relocation:** catalog `output/cosmos-handbook`, `output/deep-dive`, `output/oee-dashboard`, `output/product-validation`; preserve published client artifacts via release assets/object storage if needed.
4. **Temporary tooling:** assess `tmp/handbook` and `tmp/supply_chain_client_presentation` separately; move reusable generators to a versioned `scripts/` directory only after import/path checks.
5. **Documentation consolidation:** choose canonical progress and architecture indices; add links rather than delete audit trails. `docs/PROJECT_PROGRESS.md` contains historical detail; `backend/docs/PROJECT_PROGRESS.md` covers additional backend milestones.
6. **Database:** add a verified migration manifest and replace the 3-byte `backend/database/002_Verify_Database_Setup.sql` placeholder after inventorying checks.
7. **Validation gate:** run backend restore/build/tests, frontend install/lint/tests/build, SQL migration and role smoke tests in a disposable environment.

## Deletion criteria
Delete only when a file is demonstrably generated/unused, there are no referenced imports/routes/build/deployment dependencies, a replacement or retention location exists where appropriate, and diffs can be reviewed. Treat invoice/reference media and sample exports as potentially sensitive; do not blindly relocate or publish them.

## Known issues not corrected by this structural cleanup
- Prior audit identifies tracked secrets; root Compose includes literal owner bootstrap password and Development environment.
- GitHub workflow triggers from `deploy` but pulls `main`.
- Production transport and frontend API routing require live re-verification.
- Legal GST generation has documented snapshot/provider-policy blockers.

Refer to `docs/COSMOS_REPOSITORY_AUDIT_2026-10-26.md` for the risk-ranked audit.
