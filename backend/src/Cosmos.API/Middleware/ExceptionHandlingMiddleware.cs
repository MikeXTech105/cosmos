using System.Net;
using Cosmos.Shared.Exceptions;
using Cosmos.Shared.Models;
using FluentValidation;

namespace Cosmos.API.Middleware;

public sealed class ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (ValidationException ex)
        {
            await WriteResponseAsync(context, StatusCodes.Status400BadRequest, "Validation failed.", ex.Errors.Select(x => x.ErrorMessage));
        }
        catch (ApiException ex)
        {
            await WriteResponseAsync(context, ex.StatusCode, ex.Message, ex.Errors);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unhandled exception while processing {Method} {Path}", context.Request.Method, context.Request.Path);
            await WriteResponseAsync(context, (int)HttpStatusCode.InternalServerError, "An unexpected error occurred.", new[] { "Internal server error" });
        }
    }

    private static async Task WriteResponseAsync(HttpContext context, int statusCode, string message, IEnumerable<string> errors)
    {
        context.Response.StatusCode = statusCode;
        context.Response.ContentType = "application/json";
        await context.Response.WriteAsJsonAsync(ApiResponse<object>.Fail(message, errors));
    }
}
