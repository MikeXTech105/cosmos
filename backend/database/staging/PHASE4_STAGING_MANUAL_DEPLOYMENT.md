# Phase 4 staging manual deployment

1. Select **CosmosERP_Staging** in SSMS and run `01_PHASE4_STAGING_DIAGNOSTIC.sql`.
2. If any `MISSING_CANONICAL_COMPANY` row appears, stop. Run `02_PHASE4_STAGING_REMEDIATION.sql` only to produce the mapping review list; it intentionally throws and makes no changes.
3. Obtain written legal-Company mapping approval and a separately reviewed forward-only repair for the partial migration 30 state. Do not infer ID mappings.
4. After repair approval, use `03_PHASE4_MIGRATION_CONTINUATION.sql` as the guard, then execute reviewed migrations 31–36 individually in filename order. Preserve `GO` separators.
5. Run `04_PHASE4_POST_MIGRATION_VERIFY.sql`. Invoice IDs 1 and 2 must remain unchanged and orphan count must be zero.

Stop on every SQL error. Do not use `NOCHECK`, delete GST registrations, run test bootstrap scripts, or activate statutory generation. Staging browser acceptance uses approved synthetic records only.
