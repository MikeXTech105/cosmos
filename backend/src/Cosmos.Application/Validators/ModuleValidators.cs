using Cosmos.Application.DTOs.Navigation;
using Cosmos.Application.DTOs.Permissions;
using Cosmos.Application.DTOs.Roles;
using Cosmos.Application.DTOs.Users;
using FluentValidation;

namespace Cosmos.Application.Validators;

public sealed class CreateRoleRequestValidator : AbstractValidator<CreateRoleRequest>
{
    public CreateRoleRequestValidator()
    {
        RuleFor(x => x.RoleName).NotEmpty().MaximumLength(100).Matches("^[A-Z0-9_]+$");
        RuleFor(x => x.Description).MaximumLength(500);
    }
}

public sealed class UpdateRoleRequestValidator : AbstractValidator<UpdateRoleRequest>
{
    public UpdateRoleRequestValidator()
    {
        RuleFor(x => x.RoleName).NotEmpty().MaximumLength(100).Matches("^[A-Z0-9_]+$");
        RuleFor(x => x.Description).MaximumLength(500);
    }
}

public sealed class CreateUserRequestValidator : AbstractValidator<CreateUserRequest>
{
    public CreateUserRequestValidator()
    {
        RuleFor(x => x.FirstName).NotEmpty().MaximumLength(100);
        RuleFor(x => x.LastName).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(256);
        RuleFor(x => x.Password).NotEmpty().MinimumLength(8).MaximumLength(128);
        RuleFor(x => x.RoleId).NotEmpty();
    }
}

public sealed class UpdateUserRequestValidator : AbstractValidator<UpdateUserRequest>
{
    public UpdateUserRequestValidator()
    {
        RuleFor(x => x.FirstName).NotEmpty().MaximumLength(100);
        RuleFor(x => x.LastName).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(256);
        RuleFor(x => x.RoleId).NotEmpty();
    }
}

public sealed class CreatePageRequestValidator : AbstractValidator<CreatePageRequest>
{
    public CreatePageRequestValidator()
    {
        RuleFor(x => x.PageName).NotEmpty().MaximumLength(150);
        RuleFor(x => x.RoutePath).NotEmpty().MaximumLength(300).Must(x => x.StartsWith('/'));
        RuleFor(x => x.Icon).MaximumLength(100);
        RuleFor(x => x.MenuGroup).MaximumLength(100);
    }
}

public sealed class UpdatePageRequestValidator : AbstractValidator<UpdatePageRequest>
{
    public UpdatePageRequestValidator()
    {
        RuleFor(x => x.PageName).NotEmpty().MaximumLength(150);
        RuleFor(x => x.RoutePath).NotEmpty().MaximumLength(300).Must(x => x.StartsWith('/'));
        RuleFor(x => x.Icon).MaximumLength(100);
        RuleFor(x => x.MenuGroup).MaximumLength(100);
    }
}

public sealed class CreateSectionRequestValidator : AbstractValidator<CreateSectionRequest>
{
    public CreateSectionRequestValidator()
    {
        RuleFor(x => x.PageId).NotEmpty();
        RuleFor(x => x.SectionName).NotEmpty().MaximumLength(150);
        RuleFor(x => x.SectionKey).NotEmpty().MaximumLength(150).Matches("^[A-Z0-9_]+$");
    }
}

public sealed class UpdateSectionRequestValidator : AbstractValidator<UpdateSectionRequest>
{
    public UpdateSectionRequestValidator()
    {
        RuleFor(x => x.PageId).NotEmpty();
        RuleFor(x => x.SectionName).NotEmpty().MaximumLength(150);
        RuleFor(x => x.SectionKey).NotEmpty().MaximumLength(150).Matches("^[A-Z0-9_]+$");
    }
}

public sealed class CreateFieldRequestValidator : AbstractValidator<CreateFieldRequest>
{
    public CreateFieldRequestValidator()
    {
        RuleFor(x => x.SectionId).NotEmpty();
        RuleFor(x => x.FieldName).NotEmpty().MaximumLength(150);
        RuleFor(x => x.FieldKey).NotEmpty().MaximumLength(150).Matches("^[A-Z0-9_]+$");
        RuleFor(x => x.FieldType).NotEmpty().MaximumLength(50);
    }
}

public sealed class UpdateFieldRequestValidator : AbstractValidator<UpdateFieldRequest>
{
    public UpdateFieldRequestValidator()
    {
        RuleFor(x => x.SectionId).NotEmpty();
        RuleFor(x => x.FieldName).NotEmpty().MaximumLength(150);
        RuleFor(x => x.FieldKey).NotEmpty().MaximumLength(150).Matches("^[A-Z0-9_]+$");
        RuleFor(x => x.FieldType).NotEmpty().MaximumLength(50);
    }
}

public sealed class UpsertRolePermissionRequestValidator : AbstractValidator<UpsertRolePermissionRequest>
{
    public UpsertRolePermissionRequestValidator()
    {
        RuleFor(x => x.RoleId).NotEmpty();
        RuleFor(x => x).Must(x => x.PageId.HasValue || x.SectionId.HasValue || x.FieldId.HasValue)
            .WithMessage("At least one permission target is required.");
    }
}
