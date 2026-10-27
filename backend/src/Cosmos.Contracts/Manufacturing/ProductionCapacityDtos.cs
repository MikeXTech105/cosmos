namespace Cosmos.Contracts.Manufacturing;

public sealed record CapacityInterval(DateTimeOffset From, DateTimeOffset To, string Reason);
public sealed record CapacityCalendarRequest(string Version, DateOnly BusinessDate,
    IReadOnlyCollection<CapacityInterval> Breaks, IReadOnlyCollection<CapacityInterval> Downtime);
public sealed record CapacityBookingLine(long RoutingStepId, DateTimeOffset From, DateTimeOffset To);
public sealed record CapacityScheduleRequest(string Version, string IdempotencyKey, DateOnly BusinessDate,
    IReadOnlyCollection<CapacityBookingLine> Bookings);
public sealed record CapacityFeasibilityLine(long RoutingStepId, int Sequence, long WorkCentreId, long ShiftId,
    DateTimeOffset? WindowFrom, DateTimeOffset? WindowTo, decimal? RequiredMinutes, decimal? AvailableMinutes,
    string? ConflictCode, string? Explanation);
public sealed record CapacityFeasibilityDto(long OrderId, string Version, string TimeZone,
    IReadOnlyCollection<CapacityFeasibilityLine> Lines)
{
    public string? ConflictCode { get; init; }
}
