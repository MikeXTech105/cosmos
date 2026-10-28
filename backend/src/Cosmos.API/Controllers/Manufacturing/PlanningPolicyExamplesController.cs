using Cosmos.API.Security;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Application.Manufacturing;
using Cosmos.Application.Services;
using Cosmos.Contracts.Manufacturing;
using Cosmos.Domain.Security;
using Cosmos.Shared.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cosmos.API.Controllers.Manufacturing;
[Authorize, ApiExplorerSettings(GroupName = "manufacturing"), Route("api/v1/planning-policy-examples")]
public sealed class PlanningPolicyExamplesController(DispatchCalculationService dispatch, IProcurementCalculationService procurement) : ApiControllerBase
{
    [HttpPost("dispatch"), RequirePermission(DispatchPlanningPermissions.SkuSettings, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<PlanningPolicyExampleDto>), 200)]
    public IActionResult Dispatch(DispatchPolicyExampleRequest request) => FromResponse(ApiResponse<PlanningPolicyExampleDto>.Success(PlanningPolicyExamples.Dispatch(request, dispatch)));
    [HttpPost("procurement"), RequirePermission(ProcurementPlanningPermissions.Settings, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<PlanningPolicyExampleDto>), 200)]
    public IActionResult Procurement(ProcurementPolicyExampleRequest request) => FromResponse(ApiResponse<PlanningPolicyExampleDto>.Success(PlanningPolicyExamples.Procurement(request, procurement)));
    [HttpPost("routing"), RequirePermission(ManufacturingPermissions.Configuration, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<RoutingPolicyExampleDto>), 200)]
    public IActionResult Routing(RoutingPolicyExampleRequest request) => FromResponse(ApiResponse<RoutingPolicyExampleDto>.Success(PlanningPolicyExamples.Routing(request)));
}
