using Cosmos.Application.Validators;
using FluentValidation;
using Microsoft.Extensions.DependencyInjection;

namespace Cosmos.Application;

/// <summary>
/// Registers application-layer services.
/// </summary>
public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddValidatorsFromAssemblyContaining<LoginRequestValidator>();
        return services;
    }
}
