using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Application.Sales;
using Cosmos.Domain.Sales;
using FluentValidation;

namespace Cosmos.Application.Validators;

public sealed class CreateSalesInvoiceValidator : AbstractValidator<CreateSalesInvoiceCommand>
{
    public CreateSalesInvoiceValidator(ISalesRepository repository)
    {
        RuleFor(x => x.CustomerPartyId)
            .NotEmpty()
            .MustAsync(repository.CustomerExistsAsync)
            .WithMessage("Customer party was not found.");
        RuleFor(x => x.DueDate)
            .GreaterThanOrEqualTo(x => x.InvoiceDate)
            .When(x => x.DueDate.HasValue)
            .WithMessage("Due date cannot be before invoice date.");
        RuleFor(x => x.Items).NotEmpty().WithMessage("At least one invoice item is required.");
        RuleForEach(x => x.Items).SetValidator(new SalesInvoiceItemRequestValidator(repository));
        RuleFor(x => x.DiscountAmount).GreaterThanOrEqualTo(0);
        RuleFor(x => x.Notes).MaximumLength(1000);
        RuleFor(x => x.TermsAndConditions).MaximumLength(2000);
        RuleFor(x => x.InitialPayment!).SetValidator(new AddSalesPaymentValidator()).When(x => x.InitialPayment is not null);
    }
}

public sealed class UpdateSalesInvoiceValidator : AbstractValidator<UpdateSalesInvoiceCommand>
{
    public UpdateSalesInvoiceValidator(ISalesRepository repository)
    {
        RuleFor(x => x.CustomerPartyId)
            .NotEmpty()
            .MustAsync(repository.CustomerExistsAsync)
            .WithMessage("Customer party was not found.");
        RuleFor(x => x.DueDate)
            .GreaterThanOrEqualTo(x => x.InvoiceDate)
            .When(x => x.DueDate.HasValue)
            .WithMessage("Due date cannot be before invoice date.");
        RuleFor(x => x.Items).NotEmpty().WithMessage("At least one invoice item is required.");
        RuleForEach(x => x.Items).SetValidator(new SalesInvoiceItemRequestValidator(repository));
        RuleFor(x => x.DiscountAmount).GreaterThanOrEqualTo(0);
        RuleFor(x => x.Notes).MaximumLength(1000);
        RuleFor(x => x.TermsAndConditions).MaximumLength(2000);
    }
}

public sealed class SalesInvoiceItemRequestValidator : AbstractValidator<SalesInvoiceItemRequest>
{
    public SalesInvoiceItemRequestValidator(ISalesRepository repository)
    {
        RuleFor(x => x.ItemId)
            .GreaterThan(0)
            .MustAsync(repository.ItemExistsAsync)
            .WithMessage("Item was not found.");
        RuleFor(x => x.Quantity).GreaterThan(0);
        RuleFor(x => x.Rate).GreaterThanOrEqualTo(0);
        RuleFor(x => x.DiscountPercentage).InclusiveBetween(0, 100);
        RuleFor(x => x.DiscountAmount).GreaterThanOrEqualTo(0);
        RuleFor(x => x.TaxPercentage).GreaterThanOrEqualTo(0);
        RuleFor(x => x)
            .Must(x => x.DiscountAmount <= x.Quantity * x.Rate)
            .WithMessage("Discount cannot exceed line amount.");
    }
}

public sealed class AddSalesPaymentValidator : AbstractValidator<AddSalesPaymentCommand>
{
    public AddSalesPaymentValidator()
    {
        RuleFor(x => x.Amount).GreaterThan(0);
        RuleFor(x => x.PaymentMode).Must(x => Enum.IsDefined(typeof(SalesPaymentMode), x)).WithMessage("PaymentMode is invalid.");
        RuleFor(x => x.ReferenceNumber).MaximumLength(100);
        RuleFor(x => x.Notes).MaximumLength(500);
    }
}

public sealed class GetSalesInvoicesQueryValidator : AbstractValidator<GetSalesInvoicesQuery>
{
    private static readonly string[] AllowedSortColumns = ["InvoiceDate", "InvoiceNumber", "CustomerName", "GrandTotal", "PaidAmount", "DueAmount", "CreatedAtUtc"];

    public GetSalesInvoicesQueryValidator()
    {
        RuleFor(x => x.PageNumber).GreaterThan(0);
        RuleFor(x => x.PageSize).InclusiveBetween(1, 200);
        RuleFor(x => x.SortBy).Must(x => string.IsNullOrWhiteSpace(x) || AllowedSortColumns.Contains(x)).WithMessage("SortBy is invalid.");
        RuleFor(x => x.SortDirection).Must(x => string.IsNullOrWhiteSpace(x) || string.Equals(x, "ASC", StringComparison.OrdinalIgnoreCase) || string.Equals(x, "DESC", StringComparison.OrdinalIgnoreCase)).WithMessage("SortDirection must be ASC or DESC.");
        RuleFor(x => x.ToDate).GreaterThanOrEqualTo(x => x.FromDate).When(x => x.FromDate.HasValue && x.ToDate.HasValue);
    }
}
