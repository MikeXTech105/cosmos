namespace Cosmos.Shared.Exceptions;

public sealed class ForbiddenException : ApiException
{
    public ForbiddenException(string message = "You do not have permission to perform this operation")
        : base(message, 403)
    {
    }
}
