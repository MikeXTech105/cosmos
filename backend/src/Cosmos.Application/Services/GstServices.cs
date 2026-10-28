using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Application.Gst;
using Cosmos.Contracts.Audit;
using Cosmos.Contracts.Common;
using Cosmos.Contracts.Gst;
using Cosmos.Shared.Exceptions;
using Cosmos.Shared.Responses;
using Cosmos.Shared.Security;
using FluentValidation;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace Cosmos.Application.Services;

public sealed class GstRegistrationService : IGstRegistrationService
{
    private readonly IGstRepository _repository;
    private readonly IGstVerificationService _verificationService;
    private readonly IAuditRepository _auditRepository;
    private readonly ICurrentUser _currentUser;
    private readonly IValidator<CreateCompanyGstRegistrationRequest> _createValidator;
    private readonly IValidator<UpdateCompanyGstRegistrationRequest> _updateValidator;
    private readonly IValidator<CompanyGstRegistrationListRequest> _listValidator;

    public GstRegistrationService(
        IGstRepository repository,
        IGstVerificationService verificationService,
        IAuditRepository auditRepository,
        ICurrentUser currentUser,
        IValidator<CreateCompanyGstRegistrationRequest> createValidator,
        IValidator<UpdateCompanyGstRegistrationRequest> updateValidator,
        IValidator<CompanyGstRegistrationListRequest> listValidator)
    {
        _repository = repository;
        _verificationService = verificationService;
        _auditRepository = auditRepository;
        _currentUser = currentUser;
        _createValidator = createValidator;
        _updateValidator = updateValidator;
        _listValidator = listValidator;
    }

    private long? UserId => _currentUser.UserId;
    private int? AuditUserId => UserId is null ? null : checked((int)UserId.Value);

    public async Task<ApiResponse<PagedResult<CompanyGstRegistrationResponse>>> GetListAsync(CompanyGstRegistrationListRequest request, CancellationToken cancellationToken)
    {
        await ValidationRunner.ValidateAsync(_listValidator, request, cancellationToken);
        return ApiResponse<PagedResult<CompanyGstRegistrationResponse>>.Success(await _repository.GetRegistrationsAsync(request, cancellationToken));
    }

    public async Task<ApiResponse<CompanyGstRegistrationResponse>> GetByIdAsync(long id, CancellationToken cancellationToken) =>
        ApiResponse<CompanyGstRegistrationResponse>.Success(await GetRegistrationAsync(id, cancellationToken));

    public async Task<ApiResponse<CompanyGstRegistrationResponse>> CreateAsync(CreateCompanyGstRegistrationRequest request, CancellationToken cancellationToken)
    {
        await ValidationRunner.ValidateAsync(_createValidator, request, cancellationToken);
        var created = await _repository.CreateRegistrationAsync(request, UserId, cancellationToken);
        await AuditAsync(created.Id, "Create", null, created, cancellationToken);
        return ApiResponse<CompanyGstRegistrationResponse>.Success(created, "GST registration created.");
    }

    public async Task<ApiResponse<CompanyGstRegistrationResponse>> UpdateAsync(long id, UpdateCompanyGstRegistrationRequest request, CancellationToken cancellationToken)
    {
        await ValidationRunner.ValidateAsync(_updateValidator, request, cancellationToken);
        if (await _repository.GstinExistsAsync(request.Gstin, id, cancellationToken))
        {
            throw new CosmosException("GSTIN already exists.", 409);
        }

        var old = await GetRegistrationAsync(id, cancellationToken);
        var updated = await _repository.UpdateRegistrationAsync(id, request, UserId, cancellationToken);
        await AuditAsync(id, "Update", old, updated, cancellationToken);
        return ApiResponse<CompanyGstRegistrationResponse>.Success(updated, "GST registration updated.");
    }

    public async Task<ApiResponse> DeleteAsync(long id, CancellationToken cancellationToken)
    {
        var old = await GetRegistrationAsync(id, cancellationToken);
        await _repository.DeleteRegistrationAsync(id, UserId, cancellationToken);
        await AuditAsync(id, "Delete", old, null, cancellationToken);
        return ApiResponse.Success("GST registration deleted.");
    }

