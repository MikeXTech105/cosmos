using Cosmos.Contracts.Audit;
using FluentValidation;

namespace Cosmos.Application.Validators;

public sealed class ActivityLogListQueryValidator : AbstractValidator<ActivityLogListQuery>
{
    public ActivityLogListQueryValidator()
    {
        RuleFor(x => x.Search).MaximumLength(200);
        RuleFor(x => x.UserId).GreaterThan(0).When(x => x.UserId.HasValue);
        RuleFor(x => x.Username).MaximumLength(100);
        RuleFor(x => x.Module).MaximumLength(64);
        RuleFor(x => x.Action).MaximumLength(64);
        RuleFor(x => x.EntityType).MaximumLength(128);
        RuleFor(x => x.EntityId).MaximumLength(100);
        RuleFor(x => x.HttpMethod).MaximumLength(10);
        RuleFor(x => x.StatusCode).InclusiveBetween(100, 599).When(x => x.StatusCode.HasValue);
        RuleFor(x => x.CorrelationId).MaximumLength(128);
        RuleFor(x => x.SortBy).Must(ActivityLogValidationRules.IsSortBy).WithMessage(ActivityLogValidationRules.SortByMessage);
        RuleFor(x => x.SortDirection).Must(ActivityLogValidationRules.IsSortDirection).WithMessage("SortDirection must be asc or desc.");
        RuleFor(x => x).Must(x => !x.FromDate.HasValue || !x.ToDate.HasValue || x.FromDate <= x.ToDate).WithMessage("FromDate must be on or before ToDate.");
        RuleFor(x => x.PageNumber).GreaterThan(0);
        RuleFor(x => x.PageSize).InclusiveBetween(1, 200);
    }
}

public sealed class ActivityLogExportRequestValidator : AbstractValidator<ActivityLogExportRequest>
{
    public ActivityLogExportRequestValidator()
    {
        RuleFor(x => x.Search).MaximumLength(200);
        RuleFor(x => x.UserId).GreaterThan(0).When(x => x.UserId.HasValue);
        RuleFor(x => x.Username).MaximumLength(100);
        RuleFor(x => x.Module).MaximumLength(64);
        RuleFor(x => x.Action).MaximumLength(64);
        RuleFor(x => x.EntityType).MaximumLength(128);
        RuleFor(x => x.EntityId).MaximumLength(100);
        RuleFor(x => x.HttpMethod).MaximumLength(10);
        RuleFor(x => x.StatusCode).InclusiveBetween(100, 599).When(x => x.StatusCode.HasValue);
        RuleFor(x => x.CorrelationId).MaximumLength(128);
        RuleFor(x => x.SortBy).Must(ActivityLogValidationRules.IsSortBy).WithMessage(ActivityLogValidationRules.SortByMessage);
        RuleFor(x => x.SortDirection).Must(ActivityLogValidationRules.IsSortDirection).WithMessage("SortDirection must be asc or desc.");
        RuleFor(x => x).Must(x => !x.FromDate.HasValue || !x.ToDate.HasValue || x.FromDate <= x.ToDate).WithMessage("FromDate must be on or before ToDate.");
    }
}

internal static class ActivityLogValidationRules
{
    private static readonly string[] SortFields = ["TimestampUtc", "Username", "Module", "Action", "EntityType", "EntityId", "HttpStatusCode"];

    public const string SortByMessage = "SortBy must be TimestampUtc, Username, Module, Action, EntityType, EntityId, or HttpStatusCode.";
    public static bool IsSortBy(string? value) => string.IsNullOrWhiteSpace(value) || SortFields.Contains(value.Trim(), StringComparer.OrdinalIgnoreCase);
    public static bool IsSortDirection(string? value) => string.IsNullOrWhiteSpace(value) || value.Trim().Equals("asc", StringComparison.OrdinalIgnoreCase) || value.Trim().Equals("desc", StringComparison.OrdinalIgnoreCase);
}
