using System.Text.Json;
using Cosmos.API.Controllers;
using Cosmos.API.Security;
using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Application.Gst;
using Cosmos.Application.Services;
using Cosmos.Persistence.Repositories;
using Cosmos.Shared.Exceptions;
using Cosmos.Shared.Security;
using Microsoft.SqlServer.TransactSql.ScriptDom;
using Moq;

namespace Cosmos.Tests.Gst;
public sealed class GstSnapshotPreparationTests
{
    private readonly Mock<IGstComplianceSnapshotRepository> repository=new();
    private readonly Mock<IProductionCompanyScope> scope=new();
    private GstPrepareSnapshotRequest Request()=>new(Guid.NewGuid(),"0x0000000000000001",new string('A',64),true);
    private GstComplianceSnapshotService Service(){scope.SetupGet(x=>x.CompanyKey).Returns("verified-catalog");return new(repository.Object,scope.Object,Mock.Of<ICurrentUser>());}
    [Fact] public async Task Read_exposes_proposals_and_never_reports_policy_approved_or_issuance_available()
    {
        var service=Service();repository.Setup(x=>x.ReadSourceAsync(7,"verified-catalog",It.IsAny<CancellationToken>())).ReturnsAsync(new GstSnapshotSource(7,"verified-catalog","0x0000000000000001",new string('A',64),JsonSerializer.SerializeToElement(new{source="stored"})));
        var response=await service.ReadAsync(7,default);Assert.False(response.Data!.CanIssue);Assert.Equal(2,response.Data.PolicyChoices.Count);Assert.All(response.Data.PolicyChoices,group=>Assert.Contains(group.Options,value=>value.Key=="Undecided"));Assert.Contains(response.Data.Issues,text=>text.Contains("deferred"));
    }
    [Theory][InlineData(false,null,null)][InlineData(true,"Unsupported",null)][InlineData(true,null,"Unsupported")]
    public async Task Unreviewed_source_or_unknown_policy_choices_never_reach_persistence(bool reviewed,string? rounding,string? discount)
    {
        var service=Service();await Assert.ThrowsAsync<CosmosException>(()=>service.PrepareAsync(7,Request() with{CurrentMasterDetailsReviewed=reviewed,RoundingCandidate=rounding,HeaderDiscountCandidate=discount},default));repository.Verify(x=>x.PrepareAsync(It.IsAny<long>(),It.IsAny<string>(),It.IsAny<GstPrepareSnapshotRequest>(),It.IsAny<long?>(),It.IsAny<CancellationToken>()),Times.Never);
    }
    [Fact] public async Task Authenticated_catalog_scope_is_resolved_before_persistence()
    {
        scope.SetupGet(x=>x.CompanyKey).Throws(new ForbiddenCosmosException("Catalog mismatch"));var service=new GstComplianceSnapshotService(repository.Object,scope.Object,Mock.Of<ICurrentUser>());await Assert.ThrowsAsync<ForbiddenCosmosException>(()=>service.PrepareAsync(7,Request(),default));repository.VerifyNoOtherCalls();
    }
    [Fact] public async Task Approved_option_candidates_are_proposals_only_and_default_decision_can_remain_deferred()
    {
        var service=Service();var request=Request();repository.Setup(x=>x.PrepareAsync(7,"verified-catalog",request,It.IsAny<long?>(),It.IsAny<CancellationToken>())).ReturnsAsync(new GstPendingSnapshot(Guid.NewGuid(),7,1,"PendingPolicy",request.SourceVersion,request.SourceFingerprint,request.RequestKey,DateTime.UtcNow,JsonSerializer.SerializeToElement(new{approved=false})));
        var response=await service.PrepareAsync(7,request,default);Assert.Equal("PendingPolicy",response.Data!.Status);Assert.False(response.Data.PolicyOptions.GetProperty("approved").GetBoolean());
    }
    [Fact] public void Preparation_controller_requires_sales_view_and_operation_specific_GST_permission()
    {
        var type=typeof(GstComplianceSnapshotsController);Assert.Contains(type.GetCustomAttributes(typeof(RequirePermissionAttribute),true).Cast<RequirePermissionAttribute>(),attribute=>(string)attribute.Arguments![0]=="Sales.Invoice");
        Assert.All(new[]{"Read","Prepare","GetPrepared"},method=>Assert.Contains(type.GetMethod(method)!.GetCustomAttributes(typeof(RequirePermissionAttribute),true).Cast<RequirePermissionAttribute>(),attribute=>(string)attribute.Arguments![0]=="GST.EInvoice"));
    }
    [Fact] public void Transactional_source_query_parses_and_uses_only_whitelisted_non_secret_columns()
    {
        var sql=(string)typeof(GstComplianceSnapshotRepository).GetField("SourceSql",System.Reflection.BindingFlags.Static|System.Reflection.BindingFlags.NonPublic)!.GetRawConstantValue()!;
        new TSql160Parser(true).Parse(new StringReader(sql),out var errors);Assert.Empty(errors);Assert.Contains("WITH(UPDLOCK,HOLDLOCK)",sql);Assert.DoesNotContain("GstPortalUsername",sql);Assert.DoesNotContain("Token",sql);Assert.Contains("ORDER BY l.Id FOR JSON PATH",sql);
    }
}
