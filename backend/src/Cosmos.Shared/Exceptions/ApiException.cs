namespace Cosmos.Shared.Exceptions;

/// <summary>
/// Base exception for expected API failures.
/// </summary>
public class ApiException : Exception
{
    public ApiException(string message, int statusCode = 400, IEnumerable<string>? errors = null)
        : base(message)
    {
        StatusCode = statusCode;
        Errors = errors?.ToArray() ?? Array.Empty<string>();
    }

    public int StatusCode { get; }
    public IReadOnlyCollection<string> Errors { get; }
}
