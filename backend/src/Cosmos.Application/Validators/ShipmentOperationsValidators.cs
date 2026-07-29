using Cosmos.Contracts.ShipmentOperations;
using Cosmos.Domain.ShipmentOperations;
using FluentValidation;

namespace Cosmos.Application.Validators;

public sealed class ShipmentListQueryValidator : AbstractValidator<ShipmentListQuery>
{
    public ShipmentListQueryValidator()
    {
        RuleFor(x => x.Search).MaximumLength(200);
        RuleFor(x => x.ChannelId).GreaterThan(0).When(x => x.ChannelId.HasValue);
        RuleFor(x => x.WarehouseId).GreaterThan(0).When(x => x.WarehouseId.HasValue);
        RuleFor(x => x.PageNumber).GreaterThan(0);
        RuleFor(x => x.PageSize).InclusiveBetween(1, 200);
        RuleFor(x => x).Must(x => !x.FromDate.HasValue || !x.ToDate.HasValue || x.FromDate <= x.ToDate).WithMessage("FromDate must be on or before ToDate.");
    }
}

public sealed class CreateManualShipmentRequestValidator : AbstractValidator<CreateManualShipmentRequest>
{
    public CreateManualShipmentRequestValidator()
    {
        RuleFor(x => x.ChannelId).GreaterThan(0);
        RuleFor(x => x.WarehouseId).GreaterThan(0);
        RuleFor(x => x.ShipmentDate).NotEmpty();
        RuleFor(x => x.ExpectedDeliveryDate).GreaterThanOrEqualTo(x => x.ShipmentDate).When(x => x.ExpectedDeliveryDate.HasValue);
        RuleFor(x => x.TransporterPartyId).NotEmpty().When(x => x.TransporterPartyId.HasValue);
        RuleFor(x => x.InvoiceNumber).MaximumLength(100);
        RuleFor(x => x.StoNumber).MaximumLength(100);
        RuleFor(x => x.MarketplaceReference).MaximumLength(150);
        RuleFor(x => x.ExternalShipmentReference).MaximumLength(150);
        RuleFor(x => x.ManualReason).NotEmpty().MaximumLength(1000);
        RuleFor(x => x.Notes).MaximumLength(2000);
        RuleFor(x => x.Items).NotEmpty().Must(x => x.Count <= 500);
        RuleForEach(x => x.Items).SetValidator(new CreateShipmentItemRequestValidator());
        RuleFor(x => x.Items).Must(x => x.Select(i => i.ItemId).Distinct().Count() == x.Count).WithMessage("A manual shipment can contain an Item only once.");
    }
}

public sealed class CreateShipmentItemRequestValidator : AbstractValidator<CreateShipmentItemRequest>
{
    public CreateShipmentItemRequestValidator()
    {
        RuleFor(x => x.ItemId).GreaterThan(0);
        RuleFor(x => x.PlannedQuantity).GreaterThan(0);
        RuleFor(x => x.ChannelItemMappingId).GreaterThan(0).When(x => x.ChannelItemMappingId.HasValue);
        RuleFor(x => x.DispatchPlanningAllocationId).GreaterThan(0).When(x => x.DispatchPlanningAllocationId.HasValue);
        RuleFor(x => x.PackagingProfileId).GreaterThan(0).When(x => x.PackagingProfileId.HasValue);
        RuleFor(x => x.Notes).MaximumLength(1000);
    }
}

public sealed class CreateShipmentFromDispatchPlanRequestValidator : AbstractValidator<CreateShipmentFromDispatchPlanRequest>
{
    public CreateShipmentFromDispatchPlanRequestValidator()
    {
        RuleFor(x => x.DispatchPlanningRunId).GreaterThan(0);
        RuleFor(x => x.WarehouseId).GreaterThan(0);
        RuleFor(x => x.ShipmentDate).NotEmpty();
        RuleFor(x => x.ExpectedDeliveryDate).GreaterThanOrEqualTo(x => x.ShipmentDate).When(x => x.ExpectedDeliveryDate.HasValue);
        RuleFor(x => x.Allocations).NotEmpty().Must(x => x.Count <= 500);
        RuleForEach(x => x.Allocations).SetValidator(new DispatchAllocationShipmentLineRequestValidator());
        RuleFor(x => x.Allocations).Must(x => x.Select(i => i.DispatchPlanningAllocationId).Distinct().Count() == x.Count).WithMessage("An allocation may be selected once only.");
        RuleFor(x => x.Notes).MaximumLength(2000);
    }
}

