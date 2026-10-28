SET XACT_ABORT ON;
GO
CREATE OR ALTER PROCEDURE dbo.sp_ProductionCapacity_CalendarRead @CompanyKey NVARCHAR(64),@UserId BIGINT,@RequestJson NVARCHAR(MAX) AS
BEGIN
 SET NOCOUNT ON;
 DECLARE @Id BIGINT=TRY_CONVERT(BIGINT,JSON_VALUE(@RequestJson,'$.id')),@Date DATE=TRY_CONVERT(DATE,JSON_VALUE(@RequestJson,'$.businessDate')),@Version VARCHAR(18),@Data NVARCHAR(MAX);
 IF @Date IS NULL THROW 51100,N'INVALID_DATE|Choose an explicit calendar business date.',1;
 SELECT @Version=CONVERT(VARCHAR(18),RowVersion,1) FROM dbo.ProductionWorkCentreShifts WHERE Id=@Id AND CompanyKey=@CompanyKey;
 IF @Version IS NULL THROW 51104,N'NOT_FOUND|Shift capacity configuration was not found in this catalog.',1;
 SET @Data=(SELECT @Id Id,@Version Version,@Date BusinessDate,
 JSON_QUERY((SELECT FromUtc [From],ToUtc [To],Reason FROM dbo.ProductionCapacityCalendar WHERE CompanyKey=@CompanyKey AND ShiftConfigurationId=@Id AND BusinessDate=@Date AND BlockType=N'Break' ORDER BY FromUtc,Id FOR JSON PATH)) Breaks,
 JSON_QUERY((SELECT FromUtc [From],ToUtc [To],Reason FROM dbo.ProductionCapacityCalendar WHERE CompanyKey=@CompanyKey AND ShiftConfigurationId=@Id AND BusinessDate=@Date AND BlockType=N'Downtime' ORDER BY FromUtc,Id FOR JSON PATH)) Downtime
 FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
 EXEC dbo.sp_ProductionWorkspace_Result @Data;
END;
GO
