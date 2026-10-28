-- Read-only exact-ID hydration; no masters/history are created or changed.
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO
CREATE OR ALTER PROCEDURE dbo.sp_ProductionMaster_Read
 @CompanyKey NVARCHAR(64),@UserId BIGINT,@RequestJson NVARCHAR(MAX)
AS
BEGIN
 SET NOCOUNT ON;
 DECLARE @Kind NVARCHAR(30)=JSON_VALUE(@RequestJson,'$.kind'),
         @Id BIGINT=TRY_CONVERT(BIGINT,JSON_VALUE(@RequestJson,'$.id')),@Data NVARCHAR(MAX);
 IF @Id IS NULL OR @Id<=0 THROW 51100,N'INVALID_MASTER|Select a valid production master.',1;
 IF @Kind=N'work-centres'
  SELECT @Data=(SELECT Id,Code,Name,IsActive,CONVERT(VARCHAR(18),RowVersion,1) Version,
   DefaultShiftId,CapacityBasis,Notes FROM dbo.ProductionWorkCentres WHERE Id=@Id AND CompanyKey=@CompanyKey FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
 ELSE IF @Kind=N'operations'
  SELECT @Data=(SELECT Id,Code,Name,IsActive,CONVERT(VARCHAR(18),RowVersion,1) Version,
   RateBasis,DefaultRate,Notes FROM dbo.ProductionOperations WHERE Id=@Id AND CompanyKey=@CompanyKey FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
 ELSE THROW 51100,N'INVALID_MASTER|Unknown production master.',1;
 IF NULLIF(@Data,N'') IS NULL THROW 51104,N'NOT_FOUND|Production master was not found in this company.',1;
 EXEC dbo.sp_ProductionWorkspace_Result @Data;
END;
GO
