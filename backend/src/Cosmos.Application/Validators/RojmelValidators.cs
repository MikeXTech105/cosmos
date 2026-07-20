using Cosmos.Contracts.Rojmel;
using FluentValidation;

namespace Cosmos.Application.Validators;

public sealed class RojmelWalletListQueryValidator : AbstractValidator<RojmelWalletListQuery>
{
    public RojmelWalletListQueryValidator()
    {
        RuleFor(x => x.PageNumber).GreaterThan(0);
        RuleFor(x => x.PageSize).InclusiveBetween(1, 200);
        RuleFor(x => x.Search).MaximumLength(200);
        RuleFor(x => x.LinkedUserId).GreaterThan(0).When(x => x.LinkedUserId.HasValue);
        RuleFor(x => x.WalletType).Must(x => !x.HasValue || Enum.IsDefined(x.Value)).WithMessage("Wallet type is invalid.");
    }
}

public sealed class CreateRojmelWalletRequestValidator : AbstractValidator<CreateRojmelWalletRequest>
{
    public CreateRojmelWalletRequestValidator()
    {
        RuleFor(x => x.WalletCode).NotEmpty().MaximumLength(30).Matches("^[A-Za-z0-9_-]+$");
        RuleFor(x => x.WalletName).NotEmpty().MaximumLength(150);
        RuleFor(x => x.WalletType).IsInEnum();
        RuleFor(x => x.LinkedUserId).GreaterThan(0).When(x => x.LinkedUserId.HasValue);
        RuleFor(x => x.OpeningBalance).GreaterThanOrEqualTo(0);
        RuleFor(x => x.Notes).MaximumLength(1000);
        RuleFor(x => x).Must(x => x.WalletType != WalletType.User || x.LinkedUserId.HasValue).WithMessage("A user wallet must be linked to a system user.");
        RuleFor(x => x).Must(x => x.WalletType == WalletType.User || !x.LinkedUserId.HasValue).WithMessage("Only user wallets can be linked to a system user.");
    }
}

public sealed class UpdateRojmelWalletRequestValidator : AbstractValidator<UpdateRojmelWalletRequest>
{
    public UpdateRojmelWalletRequestValidator()
    {
        RuleFor(x => x.WalletName).NotEmpty().MaximumLength(150);
        RuleFor(x => x.WalletType).IsInEnum();
        RuleFor(x => x.LinkedUserId).GreaterThan(0).When(x => x.LinkedUserId.HasValue);
        RuleFor(x => x.Notes).MaximumLength(1000);
        RuleFor(x => x).Must(x => x.WalletType != WalletType.User || x.LinkedUserId.HasValue).WithMessage("A user wallet must be linked to a system user.");
        RuleFor(x => x).Must(x => x.WalletType == WalletType.User || !x.LinkedUserId.HasValue).WithMessage("Only user wallets can be linked to a system user.");
    }
}

public sealed class RojmelTransactionListQueryValidator : AbstractValidator<RojmelTransactionListQuery>
{
    public RojmelTransactionListQueryValidator()
    {
        RuleFor(x => x.PageNumber).GreaterThan(0);
        RuleFor(x => x.PageSize).InclusiveBetween(1, 200);
        RuleFor(x => x.Search).MaximumLength(200);
        RuleFor(x => x.WalletId).GreaterThan(0).When(x => x.WalletId.HasValue);
        RuleFor(x => x.LinkedUserId).GreaterThan(0).When(x => x.LinkedUserId.HasValue);
        RuleFor(x => x.CategoryId).GreaterThan(0).When(x => x.CategoryId.HasValue);
        RuleFor(x => x).Must(x => !x.FromDate.HasValue || !x.ToDate.HasValue || x.FromDate <= x.ToDate).WithMessage("FromDate must be on or before ToDate.");
    }
}

public sealed class CreateRojmelTransactionRequestValidator : AbstractValidator<CreateRojmelTransactionRequest>
{
    public CreateRojmelTransactionRequestValidator()
    {
        RuleFor(x => x.WalletId).GreaterThan(0);
        RuleFor(x => x.TransactionDate).NotEmpty();
        RuleFor(x => x.CategoryId).GreaterThan(0).When(x => x.CategoryId.HasValue);
        RuleFor(x => x.Amount).GreaterThan(0).LessThanOrEqualTo(9999999999999999.99m);
        RuleFor(x => x.PaymentMode).MaximumLength(50);
        RuleFor(x => x.Description).MaximumLength(1000);
        RuleFor(x => x.ReferenceNo).MaximumLength(100);
    }
}

