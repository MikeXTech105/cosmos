namespace Cosmos.Shared.Exceptions;

public class CosmosException : Exception
{
    public CosmosException(
        string message,
        int statusCode = 400,
        IEnumerable<string>? errors = null,
        IReadOnlyDictionary<string, IReadOnlyCollection<string>>? fieldErrors = null,
        object? data = null) : base(message)
    {
        StatusCode = statusCode;
        Errors = errors?.ToArray() ?? Array.Empty<string>();
        FieldErrors = fieldErrors ?? (statusCode == 409
            ? new Dictionary<string, IReadOnlyCollection<string>>(StringComparer.Ordinal)
            {
                ["_"] = Errors
            }
            : null);
        ResponseData = data ?? (statusCode == 409 ? new { conflictCode = "CONFLICT" } : null);
    }

    public int StatusCode { get; }
    public IReadOnlyCollection<string> Errors { get; }
    public IReadOnlyDictionary<string, IReadOnlyCollection<string>>? FieldErrors { get; }
    public object? ResponseData { get; }
}

public sealed class ConflictException : CosmosException
{
    public ConflictException(
        string message,
        IReadOnlyDictionary<string, IReadOnlyCollection<string>>? fieldErrors = null,
        object? data = null) : base(message, 409, null, fieldErrors, data)
    {
    }
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
