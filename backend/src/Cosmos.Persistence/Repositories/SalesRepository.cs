using System.Data;
using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Application.Sales;
using Cosmos.Contracts.Common;
using Cosmos.Contracts.Sales;
using Cosmos.Persistence.Connection;
using Cosmos.Persistence.Dapper;
using Cosmos.Shared.Exceptions;
using Dapper;

namespace Cosmos.Persistence.Repositories;

public sealed class SalesRepository : ISalesRepository
{
    private readonly ISqlConnectionFactory _connectionFactory;

    public SalesRepository(ISqlConnectionFactory connectionFactory) => _connectionFactory = connectionFactory;

    public Task<bool> CustomerExistsAsync(Guid customerPartyId, CancellationToken cancellationToken) =>
        QueryScalarAsync<bool>("sp_Sales_CustomerExists", new { CustomerPartyId = customerPartyId }, cancellationToken);

    public Task<bool> ItemExistsAsync(long itemId, CancellationToken cancellationToken) =>
        QueryScalarAsync<bool>("sp_Sales_ItemExists", new { ItemId = itemId }, cancellationToken);

    public async Task<SalesInvoiceDetailDto?> GetByIdAsync(long id, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        return await GetDetailAsync(connection, id, cancellationToken);
    }

    public async Task<PagedResult<SalesInvoiceDto>> GetListAsync(GetSalesInvoicesQuery query, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        var rows = await StoredProcedureExecutor.QueryAsync<SalesInvoiceDto>(
            connection,
            "sp_SalesInvoice_GetList",
            new
            {
                query.Search,
                query.CustomerPartyId,
                query.Status,
                query.PaymentStatus,
                FromDate = ToDateTime(query.FromDate),
                ToDate = ToDateTime(query.ToDate),
                query.PageNumber,
                query.PageSize,
                query.SortBy,
                query.SortDirection
            },
            cancellationToken);
        var summary = await StoredProcedureExecutor.QuerySingleOrDefaultAsync<SalesInvoiceListSummaryDto>(
            connection,
            "sp_SalesInvoice_GetListSummary",
            new
            {
                query.Search,
                query.CustomerPartyId,
                query.Status,
                query.PaymentStatus,
                FromDate = ToDateTime(query.FromDate),
                ToDate = ToDateTime(query.ToDate)
            },
            cancellationToken) ?? new SalesInvoiceListSummaryDto(0, 0, 0, 0);
        return new PagedResult<SalesInvoiceDto>(rows, query.PageNumber, query.PageSize, summary.TotalInvoices, summary);
    }

    public async Task<SalesInvoiceDetailDto> CreateAsync(CreateSalesInvoiceCommand command, long? userId, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        var parameters = InvoiceParameters(command, userId);
        var id = await ExecuteForIdAsync(connection, "sp_SalesInvoice_Create", parameters, cancellationToken);
        return await GetDetailAsync(connection, id, cancellationToken) ?? throw new InvalidOperationException("Created sales invoice could not be loaded.");
    }

    public async Task<SalesInvoiceDetailDto> UpdateAsync(long id, UpdateSalesInvoiceCommand command, long? userId, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        var parameters = InvoiceParameters(command, userId);
        parameters.Add("Id", id);
        var updatedId = await ExecuteForIdAsync(connection, "sp_SalesInvoice_Update", parameters, cancellationToken);
        return await GetDetailAsync(connection, updatedId, cancellationToken) ?? throw new InvalidOperationException("Updated sales invoice could not be loaded.");
    }

    public async Task<SalesInvoiceDetailDto> ConfirmAsync(long id, long? userId, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        var updatedId = await ExecuteForIdAsync(connection, "sp_SalesInvoice_Confirm", new { Id = id, UserId = userId }, cancellationToken);
        return await GetDetailAsync(connection, updatedId, cancellationToken) ?? throw new InvalidOperationException("Confirmed sales invoice could not be loaded.");
    }

