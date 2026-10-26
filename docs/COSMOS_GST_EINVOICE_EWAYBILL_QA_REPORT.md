# GST QA and regression report

Automated coverage added: `backend/tests/Cosmos.Tests/Gst/GstGenerationSafetyTests.cs` verifies the structured non-retryable block; `backend/tests/Cosmos.Tests/Gst/GstGenerationLifecycleTests.cs` verifies allowed transitions and rejects a blind retry from an unknown outcome; `backend/tests/Cosmos.Tests/Gst/GstComplianceSnapshotReadinessTests.cs` verifies that current master data is not treated as a historical snapshot. `dotnet build backend/src/Cosmos.Application/Cosmos.Application.csproj --no-restore -v:minimal` passed with zero warnings/errors. `dotnet test backend/tests/Cosmos.Tests/Cosmos.Tests.csproj --no-restore --filter "FullyQualifiedName~GstComplianceSnapshotReadinessTests|FullyQualifiedName~GstGeneration" -v:minimal` passed 8/8. Existing provider-adapter tests remain unit tests only and do not prove government issuance.

Not run: SSMS migration/verification, provider sandbox, and end-to-end provider recovery, because no database or sandbox was authorized or configured. Required future scenarios are snapshot confirmation rollback, duplicate concurrent requests, timeout/unknown reconciliation, tenant isolation, and frontend eligibility states.

## 2026-10-26 follow-up evidence

`dotnet test backend/tests/Cosmos.Tests/Cosmos.Tests.csproj --no-restore --filter "FullyQualifiedName~Gst" -v:minimal` passed **26/26**. Frontend GST navigation/source-contract and screen tests passed **16/16**; the production frontend build passed. Targeted ESLint over the changed GST files passed. The full frontend suite has four unrelated pre-existing failures in `src/utils/validationRules.test.js` (HR employee optional email/bank/address expectations); no GST test failed. Full-project ESLint did not complete within the bounded local command window, so it is not claimed as passed.

No SQL Server instance, provider sandbox, or production provider was contacted. These results do not verify migrations, provider mappings, statutory issuance, cancellation, vehicle update, extension, or reconciliation against GSTZen.
