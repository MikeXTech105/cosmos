using Cosmos.Application.Organization;
using FluentValidation;

namespace Cosmos.Application.Validators;

public sealed class SaveCompanyRequestValidator : AbstractValidator<SaveCompanyRequest>
{
    public SaveCompanyRequestValidator()
    {
        RuleFor(x => x.Code).NotEmpty().Must(value => !string.IsNullOrWhiteSpace(value)).MaximumLength(50);
        RuleFor(x => x.Name).NotEmpty().Must(value => !string.IsNullOrWhiteSpace(value)).MaximumLength(250);
    }
}

public sealed class SaveBranchRequestValidator : AbstractValidator<SaveBranchRequest>
{
    public SaveBranchRequestValidator()
    {
        RuleFor(x => x.CompanyId).GreaterThan(0);
        RuleFor(x => x.Code).NotEmpty().Must(value => !string.IsNullOrWhiteSpace(value)).MaximumLength(50);
        RuleFor(x => x.Name).NotEmpty().Must(value => !string.IsNullOrWhiteSpace(value)).MaximumLength(250);
    }
}
