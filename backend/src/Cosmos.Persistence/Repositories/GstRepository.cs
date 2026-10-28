using System.Data;
using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Application.Gst;
using Cosmos.Contracts.Common;
using Cosmos.Contracts.Gst;
using Cosmos.Persistence.Connection;
using Cosmos.Persistence.Dapper;
using Cosmos.Shared.Exceptions;
using Dapper;

namespace Cosmos.Persistence.Repositories;

public sealed class GstRepository : IGstRepository
{
    private readonly ISqlConnectionFactory _connectionFactory;

    public GstRepository(ISqlConnectionFactory connectionFactory) => _connectionFactory = connectionFactory;

    public async Task<bool> GstinExistsAsync(string gstin, long? excludingId, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        return await StoredProcedureExecutor.QuerySingleOrDefaultAsync<bool>(
            connection,
            "sp_GstRegistration_GstinExists",
            new { Gstin = gstin, ExcludingId = excludingId },
            cancellationToken);
    }

    public async Task<CompanyGstRegistrationResponse?> GetRegistrationByIdAsync(long id, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        return await StoredProcedureExecutor.QuerySingleOrDefaultAsync<CompanyGstRegistrationResponse>(
            connection,
            "sp_GstRegistration_GetById",
            new { Id = id },
            cancellationToken);
    }

    public async Task<PagedResult<CompanyGstRegistrationResponse>> GetRegistrationsAsync(CompanyGstRegistrationListRequest request, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        var rows = await StoredProcedureExecutor.QueryAsync<CompanyGstRegistrationResponse>(
            connection,
            "sp_GstRegistration_GetList",
            request,
            cancellationToken);
        return new PagedResult<CompanyGstRegistrationResponse>(rows, request.PageNumber, request.PageSize, rows.FirstOrDefault()?.TotalCount ?? 0);
    }

    public async Task<CompanyGstRegistrationResponse> CreateRegistrationAsync(CreateCompanyGstRegistrationRequest request, long? userId, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        return await StoredProcedureExecutor.QueryWithStatusAsync<CompanyGstRegistrationResponse>(
            connection,
            "sp_GstRegistration_Create",
            RegistrationParameters(request, userId),
            cancellationToken);
    }

    public async Task<CompanyGstRegistrationResponse> UpdateRegistrationAsync(long id, UpdateCompanyGstRegistrationRequest request, long? userId, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        var parameters = RegistrationParameters(request, userId);
        parameters.Add("Id", id);
        return await StoredProcedureExecutor.QueryWithStatusAsync<CompanyGstRegistrationResponse>(
            connection,
            "sp_GstRegistration_Update",
            parameters,
            cancellationToken);
    }

    public async Task DeleteRegistrationAsync(long id, long? userId, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        var result = await StoredProcedureExecutor.ExecuteStatusAsync(connection, "sp_GstRegistration_Delete", new { Id = id, UserId = userId }, cancellationToken);
        if (!result.Succeeded)
        {
            throw new CosmosException(result.Message, result.StatusCode);
        }
    }

    public async Task<CompanyGstRegistrationResponse> SetDefaultRegistrationAsync(long id, long? companyId, long? userId, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        return await StoredProcedureExecutor.QueryWithStatusAsync<CompanyGstRegistrationResponse>(
            connection,
            "sp_GstRegistration_SetDefault",
            new { Id = id, CompanyId = companyId, UserId = userId },
            cancellationToken);
    }

    public async Task<CompanyGstRegistrationResponse> UpdateRegistrationVerificationAsync(long id, GstinVerificationResponse verification, long? userId, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        return await StoredProcedureExecutor.QueryWithStatusAsync<CompanyGstRegistrationResponse>(
            connection,
            "sp_GstRegistration_UpdateVerification",
            new
            {
                Id = id,
                verification.LegalName,
                verification.TradeName,
                verification.StateCode,
                verification.AddressJson,
                UserId = userId
            },
            cancellationToken);
    }

    public async Task<GstinVerificationResponse?> GetCachedVerificationAsync(string gstin, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        return await StoredProcedureExecutor.QuerySingleOrDefaultAsync<GstinVerificationResponse>(
            connection,
            "sp_GstVerification_GetCached",
            new { Gstin = gstin },
            cancellationToken);
    }