public sealed class CreateMyWalletTransactionRequestValidator : AbstractValidator<CreateMyWalletTransactionRequest>
{
    public CreateMyWalletTransactionRequestValidator()
    {
        RuleFor(x => x.TransactionDate).NotEmpty();
        RuleFor(x => x.CategoryId).GreaterThan(0).When(x => x.CategoryId.HasValue);
        RuleFor(x => x.Amount).GreaterThan(0).LessThanOrEqualTo(9999999999999999.99m);
        RuleFor(x => x.PaymentMode).MaximumLength(50);
        RuleFor(x => x.Description).MaximumLength(1000);
        RuleFor(x => x.ReferenceNo).MaximumLength(100);
    }
}

public sealed class CreateRojmelAdjustmentRequestValidator : AbstractValidator<CreateRojmelAdjustmentRequest>
{
    public CreateRojmelAdjustmentRequestValidator()
    {
        RuleFor(x => x.WalletId).GreaterThan(0);
        RuleFor(x => x.TransactionDate).NotEmpty();
        RuleFor(x => x.Amount).GreaterThan(0).LessThanOrEqualTo(9999999999999999.99m);
        RuleFor(x => x.Description).NotEmpty().MaximumLength(1000);
        RuleFor(x => x.ReferenceNo).MaximumLength(100);
    }
}

public sealed class CancelRojmelTransactionRequestValidator : AbstractValidator<CancelRojmelTransactionRequest>
{
    public CancelRojmelTransactionRequestValidator() => RuleFor(x => x.Reason).NotEmpty().MaximumLength(1000);
}

public sealed class RojmelTransferListQueryValidator : AbstractValidator<RojmelTransferListQuery>
{
    public RojmelTransferListQueryValidator()
    {
        RuleFor(x => x.PageNumber).GreaterThan(0);
        RuleFor(x => x.PageSize).InclusiveBetween(1, 200);
        RuleFor(x => x.WalletId).GreaterThan(0).When(x => x.WalletId.HasValue);
        RuleFor(x => x.Search).MaximumLength(200);
        RuleFor(x => x).Must(x => !x.FromDate.HasValue || !x.ToDate.HasValue || x.FromDate <= x.ToDate).WithMessage("FromDate must be on or before ToDate.");
    }
}

public sealed class CreateRojmelTransferRequestValidator : AbstractValidator<CreateRojmelTransferRequest>
{
    public CreateRojmelTransferRequestValidator()
    {
        RuleFor(x => x.TransferDate).NotEmpty();
        RuleFor(x => x.FromWalletId).GreaterThan(0);
        RuleFor(x => x.ToWalletId).GreaterThan(0).NotEqual(x => x.FromWalletId);
        RuleFor(x => x.Amount).GreaterThan(0).LessThanOrEqualTo(9999999999999999.99m);
        RuleFor(x => x.Description).MaximumLength(1000);
        RuleFor(x => x.ReferenceNo).MaximumLength(100);
    }
}

public sealed class CancelRojmelTransferRequestValidator : AbstractValidator<CancelRojmelTransferRequest>
{
    public CancelRojmelTransferRequestValidator() => RuleFor(x => x.Reason).NotEmpty().MaximumLength(1000);
}

public sealed class RojmelDashboardQueryValidator : AbstractValidator<RojmelDashboardQuery>
{
    public RojmelDashboardQueryValidator()
    {
        RuleFor(x => x.RecentTransactionCount).InclusiveBetween(1, 100);
        RuleFor(x => x).Must(x => !x.FromDate.HasValue || !x.ToDate.HasValue || x.FromDate <= x.ToDate).WithMessage("FromDate must be on or before ToDate.");
    }
}

public sealed class RojmelReportQueryValidator : AbstractValidator<RojmelReportQuery>
{
    public RojmelReportQueryValidator()
    {
        RuleFor(x => x.PageNumber).GreaterThan(0);
        RuleFor(x => x.PageSize).InclusiveBetween(1, 200);
        RuleFor(x => x.WalletId).GreaterThan(0).When(x => x.WalletId.HasValue);
        RuleFor(x => x.LinkedUserId).GreaterThan(0).When(x => x.LinkedUserId.HasValue);
        RuleFor(x => x.CategoryId).GreaterThan(0).When(x => x.CategoryId.HasValue);
        RuleFor(x => x.Search).MaximumLength(200);
        RuleFor(x => x).Must(x => !x.FromDate.HasValue || !x.ToDate.HasValue || x.FromDate <= x.ToDate).WithMessage("FromDate must be on or before ToDate.");
    }
}
