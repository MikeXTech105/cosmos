SET XACT_ABORT ON;
GO
-- Reject a source-backed draft whose channel differs from its immutable recommendation.
DECLARE @Definition NVARCHAR(MAX)=OBJECT_DEFINITION(OBJECT_ID(N'dbo.sp_ProductionOrder_SaveDraft'));
IF @Definition IS NULL THROW 51100,N'Production draft prerequisite is missing.',1;
IF CHARINDEX(N'SOURCE_CHANNEL_MISMATCH',@Definition)=0
BEGIN
 SET @Definition=REPLACE(@Definition,N' IF @Id IS NULL',N'
 IF @Plan IS NOT NULL AND NOT EXISTS(SELECT 1 FROM dbo.ProductionPlanningSnapshots s WHERE s.Id=@Plan AND s.CompanyKey=@CompanyKey AND(TRY_CONVERT(BIGINT,JSON_VALUE(s.RequestJson,''$.channelId''))=@Channel OR(JSON_VALUE(s.RequestJson,''$.channelId'') IS NULL AND @Channel IS NULL))) THROW 51109,N''SOURCE_CHANNEL_MISMATCH|Keep the channel of the saved recommendation or create an explicitly manual order.'',1;
 IF @Id IS NULL');
 IF CHARINDEX(N'SOURCE_CHANNEL_MISMATCH',@Definition)=0 THROW 51100,N'Expected production draft source anchor changed; review migration.',1;
 SET @Definition=N'ALTER '+SUBSTRING(@Definition,CHARINDEX(N'PROCEDURE',UPPER(@Definition)),LEN(@Definition));
 EXEC sys.sp_executesql @Definition;
END;
GO
-- Keep recommendation channels consistent through release and released amendment too.
DECLARE @Definition NVARCHAR(MAX)=OBJECT_DEFINITION(OBJECT_ID(N'dbo.sp_ProductionOrder_Release'));
IF @Definition IS NULL THROW 51100,N'Production release prerequisite is missing.',1;
IF CHARINDEX(N'SOURCE_RELEASE_CHANNEL_MISMATCH',@Definition)=0
BEGIN
 SET @Definition=REPLACE(@Definition,N' IF @SourcePlan IS NOT NULL',N'
 IF @SourcePlan IS NOT NULL AND NOT EXISTS(SELECT 1 FROM dbo.ProductionPlanningSnapshots s JOIN dbo.ProductionOrders o ON o.Id=@Id AND o.CompanyKey=@CompanyKey WHERE s.Id=@SourcePlan AND s.CompanyKey=@CompanyKey AND(TRY_CONVERT(BIGINT,JSON_VALUE(s.RequestJson,''$.channelId''))=o.ChannelId OR(JSON_VALUE(s.RequestJson,''$.channelId'') IS NULL AND o.ChannelId IS NULL))) THROW 51109,N''SOURCE_RELEASE_CHANNEL_MISMATCH|Review the order and its saved source channel before release.'',1;
 IF @SourcePlan IS NOT NULL');
 IF CHARINDEX(N'SOURCE_RELEASE_CHANNEL_MISMATCH',@Definition)=0 THROW 51100,N'Expected source release anchor changed; review migration.',1;
 SET @Definition=N'ALTER '+SUBSTRING(@Definition,CHARINDEX(N'PROCEDURE',UPPER(@Definition)),LEN(@Definition));
 EXEC sys.sp_executesql @Definition;
END;
GO
DECLARE @Definition NVARCHAR(MAX)=OBJECT_DEFINITION(OBJECT_ID(N'dbo.sp_ProductionOrder_Amend'));
IF @Definition IS NULL THROW 51100,N'Production amendment prerequisite is missing.',1;
IF CHARINDEX(N'SOURCE_AMEND_CHANNEL_MISMATCH',@Definition)=0
BEGIN
 SET @Definition=REPLACE(@Definition,N' IF @OldPlan IS NOT NULL OR @Plan IS NOT NULL',N'
 IF @Plan IS NOT NULL AND NOT EXISTS(SELECT 1 FROM dbo.ProductionPlanningSnapshots s JOIN dbo.ProductionOrders o ON o.Id=@Id AND o.CompanyKey=@CompanyKey WHERE s.Id=@Plan AND s.CompanyKey=@CompanyKey AND(TRY_CONVERT(BIGINT,JSON_VALUE(s.RequestJson,''$.channelId''))=o.ChannelId OR(JSON_VALUE(s.RequestJson,''$.channelId'') IS NULL AND o.ChannelId IS NULL))) THROW 51109,N''SOURCE_AMEND_CHANNEL_MISMATCH|Keep the released order source channel when refreshing its recommendation.'',1;
 IF @OldPlan IS NOT NULL OR @Plan IS NOT NULL');
 IF CHARINDEX(N'SOURCE_AMEND_CHANNEL_MISMATCH',@Definition)=0 THROW 51100,N'Expected source amendment anchor changed; review migration.',1;
 SET @Definition=N'ALTER '+SUBSTRING(@Definition,CHARINDEX(N'PROCEDURE',UPPER(@Definition)),LEN(@Definition));
 EXEC sys.sp_executesql @Definition;
END;
GO
-- Identical stage retries recover the saved batch; changing cutover must not silently reuse it.
DECLARE @Definition NVARCHAR(MAX)=OBJECT_DEFINITION(OBJECT_ID(N'dbo.sp_ProductionImport_Stage'));
IF @Definition IS NULL THROW 51100,N'Import stage prerequisite is missing.',1;
IF CHARINDEX(N'IMPORT_SCOPE_MISMATCH',@Definition)=0
BEGIN
 SET @Definition=REPLACE(@Definition,N' IF @Batch IS NULL',N'
 IF @Batch IS NOT NULL AND EXISTS(SELECT 1 FROM dbo.ProductionImportBatches WHERE Id=@Batch AND CompanyKey=@CompanyKey AND CutoverDate<>@Cutover) THROW 51109,N''IMPORT_SCOPE_MISMATCH|This source is already staged with a different cutover. Open and review the saved batch.'',1;
 IF @Batch IS NULL');
 IF CHARINDEX(N'IMPORT_SCOPE_MISMATCH',@Definition)=0 THROW 51100,N'Expected import stage anchor changed; review migration.',1;
 SET @Definition=N'ALTER '+SUBSTRING(@Definition,CHARINDEX(N'PROCEDURE',UPPER(@Definition)),LEN(@Definition));
 EXEC sys.sp_executesql @Definition;
END;
GO
-- Show the stored source/cutover independently of a new staging form's current inputs.
DECLARE @Definition NVARCHAR(MAX)=OBJECT_DEFINITION(OBJECT_ID(N'dbo.sp_ProductionImport_Preview'));
IF @Definition IS NULL THROW 51100,N'Import preview prerequisite is missing.',1;
IF CHARINDEX(N' FileFingerprint,',@Definition)=0
BEGIN
 SET @Definition=REPLACE(@Definition,N'@State Status,JSON_QUERY',N'@State Status,(SELECT CutoverDate FROM dbo.ProductionImportBatches WHERE Id=@Id AND CompanyKey=@CompanyKey) CutoverDate,(SELECT FileName FROM dbo.ProductionImportBatches WHERE Id=@Id AND CompanyKey=@CompanyKey) FileName,(SELECT FileFingerprint FROM dbo.ProductionImportBatches WHERE Id=@Id AND CompanyKey=@CompanyKey) FileFingerprint,JSON_QUERY');
 IF CHARINDEX(N' FileFingerprint,',@Definition)=0 THROW 51100,N'Expected import preview source projection changed; review migration.',1;
 SET @Definition=N'ALTER '+SUBSTRING(@Definition,CHARINDEX(N'PROCEDURE',UPPER(@Definition)),LEN(@Definition));
 EXEC sys.sp_executesql @Definition;
END;
GO
