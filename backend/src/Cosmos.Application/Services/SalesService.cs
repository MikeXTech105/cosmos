using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Application.Sales;
using Cosmos.Contracts.Audit;
using Cosmos.Contracts.Common;
using Cosmos.Contracts.Sales;
using Cosmos.Shared.Exceptions;
using Cosmos.Shared.Responses;
using Cosmos.Shared.Security;
using FluentValidation;
using Microsoft.Extensions.Logging;

namespace Cosmos.Application.Services;

public sealed class SalesService : ISalesService
{
    private readonly ISalesRepository _repository;
    private readonly IGstRepository _gstRepository;
    private readonly IAuditRepository _auditRepository;
    private readonly ICurrentUser _currentUser;
    private readonly ISalesCalculationService _calculationService;
    private readonly ISalesInvoiceScopeAuthorizer _scopeAuthorizer;
    private readonly ILogger<SalesService> _logger;
    private readonly IValidator<CreateSalesInvoiceCommand> _createValidator;
    private readonly IValidator<UpdateSalesInvoiceCommand> _updateValidator;
    private readonly IValidator<AddSalesPaymentCommand> _paymentValidator;
    private readonly IValidator<GetSalesInvoicesQuery> _listValidator;

    public SalesService(
        ISalesRepository repository,
        IGstRepository gstRepository,
        IAuditRepository auditRepository,
        ICurrentUser currentUser,
        ISalesCalculationService calculationService,
        ISalesInvoiceScopeAuthorizer scopeAuthorizer,
        ILogger<SalesService> logger,
        IValidator<CreateSalesInvoiceCommand> createValidator,
        IValidator<UpdateSalesInvoiceCommand> updateValidator,
        IValidator<AddSalesPaymentCommand> paymentValidator,
        IValidator<GetSalesInvoicesQuery> listValidator)
    {
        _repository = repository;
        _gstRepository = gstRepository;
        _auditRepository = auditRepository;
        _currentUser = currentUser;
        _calculationService = calculationService;
        _scopeAuthorizer = scopeAuthorizer;
        _logger = logger;
        _createValidator = createValidator;
        _updateValidator = updateValidator;
        _paymentValidator = paymentValidator;
        _listValidator = listValidator;
    }

    private long? UserId => _currentUser.UserId;

    private int? AuditUserId => UserId is null ? null : checked((int)UserId.Value);

    public async Task<ApiResponse<SalesInvoiceDetailDto>> GetByIdAsync(GetSalesInvoiceByIdQuery query, CancellationToken cancellationToken)
    {
        var invoice = await _repository.GetByIdAsync(query.Id, cancellationToken) ?? throw new NotFoundException("Sales invoice was not found.");
        await _scopeAuthorizer.DemandReadAsync(invoice, cancellationToken);
        return ApiResponse<SalesInvoiceDetailDto>.Success(invoice);
    }

    public async Task<ApiResponse<PagedResult<SalesInvoiceDto>>> GetListAsync(GetSalesInvoicesQuery query, CancellationToken cancellationToken)
    {
        await ValidationRunner.ValidateAsync(_listValidator, query, cancellationToken);
        var result = await _repository.GetListAsync(query, cancellationToken);
        var visible = new List<SalesInvoiceDto>();
        foreach (var invoice in result.Items)
        {
            try { await _scopeAuthorizer.DemandReadAsync(invoice, cancellationToken); visible.Add(invoice); }
            catch (NotFoundException) { /* Cross-scope rows are deliberately invisible. */ }
        }
        return ApiResponse<PagedResult<SalesInvoiceDto>>.Success(new PagedResult<SalesInvoiceDto>(visible, result.PageNumber, result.PageSize, visible.Count));
    }

    public async Task<ApiResponse<SalesInvoiceDetailDto>> CreateAsync(CreateSalesInvoiceCommand command, CancellationToken cancellationToken)
    {
        await ValidationRunner.ValidateAsync(_createValidator, command, cancellationToken);
        await _scopeAuthorizer.DemandCreateOrUpdateAsync(command.CompanyId, command.BranchId, cancellationToken);
        await ValidateRegistrationAsync(command.CompanyGstRegistrationId, cancellationToken);
        _calculationService.CalculateInvoiceTotals(command.Items, command.DiscountAmount, command.InitialPayment?.Amount ?? 0m);
        var created = await _repository.CreateAsync(command, UserId, cancellationToken);
        await AuditAsync(created.Id, "Create", null, created, cancellationToken);
        _logger.LogInformation("Created sales invoice {SalesInvoiceId} {InvoiceNumber}.", created.Id, created.InvoiceNumber);
        return ApiResponse<SalesInvoiceDetailDto>.Success(created, "Sales invoice created.");
    }

    public async Task<ApiResponse<SalesInvoiceDetailDto>> UpdateAsync(long id, UpdateSalesInvoiceCommand command, CancellationToken cancellationToken)
    {
        await ValidationRunner.ValidateAsync(_updateValidator, command, cancellationToken);
        _calculationService.CalculateInvoiceTotals(command.Items, command.DiscountAmount, 0m);
        var old = await _repository.GetByIdAsync(id, cancellationToken) ?? throw new NotFoundException("Sales invoice was not found.");
        await _scopeAuthorizer.DemandReadAsync(old, cancellationToken);
        await _scopeAuthorizer.DemandCreateOrUpdateAsync(command.CompanyId, command.BranchId, cancellationToken);
        await ValidateRegistrationAsync(command.CompanyGstRegistrationId, cancellationToken);
        var updated = await _repository.UpdateAsync(id, command, UserId, cancellationToken);
        await AuditAsync(id, "Update", old, updated, cancellationToken);
        return ApiResponse<SalesInvoiceDetailDto>.Success(updated, "Sales invoice updated.");
    }

