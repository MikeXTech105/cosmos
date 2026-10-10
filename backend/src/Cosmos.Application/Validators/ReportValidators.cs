using Cosmos.Contracts.Reports;
using FluentValidation;

namespace Cosmos.Application.Validators;

public class ReportDateRangeQueryValidator<T> : AbstractValidator<T> where T : ReportDateRangeQuery
{
    public ReportDateRangeQueryValidator()
    {
        RuleFor(x => x.ToDate)
            .GreaterThanOrEqualTo(x => x.FromDate)
            .When(x => x.FromDate.HasValue && x.ToDate.HasValue)
            .WithMessage("fromDate cannot be greater than toDate.");
        RuleFor(x => x)
            .Must(x => !x.FromDate.HasValue || !x.ToDate.HasValue || x.ToDate.Value.DayNumber - x.FromDate.Value.DayNumber <= 366)
            .WithMessage("Date range cannot exceed 366 days.");
    }
}

public class ReportPagedQueryValidator<T> : ReportDateRangeQueryValidator<T> where T : ReportPagedQuery
{
    public ReportPagedQueryValidator()
    {
        RuleFor(x => x.PageNumber).GreaterThanOrEqualTo(1);
        RuleFor(x => x.PageSize).InclusiveBetween(1, 200);
        RuleFor(x => x.SortDirection)
            .Must(x => string.IsNullOrWhiteSpace(x) || string.Equals(x, "ASC", StringComparison.OrdinalIgnoreCase) || string.Equals(x, "DESC", StringComparison.OrdinalIgnoreCase))
            .WithMessage("sortDirection must be ASC or DESC.");
    }

    protected void AllowSortFields(params string[] fields)
    {
        RuleFor(x => x.SortBy)
            .Must(x => string.IsNullOrWhiteSpace(x) || fields.Contains(x, StringComparer.OrdinalIgnoreCase))
            .WithMessage($"sortBy must be one of: {string.Join(", ", fields)}.");
    }
}

public sealed class ReportDateRangeQueryValidator : ReportDateRangeQueryValidator<ReportDateRangeQuery>;

public sealed class SalesInvoiceRegisterReportQueryValidator : ReportPagedQueryValidator<SalesInvoiceRegisterReportQuery>;

public sealed class SalesByPartyReportQueryValidator : ReportDateRangeQueryValidator<SalesByPartyReportQuery>;

public sealed class SalesByItemReportQueryValidator : ReportDateRangeQueryValidator<SalesByItemReportQuery>
{
    public SalesByItemReportQueryValidator() => RuleFor(x => x.ItemId).GreaterThan(0).When(x => x.ItemId.HasValue);
}

public sealed class PaymentInReportQueryValidator : ReportPagedQueryValidator<PaymentInReportQuery>;

public sealed class CustomerReceivablesReportQueryValidator : ReportDateRangeQueryValidator<CustomerReceivablesReportQuery>;

public sealed class PurchaseBillRegisterReportQueryValidator : ReportPagedQueryValidator<PurchaseBillRegisterReportQuery>;

public sealed class PurchaseBySupplierReportQueryValidator : ReportDateRangeQueryValidator<PurchaseBySupplierReportQuery>;

public sealed class PurchaseByItemReportQueryValidator : ReportDateRangeQueryValidator<PurchaseByItemReportQuery>
{
    public PurchaseByItemReportQueryValidator() => RuleFor(x => x.ItemId).GreaterThan(0).When(x => x.ItemId.HasValue);
}

public sealed class PaymentOutReportQueryValidator : ReportPagedQueryValidator<PaymentOutReportQuery>;

public sealed class SupplierPayablesReportQueryValidator : ReportDateRangeQueryValidator<SupplierPayablesReportQuery>;

public sealed class ExpenseReportQueryValidator : ReportDateRangeQueryValidator<ExpenseReportQuery>
{
    public ExpenseReportQueryValidator()
    {
        RuleFor(x => x.CategoryId).GreaterThan(0).When(x => x.CategoryId.HasValue);
    }
}

