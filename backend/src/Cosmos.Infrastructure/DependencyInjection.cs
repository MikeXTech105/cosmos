using Cosmos.Application.Abstractions.Repositories;
using Cosmos.Application.Abstractions.Security;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Infrastructure.Configuration;
using Cosmos.Infrastructure.Database;
using Cosmos.Infrastructure.Repositories;
using Cosmos.Infrastructure.Security;
using Cosmos.Infrastructure.Services;
using Dapper;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Cosmos.Infrastructure;

/// <summary>
/// Registers infrastructure-layer dependencies.
/// </summary>
public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        DefaultTypeMap.MatchNamesWithUnderscores = true;

        services.Configure<JwtOptions>(configuration.GetSection(JwtOptions.SectionName));
        services.AddSingleton<IDbConnectionFactory, NpgsqlConnectionFactory>();
        services.AddSingleton<IPasswordHasher, PasswordHasher>();
        services.AddSingleton<IJwtTokenService, JwtTokenService>();

        services.AddScoped<IAuthRepository, AuthRepository>();
        services.AddScoped<IRoleRepository, RoleRepository>();
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IPageRepository, PageRepository>();
        services.AddScoped<ISectionRepository, SectionRepository>();
        services.AddScoped<IFieldRepository, FieldRepository>();
        services.AddScoped<IPermissionRepository, PermissionRepository>();

        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IRoleService, RoleService>();
        services.AddScoped<IUserService, UserService>();
        services.AddScoped<IPageService, PageService>();
        services.AddScoped<ISectionService, SectionService>();
        services.AddScoped<IFieldService, FieldService>();
        services.AddScoped<IPermissionService, PermissionService>();

        return services;
    }
}
