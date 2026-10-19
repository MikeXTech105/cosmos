/*
  Phase 2 GST verification — synthetic data only.
  Run in SSMS with Query > SQLCMD Mode enabled, against a disposable database only.
  This script always rolls back its fixture data. It does not apply migrations.
*/
:setvar ExpectedDatabase "CosmosGstPhase2Verification"
:setvar SyntheticPrefix "GST2VERIFY20261016"

SET NOCOUNT ON;
/* Expected trigger failures are caught below; leaving XACT_ABORT off preserves the fixture transaction for subsequent assertions. */
SET XACT_ABORT OFF;
GO
IF DB_NAME() <> N'$(ExpectedDatabase)'
    THROW 51200, N'Refusing to run outside the explicitly named disposable verification database.', 1;
IF OBJECT_ID(N'dbo.usp_GstTaxRuleVersion_Approve', N'P') IS NULL
   OR OBJECT_ID(N'dbo.usp_GstTaxCalculation_ResolveReference', N'P') IS NULL
   OR OBJECT_ID(N'dbo.usp_GstCalculationSnapshot_Create', N'P') IS NULL
   OR OBJECT_ID(N'dbo.GstCalculationSnapshots', N'U') IS NULL
    THROW 51201, N'Apply the base, Phase 1, and Phase 2 migrations before running verification.', 1;
GO
DECLARE @Prefix NVARCHAR(30)=N'$(SyntheticPrefix)', @From DATE='2030-01-01', @To DATE='2030-12-31';
IF LEN(@Prefix)>30 THROW 51202,N'Synthetic prefix is too long.',1;
IF EXISTS(SELECT 1 FROM dbo.HsnSacMasters WHERE Code LIKE @Prefix+N'%')
 OR EXISTS(SELECT 1 FROM dbo.GstRateRules WHERE RuleCode LIKE @Prefix+N'%')
 OR EXISTS(SELECT 1 FROM dbo.Items WHERE ItemCode LIKE @Prefix+N'%')
    THROW 51203,N'Synthetic-prefix rows already exist. Use a new prefix or clean the disposable database first.',1;

