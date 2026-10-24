using Cosmos.Contracts.Sales;

namespace Cosmos.Application.Gst;

public sealed record GstComplianceReadinessIssue(string Code, string Message, bool BlocksInvoiceConfirmation);

public sealed record GstComplianceSnapshotReadiness(
    long SalesInvoiceId,
    bool CanCreateSnapshot,
    IReadOnlyCollection<GstComplianceReadinessIssue> Issues);

/// <summary>
/// Examines only values persisted with the sales invoice. It deliberately does not
/// read current party, registration, HSN, or rule records as a substitute for a
/// historical compliance snapshot.
/// </summary>
public static class GstComplianceSnapshotReadinessEvaluator
{
    private static readonly HashSet<int> ConfirmedStatuses = [2, 3, 4];

    public static GstComplianceSnapshotReadiness Evaluate(SalesInvoiceDetailDto invoice)
    {
        ArgumentNullException.ThrowIfNull(invoice);
        var issues = new List<GstComplianceReadinessIssue>();

        if (!ConfirmedStatuses.Contains(invoice.Status))
        {
            issues.Add(new("GST_SNAPSHOT_INVOICE_NOT_CONFIRMED", "A compliance snapshot can only be created for a confirmed sales invoice.", false));
        }

        if (invoice.Items.Count == 0)
        {
            issues.Add(new("GST_SNAPSHOT_NO_LINES", "The invoice has no persisted line items.", true));
        }

        if (invoice.Items.Any(x => string.IsNullOrWhiteSpace(x.HsnSacCodeSnapshot)))
        {
            issues.Add(new("GST_SNAPSHOT_HSN_SAC_MISSING", "Every invoice line needs an immutable HSN/SAC code before a government-document snapshot can be created.", false));
        }

        // The current SalesInvoice schema intentionally has no registration or place-of-supply fields.
        issues.Add(new("GST_SNAPSHOT_SELLER_REGISTRATION_UNRESOLVED", "The invoice does not persist the selected seller GST registration.", false));
        issues.Add(new("GST_SNAPSHOT_BUYER_IDENTITY_UNSNAPSHOTTED", "The invoice references a party but does not persist the buyer legal identity, GSTIN, or address snapshot.", false));
        issues.Add(new("GST_SNAPSHOT_PLACE_OF_SUPPLY_UNRESOLVED", "The invoice does not persist a place-of-supply determination and source.", false));
        issues.Add(new("GST_SNAPSHOT_TAX_COMPONENTS_UNSNAPSHOTTED", "The invoice persists aggregate tax only, not immutable CGST, SGST, IGST, cess, taxable-value, and approved-rule components.", false));
        issues.Add(new("GST_SNAPSHOT_DISCOUNT_ROUNDING_POLICY_UNRESOLVED", "Invoice-level discount allocation and statutory rounding policy are not persisted with the invoice.", false));

        return new GstComplianceSnapshotReadiness(invoice.Id, false, issues);
    }
}