    public async Task<SalesInvoiceDetailDto> CancelAsync(long id, long? userId, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        var updatedId = await ExecuteForIdAsync(connection, "sp_SalesInvoice_Cancel", new { Id = id, UserId = userId }, cancellationToken);
        return await GetDetailAsync(connection, updatedId, cancellationToken) ?? throw new InvalidOperationException("Cancelled sales invoice could not be loaded.");
    }

    public async Task<SalesPaymentDto> AddPaymentAsync(long id, AddSalesPaymentCommand command, long? userId, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        return await StoredProcedureExecutor.QueryWithStatusAsync<SalesPaymentDto>(
            connection,
            "sp_SalesInvoice_AddPayment",
            new
            {
                SalesInvoiceId = id,
                PaymentDate = ToDateTime(command.PaymentDate),
                command.Amount,
                command.PaymentMode,
                command.ReferenceNumber,
                command.Notes,
                UserId = userId
            },
            cancellationToken);
    }

    public async Task<IReadOnlyCollection<SalesPaymentDto>> GetPaymentsAsync(long salesInvoiceId, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        return await StoredProcedureExecutor.QueryAsync<SalesPaymentDto>(connection, "sp_SalesInvoice_GetPayments", new { SalesInvoiceId = salesInvoiceId }, cancellationToken);
    }

    public async Task<SalesSummaryReportDto> GetSummaryReportAsync(GetSalesSummaryReportQuery query, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        return await StoredProcedureExecutor.QuerySingleOrDefaultAsync<SalesSummaryReportDto>(
            connection,
            "sp_SalesReport_Summary",
            new { FromDate = ToDateTime(query.FromDate), ToDate = ToDateTime(query.ToDate) },
            cancellationToken) ?? new SalesSummaryReportDto(0, 0, 0, 0);
    }

    public async Task<IReadOnlyCollection<CustomerReceivableReportDto>> GetCustomerReceivablesAsync(GetCustomerReceivablesQuery query, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        return await StoredProcedureExecutor.QueryAsync<CustomerReceivableReportDto>(connection, "sp_SalesReport_CustomerReceivables", query, cancellationToken);
    }

    public async Task<IReadOnlyCollection<ItemWiseSalesReportDto>> GetItemWiseSalesAsync(GetItemWiseSalesReportQuery query, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        return await StoredProcedureExecutor.QueryAsync<ItemWiseSalesReportDto>(
            connection,
            "sp_SalesReport_ItemWiseSales",
            new { FromDate = ToDateTime(query.FromDate), ToDate = ToDateTime(query.ToDate), query.ItemId },
            cancellationToken);
    }

    private static async Task<SalesInvoiceDetailDto?> GetDetailAsync(IDbConnection connection, long id, CancellationToken cancellationToken)
    {
        var command = new CommandDefinition("sp_SalesInvoice_GetById", new { Id = id }, commandType: CommandType.StoredProcedure, cancellationToken: cancellationToken);
        using var multi = await connection.QueryMultipleAsync(command);
        var invoice = await multi.ReadSingleOrDefaultAsync<SalesInvoiceDetailDto>();
        if (invoice is null)
        {
            return null;
        }

        invoice.Items = (await multi.ReadAsync<SalesInvoiceItemDto>()).AsList();
        invoice.Payments = (await multi.ReadAsync<SalesPaymentDto>()).AsList();
        return invoice;
    }

    private static async Task<long> ExecuteForIdAsync(IDbConnection connection, string procedure, object parameters, CancellationToken cancellationToken)
    {
        var command = new CommandDefinition(procedure, parameters, commandType: CommandType.StoredProcedure, cancellationToken: cancellationToken);
        using var multi = await connection.QueryMultipleAsync(command);
        var status = await multi.ReadSingleAsync<OperationResult>();
        if (!status.Succeeded)
        {
            throw new CosmosException(status.Message, status.StatusCode);
        }

        return await multi.ReadSingleAsync<long>();
    }