public sealed class DispatchAllocationShipmentLineRequestValidator : AbstractValidator<DispatchAllocationShipmentLineRequest>
{
    public DispatchAllocationShipmentLineRequestValidator()
    {
        RuleFor(x => x.DispatchPlanningAllocationId).GreaterThan(0);
        RuleFor(x => x.PlannedQuantity).GreaterThan(0);
    }
}

public sealed class TransitionShipmentRequestValidator : AbstractValidator<TransitionShipmentRequest>
{
    public TransitionShipmentRequestValidator()
    {
        RuleFor(x => x.TargetStatus).IsInEnum();
        RuleFor(x => x.Remarks).MaximumLength(1000);
    }
}

public sealed class CancelShipmentRequestValidator : AbstractValidator<CancelShipmentRequest>
{
    public CancelShipmentRequestValidator() => RuleFor(x => x.Reason).NotEmpty().MaximumLength(1000);
}

public sealed class ShipmentPackingSuggestionRequestValidator : AbstractValidator<ShipmentPackingSuggestionRequest> { }

public sealed class SaveShipmentPackageRequestValidator : AbstractValidator<SaveShipmentPackageRequest>
{
    public SaveShipmentPackageRequestValidator()
    {
        RuleFor(x => x.PackageNumber).NotEmpty().MaximumLength(100);
        RuleFor(x => x.PackageType).NotEmpty().MaximumLength(50);
        RuleFor(x => x.Items).NotEmpty().Must(x => x.Count <= 200);
        RuleForEach(x => x.Items).SetValidator(new SaveShipmentPackageItemRequestValidator());
        RuleFor(x => x.Items).Must(x => x.Select(i => i.ShipmentItemId).Distinct().Count() == x.Count).WithMessage("A package can contain an Item only once.");
        RuleFor(x => x).Must(x => x.IsMixedPackage || x.Items.Count <= 1).WithMessage("A package with multiple Items must be marked mixed.");
        RuleFor(x => x.PackagingProfileId).GreaterThan(0).When(x => x.PackagingProfileId.HasValue);
        RuleFor(x => x.Length).GreaterThanOrEqualTo(0);
        RuleFor(x => x.Width).GreaterThanOrEqualTo(0);
        RuleFor(x => x.Height).GreaterThanOrEqualTo(0);
        RuleFor(x => x.GrossWeight).GreaterThanOrEqualTo(0);
        RuleFor(x => x.NetWeight).GreaterThanOrEqualTo(0).LessThanOrEqualTo(x => x.GrossWeight);
        RuleFor(x => x.DimensionUnit).Must(x => x is "CM" or "MM").WithMessage("DimensionUnit must be CM or MM.");
        RuleFor(x => x.WeightUnit).Must(x => x is "KG" or "G").WithMessage("WeightUnit must be KG or G.");
        RuleFor(x => x.VolumetricDivisor).GreaterThan(0).When(x => x.VolumetricDivisor.HasValue);
        RuleFor(x => x.TrackingLabel).MaximumLength(200);
        RuleFor(x => x.Barcode).MaximumLength(200);
        RuleFor(x => x.SealNumber).MaximumLength(100);
        RuleFor(x => x.Notes).MaximumLength(1000);
    }
}

public sealed class SaveShipmentPackageItemRequestValidator : AbstractValidator<SaveShipmentPackageItemRequest>
{
    public SaveShipmentPackageItemRequestValidator()
    {
        RuleFor(x => x.ShipmentItemId).GreaterThan(0);
        RuleFor(x => x.Quantity).GreaterThan(0);
    }
}

