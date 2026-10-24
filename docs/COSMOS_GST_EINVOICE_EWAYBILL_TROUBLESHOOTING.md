# GST statutory-document troubleshooting

If generation returns `GST_SERVER_GENERATION_NOT_AVAILABLE`, do not retry against GSTZen. Confirm that the invoice has a validated immutable snapshot, approved policy inputs, and a durable request workflow after that work is deployed.

For development diagnosis, the snapshot-readiness evaluator identifies missing persisted invoice bindings. Its output is not a substitute for a government-document eligibility decision and does not change invoice confirmation.

For an existing identifier, use lookup then provider refresh. A timeout or local persistence problem is an unknown outcome: preserve the correlation ID, reconcile with the provider, and do not create a replacement request until the outcome is confirmed. Duplicate-index migration failures require review of the returned identifiers, not deletion of government documents.
