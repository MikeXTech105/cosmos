namespace Cosmos.Application.Gst;

public sealed record CreateCompanyGstRegistrationRequest(
    long? CompanyId,
    long? BranchId,
    string Gstin,
    string? LegalName,
    string? TradeName,
    string? StateCode,
    string? StateName,
    string? BranchName,
    string? AddressLine1,
    string? AddressLine2,
    string? City,
    string? District,
    string? Pincode,
    string? AddressJson,
    string? GstPortalUsername,
    bool IsEInvoiceEnabled,
    bool IsEWayBillEnabled,
    bool IsGstReturnEnabled,
    bool IsDefault,
    string Status = "Active");

public sealed record UpdateCompanyGstRegistrationRequest(
    long? CompanyId,
    long? BranchId,
    string Gstin,
    string? LegalName,
    string? TradeName,
    string? StateCode,
    string? StateName,
    string? BranchName,
    string? AddressLine1,
    string? AddressLine2,
    string? City,
    string? District,
    string? Pincode,
    string? AddressJson,
    string? GstPortalUsername,
    bool IsEInvoiceEnabled,
    bool IsEWayBillEnabled,
    bool IsGstReturnEnabled,
    bool IsDefault,
    string Status = "Active");

public sealed record CompanyGstRegistrationListRequest(
    string? Search = null,
    long? CompanyId = null,
    long? BranchId = null,
    string? StateCode = null,
    string? Status = null,
    int PageNumber = 1,
    int PageSize = 20,
    string? SortBy = "CreatedAt",
    string? SortDirection = "DESC");

public sealed record SetDefaultCompanyGstRegistrationRequest(long? CompanyId = null);

public sealed record VerifyGstinRequest(string Gstin, bool ForceRefresh = false);

public sealed record GenerateEWayBillRequest(
    long CompanyGstRegistrationId,
    long? SalesInvoiceId,
    long? PurchaseInvoiceId,
    string? DocumentType,
    string? DocumentNumber,
    DateTime? DocumentDate,
    string? SupplyType,
    string? SubSupplyType,
    string? FromGstin,
    string? ToGstin,
    string? TransporterId,
    string? TransporterName,
    string? TransportMode,
    string? VehicleNumber,
    string? VehicleType,
    decimal? Distance,
    string? RequestJson);

public sealed record CancelEWayBillRequest(
    long CompanyGstRegistrationId,
    string EWayBillNumber,
    string CancelReasonCode,
    string CancelRemark,
    string? RequestJson = null);

public sealed record GetEWayBillDetailsRequest(
    long CompanyGstRegistrationId,
    string EWayBillNumber,
    string? Gstin = null);

public sealed record UpdateEWayBillVehicleRequest(
    long CompanyGstRegistrationId,
    string EWayBillNumber,
    string VehicleNumber,
    string? VehicleType,
    string? TransportMode,
    string? RequestJson);

public sealed record ExtendEWayBillRequest(
    long CompanyGstRegistrationId,
    string EWayBillNumber,
    string? VehicleNumber,
    string? RemainingDistance,
    string? ExtensionReasonCode,
    string? ExtensionRemark,
    string? RequestJson,
    string? FromPlace = null,
    int? FromState = null,
    string? FromPincode = null,
    string? TransportDocumentNumber = null,
    DateOnly? TransportDocumentDate = null,
    string? TransportMode = null,
    string? ConsignmentStatus = null,
    string? TransitType = null,
    string? AddressLine1 = null,
    string? AddressLine2 = null,
    string? AddressLine3 = null,
    Guid? IdempotencyKey = null,
    string? Version = null,
    string? Gstin = null);

public sealed record GenerateEInvoiceRequest(
    long CompanyGstRegistrationId,
    long? SalesInvoiceId,
    string? DocumentType,
    string? DocumentNumber,
    DateTime? DocumentDate,
    string? SellerGstin,
    string? BuyerGstin,
    string? RequestJson);

public sealed record CancelEInvoiceRequest(
    long CompanyGstRegistrationId,
    string Irn,
    string CancelReasonCode,
    string CancelRemark,
    string? RequestJson = null);

public sealed record GetEInvoiceDetailsRequest(
    long CompanyGstRegistrationId,
    string Irn,
    string? SellerGstin = null,
    string? Irp = null);

public sealed record GenerateGstOtpRequest(long CompanyGstRegistrationId, string? GstPortalUsername = null, string? Gstin = null);

public sealed record AuthenticateGstOtpRequest(
    long CompanyGstRegistrationId,
    string Otp,
    string? SessionType = null,
    string? RequestJson = null,
    string? Gstin = null);

public sealed record GstApiLogListRequest(
    string? Search = null,
    long? CompanyGstRegistrationId = null,
    string? ApiType = null,
    bool? IsSuccess = null,
    DateTime? FromDate = null,
    DateTime? ToDate = null,
    int PageNumber = 1,
    int PageSize = 20,
    string? SortBy = "CreatedAt",
    string? SortDirection = "DESC");

public sealed record AddGstApiLogRequest(
    long? CompanyGstRegistrationId,
    string ProviderName,
    string ApiType,
    string? Endpoint,
    string? HttpMethod,
    string? RequestPayload,
    string? ResponsePayload,
    int? StatusCode,
    bool IsSuccess,
    string? ErrorMessage,
    int? DurationMs,
    string? CorrelationId,
    long? CreatedBy);