public sealed class SaveShipmentDocketRequestValidator : AbstractValidator<SaveShipmentDocketRequest>
{
    public SaveShipmentDocketRequestValidator()
    {
        RuleFor(x => x.TransporterPartyId).NotEmpty();
        RuleFor(x => x.DocketNumber).NotEmpty().MaximumLength(100);
        RuleFor(x => x.DocketDate).NotEmpty();
        RuleFor(x => x.DispatchMode).IsInEnum();
        RuleFor(x => x.TrackingUrl).MaximumLength(1000).Must(x => string.IsNullOrWhiteSpace(x) || Uri.TryCreate(x, UriKind.Absolute, out _)).WithMessage("TrackingUrl must be an absolute URL.");
        RuleFor(x => x.VehicleNumber).MaximumLength(50);
        RuleFor(x => x.DriverName).MaximumLength(150);
        RuleFor(x => x.DriverMobile).MaximumLength(30);
        RuleFor(x => x.PickupReference).MaximumLength(100);
        RuleFor(x => x.Notes).MaximumLength(1000);
    }
}

public sealed class SaveShipmentAppointmentRequestValidator : AbstractValidator<SaveShipmentAppointmentRequest>
{
    public SaveShipmentAppointmentRequestValidator()
    {
        RuleFor(x => x.AppointmentDate).NotEmpty();
        RuleFor(x => x.AppointmentStatus).IsInEnum();
        RuleFor(x => x.TimeTo).GreaterThanOrEqualTo(x => x.TimeFrom).When(x => x.TimeFrom.HasValue && x.TimeTo.HasValue);
        RuleFor(x => x.AppointmentReference).MaximumLength(100);
        RuleFor(x => x.Remarks).MaximumLength(1000);
        RuleFor(x => x.CancellationReason).NotEmpty().MaximumLength(1000).When(x => x.AppointmentStatus == ShipmentAppointmentStatus.Cancelled);
    }
}

public sealed class AddShipmentTrackingEventRequestValidator : AbstractValidator<AddShipmentTrackingEventRequest>
{
    public AddShipmentTrackingEventRequestValidator()
    {
        RuleFor(x => x.EventType).IsInEnum();
        RuleFor(x => x.EventDateTimeUtc).NotEmpty();
        RuleFor(x => x.Source).NotEmpty().MaximumLength(50);
        RuleFor(x => x.EventStatus).MaximumLength(100);
        RuleFor(x => x.Location).MaximumLength(250);
        RuleFor(x => x.ReferenceNumber).MaximumLength(100);
        RuleFor(x => x.Remarks).MaximumLength(1000);
    }
}

public sealed class AddShipmentDeliveryAttemptRequestValidator : AbstractValidator<AddShipmentDeliveryAttemptRequest>
{
    public AddShipmentDeliveryAttemptRequestValidator()
    {
        RuleFor(x => x.AttemptDateTimeUtc).NotEmpty();
        RuleFor(x => x.Outcome).IsInEnum();
        RuleFor(x => x.ReasonCode).MaximumLength(100);
        RuleFor(x => x.Remarks).MaximumLength(1000);
    }
}

public sealed class CreateShipmentReceiptRequestValidator : AbstractValidator<CreateShipmentReceiptRequest>
{
    public CreateShipmentReceiptRequestValidator()
    {
        RuleFor(x => x.ReceiptDate).NotEmpty();
        RuleFor(x => x.Items).NotEmpty().Must(x => x.Count <= 500);
        RuleForEach(x => x.Items).SetValidator(new CreateShipmentReceiptItemRequestValidator());
        RuleFor(x => x.Items).Must(x => x.Select(i => i.ShipmentItemId).Distinct().Count() == x.Count).WithMessage("A receipt can contain a Shipment Item only once.");
        RuleFor(x => x.MarketplaceReceiptReference).MaximumLength(150);
        RuleFor(x => x.ReceivedByName).MaximumLength(150);
        RuleFor(x => x.ProofAttachmentUrl).MaximumLength(1000).Must(x => string.IsNullOrWhiteSpace(x) || Uri.TryCreate(x, UriKind.Absolute, out _) || x.StartsWith('/')).WithMessage("ProofAttachmentUrl must be an absolute URL or application-relative path.");
        RuleFor(x => x.Notes).MaximumLength(1000);
    }
}

