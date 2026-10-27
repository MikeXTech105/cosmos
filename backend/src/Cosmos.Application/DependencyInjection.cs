using Cosmos.Application.Abstractions.Services;
using Cosmos.Application.Services;
using Cosmos.Application.ShipmentOperations;
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
        services.AddScoped<ISystemOwnerProvisioningService, SystemOwnerProvisioningService>();
        services.AddScoped<IPartyService, PartyService>();
        services.AddScoped<IPartySettingsService, PartySettingsService>();
        services.AddScoped<IItemService, ItemService>();
        services.AddScoped<ICategoryService, CategoryService>();
        services.AddScoped<IUnitService, UnitService>();
        services.AddScoped<IHrService, HrService>();
        services.AddScoped<ISalesCalculationService, SalesCalculationService>();
        services.AddScoped<ISalesService, SalesService>();
        services.AddScoped<ISalesInvoiceScopeAuthorizer, SalesInvoiceScopeAuthorizer>();
        services.AddScoped<ICompanyBranchMasterService, CompanyBranchMasterService>();
        services.AddScoped<IPurchaseExpenseService, PurchaseExpenseService>();
        services.AddScoped<IOeeService, OeeService>();
        services.AddScoped<IReportsService, ReportsService>();
        services.AddScoped<IDashboardService, DashboardService>();
        services.AddScoped<IActivityLogService, ActivityLogService>();
        services.AddScoped<IProcurementCalculationService, ProcurementCalculationService>();
        services.AddScoped<IProcurementPlanningService, ProcurementPlanningService>();
        services.AddScoped<IManufacturingService, ManufacturingService>();
        services.AddScoped<IProductionWorkspaceService, ProductionWorkspaceService>();
        services.AddScoped<IPhysicalInventoryService, PhysicalInventoryService>();
        services.AddScoped<DispatchCalculationService>();
        services.AddScoped<DispatchAllocationService>();
        services.AddScoped<IDispatchPlanningService, DispatchPlanningService>();
        services.AddScoped<IShipmentOperationsService, ShipmentOperationsService>();
        services.AddScoped<IShipmentPackingSuggestionService, ShipmentPackingSuggestionService>();
        services.AddScoped<ShipmentStatusTransitionService>();
        services.AddScoped<ISupplyChainService, SupplyChainService>();
        services.AddScoped<IDataBookService, DataBookService>();
        services.AddScoped<IWebsiteProductService, WebsiteProductService>();
        services.AddScoped<IWebsiteBlogService, WebsiteBlogService>();
        services.AddScoped<IWebsiteAnnouncementService, WebsiteAnnouncementService>();
        services.AddScoped<IWebsiteWarrantyService, WebsiteWarrantyService>();
        services.AddScoped<IWebsiteSettingsService, WebsiteSettingsService>();
        services.AddScoped<IWebsiteDashboardService, WebsiteDashboardService>();
        services.AddScoped<IWebsiteContactService, WebsiteContactService>();
        services.AddScoped<IRojmelWalletService, RojmelWalletService>();
        services.AddScoped<IRojmelTransactionService, RojmelTransactionService>();
        services.AddScoped<IRojmelTransferService, RojmelTransferService>();
        services.AddScoped<IRojmelDashboardService, RojmelDashboardService>();
        services.AddScoped<IRojmelReportService, RojmelReportService>();
        services.AddScoped<IGstRegistrationService, GstRegistrationService>();
        services.AddScoped<IGstVerificationService, GstVerificationService>();
        services.AddScoped<IEWayBillService, EWayBillService>();
        services.AddScoped<IEInvoiceService, EInvoiceService>();
        services.AddScoped<IGstSessionService, GstSessionService>();
        services.AddScoped<IGstApiLogService, GstApiLogService>();
        services.AddScoped<IGstComplianceEligibilityService, GstComplianceEligibilityService>();
        services.AddScoped<IHsnGstService, HsnGstService>();
        services.AddScoped<IGstCalculationEngine, GstCalculationEngine>();
        return services;
    }
}