    public async Task<ApiResponse<CompanyGstRegistrationResponse>> VerifyAsync(long id, CancellationToken cancellationToken)
    {
        var registration = await GetRegistrationAsync(id, cancellationToken);
        var verification = await _verificationService.VerifyAsync(new VerifyGstinRequest(registration.Gstin, true), cancellationToken);
        var updated = await _repository.UpdateRegistrationVerificationAsync(id, verification.Data!, UserId, cancellationToken);
        await AuditAsync(id, "Verify", registration, updated, cancellationToken);
        return ApiResponse<CompanyGstRegistrationResponse>.Success(updated, "GST registration verified.");
    }

    public async Task<ApiResponse<CompanyGstRegistrationResponse>> SetDefaultAsync(long id, SetDefaultCompanyGstRegistrationRequest request, CancellationToken cancellationToken)
    {
        var old = await GetRegistrationAsync(id, cancellationToken);
        var updated = await _repository.SetDefaultRegistrationAsync(id, request.CompanyId ?? old.CompanyId, UserId, cancellationToken);
        await AuditAsync(id, "SetDefault", old, updated, cancellationToken);
        return ApiResponse<CompanyGstRegistrationResponse>.Success(updated, "Default GST registration updated.");
    }

    private async Task<CompanyGstRegistrationResponse> GetRegistrationAsync(long id, CancellationToken cancellationToken) =>
        await _repository.GetRegistrationByIdAsync(id, cancellationToken) ?? throw new NotFoundException("GST registration was not found.");

    private Task AuditAsync(long id, string action, object? before, object? after, CancellationToken cancellationToken) =>
        _auditRepository.AddAsync(
            new AuditEntryRequest(
                "CompanyGstRegistrations",
                id.ToString(),
                action,
                before is null ? null : AuditSerializer.Serialize(before),
                after is null ? null : AuditSerializer.Serialize(after),
                AuditUserId),
            cancellationToken);
}

public sealed class GstVerificationService : IGstVerificationService
{
    private readonly IGstRepository _repository;
    private readonly IGstZenProviderService _provider;
    private readonly ICurrentUser _currentUser;
    private readonly IValidator<VerifyGstinRequest> _validator;

    public GstVerificationService(IGstRepository repository, IGstZenProviderService provider, ICurrentUser currentUser, IValidator<VerifyGstinRequest> validator)
    {
        _repository = repository;
        _provider = provider;
        _currentUser = currentUser;
        _validator = validator;
    }

    public async Task<ApiResponse<GstinVerificationResponse>> VerifyAsync(VerifyGstinRequest request, CancellationToken cancellationToken)
    {
        await ValidationRunner.ValidateAsync(_validator, request, cancellationToken);
        if (!request.ForceRefresh)
        {
            var cached = await _repository.GetCachedVerificationAsync(request.Gstin, cancellationToken);
            if (cached is not null)
            {
                return ApiResponse<GstinVerificationResponse>.Success(cached, "GSTIN verification loaded from cache.");
            }
        }

        var response = await _provider.VerifyGstinAsync(request, null, cancellationToken);
        var saved = await _repository.SaveVerificationLogAsync(response, _currentUser.UserId, cancellationToken);
        return ApiResponse<GstinVerificationResponse>.Success(saved, "GSTIN verified.");
    }
}

public sealed class EWayBillService : IEWayBillService
{
    private readonly IGstRepository _repository;
    private readonly IGstZenProviderService _provider;
    private readonly ICurrentUser _currentUser;
    private readonly IValidator<GenerateEWayBillRequest> _generateValidator;
    private readonly IValidator<CancelEWayBillRequest> _cancelValidator;
    private readonly IValidator<UpdateEWayBillVehicleRequest> _vehicleValidator;
    private readonly IValidator<ExtendEWayBillRequest> _extendValidator;
    private readonly IValidator<GetEWayBillDetailsRequest> _detailsValidator;

    public EWayBillService(
        IGstRepository repository,
        IGstZenProviderService provider,
        ICurrentUser currentUser,
        IValidator<GenerateEWayBillRequest> generateValidator,
        IValidator<CancelEWayBillRequest> cancelValidator,
        IValidator<UpdateEWayBillVehicleRequest> vehicleValidator,
        IValidator<ExtendEWayBillRequest> extendValidator,
        IValidator<GetEWayBillDetailsRequest> detailsValidator)
    {
        _repository = repository;
        _provider = provider;
        _currentUser = currentUser;
        _generateValidator = generateValidator;
        _cancelValidator = cancelValidator;
        _vehicleValidator = vehicleValidator;
        _extendValidator = extendValidator;
        _detailsValidator = detailsValidator;
    }

