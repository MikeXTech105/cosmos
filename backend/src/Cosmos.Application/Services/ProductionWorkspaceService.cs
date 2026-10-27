using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Application.Manufacturing;
using Cosmos.Contracts.Common;
using Cosmos.Contracts.Manufacturing;
using Cosmos.Shared.Exceptions;
using Cosmos.Shared.Responses;
using Cosmos.Shared.Security;
using FluentValidation;

namespace Cosmos.Application.Services;

public sealed class ProductionWorkspaceService(IProductionWorkspaceRepository repository, IProductionCompanyScope scope,
    ICurrentUser user, IValidator<ProductionOrderDraftRequest> draftValidator,
    IValidator<ProductionCompletionRequest> completionValidator) : IProductionWorkspaceService
{
    private async Task<ApiResponse<T>> Run<T>(string procedure, object request, CancellationToken ct) =>
        ApiResponse<T>.Success(await repository.ExecuteAsync<T>(procedure, scope.CompanyKey,
            user.UserId ?? throw new UnauthorizedCosmosException(), request, ct));
    public Task<ApiResponse<PackagingConversionDto>> PackagingConversionAsync(long id,PackagingConversionRequest? r,CancellationToken ct)
    {
        if(r is not null)
        {
            Version(r.Version);Key(r.IdempotencyKey);
            if(r.SourceUnitId<=0 || r.SourceQuantityBasis<=0 || r.BaseQuantityBasis<=0 || !ProductionCalculations.IsPostingQuantity(r.SourceQuantityBasis) || !ProductionCalculations.IsPostingQuantity(r.BaseQuantityBasis) || string.IsNullOrWhiteSpace(r.SourceReference) || r.SourceReference.Length>200)
                throw new CosmosException("Verify positive source/base quantity bases and source provenance on an existing packaging profile.");
        }
        return Run<PackagingConversionDto>("sp_PackagingProfile_Conversion",new {Id=id,Request=r},ct);
    }

    public Task<ApiResponse<FinishedPlanningSnapshotPage>> SnapshotAsync(Guid id,ProductionWorkspaceQuery q,CancellationToken ct) =>
        Run<FinishedPlanningSnapshotPage>("sp_ProductionPlanning_ReadSnapshot",new { Id=id,Query=Page(q) },ct);
    public Task<ApiResponse<StockBalanceDto>> StockAsync(long id,CancellationToken ct) => Run<StockBalanceDto>("sp_ProductionStock_Balance",new {Id=id},ct);
    public Task<ApiResponse<ProductionCommandResult>> AdjustStockAsync(long id,StockAdjustmentRequest r,CancellationToken ct)
    {
        Version(r.Version);Key(r.IdempotencyKey);scope.EnsureOpenDate(r.BusinessDate);
        if(r.BusinessDate==default || r.BusinessDate>scope.CurrentBusinessDate || r.UnitId<=0 || r.SignedQuantity==0 || !ProductionCalculations.IsPostingQuantity(r.SignedQuantity) || string.IsNullOrWhiteSpace(r.Reason) || r.Reason.Length>1000 || string.IsNullOrWhiteSpace(r.SourceReference) || r.SourceReference.Length>100)
            throw new CosmosException("A stock adjustment requires a signed six-place base quantity, real date, source reference and reason.");
        return Run<ProductionCommandResult>("sp_ProductionStock_Adjust",new {Id=id,Request=r},ct);
    }

    public Task<ApiResponse<PagedResult<ProductionMasterDto>>> MastersAsync(string kind, ProductionWorkspaceQuery q, CancellationToken ct) =>
        Run<PagedResult<ProductionMasterDto>>("sp_ProductionMaster_List", new { Kind = kind, Query = Page(q) }, ct);

    public Task<ApiResponse<ProductionMasterDto>> WorkCentreAsync(long? id, WorkCentreRequest r, CancellationToken ct)
    {
        Master(r.Code, r.Name, id, r.Version);
        if (r.CapacityBasis != "Minutes") throw new CosmosException("Work centre capacity basis must be Minutes.");
        return Run<ProductionMasterDto>("sp_ProductionMaster_Save", new { Kind = "work-centres", Id = id, Request = r }, ct);
    }

    public Task<ApiResponse<ProductionMasterDto>> OperationAsync(long? id, OperationRequest r, CancellationToken ct)
    {
        Master(r.Code, r.Name, id, r.Version);
        if (!Enum.IsDefined(r.RateBasis) || r.DefaultRate <= 0 || (r.DefaultRate.HasValue && !ProductionCalculations.IsPostingQuantity(r.DefaultRate.Value))) throw new CosmosException("Operation rate basis/default is invalid.");
        return Run<ProductionMasterDto>("sp_ProductionMaster_Save", new { Kind = "operations", Id = id, Request = r }, ct);
    }

    public Task<ApiResponse<ProductionCommandResult>> RoutingAsync(long itemId, ItemRoutingRequest r, CancellationToken ct)
    {
        Dates(r.EffectiveFrom, r.EffectiveTo);
        if (string.IsNullOrWhiteSpace(r.Revision) || r.Steps.Count == 0 || r.Steps.Select(x => x.Sequence).Distinct().Count() != r.Steps.Count ||
            r.Steps.Any(x => x.Sequence <= 0 || x.OperationId <= 0 || x.WorkCentreId <= 0 || x.Rate <= 0 || x.SetupMinutes < 0 || x.QuantityBasis <= 0 || !Enum.IsDefined(x.RateBasis) || !ProductionCalculations.IsPostingQuantity(x.Rate) || !ProductionCalculations.IsPostingQuantity(x.SetupMinutes) || !ProductionCalculations.IsPostingQuantity(x.QuantityBasis)))
            throw new CosmosException("Routing needs a revision and unique positive sequences with verified rates and quantity basis.");
        return Run<ProductionCommandResult>("sp_ProductionConfiguration_Save", new { Kind = "routing", ParentId = itemId, Request = r }, ct);
    }

    public Task<ApiResponse<ProductionCommandResult>> EligibilityAsync(long itemId, ItemEligibilityRequest r, CancellationToken ct)
    {
        Dates(r.EffectiveFrom, r.EffectiveTo);
        if (r.MachineId <= 0 || r.MouldId <= 0 || r.SkuOutputPerShot <= 0 || !ProductionCalculations.IsPostingQuantity(r.SkuOutputPerShot)) throw new CosmosException("Verified machine, mould and six-place SKU output per shot are required.");
        return Run<ProductionCommandResult>("sp_ProductionConfiguration_Save", new { Kind = "eligibility", ParentId = itemId, Request = r }, ct);
    }

    public Task<ApiResponse<ProductionCommandResult>> ShiftAsync(long workCentreId, WorkCentreShiftRequest r, CancellationToken ct)
    {
        Dates(r.EffectiveFrom, r.EffectiveTo);
        if (r.ShiftId <= 0 || r.BreakMinutes < 0 || r.CapacityFactor is <= 0 or > 1 || !ProductionCalculations.IsPostingQuantity(r.CapacityFactor)) throw new CosmosException("Shift, break or capacity factor is invalid.");
        return Run<ProductionCommandResult>("sp_ProductionConfiguration_Save", new { Kind = "shift", ParentId = workCentreId, Request = r }, ct);
    }

    public Task<ApiResponse<PagedResult<ProductionOrderDto>>> OrdersAsync(ProductionWorkspaceQuery q, CancellationToken ct) =>
        Run<PagedResult<ProductionOrderDto>>("sp_ProductionOrder_Read", new { Query = Page(q) }, ct);
    public Task<ApiResponse<ProductionOrderDto>> OrderAsync(long id, CancellationToken ct) => Run<ProductionOrderDto>("sp_ProductionOrder_Read", new { Id = id }, ct);
    public Task<ApiResponse<ProductionOrderContextDto>> ContextAsync(long id, CancellationToken ct) => Run<ProductionOrderContextDto>("sp_ProductionWorkspace_Context", new { Id = id, Kind = "order" }, ct);
    public Task<ApiResponse<ProductionConfigurationDto>> ConfigurationAsync(long id, string kind, CancellationToken ct) => Run<ProductionConfigurationDto>("sp_ProductionWorkspace_Context", new { Id = id, Kind = kind }, ct);
    public Task<ApiResponse<CapacityFeasibilityDto>> CapacityAsync(long id, DateOnly date, CancellationToken ct)
    {
        if (date == default) throw new CosmosException("An explicit capacity business date is required.");
        return Run<CapacityFeasibilityDto>("sp_ProductionCapacity_Read", new { Id = id, BusinessDate = date, TimeZone = scope.BusinessTimeZone }, ct);
    }
    public Task<ApiResponse<ProductionCommandResult>> CalendarAsync(long shiftConfigurationId, CapacityCalendarRequest r, CancellationToken ct)
    {
        Version(r.Version); scope.EnsureOpenDate(r.BusinessDate);
        if (r.BusinessDate == default || r.Breaks.Concat(r.Downtime).Any(x => x.To <= x.From || string.IsNullOrWhiteSpace(x.Reason))) throw new CosmosException("Calendar intervals need valid offsets, increasing times and reasons.");
        return Run<ProductionCommandResult>("sp_ProductionCapacity_Calendar", new { Id = shiftConfigurationId, TimeZone = scope.BusinessTimeZone, Request = r }, ct);
    }
    public Task<ApiResponse<ProductionCommandResult>> ScheduleAsync(long id, CapacityScheduleRequest r, CancellationToken ct)
    {
        Version(r.Version); Key(r.IdempotencyKey); scope.EnsureOpenDate(r.BusinessDate);
        if (r.BusinessDate == default || r.Bookings.Count == 0 || r.Bookings.Select(x => x.RoutingStepId).Distinct().Count() != r.Bookings.Count || r.Bookings.Any(x => x.RoutingStepId <= 0 || x.To <= x.From)) throw new CosmosException("Each route operation needs one explicit, non-overlapping booking window.");
        return Run<ProductionCommandResult>("sp_ProductionCapacity_Schedule", new { Id = id, TimeZone = scope.BusinessTimeZone, Request = r }, ct);
    }
    public async Task<ApiResponse<ProductionOrderDto>> DraftAsync(long? id, ProductionOrderDraftRequest r, CancellationToken ct)
    {
        await ValidationRunner.ValidateAsync(draftValidator, r, ct);
        if (id is not null) Version(r.Version);
        return await Run<ProductionOrderDto>("sp_ProductionOrder_SaveDraft", new { Id = id, Request = r }, ct);
    }
    public Task<ApiResponse<ProductionCommandResult>> ReleaseAsync(long id, ProductionOrderReleaseRequest r, CancellationToken ct)
    {
        Version(r.Version); Key(r.IdempotencyKey);
        if (r.Quantity <= 0 || !ProductionCalculations.IsPostingQuantity(r.Quantity)) throw new CosmosException("Explicit release quantity must be positive and representable at six places.");
        var date = scope.CurrentBusinessDate; scope.EnsureOpenDate(date);
        return Run<ProductionCommandResult>("sp_ProductionOrder_Release", new { Id = id, BusinessDate = date, Request = r }, ct);
    }
    public async Task<ApiResponse<ProductionCommandResult>> CompleteAsync(long id, ProductionCompletionRequest r, CancellationToken ct)
    {
        await ValidationRunner.ValidateAsync(completionValidator, r, ct);
        Version(r.Version); Key(r.IdempotencyKey);
        scope.EnsureOpenDate(r.BusinessDate);
        if (r.BusinessDate > scope.CurrentBusinessDate || DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(r.OccurredAt,TimeZoneInfo.FindSystemTimeZoneById(scope.BusinessTimeZone)).DateTime) != r.BusinessDate)
            throw new CosmosException("Completion business date must match the actual timestamp in the configured business timezone and cannot be in the future.");
        return await Run<ProductionCommandResult>("sp_ProductionOrder_Complete", new { Id = id, Request = r }, ct);
    }
    public Task<ApiResponse<ProductionCommandResult>> ActionAsync(long id, string action, ProductionOrderActionRequest r, CancellationToken ct)
    {
        Version(r.Version); Key(r.IdempotencyKey);
        if (action is not ("close" or "cancel" or "reverse-completion") || string.IsNullOrWhiteSpace(r.Reason)) throw new CosmosException("A supported action and reason are required.");
        var date = scope.CurrentBusinessDate; scope.EnsureOpenDate(date);
        return Run<ProductionCommandResult>("sp_ProductionOrder_Action", new { Id = id, Action = action, BusinessDate = date, Request = r }, ct);
    }
    public async Task<ApiResponse<FinishedPlanningSnapshot>> PlanAsync(FinishedPlanningRequest r, CancellationToken ct)
    {
        Dates(r.DemandFrom, r.DemandTo);
        if (r.AsOfDate == default || r.DemandTo > r.AsOfDate || r.FreshnessDays < 0) throw new CosmosException("Planning date, observed period or freshness is invalid.");
        if (r.AsOfDate != scope.CurrentBusinessDate) throw new CosmosException("A new operational plan must use the current configured business date. Saved snapshots retain their original as-of date; historical inventory reconciliation is a separate ledger view.");
        var lines = await repository.ExecuteAsync<IReadOnlyCollection<FinishedPlanningLine>>("sp_ProductionPlanning_Inputs", scope.CompanyKey, user.UserId,
            new { r.AsOfDate, r.DemandFrom, r.DemandTo, r.FreshnessDays, r.ChannelId, r.ItemIds, TimeZone = scope.BusinessTimeZone }, ct);
        var calculated = lines.Select(x =>
        {
            var demand = ProductionCalculations.FinishedDemand(x.DemandQuantity, r.DemandTo.DayNumber - r.DemandFrom.DayNumber + 1,
                x.RefreshedOn, r.AsOfDate, r.FreshnessDays, x.PhysicalStock, x.OpenReleasedOutput+x.EligibleInboundQuantity);
            return x with { DailyDemand = demand.DailyDemand, Target21 = demand.Target21, Warning15 = demand.Warning15,
                SevenDayDemand = demand.SevenDayDemand, FourWeekSlice = demand.FourWeekSlice, CoverageDays = demand.CoverageDays,
                SuggestedProduction = demand.SuggestedProduction, Freshness = demand.Freshness, Monthly30Demand=demand.Monthly30 };
        }).ToArray();
        var snapshot = new FinishedPlanningSnapshot(Guid.NewGuid(), r.AsOfDate, ProductionCalculations.Version,
            "21-day top-up: eligible physical stock + distinct remaining released output + accepted-outstanding PO supply due within 21 days; undated inbound excluded; linked demand counted once; reservations visible separately.", calculated) {DemandFrom=r.DemandFrom,DemandTo=r.DemandTo,FreshnessDays=r.FreshnessDays,ChannelId=r.ChannelId};
        return await Run<FinishedPlanningSnapshot>("sp_ProductionPlanning_SaveSnapshot", new { Request = r, Snapshot = snapshot }, ct);
    }
    public Task<ApiResponse<PagedResult<ProductionReportRow>>> ReportAsync(string kind, ProductionWorkspaceQuery q, CancellationToken ct) =>
        Run<PagedResult<ProductionReportRow>>("sp_ProductionReport_Read", new { Kind = kind, Query = Page(q) }, ct);
    public Task<ApiResponse<ProductionCommandResult>> ObserveDemandAsync(ProductionDemandObservationRequest r, CancellationToken ct)
    {
        Dates(r.ObservedFrom, r.ObservedTo); Key(r.IdempotencyKey);
        if (r.ItemId <= 0 || r.UnitId <= 0 || r.SourceQuantity < 0 || ProductionCalculations.Quantity(r.SourceQuantity) != r.SourceQuantity ||
            r.RefreshedOn < r.ObservedTo || r.RefreshedOn > scope.CurrentBusinessDate || string.IsNullOrWhiteSpace(r.SourceReference) || r.SourceReference.Length > 100)
            throw new CosmosException("An observed period, known Item/base unit, explicit refresh date and nonnegative source quantity/reference are required.");
        return Run<ProductionCommandResult>("sp_ProductionDemand_Observe", r, ct);
    }
    public Task<ApiResponse<PagedResult<ProductionDemandObservationDto>>> DemandObservationsAsync(ProductionWorkspaceQuery q, CancellationToken ct) =>
        Run<PagedResult<ProductionDemandObservationDto>>("sp_ProductionDemand_Read", Page(q), ct);
    public async Task<ApiResponse<MaterialFeasibilityDto>> MaterialsAsync(MaterialFeasibilityRequest r, CancellationToken ct)
    {
        if (r.SnapshotId == Guid.Empty || r.Outputs.Count == 0 || r.Outputs.Select(x => x.ItemId).Distinct().Count() != r.Outputs.Count || r.Outputs.Any(x => x.ItemId <= 0 || x.Quantity < 0)) throw new CosmosException("Select unique source plan outputs with nonnegative what-if quantities.");
        var inputs = await repository.ExecuteAsync<IReadOnlyCollection<MaterialFeasibilityInput>>("sp_ProductionPlanning_MaterialInputs", scope.CompanyKey, user.UserId ?? throw new UnauthorizedCosmosException(), r, ct);
        return ApiResponse<MaterialFeasibilityDto>.Success(MaterialFeasibilityCalculator.Calculate(r.SnapshotId, inputs));
    }
    public Task<ApiResponse<ProductionImportResult>> StageAsync(ProductionImportRequest r, CancellationToken ct)
    {
        if (r.CutoverDate == default || string.IsNullOrWhiteSpace(r.FileFingerprint) || r.FileFingerprint.Length>128 || string.IsNullOrWhiteSpace(r.FileName) || r.FileName.Length>260 || r.Rows.Count is 0 or > 5000 ||
            r.Rows.Any(x => string.IsNullOrWhiteSpace(x.Tab) || x.Tab.Length>100 || x.Row <= 0 || string.IsNullOrWhiteSpace(x.Column) || x.Column.Length>100 || string.IsNullOrWhiteSpace(x.EventFingerprint) || x.EventFingerprint.Length>128))
            throw new CosmosException("A cutover date, file fingerprint and up to 5,000 rows with cell/event provenance are required.");
        return Run<ProductionImportResult>("sp_ProductionImport_Stage", r, ct);
    }
    private static ProductionWorkspaceQuery Page(ProductionWorkspaceQuery q)
    {
        if(q.FromDate>q.ToDate)throw new CosmosException("FromDate must be on or before ToDate.");
        return q with { PageNumber = Math.Max(1, q.PageNumber), PageSize = Math.Clamp(q.PageSize, 1, 200) };
    }
    public Task<ApiResponse<ProductionCommandResult>> AmendAsync(long id, ProductionOrderAmendRequest r, CancellationToken ct)
    {
        Version(r.Version); Key(r.IdempotencyKey); Dates(r.PlannedStart,r.DueDate);
        var date=scope.CurrentBusinessDate; scope.EnsureOpenDate(date);
        if(r.ReleasedQuantity<=0 || r.PlannedQuantity is <=0 || string.IsNullOrWhiteSpace(r.Reason) || ProductionCalculations.Quantity(r.ReleasedQuantity)!=r.ReleasedQuantity)
            throw new CosmosException("An amendment requires a positive six-place release quantity, dates and an approval reason.");
        return Run<ProductionCommandResult>("sp_ProductionOrder_Amend",new {Id=id,BusinessDate=date,Request=r},ct);
    }
    public Task<ApiResponse<ProductionCommandResult>> EndEffectivityAsync(string kind,long id,ProductionEffectivityRequest r,CancellationToken ct)
    {
        Version(r.Version);Key(r.IdempotencyKey);
        if(kind is not("routing" or "eligibility" or "shift" or "bom") || r.EffectiveTo==default || string.IsNullOrWhiteSpace(r.Reason)) throw new CosmosException("Choose an existing configuration family, end date and review reason.");
        return Run<ProductionCommandResult>("sp_ProductionConfiguration_EndEffectivity",new {Id=id,Kind=kind,Request=r},ct);
    }
    public Task<ApiResponse<PagedResult<ProductionOperationalReportRow>>> OperationalReportAsync(string kind, ProductionWorkspaceQuery q, CancellationToken ct)
    {
        if (kind is not ("stock-as-of" or "ledger" or "scorecard" or "plan-actual" or "capacity")) throw new CosmosException("Unsupported operational report.");
        if (kind == "stock-as-of" && q.AsOfDate is null) throw new CosmosException("Stock reconciliation requires an explicit business as-of date.");
        if(q.AsOfDate>scope.CurrentBusinessDate)throw new CosmosException("A ledger as-of date cannot be a future stock projection.");
        return Run<PagedResult<ProductionOperationalReportRow>>("sp_ProductionOperationalReport_Read", new { Kind = kind, Query = Page(q), TimeZone = scope.BusinessTimeZone, CurrentBusinessDate = scope.CurrentBusinessDate }, ct);
    }
    public Task<ApiResponse<ProductionImportPreview>> ImportPreviewAsync(Guid id, ProductionWorkspaceQuery q, CancellationToken ct) =>
        Run<ProductionImportPreview>("sp_ProductionImport_Preview", new { Id = id, Query = Page(q) }, ct);
    public Task<ApiResponse<ProductionImportResult>> MapImportAsync(Guid id, ProductionImportMappingRequest r, CancellationToken ct)
    {
        Version(r.Version); Key(r.IdempotencyKey);
        if (r.RowId <= 0 || !Enum.IsDefined(r.Disposition) || string.IsNullOrWhiteSpace(r.Reason) || r.Reason.Length > 1000 || string.IsNullOrWhiteSpace(r.SourceReference) || r.SourceReference.Length > 100 || (r.SourceQuantity is decimal source && decimal.Round(source,12)!=source))
            throw new CosmosException("Mapping needs a real staged row, disposition, source identity and review reason.");
        return Run<ProductionImportResult>("sp_ProductionImport_Map", new { Id = id, Request = r }, ct);
    }
    public Task<ApiResponse<ProductionImportResult>> ImportActionAsync(Guid id, string action, ProductionImportActionRequest r, CancellationToken ct)
    {
        Version(r.Version); Key(r.IdempotencyKey);
        if (action is not ("validate" or "reconcile" or "approve" or "post") || r.RowIds.Count is 0 or > 5000 || r.RowIds.Any(x => x <= 0) || r.RowIds.Distinct().Count() != r.RowIds.Count || string.IsNullOrWhiteSpace(r.Reason) || r.Reason.Length>1000)
            throw new CosmosException("Choose unique staged rows and supply a review reason for the supported import action.");
        if (action == "post") scope.EnsureOpenDate(scope.CurrentBusinessDate);
        return Run<ProductionImportResult>("sp_ProductionImport_Action", new { Id = id, Action = action, BusinessDate = scope.CurrentBusinessDate, Request = r }, ct);
    }
    private static void Master(string code, string name, long? id, string? version)
    {
        if (string.IsNullOrWhiteSpace(code) || code.Length > 50 || string.IsNullOrWhiteSpace(name) || name.Length > 200) throw new CosmosException("Master code and name are required and must fit their limits.");
        if (id is not null) Version(version);
    }
    private static void Dates(DateOnly from, DateOnly? to) { if (from == default || to < from) throw new CosmosException("Effective date range is invalid."); }
    private static void Version(string? v) { if (v is null || v.Length != 18 || !v.StartsWith("0x", StringComparison.Ordinal) || !v.AsSpan(2).ToString().All(Uri.IsHexDigit)) throw new CosmosException("Version must be the returned SQL rowversion token."); }
    private static void Key(string key) { if (string.IsNullOrWhiteSpace(key) || key.Length > 100) throw new CosmosException("An idempotency key of at most 100 characters is required."); }
}
