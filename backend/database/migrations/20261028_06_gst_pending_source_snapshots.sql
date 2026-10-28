/* Additive preparation metadata only. Does not approve a tax policy or enable issuance.
   Requires 20261024_gst_compliance_snapshot_generation_foundation.sql and issuer/HSN migrations.
   Existing snapshots remain immutable; no backfill or historical identity reconstruction. */
SET XACT_ABORT ON;
GO
IF OBJECT_ID(N'dbo.GstComplianceSnapshots',N'U') IS NULL THROW 52011,N'GST compliance snapshot foundation is required.',1;
IF COL_LENGTH(N'dbo.GstComplianceSnapshots',N'CatalogCompanyKey') IS NULL ALTER TABLE dbo.GstComplianceSnapshots ADD CatalogCompanyKey NVARCHAR(64) NULL;
IF COL_LENGTH(N'dbo.GstComplianceSnapshots',N'SourceRowVersion') IS NULL ALTER TABLE dbo.GstComplianceSnapshots ADD SourceRowVersion BINARY(8) NULL;
IF COL_LENGTH(N'dbo.GstComplianceSnapshots',N'SourceFingerprint') IS NULL ALTER TABLE dbo.GstComplianceSnapshots ADD SourceFingerprint VARBINARY(32) NULL;
IF COL_LENGTH(N'dbo.GstComplianceSnapshots',N'PreparationRequestKey') IS NULL ALTER TABLE dbo.GstComplianceSnapshots ADD PreparationRequestKey UNIQUEIDENTIFIER NULL;
IF COL_LENGTH(N'dbo.GstComplianceSnapshots',N'PolicyOptionsJson') IS NULL ALTER TABLE dbo.GstComplianceSnapshots ADD PolicyOptionsJson NVARCHAR(MAX) NULL;
GO
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.GstComplianceSnapshots') AND name=N'UX_GstComplianceSnapshots_PreparationKey') CREATE UNIQUE INDEX UX_GstComplianceSnapshots_PreparationKey ON dbo.GstComplianceSnapshots(PreparationRequestKey) WHERE PreparationRequestKey IS NOT NULL;
GO
