namespace Cosmos.Application.Oee;

public sealed record OeeMasterListQuery(string? Search = null, bool? IsActive = null, int Page = 1, int PageSize = 50, string SortBy = "DisplayOrder", string SortDirection = "ASC");

public sealed record CreateOeeMachineRequest(string MachineCode, string MachineName, string? Tonnage, string? Location, int DisplayOrder = 0, bool IsActive = true);
public sealed record UpdateOeeMachineRequest(string MachineCode, string MachineName, string? Tonnage, string? Location, int DisplayOrder = 0, bool IsActive = true);

public sealed record CreateOeeMouldRequest(string MouldName, decimal TargetShotPerDay, int? Cavity = null, decimal? CycleTime = null, bool IsActive = true);
public sealed record UpdateOeeMouldRequest(string MouldName, decimal TargetShotPerDay, int? Cavity = null, decimal? CycleTime = null, bool IsActive = true);

public sealed record CreateOeeDowntimeReasonRequest(string ReasonName, bool IsActive = true);
public sealed record UpdateOeeDowntimeReasonRequest(string ReasonName, bool IsActive = true);

public sealed record OeeProductionEntryLineRequest(long MachineId, string MachineOnTime, long MouldId, int ShotCount, long? DowntimeReasonId = null, string? Remarks = null);
public sealed record BulkCreateOeeProductionEntriesRequest(DateOnly ProductionDate, IReadOnlyCollection<OeeProductionEntryLineRequest> Entries);
public sealed record UpdateOeeProductionEntryRequest(DateOnly ProductionDate, long MachineId, string MachineOnTime, long MouldId, int ShotCount, long? DowntimeReasonId = null, string? Remarks = null);

public sealed record OeeProductionEntryListQuery(
    DateOnly? FromDate = null,
    DateOnly? ToDate = null,
    long? MachineId = null,
    long? MouldId = null,
    long? DowntimeReasonId = null,
    int Page = 1,
    int PageSize = 20,
    string SortBy = "ProductionDate",
    string SortDirection = "DESC");

public sealed record OeeDashboardQuery(int? LastDays = null, DateOnly? FromDate = null, DateOnly? ToDate = null);

public sealed record OeeReportQuery(
    int? LastDays = null,
    DateOnly? FromDate = null,
    DateOnly? ToDate = null,
    long? MachineId = null,
    long? MouldId = null,
    long? DowntimeReasonId = null);
