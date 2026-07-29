using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Persistence.Connection;
using Cosmos.Persistence.Dapper;
using Cosmos.Persistence.Repositories;
using Cosmos.Persistence.UnitOfWork;
using Dapper;
using Microsoft.Extensions.DependencyInjection;

namespace Cosmos.Persistence;

public static class DependencyInjection
{
    public static IServiceCollection AddPersistence(this IServiceCollection services)
    {
        SqlMapper.AddTypeHandler(new DateOnlyTypeHandler());
        SqlMapper.AddTypeHandler(new NullableDateOnlyTypeHandler());
        SqlMapper.AddTypeHandler(new TimeOnlyTypeHandler());
        SqlMapper.AddTypeHandler(new NullableTimeOnlyTypeHandler());

        services.AddScoped<ISqlConnectionFactory, SqlConnectionFactory>();
        services.AddScoped<IUnitOfWork, UnitOfWork.UnitOfWork>();
        services.AddScoped<IAuthRepository, AuthRepository>();
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IRoleRepository, RoleRepository>();
        services.AddScoped<IPageRepository, PageRepository>();
        services.AddScoped<IPermissionRepository, PermissionRepository>();
        services.AddScoped<IAuditRepository, AuditRepository>();
        services.AddScoped<ISystemOwnerRepository, SystemOwnerRepository>();
        services.AddScoped<IPartyRepository, PartyRepository>();
        services.AddScoped<IPartySettingsRepository, PartySettingsRepository>();
        services.AddScoped<IItemRepository, ItemRepository>();
        services.AddScoped<ICategoryRepository, CategoryRepository>();
        services.AddScoped<IUnitRepository, UnitRepository>();
        services.AddScoped<IHrRepository, HrRepository>();
        services.AddScoped<ISalesRepository, SalesRepository>();
        services.AddScoped<IPurchaseExpenseRepository, PurchaseExpenseRepository>();
        services.AddScoped<IOeeRepository, OeeRepository>();
        services.AddScoped<IReportsRepository, ReportsRepository>();
        services.AddScoped<IDashboardRepository, DashboardRepository>();
        services.AddScoped<IProcurementPlanningRepository, ProcurementPlanningRepository>();
        services.AddScoped<IDispatchPlanningRepository, DispatchPlanningRepository>();
        services.AddScoped<IShipmentOperationsRepository, ShipmentOperationsRepository>();
        services.AddScoped<ISupplyChainRepository, SupplyChainRepository>();
        services.AddScoped<IRojmelRepository, RojmelRepository>();
        services.AddScoped<IGstRepository, GstRepository>();
        return services;
    }
}
