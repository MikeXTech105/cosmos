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
    [HttpGet("hsn-sacs"), RequirePermission("GST.RateHistory", PermissionAction.View)]
    public async Task<IActionResult> ListHsnSacs([FromQuery] HsnSacListQuery query, CancellationToken ct) => FromResponse(await service.GetHsnSacsAsync(query, ct));

    [HttpGet("hsn-sacs/{id:long}"), RequirePermission("GST.RateHistory", PermissionAction.View)]
    public async Task<IActionResult> GetHsnSac(long id, CancellationToken ct) => FromResponse(await service.GetHsnSacAsync(id, ct));

    [HttpPost("hsn-sacs"), RequirePermission("GST.RateHistory", PermissionAction.Create)]
    public async Task<IActionResult> CreateHsnSac(SaveHsnSacRequest request, CancellationToken ct) => FromResponse(await service.SaveHsnSacAsync(null, request, ct), 201);

    [HttpPut("hsn-sacs/{id:long}"), RequirePermission("GST.RateHistory", PermissionAction.Edit)]
    public async Task<IActionResult> UpdateHsnSac(long id, SaveHsnSacRequest request, CancellationToken ct) => FromResponse(await service.SaveHsnSacAsync(id, request, ct));

    [HttpPut("categories/{categoryId:long}/hsn-default"), RequirePermission("Categories", PermissionAction.Edit)]
    public async Task<IActionResult> SaveCategoryDefault(long categoryId, SaveCategoryHsnDefaultRequest request, CancellationToken ct) => FromResponse(await service.SaveCategoryDefaultAsync(categoryId, request, ct));

    [HttpGet("categories/{categoryId:long}/hsn-default"), RequirePermission("Categories", PermissionAction.View)]
    public async Task<IActionResult> GetCategoryDefault(long categoryId, [FromQuery] DateOnly onDate, CancellationToken ct) => FromResponse(await service.GetEffectiveCategoryDefaultAsync(categoryId, onDate, ct));

    [HttpPost("categories/{categoryId:long}/hsn-default/{mappingId:long}/retire"), RequirePermission("Categories", PermissionAction.Edit)]
    public async Task<IActionResult> RetireCategoryDefault(long categoryId, long mappingId, RetireHsnMappingRequest request, CancellationToken ct) => FromResponse(await service.RetireCategoryDefaultAsync(categoryId, mappingId, request, ct));

    [HttpPut("items/{itemId:long}/hsn-override"), RequirePermission("Items", PermissionAction.Edit)]
    public async Task<IActionResult> SaveItemOverride(long itemId, SaveItemHsnOverrideRequest request, CancellationToken ct) => FromResponse(await service.SaveItemOverrideAsync(itemId, request, ct));

    [HttpPost("items/{itemId:long}/hsn-override/{mappingId:long}/retire"), RequirePermission("Items", PermissionAction.Edit)]
    public async Task<IActionResult> RetireItemOverride(long itemId, long mappingId, RetireHsnMappingRequest request, CancellationToken ct) => FromResponse(await service.RetireItemOverrideAsync(itemId, mappingId, request, ct));

    [HttpGet("items/{itemId:long}/effective-classification"), RequirePermission("Items", PermissionAction.View)]
    public async Task<IActionResult> GetEffectiveClassification(long itemId, [FromQuery] DateOnly onDate, CancellationToken ct) => FromResponse(await service.GetEffectiveClassificationAsync(itemId, onDate, ct));

    [HttpGet("rate-versions"), RequirePermission("GST.RateHistory",PermissionAction.View)] public async Task<IActionResult> ListRates([FromQuery]GstRateRuleVersionListQuery q,CancellationToken ct)=>FromResponse(await service.GetRateVersionsAsync(q,ct));
    [HttpPost("rate-versions"), RequirePermission("GST.RateHistory",PermissionAction.Create)] public async Task<IActionResult> CreateRate(SaveGstRateRuleVersionRequest r,CancellationToken ct)=>FromResponse(await service.SaveRateVersionAsync(r,ct),201);
}
