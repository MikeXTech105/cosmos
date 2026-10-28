using Cosmos.API.Security;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Application.Organization;
using Cosmos.Domain.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
namespace Cosmos.API.Controllers;
[Authorize,ApiExplorerSettings(GroupName="masters")]
[Route("api/v1/organization/scope-assignments")]
public sealed class CompanyBranchScopeAssignmentsController(ICompanyBranchScopeAdministrationService service):ApiControllerBase
{
 [HttpGet("me")][RequirePermission("System.CompanyBranchScope",PermissionAction.View)] public async Task<IActionResult> Mine(CancellationToken ct)=>FromResponse(await service.GetMyEffectiveScopeAsync(ct));
 [HttpGet("users/{userId:int}")][RequirePermission("System.CompanyBranchScopeAssignments",PermissionAction.View)] public async Task<IActionResult> GetUserAssignments(int userId,CancellationToken ct)=>FromResponse(await service.GetUserAssignmentsAsync(userId,ct));
 [HttpPost][RequirePermission("System.CompanyBranchScopeAssignments",PermissionAction.Create)] public async Task<IActionResult> Grant(GrantCompanyBranchScopeRequest request,CancellationToken ct)=>FromResponse(await service.GrantAsync(request,ct),201);
 [HttpDelete("{assignmentId:long}")][RequirePermission("System.CompanyBranchScopeAssignments",PermissionAction.Edit)] public async Task<IActionResult> Revoke(long assignmentId,CancellationToken ct){await service.RevokeAsync(assignmentId,ct);return NoContent();}
}