    public Task<ApiResponse<EWayBillResponse>> GenerateAsync(GenerateEWayBillRequest request, CancellationToken cancellationToken)
    {
        // RequestJson is client-controlled. It must never be sent to the provider as a
        // government-document payload. The future server-side workflow will replace this
        // endpoint with snapshot-bound request creation and reconciliation.
        GstGenerationSafety.ThrowUnavailable("E-Way Bill");
        return Task.FromResult(ApiResponse<EWayBillResponse>.Failure("Unreachable."));
    }

    public async Task<ApiResponse<EWayBillResponse>> CancelAsync(CancelEWayBillRequest request, CancellationToken cancellationToken)
    {
        await ValidationRunner.ValidateAsync(_cancelValidator, request, cancellationToken);
        await EnsureRegistrationAsync(request.CompanyGstRegistrationId, x => x.IsEWayBillEnabled, "E-Way Bill is not enabled for the selected GST registration.", cancellationToken);
        _ = await _repository.GetEWayBillByNumberAsync(request.EWayBillNumber, cancellationToken) ?? throw new NotFoundException("E-Way Bill was not found or has not been generated.");
        var providerResponse = await _provider.CancelEWayBillAsync(request, cancellationToken);
        var saved = await _repository.UpdateEWayBillStatusAsync(request, providerResponse, _currentUser.UserId, cancellationToken);
        return ApiResponse<EWayBillResponse>.Success(saved, "E-Way Bill cancelled.");
    }

    public async Task<ApiResponse<EWayBillResponse>> UpdateVehicleAsync(UpdateEWayBillVehicleRequest request, CancellationToken cancellationToken)
    {
        await ValidationRunner.ValidateAsync(_vehicleValidator, request, cancellationToken);
        await EnsureRegistrationAsync(request.CompanyGstRegistrationId, x => x.IsEWayBillEnabled, "E-Way Bill is not enabled for the selected GST registration.", cancellationToken);
        var response = await _provider.UpdateEWayBillVehicleAsync(request, cancellationToken);
        return ApiResponse<EWayBillResponse>.Success(response, "E-Way Bill vehicle updated.");
    }

    public async Task<ApiResponse<EWayBillResponse>> ExtendAsync(ExtendEWayBillRequest request, CancellationToken cancellationToken)
    {
        await ValidationRunner.ValidateAsync(_extendValidator, request, cancellationToken);
        var registration=await EnsureRegistrationAsync(request.CompanyGstRegistrationId, x => x.IsEWayBillEnabled, "E-Way Bill is not enabled for the selected GST registration.", cancellationToken);
        var stored=await StoredBill(request.CompanyGstRegistrationId,request.EWayBillNumber,cancellationToken);
        var intent=request with { Gstin=registration.Gstin,RequestJson=null };
        var fingerprint=SHA256.HashData(Encoding.UTF8.GetBytes(JsonSerializer.Serialize(intent)));
        var prior=await _provider.GetEWayBillAsync(new GetEWayBillDetailsRequest(registration.Id,request.EWayBillNumber,registration.Gstin),cancellationToken);
        if(prior.EWayBillNumber!=request.EWayBillNumber || !IsActive(prior.Status) || prior.ValidUpTo is null) throw new ConflictException("Refresh an explicitly active provider record with a known validity before extending it.");
        if(prior.Distance.HasValue && int.Parse(request.RemainingDistance!)>prior.Distance.Value) throw new CosmosException("Remaining distance cannot exceed the provider's original distance.");
        var command=await _repository.ReserveEWayExtensionAsync(intent,fingerprint,prior.ValidUpTo,_currentUser.UserId,cancellationToken);
        if(!command.IsNew)
        {
            if(command.State=="Confirmed") return ApiResponse<EWayBillResponse>.Success(stored,"The previously confirmed extension is already saved.");
            throw new ConflictException("This extension already has a pending or unknown outcome. Reconcile its command instead of submitting again.",data:new { commandKey=request.IdempotencyKey,reconcileRequired=true });
        }
        try
        {
            var response=await _provider.ExtendEWayBillAsync(intent,cancellationToken);
            if(response.EWayBillNumber!=request.EWayBillNumber || response.ValidUpTo is null || response.ValidUpTo<=prior.ValidUpTo) throw new CosmosException("Provider did not confirm this document's later validity; reconcile before another submission.",502);
            var saved=await _repository.CompleteEWayExtensionAsync(command.IdempotencyKey,response,true,_currentUser.UserId,cancellationToken);
            return ApiResponse<EWayBillResponse>.Success(saved,"E-Way Bill extension confirmed and saved.");
        }
        catch(CosmosException rejection) when(rejection.ResponseData is GstProviderRejection)
        {
            await _repository.CompleteEWayExtensionAsync(command.IdempotencyKey,null,false,_currentUser.UserId,CancellationToken.None,rejected:true);
            throw;
        }
        catch
        {
            // Persist the uncertain intent even when the caller disconnects. Never replay it automatically.
            try { await _repository.CompleteEWayExtensionAsync(command.IdempotencyKey,null,false,_currentUser.UserId,CancellationToken.None); }
            catch { /* The committed InProgress reservation also blocks any replay if the database is temporarily unavailable. */ }
            throw new ConflictException("The extension outcome requires provider reconciliation. Do not submit it again.",data:new { commandKey=command.IdempotencyKey,reconcileRequired=true,retrySafe=false });
        }
    }

