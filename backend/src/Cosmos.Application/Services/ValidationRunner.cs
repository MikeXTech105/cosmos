using Cosmos.Shared.Exceptions;
using FluentValidation;

namespace Cosmos.Application.Services;

internal static class ValidationRunner
{
    public static async Task ValidateAsync<T>(IValidator<T> validator, T request, CancellationToken cancellationToken)
    {
        var result = await validator.ValidateAsync(request, cancellationToken);
        if (!result.IsValid)
        {
            throw new CosmosException("Validation failed.", 400, result.Errors.Select(x => x.ErrorMessage));
        }
    }
}
