using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Application.Abstractions.Security;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Contracts.Users;
using Cosmos.Shared.Options;
using FluentValidation;
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

        if (!_options.HasAllRequiredValues)
        {
            throw new InvalidOperationException(
                $"No protected System Owner exists. Set {SystemOwnerOptions.UsernameEnvironmentVariable}, " +
                $"{SystemOwnerOptions.EmailEnvironmentVariable}, and {SystemOwnerOptions.PasswordEnvironmentVariable} before starting Cosmos.");
        }

        var username = _options.Username!.Trim();
        var email = _options.Email!.Trim();
        var password = _options.Password!;
        var validationRequest = new CreateUserRequest(username, email, "System Owner", password, true);
        await ValidationRunner.ValidateAsync(_userValidator, validationRequest, cancellationToken);

        var passwordHash = _passwordHasher.Hash(password);
        var result = await _repository.ProvisionAsync(username, email, passwordHash, cancellationToken);

        _logger.LogInformation(
            "Protected System Owner provisioning completed. CreatedNewRecords: {CreatedNewRecords}",
            result.Created);
    }
}
