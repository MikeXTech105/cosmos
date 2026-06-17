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
    private readonly IAuditRepository _auditRepository;
    private readonly ICurrentUser _currentUser;
    private readonly ISalesCalculationService _calculationService;
    private readonly ILogger<SalesService> _logger;
    private readonly IValidator<CreateSalesInvoiceCommand> _createValidator;
    private readonly IValidator<UpdateSalesInvoiceCommand> _updateValidator;
    private readonly IValidator<AddSalesPaymentCommand> _paymentValidator;
    private readonly IValidator<GetSalesInvoicesQuery> _listValidator;

    public SalesService(
        ISalesRepository repository,
        IAuditRepository auditRepository,
        ICurrentUser currentUser,
        ISalesCalculationService calculationService,
        ILogger<SalesService> logger,
        IValidator<CreateSalesInvoiceCommand> createValidator,
        IValidator<UpdateSalesInvoiceCommand> updateValidator,
        IValidator<AddSalesPaymentCommand> paymentValidator,
        IValidator<GetSalesInvoicesQuery> listValidator)
    {
        _repository = repository;
        _auditRepository = auditRepository;
        _currentUser = currentUser;
        _calculationService = calculationService;
        _logger = logger;
        _createValidator = createValidator;
        _updateValidator = updateValidator;
        _paymentValidator = paymentValidator;
        _listValidator = listValidator;
    }

    private long? UserId => _currentUser.UserId;

    private int? AuditUserId => UserId is null ? null : checked((int)UserId.Value);

    public async Task<ApiResponse<SalesInvoiceDetailDto>> GetByIdAsync(GetSalesInvoiceByIdQuery query, CancellationToken cancellationToken) =>
        ApiResponse<SalesInvoiceDetailDto>.Success(await _repository.GetByIdAsync(query.Id, cancellationToken) ?? throw new NotFoundException("Sales invoice was not found."));

    public async Task<ApiResponse<PagedResult<SalesInvoiceDto>>> GetListAsync(GetSalesInvoicesQuery query, CancellationToken cancellationToken)
    {
        await ValidationRunner.ValidateAsync(_listValidator, query, cancellationToken);
        return ApiResponse<PagedResult<SalesInvoiceDto>>.Success(await _repository.GetListAsync(query, cancellationToken));
    }

    public async Task<ApiResponse<SalesInvoiceDetailDto>> CreateAsync(CreateSalesInvoiceCommand command, CancellationToken cancellationToken)
    {
        await ValidationRunner.ValidateAsync(_createValidator, command, cancellationToken);
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
        var updated = await _repository.UpdateAsync(id, command, UserId, cancellationToken);
        await AuditAsync(id, "Update", old, updated, cancellationToken);
        return ApiResponse<SalesInvoiceDetailDto>.Success(updated, "Sales invoice updated.");
    }

    public async Task<ApiResponse<SalesInvoiceDetailDto>> ConfirmAsync(long id, CancellationToken cancellationToken)
    {
        var old = await _repository.GetByIdAsync(id, cancellationToken) ?? throw new NotFoundException("Sales invoice was not found.");
        var updated = await _repository.ConfirmAsync(id, UserId, cancellationToken);
        await AuditAsync(id, "Confirm", old, updated, cancellationToken);
        return ApiResponse<SalesInvoiceDetailDto>.Success(updated, "Sales invoice confirmed.");
    }

    public async Task<ApiResponse<SalesInvoiceDetailDto>> CancelAsync(long id, CancellationToken cancellationToken)
    {
        var old = await _repository.GetByIdAsync(id, cancellationToken) ?? throw new NotFoundException("Sales invoice was not found.");
        var updated = await _repository.CancelAsync(id, UserId, cancellationToken);
        await AuditAsync(id, "Cancel", old, updated, cancellationToken);
        return ApiResponse<SalesInvoiceDetailDto>.Success(updated, "Sales invoice cancelled.");
    }

    public async Task<ApiResponse<SalesPaymentDto>> AddPaymentAsync(long id, AddSalesPaymentCommand command, CancellationToken cancellationToken)
    {
        await ValidationRunner.ValidateAsync(_paymentValidator, command, cancellationToken);
        var created = await _repository.AddPaymentAsync(id, command, UserId, cancellationToken);
        await _auditRepository.AddAsync(new AuditEntryRequest("SalesInvoicePayments", created.Id.ToString(), "Create", null, AuditSerializer.Serialize(created), AuditUserId), cancellationToken);
        return ApiResponse<SalesPaymentDto>.Success(created, "Sales payment added.");
    }

    public async Task<ApiResponse<IReadOnlyCollection<SalesPaymentDto>>> GetPaymentsAsync(GetSalesPaymentsQuery query, CancellationToken cancellationToken) =>
        ApiResponse<IReadOnlyCollection<SalesPaymentDto>>.Success(await _repository.GetPaymentsAsync(query.SalesInvoiceId, cancellationToken));

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
}
