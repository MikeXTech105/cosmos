using System.Text.Json.Serialization;

namespace Cosmos.Domain.ShipmentOperations;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum ShipmentStatus
{
    Draft = 1,
    ReadyForPacking = 2,
    PackingInProgress = 3,
    Packed = 4,
    ReadyForDispatch = 5,
    Dispatched = 6,
    AppointmentPending = 7,
    AppointmentBooked = 8,
    InTransit = 9,
    DeliveryAttempted = 10,
    PartiallyDelivered = 11,
    Delivered = 12,
    ReturnInProgress = 13,
    Returned = 14,
    Cancelled = 15,
    Closed = 16
}

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum ShipmentSourceType
{
    Manual = 1,
    DispatchPlanning = 2,
    HistoricalImport = 3
}

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum ShipmentDispatchMode
{
    Road = 1,
    Air = 2,
    Rail = 3,
    Courier = 4,
    HandDelivery = 5,
    Other = 99
}

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum ShipmentPriority
{
    Low = 1,
    Normal = 2,
    High = 3,
    Urgent = 4
}

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum ShipmentAppointmentStatus
{
    NotRequired = 1,
    Pending = 2,
    Requested = 3,
    Booked = 4,
    Rescheduled = 5,
    Completed = 6,
    Missed = 7,
    Cancelled = 8
}

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum ShipmentTrackingEventType
{
    ShipmentCreated = 1,
    ReadyForPacking = 2,
    PackingStarted = 3,
    Packed = 4,
    DocketCreated = 5,
    AppointmentRequested = 6,
    AppointmentBooked = 7,
    AppointmentRescheduled = 8,
    Dispatched = 9,
    InTransit = 10,
    DeliveryAttempted = 11,
    PartiallyDelivered = 12,
    Delivered = 13,
    ReturnInitiated = 14,
    Returned = 15,
    Cancelled = 16,
    Closed = 17
}

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum ShipmentDeliveryAttemptOutcome
{
    Successful = 1,
    Partial = 2,
    Failed = 3,
    Rescheduled = 4,
    Rejected = 5
}

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum ShipmentReturnStatus
{
    Draft = 1,
    Approved = 2,
    InTransit = 3,
    Received = 4,
    PartiallyReceived = 5,
    Cancelled = 6,
    Closed = 7
}

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum ShipmentFreightStatus
{
    Draft = 1,
    Submitted = 2,
    Approved = 3,
    Rejected = 4,
    PartiallyPaid = 5,
    Paid = 6,
    Cancelled = 7
}

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum ShipmentFreightChargeType
{
    OutboundFreight = 1,
    ReturnFreight = 2,
    Handling = 3,
    Appointment = 4,
    Loading = 5,
    Unloading = 6,
    Other = 99
}

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum PartyRoleType
{
    Transporter = 1
}
