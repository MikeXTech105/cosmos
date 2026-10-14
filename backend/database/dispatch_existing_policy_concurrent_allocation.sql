/* One side of the two-session configured-policy allocation race test. */
SET NOCOUNT ON;
SET XACT_ABORT ON;
SET QUOTED_IDENTIFIER ON;

IF DB_NAME() NOT LIKE N'CosmosDispatchIntegrationTests[_]%'
    THROW 51000, N'Refusing to run outside an explicitly named Dispatch integration-test database.', 1;

DECLARE @RunId BIGINT, @Recommendation1Id BIGINT, @Recommendation2Id BIGINT,
        @CompanyStockSnapshotId BIGINT, @AllocationsJson NVARCHAR(MAX);

SELECT @RunId=Id FROM dbo.DispatchPlanningRuns WHERE Notes=N'IT-Dispatch concurrent-allocation run';
IF @RunId IS NULL THROW 51001, N'Concurrent allocation fixture run was not found.', 1;
SELECT @Recommendation1Id=x.Id
FROM dbo.DispatchRecommendationResults x
JOIN dbo.ChannelWarehouses w ON w.Id=x.WarehouseId
WHERE x.PlanningRunId=@RunId AND w.WarehouseCode=N'IT-WH-1';
SELECT @Recommendation2Id=x.Id
FROM dbo.DispatchRecommendationResults x
JOIN dbo.ChannelWarehouses w ON w.Id=x.WarehouseId
WHERE x.PlanningRunId=@RunId AND w.WarehouseCode=N'IT-WH-2';
SELECT @CompanyStockSnapshotId=Id FROM dbo.DispatchCompanyStockSnapshots WHERE PlanningRunId=@RunId;
IF @Recommendation1Id IS NULL OR @Recommendation2Id IS NULL OR @CompanyStockSnapshotId IS NULL
    THROW 51002, N'Concurrent allocation fixture rows were not found.', 1;

SET @AllocationsJson=CONCAT(N'[{"recommendationId":',@Recommendation1Id,N',"companyStockSnapshotId":',@CompanyStockSnapshotId,N',"allocatedQuantity":6},{"recommendationId":',@Recommendation2Id,N',"companyStockSnapshotId":',@CompanyStockSnapshotId,N',"allocatedQuantity":9}]');
EXEC dbo.usp_DispatchPlanning_Run_Allocate @Id=@RunId,@AllocationsJson=@AllocationsJson,@Notes=N'IT concurrent allocation',@UserId=NULL;