public sealed class InventoryReportQueryValidator : ReportPagedQueryValidator<InventoryReportQuery>
{
    public InventoryReportQueryValidator()
    {
        RuleFor(x => x.ItemId).GreaterThan(0).When(x => x.ItemId.HasValue);
        RuleFor(x => x.CategoryId).GreaterThan(0).When(x => x.CategoryId.HasValue);
        RuleFor(x => x.UnitId).GreaterThan(0).When(x => x.UnitId.HasValue);
        RuleFor(x => x.StockStatus)
            .Must(IsStockStatus)
            .WithMessage("stockStatus must be InStock, LowStock, OutOfStock, or NegativeStock.")
            .When(x => !string.IsNullOrWhiteSpace(x.StockStatus));
        AllowSortFields("ItemCode", "ItemName", "CategoryName", "UnitName", "OpeningQuantity", "ClosingQuantity", "AvailableQuantity", "MinimumStock", "StockValue", "StockStatus");
    }

    private static bool IsStockStatus(string? value) =>
        string.IsNullOrWhiteSpace(value) ||
        new[] { "InStock", "LowStock", "OutOfStock", "NegativeStock" }.Contains(value.Replace(" ", string.Empty), StringComparer.OrdinalIgnoreCase);
}

public sealed class StockLedgerReportQueryValidator : ReportPagedQueryValidator<StockLedgerReportQuery>
{
    public StockLedgerReportQueryValidator()
    {
        RuleFor(x => x.ItemId).GreaterThan(0).When(x => x.ItemId.HasValue);
        RuleFor(x => x.CategoryId).GreaterThan(0).When(x => x.CategoryId.HasValue);
        RuleFor(x => x.UnitId).GreaterThan(0).When(x => x.UnitId.HasValue);
        RuleFor(x => x.MovementType)
            .Must(IsMovementType)
            .WithMessage("movementType must be Sale, SalesCancelReturn, Purchase, or PurchaseReturn.")
            .When(x => !string.IsNullOrWhiteSpace(x.MovementType));
        RuleFor(x => x.SourceType)
            .Must(x => string.IsNullOrWhiteSpace(x) || new[] { "SalesInvoice", "PurchaseBill", "PurchaseReturn" }.Contains(x, StringComparer.OrdinalIgnoreCase))
            .WithMessage("sourceType must be SalesInvoice, PurchaseBill, or PurchaseReturn.")
            .When(x => !string.IsNullOrWhiteSpace(x.SourceType));
        AllowSortFields("MovementDate", "MovementDateTime", "ItemCode", "ItemName", "SourceType", "MovementType", "QuantityIn", "QuantityOut", "RunningQuantityBalance");
    }

    private static bool IsMovementType(string? value) =>
        string.IsNullOrWhiteSpace(value) ||
        new[] { "Sale", "SalesIssue", "SalesCancelReturn", "Purchase", "PurchaseReturn" }.Contains(value.Replace(" ", string.Empty), StringComparer.OrdinalIgnoreCase);
}

