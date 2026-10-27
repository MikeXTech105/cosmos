SET XACT_ABORT ON;
GO
/* Capture new v3 context; historical finalized lines remain null where it was not recorded. */
DECLARE @Name SYSNAME,@Definition NVARCHAR(MAX);
DECLARE quantity_context CURSOR LOCAL FAST_FORWARD FOR SELECT Name FROM(VALUES(N'sp_ProcurementPlanning_Run_Save'),(N'sp_ProcurementPlanning_Run_Get'),(N'sp_ProcurementPlanning_RunLine_List'),(N'sp_ProcurementPlanning_RunLine_Update')) x(Name);
OPEN quantity_context;FETCH NEXT FROM quantity_context INTO @Name;
WHILE @@FETCH_STATUS=0
BEGIN
 SET @Definition=OBJECT_DEFINITION(OBJECT_ID(N'dbo.'+@Name));
 IF @Name=N'sp_ProcurementPlanning_Run_Save' AND CHARINDEX(N'SOURCE_QUANTITY_CONTEXT',@Definition)=0
 BEGIN
  SET @Definition=REPLACE(@Definition,N'PhysicalStock,InboundStock,ProjectedAvailableStock,Shortage',N'PhysicalStock,InboundStock,ProjectedAvailableStock,ReservedStock,AvailableStock,Normalized30Requirement,Shortage');
  SET @Definition=REPLACE(@Definition,N'physicalStock,inboundStock,projectedAvailableStock,shortage',N'physicalStock,inboundStock,projectedAvailableStock,reservedStock,availableStock,normalized30Requirement,shortage');
  SET @Definition=REPLACE(@Definition,N'projectedAvailableStock DECIMAL(19,6) ''$.projectedAvailableStock'',',N'projectedAvailableStock DECIMAL(19,6) ''$.projectedAvailableStock'',reservedStock DECIMAL(22,6) ''$.reservedStock'',availableStock DECIMAL(22,6) ''$.availableStock'',normalized30Requirement DECIMAL(22,6) ''$.normalized30Requirement'',');
  SET @Definition=@Definition+N' /* SOURCE_QUANTITY_CONTEXT */';
 END;
 IF @Name<>N'sp_ProcurementPlanning_Run_Save' AND CHARINDEX(N'ProjectedAvailableStock,ReservedStock',@Definition)=0
  SET @Definition=REPLACE(@Definition,N'ProjectedAvailableStock FROM',N'ProjectedAvailableStock,ReservedStock,AvailableStock,Normalized30Requirement FROM');
 SET @Definition=N'ALTER '+SUBSTRING(@Definition,CHARINDEX(N'PROCEDURE',UPPER(@Definition)),LEN(@Definition));EXEC sys.sp_executesql @Definition;
 FETCH NEXT FROM quantity_context INTO @Name;
END;
CLOSE quantity_context;DEALLOCATE quantity_context;
GO
DECLARE @Definition NVARCHAR(MAX)=OBJECT_DEFINITION(OBJECT_ID('dbo.sp_ProductionPlanning_ReadSnapshot'));
IF CHARINDEX(N'DemandFrom',@Definition)=0
BEGIN
 SET @Definition=REPLACE(@Definition,N'SELECT @Id Id,JSON_VALUE(@Snapshot,''$.asOfDate'')',N'SELECT @Id Id,JSON_VALUE(@Snapshot,''$.demandFrom'') DemandFrom,JSON_VALUE(@Snapshot,''$.demandTo'') DemandTo,TRY_CONVERT(INT,JSON_VALUE(@Snapshot,''$.freshnessDays'')) FreshnessDays,TRY_CONVERT(BIGINT,JSON_VALUE(@Snapshot,''$.channelId'')) ChannelId,JSON_VALUE(@Snapshot,''$.asOfDate'')');
 SET @Definition=N'ALTER '+SUBSTRING(@Definition,CHARINDEX(N'PROCEDURE',UPPER(@Definition)),LEN(@Definition));EXEC sys.sp_executesql @Definition;
END;
GO
