using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Application.PurchaseExpense;
using Cosmos.Application.Validators;
using Moq;

namespace Cosmos.Tests.PurchaseExpense;

public sealed class PurchaseExpenseValidatorTests
{
    private readonly Mock<IPurchaseExpenseRepository> _repository = new();

    public PurchaseExpenseValidatorTests()
    {
        _repository.Setup(x => x.SupplierExistsAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>())).ReturnsAsync(true);
        _repository.Setup(x => x.ItemExistsAsync(It.IsAny<long>(), It.IsAny<CancellationToken>())).ReturnsAsync(true);
        _repository.Setup(x => x.ExpenseCategoryExistsAsync(It.IsAny<long>(), It.IsAny<CancellationToken>())).ReturnsAsync(true);
    }

    [Fact]
    public async Task Purchase_bill_requires_at_least_one_item()
    {
        var request = new CreatePurchaseBillRequest(Guid.NewGuid(), null, DateOnly.FromDateTime(DateTime.Today), null, 1, []);
        var result = await new CreatePurchaseBillValidator(_repository.Object).ValidateAsync(request);
        Assert.Contains(result.Errors, x => x.PropertyName == nameof(request.Items));
    }

    [Fact]
    public async Task Payment_allocations_cannot_exceed_payment()
    {
        var request = new CreateSupplierPaymentRequest(Guid.NewGuid(), DateOnly.FromDateTime(DateTime.Today), 100, 1, Allocations: [new(1, 101)]);
        var result = await new CreateSupplierPaymentValidator(_repository.Object).ValidateAsync(request);
        Assert.False(result.IsValid);
    }

    [Fact]
    public async Task Expense_amount_must_be_positive()
    {
        var request = new CreateExpenseRequest(DateOnly.FromDateTime(DateTime.Today), 1, null, 0, 0, 1);
        var result = await new CreateExpenseValidator(_repository.Object).ValidateAsync(request);
        Assert.Contains(result.Errors, x => x.PropertyName == nameof(request.Amount));
    }

    [Fact]
    public async Task Purchase_order_conversion_rejects_an_unknown_payment_type()
    {
        var request = new ConvertPurchaseOrderRequest(DateOnly.FromDateTime(DateTime.Today), PaymentType: 0);

        var result = await new ConvertPurchaseOrderValidator().ValidateAsync(request);

        Assert.Contains(result.Errors, x => x.PropertyName == nameof(request.PaymentType));
    }
}
