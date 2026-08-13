namespace Cosmos.Domain.WebsiteManagement;

public enum WebsitePublishStatus
{
    Draft,
    Published,
    Archived
}

public enum AnnouncementPlacement
{
    TopBar
}

public enum WarrantyClaimStatus
{
    Submitted,
    UnderReview,
    NeedMoreInformation,
    Approved,
    Rejected,
    Completed,
    Cancelled
}

public enum WarrantyResolutionType
{
    Replacement,
    Refund,
    Repair,
    Other
}

public enum WarrantyAttachmentType
{
    Invoice,
    ProductDamageImage
}

public enum WebsiteAttachmentScanStatus
{
    Pending,
    Clean,
    Rejected
}
