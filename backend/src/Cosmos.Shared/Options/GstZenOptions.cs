namespace Cosmos.Shared.Options;

public sealed class GstZenOptions
{
    public const string SectionName = "GSTZen";

    public string Environment { get; set; } = "Sandbox";
    public string? SandboxBaseUrl { get; set; }
    public string? ProductionBaseUrl { get; set; }
    public string? SandboxToken { get; set; }
    public string? ProductionToken { get; set; }
    public string TokenHeaderName { get; set; } = "Token";
    public int TimeoutSeconds { get; set; } = 60;
    public bool MaskSensitiveLogs { get; set; } = true;
    public string? GstinVerificationPath { get; set; }
    public string? EWayBillGeneratePath { get; set; }
    public string? EWayBillCancelPath { get; set; }
    public string? EWayBillUpdateVehiclePath { get; set; }
    public string? EWayBillExtendPath { get; set; }
    public string? EWayBillGetDetailsPath { get; set; }
    public string? EInvoiceGeneratePath { get; set; }
    public string? EInvoiceCancelPath { get; set; }
    public string? EInvoiceGetDetailsPath { get; set; }
    public string? GstnGenerateOtpPath { get; set; }
    public string? GstnAuthenticateOtpPath { get; set; }
    public string? Gstr1Path { get; set; }
    public string? Gstr3BPath { get; set; }

    public string? CurrentBaseUrl =>
        string.Equals(Environment, "Production", StringComparison.OrdinalIgnoreCase)
            ? ProductionBaseUrl
            : SandboxBaseUrl;

    public string? CurrentToken =>
        string.Equals(Environment, "Production", StringComparison.OrdinalIgnoreCase)
            ? ProductionToken
            : SandboxToken;
}
