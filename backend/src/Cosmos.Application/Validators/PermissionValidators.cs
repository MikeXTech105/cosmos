using Cosmos.Contracts.Permissions;
using FluentValidation;

namespace Cosmos.Application.Validators;

public sealed class SaveRolePermissionsRequestValidator : AbstractValidator<SaveRolePermissionsRequest>
{
    public SaveRolePermissionsRequestValidator()
    {
        RuleFor(x => x.Permissions).NotNull();
        RuleForEach(x => x.Permissions).SetValidator(new PermissionUpsertDtoValidator());
    }
}

public sealed class PermissionUpsertDtoValidator : AbstractValidator<PermissionUpsertDto>
{
    public PermissionUpsertDtoValidator() => RuleFor(x => x.PageId).GreaterThan(0);
}
