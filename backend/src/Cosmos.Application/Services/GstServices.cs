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

    public EWayBillService(
        IGstRepository repository,
        IGstZenProviderService provider,
        ICurrentUser currentUser,
        IValidator<GenerateEWayBillRequest> generateValidator,
        IValidator<CancelEWayBillRequest> cancelValidator,
        IValidator<UpdateEWayBillVehicleRequest> vehicleValidator,
        IValidator<ExtendEWayBillRequest> extendValidator)
    {
        _repository = repository;
        _provider = provider;
        _currentUser = currentUser;
        _generateValidator = generateValidator;
        _cancelValidator = cancelValidator;
        _vehicleValidator = vehicleValidator;
        _extendValidator = extendValidator;
    }

    public async Task<ApiResponse<EWayBillResponse>> GenerateAsync(GenerateEWayBillRequest request, CancellationToken cancellationToken)
    {
        await ValidationRunner.ValidateAsync(_generateValidator, request, cancellationToken);
        await EnsureRegistrationAsync(request.CompanyGstRegistrationId, x => x.IsEWayBillEnabled, "E-Way Bill is not enabled for the selected GST registration.", cancellationToken);
        var providerResponse = await _provider.GenerateEWayBillAsync(request, cancellationToken);
        var saved = await _repository.SaveEWayBillAsync(request, providerResponse, _currentUser.UserId, cancellationToken);
        return ApiResponse<EWayBillResponse>.Success(saved, "E-Way Bill generated.");
    }

    public async Task<ApiResponse<EWayBillResponse>> CancelAsync(CancelEWayBillRequest request, CancellationToken cancellationToken)
    {
        await ValidationRunner.ValidateAsync(_cancelValidator, request, cancellationToken);
        await EnsureRegistrationAsync(request.CompanyGstRegistrationId, x => x.IsEWayBillEnabled, "E-Way Bill is not enabled for the selected GST registration.", cancellationToken);
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
        await EnsureRegistrationAsync(request.CompanyGstRegistrationId, x => x.IsEWayBillEnabled, "E-Way Bill is not enabled for the selected GST registration.", cancellationToken);
        var response = await _provider.ExtendEWayBillAsync(request, cancellationToken);
        return ApiResponse<EWayBillResponse>.Success(response, "E-Way Bill extended.");
    }

    public async Task<ApiResponse<EWayBillResponse>> GetByNumberAsync(string ewayBillNumber, CancellationToken cancellationToken) =>
        ApiResponse<EWayBillResponse>.Success(await _repository.GetEWayBillByNumberAsync(ewayBillNumber, cancellationToken) ?? throw new NotFoundException("E-Way Bill was not found."));

    private async Task EnsureRegistrationAsync(long id, Func<CompanyGstRegistrationResponse, bool> enabled, string disabledMessage, CancellationToken cancellationToken)
    {
        var registration = await _repository.GetRegistrationByIdAsync(id, cancellationToken) ?? throw new NotFoundException("GST registration was not found.");
        if (!enabled(registration))
        {
            throw new CosmosException(disabledMessage, 409);
        }
    }
}

public sealed class EInvoiceService : IEInvoiceService
{
    private readonly IGstRepository _repository;
    private readonly IGstZenProviderService _provider;
    private readonly ICurrentUser _currentUser;
    private readonly IValidator<GenerateEInvoiceRequest> _generateValidator;
    private readonly IValidator<CancelEInvoiceRequest> _cancelValidator;

    public EInvoiceService(IGstRepository repository, IGstZenProviderService provider, ICurrentUser currentUser, IValidator<GenerateEInvoiceRequest> generateValidator, IValidator<CancelEInvoiceRequest> cancelValidator)
    {
        _repository = repository;
        _provider = provider;
        _currentUser = currentUser;
        _generateValidator = generateValidator;
        _cancelValidator = cancelValidator;
    }

    public async Task<ApiResponse<EInvoiceResponse>> GenerateAsync(GenerateEInvoiceRequest request, CancellationToken cancellationToken)
    {
        await ValidationRunner.ValidateAsync(_generateValidator, request, cancellationToken);
        await EnsureEInvoiceEnabledAsync(request.CompanyGstRegistrationId, cancellationToken);
        var providerResponse = await _provider.GenerateEInvoiceAsync(request, cancellationToken);
        var saved = await _repository.SaveEInvoiceAsync(request, providerResponse, _currentUser.UserId, cancellationToken);
        return ApiResponse<EInvoiceResponse>.Success(saved, "E-Invoice generated.");
    }

    public async Task<ApiResponse<EInvoiceResponse>> CancelAsync(CancelEInvoiceRequest request, CancellationToken cancellationToken)
    {
        await ValidationRunner.ValidateAsync(_cancelValidator, request, cancellationToken);
        await EnsureEInvoiceEnabledAsync(request.CompanyGstRegistrationId, cancellationToken);
        var providerResponse = await _provider.CancelEInvoiceAsync(request, cancellationToken);
        var saved = await _repository.UpdateEInvoiceStatusAsync(request, providerResponse, _currentUser.UserId, cancellationToken);
        return ApiResponse<EInvoiceResponse>.Success(saved, "E-Invoice cancelled.");
    }

    public async Task<ApiResponse<EInvoiceResponse>> GetByIrnAsync(string irn, CancellationToken cancellationToken) =>
        ApiResponse<EInvoiceResponse>.Success(await _repository.GetEInvoiceByIrnAsync(irn, cancellationToken) ?? throw new NotFoundException("E-Invoice was not found."));

    private async Task EnsureEInvoiceEnabledAsync(long id, CancellationToken cancellationToken)
    {
        var registration = await _repository.GetRegistrationByIdAsync(id, cancellationToken) ?? throw new NotFoundException("GST registration was not found.");
        if (!registration.IsEInvoiceEnabled)
        {
            throw new CosmosException("E-Invoice is not enabled for the selected GST registration.", 409);
        }
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
        await EnsureRegistrationAsync(request.CompanyGstRegistrationId, cancellationToken);
        var response = await _provider.GenerateOtpAsync(request, cancellationToken);
        var saved = await _repository.SaveSessionAsync(request.CompanyGstRegistrationId, response, null, null, _currentUser.UserId, cancellationToken);
        return ApiResponse<GstSessionResponse>.Success(saved, "GST OTP generated.");
    }

    public async Task<ApiResponse<GstSessionResponse>> AuthenticateOtpAsync(AuthenticateGstOtpRequest request, CancellationToken cancellationToken)
    {
        await ValidationRunner.ValidateAsync(_authValidator, request, cancellationToken);
        await EnsureRegistrationAsync(request.CompanyGstRegistrationId, cancellationToken);
        var response = await _provider.AuthenticateOtpAsync(request, cancellationToken);
        var saved = await _repository.SaveSessionAsync(request.CompanyGstRegistrationId, response, null, null, _currentUser.UserId, cancellationToken);
        return ApiResponse<GstSessionResponse>.Success(saved, "GST OTP authenticated.");
    }

    public async Task<ApiResponse<GstSessionResponse>> GetStatusAsync(long companyGstRegistrationId, CancellationToken cancellationToken) =>
        ApiResponse<GstSessionResponse>.Success(await _repository.GetSessionAsync(companyGstRegistrationId, cancellationToken) ?? throw new NotFoundException("GST session was not found."));

    private async Task EnsureRegistrationAsync(long id, CancellationToken cancellationToken)
    {
        if (await _repository.GetRegistrationByIdAsync(id, cancellationToken) is null)
        {
            throw new NotFoundException("GST registration was not found.");
        }
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
