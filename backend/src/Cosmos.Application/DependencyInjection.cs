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
        services.AddScoped<IPurchaseExpenseService, PurchaseExpenseService>();
        services.AddScoped<IOeeService, OeeService>();
        services.AddScoped<IReportsService, ReportsService>();
        services.AddScoped<IDashboardService, DashboardService>();
        services.AddScoped<IProcurementCalculationService, ProcurementCalculationService>();
        services.AddScoped<IProcurementPlanningService, ProcurementPlanningService>();
        services.AddScoped<IGstRegistrationService, GstRegistrationService>();
        services.AddScoped<IGstVerificationService, GstVerificationService>();
        services.AddScoped<IEWayBillService, EWayBillService>();
        services.AddScoped<IEInvoiceService, EInvoiceService>();
        services.AddScoped<IGstSessionService, GstSessionService>();
        services.AddScoped<IGstApiLogService, GstApiLogService>();
        return services;
    }
}
