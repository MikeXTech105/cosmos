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
    }
}

public sealed class LowStockReportQueryValidator : AbstractValidator<LowStockReportQuery>
{
    public LowStockReportQueryValidator() => RuleFor(x => x.CategoryId).GreaterThan(0).When(x => x.CategoryId.HasValue);
}

public sealed class PartyReportQueryValidator : ReportPagedQueryValidator<PartyReportQuery>;

public sealed class PartyStatementReportQueryValidator : ReportDateRangeQueryValidator<PartyStatementReportQuery>;

public sealed class AgingReportQueryValidator : ReportDateRangeQueryValidator<AgingReportQuery>;