    public async Task<ApiResponse<EWayBillResponse>> ReconcileExtensionAsync(Guid idempotencyKey,CancellationToken cancellationToken)
    {
        var command=await _repository.GetEWayExtensionAsync(idempotencyKey,cancellationToken)??throw new NotFoundException("Extension command was not found.");
        var registration=await EnsureRegistrationAsync(command.CompanyGstRegistrationId,x=>x.IsEWayBillEnabled,"E-Way Bill is not enabled for this registration.",cancellationToken);
        var stored=await StoredBill(command.CompanyGstRegistrationId,command.EWayBillNumber,cancellationToken);
        if(command.State=="Confirmed") return ApiResponse<EWayBillResponse>.Success(stored,"Confirmed extension loaded.");
        if(command.State=="Rejected") throw new CosmosException("The provider rejected this extension. Review and correct the details before starting a new command.",409,data:new GstProviderRejection());
        var current=await _provider.GetEWayBillAsync(new GetEWayBillDetailsRequest(command.CompanyGstRegistrationId,command.EWayBillNumber,registration.Gstin),cancellationToken);
        if(current.EWayBillNumber!=command.EWayBillNumber || !IsActive(current.Status) || current.ValidUpTo is null || current.ValidUpTo<=command.PriorValidUpTo) throw new ConflictException("Provider readback has not confirmed a later validity. This command remains unresolved; do not resubmit it.");
        var saved=await _repository.CompleteEWayExtensionAsync(command.IdempotencyKey,current,true,_currentUser.UserId,cancellationToken);
        return ApiResponse<EWayBillResponse>.Success(saved,"Provider readback confirmed the later validity and the extension was reconciled.");
    }

    private async Task<EWayBillResponse> StoredBill(long registrationId,string number,CancellationToken ct)
    {
        var stored=await _repository.GetEWayBillByNumberAsync(number,ct)??throw new NotFoundException("E-Way Bill was not found.");
        if(stored.CompanyGstRegistrationId!=registrationId) throw new ConflictException("The stored E-Way Bill belongs to another GST registration.");
        return stored;
    }
    private static bool IsActive(string status)=>status is "ACT" or "Active" or "Generated" or "Extended" or "VehicleUpdated";

    public async Task<ApiResponse<EWayBillResponse>> GetByNumberAsync(string ewayBillNumber, CancellationToken cancellationToken) =>
        ApiResponse<EWayBillResponse>.Success(await _repository.GetEWayBillByNumberAsync(ewayBillNumber, cancellationToken) ?? throw new NotFoundException("E-Way Bill was not found."));

    public async Task<ApiResponse<EWayBillResponse>> GetDetailsAsync(GetEWayBillDetailsRequest request, CancellationToken cancellationToken)
    {
        await ValidationRunner.ValidateAsync(_detailsValidator, request, cancellationToken);
        var registration=await EnsureRegistrationAsync(request.CompanyGstRegistrationId, x => x.IsEWayBillEnabled, "E-Way Bill is not enabled for the selected GST registration.", cancellationToken);
        await StoredBill(request.CompanyGstRegistrationId,request.EWayBillNumber,cancellationToken);
        return ApiResponse<EWayBillResponse>.Success(await _provider.GetEWayBillAsync(request with { Gstin=registration.Gstin }, cancellationToken), "E-Way Bill details loaded from GSTZen.");
    }

