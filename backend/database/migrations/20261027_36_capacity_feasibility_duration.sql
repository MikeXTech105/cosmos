SET XACT_ABORT ON;
GO
-- Expose the same dated utilization factor used by the scheduling transaction.
-- Derive an integer candidate without rounding a fractional quotient into an
-- integer. Then check its predecessor using the scheduling guard's exact SQL
-- expression, which rounds BIGINT seconds / 60.0 to six-place minutes.
CREATE OR ALTER PROCEDURE dbo.sp_ProductionCapacity_Read @CompanyKey NVARCHAR(64),@UserId BIGINT,@RequestJson NVARCHAR(MAX) AS
BEGIN
 SET NOCOUNT ON;
 DECLARE @Id BIGINT=TRY_CONVERT(BIGINT,JSON_VALUE(@RequestJson,'$.id')),@Date DATE=TRY_CONVERT(DATE,JSON_VALUE(@RequestJson,'$.businessDate')),@Zone SYSNAME=JSON_VALUE(@RequestJson,'$.timeZone'),@Data NVARCHAR(MAX);
 IF @Date IS NULL OR NOT EXISTS(SELECT 1 FROM sys.time_zone_info WHERE name=@Zone) THROW 51100,N'INVALID_BUSINESS_TIMEZONE|Configure a SQL Server supported business timezone and explicit date.',1;
 IF NOT EXISTS(SELECT 1 FROM dbo.ProductionOrders WHERE Id=@Id AND CompanyKey=@CompanyKey) THROW 51104,N'NOT_FOUND|Production order was not found.',1;
 SET @Data=(SELECT @Id OrderId,(SELECT CONVERT(VARCHAR(18),RowVersion,1) FROM dbo.ProductionOrders WHERE Id=@Id AND CompanyKey=@CompanyKey) Version,@Zone TimeZone,
  JSON_QUERY((SELECT RoutingStepId,Sequence,WorkCentreId,ShiftId,WindowFrom,WindowTo,RequiredMinutes,AvailableMinutes,CapacityFactor,
   CASE WHEN CapacityFactor>0 AND RequiredMinutes IS NOT NULL THEN
    CASE WHEN duration.CandidateSeconds>0 AND (duration.CandidateSeconds-1)/60.0*CapacityFactor>=RequiredMinutes
     THEN duration.CandidateSeconds-1 ELSE duration.CandidateSeconds END END MinimumBookingSeconds,
   CASE WHEN ConflictCode IS NOT NULL THEN ConflictCode WHEN RequiredMinutes>AvailableMinutes THEN N'OVERLOADED_SHIFT' ELSE NULL END ConflictCode,Explanation
   FROM dbo.ufn_ProductionCapacityInputs(@CompanyKey,@Id,@Date,@Zone)
   CROSS APPLY(SELECT CONVERT(DECIMAL(38,0),RequiredMinutes*1000000)*60 Numerator,
    CONVERT(DECIMAL(38,0),CapacityFactor*1000000) Denominator) scaled
   CROSS APPLY(SELECT scaled.Numerator%NULLIF(scaled.Denominator,0) Remainder) residue
   CROSS APPLY(SELECT TRY_CONVERT(BIGINT,(scaled.Numerator-residue.Remainder)/NULLIF(scaled.Denominator,0)
    +CASE WHEN residue.Remainder>0 THEN 1 ELSE 0 END) CandidateSeconds) duration
   ORDER BY Sequence FOR JSON PATH,INCLUDE_NULL_VALUES)) Lines,
  CASE WHEN NOT EXISTS(SELECT 1 FROM dbo.ufn_ProductionCapacityInputs(@CompanyKey,@Id,@Date,@Zone)) THEN N'MISSING_ROUTING' ELSE NULL END ConflictCode FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES);
 EXEC dbo.sp_ProductionWorkspace_Result @Data;
END;
GO
