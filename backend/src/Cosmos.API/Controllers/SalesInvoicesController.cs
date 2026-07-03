using Cosmos.API.Security;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Application.Sales;
using Cosmos.Contracts.Common;
using Cosmos.Contracts.Sales;
using Cosmos.Domain.Security;
using Cosmos.Shared.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cosmos.API.Controllers;

[Authorize]
//[Tags("Sales")]
[ApiExplorerSettings(GroupName = "sales")]
[Route("api/v1/sales/invoices")]
public sealed class SalesInvoicesController : ApiControllerBase
{
    private readonly ISalesService _service;

    public SalesInvoicesController(ISalesService service) => _service = service;

    /// <summary>Creates a draft sales invoice.</summary>
    [HttpPost]
    [RequirePermission("Sales.Invoice", PermissionAction.Create)]
    [ProducesResponseType(typeof(ApiResponse<SalesInvoiceDetailDto>), StatusCodes.Status201Created)]
    public async Task<IActionResult> Create(CreateSalesInvoiceCommand command, CancellationToken cancellationToken) =>
        FromResponse(await _service.CreateAsync(command, cancellationToken), StatusCodes.Status201Created);

    /// <summary>Gets a paginated sales invoice list.</summary>
    [HttpGet]
    [RequirePermission("Sales.Invoice", PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<SalesInvoiceDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetList([FromQuery] GetSalesInvoicesQuery query, CancellationToken cancellationToken) =>
        FromResponse(await _service.GetListAsync(query, cancellationToken));

    /// <summary>Gets a sales invoice by id.</summary>
    [HttpGet("{id:long}")]
    [RequirePermission("Sales.Invoice", PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<SalesInvoiceDetailDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetById(long id, CancellationToken cancellationToken) =>
        FromResponse(await _service.GetByIdAsync(new GetSalesInvoiceByIdQuery(id), cancellationToken));

    /// <summary>Updates a draft sales invoice.</summary>
    [HttpPut("{id:long}")]
    [RequirePermission("Sales.Invoice", PermissionAction.Edit)]
    [ProducesResponseType(typeof(ApiResponse<SalesInvoiceDetailDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Update(long id, UpdateSalesInvoiceCommand command, CancellationToken cancellationToken) =>
        FromResponse(await _service.UpdateAsync(id, command, cancellationToken));

    /// <summary>Confirms a draft sales invoice and deducts product stock.</summary>
    [HttpPost("{id:long}/confirm")]
    [RequirePermission("Sales.Invoice", PermissionAction.Approve)]
    [ProducesResponseType(typeof(ApiResponse<SalesInvoiceDetailDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Confirm(long id, CancellationToken cancellationToken) =>
        FromResponse(await _service.ConfirmAsync(id, cancellationToken));

    /// <summary>Cancels a draft or confirmed sales invoice.</summary>
    [HttpPost("{id:long}/cancel")]
    [RequirePermission("Sales.Invoice", PermissionAction.Delete)]
    [ProducesResponseType(typeof(ApiResponse<SalesInvoiceDetailDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Cancel(long id, CancellationToken cancellationToken) =>
        FromResponse(await _service.CancelAsync(id, cancellationToken));

    /// <summary>Adds a payment to a sales invoice.</summary>
    [HttpPost("{id:long}/payments")]
    [RequirePermission("Sales.Invoice", PermissionAction.Edit)]
    [ProducesResponseType(typeof(ApiResponse<SalesPaymentDto>), StatusCodes.Status201Created)]
    public async Task<IActionResult> AddPayment(long id, AddSalesPaymentCommand command, CancellationToken cancellationToken) =>
        FromResponse(await _service.AddPaymentAsync(id, command, cancellationToken), StatusCodes.Status201Created);

    /// <summary>Gets payments for a sales invoice.</summary>
    [HttpGet("{id:long}/payments")]
    [RequirePermission("Sales.Invoice", PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyCollection<SalesPaymentDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPayments(long id, CancellationToken cancellationToken) =>
        FromResponse(await _service.GetPaymentsAsync(new GetSalesPaymentsQuery(id), cancellationToken));
}