    public async Task<GstinVerificationResponse> SaveVerificationLogAsync(GstinVerificationResponse response, long? userId, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        return await StoredProcedureExecutor.QueryWithStatusAsync<GstinVerificationResponse>(
            connection,
            "sp_GstVerificationLog_Create",
            new
            {
                response.Gstin,
                response.LegalName,
                response.TradeName,
                response.Status,
                response.TaxpayerType,
                response.StateCode,
                response.RegistrationDate,
                response.AddressJson,
                response.NatureOfBusinessJson,
                response.RawResponseJson,
                response.ProviderName,
                response.CacheExpiresAt,
                CreatedBy = userId
            },
            cancellationToken);
    }

    public async Task<EWayBillResponse?> GetEWayBillByNumberAsync(string ewayBillNumber, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        return await StoredProcedureExecutor.QuerySingleOrDefaultAsync<EWayBillResponse>(
            connection,
            "sp_EWayBill_GetByNumber",
            new { EWayBillNumber = ewayBillNumber },
            cancellationToken);
    }

    public async Task<EWayBillResponse> SaveEWayBillAsync(GenerateEWayBillRequest request, EWayBillResponse providerResponse, long? userId, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        return await StoredProcedureExecutor.QueryWithStatusAsync<EWayBillResponse>(
            connection,
            "sp_EWayBill_Create",
            new
            {
                request.CompanyGstRegistrationId,
                request.SalesInvoiceId,
                request.PurchaseInvoiceId,
                providerResponse.EWayBillNumber,
                providerResponse.Status,
                request.DocumentType,
                request.DocumentNumber,
                request.DocumentDate,
                request.SupplyType,
                request.SubSupplyType,
                request.FromGstin,
                request.ToGstin,
                request.TransporterId,
                request.TransporterName,
                request.TransportMode,
                request.VehicleNumber,
                request.VehicleType,
                request.Distance,
                providerResponse.ValidUpTo,
                GeneratedRequestJson = providerResponse.GeneratedRequestJson,
                GeneratedResponseJson = providerResponse.GeneratedResponseJson,
                CreatedBy = userId
            },
            cancellationToken);
    }

    public async Task<GstEWayExtensionOperation> ReserveEWayExtensionAsync(ExtendEWayBillRequest request, byte[] fingerprint, DateTime? priorValidity, long? userId, CancellationToken cancellationToken)
    {
        using var connection=await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        return await StoredProcedureExecutor.QueryWithStatusAsync<GstEWayExtensionOperation>(connection,"sp_GstEWayExtension_Reserve",new { request.CompanyGstRegistrationId,request.EWayBillNumber,request.IdempotencyKey,request.Version,PayloadFingerprint=fingerprint,PriorValidUpTo=priorValidity,UserId=userId },cancellationToken);
    }

    public async Task<GstEWayExtensionOperation?> GetEWayExtensionAsync(Guid idempotencyKey,CancellationToken cancellationToken)
    {
        using var connection=await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        return await StoredProcedureExecutor.QuerySingleOrDefaultAsync<GstEWayExtensionOperation>(connection,"sp_GstEWayExtension_Get",new { IdempotencyKey=idempotencyKey },cancellationToken);
    }

    public async Task<EWayBillResponse> CompleteEWayExtensionAsync(Guid idempotencyKey,EWayBillResponse? response,bool confirmed,long? userId,CancellationToken cancellationToken,bool rejected=false)
    {
        using var connection=await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        return await StoredProcedureExecutor.QueryWithStatusAsync<EWayBillResponse>(connection,"sp_GstEWayExtension_Complete",new { IdempotencyKey=idempotencyKey,Confirmed=confirmed,Rejected=rejected,ValidUpTo=response?.ValidUpTo,VehicleNumber=response?.VehicleNumber,TransportMode=response?.TransportMode,ResponseJson=response?.GeneratedResponseJson,UserId=userId },cancellationToken);
    }

    public async Task<EWayBillResponse> UpdateEWayBillStatusAsync(CancelEWayBillRequest request, EWayBillResponse providerResponse, long? userId, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        return await StoredProcedureExecutor.QueryWithStatusAsync<EWayBillResponse>(
            connection,
            "sp_EWayBill_Cancel",
            new
            {
                request.CompanyGstRegistrationId,
                request.EWayBillNumber,
                request.CancelReasonCode,
                CancelReason = request.CancelRemark,
                ResponseJson = providerResponse.GeneratedResponseJson,
                UpdatedBy = userId
            },
            cancellationToken);
    }