public sealed class CreateShipmentReceiptItemRequestValidator : AbstractValidator<CreateShipmentReceiptItemRequest>
{
    public CreateShipmentReceiptItemRequestValidator()
    {
        RuleFor(x => x.ShipmentItemId).GreaterThan(0);
        RuleFor(x => x.ReceivedQuantity).GreaterThanOrEqualTo(0);
        RuleFor(x => x.RejectedQuantity).GreaterThanOrEqualTo(0);
        RuleFor(x => x.DamagedQuantity).GreaterThanOrEqualTo(0);
        RuleFor(x => x.ShortQuantity).GreaterThanOrEqualTo(0);
        RuleFor(x => x).Must(x => x.ReceivedQuantity + x.RejectedQuantity + x.DamagedQuantity + x.ShortQuantity > 0).WithMessage("Receipt quantity must be greater than zero.");
        RuleFor(x => x.ReasonCode).MaximumLength(100);
        RuleFor(x => x.Notes).MaximumLength(1000);
    }
}

public sealed class CreateShipmentReturnRequestValidator : AbstractValidator<CreateShipmentReturnRequest>
{
    public CreateShipmentReturnRequestValidator()
    {
        RuleFor(x => x.ReturnDate).NotEmpty();
        RuleFor(x => x.ReturnReason).NotEmpty().MaximumLength(1000);
        RuleFor(x => x.Items).NotEmpty().Must(x => x.Count <= 500);
        RuleForEach(x => x.Items).SetValidator(new CreateShipmentReturnItemRequestValidator());
        RuleFor(x => x.Items).Must(x => x.Select(i => i.ShipmentItemId).Distinct().Count() == x.Count).WithMessage("A return can contain a Shipment Item only once.");
        RuleFor(x => x.DocketNumber).MaximumLength(100);
        RuleFor(x => x.Notes).MaximumLength(1000);
    }
}

public sealed class CreateShipmentReturnItemRequestValidator : AbstractValidator<CreateShipmentReturnItemRequest>
{
    public CreateShipmentReturnItemRequestValidator()
    {
        RuleFor(x => x.ShipmentItemId).GreaterThan(0);
        RuleFor(x => x.ReturnQuantity).GreaterThan(0);
        RuleFor(x => x.ReasonCode).MaximumLength(100);
        RuleFor(x => x.Notes).MaximumLength(1000);
    }
}

public sealed class ReceiveShipmentReturnRequestValidator : AbstractValidator<ReceiveShipmentReturnRequest>
{
    public ReceiveShipmentReturnRequestValidator()
    {
        RuleFor(x => x.ReceivedBackDate).NotEmpty();
        RuleFor(x => x.Items).NotEmpty().Must(x => x.Count <= 500);
        RuleForEach(x => x.Items).SetValidator(new ReceiveShipmentReturnItemRequestValidator());
        RuleFor(x => x.Items).Must(x => x.Select(i => i.ShipmentReturnItemId).Distinct().Count() == x.Count).WithMessage("A return line can be received once per request.");
        RuleFor(x => x.Notes).MaximumLength(1000);
    }
}

