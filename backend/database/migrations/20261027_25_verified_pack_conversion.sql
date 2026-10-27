SET XACT_ABORT ON;
GO
IF COL_LENGTH('dbo.ItemPackagingProfiles','ConversionVersion') IS NULL ALTER TABLE dbo.ItemPackagingProfiles ADD ConversionVersion ROWVERSION,SourceUnitId BIGINT NULL REFERENCES dbo.Units(Id),BaseUnitIdSnapshot BIGINT NULL REFERENCES dbo.Units(Id),SourceQuantityBasis DECIMAL(22,6) NULL,BaseQuantityBasis DECIMAL(22,6) NULL,ConversionSourceReference NVARCHAR(200) NULL;
GO
CREATE OR ALTER FUNCTION dbo.ufn_ProductionUnitDimension(@Unit BIGINT) RETURNS NVARCHAR(20) AS
BEGIN
 DECLARE @Dimension NVARCHAR(20);
 SELECT @Dimension=CASE WHEN UPPER(ShortName) IN(N'PC',N'PCS',N'PCE',N'BOX',N'BX',N'ROLL',N'NOS',N'UNIT',N'EA') THEN N'Count' WHEN UPPER(ShortName) IN(N'KG',N'G',N'GM',N'MG',N'TON',N'MT') THEN N'Mass' WHEN UPPER(ShortName) IN(N'M',N'CM',N'MM',N'MTR') THEN N'Length' WHEN UPPER(ShortName) IN(N'L',N'LTR',N'ML') THEN N'Volume' ELSE NULL END FROM dbo.Units WHERE Id=@Unit AND IsActive=1 AND IsDeleted=0;
 RETURN @Dimension;
END;
GO
CREATE OR ALTER PROCEDURE dbo.sp_PackagingProfile_Conversion @CompanyKey NVARCHAR(64),@UserId BIGINT,@RequestJson NVARCHAR(MAX) AS
BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 DECLARE @Id BIGINT=TRY_CONVERT(BIGINT,JSON_VALUE(@RequestJson,'$.id')),@Source BIGINT=TRY_CONVERT(BIGINT,JSON_VALUE(@RequestJson,'$.request.sourceUnitId')),@Version BINARY(8)=TRY_CONVERT(BINARY(8),JSON_VALUE(@RequestJson,'$.request.version'),1),@Current BINARY(8),@Base BIGINT,
 @SourceQty DECIMAL(22,6)=TRY_CONVERT(DECIMAL(22,6),JSON_VALUE(@RequestJson,'$.request.sourceQuantityBasis')),@BaseQty DECIMAL(22,6)=TRY_CONVERT(DECIMAL(22,6),JSON_VALUE(@RequestJson,'$.request.baseQuantityBasis')),@Key NVARCHAR(100)=JSON_VALUE(@RequestJson,'$.request.idempotencyKey'),@Prior NVARCHAR(MAX),@Data NVARCHAR(MAX);
 BEGIN TRY BEGIN TRAN;
 IF JSON_QUERY(@RequestJson,'$.request') IS NOT NULL
 BEGIN
  EXEC dbo.sp_ProductionCommand_Begin @CompanyKey,@RequestJson,@Key,@Prior OUTPUT;
  IF @Prior IS NOT NULL BEGIN COMMIT;EXEC dbo.sp_ProductionWorkspace_Result @Prior;RETURN;END;
  SELECT @Current=p.ConversionVersion,@Base=i.UnitId FROM dbo.ItemPackagingProfiles p WITH(UPDLOCK,HOLDLOCK) JOIN dbo.Items i ON i.Id=p.ItemId WHERE p.Id=@Id AND p.IsActive=1 AND p.IsDeleted=0;
  IF @Current IS NULL THROW 51104,N'NOT_FOUND|Select an active existing Item packaging profile.',1;
  IF @Version IS NULL OR @Version<>@Current THROW 51109,N'STALE_VERSION|Reload packaging conversion before approving.',1;
  IF @SourceQty IS NULL OR @SourceQty<=0 OR @BaseQty IS NULL OR @BaseQty<=0 OR dbo.ufn_ProductionUnitDimension(@Source) IS NULL OR dbo.ufn_ProductionUnitDimension(@Base) IS NULL OR dbo.ufn_ProductionUnitDimension(@Source)<>dbo.ufn_ProductionUnitDimension(@Base) THROW 51100,N'UNVERIFIED_UNIT_DIMENSION|Verify positive ratios within known matching unit dimensions; unknown units remain staged.',1;
  UPDATE dbo.ItemPackagingProfiles SET SourceUnitId=@Source,BaseUnitIdSnapshot=@Base,SourceQuantityBasis=@SourceQty,BaseQuantityBasis=@BaseQty,ConversionSourceReference=JSON_VALUE(@RequestJson,'$.request.sourceReference') WHERE Id=@Id;
 END;
 SET @Data=(SELECT Id,CONVERT(VARCHAR(18),ConversionVersion,1) Version,ItemId,SourceUnitId,BaseUnitIdSnapshot BaseUnitId,SourceQuantityBasis,BaseQuantityBasis,ConversionSourceReference SourceReference FROM dbo.ItemPackagingProfiles WHERE Id=@Id AND IsDeleted=0 FOR JSON PATH,INCLUDE_NULL_VALUES,WITHOUT_ARRAY_WRAPPER);
 IF @Data IS NULL THROW 51104,N'NOT_FOUND|Packaging profile was not found.',1;
 IF @Key IS NOT NULL INSERT dbo.ProductionCommandEvents(CompanyKey,IdempotencyKey,Command,SourceId,PayloadHash,PayloadJson,ResultJson,CreatedBy) VALUES(@CompanyKey,@Key,N'PackagingConversion',@Id,HASHBYTES('SHA2_256',@RequestJson),@RequestJson,@Data,@UserId);
 COMMIT;EXEC dbo.sp_ProductionWorkspace_Result @Data;
 END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK;THROW;END CATCH;