public sealed class StockMovementReportQueryValidator : ReportPagedQueryValidator<StockMovementReportQuery>
{
    public StockMovementReportQueryValidator()
    {
        RuleFor(x => x.ItemId).GreaterThan(0).When(x => x.ItemId.HasValue);
        RuleFor(x => x.CategoryId).GreaterThan(0).When(x => x.CategoryId.HasValue);
        RuleFor(x => x.UnitId).GreaterThan(0).When(x => x.UnitId.HasValue);
        RuleFor(x => x.MovementType)
            .Must(x => string.IsNullOrWhiteSpace(x) || new[] { "Sale", "SalesIssue", "SalesCancelReturn", "Purchase", "PurchaseReturn" }.Contains(x.Replace(" ", string.Empty), StringComparer.OrdinalIgnoreCase))
            .WithMessage("movementType must be Sale, SalesCancelReturn, Purchase, or PurchaseReturn.")
            .When(x => !string.IsNullOrWhiteSpace(x.MovementType));
        RuleFor(x => x.SourceType)
            .Must(x => string.IsNullOrWhiteSpace(x) || new[] { "SalesInvoice", "PurchaseBill", "PurchaseReturn" }.Contains(x, StringComparer.OrdinalIgnoreCase))
            .WithMessage("sourceType must be SalesInvoice, PurchaseBill, or PurchaseReturn.")
            .When(x => !string.IsNullOrWhiteSpace(x.SourceType));
        AllowSortFields("MovementDate", "MovementDateTime", "ItemCode", "ItemName", "SourceType", "MovementType", "QuantityIn", "QuantityOut", "RunningQuantityBalance");
    }
}

public sealed class LowStockReportQueryValidator : ReportPagedQueryValidator<LowStockReportQuery>
{
    public LowStockReportQueryValidator()
    {
        RuleFor(x => x.CategoryId).GreaterThan(0).When(x => x.CategoryId.HasValue);
        RuleFor(x => x.UnitId).GreaterThan(0).When(x => x.UnitId.HasValue);
        AllowSortFields("ItemCode", "ItemName", "CategoryName", "UnitName", "CurrentStock", "AvailableStock", "MinimumStock", "ReorderShortage", "EstimatedReorderValue");
    }
}

public sealed class NegativeStockReportQueryValidator : ReportPagedQueryValidator<NegativeStockReportQuery>
{
    public NegativeStockReportQueryValidator()
    {
        RuleFor(x => x.CategoryId).GreaterThan(0).When(x => x.CategoryId.HasValue);
        RuleFor(x => x.UnitId).GreaterThan(0).When(x => x.UnitId.HasValue);
        AllowSortFields("ItemCode", "ItemName", "CurrentStock", "NegativeQuantity", "EstimatedStockValueImpact", "LastStockMovementDate");
    }
}

public sealed class StockAgeingReportQueryValidator : ReportPagedQueryValidator<StockAgeingReportQuery>
{
    public StockAgeingReportQueryValidator()
    {
        RuleFor(x => x.ItemId).GreaterThan(0).When(x => x.ItemId.HasValue);
        RuleFor(x => x.CategoryId).GreaterThan(0).When(x => x.CategoryId.HasValue);
        RuleFor(x => x.InactiveDays).InclusiveBetween(1, 3650);
        RuleFor(x => x.MinimumStockValue).GreaterThanOrEqualTo(0).When(x => x.MinimumStockValue.HasValue);
        AllowSortFields("ItemCode", "ItemName", "CurrentQuantity", "StockValue", "LastSoldDate", "DaysSinceLastSale", "StockAgeClassification");
    }
}

public sealed class MovingItemsReportQueryValidator : ReportPagedQueryValidator<MovingItemsReportQuery>
{
    public MovingItemsReportQueryValidator()
    {
        RuleFor(x => x.CategoryId).GreaterThan(0).When(x => x.CategoryId.HasValue);
        RuleFor(x => x.Top).InclusiveBetween(1, 100).When(x => x.Top.HasValue);
        RuleFor(x => x.MinimumTransactions).InclusiveBetween(0, 1000);
        AllowSortFields("Rank", "ItemCode", "ItemName", "TotalSoldQuantity", "SoldQuantity", "SalesTransactionCount", "SalesValue", "CurrentStock", "StockValue", "LastSoldDate", "DaysSinceLastSale");
    }
}

public sealed class PartyReportQueryValidator : ReportPagedQueryValidator<PartyReportQuery>;

public sealed class PartyStatementReportQueryValidator : ReportDateRangeQueryValidator<PartyStatementReportQuery>;

public sealed class AgingReportQueryValidator : ReportDateRangeQueryValidator<AgingReportQuery>;