    private async Task<CompanyGstRegistrationResponse> EnsureRegistrationAsync(long id, Func<CompanyGstRegistrationResponse, bool> enabled, string disabledMessage, CancellationToken cancellationToken)
    {
        var registration = await _repository.GetRegistrationByIdAsync(id, cancellationToken) ?? throw new NotFoundException("GST registration was not found.");
        if (!enabled(registration))
        {
            throw new CosmosException(disabledMessage, 409);
        }
        return registration;
    }
}

public sealed class EInvoiceService : IEInvoiceService
{
    private readonly IGstRepository _repository;
    private readonly IGstZenProviderService _provider;
    private readonly ICurrentUser _currentUser;
    private readonly IValidator<GenerateEInvoiceRequest> _generateValidator;
    private readonly IValidator<CancelEInvoiceRequest> _cancelValidator;
    private readonly IValidator<GetEInvoiceDetailsRequest> _detailsValidator;

    public EInvoiceService(IGstRepository repository, IGstZenProviderService provider, ICurrentUser currentUser, IValidator<GenerateEInvoiceRequest> generateValidator, IValidator<CancelEInvoiceRequest> cancelValidator, IValidator<GetEInvoiceDetailsRequest> detailsValidator)
    {
        _repository = repository;
        _provider = provider;
        _currentUser = currentUser;
        _generateValidator = generateValidator;
        _cancelValidator = cancelValidator;
        _detailsValidator = detailsValidator;
    }

    public Task<ApiResponse<EInvoiceResponse>> GenerateAsync(GenerateEInvoiceRequest request, CancellationToken cancellationToken)
    {
        // RequestJson is client-controlled. It must never be sent to the provider as a
        // government-document payload. The future server-side workflow will replace this
        // endpoint with snapshot-bound request creation and reconciliation.
        GstGenerationSafety.ThrowUnavailable("E-Invoice");
        return Task.FromResult(ApiResponse<EInvoiceResponse>.Failure("Unreachable."));
    }

    public async Task<ApiResponse<EInvoiceResponse>> CancelAsync(CancelEInvoiceRequest request, CancellationToken cancellationToken)
    {
        await ValidationRunner.ValidateAsync(_cancelValidator, request, cancellationToken);
        await EnsureEInvoiceEnabledAsync(request.CompanyGstRegistrationId, cancellationToken);
        _ = await _repository.GetEInvoiceByIrnAsync(request.Irn, cancellationToken) ?? throw new NotFoundException("E-Invoice was not found or does not have an IRN.");
        var providerResponse = await _provider.CancelEInvoiceAsync(request, cancellationToken);
        var saved = await _repository.UpdateEInvoiceStatusAsync(request, providerResponse, _currentUser.UserId, cancellationToken);
        return ApiResponse<EInvoiceResponse>.Success(saved, "E-Invoice cancelled.");
    }

    public async Task<ApiResponse<EInvoiceResponse>> GetByIrnAsync(string irn, CancellationToken cancellationToken) =>
        ApiResponse<EInvoiceResponse>.Success(await _repository.GetEInvoiceByIrnAsync(irn, cancellationToken) ?? throw new NotFoundException("E-Invoice was not found."));

    public async Task<ApiResponse<EInvoiceResponse>> GetDetailsAsync(GetEInvoiceDetailsRequest request, CancellationToken cancellationToken)
    {
        await ValidationRunner.ValidateAsync(_detailsValidator, request, cancellationToken);
        var registration = await EnsureEInvoiceEnabledAsync(request.CompanyGstRegistrationId, cancellationToken);
        var providerRequest = request.SellerGstin is null ? request with { SellerGstin = registration.Gstin } : request;
        return ApiResponse<EInvoiceResponse>.Success(await _provider.GetEInvoiceAsync(providerRequest, cancellationToken), "E-Invoice details loaded from GSTZen.");
    }

    private async Task<CompanyGstRegistrationResponse> EnsureEInvoiceEnabledAsync(long id, CancellationToken cancellationToken)
    {
        var registration = await _repository.GetRegistrationByIdAsync(id, cancellationToken) ?? throw new NotFoundException("GST registration was not found.");
        if (!registration.IsEInvoiceEnabled)
        {
            throw new CosmosException("E-Invoice is not enabled for the selected GST registration.", 409);
        }

        return registration;
    }
}

