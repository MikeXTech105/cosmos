using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Application.Items.Commands;
using Cosmos.Application.Items.Queries;
using Cosmos.Domain.Items;
using FluentValidation;

namespace Cosmos.Application.Validators;

public sealed class CreateItemValidator : AbstractValidator<CreateItemCommand>
{
    public CreateItemValidator(IItemRepository repository)
    {
        Include(new ItemCommandValidator<CreateItemCommand>(repository, null));
    }
}

public sealed class UpdateItemValidator : AbstractValidator<UpdateItemCommand>
{
    public UpdateItemValidator(IItemRepository repository)
    {
        Include(new ItemCommandValidator<UpdateItemCommand>(repository, GetRouteId));
    }

    private static long? GetRouteId(ValidationContext<UpdateItemCommand> context) =>
        context.RootContextData.TryGetValue("Id", out var value) && value is long id ? id : null;
}

public sealed class GetItemsQueryValidator : AbstractValidator<GetItemsQuery>
{
    private static readonly string[] AllowedSortColumns = ["Name", "ItemCode", "Barcode", "SalesPrice", "PurchasePrice", "CurrentStock", "CreatedAt"];

    public GetItemsQueryValidator()
    {
        RuleFor(x => x.PageNumber).GreaterThan(0);
        RuleFor(x => x.PageSize).InclusiveBetween(1, 200);
        RuleFor(x => x.SortBy).Must(x => string.IsNullOrWhiteSpace(x) || AllowedSortColumns.Contains(x)).WithMessage("SortBy is invalid.");
        RuleFor(x => x.SortDirection).Must(x => string.IsNullOrWhiteSpace(x) || string.Equals(x, "ASC", StringComparison.OrdinalIgnoreCase) || string.Equals(x, "DESC", StringComparison.OrdinalIgnoreCase)).WithMessage("SortDirection must be ASC or DESC.");
        RuleFor(x => x.CategoryId).GreaterThan(0).When(x => x.CategoryId.HasValue);
    }
}

public sealed class CreateCategoryValidator : AbstractValidator<CreateCategoryCommand>
{
    public CreateCategoryValidator(ICategoryRepository repository)
    {
        RuleFor(x => x.Name)
            .NotEmpty()
            .MaximumLength(100)
            .MustAsync(async (name, cancellationToken) => !await repository.NameExistsAsync(name, null, cancellationToken))
            .WithMessage("Category name already exists.");
        RuleFor(x => x.Description).MaximumLength(500);
    }
}

public sealed class UpdateCategoryValidator : AbstractValidator<UpdateCategoryCommand>
{
    public UpdateCategoryValidator(ICategoryRepository repository)
    {
        RuleFor(x => x.Name)
            .NotEmpty()
            .MaximumLength(100)
            .MustAsync(async (command, name, context, cancellationToken) => !await repository.NameExistsAsync(name, GetRouteId(context), cancellationToken))
            .WithMessage("Category name already exists.");
        RuleFor(x => x.Description).MaximumLength(500);
    }

    private static long? GetRouteId(ValidationContext<UpdateCategoryCommand> context) =>
        context.RootContextData.TryGetValue("Id", out var value) && value is long id ? id : null;
}

public sealed class GetCategoriesQueryValidator : AbstractValidator<GetCategoriesQuery>
{
    private static readonly string[] AllowedSortColumns = ["Name", "CreatedAt", "ModifiedAt"];

    public GetCategoriesQueryValidator()
    {
        RuleFor(x => x.PageNumber).GreaterThan(0);
        RuleFor(x => x.PageSize).InclusiveBetween(1, 200);
        RuleFor(x => x.SortBy).Must(x => string.IsNullOrWhiteSpace(x) || AllowedSortColumns.Contains(x)).WithMessage("SortBy is invalid.");
        RuleFor(x => x.SortDirection).Must(x => string.IsNullOrWhiteSpace(x) || string.Equals(x, "ASC", StringComparison.OrdinalIgnoreCase) || string.Equals(x, "DESC", StringComparison.OrdinalIgnoreCase)).WithMessage("SortDirection must be ASC or DESC.");
    }
}

public sealed class CreateUnitValidator : AbstractValidator<CreateUnitCommand>
{
    public CreateUnitValidator(IUnitRepository repository)
    {
        RuleFor(x => x.Name)
            .NotEmpty()
            .MaximumLength(100)
            .MustAsync(async (name, cancellationToken) => !await repository.NameExistsAsync(name, null, cancellationToken))
            .WithMessage("Unit name already exists.");
        RuleFor(x => x.ShortName).NotEmpty().MaximumLength(20);
        RuleFor(x => x.Description).MaximumLength(500);
    }
}

public sealed class UpdateUnitValidator : AbstractValidator<UpdateUnitCommand>
{
    public UpdateUnitValidator(IUnitRepository repository)
    {
        RuleFor(x => x.Name)
            .NotEmpty()
            .MaximumLength(100)
            .MustAsync(async (command, name, context, cancellationToken) => !await repository.NameExistsAsync(name, GetRouteId(context), cancellationToken))
            .WithMessage("Unit name already exists.");
        RuleFor(x => x.ShortName).NotEmpty().MaximumLength(20);
        RuleFor(x => x.Description).MaximumLength(500);
    }

