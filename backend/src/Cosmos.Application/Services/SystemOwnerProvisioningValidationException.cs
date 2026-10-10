namespace Cosmos.Application.Services;

public sealed class SystemOwnerProvisioningValidationException : InvalidOperationException
{
    public SystemOwnerProvisioningValidationException(
        IReadOnlyCollection<SystemOwnerProvisioningValidationError> errors)
        : base(BuildMessage(errors))
    {
        Errors = errors;
    }

    public IReadOnlyCollection<SystemOwnerProvisioningValidationError> Errors { get; }

    private static string BuildMessage(IReadOnlyCollection<SystemOwnerProvisioningValidationError> errors)
    {
        var lines = errors.Select(error => $"- {error.Field}: {error.Message}");
        return $"System Owner provisioning configuration is invalid:{Environment.NewLine}{string.Join(Environment.NewLine, lines)}";
    }
}

public sealed record SystemOwnerProvisioningValidationError(string Field, string Message);
