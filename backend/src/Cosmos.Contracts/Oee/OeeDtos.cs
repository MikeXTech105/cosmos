namespace Cosmos.Contracts.Oee;

public sealed class OeeMachineDto
{
    public long Id { get; set; }
    public string MachineCode { get; set; } = "";
    public string MachineName { get; set; } = "";
    public string? Tonnage { get; set; }
    public string? Location { get; set; }
    public int DisplayOrder { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public int TotalCount { get; set; }
}

public sealed class OeeMouldDto
{
    public long Id { get; set; }
    public string MouldName { get; set; } = "";
    public decimal TargetShotPerDay { get; set; }
    public int? Cavity { get; set; }
    public decimal? CycleTime { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public int TotalCount { get; set; }
}

public sealed class OeeDowntimeReasonDto
{
    public long Id { get; set; }
    public string ReasonName { get; set; } = "";
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public int TotalCount { get; set; }
}

public sealed class OeeProductionEntryDto
{
    public long Id { get; set; }
    public DateOnly ProductionDate { get; set; }
    public long MachineId { get; set; }
    public string MachineCode { get; set; } = "";
    public string MachineName { get; set; } = "";
    public long MouldId { get; set; }
    public string MouldName { get; set; } = "";
    public string MachineOnTime { get; set; } = "";
    public int ShotCount { get; set; }
    public long DowntimeReasonId { get; set; }
    public string? DowntimeReasonName { get; set; }
    public string? Remarks { get; set; }
    public decimal CalculatedTargetShot { get; set; }
    public decimal CalculatedOeePercentage { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public int TotalCount { get; set; }
}

public sealed record OeeDashboardSummaryDto(
    decimal AverageOeePercentage,
    int TotalShotCount,
    decimal TotalTargetShot,
    string? BestMachine,
    string? WorstMachine,
    int TotalProductionDays,
    int TotalDowntimeCount);

public sealed record OeeMachineWiseDto(long MachineId, string MachineName, int TotalShot, decimal TotalTarget, decimal AverageOeePercentage);
public sealed record OeeMouldWiseDto(long MouldId, string MouldName, int TotalShot, decimal TotalTarget, decimal AverageOeePercentage);
public sealed record OeeDowntimeReasonSummaryDto(string ReasonName, int Count, decimal Percentage);
public sealed record OeeDailyTrendDto(DateOnly ProductionDate, int TotalShot, decimal TotalTarget, decimal AverageOeePercentage);

public sealed class OeeDailyReportDto
{
    public DateOnly ProductionDate { get; set; }
    public string MachineCode { get; set; } = "";
    public string MachineName { get; set; } = "";
    public string MouldName { get; set; } = "";
    public string MachineOnTime { get; set; } = "";
    public int ShotCount { get; set; }
    public decimal CalculatedTargetShot { get; set; }
    public decimal CalculatedOeePercentage { get; set; }
    public string? DowntimeReasonName { get; set; }
    public string? Remarks { get; set; }
}

public sealed record OeeExportFileDto(string FileName, string ContentType, byte[] Content);
