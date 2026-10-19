# COSMOS ERP — Phase 2 GST Rule and Snapshot Schema Design

## Purpose and scope

This design makes the Phase 2 calculation engine resolvable from SQL Server without activating it for Sales or Purchase. It is deliberately additive and does not infer statutory tax treatment from a total rate, item name, buyer type, or example invoice.

## Decisions separated by ownership

### Technical decisions implemented

| Topic | Technical design |
| --- | --- |
| Rule identity/versioning | Existing `GstRateRules` and `GstRateRuleVersions` remain the root/version identity. Each version gains an explicit approval state and immutable audit/supersession metadata. |
| HSN/SAC applicability | `GstRateRuleVersionApplicabilities` binds a version to a specific Phase 1 HSN/SAC master record with a deterministic integer priority. |
| Components | `GstRateRuleVersionComponents` stores explicit jurisdiction-scope/component/rate rows. The database never derives a split from `TotalRate`. |
| Effective dates | A version applies only when active, approved, effective on the transaction date, and linked to the resolved HSN/SAC. The resolver returns all eligible candidates so the engine can reject ambiguity. |
| Atomic resolver read | One stored procedure reads mapping, rule versions, and components in a `SERIALIZABLE` transaction. This supplies one database-consistent view without requiring a database-wide snapshot-isolation setting. |
| Snapshots | A new standalone `GstCalculationSnapshots` table stores a complete immutable decision record, including canonical JSON and SHA-256 hash. It has no Sales/Purchase foreign key yet. |
| Immutability | An `AFTER UPDATE, DELETE` trigger rejects changes/deletes. A correction is a new snapshot linked by `SupersedesSnapshotId`, not an update. |

### Business/tax-policy decisions still required

| Topic | Decision required before production activation |
| --- | --- |
| Rule applicability and priority | Who creates the binding, whether more than one rule may apply, and the approved priority semantics for competing rules. This implementation permits multiple candidates only so the engine can reject ambiguity. |
| Approval lifecycle | Which role may approve/retire/supersede a version and whether four-eyes approval is required. The technical statuses are Draft, Approved, Retired; no API exposes lifecycle changes in this phase. |
| Components and jurisdiction | Approved component codes/rates and which component sets apply to each jurisdiction/special treatment. No component rows are seeded. |
| Seller/POS | Which company registration is selected and how place of supply is derived or overridden. The resolver does not decide it. |
| Special cases | Exempt, zero-rated, reverse charge, SEZ, export, cess, stock transfer, and supplier-document policies. The engine does not implement them. |
| Rounding/discounts | The Phase 2 engine's technical test policy is not a business approval for invoice rounding or allocation. |

## Schema

### Existing version table extensions

`GstRateRuleVersions` receives:

- `ApprovalStatus TINYINT NOT NULL DEFAULT 0` (`0=Draft`, `1=Approved`, `2=Retired`)
- `ApprovedAtUtc`, `ApprovedBy`, `RetiredAtUtc`, `RetiredBy`
- `SupersededByVersionId` self-reference

All pre-existing Phase 1 rows become Draft, so no historical total-rate version silently becomes authoritative.

### Rule applicability

`GstRateRuleVersionApplicabilities` has `GstRateRuleVersionId`, `HsnSacId`, `Priority`, audit metadata, a unique `(GstRateRuleVersionId,HsnSacId)` constraint, and an index beginning with `HsnSacId`. Applicability has no separate effective dates: the version's effective range is authoritative.

### Explicit components

`GstRateRuleVersionComponents` has `GstRateRuleVersionId`, `JurisdictionScope` (`1=IntraState`, `2=InterState`), `ComponentKind` (`1=CGST`, `2=SGST`, `3=IGST`, `4=Other`), `ComponentCode`, `Rate`, and audit metadata. A unique key prevents duplicate component identities within a version/jurisdiction. Row-level checks limit technical enum/rate ranges; approval validates that the component sum equals the version total rate.

### Snapshot foundation

`GstCalculationSnapshots` stores document-agnostic immutable line evidence:

- external document/line references (nullable until a future integration binds them);
- item identity; HSN/SAC identity, code and code type; mapping identity/source/effective range;
- rule/version identity, rule code, approval state, and effective range;
- transaction context states and buyer treatment;
- basis, quantity, unit price, discount, charges, taxable value, total rate/tax, CGST/SGST/IGST/other tax, rounding, and total;
- calculation engine version; canonical decision JSON; SHA-256 hash; created/audit identity; and optional supersession link.

`GstCalculationSnapshotComponents` stores every selected component row. Both tables are immutable. A future document-line migration must add a unique relationship appropriate to its lifecycle; this phase intentionally creates none.

New snapshot creation validates that the supplied HSN/SAC and rule metadata match the current referenced IDs, and that JSON component rates/amounts reconcile to the stored snapshot totals. The additive evidence columns remain nullable only to preserve compatibility for an already-created pre-final-verification snapshot table; the create procedure requires them for every new snapshot.

## Constraints, indexes, and overlap controls

- Version effective-date overlap is blocked for the same rule when both versions are active/approved through `usp_GstTaxRuleVersion_Approve` using `UPDLOCK, HOLDLOCK`.
- A version cannot be approved unless it has at least one applicability, both jurisdiction component scopes, and each scope sums exactly to `TotalRate`.
- SQL cannot safely enforce all cross-row component/overlap rules with ordinary check constraints, so approval is the guarded state transition.
- Indexes support date lookup by HSN/SAC and version, and snapshot lookup by document reference/hash.
- Draft data may be incomplete; it cannot enter resolver candidates.

## Resolver query and consistency model

`usp_GstCalculation_ResolveReference @ItemId,@OnDate`:

1. starts a serializable transaction;
2. selects exactly one effective item override or category default (product override first);
3. returns the mapping/classification as result set 1;
4. returns all active, approved, effective versions applicable to that HSN/SAC as result set 2; and
5. returns their component rows as result set 3.

The repository groups component rows by version and returns `GstCalculationReference`. No rate is accepted from `GstCalculationRequest`. If the database cannot establish snapshot isolation, the procedure throws rather than mixing reads from different states.

## Migration sequence

1. Apply prerequisite repository migrations, including Phase 1 foundation and lifecycle migrations.
2. Apply `20261016_hsn_gst_phase2_rule_snapshot_foundation.sql` in an isolated test database first.
3. Create synthetic Draft rule/version/applicability/component rows through the documented test SQL only; approve through the approval procedure.
4. Run resolver/snapshot integration tests.
5. Only after business approval, expose rule-maintenance APIs/UI and begin a separate Sales/Purchase snapshot-integration phase.

No migration backfills rate rules, HSN mappings, invoices, purchases, or historical tax values.

### SSMS deployment and resolver verification

Open the complete migration file in SSMS and execute the whole file, including its `GO` batch separators. Do **not** select and execute the body of `usp_GstTaxCalculation_ResolveReference`: `@HsnSacId` and `@CandidateVersions` are local variables declared inside that stored procedure.

After a successful deployment, invoke it only as a procedure, for example:

```sql
EXEC dbo.usp_GstTaxCalculation_ResolveReference
    @ItemId = 123,
    @OnDate = '2026-10-16';
```

To verify that the deployed definition contains the declaration before investigating results:

```sql
EXEC sys.sp_helptext N'dbo.usp_GstTaxCalculation_ResolveReference';
```
