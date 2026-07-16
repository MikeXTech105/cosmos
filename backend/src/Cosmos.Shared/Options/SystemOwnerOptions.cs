namespace Cosmos.Shared.Options;

public sealed class SystemOwnerOptions
{
    public const string UsernameEnvironmentVariable = "COSMOS_SYSTEM_OWNER_USERNAME";
    public const string EmailEnvironmentVariable = "COSMOS_SYSTEM_OWNER_EMAIL";
    public const string PasswordEnvironmentVariable = "COSMOS_SYSTEM_OWNER_PASSWORD";

    public string? Username { get; set; }
    public string? Email { get; set; }
    public string? Password { get; set; }

    public bool HasAllRequiredValues =>
        !string.IsNullOrWhiteSpace(Username) &&
        !string.IsNullOrWhiteSpace(Email) &&
        !string.IsNullOrWhiteSpace(Password);
}
