using System.Net;
using Cosmos.Shared.Exceptions;
using Cosmos.Shared.Responses;
using Cosmos.API.WebsiteManagement;

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
            if (ex.StatusCode == StatusCodes.Status400BadRequest && ex.FieldErrors is { Count: > 0 })
            {
                logger.LogWarning(
                    "Validation failed for {Method} {Path}. Fields: {Fields}. Errors: {Errors}",
                    context.Request.Method,
                    context.Request.Path,
                    string.Join(",", ex.FieldErrors.Keys),
                    string.Join(" | ", ex.Errors));
            }

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
        if (PublicWebsiteResponse.IsPublicWebsiteRequest(context))
        {
            var code = statusCode switch
            {
                StatusCodes.Status400BadRequest => "VALIDATION_FAILED",
                StatusCodes.Status401Unauthorized => "UNAUTHORIZED",
                StatusCodes.Status403Forbidden => "FORBIDDEN",
                StatusCodes.Status404NotFound => "NOT_FOUND",
                StatusCodes.Status409Conflict => "CONFLICT",
                StatusCodes.Status429TooManyRequests => "RATE_LIMITED",
                _ => "INTERNAL_ERROR"
            };
            await context.Response.WriteAsJsonAsync(PublicWebsiteResponse.Error(message, code, fieldErrors, correlationId), context.RequestAborted);
            return;
        }

        var response = fieldErrors is { Count: > 0 }
            ? ApiResponse.Failure(message, fieldErrors, correlationId, data)
            : ApiResponse.Failure(message, errors, correlationId, data);
        await context.Response.WriteAsJsonAsync(response, context.RequestAborted);
    }
}
