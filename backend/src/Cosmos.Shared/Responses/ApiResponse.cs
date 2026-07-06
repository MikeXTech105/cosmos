namespace Cosmos.Shared.Responses;

public sealed record ApiResponse<T>(
    bool Succeeded,
    string Message,
    T? Data,
    IReadOnlyCollection<string> Errors,
    string? CorrelationId = null)
{
    public static ApiResponse<T> Success(T? data, string message = "Success", string? correlationId = null) =>
        new(true, message, data, Array.Empty<string>(), correlationId);

    public static ApiResponse<T> Failure(string message, IEnumerable<string>? errors = null, string? correlationId = null) =>
        new(false, message, default, errors?.ToArray() ?? Array.Empty<string>(), correlationId);
}

public sealed record ApiResponse(bool Succeeded, string Message, IReadOnlyCollection<string> Errors, string? CorrelationId = null)
{
    public static ApiResponse Success(string message = "Success", string? correlationId = null) =>
        new(true, message, Array.Empty<string>(), correlationId);

    public static ApiResponse Failure(string message, IEnumerable<string>? errors = null, string? correlationId = null) =>
        new(false, message, errors?.ToArray() ?? Array.Empty<string>(), correlationId);
}