public sealed class GstSessionService : IGstSessionService
{
    private readonly IGstRepository _repository;
    private readonly IGstZenProviderService _provider;
    private readonly ICurrentUser _currentUser;
    private readonly IValidator<GenerateGstOtpRequest> _otpValidator;
    private readonly IValidator<AuthenticateGstOtpRequest> _authValidator;

    public GstSessionService(IGstRepository repository, IGstZenProviderService provider, ICurrentUser currentUser, IValidator<GenerateGstOtpRequest> otpValidator, IValidator<AuthenticateGstOtpRequest> authValidator)
    {
        _repository = repository;
        _provider = provider;
        _currentUser = currentUser;
        _otpValidator = otpValidator;
        _authValidator = authValidator;
    }

    public async Task<ApiResponse<GstSessionResponse>> GenerateOtpAsync(GenerateGstOtpRequest request, CancellationToken cancellationToken)
    {
        await ValidationRunner.ValidateAsync(_otpValidator, request, cancellationToken);
        var registration = await EnsureRegistrationAsync(request.CompanyGstRegistrationId, cancellationToken);
        var username = request.GstPortalUsername?.Trim() ?? registration.GstPortalUsername?.Trim();
        if (string.IsNullOrWhiteSpace(username)) throw new CosmosException("Enter the GST portal username for this registration.");
        var response = await _provider.GenerateOtpAsync(request with { Gstin = registration.Gstin, GstPortalUsername = username }, cancellationToken);
        var saved = await _repository.SaveSessionAsync(request.CompanyGstRegistrationId, response, null, null, _currentUser.UserId, cancellationToken);
        return ApiResponse<GstSessionResponse>.Success(saved, "GST OTP generated.");
    }

    public async Task<ApiResponse<GstSessionResponse>> AuthenticateOtpAsync(AuthenticateGstOtpRequest request, CancellationToken cancellationToken)
    {
        await ValidationRunner.ValidateAsync(_authValidator, request, cancellationToken);
        var registration = await EnsureRegistrationAsync(request.CompanyGstRegistrationId, cancellationToken);
        var response = await _provider.AuthenticateOtpAsync(request with { Gstin = registration.Gstin, RequestJson = null }, cancellationToken);
        var saved = await _repository.SaveSessionAsync(request.CompanyGstRegistrationId, response, null, null, _currentUser.UserId, cancellationToken);
        return ApiResponse<GstSessionResponse>.Success(saved, "GST OTP authenticated.");
    }

    public async Task<ApiResponse<GstSessionResponse>> GetStatusAsync(long companyGstRegistrationId, CancellationToken cancellationToken) =>
        ApiResponse<GstSessionResponse>.Success(await _repository.GetSessionAsync(companyGstRegistrationId, cancellationToken) ?? throw new NotFoundException("GST session was not found."));

    private async Task<CompanyGstRegistrationResponse> EnsureRegistrationAsync(long id, CancellationToken cancellationToken)
    {
        var registration = await _repository.GetRegistrationByIdAsync(id, cancellationToken) ?? throw new NotFoundException("GST registration was not found.");
        if (!string.Equals(registration.Status,"Active",StringComparison.OrdinalIgnoreCase)) throw new CosmosException("Activate the selected GST registration before starting a session.",409);
        return registration;
    }
}

public sealed class GstApiLogService : IGstApiLogService
{
    private readonly IGstRepository _repository;
    private readonly IValidator<GstApiLogListRequest> _listValidator;

    public GstApiLogService(IGstRepository repository, IValidator<GstApiLogListRequest> listValidator)
    {
        _repository = repository;
        _listValidator = listValidator;
    }

    public async Task<ApiResponse<PagedResult<GstApiLogResponse>>> GetListAsync(GstApiLogListRequest request, CancellationToken cancellationToken)
    {
        await ValidationRunner.ValidateAsync(_listValidator, request, cancellationToken);
        return ApiResponse<PagedResult<GstApiLogResponse>>.Success(await _repository.GetApiLogsAsync(request, cancellationToken));
    }

    public Task AddAsync(AddGstApiLogRequest request, CancellationToken cancellationToken) =>
        _repository.AddApiLogAsync(request, cancellationToken);
}
