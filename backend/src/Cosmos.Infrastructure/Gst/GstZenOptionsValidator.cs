using Cosmos.Shared.Options;
using Microsoft.Extensions.Options;

namespace Cosmos.Infrastructure.Gst;

public sealed class GstZenOptionsValidator : IValidateOptions<GstZenOptions>
{
    public ValidateOptionsResult Validate(string? name, GstZenOptions options)
    {
        var failures = new List<string>();

        if (!string.Equals(options.Environment, "Sandbox", StringComparison.OrdinalIgnoreCase)
            && !string.Equals(options.Environment, "Production", StringComparison.OrdinalIgnoreCase))
        {
            failures.Add("GSTZen:Environment must be Sandbox or Production.");
        }

        if (string.IsNullOrWhiteSpace(options.TokenHeaderName))
        {
            failures.Add("GSTZen:TokenHeaderName is required.");
        }

        if (options.TimeoutSeconds <= 0)
        {
            failures.Add("GSTZen:TimeoutSeconds must be greater than zero.");
        }

        RequireAbsoluteUrl(options.CurrentBaseUrl, "active GSTZen base URL", failures);
        Require(options.CurrentToken, "active GSTZen token", failures);
        Require(options.GstinVerificationPath, nameof(options.GstinVerificationPath), failures);
        Require(options.EInvoiceGeneratePath, nameof(options.EInvoiceGeneratePath), failures);
        Require(options.EInvoiceCancelPath, nameof(options.EInvoiceCancelPath), failures);
        Require(options.EInvoiceGetDetailsPath, nameof(options.EInvoiceGetDetailsPath), failures);
        Require(options.EWayBillGeneratePath, nameof(options.EWayBillGeneratePath), failures);
        Require(options.EWayBillCancelPath, nameof(options.EWayBillCancelPath), failures);
        Require(options.EWayBillGetDetailsPath, nameof(options.EWayBillGetDetailsPath), failures);
        Require(options.EWayBillUpdateVehiclePath, nameof(options.EWayBillUpdateVehiclePath), failures);

        return failures.Count == 0
            ? ValidateOptionsResult.Success
            : ValidateOptionsResult.Fail(failures);
    }

    private static void Require(string? value, string name, ICollection<string> failures)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            failures.Add($"GSTZen:{name} is required.");
        }
    }

    private static void RequireAbsoluteUrl(string? value, string name, ICollection<string> failures)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            failures.Add($"GSTZen {name} is required.");
            return;
        }

        if (!Uri.TryCreate(value, UriKind.Absolute, out var uri) || uri.Scheme != Uri.UriSchemeHttps)
        {
            failures.Add($"GSTZen {name} must be an absolute HTTPS URL.");
        }
    }
}