BEGIN TRY
    BEGIN TRANSACTION;
    DECLARE @UnitId BIGINT,@CategoryId BIGINT,@ItemId BIGINT,@CategoryHsnId BIGINT,@ProductHsnId BIGINT,@RuleId BIGINT,@VersionId BIGINT,@OverlapVersionId BIGINT,@SnapshotId UNIQUEIDENTIFIER,@SupersedingSnapshotId UNIQUEIDENTIFIER,@SnapshotHash VARBINARY(32);
    DECLARE @CategoryCode NVARCHAR(50)=@Prefix+N'-CAT',@ProductCode NVARCHAR(50)=@Prefix+N'-PROD',@RuleCode NVARCHAR(100)=@Prefix+N'-RULE',@DocumentReference NVARCHAR(128)=@Prefix+N'-DOC',@DocumentLineReference NVARCHAR(128)=@Prefix+N'-LINE',@BadDocumentLineReference NVARCHAR(128)=@Prefix+N'-BAD';

    INSERT dbo.Units(Name,ShortName,IsActive) VALUES(@Prefix+N' Unit',N'G2V',1); SET @UnitId=SCOPE_IDENTITY();
    INSERT dbo.Categories(Name,IsActive) VALUES(@Prefix+N' Category',1); SET @CategoryId=SCOPE_IDENTITY();
    INSERT dbo.Items(Name,ItemCode,CategoryId,UnitId,ItemType,IsActive) VALUES(@Prefix+N' Item',@Prefix+N'-ITEM',@CategoryId,@UnitId,1,1); SET @ItemId=SCOPE_IDENTITY();
    INSERT dbo.HsnSacMasters(Code,CodeType,Description,IsActive) VALUES(@CategoryCode,N'HSN',N'Synthetic category classification',1); SET @CategoryHsnId=SCOPE_IDENTITY();
    INSERT dbo.HsnSacMasters(Code,CodeType,Description,IsActive) VALUES(@ProductCode,N'HSN',N'Synthetic product classification',1); SET @ProductHsnId=SCOPE_IDENTITY();
    INSERT dbo.CategoryHsnDefaults(CategoryId,HsnSacId,EffectiveFrom,EffectiveTo) VALUES(@CategoryId,@CategoryHsnId,@From,@To);
    INSERT dbo.ItemHsnOverrides(ItemId,HsnSacId,EffectiveFrom,EffectiveTo) VALUES(@ItemId,@ProductHsnId,@From,@To);
    INSERT dbo.GstRateRules(RuleCode) VALUES(@RuleCode); SET @RuleId=SCOPE_IDENTITY();
    INSERT dbo.GstRateRuleVersions(GstRateRuleId,VersionNumber,TotalRate,EffectiveFrom,EffectiveTo,IsActive,Notes) VALUES(@RuleId,1,18,@From,@To,1,N'Synthetic verification version'); SET @VersionId=SCOPE_IDENTITY();
    INSERT dbo.GstRateRuleVersionApplicabilities(GstRateRuleVersionId,HsnSacId,Priority) VALUES(@VersionId,@ProductHsnId,100);
    INSERT dbo.GstRateRuleVersionComponents(GstRateRuleVersionId,JurisdictionScope,ComponentKind,ComponentCode,Rate) VALUES(@VersionId,1,1,N'CGST',9),(@VersionId,1,2,N'SGST',9),(@VersionId,2,3,N'IGST',18);
    EXEC dbo.usp_GstTaxRuleVersion_Approve @VersionId=@VersionId;

    IF NOT EXISTS(SELECT 1 FROM dbo.GstRateRuleVersions WHERE Id=@VersionId AND ApprovalStatus=1)
        THROW 51204,N'Approval status was not persisted.',1;
    IF EXISTS(SELECT 1 FROM dbo.GstRateRuleVersionComponents WHERE GstRateRuleVersionId=@VersionId GROUP BY JurisdictionScope HAVING SUM(Rate)<>18)
        THROW 51205,N'Fixture components do not reconcile.',1;

    PRINT N'Resolver output for the effective-date boundary (expect ProductOverride, one approved rule, 9/9 intra-state and 18 inter-state components):';
    EXEC dbo.usp_GstTaxCalculation_ResolveReference @ItemId=@ItemId,@OnDate=@From;
    PRINT N'Resolver output for the inclusive effective-date end boundary (expect the same ProductOverride and approved rule):';
    EXEC dbo.usp_GstTaxCalculation_ResolveReference @ItemId=@ItemId,@OnDate=@To;

    DECLARE @ComponentsJson NVARCHAR(MAX)=N'[{"componentKind":1,"componentCode":"CGST","rate":9.00,"amount":9.00},{"componentKind":2,"componentCode":"SGST","rate":9.00,"amount":9.00}]';
    DECLARE @SnapshotOutput TABLE(Id UNIQUEIDENTIFIER,CalculationHash VARBINARY(32));
    INSERT @SnapshotOutput EXEC dbo.usp_GstCalculationSnapshot_Create
        @DocumentReference=@DocumentReference,@DocumentLineReference=@DocumentLineReference,@ItemId=@ItemId,@HsnSacId=@ProductHsnId,@HsnSacCode=@ProductCode,@HsnSacCodeType=N'HSN',@MappingId=NULL,@MappingSource=N'ProductOverride',@MappingEffectiveFrom=@From,@MappingEffectiveTo=@To,
        @GstRateRuleId=@RuleId,@GstRateRuleVersionId=@VersionId,@RuleCode=@RuleCode,@RuleApprovalStatus=1,@RuleEffectiveFrom=@From,@RuleEffectiveTo=@To,@TransactionDate=@From,@SellerRegistrationId=1,@SellerStateCode=N'GJ',@BuyerTreatment=0,@BuyerStateCode=N'GJ',@PlaceOfSupplyStateCode=N'GJ',@TransactionType=0,@PriceBasis=0,
        @Quantity=1,@UnitPrice=100,@LineDiscountAmount=0,@TaxableChargeAmount=0,@TaxableValue=100,@TotalRate=18,@TotalTaxAmount=18,@CgstAmount=9,@SgstAmount=9,@IgstAmount=0,@OtherTaxAmount=0,@RoundingAdjustment=0,@TotalAmount=118,@CalculationEngineVersion=N'phase2-verification',@DecisionInputsJson=N'{"synthetic":true,"scenario":"initial"}',@ComponentsJson=@ComponentsJson;
    SELECT @SnapshotId=Id,@SnapshotHash=CalculationHash FROM @SnapshotOutput;
    IF @SnapshotId IS NULL OR NOT EXISTS(SELECT 1 FROM @SnapshotOutput WHERE DATALENGTH(CalculationHash)=32)
        THROW 51207,N'Snapshot hash was not generated.',1;
    IF @SnapshotHash<>HASHBYTES('SHA2_256',CONVERT(VARBINARY(MAX),N'{"synthetic":true,"scenario":"initial"}'))
        THROW 51210,N'Snapshot hash does not match its canonical decision-input JSON.',1;
    IF (SELECT COUNT(*) FROM dbo.GstCalculationSnapshotComponents WHERE SnapshotId=@SnapshotId)<>2
        THROW 51208,N'Snapshot component rows were not persisted.',1;

    DELETE FROM @SnapshotOutput;
    INSERT @SnapshotOutput EXEC dbo.usp_GstCalculationSnapshot_Create
        @DocumentReference=@DocumentReference,@DocumentLineReference=@DocumentLineReference,@ItemId=@ItemId,@HsnSacId=@ProductHsnId,@HsnSacCode=@ProductCode,@HsnSacCodeType=N'HSN',@MappingId=NULL,@MappingSource=N'ProductOverride',@MappingEffectiveFrom=@From,@MappingEffectiveTo=@To,
        @GstRateRuleId=@RuleId,@GstRateRuleVersionId=@VersionId,@RuleCode=@RuleCode,@RuleApprovalStatus=1,@RuleEffectiveFrom=@From,@RuleEffectiveTo=@To,@TransactionDate=@From,@SellerRegistrationId=1,@SellerStateCode=N'GJ',@BuyerTreatment=0,@BuyerStateCode=N'GJ',@PlaceOfSupplyStateCode=N'GJ',@TransactionType=0,@PriceBasis=0,
        @Quantity=1,@UnitPrice=100,@LineDiscountAmount=0,@TaxableChargeAmount=0,@TaxableValue=100,@TotalRate=18,@TotalTaxAmount=18,@CgstAmount=9,@SgstAmount=9,@IgstAmount=0,@OtherTaxAmount=0,@RoundingAdjustment=0,@TotalAmount=118,@CalculationEngineVersion=N'phase2-verification',@DecisionInputsJson=N'{"synthetic":true,"scenario":"superseding"}',@ComponentsJson=@ComponentsJson,@SupersedesSnapshotId=@SnapshotId;
    SELECT @SupersedingSnapshotId=Id FROM @SnapshotOutput;
    IF @SupersedingSnapshotId IS NULL OR NOT EXISTS(SELECT 1 FROM dbo.GstCalculationSnapshots WHERE Id=@SupersedingSnapshotId AND SupersedesSnapshotId=@SnapshotId)
        THROW 51209,N'Superseding snapshot was not persisted.',1;

    BEGIN TRY
        UPDATE dbo.GstCalculationSnapshots SET TotalAmount=119 WHERE Id=@SnapshotId;
        THROW 51211,N'Snapshot update unexpectedly succeeded.',1;
    END TRY
    BEGIN CATCH
        IF ERROR_NUMBER()<>51110 THROW;
        PRINT N'PASS: snapshot update was rejected by the immutability trigger.';
    END CATCH;
    BEGIN TRY
        DELETE FROM dbo.GstCalculationSnapshotComponents WHERE SnapshotId=@SnapshotId;
        THROW 51212,N'Snapshot component delete unexpectedly succeeded.',1;
    END TRY
    BEGIN CATCH
        IF ERROR_NUMBER()<>51111 THROW;
        PRINT N'PASS: snapshot component delete was rejected by the immutability trigger.';
    END CATCH;

    SELECT N'PASS: synthetic resolver, hash, immutable-snapshot, and superseding-snapshot checks completed; fixture transaction will roll back.' Result,@ItemId ItemId,@VersionId VersionId,@SnapshotId SnapshotId,@SupersedingSnapshotId SupersedingSnapshotId;
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    IF XACT_STATE()<>0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
GO
