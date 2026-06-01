using Cosmos.Application.Abstractions.Services;
using Cosmos.Application.Services;
using FluentValidation;
using Microsoft.Extensions.DependencyInjection;

namespace Cosmos.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddValidatorsFromAssembly(typeof(DependencyInjection).Assembly);
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IUserService, UserService>();
        services.AddScoped<IRoleService, RoleService>();
        services.AddScoped<IPageService, PageService>();
        services.AddScoped<IPermissionService, PermissionService>();
        return services;
    }
}
