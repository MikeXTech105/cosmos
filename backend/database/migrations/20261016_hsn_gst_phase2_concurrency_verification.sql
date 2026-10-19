/*
  Two-session approval-overlap verification for a disposable database only.
  Enable SQLCMD Mode. Run once with Session=SETUP, then simultaneously in two SSMS windows
  with Session=A and Session=B. Finally run with Session=CLEANUP.
*/
:setvar ExpectedDatabase "CosmosGstPhase2Verification"
:setvar SyntheticPrefix "GST2CONCUR20261016"
:setvar Session "SETUP"
SET NOCOUNT ON;
SET XACT_ABORT ON;
GO
IF DB_NAME()<>N'$(ExpectedDatabase)' THROW 51230,N'Refusing to run concurrency verification outside its disposable database.',1;
DECLARE @Prefix NVARCHAR(30)=N'$(SyntheticPrefix)',@Session NVARCHAR(10)=UPPER(N'$(Session)'),@From DATE='2031-01-01',@To DATE='2031-12-31';
IF @Session NOT IN(N'SETUP',N'A',N'B',N'CLEANUP') THROW 51231,N'Session must be SETUP, A, B, or CLEANUP.',1;
IF @Session=N'SETUP'
BEGIN
    IF EXISTS(SELECT 1 FROM dbo.GstRateRules WHERE RuleCode=@Prefix+N'-RULE') THROW 51232,N'Concurrency fixture already exists; run CLEANUP first.',1;
    BEGIN TRANSACTION;
    DECLARE @UnitId BIGINT,@CategoryId BIGINT,@ItemId BIGINT,@HsnId BIGINT,@RuleId BIGINT,@VersionOne BIGINT,@VersionTwo BIGINT;
    INSERT dbo.Units(Name,ShortName,IsActive) VALUES(@Prefix+N' Unit',N'G2C',1); SET @UnitId=SCOPE_IDENTITY();
    INSERT dbo.Categories(Name,IsActive) VALUES(@Prefix+N' Category',1); SET @CategoryId=SCOPE_IDENTITY();
    INSERT dbo.Items(Name,ItemCode,CategoryId,UnitId,ItemType,IsActive) VALUES(@Prefix+N' Item',@Prefix+N'-ITEM',@CategoryId,@UnitId,1,1); SET @ItemId=SCOPE_IDENTITY();
    INSERT dbo.HsnSacMasters(Code,CodeType,Description,IsActive) VALUES(@Prefix+N'-HSN',N'HSN',N'Synthetic concurrency classification',1); SET @HsnId=SCOPE_IDENTITY();
    INSERT dbo.ItemHsnOverrides(ItemId,HsnSacId,EffectiveFrom,EffectiveTo) VALUES(@ItemId,@HsnId,@From,@To);
    INSERT dbo.GstRateRules(RuleCode) VALUES(@Prefix+N'-RULE'); SET @RuleId=SCOPE_IDENTITY();
    INSERT dbo.GstRateRuleVersions(GstRateRuleId,VersionNumber,TotalRate,EffectiveFrom,EffectiveTo,IsActive,Notes) VALUES(@RuleId,1,18,@From,@To,1,N'Concurrency version A'),(@RuleId,2,18,@From,@To,1,N'Concurrency version B');
    SELECT @VersionOne=MIN(Id),@VersionTwo=MAX(Id) FROM dbo.GstRateRuleVersions WHERE GstRateRuleId=@RuleId;
    INSERT dbo.GstRateRuleVersionApplicabilities(GstRateRuleVersionId,HsnSacId,Priority) VALUES(@VersionOne,@HsnId,100),(@VersionTwo,@HsnId,100);
    INSERT dbo.GstRateRuleVersionComponents(GstRateRuleVersionId,JurisdictionScope,ComponentKind,ComponentCode,Rate) VALUES(@VersionOne,1,1,N'CGST',9),(@VersionOne,1,2,N'SGST',9),(@VersionOne,2,3,N'IGST',18),(@VersionTwo,1,1,N'CGST',9),(@VersionTwo,1,2,N'SGST',9),(@VersionTwo,2,3,N'IGST',18);
    COMMIT TRANSACTION;
    SELECT N'Run Session A now, then Session B before A finishes its 15-second wait.' Instruction,@VersionOne VersionA,@VersionTwo VersionB;
    RETURN;
END;
DECLARE @RuleId BIGINT=(SELECT Id FROM dbo.GstRateRules WHERE RuleCode=@Prefix+N'-RULE'),@VersionA BIGINT,@VersionB BIGINT;
SELECT @VersionA=MIN(Id),@VersionB=MAX(Id) FROM dbo.GstRateRuleVersions WHERE GstRateRuleId=@RuleId;
IF @RuleId IS NULL THROW 51233,N'Run SETUP first.',1;
IF @Session=N'A'
BEGIN
    BEGIN TRANSACTION;
    EXEC dbo.usp_GstTaxRuleVersion_Approve @VersionId=@VersionA;
    PRINT N'Session A approved version A and holds the outer transaction lock for 15 seconds.';
    WAITFOR DELAY '00:00:15';
    COMMIT TRANSACTION;
    RETURN;
END;
IF @Session=N'B'
BEGIN
    BEGIN TRY
        BEGIN TRANSACTION;
        EXEC dbo.usp_GstTaxRuleVersion_Approve @VersionId=@VersionB;
        COMMIT TRANSACTION;
        THROW 51234,N'Concurrent conflicting approval unexpectedly succeeded.',1;
    END TRY
    BEGIN CATCH
        IF XACT_STATE()<>0 ROLLBACK TRANSACTION;
        IF ERROR_NUMBER()<>51106 THROW;
        PRINT N'PASS: Session B was blocked then rejected with 51106; conflicting approval was prevented.';
    END CATCH;
    RETURN;
END;
IF EXISTS(SELECT 1 FROM dbo.GstCalculationSnapshots s JOIN dbo.GstRateRuleVersions v ON v.Id=s.GstRateRuleVersionId WHERE v.GstRateRuleId=@RuleId)
    THROW 51235,N'Refusing cleanup because a snapshot references the fixture rule.',1;
BEGIN TRANSACTION;
DELETE c FROM dbo.GstRateRuleVersionComponents c JOIN dbo.GstRateRuleVersions v ON v.Id=c.GstRateRuleVersionId WHERE v.GstRateRuleId=@RuleId;
DELETE a FROM dbo.GstRateRuleVersionApplicabilities a JOIN dbo.GstRateRuleVersions v ON v.Id=a.GstRateRuleVersionId WHERE v.GstRateRuleId=@RuleId;
DELETE FROM dbo.GstRateRuleVersions WHERE GstRateRuleId=@RuleId;
DELETE FROM dbo.GstRateRules WHERE Id=@RuleId;
DELETE FROM dbo.ItemHsnOverrides WHERE ItemId IN(SELECT Id FROM dbo.Items WHERE ItemCode=@Prefix+N'-ITEM');
DELETE FROM dbo.HsnSacMasters WHERE Code=@Prefix+N'-HSN';
DELETE FROM dbo.Items WHERE ItemCode=@Prefix+N'-ITEM';
DELETE FROM dbo.Categories WHERE Name=@Prefix+N' Category';
DELETE FROM dbo.Units WHERE Name=@Prefix+N' Unit';
COMMIT TRANSACTION;
PRINT N'PASS: only synthetic concurrency fixtures were cleaned up.';
GO
