using Cosmos.Contracts.Common;

namespace Cosmos.Contracts.Gst;

public sealed record GstConfigurationStatusResponse(
    string Environment,
    string? CurrentBaseUrl,
    IReadOnlyCollection<string> ConfiguredSettings,
    IReadOnlyCollection<string> MissingSettings,
    IReadOnlyCollection<string> EnabledFeatures);

public sealed class CompanyGstRegistrationResponse
{
    public long Id { get; set; }
    public long? CompanyId { get; set; }
    public long? BranchId { get; set; }
    public string Gstin { get; set; } = string.Empty;
    public string? LegalName { get; set; }
    public string? TradeName { get; set; }
    public string? StateCode { get; set; }
    public string? StateName { get; set; }
    public string? BranchName { get; set; }
    public string? AddressLine1 { get; set; }
    public string? AddressLine2 { get; set; }
    public string? City { get; set; }
    public string? District { get; set; }
    public string? Pincode { get; set; }
    public string? AddressJson { get; set; }
    public string? GstPortalUsername { get; set; }
    public bool IsEInvoiceEnabled { get; set; }
    public bool IsEWayBillEnabled { get; set; }
    public bool IsGstReturnEnabled { get; set; }
    public bool IsDefault { get; set; }
    public string Status { get; set; } = "Active";
    public DateTime? LastVerifiedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public long? CreatedBy { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public long? UpdatedBy { get; set; }
    public int TotalCount { get; set; }
}

public sealed record PagedCompanyGstRegistrationResponse(PagedResult<CompanyGstRegistrationResponse> Result);

public sealed class GstinVerificationResponse
{
    public string Gstin { get; set; } = string.Empty;
    public string? LegalName { get; set; }
    public string? TradeName { get; set; }
    public string? Status { get; set; }
    public string? TaxpayerType { get; set; }
    public string? StateCode { get; set; }
    public DateTime? RegistrationDate { get; set; }
    public string? AddressJson { get; set; }
    public string? NatureOfBusinessJson { get; set; }
    public string? RawResponseJson { get; set; }
    public string ProviderName { get; set; } = "GSTZen";
    public DateTime VerifiedAt { get; set; }
    public DateTime? CacheExpiresAt { get; set; }
}

public sealed class EWayBillResponse
{
    public string? ConcurrencyVersion { get; set; }
    public long Id { get; set; }
    public long CompanyGstRegistrationId { get; set; }
    public long? SalesInvoiceId { get; set; }
    public long? PurchaseInvoiceId { get; set; }
    public string? EWayBillNumber { get; set; }
    public string Status { get; set; } = "Generated";
    public string? DocumentType { get; set; }
    public string? DocumentNumber { get; set; }
    public DateTime? DocumentDate { get; set; }
    public string? SupplyType { get; set; }
    public string? SubSupplyType { get; set; }
    public string? FromGstin { get; set; }
    public string? ToGstin { get; set; }
    public string? TransporterId { get; set; }
    public string? TransporterName { get; set; }
    public string? TransportMode { get; set; }
    public string? VehicleNumber { get; set; }
    public string? VehicleType { get; set; }
    public decimal? Distance { get; set; }
    public DateTime? ValidUpTo { get; set; }
    public string? GeneratedRequestJson { get; set; }
    public string? GeneratedResponseJson { get; set; }
    public DateTime? CancelledAt { get; set; }
    public string? CancelReasonCode { get; set; }
    public string? CancelReason { get; set; }
    public DateTime CreatedAt { get; set; }
    public long? CreatedBy { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public long? UpdatedBy { get; set; }
}

public sealed record GstEWayExtensionOperation(Guid IdempotencyKey, long EWayBillId, long CompanyGstRegistrationId, string EWayBillNumber, string State, bool IsNew, DateTime? PriorValidUpTo);

public sealed class EInvoiceResponse
{
    public long Id { get; set; }
    public long CompanyGstRegistrationId { get; set; }
    public long? SalesInvoiceId { get; set; }
    public string? Irn { get; set; }
    public string? AckNumber { get; set; }
    public DateTime? AckDate { get; set; }
    public string? DocumentType { get; set; }
    public string? DocumentNumber { get; set; }
    public DateTime? DocumentDate { get; set; }
    public string? SellerGstin { get; set; }
    public string? BuyerGstin { get; set; }
    public string? SignedQrCode { get; set; }
    public string? SignedInvoice { get; set; }
    public string Status { get; set; } = "Generated";
    public string? GeneratedRequestJson { get; set; }
    public string? GeneratedResponseJson { get; set; }
    public DateTime? CancelledAt { get; set; }
    public string? CancelReasonCode { get; set; }
    public string? CancelReason { get; set; }
    public DateTime CreatedAt { get; set; }
    public long? CreatedBy { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public long? UpdatedBy { get; set; }
}

public sealed class GstSessionResponse
{
    public long Id { get; set; }
    public long CompanyGstRegistrationId { get; set; }
    public string ProviderName { get; set; } = "GSTZen";
    public string? SessionType { get; set; }
    public DateTime? TokenExpiresAt { get; set; }
    public DateTime? OtpVerifiedAt { get; set; }
    public string Status { get; set; } = "Active";
    public string? LastErrorMessage { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public sealed class GstApiLogResponse
{
    public long Id { get; set; }
    public long? CompanyGstRegistrationId { get; set; }
    public string ProviderName { get; set; } = "GSTZen";
    public string ApiType { get; set; } = string.Empty;
    public string? Endpoint { get; set; }
    public string? HttpMethod { get; set; }
    public string? RequestPayload { get; set; }
    public string? ResponsePayload { get; set; }
    public int? StatusCode { get; set; }
    public bool IsSuccess { get; set; }
    public string? ErrorMessage { get; set; }
    public int? DurationMs { get; set; }
    public string? CorrelationId { get; set; }
    public DateTime CreatedAt { get; set; }
    public long? CreatedBy { get; set; }
    public int TotalCount { get; set; }
}
