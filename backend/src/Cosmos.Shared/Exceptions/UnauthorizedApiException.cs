namespace Cosmos.Shared.Exceptions;

public sealed class UnauthorizedApiException : ApiException
{
    public UnauthorizedApiException(string message = "Authentication failed")
        : base(message, 401)
    {
    }
}
