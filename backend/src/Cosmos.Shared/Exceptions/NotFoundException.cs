namespace Cosmos.Shared.Exceptions;

public sealed class NotFoundException : ApiException
{
    public NotFoundException(string resourceName, object key)
        : base($"{resourceName} '{key}' was not found.", 404)
    {
    }
}
