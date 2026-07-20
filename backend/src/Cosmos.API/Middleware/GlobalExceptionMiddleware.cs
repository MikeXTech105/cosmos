using System.Net;
using Cosmos.Shared.Exceptions;
using Cosmos.Shared.Responses;

namespace Cosmos.API.Middleware;

public sealed class GlobalExceptionMiddleware
{
    private readonly RequestDelegate _next;

    public GlobalExceptionMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext context, ILogger<GlobalExceptionMiddleware> logger)
    {
        try
        {
            await _next(context);
        }
        catch (CosmosException ex)
        {
            await WriteFailureAsync(context, ex.StatusCode, ex.Message, ex.Errors, ex.FieldErrors, ex.ResponseData);
        }
        catch (BadHttpRequestException ex)
        {
            await WriteFailureAsync(
                context,
                ex.StatusCode,
                ex.Message,
                new[] { ex.Message },
                new Dictionary<string, IReadOnlyCollection<string>>(StringComparer.Ordinal)
                {
                    ["file"] = new[] { ex.Message }
                });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unhandled exception for {Method} {Path}", context.Request.Method, context.Request.Path);
            await WriteFailureAsync(
                context,
                (int)HttpStatusCode.InternalServerError,
                "An unexpected error occurred.",
                new[] { "Contact support with the correlation id." },
                new Dictionary<string, IReadOnlyCollection<string>>(StringComparer.Ordinal)
                {
                    ["_"] = new[] { "Contact support with the correlation id." }
                });
        }
    }

    private static async Task WriteFailureAsync(
        HttpContext context,
        int statusCode,
        string message,
        IEnumerable<string> errors,
        IReadOnlyDictionary<string, IReadOnlyCollection<string>>? fieldErrors = null,
        object? data = null)
    {
        context.Response.StatusCode = statusCode;
        context.Response.ContentType = "application/json";
        var correlationId = context.Items.TryGetValue(CorrelationIdMiddleware.HeaderName, out var value) ? value?.ToString() : null;
        var response = fieldErrors is { Count: > 0 }
            ? ApiResponse.Failure(message, fieldErrors, correlationId, data)
            : ApiResponse.Failure(message, errors, correlationId, data);
        await context.Response.WriteAsJsonAsync(response, context.RequestAborted);
    }
}