    private static DynamicParameters InvoiceParameters(CreateSalesInvoiceCommand command, long? userId)
    {
        var parameters = BaseInvoiceParameters(command.CustomerPartyId, command.InvoiceDate, command.DueDate, command.DiscountAmount, command.Notes, command.TermsAndConditions, command.CompanyGstRegistrationId, command.PlaceOfSupplyStateCode, command.PlaceOfSupplySource, command.PriceBasis, command.Items, userId);
        if (command.InitialPayment is not null)
        {
            parameters.Add("InitialPaymentDate", ToDateTime(command.InitialPayment.PaymentDate));
            parameters.Add("InitialPaymentAmount", command.InitialPayment.Amount);
            parameters.Add("InitialPaymentMode", command.InitialPayment.PaymentMode);
            parameters.Add("InitialPaymentReferenceNumber", command.InitialPayment.ReferenceNumber);
            parameters.Add("InitialPaymentNotes", command.InitialPayment.Notes);
        }

        return parameters;
    }

    private static DynamicParameters InvoiceParameters(UpdateSalesInvoiceCommand command, long? userId) =>
        BaseInvoiceParameters(command.CustomerPartyId, command.InvoiceDate, command.DueDate, command.DiscountAmount, command.Notes, command.TermsAndConditions, command.CompanyGstRegistrationId, command.PlaceOfSupplyStateCode, command.PlaceOfSupplySource, command.PriceBasis, command.Items, userId);

    private static DynamicParameters BaseInvoiceParameters(Guid customerPartyId, DateOnly invoiceDate, DateOnly? dueDate, decimal discountAmount, string? notes, string? terms, long? companyGstRegistrationId, string? placeOfSupplyStateCode, string? placeOfSupplySource, SalesInvoicePriceBasis? priceBasis, IReadOnlyCollection<SalesInvoiceItemRequest> items, long? userId)
    {
        var parameters = new DynamicParameters();
        parameters.Add("CustomerPartyId", customerPartyId);
        parameters.Add("InvoiceDate", ToDateTime(invoiceDate));
        parameters.Add("DueDate", ToDateTime(dueDate));
        parameters.Add("DiscountAmount", discountAmount);
        parameters.Add("Notes", notes);
        parameters.Add("TermsAndConditions", terms);
        parameters.Add("CompanyGstRegistrationId", companyGstRegistrationId);
        parameters.Add("PlaceOfSupplyStateCode", placeOfSupplyStateCode);
        parameters.Add("PlaceOfSupplySource", placeOfSupplySource);
        parameters.Add("PriceBasis", priceBasis is null ? null : (byte)priceBasis.Value);
        parameters.Add("Items", ItemTable(items).AsTableValuedParameter("dbo.SalesInvoiceItemInputV2"));
        parameters.Add("UserId", userId);
        return parameters;
    }

    private static DataTable ItemTable(IEnumerable<SalesInvoiceItemRequest> items)
    {
        var table = new DataTable();
        table.Columns.Add("ItemId", typeof(long));
        table.Columns.Add("Quantity", typeof(decimal));
        table.Columns.Add("Rate", typeof(decimal));
        table.Columns.Add("DiscountPercentage", typeof(decimal));
        table.Columns.Add("DiscountAmount", typeof(decimal));
        table.Columns.Add("TaxRateId", typeof(long));
        table.Columns.Add("TaxPercentage", typeof(decimal));

        foreach (var item in items)
        {
            table.Rows.Add(item.ItemId, item.Quantity, item.Rate, item.DiscountPercentage, item.DiscountAmount, item.TaxRateId.HasValue ? item.TaxRateId.Value : (object)DBNull.Value, item.TaxPercentage);
        }

        return table;
    }

    private async Task<T> QueryScalarAsync<T>(string procedure, object parameters, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        var command = new CommandDefinition(procedure, parameters, commandType: CommandType.StoredProcedure, cancellationToken: cancellationToken);
        return await connection.QuerySingleAsync<T>(command);
    }

    private static DateTime ToDateTime(DateOnly value) => value.ToDateTime(TimeOnly.MinValue);

    private static DateTime? ToDateTime(DateOnly? value) => value?.ToDateTime(TimeOnly.MinValue);
}
