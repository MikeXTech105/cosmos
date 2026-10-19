using Cosmos.API.Security;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Contracts.HsnGst;
using Cosmos.Domain.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
namespace Cosmos.API.Controllers;
[Authorize, ApiExplorerSettings(GroupName = "gst"), Route("api/v1/gst")]
public sealed class HsnGstController(IHsnGstService service) : ApiControllerBase
{
    [HttpGet("hsn-sac"), RequirePermission("GST.HsnSac",PermissionAction.View)] public async Task<IActionResult> ListHsn([FromQuery]HsnSacListQuery q,CancellationToken ct)=>FromResponse(await service.GetHsnSacsAsync(q,ct));
    [HttpGet("hsn-sac/{id:long}"), RequirePermission("GST.HsnSac",PermissionAction.View)] public async Task<IActionResult> GetHsn(long id,CancellationToken ct)=>FromResponse(await service.GetHsnSacAsync(id,ct));
    [HttpPost("hsn-sac"), RequirePermission("GST.HsnSac",PermissionAction.Create)] public async Task<IActionResult> CreateHsn(SaveHsnSacRequest r,CancellationToken ct)=>FromResponse(await service.SaveHsnSacAsync(null,r,ct),201);
    [HttpPut("hsn-sac/{id:long}"), RequirePermission("GST.HsnSac",PermissionAction.Edit)] public async Task<IActionResult> UpdateHsn(long id,SaveHsnSacRequest r,CancellationToken ct)=>FromResponse(await service.SaveHsnSacAsync(id,r,ct));
    [HttpGet("rate-versions"), RequirePermission("GST.RateHistory",PermissionAction.View)] public async Task<IActionResult> ListRates([FromQuery]GstRateRuleVersionListQuery q,CancellationToken ct)=>FromResponse(await service.GetRateVersionsAsync(q,ct));
    [HttpPost("rate-versions"), RequirePermission("GST.RateHistory",PermissionAction.Create)] public async Task<IActionResult> CreateRate(SaveGstRateRuleVersionRequest r,CancellationToken ct)=>FromResponse(await service.SaveRateVersionAsync(r,ct),201);
    [HttpPut("categories/{categoryId:long}/hsn-default"), RequirePermission("GST.CategoryMapping",PermissionAction.Edit)] public async Task<IActionResult> CategoryDefault(long categoryId,SaveCategoryHsnDefaultRequest r,CancellationToken ct)=>FromResponse(await service.SaveCategoryDefaultAsync(categoryId,r,ct));
    [HttpGet("categories/{categoryId:long}/hsn-default"), RequirePermission("GST.CategoryMapping",PermissionAction.View)] public async Task<IActionResult> CategoryDefaultEffective(long categoryId,[FromQuery]DateOnly? onDate,CancellationToken ct)=>FromResponse(await service.GetEffectiveCategoryDefaultAsync(categoryId,onDate??DateOnly.FromDateTime(DateTime.UtcNow),ct));
    [HttpPut("categories/{categoryId:long}/hsn-default/{mappingId:long}/retire"), RequirePermission("GST.CategoryMapping",PermissionAction.Edit)] public async Task<IActionResult> RetireCategoryDefault(long categoryId,long mappingId,RetireHsnMappingRequest r,CancellationToken ct)=>FromResponse(await service.RetireCategoryDefaultAsync(categoryId,mappingId,r,ct));
    [HttpPut("items/{itemId:long}/hsn-override"), RequirePermission("GST.ProductMapping",PermissionAction.Edit)] public async Task<IActionResult> ItemOverride(long itemId,SaveItemHsnOverrideRequest r,CancellationToken ct)=>FromResponse(await service.SaveItemOverrideAsync(itemId,r,ct));
    [HttpPut("items/{itemId:long}/hsn-override/{mappingId:long}/retire"), RequirePermission("GST.ProductMapping",PermissionAction.Edit)] public async Task<IActionResult> RetireItemOverride(long itemId,long mappingId,RetireHsnMappingRequest r,CancellationToken ct)=>FromResponse(await service.RetireItemOverrideAsync(itemId,mappingId,r,ct));
    [HttpGet("items/{itemId:long}/effective-classification"), RequirePermission("GST.ProductMapping",PermissionAction.View)] public async Task<IActionResult> Effective(long itemId,[FromQuery]DateOnly? onDate,CancellationToken ct)=>FromResponse(await service.GetEffectiveClassificationAsync(itemId,onDate??DateOnly.FromDateTime(DateTime.UtcNow),ct));
}