public sealed class ReceiveShipmentReturnItemRequestValidator : AbstractValidator<ReceiveShipmentReturnItemRequest>
{
    public ReceiveShipmentReturnItemRequestValidator()
    {
        RuleFor(x => x.ShipmentReturnItemId).GreaterThan(0);
        RuleFor(x => x.ReceivedBackQuantity).GreaterThan(0);
        RuleFor(x => x.RestockableQuantity).GreaterThanOrEqualTo(0);
        RuleFor(x => x.DamagedQuantity).GreaterThanOrEqualTo(0);
        RuleFor(x => x.NonRestockableQuantity).GreaterThanOrEqualTo(0);
        RuleFor(x => x).Must(x => x.RestockableQuantity + x.DamagedQuantity + x.NonRestockableQuantity <= x.ReceivedBackQuantity).WithMessage("Return disposition cannot exceed received-back quantity.");
        RuleFor(x => x.ReasonCode).MaximumLength(100);
        RuleFor(x => x.Notes).MaximumLength(1000);
    }
}

public sealed class SaveShipmentFreightChargeRequestValidator : AbstractValidator<SaveShipmentFreightChargeRequest>
{
    public SaveShipmentFreightChargeRequestValidator()
    {
        RuleFor(x => x.ChargeType).IsInEnum();
        RuleFor(x => x.CurrencyCode).NotEmpty().Length(3).Matches("^[A-Z]{3}$");
        RuleFor(x => x.BaseFreight).GreaterThanOrEqualTo(0);
        RuleFor(x => x.FuelSurcharge).GreaterThanOrEqualTo(0);
        RuleFor(x => x.HandlingCharge).GreaterThanOrEqualTo(0);
        RuleFor(x => x.LoadingCharge).GreaterThanOrEqualTo(0);
        RuleFor(x => x.UnloadingCharge).GreaterThanOrEqualTo(0);
        RuleFor(x => x.AppointmentCharge).GreaterThanOrEqualTo(0);
        RuleFor(x => x.ReturnFreight).GreaterThanOrEqualTo(0);
        RuleFor(x => x.OtherCharge).GreaterThanOrEqualTo(0);
        RuleFor(x => x.TaxAmount).GreaterThanOrEqualTo(0);
        RuleFor(x => x.DiscountAmount).GreaterThanOrEqualTo(0);
        RuleFor(x => x).Must(x => x.BaseFreight + x.FuelSurcharge + x.HandlingCharge + x.LoadingCharge + x.UnloadingCharge + x.AppointmentCharge + x.ReturnFreight + x.OtherCharge + x.TaxAmount - x.DiscountAmount > 0).WithMessage("Total freight charge must be greater than zero.");
        RuleFor(x => x.ActualWeight).GreaterThanOrEqualTo(0);
        RuleFor(x => x.VolumetricWeight).GreaterThanOrEqualTo(0);
        RuleFor(x => x.ChargeableWeight).GreaterThanOrEqualTo(0);
        RuleFor(x => x.RatePerWeightUnit).GreaterThanOrEqualTo(0).When(x => x.RatePerWeightUnit.HasValue);
        RuleFor(x => x.TransporterInvoiceNumber).MaximumLength(100);
    }
}

public sealed class ApproveShipmentFreightRequestValidator : AbstractValidator<ApproveShipmentFreightRequest>
{
    public ApproveShipmentFreightRequestValidator() => RuleFor(x => x.ApprovalNotes).MaximumLength(1000);
}

public sealed class RejectShipmentFreightRequestValidator : AbstractValidator<RejectShipmentFreightRequest>
{
    public RejectShipmentFreightRequestValidator() => RuleFor(x => x.Reason).NotEmpty().MaximumLength(1000);
}

public sealed class MarkShipmentFreightPaidRequestValidator : AbstractValidator<MarkShipmentFreightPaidRequest>
{
    public MarkShipmentFreightPaidRequestValidator()
    {
        RuleFor(x => x.PaidAtUtc).NotEmpty();
        RuleFor(x => x.PaymentReference).MaximumLength(100);
    }
}

public sealed class CreateShipmentFreightRojmelExpenseRequestValidator : AbstractValidator<CreateShipmentFreightRojmelExpenseRequest>
{
    public CreateShipmentFreightRojmelExpenseRequestValidator()
    {
        RuleFor(x => x.WalletId).GreaterThan(0);
        RuleFor(x => x.TransactionDate).NotEmpty();
        RuleFor(x => x.CategoryId).GreaterThan(0).When(x => x.CategoryId.HasValue);
        RuleFor(x => x.PaymentMode).MaximumLength(50);
        RuleFor(x => x.Description).MaximumLength(1000);
    }
}

