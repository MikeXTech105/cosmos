# Commerce GST implementation and verification boundary

Prepared 2026-10-28. This describes implemented source and focused automated contracts. It does not certify deployed SQL or a live GST provider.

## Official provider contracts reviewed

Only public GstZen documentation was used to map these adapters. Public documentation was read; no provider mutation or credential-bearing request was sent.

- [GSTN Generate OTP](https://my.gstzen.in/docs/api/gstn-generate-otp-api/): `POST /api/gstn-generate-otp/`, REST `Bearer` authentication, saved GSTIN and portal username. The adapter requires the documented OTPREQUEST success response.
- [GSTN Establish Session](https://my.gstzen.in/docs/api/gstn-establish-session-api/): `POST /api/gstn-establish-session/`, REST `Bearer`, saved GSTIN and entered OTP. A session requires AUTHTOKEN, successful status code and a future Unix expiry. Empty JSON is never authenticated success.
- [Extend E-Way Bill](https://my.gstzen.in/docs/api/ewaybill-api/extend-eway-bill/): `POST /~gstzen/a/ewbapi/extend/`, provider `Token` plus the saved registration's `gstin` header. The adapter allowlists the documented NIC transport/location fields, formats transport dates as `dd/MM/yyyy`, and requires a matching E-Way number and later returned validity.
- [Generate E-Invoice](https://my.gstzen.in/docs/api/einvoice-api/einvoice-gen/): documents the provider payload. It does not decide this company's rounding, component rules, discount treatment or source approval. Issuance is still gated.

GSTN REST uses separate server options `SandboxGstnAccessToken` / `ProductionGstnAccessToken`; E-Way/IRP provider token configuration remains separate. Credential and OTP masking is enforced even when optional diagnostic masking is disabled. Do not put tokens or OTPs in the repository, draft storage, screenshots or handoff output.

The extension reason field accepts the operator's approved provider code. An authoritative current reason-code catalogue was not available in the reviewed public contract; there is no invented local enum. Provider eligibility windows, vehicle/transit variants, timezone behavior and error/readback responses still need sandbox verification.

## Extension safety and persistence

`20261028_05_gst_eway_extension_commands.sql` requires `backend/database/003_gst_integration_module.sql`. It adds an E-Way rowversion and durable command reservation. A key is bound to the same document and reviewed payload fingerprint. One unresolved command blocks another extension on that bill. Definite rejection can be reviewed as a new command; unknown outcomes require readback and never resend the extension automatically.

Only a matching active provider record with later validity confirms the outcome. Canonical cancellation is preserved during concurrent changes. If another readback already saved the same/later validity, the command can confirm without overwriting newer vehicle metadata. No invoice tax, accounting balance, stock or ledger mutation is performed by extension.

## Immutable preparation while policy is deferred

The human instruction was to keep policy options and decide later. The proposed rounding/discount choices have **not** been approved. The UI and API preserve that decision as `PendingPolicy`; selecting a proposal does not activate it.

`20261028_06_gst_pending_source_snapshots.sql` extends the existing immutable compliance snapshot foundation. It requires the existing base/GST, HSN mapping, issuer registration and `20261024_gst_compliance_snapshot_generation_foundation.sql` migrations. It does not backfill historical identities, create tax components, approve a policy or enable issuance.

The new preparation API requires Sales Invoice permission, E-Invoice view/create permission as appropriate, and a trusted `ProductionCompanyScope.CompanyKey` claim matching the configured catalogue. It does not map the optional numeric CompanyId/BranchId integration fields to company ownership.

The repository uses one serializable transaction to freeze the confirmed invoice, ordered persisted lines, saved issuer registration, current buyer/seller identity/address and effective dated classification evidence. The operator reviews a source rowversion and a full source fingerprint. A changed invoice or master rejects the reviewed request. Preparation keys replay the exact prior snapshot; changed intent cannot reuse a key. Saved source is returned for readback. Source/current master distinctions are explicit: current identity/address at preparation is not represented as an invoice-time historical fact.

Pending snapshots do not create a generation request or call the provider. A later approved workflow must create a new immutable validated snapshot with approved effective rule component IDs/rates/amounts, taxable bases, actual discount allocation, rounding policy version, verified issuer/buyer facts and transport review where required. It must not infer CGST/SGST from an aggregate rate or silently rewrite a confirmed accounting invoice.

## Verification delivered and pending

Focused tests exercise actual controller permission metadata, service catalog/registration/source gates, strict mocked provider wires, exact client payloads, policy deferral, local preparation readback, Party role omission compatibility, explicit scoped recovery and stable-row/date lookup races. SQL Server ScriptDom parses both migrations and the embedded transactional source query.

The final commerce recovery tranche preserves safe serializable mutation errors through actual Redux thunk unwrap, while reducer display errors remain strings. Form summary actions focus current indexed fields, including hidden stock tabs and custom lookup controls. Immediate separate scoped outcome journals survive unchanged edits, 503/network failures and remounts before optional form-draft restoration. Known-ID readback performs only a canonical GET; it does not dispatch a detail reload that could overwrite retained values. A reviewed retry requires explicit operator confirmation, and no local attempt identifier is presented as server idempotency.

List return context is per-tab/account/company and validates permitted local routes. It carries existing filters/page/query/scroll through form/detail/edit without replacing URL authority. Known saved IDs are marked only after authoritative success, highlighted once when visible, or reported as outside the retained filtered page. Cross-document PO-to-bill navigation retains the PO origin without incorrectly highlighting a bill ID as a PO ID. Actual component regressions cover Item/Sale/Purchase lists and ordinary-permission Party create/edit/404 roundtrips.

The guarded SQL suites are compiled but unexecuted here. Both require `COSMOS_SALES_GST_INTEGRATION_CONNECTION_STRING` and refuse a catalogue outside `CosmosSalesGstIntegrationTests_*`. The extension suite creates/removes only its synthetic E-Way fixtures. The snapshot suite intentionally leaves uniquely named immutable synthetic snapshot/source rows in that disposable catalogue; it never disables the immutability trigger or deletes snapshots. Existing broad `ITGSTP3` fixture cleanup does not match its unique `ITGSTSNAP_` prefix.

The root's ordered SQL handoff is authoritative for execution. No SQL was run in this session. Real upgrade/backup/restore/rollback, overlap/concurrency/conservation SQL evidence, ordinary-role browser behavior, mobile360px flows and provider sandbox checks remain release gates. Individual findings and all commerce coverage rows are recorded in `output/implementation-verification/commerce-progress.json` with source versus executed evidence separated.
