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
        services.AddScoped<IPartyService, PartyService>();
        services.AddScoped<IPartySettingsService, PartySettingsService>();
        services.AddScoped<IItemService, ItemService>();
        services.AddScoped<ICategoryService, CategoryService>();
        services.AddScoped<IUnitService, UnitService>();
        services.AddScoped<IHrService, HrService>();
        services.AddScoped<ISalesCalculationService, SalesCalculationService>();
        services.AddScoped<ISalesService, SalesService>();
        return services;
    }
}