END;
GO
/* Extend the existing importer with a verified rational conversion; the ratio is frozen in
   normalized provenance and multiplication occurs before division/final posting rounding. */
DECLARE @Definition NVARCHAR(MAX)=OBJECT_DEFINITION(OBJECT_ID('dbo.sp_ProductionImport_Map')),@Start INT,@Finish INT;
IF CHARINDEX(N'RATIONAL_PACK_CONVERSION',@Definition)=0
BEGIN
 SET @Start=CHARINDEX(N'IF @SourceUnit=@BaseUnit SET @Factor=1;',@Definition);
 SET @Finish=CHARINDEX(N'UPDATE dbo.ProductionImportRows SET NormalizedJson=',@Definition,@Start);
 IF @Start=0 OR @Finish=0 THROW 51100,N'IMPORT_CONVERSION_PATCH_PREFLIGHT|Review the import mapping procedure.',1;
 SET @Definition=STUFF(@Definition,@Start,@Finish-@Start,N'/* RATIONAL_PACK_CONVERSION */ DECLARE @SourceBasis DECIMAL(22,6)=1,@BaseBasis DECIMAL(22,6)=1;
 IF @SourceUnit=@BaseUnit SET @Factor=1;
 ELSE BEGIN
  SELECT @SourceBasis=p.SourceQuantityBasis,@BaseBasis=p.BaseQuantityBasis,@Factor=CAST(p.BaseQuantityBasis AS DECIMAL(28,12))/p.SourceQuantityBasis FROM dbo.ItemPackagingProfiles p WHERE p.Id=TRY_CONVERT(BIGINT,JSON_VALUE(@RequestJson,''$.request.packagingProfileId'')) AND p.ItemId=@Item AND p.SourceUnitId=@SourceUnit AND p.BaseUnitIdSnapshot=@BaseUnit AND p.SourceQuantityBasis>0 AND p.BaseQuantityBasis>0 AND p.IsActive=1 AND p.IsDeleted=0 AND(p.ChannelId IS NULL OR p.ChannelId=TRY_CONVERT(BIGINT,JSON_VALUE(@RequestJson,''$.request.channelId''))) AND(p.EffectiveFrom IS NULL OR p.EffectiveFrom<=@Date) AND(p.EffectiveTo IS NULL OR p.EffectiveTo>=@End);
 END;
 SET @Normalized=JSON_MODIFY(JSON_MODIFY(JSON_MODIFY(JSON_MODIFY(JSON_MODIFY(@Normalized,''$.baseUnitId'',@BaseUnit),''$.conversionFactor'',@Factor),''$.baseQuantity'',CASE WHEN @Factor IS NOT NULL THEN CONVERT(DECIMAL(22,6),ROUND(@Qty*@BaseBasis/@SourceBasis,6)) ELSE NULL END),''$.sourceQuantityBasis'',@SourceBasis),''$.baseQuantityBasis'',@BaseBasis);
 ');
 SET @Definition=N'ALTER '+SUBSTRING(@Definition,CHARINDEX(N'PROCEDURE',UPPER(@Definition)),LEN(@Definition));EXEC sys.sp_executesql @Definition;
END;
GO
