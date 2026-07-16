using System.Text.Json;
using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Contracts.Audit;
using Cosmos.Shared.Exceptions;

namespace Cosmos.API.Middleware;

public sealed class AuditMiddleware
{
    private readonly RequestDelegate _next;

    public AuditMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext context, ILogger<AuditMiddleware> logger, IAuditRepository auditRepository)
    {
        Exception? failure = null;
        try
        {
            await _next(context);
        }
        catch (Exception exception)
        {
            failure = exception;
            throw;
        }
        finally
        {
            if (IsAuditable(context.Request.Method))
            {
                var statusCode = failure is CosmosException cosmosException
                    ? cosmosException.StatusCode
                    : failure is null
                        ? context.Response.StatusCode
                        : StatusCodes.Status500InternalServerError;

                logger.LogInformation(
                    "Auditable request {Method} {Path} completed with {StatusCode}",
                    context.Request.Method,
                    context.Request.Path,
                    statusCode);

                await TryPersistAuditAsync(context, auditRepository, logger, statusCode, failure is not null);
            }
        }
    }

    private static bool IsAuditable(string method) =>
        HttpMethods.IsPost(method) ||
        HttpMethods.IsPut(method) ||
        HttpMethods.IsPatch(method) ||
        HttpMethods.IsDelete(method);

    private static async Task TryPersistAuditAsync(
        HttpContext context,
        IAuditRepository auditRepository,
        ILogger logger,
        int statusCode,
        bool threwException)
    {
        try
        {
            var userId = int.TryParse(context.User.FindFirst("UserId")?.Value, out var parsedUserId)
                ? parsedUserId
                : (int?)null;
            var path = context.Request.Path.Value ?? "/";
            var recordId = path.Length <= 100 ? path : path[..100];
            var rejected = threwException || statusCode >= StatusCodes.Status400BadRequest;
            var reason = rejected && statusCode == StatusCodes.Status404NotFound && IsProtectedAdministrationPath(path)
                ? "Protected or inaccessible target."
                : rejected
                    ? "Request rejected by the API."
                    : null;
            var safeMetadata = JsonSerializer.Serialize(new
            {
                Method = context.Request.Method,
                Path = path,
                StatusCode = statusCode,
                Reason = reason
            });

            await auditRepository.AddAsync(
                new AuditEntryRequest(
                    "HttpRequests",
                    recordId,
                    rejected ? "RejectedRequest" : "Request",
                    null,
                    safeMetadata,
                    userId),
                CancellationToken.None);
        }
        catch (Exception auditException)
        {
            logger.LogError(auditException, "Unable to persist HTTP audit metadata.");
        }
    }

    private static bool IsProtectedAdministrationPath(string path) =>
        path.StartsWith("/api/users/", StringComparison.OrdinalIgnoreCase) ||
        path.StartsWith("/api/roles/", StringComparison.OrdinalIgnoreCase) ||
        path.StartsWith("/api/permissions/role/", StringComparison.OrdinalIgnoreCase);
}
