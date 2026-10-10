# Parties: Required Field Audit

## Module scope

| Area | Evidence |
|---|---|
| Controllers / APIs | PartiesController, PartySettingsController |
| Request and validation contracts | PartyValidators.cs and party commands |
| Persistence / schema artifacts | Parties, PartySettings, PartyLedgerEntries |
| Main required-field families | Party identity/type/status and configuration values |

## Requirement sources

The complete direct validation-rule ledger, including class, target property, file and line, is in [REQUIRED_FIELDS_MASTER.md](../REQUIRED_FIELDS_MASTER.md). The complete controller-action inventory is in [API_REQUIRED_FIELDS_MATRIX.md](../API_REQUIRED_FIELDS_MATRIX.md). SQL NOT NULL, FK, table and procedure source evidence is in [DATABASE_REQUIRED_FIELDS.md](../DATABASE_REQUIRED_FIELDS.md).

This module is Dapper/stored-procedure based: inspect the matching repository method and its named procedure in addition to the validator. No EF Core required-property configuration applies.

## Dependency chain

HTTP route/query/body/form -> controller -> validator -> module service -> repository parameter object -> named stored procedure -> SQL column / constraint / FK / trigger / report

## Optional vs. removal decision

High—party IDs are referenced by sales, purchasing, payments, freight and ledgers. Keep relation/null semantics aligned with every dependent procedure.

Make optional: condition/remove the exact validator entry, change request nullability only where binding supports omission, add null/blank handling before every service normalisation/dereference, then make the called procedure and column accept NULL where required. Re-evaluate FKs, checks, defaults, joins, exports and integration payloads.

Remove completely: after a compatible deprecation release, remove the request/response member, validator, service/repository mappings, procedure parameter/body, SQL column, FK/index/default/check/trigger uses, report/export and integration references, plus tests and historical-data policy. Public routes or persisted data make this a breaking change unless a versioned contract is provided.

## Database and data status

DATABASE DATA CHECK: NOT AVAILABLE. SQL script evidence was inspected; live null/empty/default/orphan checks could not run because the configured staging database did not authenticate.

