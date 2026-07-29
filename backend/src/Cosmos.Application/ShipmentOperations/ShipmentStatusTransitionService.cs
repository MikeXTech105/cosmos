using Cosmos.Domain.ShipmentOperations;
using Cosmos.Shared.Exceptions;

namespace Cosmos.Application.ShipmentOperations;

public sealed class ShipmentStatusTransitionService
{
    public void EnsureAllowed(ShipmentStatus current, ShipmentStatus target)
    {
        if (current == ShipmentStatus.Closed)
        {
            throw new CosmosException("Closed shipments are immutable.", 409);
        }

        if (current == target || !AllowedTargets(current).Contains(target))
        {
            throw new CosmosException($"Shipment status transition from {current} to {target} is not allowed.", 409);
        }
    }

    public static ShipmentTrackingEventType TrackingEventFor(ShipmentStatus status) => status switch
    {
        ShipmentStatus.ReadyForPacking => ShipmentTrackingEventType.ReadyForPacking,
        ShipmentStatus.PackingInProgress => ShipmentTrackingEventType.PackingStarted,
        ShipmentStatus.Packed => ShipmentTrackingEventType.Packed,
        ShipmentStatus.ReadyForDispatch => ShipmentTrackingEventType.Packed,
        ShipmentStatus.Dispatched => ShipmentTrackingEventType.Dispatched,
        ShipmentStatus.AppointmentPending => ShipmentTrackingEventType.AppointmentRequested,
        ShipmentStatus.AppointmentBooked => ShipmentTrackingEventType.AppointmentBooked,
        ShipmentStatus.InTransit => ShipmentTrackingEventType.InTransit,
        ShipmentStatus.DeliveryAttempted => ShipmentTrackingEventType.DeliveryAttempted,
        ShipmentStatus.PartiallyDelivered => ShipmentTrackingEventType.PartiallyDelivered,
        ShipmentStatus.Delivered => ShipmentTrackingEventType.Delivered,
        ShipmentStatus.ReturnInProgress => ShipmentTrackingEventType.ReturnInitiated,
        ShipmentStatus.Returned => ShipmentTrackingEventType.Returned,
        ShipmentStatus.Cancelled => ShipmentTrackingEventType.Cancelled,
        ShipmentStatus.Closed => ShipmentTrackingEventType.Closed,
        _ => ShipmentTrackingEventType.ShipmentCreated
    };

    private static IReadOnlySet<ShipmentStatus> AllowedTargets(ShipmentStatus status) => status switch
    {
        ShipmentStatus.Draft => new HashSet<ShipmentStatus> { ShipmentStatus.ReadyForPacking, ShipmentStatus.PackingInProgress },
        ShipmentStatus.ReadyForPacking => new HashSet<ShipmentStatus> { ShipmentStatus.PackingInProgress },
        ShipmentStatus.PackingInProgress => new HashSet<ShipmentStatus> { ShipmentStatus.Packed },
        ShipmentStatus.Packed => new HashSet<ShipmentStatus> { ShipmentStatus.ReadyForDispatch },
        ShipmentStatus.ReadyForDispatch => new HashSet<ShipmentStatus> { ShipmentStatus.Dispatched },
        ShipmentStatus.Dispatched => new HashSet<ShipmentStatus> { ShipmentStatus.AppointmentPending, ShipmentStatus.AppointmentBooked, ShipmentStatus.InTransit, ShipmentStatus.DeliveryAttempted, ShipmentStatus.PartiallyDelivered, ShipmentStatus.Delivered, ShipmentStatus.ReturnInProgress },
        ShipmentStatus.AppointmentPending => new HashSet<ShipmentStatus> { ShipmentStatus.AppointmentBooked, ShipmentStatus.InTransit, ShipmentStatus.DeliveryAttempted, ShipmentStatus.ReturnInProgress },
        ShipmentStatus.AppointmentBooked => new HashSet<ShipmentStatus> { ShipmentStatus.InTransit, ShipmentStatus.DeliveryAttempted, ShipmentStatus.ReturnInProgress },
        ShipmentStatus.InTransit => new HashSet<ShipmentStatus> { ShipmentStatus.DeliveryAttempted, ShipmentStatus.PartiallyDelivered, ShipmentStatus.Delivered, ShipmentStatus.ReturnInProgress },
        ShipmentStatus.DeliveryAttempted => new HashSet<ShipmentStatus> { ShipmentStatus.InTransit, ShipmentStatus.PartiallyDelivered, ShipmentStatus.Delivered, ShipmentStatus.ReturnInProgress },
        ShipmentStatus.PartiallyDelivered => new HashSet<ShipmentStatus> { ShipmentStatus.Delivered, ShipmentStatus.ReturnInProgress, ShipmentStatus.Closed },
        ShipmentStatus.Delivered => new HashSet<ShipmentStatus> { ShipmentStatus.ReturnInProgress, ShipmentStatus.Closed },
        ShipmentStatus.ReturnInProgress => new HashSet<ShipmentStatus> { ShipmentStatus.Returned, ShipmentStatus.Closed },
        ShipmentStatus.Returned => new HashSet<ShipmentStatus> { ShipmentStatus.Closed },
        _ => new HashSet<ShipmentStatus>()
    };
}
