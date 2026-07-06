using Cosmos.Shared.Exceptions;
using FluentValidation;

namespace Cosmos.Application.Services;

internal static class ValidationRunner
{
    public static async Task ValidateAsync<T>(IValidator<T> validator, T request, CancellationToken cancellationToken)
    {
        await ValidateAsync(validator, request, null, cancellationToken);
    }

    public static async Task ValidateAsync<T>(IValidator<T> validator, T request, Action<ValidationContext<T>>? configureContext, CancellationToken cancellationToken)
    {
        var context = new ValidationContext<T>(request);
        configureContext?.Invoke(context);
        var result = await validator.ValidateAsync(context, cancellationToken);
        if (!result.IsValid)
        {
            throw new CosmosException("Validation failed.", 400, result.Errors.Select(x => x.ErrorMessage));
        }
    }
}
