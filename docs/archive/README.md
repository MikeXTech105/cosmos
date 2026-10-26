# COSMOS Documentation Archive

**Status:** Historical and reference material, not the current source of operational instructions. **Reviewed:** 2026-10-26.

Start with [Documentation Portal](../README.md) for the maintained enterprise-level guides.

## Consolidated archive
- [QA audit reports and remediation history](qa-reports/) — historical API contract checks, UI findings, dispatch Excel rule evaluations and dated verification evidence.
- [Backend architecture, knowledge and technical debt history](backend/) — original backend overview, project knowledge, architecture, implementation plan and dispatch reports.
- [Full-system QA audit](COSMOS_FULL_QA_AUDIT_REPORT.md) — original October 9 live-system report, distinct from the scoped integrated QA report.

The source documents were moved intact by Git object SHA. Original paths now contain small **compatibility pointers** to avoid breaking old links. Do not treat compatibility pointers as duplicate maintained documents.

## Important distinctions
- The 2026-10-09 QA reports cover different scopes; neither was discarded.
- Some archived reports contain time-bound observations and outdated remediation statuses. Revalidate findings against the current branch and deployed environment.
- Technical module specifications, SQL migration documents, required-field source matrices and compliance decision records have **not** been moved in this batch because their relative source links or operational paths need a separate migration pass.
- Any archive link referring to source code from its old relative location should be verified before relying on it; historic textual evidence was not modified to rewrite relative links.

## Next safe migration
Move active backend module documentation to central categorized module folders only after rewriting and validating internal relative Markdown links and any CI/scripts referring to their current paths. Keep stable aliases temporarily, then remove them once all callers are migrated.