    public async Task<EInvoiceResponse?> GetEInvoiceByIrnAsync(string irn, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        return await StoredProcedureExecutor.QuerySingleOrDefaultAsync<EInvoiceResponse>(
            connection,
            "sp_EInvoice_GetByIrn",
            new { Irn = irn },
            cancellationToken);
    }

    public async Task<EInvoiceResponse> SaveEInvoiceAsync(GenerateEInvoiceRequest request, EInvoiceResponse providerResponse, long? userId, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        return await StoredProcedureExecutor.QueryWithStatusAsync<EInvoiceResponse>(
            connection,
            "sp_EInvoice_Create",
            new
            {
                request.CompanyGstRegistrationId,
                request.SalesInvoiceId,
                providerResponse.Irn,
                providerResponse.AckNumber,
                providerResponse.AckDate,
                request.DocumentType,
                request.DocumentNumber,
                request.DocumentDate,
                request.SellerGstin,
                request.BuyerGstin,
                providerResponse.SignedQrCode,
                providerResponse.SignedInvoice,
                providerResponse.Status,
                GeneratedRequestJson = providerResponse.GeneratedRequestJson,
                GeneratedResponseJson = providerResponse.GeneratedResponseJson,
                CreatedBy = userId
            },
            cancellationToken);
    }

    public async Task<EInvoiceResponse> UpdateEInvoiceStatusAsync(CancelEInvoiceRequest request, EInvoiceResponse providerResponse, long? userId, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        return await StoredProcedureExecutor.QueryWithStatusAsync<EInvoiceResponse>(
            connection,
            "sp_EInvoice_Cancel",
            new
            {
                request.CompanyGstRegistrationId,
                request.Irn,
                request.CancelReasonCode,
                CancelReason = request.CancelRemark,
                ResponseJson = providerResponse.GeneratedResponseJson,
                UpdatedBy = userId
            },
            cancellationToken);
    }

    public async Task<GstSessionResponse?> GetSessionAsync(long companyGstRegistrationId, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        return await StoredProcedureExecutor.QuerySingleOrDefaultAsync<GstSessionResponse>(
            connection,
            "sp_GstSession_GetStatus",
            new { CompanyGstRegistrationId = companyGstRegistrationId },
            cancellationToken);
    }

    public async Task<GstSessionResponse> SaveSessionAsync(long companyGstRegistrationId, GstSessionResponse providerResponse, string? authToken, string? refreshToken, long? userId, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        return await StoredProcedureExecutor.QueryWithStatusAsync<GstSessionResponse>(
            connection,
            "sp_GstSession_Save",
            new
            {
                CompanyGstRegistrationId = companyGstRegistrationId,
                providerResponse.ProviderName,
                providerResponse.SessionType,
                AuthToken = authToken,
                RefreshToken = refreshToken,
                providerResponse.TokenExpiresAt,
                providerResponse.OtpVerifiedAt,
                providerResponse.Status,
                providerResponse.LastErrorMessage
            },
            cancellationToken);
    }

    public async Task<PagedResult<GstApiLogResponse>> GetApiLogsAsync(GstApiLogListRequest request, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        var rows = await StoredProcedureExecutor.QueryAsync<GstApiLogResponse>(connection, "sp_GstApiLog_GetList", request, cancellationToken);
        return new PagedResult<GstApiLogResponse>(rows, request.PageNumber, request.PageSize, rows.FirstOrDefault()?.TotalCount ?? 0);
    }

    public async Task AddApiLogAsync(AddGstApiLogRequest request, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        var result = await StoredProcedureExecutor.ExecuteStatusAsync(connection, "sp_GstApiLog_Create", request, cancellationToken);
        if (!result.Succeeded)
        {
            throw new CosmosException(result.Message, result.StatusCode);
        }
    }

    private static DynamicParameters RegistrationParameters(CreateCompanyGstRegistrationRequest request, long? userId)
    {
        var parameters = new DynamicParameters(request);
        parameters.Add("UserId", userId);
        return parameters;
    }

    private static DynamicParameters RegistrationParameters(UpdateCompanyGstRegistrationRequest request, long? userId)
    {
        var parameters = new DynamicParameters(request);
        parameters.Add("UserId", userId);
        return parameters;
    }
}
