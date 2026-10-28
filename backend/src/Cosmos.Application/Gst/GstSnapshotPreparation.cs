using System.Text.Json;

namespace Cosmos.Application.Gst;

public sealed record GstPolicyChoice(string Key,string Label,string Description);
public sealed record GstPolicyChoiceGroup(string Key,string Label,IReadOnlyCollection<GstPolicyChoice> Options);
public sealed record GstPrepareSnapshotRequest(Guid RequestKey,string SourceVersion,string SourceFingerprint,bool CurrentMasterDetailsReviewed,string? RoundingCandidate=null,string? HeaderDiscountCandidate=null);
public sealed record GstSnapshotSource(long SalesInvoiceId,string CompanyKey,string SourceVersion,string SourceFingerprint,JsonElement Document);
public sealed record GstPendingSnapshot(Guid Id,long SalesInvoiceId,int SnapshotVersion,string Status,string SourceVersion,string SourceFingerprint,Guid RequestKey,DateTime CreatedAt,JsonElement PolicyOptions,JsonElement? FrozenSource=null);
public sealed record GstSnapshotPreparation(GstSnapshotSource Source,IReadOnlyCollection<GstPolicyChoiceGroup> PolicyChoices,IReadOnlyCollection<string> Issues,bool CanIssue=false);

public static class GstSnapshotPolicyChoices
{
    public static IReadOnlyCollection<GstPolicyChoiceGroup> All { get; } = [
        new("rounding","Rounding policy (proposal only)",[
            new("Undecided","Decide later","No rounding policy is approved and issuance remains unavailable."),
            new("LineComponentHalfAway2","Review line/component rounding to two decimals","Proposed: half-away-from-zero for each line tax component, then sum the rounded component amounts. This selection does not approve or activate it.")]),
        new("headerDiscount","Invoice discount allocation (proposal only)",[
            new("Undecided","Decide later","No invoice discount allocation policy is approved."),
            new("ProportionalLargestRemainder","Review proportional allocation","Proposed: allocate against eligible taxable bases, distribute residual paise by largest remainder with line-ID tie-break. Tax treatment and approval are still required.")])];
    public static bool IsAllowed(string group,string? value)=>value is null||All.Single(x=>x.Key==group).Options.Any(x=>x.Key==value);
}
