using Cosmos.Contracts.Pages;
using FluentValidation;

namespace Cosmos.Application.Validators;

public sealed class CreatePageRequestValidator : AbstractValidator<CreatePageRequest>
{
    public CreatePageRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100).Matches("^[a-zA-Z0-9._-]+$");
        RuleFor(x => x.DisplayName).NotEmpty().MaximumLength(150);
        RuleFor(x => x.Route).NotEmpty().MaximumLength(300);
        RuleFor(x => x.Icon).MaximumLength(100);
        RuleFor(x => x.SortOrder).GreaterThanOrEqualTo(0);
    }
}

public sealed class UpdatePageRequestValidator : AbstractValidator<UpdatePageRequest>
{
    public UpdatePageRequestValidator()
    {
        RuleFor(x => x.DisplayName).NotEmpty().MaximumLength(150);
        RuleFor(x => x.Route).NotEmpty().MaximumLength(300);
        RuleFor(x => x.Icon).MaximumLength(100);
        RuleFor(x => x.SortOrder).GreaterThanOrEqualTo(0);
    }
}
