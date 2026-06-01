namespace Cosmos.Shared.Exceptions;

public class CosmosException : Exception
{
    public CosmosException(string message, int statusCode = 400, IEnumerable<string>? errors = null) : base(message)
    {
        StatusCode = statusCode;
        Errors = errors?.ToArray() ?? Array.Empty<string>();
    }

    public int StatusCode { get; }
    public IReadOnlyCollection<string> Errors { get; }
}

public sealed class NotFoundException : CosmosException
{
    public NotFoundException(string message) : base(message, 404)
    {
    }
}

public sealed class UnauthorizedCosmosException : CosmosException
{
    public UnauthorizedCosmosException(string message = "Unauthorized") : base(message, 401)
    {
    }
}

public sealed class ForbiddenCosmosException : CosmosException
{
    public ForbiddenCosmosException(string message = "Forbidden") : base(message, 403)
    {
    }
}
