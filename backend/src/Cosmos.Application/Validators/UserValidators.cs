using Cosmos.Contracts.Users;
using FluentValidation;

namespace Cosmos.Application.Validators;

public sealed class CreateUserRequestValidator : AbstractValidator<CreateUserRequest>
{
    public CreateUserRequestValidator()
    {
        RuleFor(x => x.Username).NotEmpty().MaximumLength(100).Matches("^[a-zA-Z0-9._-]+$");
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(256);
        RuleFor(x => x.FullName).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Password).SetValidator(new PasswordPolicyValidator());
    }
}

public sealed class UpdateUserRequestValidator : AbstractValidator<UpdateUserRequest>
{
    public UpdateUserRequestValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(256);
        RuleFor(x => x.FullName).NotEmpty().MaximumLength(200);
    }
}

public sealed class AssignUserRolesRequestValidator : AbstractValidator<AssignUserRolesRequest>
{
    public AssignUserRolesRequestValidator()
    {
        RuleFor(x => x.RoleIds).NotEmpty();
        RuleForEach(x => x.RoleIds).GreaterThan(0);
    }
}