public sealed class ShipmentReportQueryValidator : AbstractValidator<ShipmentReportQuery>
{
    public ShipmentReportQueryValidator()
    {
        RuleFor(x => x.ChannelId).GreaterThan(0).When(x => x.ChannelId.HasValue);
        RuleFor(x => x.WarehouseId).GreaterThan(0).When(x => x.WarehouseId.HasValue);
        RuleFor(x => x.PageNumber).GreaterThan(0);
        RuleFor(x => x.PageSize).InclusiveBetween(1, 500);
        RuleFor(x => x).Must(x => !x.FromDate.HasValue || !x.ToDate.HasValue || x.FromDate <= x.ToDate).WithMessage("FromDate must be on or before ToDate.");
    }
}

public sealed class ValidateShipmentHistoricalImportRequestValidator : AbstractValidator<ValidateShipmentHistoricalImportRequest>
{
    public ValidateShipmentHistoricalImportRequestValidator()
    {
        RuleFor(x => x.OriginalFileName).NotEmpty().MaximumLength(260);
        RuleFor(x => x.FileHash).NotEmpty().Length(64).Matches("^[A-Fa-f0-9]{64}$");
        RuleFor(x => x.Rows).NotEmpty().Must(x => x.Count <= 50_000);
        RuleForEach(x => x.Rows).SetValidator(new ShipmentHistoricalImportRowRequestValidator());
    }
}

public sealed class ShipmentHistoricalImportRowRequestValidator : AbstractValidator<ShipmentHistoricalImportRowRequest>
{
    public ShipmentHistoricalImportRowRequestValidator()
    {
        RuleFor(x => x.RowNumber).GreaterThan(0);
        RuleFor(x => x.SourceShipmentReference).MaximumLength(150);
        RuleFor(x => x.ChannelCode).NotEmpty().MaximumLength(50);
        RuleFor(x => x.WarehouseCode).NotEmpty().MaximumLength(50);
        RuleFor(x => x.ChannelSku).NotEmpty().MaximumLength(150);
        RuleFor(x => x.Quantity).GreaterThan(0);
        RuleFor(x => x.ShipmentDate).NotEmpty();
        RuleFor(x => x.Status).IsInEnum();
        RuleFor(x => x.DocketNumber).MaximumLength(100);
        RuleFor(x => x.InvoiceNumber).MaximumLength(100);
        RuleFor(x => x.StoNumber).MaximumLength(100);
        RuleFor(x => x.TransporterPartyCode).MaximumLength(50);
        RuleFor(x => x.FreightAmount).GreaterThanOrEqualTo(0).When(x => x.FreightAmount.HasValue);
        RuleFor(x => x.Notes).MaximumLength(1000);
    }
}

public sealed class CommitShipmentHistoricalImportRequestValidator : AbstractValidator<CommitShipmentHistoricalImportRequest>
{
    public CommitShipmentHistoricalImportRequestValidator() => RuleFor(x => x.CorrectionReason).NotEmpty().MaximumLength(1000).When(x => x.AllowDuplicate);
}

public sealed class CancelShipmentHistoricalImportRequestValidator : AbstractValidator<CancelShipmentHistoricalImportRequest>
{
    public CancelShipmentHistoricalImportRequestValidator() => RuleFor(x => x.Reason).NotEmpty().MaximumLength(1000);
}

public sealed class ShipmentHistoricalImportBatchQueryValidator : AbstractValidator<ShipmentHistoricalImportBatchQuery>
{
    public ShipmentHistoricalImportBatchQueryValidator()
    {
        RuleFor(x => x.Status).InclusiveBetween(1, 6).When(x => x.Status.HasValue);
        RuleFor(x => x.PageNumber).GreaterThan(0);
        RuleFor(x => x.PageSize).InclusiveBetween(1, 200);
    }
}
