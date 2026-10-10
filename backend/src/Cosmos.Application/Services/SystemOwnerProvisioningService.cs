using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Application.Abstractions.Security;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Contracts.Users;
using Cosmos.Shared.Options;
using FluentValidation;
using FluentValidation.Results;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Cosmos.Application.Services;

public sealed class SystemOwnerProvisioningService : ISystemOwnerProvisioningService
{
    private readonly ISystemOwnerRepository _repository;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IValidator<CreateUserRequest> _userValidator;
    private readonly SystemOwnerOptions _options;
    private readonly ILogger<SystemOwnerProvisioningService> _logger;

    public SystemOwnerProvisioningService(
        ISystemOwnerRepository repository,
        IPasswordHasher passwordHasher,
        IValidator<CreateUserRequest> userValidator,
        IOptions<SystemOwnerOptions> options,
        ILogger<SystemOwnerProvisioningService> logger)
    {
        _repository = repository;
        _passwordHasher = passwordHasher;
        _userValidator = userValidator;
        _options = options.Value;
        _logger = logger;
    }

    public async Task EnsureProvisionedAsync(CancellationToken cancellationToken)
    {
        var state = await _repository.GetProvisioningStateAsync(cancellationToken);
        if (state.IsProvisioned)
        {
            _logger.LogInformation("Protected System Owner is already provisioned.");
            return;
        }

        if (!state.IsEmpty)
        {
            throw new InvalidOperationException(
                "Conflicting protected System Owner records were detected. Resolve the flagged user, role, link, or role-permission conflict before starting Cosmos.");
        }

        var username = _options.Username?.Trim() ?? string.Empty;
        var email = _options.Email?.Trim() ?? string.Empty;
        var password = _options.Password ?? string.Empty;
        var validationRequest = new CreateUserRequest(username, email, "System Owner", password, true);
        await ValidateProvisioningConfigurationAsync(validationRequest, cancellationToken);

        var passwordHash = _passwordHasher.Hash(password);
        var result = await _repository.ProvisionAsync(username, email, passwordHash, cancellationToken);

        _logger.LogInformation(
            "Protected System Owner provisioning completed. CreatedNewRecords: {CreatedNewRecords}",
            result.Created);
    }

    private async Task ValidateProvisioningConfigurationAsync(
        CreateUserRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _userValidator.ValidateAsync(request, cancellationToken);
        if (result.IsValid)
        {
            return;
        }

        var errors = result.Errors
            .Select(ToSafeProvisioningError)
            .Distinct()
            .ToArray();

        throw new SystemOwnerProvisioningValidationException(errors);
    }

    private static SystemOwnerProvisioningValidationError ToSafeProvisioningError(ValidationFailure failure)
    {
        var field = failure.PropertyName.Split('.', 2)[0] switch
        {
            nameof(CreateUserRequest.Username) => "Username",
            nameof(CreateUserRequest.Email) => "Email",
            nameof(CreateUserRequest.Password) => "Password",
            _ => "Configuration"
        };

        return new SystemOwnerProvisioningValidationError(field, GetSafeValidationMessage(field, failure));
    }

    private static string GetSafeValidationMessage(string field, ValidationFailure failure) =>
        (field, failure.ErrorCode) switch
        {
            ("Username", "NotEmptyValidator") => "username is required",
            ("Username", "MaximumLengthValidator") => "username must be 100 characters or fewer",
            ("Username", "RegularExpressionValidator") => "username may contain only letters, numbers, periods, underscores, and hyphens",
            ("Email", "NotEmptyValidator") => "email is required",
            ("Email", "MaximumLengthValidator") => "email must be 256 characters or fewer",
            ("Email", _) => "invalid email format",
            ("Password", "NotEmptyValidator") => "password is required",
            ("Password", "MinimumLengthValidator") => "password must be at least 8 characters",
            ("Password", "MaximumLengthValidator") => "password must be 128 characters or fewer",
            ("Password", "RegularExpressionValidator") when failure.ErrorMessage.Contains("uppercase", StringComparison.OrdinalIgnoreCase) =>
                "password must contain an uppercase letter",
            ("Password", "RegularExpressionValidator") when failure.ErrorMessage.Contains("lowercase", StringComparison.OrdinalIgnoreCase) =>
                "password must contain a lowercase letter",
            ("Password", "RegularExpressionValidator") when failure.ErrorMessage.Contains("number", StringComparison.OrdinalIgnoreCase) =>
                "password must contain a number",
            ("Password", "RegularExpressionValidator") when failure.ErrorMessage.Contains("special", StringComparison.OrdinalIgnoreCase) =>
                "password must contain a special character",
            ("Password", _) => "password does not meet the required complexity policy",
            _ => "configuration value is invalid"
        };
}