    public async Task<ApiResponse<SalesInvoiceDetailDto>> ConfirmAsync(long id, CancellationToken cancellationToken)
    {
        var old = await _repository.GetByIdAsync(id, cancellationToken) ?? throw new NotFoundException("Sales invoice was not found.");
        await _scopeAuthorizer.DemandReadAsync(old, cancellationToken);
        var updated = await _repository.ConfirmAsync(id, UserId, cancellationToken);
        await AuditAsync(id, "Confirm", old, updated, cancellationToken);
        return ApiResponse<SalesInvoiceDetailDto>.Success(updated, "Sales invoice confirmed.");
    }

    public async Task<ApiResponse<SalesInvoiceDetailDto>> CancelAsync(long id, CancellationToken cancellationToken)
    {
        var old = await _repository.GetByIdAsync(id, cancellationToken) ?? throw new NotFoundException("Sales invoice was not found.");
        await _scopeAuthorizer.DemandReadAsync(old, cancellationToken);
        var updated = await _repository.CancelAsync(id, UserId, cancellationToken);
        await AuditAsync(id, "Cancel", old, updated, cancellationToken);
        return ApiResponse<SalesInvoiceDetailDto>.Success(updated, "Sales invoice cancelled.");
    }

    public async Task<ApiResponse<SalesPaymentDto>> AddPaymentAsync(long id, AddSalesPaymentCommand command, CancellationToken cancellationToken)
    {
        await ValidationRunner.ValidateAsync(_paymentValidator, command, cancellationToken);
        var invoice = await _repository.GetByIdAsync(id, cancellationToken) ?? throw new NotFoundException("Sales invoice was not found.");
        await _scopeAuthorizer.DemandReadAsync(invoice, cancellationToken);
        var created = await _repository.AddPaymentAsync(id, command, UserId, cancellationToken);
        await _auditRepository.AddAsync(new AuditEntryRequest("SalesInvoicePayments", created.Id.ToString(), "Create", null, AuditSerializer.Serialize(created), AuditUserId), cancellationToken);
        return ApiResponse<SalesPaymentDto>.Success(created, "Sales payment added.");
    }

    public async Task<ApiResponse<IReadOnlyCollection<SalesPaymentDto>>> GetPaymentsAsync(GetSalesPaymentsQuery query, CancellationToken cancellationToken)
    {
        var invoice = await _repository.GetByIdAsync(query.SalesInvoiceId, cancellationToken) ?? throw new NotFoundException("Sales invoice was not found.");
        await _scopeAuthorizer.DemandReadAsync(invoice, cancellationToken);
        return ApiResponse<IReadOnlyCollection<SalesPaymentDto>>.Success(await _repository.GetPaymentsAsync(query.SalesInvoiceId, cancellationToken));
    }

    public async Task<ApiResponse<SalesSummaryReportDto>> GetSummaryReportAsync(GetSalesSummaryReportQuery query, CancellationToken cancellationToken) =>
        ApiResponse<SalesSummaryReportDto>.Success(await _repository.GetSummaryReportAsync(query, cancellationToken));

    public async Task<ApiResponse<IReadOnlyCollection<CustomerReceivableReportDto>>> GetCustomerReceivablesAsync(GetCustomerReceivablesQuery query, CancellationToken cancellationToken) =>
        ApiResponse<IReadOnlyCollection<CustomerReceivableReportDto>>.Success(await _repository.GetCustomerReceivablesAsync(query, cancellationToken));

    public async Task<ApiResponse<IReadOnlyCollection<ItemWiseSalesReportDto>>> GetItemWiseSalesAsync(GetItemWiseSalesReportQuery query, CancellationToken cancellationToken) =>
        ApiResponse<IReadOnlyCollection<ItemWiseSalesReportDto>>.Success(await _repository.GetItemWiseSalesAsync(query, cancellationToken));

    private Task AuditAsync(long id, string action, object? before, object? after, CancellationToken cancellationToken) =>
        _auditRepository.AddAsync(
            new AuditEntryRequest(
                "SalesInvoices",
                id.ToString(),
                action,
                before is null ? null : AuditSerializer.Serialize(before),
                after is null ? null : AuditSerializer.Serialize(after),
                AuditUserId),
            cancellationToken);

    private async Task ValidateRegistrationAsync(long? registrationId, CancellationToken cancellationToken)
    {
        if (!registrationId.HasValue)
        {
            return;
        }

        var registration = await _gstRepository.GetRegistrationByIdAsync(registrationId.Value, cancellationToken)
            ?? throw new NotFoundException("Selected GST registration was not found.");

        if (!string.Equals(registration.Status, "Active", StringComparison.OrdinalIgnoreCase))
        {
            throw new CosmosException("Selected GST registration is not active.", 409);
        }
    }
}
