using Cosmos.Contracts.DataBook;
using FluentValidation;

namespace Cosmos.Application.Validators;

public sealed class CreateDataBookEntryRequestValidator : AbstractValidator<CreateDataBookEntryRequest>
{
    public CreateDataBookEntryRequestValidator()
    {
        RuleFor(x => x.Name).Must(NotBlank).WithMessage("Name is required.").MaximumLength(200);
        RuleFor(x => x.Value).Must(NotBlank).WithMessage("Value is required.");
        RuleFor(x => x.Description).MaximumLength(1000);
        RuleFor(x => x.Category).MaximumLength(100);
    }

    private static bool NotBlank(string? value) => !string.IsNullOrWhiteSpace(value);
}

public sealed class UpdateDataBookEntryRequestValidator : AbstractValidator<UpdateDataBookEntryRequest>
{
    public UpdateDataBookEntryRequestValidator()
    {
        RuleFor(x => x.Name).Must(NotBlank).WithMessage("Name is required.").MaximumLength(200);
        RuleFor(x => x.Value).Must(NotBlank).WithMessage("Value is required.");
        RuleFor(x => x.Description).MaximumLength(1000);
        RuleFor(x => x.Category).MaximumLength(100);
        RuleFor(x => x.RowVersion).Must(IsRowVersion).WithMessage("RowVersion must be a base64-encoded SQL row version.");
    }

    private static bool NotBlank(string? value) => !string.IsNullOrWhiteSpace(value);
    private static bool IsRowVersion(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return false;
        try { return Convert.FromBase64String(value).Length == 8; }
        catch (FormatException) { return false; }
    }
}

public sealed class DeleteDataBookEntryRequestValidator : AbstractValidator<DeleteDataBookEntryRequest>
{
    public DeleteDataBookEntryRequestValidator() =>
        RuleFor(x => x.RowVersion).Must(IsRowVersion).WithMessage("RowVersion must be a base64-encoded SQL row version.");

    private static bool IsRowVersion(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return false;
        try { return Convert.FromBase64String(value).Length == 8; }
        catch (FormatException) { return false; }
    }
}

public sealed class DataBookEntryListQueryValidator : AbstractValidator<DataBookEntryListQuery>
{
    public DataBookEntryListQueryValidator()
    {
        RuleFor(x => x.Search).MaximumLength(200);
        RuleFor(x => x.Category).MaximumLength(100);
        RuleFor(x => x.Visibility).Must(IsVisibility).WithMessage("Visibility must be all, public, or my-private.");
        RuleFor(x => x.CreatedByUserId).GreaterThan(0).When(x => x.CreatedByUserId.HasValue);
        RuleFor(x => x.UpdatedByUserId).GreaterThan(0).When(x => x.UpdatedByUserId.HasValue);
        RuleFor(x => x.PageNumber).GreaterThan(0);
        RuleFor(x => x.PageSize).InclusiveBetween(1, 200);
        RuleFor(x => x.SortBy).Must(IsSortBy).WithMessage("SortBy must be name, category, createdAtUtc, or updatedAtUtc.");
        RuleFor(x => x.SortDirection).Must(IsSortDirection).WithMessage("SortDirection must be asc or desc.");
        RuleFor(x => x).Must(x => !x.FromDate.HasValue || !x.ToDate.HasValue || x.FromDate <= x.ToDate)
            .WithMessage("FromDate must be on or before ToDate.");
    }

    internal static bool IsVisibility(string? value) => string.IsNullOrWhiteSpace(value) || value.Trim().ToLowerInvariant() is "all" or "public" or "my-private";
    internal static bool IsSortBy(string? value) => string.IsNullOrWhiteSpace(value) || value.Trim().ToLowerInvariant() is "name" or "category" or "createdatutc" or "updatedatutc";
    internal static bool IsSortDirection(string? value) => string.IsNullOrWhiteSpace(value) || value.Trim().ToLowerInvariant() is "asc" or "desc";
}

public sealed class DataBookExportRequestValidator : AbstractValidator<DataBookExportRequest>
{
    public DataBookExportRequestValidator()
    {
        RuleFor(x => x.Search).MaximumLength(200);
        RuleFor(x => x.Category).MaximumLength(100);
        RuleFor(x => x.Visibility).Must(DataBookEntryListQueryValidator.IsVisibility).WithMessage("Visibility must be all, public, or my-private.");
        RuleFor(x => x.CreatedByUserId).GreaterThan(0).When(x => x.CreatedByUserId.HasValue);
        RuleFor(x => x.UpdatedByUserId).GreaterThan(0).When(x => x.UpdatedByUserId.HasValue);
        RuleFor(x => x.SortBy).Must(DataBookEntryListQueryValidator.IsSortBy).WithMessage("SortBy must be name, category, createdAtUtc, or updatedAtUtc.");
        RuleFor(x => x.SortDirection).Must(DataBookEntryListQueryValidator.IsSortDirection).WithMessage("SortDirection must be asc or desc.");
        RuleFor(x => x).Must(x => !x.FromDate.HasValue || !x.ToDate.HasValue || x.FromDate <= x.ToDate)
            .WithMessage("FromDate must be on or before ToDate.");
    }
}