    private static long? GetRouteId(ValidationContext<UpdateUnitCommand> context) =>
        context.RootContextData.TryGetValue("Id", out var value) && value is long id ? id : null;
}

public sealed class GetUnitsQueryValidator : AbstractValidator<GetUnitsQuery>
{
    private static readonly string[] AllowedSortColumns = ["Name", "ShortName", "CreatedAt", "ModifiedAt"];

    public GetUnitsQueryValidator()
    {
        RuleFor(x => x.PageNumber).GreaterThan(0);
        RuleFor(x => x.PageSize).InclusiveBetween(1, 200);
        RuleFor(x => x.SortBy).Must(x => string.IsNullOrWhiteSpace(x) || AllowedSortColumns.Contains(x)).WithMessage("SortBy is invalid.");
        RuleFor(x => x.SortDirection).Must(x => string.IsNullOrWhiteSpace(x) || string.Equals(x, "ASC", StringComparison.OrdinalIgnoreCase) || string.Equals(x, "DESC", StringComparison.OrdinalIgnoreCase)).WithMessage("SortDirection must be ASC or DESC.");
    }
}

internal sealed class ItemCommandValidator<T> : AbstractValidator<T>
{
    public ItemCommandValidator(IItemRepository repository, Func<ValidationContext<T>, long?>? getId)
    {
        RuleFor(x => GetString(x, nameof(CreateItemCommand.Name))).NotEmpty().MaximumLength(200);
        RuleFor(x => GetString(x, nameof(CreateItemCommand.ItemCode)))
            .NotEmpty()
            .MaximumLength(50)
            .MustAsync(async (instance, itemCode, context, cancellationToken) => !await repository.ItemCodeExistsAsync(itemCode!, getId?.Invoke(context), cancellationToken))
            .WithMessage("Item code already exists.");
        RuleFor(x => GetString(x, nameof(CreateItemCommand.Barcode))).MaximumLength(100);
        RuleFor(x => GetLong(x, nameof(CreateItemCommand.CategoryId))).GreaterThan(0);
        RuleFor(x => GetLong(x, nameof(CreateItemCommand.CategoryId)))
            .MustAsync(repository.CategoryExistsAsync)
            .WithMessage("Category was not found.");
        RuleFor(x => GetLong(x, nameof(CreateItemCommand.UnitId))).GreaterThan(0);
        RuleFor(x => GetLong(x, nameof(CreateItemCommand.UnitId)))
            .MustAsync(repository.UnitExistsAsync)
            .WithMessage("Unit was not found.");
        RuleFor(x => GetInt(x, nameof(CreateItemCommand.ItemType))).Must(x => Enum.IsDefined(typeof(ItemType), x)).WithMessage("ItemType is invalid.");
        RuleFor(x => GetDecimal(x, nameof(CreateItemCommand.SalesPrice))).GreaterThanOrEqualTo(0);
        RuleFor(x => GetDecimal(x, nameof(CreateItemCommand.PurchasePrice))).GreaterThanOrEqualTo(0);
        RuleFor(x => GetDecimal(x, nameof(CreateItemCommand.GSTRate))).InclusiveBetween(0, 100);
        RuleFor(x => GetDecimal(x, nameof(CreateItemCommand.MinimumStock))).GreaterThanOrEqualTo(0);
        RuleFor(x => GetDecimal(x, nameof(CreateItemCommand.OpeningStock))).GreaterThanOrEqualTo(0);
        RuleFor(x => GetDecimal(x, nameof(CreateItemCommand.OpeningStockValue))).GreaterThanOrEqualTo(0);
        RuleFor(x => GetDecimal(x, nameof(CreateItemCommand.CurrentStock))).GreaterThanOrEqualTo(0);
        RuleFor(x => GetDecimal(x, nameof(CreateItemCommand.ReservedStock))).GreaterThanOrEqualTo(0);
        RuleFor(x => GetString(x, nameof(CreateItemCommand.HSNCode))).MaximumLength(50);
        RuleFor(x => GetString(x, nameof(CreateItemCommand.Description))).MaximumLength(1000);
        RuleFor(x => GetString(x, nameof(CreateItemCommand.ImageUrl))).MaximumLength(1000);
    }

    private static string? GetString(T instance, string propertyName) => typeof(T).GetProperty(propertyName)?.GetValue(instance) as string;
    private static int GetInt(T instance, string propertyName) => (int)(typeof(T).GetProperty(propertyName)?.GetValue(instance) ?? 0);
    private static long GetLong(T instance, string propertyName) => (long)(typeof(T).GetProperty(propertyName)?.GetValue(instance) ?? 0L);
    private static decimal GetDecimal(T instance, string propertyName) => (decimal)(typeof(T).GetProperty(propertyName)?.GetValue(instance) ?? 0m);
}
