/*
    COSMOS ERP - Shipment Operations / Work List conversion
    Prerequisites: base schema, Supply Chain common foundation, Dispatch Planning.
    Additive, rerunnable SQL Server migration. Shipment quantities use DECIMAL(19,6);
    existing Items.CurrentStock/StockMovements continue to use the established global stock model.
*/
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET XACT_ABORT ON;
GO

IF OBJECT_ID(N'dbo.PartyRoles', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.PartyRoles
    (
        PartyId UNIQUEIDENTIFIER NOT NULL,
        RoleCode NVARCHAR(50) NOT NULL,
        CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_PartyRoles_CreatedAtUtc DEFAULT SYSUTCDATETIME(),
        CreatedBy BIGINT NULL,
        CONSTRAINT PK_PartyRoles PRIMARY KEY(PartyId, RoleCode),
        CONSTRAINT FK_PartyRoles_Party FOREIGN KEY(PartyId) REFERENCES dbo.Parties(Id),
        CONSTRAINT CK_PartyRoles_RoleCode CHECK(RoleCode IN(N'Transporter'))
    );
END;
GO

IF OBJECT_ID(N'dbo.Shipments', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Shipments
    (
        Id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Shipments PRIMARY KEY,
        ShipmentNumber NVARCHAR(50) NOT NULL,
        SourceType INT NOT NULL CONSTRAINT DF_Shipments_SourceType DEFAULT(1),
        ChannelId BIGINT NOT NULL,
        WarehouseId BIGINT NOT NULL,
        ChannelCodeSnapshot NVARCHAR(50) NOT NULL,
        WarehouseCodeSnapshot NVARCHAR(50) NOT NULL,
        WarehouseNameSnapshot NVARCHAR(200) NOT NULL,
        DispatchPlanningRunId BIGINT NULL,
        ShipmentDate DATE NOT NULL,
        ExpectedDeliveryDate DATE NULL,
        InvoiceId BIGINT NULL,
        InvoiceNumber NVARCHAR(100) NULL,
        StoNumber NVARCHAR(100) NULL,
        MarketplaceReference NVARCHAR(150) NULL,
        ExternalShipmentReference NVARCHAR(150) NULL,
        TransporterPartyId UNIQUEIDENTIFIER NULL,
        DispatchMode INT NOT NULL CONSTRAINT DF_Shipments_DispatchMode DEFAULT(1),
        Status INT NOT NULL CONSTRAINT DF_Shipments_Status DEFAULT(1),
        Priority INT NOT NULL CONSTRAINT DF_Shipments_Priority DEFAULT(2),
        ManualReason NVARCHAR(1000) NULL,
        Notes NVARCHAR(2000) NULL,
        TotalPlannedQuantity DECIMAL(19,6) NOT NULL CONSTRAINT DF_Shipments_TotalPlanned DEFAULT(0),
        TotalPackedQuantity DECIMAL(19,6) NOT NULL CONSTRAINT DF_Shipments_TotalPacked DEFAULT(0),
        TotalDispatchedQuantity DECIMAL(19,6) NOT NULL CONSTRAINT DF_Shipments_TotalDispatched DEFAULT(0),
        TotalReceivedQuantity DECIMAL(19,6) NOT NULL CONSTRAINT DF_Shipments_TotalReceived DEFAULT(0),
        TotalReturnedQuantity DECIMAL(19,6) NOT NULL CONSTRAINT DF_Shipments_TotalReturned DEFAULT(0),
        TotalPackages INT NOT NULL CONSTRAINT DF_Shipments_TotalPackages DEFAULT(0),
        TotalGrossWeight DECIMAL(19,6) NOT NULL CONSTRAINT DF_Shipments_TotalGrossWeight DEFAULT(0),
        TotalVolumetricWeight DECIMAL(19,6) NOT NULL CONSTRAINT DF_Shipments_TotalVolumetricWeight DEFAULT(0),
        TotalChargeableWeight DECIMAL(19,6) NOT NULL CONSTRAINT DF_Shipments_TotalChargeableWeight DEFAULT(0),
        CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_Shipments_CreatedAtUtc DEFAULT SYSUTCDATETIME(),
        CreatedBy BIGINT NULL,
        UpdatedAtUtc DATETIME2(3) NULL,
        UpdatedBy BIGINT NULL,
        PackedAtUtc DATETIME2(3) NULL,
        PackedBy BIGINT NULL,
        DispatchedAtUtc DATETIME2(3) NULL,
        DispatchedBy BIGINT NULL,
        DeliveredAtUtc DATETIME2(3) NULL,
        DeliveredBy BIGINT NULL,
        ClosedAtUtc DATETIME2(3) NULL,
        ClosedBy BIGINT NULL,
        CancelledAtUtc DATETIME2(3) NULL,
        CancelledBy BIGINT NULL,
        CancellationReason NVARCHAR(1000) NULL,
        IsDeleted BIT NOT NULL CONSTRAINT DF_Shipments_IsDeleted DEFAULT(0),
        DeletedAtUtc DATETIME2(3) NULL,
        DeletedBy BIGINT NULL,
        RowVersion ROWVERSION NOT NULL,
        CONSTRAINT UQ_Shipments_Number UNIQUE(ShipmentNumber),
        CONSTRAINT FK_Shipments_Channel FOREIGN KEY(ChannelId) REFERENCES dbo.SalesChannels(Id),
        CONSTRAINT FK_Shipments_Warehouse FOREIGN KEY(WarehouseId) REFERENCES dbo.ChannelWarehouses(Id),
        CONSTRAINT FK_Shipments_Run FOREIGN KEY(DispatchPlanningRunId) REFERENCES dbo.DispatchPlanningRuns(Id),
        CONSTRAINT FK_Shipments_Transporter FOREIGN KEY(TransporterPartyId) REFERENCES dbo.Parties(Id),
        CONSTRAINT CK_Shipments_Source CHECK(SourceType IN(1,2,3)),
        CONSTRAINT CK_Shipments_Status CHECK(Status IN(1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16)),
        CONSTRAINT CK_Shipments_DispatchMode CHECK(DispatchMode IN(1,2,3,4,5,99)),
        CONSTRAINT CK_Shipments_Priority CHECK(Priority IN(1,2,3,4)),
        CONSTRAINT CK_Shipments_ExpectedDate CHECK(ExpectedDeliveryDate IS NULL OR ExpectedDeliveryDate>=ShipmentDate),
        CONSTRAINT CK_Shipments_Totals CHECK(TotalPlannedQuantity>=0 AND TotalPackedQuantity>=0 AND TotalPackedQuantity<=TotalPlannedQuantity AND TotalDispatchedQuantity>=0 AND TotalDispatchedQuantity<=TotalPackedQuantity AND TotalReceivedQuantity>=0 AND TotalReturnedQuantity>=0 AND TotalPackages>=0 AND TotalGrossWeight>=0 AND TotalVolumetricWeight>=0 AND TotalChargeableWeight>=0),
        CONSTRAINT CK_Shipments_SourceReference CHECK((SourceType=2 AND DispatchPlanningRunId IS NOT NULL) OR SourceType<>2)
    );
END;
GO

IF OBJECT_ID(N'dbo.ShipmentItems', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ShipmentItems
    (
        Id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ShipmentItems PRIMARY KEY,
        ShipmentId BIGINT NOT NULL,
        ItemId BIGINT NOT NULL,
        ChannelItemMappingId BIGINT NULL,
        DispatchPlanningAllocationId BIGINT NULL,
        DispatchPlanningAllocationKey AS ISNULL(DispatchPlanningAllocationId,CONVERT(BIGINT,-1)) PERSISTED,
        PlannedQuantity DECIMAL(19,6) NOT NULL,
        PackedQuantity DECIMAL(19,6) NOT NULL CONSTRAINT DF_ShipmentItems_Packed DEFAULT(0),
        DispatchedQuantity DECIMAL(19,6) NOT NULL CONSTRAINT DF_ShipmentItems_Dispatched DEFAULT(0),
        ReceivedQuantity DECIMAL(19,6) NOT NULL CONSTRAINT DF_ShipmentItems_Received DEFAULT(0),
        RejectedQuantity DECIMAL(19,6) NOT NULL CONSTRAINT DF_ShipmentItems_Rejected DEFAULT(0),
        DamagedQuantity DECIMAL(19,6) NOT NULL CONSTRAINT DF_ShipmentItems_Damaged DEFAULT(0),
        ShortQuantity DECIMAL(19,6) NOT NULL CONSTRAINT DF_ShipmentItems_Short DEFAULT(0),
        ReturnedQuantity DECIMAL(19,6) NOT NULL CONSTRAINT DF_ShipmentItems_Returned DEFAULT(0),
        RestockableReturnQuantity DECIMAL(19,6) NOT NULL CONSTRAINT DF_ShipmentItems_Restockable DEFAULT(0),
        NonRestockableReturnQuantity DECIMAL(19,6) NOT NULL CONSTRAINT DF_ShipmentItems_NonRestockable DEFAULT(0),
        UnitsPerBoxSnapshot DECIMAL(19,6) NOT NULL CONSTRAINT DF_ShipmentItems_UnitsPerBox DEFAULT(1),
        PackagingProfileId BIGINT NULL,
        ChannelSkuSnapshot NVARCHAR(150) NULL,
        ItemCodeSnapshot NVARCHAR(50) NOT NULL,
        ItemNameSnapshot NVARCHAR(200) NOT NULL,
        Notes NVARCHAR(1000) NULL,
        CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_ShipmentItems_CreatedAtUtc DEFAULT SYSUTCDATETIME(),
        CreatedBy BIGINT NULL,
        UpdatedAtUtc DATETIME2(3) NULL,
        UpdatedBy BIGINT NULL,
        CONSTRAINT FK_ShipmentItems_Shipment FOREIGN KEY(ShipmentId) REFERENCES dbo.Shipments(Id),
        CONSTRAINT FK_ShipmentItems_Item FOREIGN KEY(ItemId) REFERENCES dbo.Items(Id),
        CONSTRAINT FK_ShipmentItems_Mapping FOREIGN KEY(ChannelItemMappingId) REFERENCES dbo.ChannelSkuMappings(Id),
        CONSTRAINT FK_ShipmentItems_Allocation FOREIGN KEY(DispatchPlanningAllocationId) REFERENCES dbo.DispatchAllocations(Id),
        CONSTRAINT FK_ShipmentItems_Packaging FOREIGN KEY(PackagingProfileId) REFERENCES dbo.ItemPackagingProfiles(Id),
        CONSTRAINT CK_ShipmentItems_Quantities CHECK(PlannedQuantity>0 AND PackedQuantity>=0 AND PackedQuantity<=PlannedQuantity AND DispatchedQuantity>=0 AND DispatchedQuantity<=PackedQuantity AND ReceivedQuantity>=0 AND RejectedQuantity>=0 AND DamagedQuantity>=0 AND ShortQuantity>=0 AND ReceivedQuantity+RejectedQuantity+DamagedQuantity+ShortQuantity<=DispatchedQuantity AND ReturnedQuantity>=0 AND ReturnedQuantity<=DispatchedQuantity AND RestockableReturnQuantity>=0 AND NonRestockableReturnQuantity>=0 AND RestockableReturnQuantity+NonRestockableReturnQuantity<=ReturnedQuantity AND UnitsPerBoxSnapshot>0)
    );
END;
GO
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name=N'UX_ShipmentItems_ShipmentItemAllocation' AND object_id=OBJECT_ID(N'dbo.ShipmentItems'))
    CREATE UNIQUE INDEX UX_ShipmentItems_ShipmentItemAllocation ON dbo.ShipmentItems(ShipmentId,ItemId,DispatchPlanningAllocationKey);
GO

IF OBJECT_ID(N'dbo.ShipmentPackages', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ShipmentPackages
    (
        Id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ShipmentPackages PRIMARY KEY,
        ShipmentId BIGINT NOT NULL,
        PackageNumber NVARCHAR(100) NOT NULL,
        PackageType NVARCHAR(50) NOT NULL,
        PackagingProfileId BIGINT NULL,
        Length DECIMAL(19,6) NOT NULL CONSTRAINT DF_ShipmentPackages_Length DEFAULT(0),
        Width DECIMAL(19,6) NOT NULL CONSTRAINT DF_ShipmentPackages_Width DEFAULT(0),
        Height DECIMAL(19,6) NOT NULL CONSTRAINT DF_ShipmentPackages_Height DEFAULT(0),
        DimensionUnit NVARCHAR(5) NOT NULL CONSTRAINT DF_ShipmentPackages_DimensionUnit DEFAULT(N'CM'),
        GrossWeight DECIMAL(19,6) NOT NULL CONSTRAINT DF_ShipmentPackages_GrossWeight DEFAULT(0),
        NetWeight DECIMAL(19,6) NOT NULL CONSTRAINT DF_ShipmentPackages_NetWeight DEFAULT(0),
        WeightUnit NVARCHAR(5) NOT NULL CONSTRAINT DF_ShipmentPackages_WeightUnit DEFAULT(N'KG'),
        VolumetricDivisor DECIMAL(19,6) NULL,
        VolumetricWeight AS (CONVERT(DECIMAL(19,6),CASE WHEN VolumetricDivisor IS NULL OR VolumetricDivisor=0 THEN 0 ELSE (Length*Width*Height)/VolumetricDivisor END)) PERSISTED,
        ChargeableWeight AS (CONVERT(DECIMAL(19,6),CASE WHEN GrossWeight>CASE WHEN VolumetricDivisor IS NULL OR VolumetricDivisor=0 THEN 0 ELSE (Length*Width*Height)/VolumetricDivisor END THEN GrossWeight ELSE CASE WHEN VolumetricDivisor IS NULL OR VolumetricDivisor=0 THEN 0 ELSE (Length*Width*Height)/VolumetricDivisor END END)) PERSISTED,
        TrackingLabel NVARCHAR(200) NULL,
        Barcode NVARCHAR(200) NULL,
        SealNumber NVARCHAR(100) NULL,
        IsMixedPackage BIT NOT NULL CONSTRAINT DF_ShipmentPackages_IsMixed DEFAULT(0),
        Notes NVARCHAR(1000) NULL,
        CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_ShipmentPackages_CreatedAtUtc DEFAULT SYSUTCDATETIME(),
        CreatedBy BIGINT NULL,
        UpdatedAtUtc DATETIME2(3) NULL,
        UpdatedBy BIGINT NULL,
        IsDeleted BIT NOT NULL CONSTRAINT DF_ShipmentPackages_IsDeleted DEFAULT(0),
        DeletedAtUtc DATETIME2(3) NULL,
        DeletedBy BIGINT NULL,
        CONSTRAINT FK_ShipmentPackages_Shipment FOREIGN KEY(ShipmentId) REFERENCES dbo.Shipments(Id),
        CONSTRAINT FK_ShipmentPackages_Profile FOREIGN KEY(PackagingProfileId) REFERENCES dbo.ItemPackagingProfiles(Id),
        CONSTRAINT CK_ShipmentPackages_Values CHECK(Length>=0 AND Width>=0 AND Height>=0 AND GrossWeight>=0 AND NetWeight>=0 AND NetWeight<=GrossWeight AND (VolumetricDivisor IS NULL OR VolumetricDivisor>0) AND DimensionUnit IN(N'CM',N'MM') AND WeightUnit IN(N'KG',N'G'))
    );
END;
GO
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name=N'UX_ShipmentPackages_Number' AND object_id=OBJECT_ID(N'dbo.ShipmentPackages'))
    CREATE UNIQUE INDEX UX_ShipmentPackages_Number ON dbo.ShipmentPackages(ShipmentId,PackageNumber) WHERE IsDeleted=0;
GO

IF OBJECT_ID(N'dbo.ShipmentPackageItems', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ShipmentPackageItems
    (
        Id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ShipmentPackageItems PRIMARY KEY,
        ShipmentPackageId BIGINT NOT NULL,
        ShipmentItemId BIGINT NOT NULL,
        Quantity DECIMAL(19,6) NOT NULL,
        CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_ShipmentPackageItems_CreatedAtUtc DEFAULT SYSUTCDATETIME(),
        CreatedBy BIGINT NULL,
        UpdatedAtUtc DATETIME2(3) NULL,
        UpdatedBy BIGINT NULL,
        CONSTRAINT FK_ShipmentPackageItems_Package FOREIGN KEY(ShipmentPackageId) REFERENCES dbo.ShipmentPackages(Id),
        CONSTRAINT FK_ShipmentPackageItems_Item FOREIGN KEY(ShipmentItemId) REFERENCES dbo.ShipmentItems(Id),
        CONSTRAINT UQ_ShipmentPackageItems_PackageItem UNIQUE(ShipmentPackageId,ShipmentItemId),
        CONSTRAINT CK_ShipmentPackageItems_Quantity CHECK(Quantity>0)
    );
END;
GO

IF OBJECT_ID(N'dbo.ShipmentDockets', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ShipmentDockets
    (
        Id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ShipmentDockets PRIMARY KEY,
        ShipmentId BIGINT NOT NULL,
        TransporterPartyId UNIQUEIDENTIFIER NOT NULL,
        DocketNumber NVARCHAR(100) NOT NULL,
        DocketDate DATE NOT NULL,
        DispatchMode INT NOT NULL,
        TrackingUrl NVARCHAR(1000) NULL,
        VehicleNumber NVARCHAR(50) NULL,
        DriverName NVARCHAR(150) NULL,
        DriverMobile NVARCHAR(30) NULL,
        PickupReference NVARCHAR(100) NULL,
        EstimatedDeliveryDate DATE NULL,
        ActualPickupDateUtc DATETIME2(3) NULL,
        Notes NVARCHAR(1000) NULL,
        CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_ShipmentDockets_CreatedAtUtc DEFAULT SYSUTCDATETIME(),
        CreatedBy BIGINT NULL,
        UpdatedAtUtc DATETIME2(3) NULL,
        UpdatedBy BIGINT NULL,
        IsDeleted BIT NOT NULL CONSTRAINT DF_ShipmentDockets_IsDeleted DEFAULT(0),
        DeletedAtUtc DATETIME2(3) NULL,
        DeletedBy BIGINT NULL,
        CONSTRAINT FK_ShipmentDockets_Shipment FOREIGN KEY(ShipmentId) REFERENCES dbo.Shipments(Id),
        CONSTRAINT FK_ShipmentDockets_Transporter FOREIGN KEY(TransporterPartyId) REFERENCES dbo.Parties(Id),
        CONSTRAINT CK_ShipmentDockets_DispatchMode CHECK(DispatchMode IN(1,2,3,4,5,99))
    );
END;
GO
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name=N'UX_ShipmentDockets_TransporterDocket' AND object_id=OBJECT_ID(N'dbo.ShipmentDockets'))
    CREATE UNIQUE INDEX UX_ShipmentDockets_TransporterDocket ON dbo.ShipmentDockets(TransporterPartyId,DocketNumber) WHERE IsDeleted=0;
GO

IF OBJECT_ID(N'dbo.ShipmentAppointments', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ShipmentAppointments
    (
        Id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ShipmentAppointments PRIMARY KEY,
        ShipmentId BIGINT NOT NULL,
        AppointmentReference NVARCHAR(100) NULL,
        AppointmentDate DATE NOT NULL,
        TimeFrom TIME NULL,
        TimeTo TIME NULL,
        AppointmentStatus INT NOT NULL,
        AttemptNumber INT NOT NULL,
        RequestedAtUtc DATETIME2(3) NULL,
        RequestedBy BIGINT NULL,
        BookedAtUtc DATETIME2(3) NULL,
        BookedBy BIGINT NULL,
        CompletedAtUtc DATETIME2(3) NULL,
        CancelledAtUtc DATETIME2(3) NULL,
        CancellationReason NVARCHAR(1000) NULL,
        Remarks NVARCHAR(1000) NULL,
        CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_ShipmentAppointments_CreatedAtUtc DEFAULT SYSUTCDATETIME(),
        CreatedBy BIGINT NULL,
        UpdatedAtUtc DATETIME2(3) NULL,
        UpdatedBy BIGINT NULL,
        CONSTRAINT FK_ShipmentAppointments_Shipment FOREIGN KEY(ShipmentId) REFERENCES dbo.Shipments(Id),
        CONSTRAINT UQ_ShipmentAppointments_Attempt UNIQUE(ShipmentId,AttemptNumber),
        CONSTRAINT CK_ShipmentAppointments_Status CHECK(AppointmentStatus IN(1,2,3,4,5,6,7,8)),
        CONSTRAINT CK_ShipmentAppointments_Time CHECK(TimeTo IS NULL OR TimeFrom IS NULL OR TimeTo>=TimeFrom)
    );
END;
GO

IF OBJECT_ID(N'dbo.ShipmentTrackingEvents', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ShipmentTrackingEvents
    (
        Id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ShipmentTrackingEvents PRIMARY KEY,
        ShipmentId BIGINT NOT NULL,
        EventType INT NOT NULL,
        EventStatus NVARCHAR(100) NULL,
        EventDateTimeUtc DATETIME2(3) NOT NULL,
        Location NVARCHAR(250) NULL,
        ReferenceNumber NVARCHAR(100) NULL,
        Source NVARCHAR(50) NOT NULL,
        Remarks NVARCHAR(1000) NULL,
        CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_ShipmentTrackingEvents_CreatedAtUtc DEFAULT SYSUTCDATETIME(),
        CreatedBy BIGINT NULL,
        CONSTRAINT FK_ShipmentTrackingEvents_Shipment FOREIGN KEY(ShipmentId) REFERENCES dbo.Shipments(Id),
        CONSTRAINT CK_ShipmentTrackingEvents_Type CHECK(EventType IN(1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17))
    );
END;
GO
CREATE OR ALTER TRIGGER dbo.TR_ShipmentTrackingEvents_AppendOnly ON dbo.ShipmentTrackingEvents
AFTER UPDATE, DELETE AS
BEGIN
    SET NOCOUNT ON;
    THROW 52080, N'Shipment tracking events are append-only.', 1;
END;
GO

IF OBJECT_ID(N'dbo.ShipmentDeliveryAttempts', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ShipmentDeliveryAttempts
    (
        Id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ShipmentDeliveryAttempts PRIMARY KEY,
        ShipmentId BIGINT NOT NULL,
        AttemptNumber INT NOT NULL,
        AttemptDateTimeUtc DATETIME2(3) NOT NULL,
        Outcome INT NOT NULL,
        ReasonCode NVARCHAR(100) NULL,
        Remarks NVARCHAR(1000) NULL,
        NextAttemptDate DATE NULL,
        CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_ShipmentDeliveryAttempts_CreatedAtUtc DEFAULT SYSUTCDATETIME(),
        CreatedBy BIGINT NULL,
        CONSTRAINT FK_ShipmentDeliveryAttempts_Shipment FOREIGN KEY(ShipmentId) REFERENCES dbo.Shipments(Id),
        CONSTRAINT UQ_ShipmentDeliveryAttempts_Attempt UNIQUE(ShipmentId,AttemptNumber),
        CONSTRAINT CK_ShipmentDeliveryAttempts_Outcome CHECK(Outcome IN(1,2,3,4,5))
    );
END;
GO

IF OBJECT_ID(N'dbo.ShipmentReceipts', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ShipmentReceipts
    (
        Id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ShipmentReceipts PRIMARY KEY,
        ShipmentId BIGINT NOT NULL,
        ReceiptNumber NVARCHAR(50) NOT NULL,
        ReceiptDate DATE NOT NULL,
        MarketplaceReceiptReference NVARCHAR(150) NULL,
        ReceivedByName NVARCHAR(150) NULL,
        ProofAttachmentUrl NVARCHAR(1000) NULL,
        Notes NVARCHAR(1000) NULL,
        CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_ShipmentReceipts_CreatedAtUtc DEFAULT SYSUTCDATETIME(),
        CreatedBy BIGINT NULL,
        UpdatedAtUtc DATETIME2(3) NULL,
        UpdatedBy BIGINT NULL,
        CONSTRAINT UQ_ShipmentReceipts_Number UNIQUE(ReceiptNumber),
        CONSTRAINT FK_ShipmentReceipts_Shipment FOREIGN KEY(ShipmentId) REFERENCES dbo.Shipments(Id)
    );
END;
GO

IF OBJECT_ID(N'dbo.ShipmentReceiptItems', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ShipmentReceiptItems
    (
        Id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ShipmentReceiptItems PRIMARY KEY,
        ShipmentReceiptId BIGINT NOT NULL,
        ShipmentItemId BIGINT NOT NULL,
        ReceivedQuantity DECIMAL(19,6) NOT NULL,
        RejectedQuantity DECIMAL(19,6) NOT NULL,
        DamagedQuantity DECIMAL(19,6) NOT NULL,
        ShortQuantity DECIMAL(19,6) NOT NULL,
        ReasonCode NVARCHAR(100) NULL,
        Notes NVARCHAR(1000) NULL,
        CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_ShipmentReceiptItems_CreatedAtUtc DEFAULT SYSUTCDATETIME(),
        CreatedBy BIGINT NULL,
        CONSTRAINT FK_ShipmentReceiptItems_Receipt FOREIGN KEY(ShipmentReceiptId) REFERENCES dbo.ShipmentReceipts(Id),
        CONSTRAINT FK_ShipmentReceiptItems_Item FOREIGN KEY(ShipmentItemId) REFERENCES dbo.ShipmentItems(Id),
        CONSTRAINT UQ_ShipmentReceiptItems_ReceiptItem UNIQUE(ShipmentReceiptId,ShipmentItemId),
        CONSTRAINT CK_ShipmentReceiptItems_Quantity CHECK(ReceivedQuantity>=0 AND RejectedQuantity>=0 AND DamagedQuantity>=0 AND ShortQuantity>=0 AND ReceivedQuantity+RejectedQuantity+DamagedQuantity+ShortQuantity>0)
    );
END;
GO

IF OBJECT_ID(N'dbo.ShipmentReturns', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ShipmentReturns
    (
        Id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ShipmentReturns PRIMARY KEY,
        ReturnNumber NVARCHAR(50) NOT NULL,
        ShipmentId BIGINT NOT NULL,
        ReturnDate DATE NOT NULL,
        ReturnReason NVARCHAR(1000) NOT NULL,
        Status INT NOT NULL CONSTRAINT DF_ShipmentReturns_Status DEFAULT(1),
        TransporterPartyId UNIQUEIDENTIFIER NULL,
        DocketNumber NVARCHAR(100) NULL,
        ExpectedReturnDate DATE NULL,
        ReceivedBackDate DATE NULL,
        Notes NVARCHAR(1000) NULL,
        CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_ShipmentReturns_CreatedAtUtc DEFAULT SYSUTCDATETIME(),
        CreatedBy BIGINT NULL,
        UpdatedAtUtc DATETIME2(3) NULL,
        UpdatedBy BIGINT NULL,
        ClosedAtUtc DATETIME2(3) NULL,
        ClosedBy BIGINT NULL,
        CancelledAtUtc DATETIME2(3) NULL,
        CancelledBy BIGINT NULL,
        CancellationReason NVARCHAR(1000) NULL,
        CONSTRAINT UQ_ShipmentReturns_Number UNIQUE(ReturnNumber),
        CONSTRAINT FK_ShipmentReturns_Shipment FOREIGN KEY(ShipmentId) REFERENCES dbo.Shipments(Id),
        CONSTRAINT FK_ShipmentReturns_Transporter FOREIGN KEY(TransporterPartyId) REFERENCES dbo.Parties(Id),
        CONSTRAINT CK_ShipmentReturns_Status CHECK(Status IN(1,2,3,4,5,6,7)),
        CONSTRAINT CK_ShipmentReturns_Dates CHECK(ExpectedReturnDate IS NULL OR ExpectedReturnDate>=ReturnDate)
    );
END;
GO

IF OBJECT_ID(N'dbo.ShipmentReturnItems', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ShipmentReturnItems
    (
        Id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ShipmentReturnItems PRIMARY KEY,
        ShipmentReturnId BIGINT NOT NULL,
        ShipmentItemId BIGINT NOT NULL,
        ReturnQuantity DECIMAL(19,6) NOT NULL,
        ReceivedBackQuantity DECIMAL(19,6) NOT NULL CONSTRAINT DF_ShipmentReturnItems_Received DEFAULT(0),
        RestockableQuantity DECIMAL(19,6) NOT NULL CONSTRAINT DF_ShipmentReturnItems_Restockable DEFAULT(0),
        DamagedQuantity DECIMAL(19,6) NOT NULL CONSTRAINT DF_ShipmentReturnItems_Damaged DEFAULT(0),
        NonRestockableQuantity DECIMAL(19,6) NOT NULL CONSTRAINT DF_ShipmentReturnItems_NonRestockable DEFAULT(0),
        ReasonCode NVARCHAR(100) NULL,
        Notes NVARCHAR(1000) NULL,
        CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_ShipmentReturnItems_CreatedAtUtc DEFAULT SYSUTCDATETIME(),
        CreatedBy BIGINT NULL,
        UpdatedAtUtc DATETIME2(3) NULL,
        UpdatedBy BIGINT NULL,
        CONSTRAINT FK_ShipmentReturnItems_Return FOREIGN KEY(ShipmentReturnId) REFERENCES dbo.ShipmentReturns(Id),
        CONSTRAINT FK_ShipmentReturnItems_ShipmentItem FOREIGN KEY(ShipmentItemId) REFERENCES dbo.ShipmentItems(Id),
        CONSTRAINT UQ_ShipmentReturnItems_ReturnItem UNIQUE(ShipmentReturnId,ShipmentItemId),
        CONSTRAINT CK_ShipmentReturnItems_Quantity CHECK(ReturnQuantity>0 AND ReceivedBackQuantity>=0 AND ReceivedBackQuantity<=ReturnQuantity AND RestockableQuantity>=0 AND DamagedQuantity>=0 AND NonRestockableQuantity>=0 AND RestockableQuantity+DamagedQuantity+NonRestockableQuantity<=ReceivedBackQuantity)
    );
END;
GO

IF OBJECT_ID(N'dbo.ShipmentFreightCharges', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ShipmentFreightCharges
    (
        Id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ShipmentFreightCharges PRIMARY KEY,
        ShipmentId BIGINT NOT NULL,
        TransporterPartyId UNIQUEIDENTIFIER NULL,
        ChargeType INT NOT NULL,
        CurrencyCode CHAR(3) NOT NULL,
        BaseFreight DECIMAL(19,6) NOT NULL CONSTRAINT DF_ShipmentFreightCharges_Base DEFAULT(0),
        FuelSurcharge DECIMAL(19,6) NOT NULL CONSTRAINT DF_ShipmentFreightCharges_Fuel DEFAULT(0),
        HandlingCharge DECIMAL(19,6) NOT NULL CONSTRAINT DF_ShipmentFreightCharges_Handling DEFAULT(0),
        LoadingCharge DECIMAL(19,6) NOT NULL CONSTRAINT DF_ShipmentFreightCharges_Loading DEFAULT(0),
        UnloadingCharge DECIMAL(19,6) NOT NULL CONSTRAINT DF_ShipmentFreightCharges_Unloading DEFAULT(0),
        AppointmentCharge DECIMAL(19,6) NOT NULL CONSTRAINT DF_ShipmentFreightCharges_Appointment DEFAULT(0),
        ReturnFreight DECIMAL(19,6) NOT NULL CONSTRAINT DF_ShipmentFreightCharges_Return DEFAULT(0),
        OtherCharge DECIMAL(19,6) NOT NULL CONSTRAINT DF_ShipmentFreightCharges_Other DEFAULT(0),
        TaxAmount DECIMAL(19,6) NOT NULL CONSTRAINT DF_ShipmentFreightCharges_Tax DEFAULT(0),
        DiscountAmount DECIMAL(19,6) NOT NULL CONSTRAINT DF_ShipmentFreightCharges_Discount DEFAULT(0),
        TotalCharge AS (CONVERT(DECIMAL(19,6),BaseFreight+FuelSurcharge+HandlingCharge+LoadingCharge+UnloadingCharge+AppointmentCharge+ReturnFreight+OtherCharge+TaxAmount-DiscountAmount)) PERSISTED,
        ActualWeight DECIMAL(19,6) NOT NULL CONSTRAINT DF_ShipmentFreightCharges_ActualWeight DEFAULT(0),
        VolumetricWeight DECIMAL(19,6) NOT NULL CONSTRAINT DF_ShipmentFreightCharges_VolumetricWeight DEFAULT(0),
        ChargeableWeight DECIMAL(19,6) NOT NULL CONSTRAINT DF_ShipmentFreightCharges_ChargeableWeight DEFAULT(0),
        RatePerWeightUnit DECIMAL(19,6) NULL,
        TransporterInvoiceNumber NVARCHAR(100) NULL,
        TransporterInvoiceDate DATE NULL,
        Status INT NOT NULL CONSTRAINT DF_ShipmentFreightCharges_Status DEFAULT(1),
        ApprovalNotes NVARCHAR(1000) NULL,
        ApprovedAtUtc DATETIME2(3) NULL,
        ApprovedBy BIGINT NULL,
        PaidAtUtc DATETIME2(3) NULL,
        PaidBy BIGINT NULL,
        PaymentReference NVARCHAR(100) NULL,
        RojmelTransactionId BIGINT NULL,
        RojmelExportStatus INT NOT NULL CONSTRAINT DF_ShipmentFreightCharges_RojmelExportStatus DEFAULT(0),
        RojmelReservationToken UNIQUEIDENTIFIER NULL,
        CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_ShipmentFreightCharges_CreatedAtUtc DEFAULT SYSUTCDATETIME(),
        CreatedBy BIGINT NULL,
        UpdatedAtUtc DATETIME2(3) NULL,
        UpdatedBy BIGINT NULL,
        IsDeleted BIT NOT NULL CONSTRAINT DF_ShipmentFreightCharges_IsDeleted DEFAULT(0),
        DeletedAtUtc DATETIME2(3) NULL,
        DeletedBy BIGINT NULL,
        CONSTRAINT FK_ShipmentFreightCharges_Shipment FOREIGN KEY(ShipmentId) REFERENCES dbo.Shipments(Id),
        CONSTRAINT FK_ShipmentFreightCharges_Transporter FOREIGN KEY(TransporterPartyId) REFERENCES dbo.Parties(Id),
        CONSTRAINT FK_ShipmentFreightCharges_Rojmel FOREIGN KEY(RojmelTransactionId) REFERENCES dbo.WalletTransactions(Id),
        CONSTRAINT CK_ShipmentFreightCharges_Type CHECK(ChargeType IN(1,2,3,4,5,6,99)),
        CONSTRAINT CK_ShipmentFreightCharges_Status CHECK(Status IN(1,2,3,4,5,6,7)),
        CONSTRAINT CK_ShipmentFreightCharges_Amounts CHECK(BaseFreight>=0 AND FuelSurcharge>=0 AND HandlingCharge>=0 AND LoadingCharge>=0 AND UnloadingCharge>=0 AND AppointmentCharge>=0 AND ReturnFreight>=0 AND OtherCharge>=0 AND TaxAmount>=0 AND DiscountAmount>=0 AND TotalCharge>0 AND ActualWeight>=0 AND VolumetricWeight>=0 AND ChargeableWeight>=0 AND (RatePerWeightUnit IS NULL OR RatePerWeightUnit>=0)),
        CONSTRAINT CK_ShipmentFreightCharges_Rojmel CHECK((RojmelExportStatus=0 AND RojmelReservationToken IS NULL AND RojmelTransactionId IS NULL) OR (RojmelExportStatus=1 AND RojmelReservationToken IS NOT NULL AND RojmelTransactionId IS NULL) OR (RojmelExportStatus=2 AND RojmelReservationToken IS NULL AND RojmelTransactionId IS NOT NULL))
    );
END;
GO

IF OBJECT_ID(N'dbo.ShipmentImportStagedRows', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ShipmentImportStagedRows
    (
        Id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ShipmentImportStagedRows PRIMARY KEY,
        BatchId BIGINT NOT NULL,
        RowNumber INT NOT NULL,
        SourceShipmentReference NVARCHAR(150) NULL,
        ChannelCode NVARCHAR(50) NOT NULL,
        WarehouseCode NVARCHAR(50) NOT NULL,
        ChannelSku NVARCHAR(150) NOT NULL,
        Quantity DECIMAL(19,6) NOT NULL,
        ShipmentDate DATE NOT NULL,
        ShipmentStatus INT NOT NULL,
        DocketNumber NVARCHAR(100) NULL,
        InvoiceNumber NVARCHAR(100) NULL,
        StoNumber NVARCHAR(100) NULL,
        TransporterPartyCode NVARCHAR(50) NULL,
        FreightAmount DECIMAL(19,6) NULL,
        Notes NVARCHAR(1000) NULL,
        ChannelId BIGINT NULL,
        WarehouseId BIGINT NULL,
        ItemId BIGINT NULL,
        ChannelItemMappingId BIGINT NULL,
        IsDuplicate BIT NOT NULL CONSTRAINT DF_ShipmentImportStagedRows_IsDuplicate DEFAULT(0),
        ErrorsJson NVARCHAR(MAX) NULL,
        CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_ShipmentImportStagedRows_CreatedAtUtc DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_ShipmentImportStagedRows_Batch FOREIGN KEY(BatchId) REFERENCES dbo.SupplyChainImportBatches(Id),
        CONSTRAINT CK_ShipmentImportStagedRows_Quantity CHECK(Quantity>0 AND ShipmentStatus IN(1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16) AND (FreightAmount IS NULL OR FreightAmount>=0)),
        CONSTRAINT UQ_ShipmentImportStagedRows_BatchRow UNIQUE(BatchId,RowNumber)
    );
END;
GO

IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name=N'IX_Shipments_List' AND object_id=OBJECT_ID(N'dbo.Shipments'))
    CREATE INDEX IX_Shipments_List ON dbo.Shipments(ChannelId,WarehouseId,Status,ShipmentDate DESC) INCLUDE(ShipmentNumber,SourceType,TotalPlannedQuantity,TotalDispatchedQuantity,TotalReceivedQuantity) WHERE IsDeleted=0;
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name=N'IX_ShipmentItems_Allocation' AND object_id=OBJECT_ID(N'dbo.ShipmentItems'))
    CREATE INDEX IX_ShipmentItems_Allocation ON dbo.ShipmentItems(DispatchPlanningAllocationId,ShipmentId) INCLUDE(PlannedQuantity);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name=N'IX_ShipmentTrackingEvents_ShipmentDate' AND object_id=OBJECT_ID(N'dbo.ShipmentTrackingEvents'))
    CREATE INDEX IX_ShipmentTrackingEvents_ShipmentDate ON dbo.ShipmentTrackingEvents(ShipmentId,EventDateTimeUtc DESC);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name=N'IX_ShipmentFreightCharges_Status' AND object_id=OBJECT_ID(N'dbo.ShipmentFreightCharges'))
    CREATE INDEX IX_ShipmentFreightCharges_Status ON dbo.ShipmentFreightCharges(Status,ShipmentId) INCLUDE(TotalCharge,RojmelTransactionId) WHERE IsDeleted=0;
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name=N'UX_StockMovements_ShipmentIdempotency' AND object_id=OBJECT_ID(N'dbo.StockMovements'))
    CREATE UNIQUE INDEX UX_StockMovements_ShipmentIdempotency ON dbo.StockMovements(SourceType,SourceId,ItemId) WHERE SourceType IN(N'ShipmentDispatch',N'ShipmentReturn');
GO

/* Navigation pages and only the existing SuperAdmin default grant. */
MERGE dbo.Pages AS target
USING (VALUES (N'ShipmentOperations',N'Shipment Operations',N'/shipment-operations',N'truck',121)) AS source(Name,DisplayName,Route,Icon,SortOrder)
ON target.Name=source.Name
WHEN MATCHED THEN UPDATE SET DisplayName=source.DisplayName,Route=source.Route,Icon=source.Icon,SortOrder=source.SortOrder,IsActive=1
WHEN NOT MATCHED THEN INSERT(Name,DisplayName,Route,Icon,SortOrder,IsActive) VALUES(source.Name,source.DisplayName,source.Route,source.Icon,source.SortOrder,1);
GO
DECLARE @ShipmentOperationsParentId INT=(SELECT Id FROM dbo.Pages WHERE Name=N'ShipmentOperations');
MERGE dbo.Pages AS target
USING (VALUES
 (N'ShipmentOperations.Shipments',N'Shipments',N'/shipment-operations/shipments',N'package',122),
 (N'ShipmentOperations.Packing',N'Packing & Packages',N'/shipment-operations/packing',N'box',123),
 (N'ShipmentOperations.Dockets',N'Dockets',N'/shipment-operations/dockets',N'receipt',124),
 (N'ShipmentOperations.Appointments',N'Appointments',N'/shipment-operations/appointments',N'calendar',125),
 (N'ShipmentOperations.Tracking',N'Tracking',N'/shipment-operations/tracking',N'map-pin',126),
 (N'ShipmentOperations.Receipts',N'Receipts',N'/shipment-operations/receipts',N'clipboard-check',127),
 (N'ShipmentOperations.Returns',N'Returns',N'/shipment-operations/returns',N'rotate-ccw',128),
 (N'ShipmentOperations.Freight',N'Freight',N'/shipment-operations/freight',N'wallet',129),
 (N'ShipmentOperations.Imports',N'Historical Imports',N'/shipment-operations/imports',N'upload',130),
 (N'ShipmentOperations.Reports',N'Shipment Reports',N'/shipment-operations/reports',N'chart-line',131)
) AS source(Name,DisplayName,Route,Icon,SortOrder)
ON target.Name=source.Name
WHEN MATCHED THEN UPDATE SET DisplayName=source.DisplayName,Route=source.Route,Icon=source.Icon,ParentPageId=@ShipmentOperationsParentId,SortOrder=source.SortOrder,IsActive=1
WHEN NOT MATCHED THEN INSERT(Name,DisplayName,Route,Icon,ParentPageId,SortOrder,IsActive) VALUES(source.Name,source.DisplayName,source.Route,source.Icon,@ShipmentOperationsParentId,source.SortOrder,1);
GO
MERGE dbo.RolePermissions AS target
USING (SELECT r.Id RoleId,p.Id PageId FROM dbo.Roles r CROSS JOIN dbo.Pages p WHERE r.Name=N'SuperAdmin' AND p.Name IN(N'ShipmentOperations',N'ShipmentOperations.Shipments',N'ShipmentOperations.Packing',N'ShipmentOperations.Dockets',N'ShipmentOperations.Appointments',N'ShipmentOperations.Tracking',N'ShipmentOperations.Receipts',N'ShipmentOperations.Returns',N'ShipmentOperations.Freight',N'ShipmentOperations.Imports',N'ShipmentOperations.Reports')) AS source
ON target.RoleId=source.RoleId AND target.PageId=source.PageId
WHEN MATCHED THEN UPDATE SET CanView=1,CanCreate=1,CanEdit=1,CanDelete=1,CanExport=1,CanApprove=1
WHEN NOT MATCHED THEN INSERT(RoleId,PageId,CanView,CanCreate,CanEdit,CanDelete,CanExport,CanApprove) VALUES(source.RoleId,source.PageId,1,1,1,1,1,1);
GO

CREATE OR ALTER PROCEDURE dbo.usp_ShipmentOperations_Shipment_List
    @Search NVARCHAR(200)=NULL,@ChannelId BIGINT=NULL,@WarehouseId BIGINT=NULL,@Status INT=NULL,@SourceType INT=NULL,@FromDate DATE=NULL,@ToDate DATE=NULL,@PageNumber INT=1,@PageSize INT=20
AS
BEGIN
    SET NOCOUNT ON;
    SET @PageNumber=IIF(@PageNumber<1,1,@PageNumber); SET @PageSize=IIF(@PageSize<1,20,IIF(@PageSize>200,200,@PageSize));
    SELECT s.Id,s.ShipmentNumber,s.SourceType,s.ChannelId,c.Code ChannelCode,s.WarehouseId,s.WarehouseCodeSnapshot WarehouseCode,s.WarehouseNameSnapshot WarehouseName,
           s.ShipmentDate,s.Status,s.Priority,s.InvoiceNumber,s.StoNumber,p.PartyName TransporterName,s.TotalPlannedQuantity,s.TotalPackedQuantity,
           s.TotalDispatchedQuantity,s.TotalReceivedQuantity,s.TotalReturnedQuantity,s.TotalPackages,s.CreatedAtUtc,COUNT(1) OVER() TotalCount
    FROM dbo.Shipments s
    JOIN dbo.SalesChannels c ON c.Id=s.ChannelId
    LEFT JOIN dbo.Parties p ON p.Id=s.TransporterPartyId
    WHERE s.IsDeleted=0
      AND (@ChannelId IS NULL OR s.ChannelId=@ChannelId) AND (@WarehouseId IS NULL OR s.WarehouseId=@WarehouseId)
      AND (@Status IS NULL OR s.Status=@Status) AND (@SourceType IS NULL OR s.SourceType=@SourceType)
      AND (@FromDate IS NULL OR s.ShipmentDate>=@FromDate) AND (@ToDate IS NULL OR s.ShipmentDate<=@ToDate)
      AND (@Search IS NULL OR s.ShipmentNumber LIKE N'%'+@Search+N'%' OR s.InvoiceNumber LIKE N'%'+@Search+N'%' OR s.StoNumber LIKE N'%'+@Search+N'%' OR s.ExternalShipmentReference LIKE N'%'+@Search+N'%')
    ORDER BY s.ShipmentDate DESC,s.Id DESC OFFSET (@PageNumber-1)*@PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_ShipmentOperations_Shipment_Get @Id BIGINT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT s.Id,s.ShipmentNumber,s.SourceType,s.ChannelId,c.Code ChannelCode,c.Name ChannelName,s.WarehouseId,s.WarehouseCodeSnapshot WarehouseCode,s.WarehouseNameSnapshot WarehouseName,
           s.DispatchPlanningRunId,s.ShipmentDate,s.ExpectedDeliveryDate,s.InvoiceId,s.InvoiceNumber,s.StoNumber,s.MarketplaceReference,s.ExternalShipmentReference,
           s.TransporterPartyId,tp.PartyName TransporterName,s.DispatchMode,s.Status,s.Priority,s.ManualReason,s.Notes,s.TotalPlannedQuantity,s.TotalPackedQuantity,
           s.TotalDispatchedQuantity,s.TotalReceivedQuantity,s.TotalReturnedQuantity,s.TotalPackages,s.TotalGrossWeight,s.TotalVolumetricWeight,s.TotalChargeableWeight,
           s.CreatedAtUtc,s.CreatedBy,s.UpdatedAtUtc,s.UpdatedBy,s.PackedAtUtc,s.PackedBy,s.DispatchedAtUtc,s.DispatchedBy,s.DeliveredAtUtc,s.DeliveredBy,
           s.ClosedAtUtc,s.ClosedBy,s.CancelledAtUtc,s.CancelledBy,s.CancellationReason
    FROM dbo.Shipments s JOIN dbo.SalesChannels c ON c.Id=s.ChannelId LEFT JOIN dbo.Parties tp ON tp.Id=s.TransporterPartyId WHERE s.Id=@Id AND s.IsDeleted=0;

    SELECT si.Id,si.ShipmentId,si.ItemId,si.ChannelItemMappingId,si.DispatchPlanningAllocationId,si.PlannedQuantity,si.PackedQuantity,si.DispatchedQuantity,
           si.ReceivedQuantity,si.RejectedQuantity,si.DamagedQuantity,si.ShortQuantity,si.ReturnedQuantity,si.RestockableReturnQuantity,si.NonRestockableReturnQuantity,
           si.UnitsPerBoxSnapshot,si.PackagingProfileId,si.ChannelSkuSnapshot,si.ItemCodeSnapshot,si.ItemNameSnapshot,si.Notes
    FROM dbo.ShipmentItems si WHERE si.ShipmentId=@Id ORDER BY si.Id;

    SELECT Id,ShipmentId,PackageNumber,PackageType,PackagingProfileId,Length,Width,Height,DimensionUnit,GrossWeight,NetWeight,WeightUnit,VolumetricDivisor,
           VolumetricWeight,ChargeableWeight,TrackingLabel,Barcode,SealNumber,IsMixedPackage,Notes
    FROM dbo.ShipmentPackages WHERE ShipmentId=@Id AND IsDeleted=0 ORDER BY Id;

    SELECT pi.Id,pi.ShipmentPackageId,pi.ShipmentItemId,pi.Quantity,si.ItemCodeSnapshot ItemCode,si.ItemNameSnapshot ItemName
    FROM dbo.ShipmentPackageItems pi JOIN dbo.ShipmentPackages p ON p.Id=pi.ShipmentPackageId JOIN dbo.ShipmentItems si ON si.Id=pi.ShipmentItemId
    WHERE p.ShipmentId=@Id AND p.IsDeleted=0 ORDER BY pi.Id;

    SELECT d.Id,d.ShipmentId,d.TransporterPartyId,p.PartyName TransporterName,d.DocketNumber,d.DocketDate,d.DispatchMode,d.TrackingUrl,d.VehicleNumber,
           d.DriverName,d.DriverMobile,d.PickupReference,d.EstimatedDeliveryDate,d.ActualPickupDateUtc,d.Notes,d.CreatedAtUtc
    FROM dbo.ShipmentDockets d JOIN dbo.Parties p ON p.Id=d.TransporterPartyId WHERE d.ShipmentId=@Id AND d.IsDeleted=0 ORDER BY d.Id;

    SELECT Id,ShipmentId,AppointmentReference,AppointmentDate,TimeFrom,TimeTo,AppointmentStatus,AttemptNumber,RequestedAtUtc,RequestedBy,BookedAtUtc,BookedBy,
           CompletedAtUtc,CancelledAtUtc,CancellationReason,Remarks FROM dbo.ShipmentAppointments WHERE ShipmentId=@Id ORDER BY AttemptNumber;

    SELECT Id,ShipmentId,EventType,EventStatus,EventDateTimeUtc,Location,ReferenceNumber,Source,Remarks,CreatedAtUtc,CreatedBy
    FROM dbo.ShipmentTrackingEvents WHERE ShipmentId=@Id ORDER BY EventDateTimeUtc,Id;

    SELECT Id,ShipmentId,AttemptNumber,AttemptDateTimeUtc,Outcome,ReasonCode,Remarks,NextAttemptDate,CreatedAtUtc,CreatedBy
    FROM dbo.ShipmentDeliveryAttempts WHERE ShipmentId=@Id ORDER BY AttemptNumber;

    SELECT Id,ShipmentId,ReceiptNumber,ReceiptDate,MarketplaceReceiptReference,ReceivedByName,ProofAttachmentUrl,Notes FROM dbo.ShipmentReceipts WHERE ShipmentId=@Id ORDER BY Id;
    SELECT ri.Id,ri.ShipmentReceiptId,ri.ShipmentItemId,ri.ReceivedQuantity,ri.RejectedQuantity,ri.DamagedQuantity,ri.ShortQuantity,ri.ReasonCode,ri.Notes
    FROM dbo.ShipmentReceiptItems ri JOIN dbo.ShipmentReceipts r ON r.Id=ri.ShipmentReceiptId WHERE r.ShipmentId=@Id ORDER BY ri.Id;

    SELECT r.Id,r.ReturnNumber,r.ShipmentId,r.ReturnDate,r.ReturnReason,r.Status,r.TransporterPartyId,p.PartyName TransporterName,r.DocketNumber,r.ExpectedReturnDate,r.ReceivedBackDate,r.Notes
    FROM dbo.ShipmentReturns r LEFT JOIN dbo.Parties p ON p.Id=r.TransporterPartyId WHERE r.ShipmentId=@Id ORDER BY r.Id;
    SELECT ri.Id,ri.ShipmentReturnId,ri.ShipmentItemId,ri.ReturnQuantity,ri.ReceivedBackQuantity,ri.RestockableQuantity,ri.DamagedQuantity,ri.NonRestockableQuantity,ri.ReasonCode,ri.Notes
    FROM dbo.ShipmentReturnItems ri JOIN dbo.ShipmentReturns r ON r.Id=ri.ShipmentReturnId WHERE r.ShipmentId=@Id ORDER BY ri.Id;

    SELECT f.Id,f.ShipmentId,f.TransporterPartyId,p.PartyName TransporterName,f.ChargeType,f.CurrencyCode,f.BaseFreight,f.FuelSurcharge,f.HandlingCharge,f.LoadingCharge,
           f.UnloadingCharge,f.AppointmentCharge,f.ReturnFreight,f.OtherCharge,f.TaxAmount,f.DiscountAmount,f.TotalCharge,f.ActualWeight,f.VolumetricWeight,
           f.ChargeableWeight,f.RatePerWeightUnit,f.TransporterInvoiceNumber,f.TransporterInvoiceDate,f.Status,f.ApprovalNotes,f.ApprovedAtUtc,f.ApprovedBy,
           f.PaidAtUtc,f.PaidBy,f.RojmelTransactionId
    FROM dbo.ShipmentFreightCharges f LEFT JOIN dbo.Parties p ON p.Id=f.TransporterPartyId WHERE f.ShipmentId=@Id AND f.IsDeleted=0 ORDER BY f.Id;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_ShipmentOperations_Shipment_CreateManual
    @ChannelId BIGINT,@WarehouseId BIGINT,@ShipmentDate DATE,@ExpectedDeliveryDate DATE=NULL,@TransporterPartyId UNIQUEIDENTIFIER=NULL,
    @InvoiceId BIGINT=NULL,@InvoiceNumber NVARCHAR(100)=NULL,@StoNumber NVARCHAR(100)=NULL,@MarketplaceReference NVARCHAR(150)=NULL,@ExternalShipmentReference NVARCHAR(150)=NULL,
    @DispatchMode INT=1,@Priority INT=2,@ManualReason NVARCHAR(1000)=NULL,@Notes NVARCHAR(2000)=NULL,@ItemsJson NVARCHAR(MAX),@UserId BIGINT=NULL
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    BEGIN TRY
        DECLARE @Items TABLE(ItemId BIGINT NOT NULL,PlannedQuantity DECIMAL(19,6) NOT NULL,ChannelItemMappingId BIGINT NULL,DispatchPlanningAllocationId BIGINT NULL,PackagingProfileId BIGINT NULL,Notes NVARCHAR(1000) NULL);
        INSERT @Items SELECT ItemId,PlannedQuantity,ChannelItemMappingId,DispatchPlanningAllocationId,PackagingProfileId,Notes FROM OPENJSON(@ItemsJson)
        WITH(ItemId BIGINT '$.itemId',PlannedQuantity DECIMAL(19,6) '$.plannedQuantity',ChannelItemMappingId BIGINT '$.channelItemMappingId',DispatchPlanningAllocationId BIGINT '$.dispatchPlanningAllocationId',PackagingProfileId BIGINT '$.packagingProfileId',Notes NVARCHAR(1000) '$.notes');
        IF NOT EXISTS(SELECT 1 FROM @Items) OR EXISTS(SELECT 1 FROM @Items WHERE PlannedQuantity<=0) OR EXISTS(SELECT ItemId FROM @Items GROUP BY ItemId HAVING COUNT(*)>1) BEGIN SELECT 400 StatusCode,N'At least one unique Item with a positive planned quantity is required.' Message;RETURN;END;
        IF NULLIF(LTRIM(RTRIM(@ManualReason)),N'') IS NULL BEGIN SELECT 400 StatusCode,N'A manual shipment reason is required.' Message;RETURN;END;
        IF NOT EXISTS(SELECT 1 FROM dbo.SalesChannels WHERE Id=@ChannelId AND IsActive=1 AND IsDeleted=0) BEGIN SELECT 404 StatusCode,N'Channel was not found or is inactive.' Message;RETURN;END;
        IF NOT EXISTS(SELECT 1 FROM dbo.ChannelWarehouses WHERE Id=@WarehouseId AND ChannelId=@ChannelId AND IsActive=1 AND IsDeleted=0) BEGIN SELECT 409 StatusCode,N'Warehouse must be active and belong to the selected Channel.' Message;RETURN;END;
        IF EXISTS(SELECT 1 FROM @Items x LEFT JOIN dbo.Items i ON i.Id=x.ItemId AND i.IsActive=1 AND i.IsDeleted=0 WHERE i.Id IS NULL) BEGIN SELECT 409 StatusCode,N'Every Shipment Item must be an active existing Item.' Message;RETURN;END;
        IF EXISTS(SELECT 1 FROM @Items x JOIN dbo.ChannelSkuMappings m ON m.Id=x.ChannelItemMappingId WHERE m.ItemId<>x.ItemId OR m.SalesChannelId<>@ChannelId OR m.IsActive=0 OR m.IsDeleted=1) BEGIN SELECT 409 StatusCode,N'Channel Item Mapping is not active for the selected Item and Channel.' Message;RETURN;END;
        IF EXISTS(SELECT 1 FROM @Items x JOIN dbo.ItemPackagingProfiles p ON p.Id=x.PackagingProfileId WHERE p.ItemId<>x.ItemId OR (p.ChannelId IS NOT NULL AND p.ChannelId<>@ChannelId) OR p.IsActive=0 OR p.IsDeleted=1) BEGIN SELECT 409 StatusCode,N'Packaging profile is not active for the selected Item and Channel.' Message;RETURN;END;
        IF @TransporterPartyId IS NOT NULL AND NOT EXISTS(SELECT 1 FROM dbo.Parties p JOIN dbo.PartyRoles r ON r.PartyId=p.Id AND r.RoleCode=N'Transporter' WHERE p.Id=@TransporterPartyId AND p.IsActive=1 AND p.IsDeleted=0) BEGIN SELECT 409 StatusCode,N'Transporter Party must be active and assigned the Transporter role.' Message;RETURN;END;
        IF @ExpectedDeliveryDate IS NOT NULL AND @ExpectedDeliveryDate<@ShipmentDate BEGIN SELECT 400 StatusCode,N'Expected delivery date cannot be earlier than shipment date.' Message;RETURN;END;
        BEGIN TRAN;
        DECLARE @NextNumber BIGINT,@Prefix NVARCHAR(20),@Padding INT;
        SELECT @NextNumber=NextNumber,@Prefix=Prefix,@Padding=PaddingLength FROM dbo.NumberSequences WITH(UPDLOCK,HOLDLOCK) WHERE ModuleName=N'Shipment';
        IF @NextNumber IS NULL BEGIN INSERT dbo.NumberSequences(ModuleName,Prefix,NextNumber,PaddingLength) VALUES(N'Shipment',N'SHP-',1,6); SET @NextNumber=1;SET @Prefix=N'SHP-';SET @Padding=6; END;
        UPDATE dbo.NumberSequences SET NextNumber=@NextNumber+1,UpdatedAtUtc=SYSUTCDATETIME() WHERE ModuleName=N'Shipment';
        DECLARE @ShipmentNumber NVARCHAR(50)=@Prefix+RIGHT(REPLICATE(N'0',@Padding)+CONVERT(NVARCHAR(30),@NextNumber),@Padding),@ShipmentId BIGINT;
        INSERT dbo.Shipments(ShipmentNumber,SourceType,ChannelId,WarehouseId,ChannelCodeSnapshot,WarehouseCodeSnapshot,WarehouseNameSnapshot,ShipmentDate,ExpectedDeliveryDate,InvoiceId,InvoiceNumber,StoNumber,MarketplaceReference,ExternalShipmentReference,TransporterPartyId,DispatchMode,Priority,ManualReason,Notes,CreatedBy)
        SELECT @ShipmentNumber,1,@ChannelId,@WarehouseId,c.Code,w.WarehouseCode,w.WarehouseName,@ShipmentDate,@ExpectedDeliveryDate,@InvoiceId,@InvoiceNumber,@StoNumber,@MarketplaceReference,@ExternalShipmentReference,@TransporterPartyId,@DispatchMode,@Priority,@ManualReason,@Notes,@UserId
        FROM dbo.SalesChannels c CROSS JOIN dbo.ChannelWarehouses w WHERE c.Id=@ChannelId AND w.Id=@WarehouseId;
        SET @ShipmentId=SCOPE_IDENTITY();
        INSERT dbo.ShipmentItems(ShipmentId,ItemId,ChannelItemMappingId,DispatchPlanningAllocationId,PlannedQuantity,UnitsPerBoxSnapshot,PackagingProfileId,ChannelSkuSnapshot,ItemCodeSnapshot,ItemNameSnapshot,Notes,CreatedBy)
        SELECT @ShipmentId,x.ItemId,x.ChannelItemMappingId,x.DispatchPlanningAllocationId,x.PlannedQuantity,COALESCE(p.UnitsPerBox,1),x.PackagingProfileId,COALESCE(m.ChannelSku,pm.ChannelSku),i.ItemCode,i.Name,x.Notes,@UserId
        FROM @Items x JOIN dbo.Items i ON i.Id=x.ItemId LEFT JOIN dbo.ChannelSkuMappings m ON m.Id=x.ChannelItemMappingId
        OUTER APPLY(SELECT TOP(1) cm.ChannelSku FROM dbo.ChannelSkuMappings cm WHERE cm.ItemId=x.ItemId AND cm.SalesChannelId=@ChannelId AND cm.IsActive=1 AND cm.IsDeleted=0 ORDER BY cm.IsPrimary DESC,cm.Id) pm
        OUTER APPLY(SELECT TOP(1) pp.UnitsPerBox FROM dbo.ItemPackagingProfiles pp WHERE pp.Id=x.PackagingProfileId OR (x.PackagingProfileId IS NULL AND pp.ItemId=x.ItemId AND pp.IsActive=1 AND pp.IsDeleted=0 AND (pp.ChannelId=@ChannelId OR pp.ChannelId IS NULL)) ORDER BY CASE WHEN pp.ChannelId=@ChannelId THEN 0 ELSE 1 END,pp.IsDefault DESC,pp.Id) p;
        UPDATE dbo.Shipments SET TotalPlannedQuantity=(SELECT SUM(PlannedQuantity) FROM dbo.ShipmentItems WHERE ShipmentId=@ShipmentId) WHERE Id=@ShipmentId;
        INSERT dbo.ShipmentTrackingEvents(ShipmentId,EventType,EventDateTimeUtc,Source,Remarks,CreatedBy) VALUES(@ShipmentId,1,SYSUTCDATETIME(),N'System',N'Manual shipment created.',@UserId);
        COMMIT;
        SELECT 201 StatusCode,N'Manual shipment created.' Message; SELECT @ShipmentId Id;
    END TRY
    BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; SELECT 500 StatusCode,ERROR_MESSAGE() Message; END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_ShipmentOperations_Shipment_CreateFromDispatchPlan
    @DispatchPlanningRunId BIGINT,@WarehouseId BIGINT,@ShipmentDate DATE,@ExpectedDeliveryDate DATE=NULL,@TransporterPartyId UNIQUEIDENTIFIER=NULL,
    @InvoiceId BIGINT=NULL,@InvoiceNumber NVARCHAR(100)=NULL,@StoNumber NVARCHAR(100)=NULL,@Notes NVARCHAR(2000)=NULL,@AllocationsJson NVARCHAR(MAX),@UserId BIGINT=NULL
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    BEGIN TRY
        DECLARE @Lines TABLE(DispatchPlanningAllocationId BIGINT NOT NULL PRIMARY KEY,PlannedQuantity DECIMAL(19,6) NOT NULL);
        INSERT @Lines SELECT DispatchPlanningAllocationId,PlannedQuantity FROM OPENJSON(@AllocationsJson)
        WITH(DispatchPlanningAllocationId BIGINT '$.dispatchPlanningAllocationId',PlannedQuantity DECIMAL(19,6) '$.plannedQuantity');
        IF NOT EXISTS(SELECT 1 FROM @Lines) OR EXISTS(SELECT 1 FROM @Lines WHERE PlannedQuantity<=0) BEGIN SELECT 400 StatusCode,N'At least one allocation with a positive planned quantity is required.' Message;RETURN;END;
        IF @ExpectedDeliveryDate IS NOT NULL AND @ExpectedDeliveryDate<@ShipmentDate BEGIN SELECT 400 StatusCode,N'Expected delivery date cannot be earlier than shipment date.' Message;RETURN;END;
        BEGIN TRAN;
        DECLARE @ChannelId BIGINT,@RunStatus INT;
        SELECT @ChannelId=ChannelId,@RunStatus=Status FROM dbo.DispatchPlanningRuns WITH(UPDLOCK,HOLDLOCK) WHERE Id=@DispatchPlanningRunId;
        IF @ChannelId IS NULL BEGIN ROLLBACK;SELECT 404 StatusCode,N'Dispatch Planning run was not found.' Message;RETURN;END;
        IF @RunStatus<>4 BEGIN ROLLBACK;SELECT 409 StatusCode,N'Only a finalized Dispatch Planning run can create a shipment.' Message;RETURN;END;
        IF NOT EXISTS(SELECT 1 FROM dbo.ChannelWarehouses WHERE Id=@WarehouseId AND ChannelId=@ChannelId AND IsActive=1 AND IsDeleted=0) BEGIN ROLLBACK;SELECT 409 StatusCode,N'Warehouse must be active and belong to the Planning run Channel.' Message;RETURN;END;
        IF @TransporterPartyId IS NOT NULL AND NOT EXISTS(SELECT 1 FROM dbo.Parties p JOIN dbo.PartyRoles r ON r.PartyId=p.Id AND r.RoleCode=N'Transporter' WHERE p.Id=@TransporterPartyId AND p.IsActive=1 AND p.IsDeleted=0) BEGIN ROLLBACK;SELECT 409 StatusCode,N'Transporter Party must be active and assigned the Transporter role.' Message;RETURN;END;
        IF EXISTS(
            SELECT 1 FROM @Lines l
            LEFT JOIN dbo.DispatchAllocations a WITH(UPDLOCK,HOLDLOCK) ON a.Id=l.DispatchPlanningAllocationId AND a.PlanningRunId=@DispatchPlanningRunId
            LEFT JOIN dbo.DispatchRecommendationResults r ON r.Id=a.RecommendationId AND r.WarehouseId=@WarehouseId
            WHERE a.Id IS NULL OR r.Id IS NULL
        ) BEGIN ROLLBACK;SELECT 409 StatusCode,N'Selected allocations must belong to the finalized run and selected warehouse.' Message;RETURN;END;
        IF EXISTS(
            SELECT 1 FROM @Lines l JOIN dbo.DispatchAllocations a ON a.Id=l.DispatchPlanningAllocationId
            OUTER APPLY(SELECT SUM(si.PlannedQuantity) ConvertedQuantity FROM dbo.ShipmentItems si JOIN dbo.Shipments s WITH(UPDLOCK,HOLDLOCK) ON s.Id=si.ShipmentId WHERE si.DispatchPlanningAllocationId=a.Id AND s.IsDeleted=0 AND NOT(s.Status=15 AND s.DispatchedAtUtc IS NULL)) converted
            WHERE l.PlannedQuantity> a.AllocatedQuantity-COALESCE(converted.ConvertedQuantity,0)
        ) BEGIN ROLLBACK;SELECT 409 StatusCode,N'Allocation quantity has already been converted to active shipments.' Message;RETURN;END;
        DECLARE @NextNumber BIGINT,@Prefix NVARCHAR(20),@Padding INT;
        SELECT @NextNumber=NextNumber,@Prefix=Prefix,@Padding=PaddingLength FROM dbo.NumberSequences WITH(UPDLOCK,HOLDLOCK) WHERE ModuleName=N'Shipment';
        IF @NextNumber IS NULL BEGIN INSERT dbo.NumberSequences(ModuleName,Prefix,NextNumber,PaddingLength) VALUES(N'Shipment',N'SHP-',1,6); SET @NextNumber=1;SET @Prefix=N'SHP-';SET @Padding=6; END;
        UPDATE dbo.NumberSequences SET NextNumber=@NextNumber+1,UpdatedAtUtc=SYSUTCDATETIME() WHERE ModuleName=N'Shipment';
        DECLARE @ShipmentNumber NVARCHAR(50)=@Prefix+RIGHT(REPLICATE(N'0',@Padding)+CONVERT(NVARCHAR(30),@NextNumber),@Padding),@ShipmentId BIGINT;
        INSERT dbo.Shipments(ShipmentNumber,SourceType,ChannelId,WarehouseId,ChannelCodeSnapshot,WarehouseCodeSnapshot,WarehouseNameSnapshot,DispatchPlanningRunId,ShipmentDate,ExpectedDeliveryDate,InvoiceId,InvoiceNumber,StoNumber,TransporterPartyId,DispatchMode,Priority,Notes,CreatedBy)
        SELECT @ShipmentNumber,2,@ChannelId,@WarehouseId,c.Code,w.WarehouseCode,w.WarehouseName,@DispatchPlanningRunId,@ShipmentDate,@ExpectedDeliveryDate,@InvoiceId,@InvoiceNumber,@StoNumber,@TransporterPartyId,1,2,@Notes,@UserId
        FROM dbo.SalesChannels c CROSS JOIN dbo.ChannelWarehouses w WHERE c.Id=@ChannelId AND w.Id=@WarehouseId;
        SET @ShipmentId=SCOPE_IDENTITY();
        INSERT dbo.ShipmentItems(ShipmentId,ItemId,ChannelItemMappingId,DispatchPlanningAllocationId,PlannedQuantity,UnitsPerBoxSnapshot,PackagingProfileId,ChannelSkuSnapshot,ItemCodeSnapshot,ItemNameSnapshot,CreatedBy)
        SELECT @ShipmentId,r.ItemId,r.ChannelItemMappingId,a.Id,l.PlannedQuantity,r.UnitsPerBox,r.PackagingProfileId,m.ChannelSku,i.ItemCode,i.Name,@UserId
        FROM @Lines l JOIN dbo.DispatchAllocations a ON a.Id=l.DispatchPlanningAllocationId JOIN dbo.DispatchRecommendationResults r ON r.Id=a.RecommendationId
        JOIN dbo.Items i ON i.Id=r.ItemId JOIN dbo.ChannelSkuMappings m ON m.Id=r.ChannelItemMappingId;
        UPDATE dbo.Shipments SET TotalPlannedQuantity=(SELECT SUM(PlannedQuantity) FROM dbo.ShipmentItems WHERE ShipmentId=@ShipmentId) WHERE Id=@ShipmentId;
        INSERT dbo.ShipmentTrackingEvents(ShipmentId,EventType,EventDateTimeUtc,Source,Remarks,CreatedBy) VALUES(@ShipmentId,1,SYSUTCDATETIME(),N'System',N'Shipment created from finalized Dispatch Planning allocation.',@UserId);
        COMMIT;
        SELECT 201 StatusCode,N'Shipment created from Dispatch Planning.' Message; SELECT @ShipmentId Id;
    END TRY
    BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; SELECT 500 StatusCode,ERROR_MESSAGE() Message; END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_ShipmentOperations_Shipment_Transition
    @Id BIGINT,@SourceStatus INT,@TargetStatus INT,@Remarks NVARCHAR(1000)=NULL,@UserId BIGINT=NULL
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    BEGIN TRY
        BEGIN TRAN;
        DECLARE @CurrentStatus INT,@EventType INT,@Now DATETIME2(3)=SYSUTCDATETIME();
        SELECT @CurrentStatus=Status FROM dbo.Shipments WITH(UPDLOCK,HOLDLOCK) WHERE Id=@Id AND IsDeleted=0;
        IF @CurrentStatus IS NULL BEGIN ROLLBACK;SELECT 404 StatusCode,N'Shipment was not found.' Message;RETURN;END;
        IF @CurrentStatus<>@SourceStatus BEGIN ROLLBACK;SELECT 409 StatusCode,N'Shipment status changed; refresh before retrying.' Message;RETURN;END;
        IF @CurrentStatus=16 BEGIN ROLLBACK;SELECT 409 StatusCode,N'Closed shipments are immutable.' Message;RETURN;END;
        IF NOT (
            (@CurrentStatus=1 AND @TargetStatus IN(2,3,15)) OR (@CurrentStatus=2 AND @TargetStatus IN(3,15)) OR
            (@CurrentStatus=3 AND @TargetStatus IN(4,15)) OR (@CurrentStatus=4 AND @TargetStatus IN(5,15)) OR
            (@CurrentStatus=5 AND @TargetStatus IN(6,15)) OR (@CurrentStatus=6 AND @TargetStatus IN(7,8,9,10,11,12,13)) OR
            (@CurrentStatus=7 AND @TargetStatus IN(8,9,10,13)) OR (@CurrentStatus=8 AND @TargetStatus IN(9,10,13)) OR
            (@CurrentStatus=9 AND @TargetStatus IN(10,11,12,13)) OR (@CurrentStatus=10 AND @TargetStatus IN(9,11,12,13)) OR
            (@CurrentStatus=11 AND @TargetStatus IN(12,13,16)) OR (@CurrentStatus=12 AND @TargetStatus IN(13,16)) OR
            (@CurrentStatus=13 AND @TargetStatus IN(14,16)) OR (@CurrentStatus=14 AND @TargetStatus=16)
        ) BEGIN ROLLBACK;SELECT 409 StatusCode,N'Shipment status transition is not allowed.' Message;RETURN;END;
        IF @TargetStatus=4 AND EXISTS(SELECT 1 FROM dbo.ShipmentItems WHERE ShipmentId=@Id AND PackedQuantity<>PlannedQuantity) BEGIN ROLLBACK;SELECT 409 StatusCode,N'All planned Item quantities must be allocated to packages before marking Packed.' Message;RETURN;END;
        IF @TargetStatus=6
        BEGIN
            IF NOT EXISTS(SELECT 1 FROM dbo.ShipmentDockets WHERE ShipmentId=@Id AND IsDeleted=0) BEGIN ROLLBACK;SELECT 409 StatusCode,N'At least one docket is required before dispatch.' Message;RETURN;END;
            IF EXISTS(SELECT 1 FROM dbo.ShipmentItems si JOIN dbo.Items i WITH(UPDLOCK,HOLDLOCK) ON i.Id=si.ItemId WHERE si.ShipmentId=@Id AND i.ItemType=1 AND i.TrackInventory=1 AND i.CurrentStock<si.PackedQuantity) BEGIN ROLLBACK;SELECT 409 StatusCode,N'Insufficient current stock for one or more shipment Items.' Message;RETURN;END;
            IF EXISTS(SELECT 1 FROM dbo.StockMovements WHERE SourceType=N'ShipmentDispatch' AND SourceId=@Id) BEGIN ROLLBACK;SELECT 409 StatusCode,N'Dispatch inventory movement already exists.' Message;RETURN;END;
            UPDATE i SET CurrentStock=i.CurrentStock-si.PackedQuantity,ModifiedAt=@Now,ModifiedBy=@UserId FROM dbo.Items i JOIN dbo.ShipmentItems si ON si.ItemId=i.Id WHERE si.ShipmentId=@Id AND i.ItemType=1 AND i.TrackInventory=1;
            INSERT dbo.StockMovements(ItemId,SourceType,SourceId,MovementType,Quantity,CreatedBy)
            SELECT si.ItemId,N'ShipmentDispatch',@Id,5,-si.PackedQuantity,@UserId FROM dbo.ShipmentItems si JOIN dbo.Items i ON i.Id=si.ItemId WHERE si.ShipmentId=@Id AND i.ItemType=1 AND i.TrackInventory=1;
            UPDATE dbo.ShipmentItems SET DispatchedQuantity=PackedQuantity,UpdatedAtUtc=@Now,UpdatedBy=@UserId WHERE ShipmentId=@Id;
        END;
        SET @EventType=CASE @TargetStatus WHEN 2 THEN 2 WHEN 3 THEN 3 WHEN 4 THEN 4 WHEN 5 THEN 4 WHEN 6 THEN 9 WHEN 7 THEN 6 WHEN 8 THEN 7 WHEN 9 THEN 10 WHEN 10 THEN 11 WHEN 11 THEN 12 WHEN 12 THEN 13 WHEN 13 THEN 14 WHEN 14 THEN 15 WHEN 16 THEN 17 END;
        UPDATE dbo.Shipments SET Status=@TargetStatus,UpdatedAtUtc=@Now,UpdatedBy=@UserId,
            PackedAtUtc=CASE WHEN @TargetStatus=4 THEN @Now ELSE PackedAtUtc END,PackedBy=CASE WHEN @TargetStatus=4 THEN @UserId ELSE PackedBy END,
            DispatchedAtUtc=CASE WHEN @TargetStatus=6 THEN @Now ELSE DispatchedAtUtc END,DispatchedBy=CASE WHEN @TargetStatus=6 THEN @UserId ELSE DispatchedBy END,
            DeliveredAtUtc=CASE WHEN @TargetStatus=12 THEN @Now ELSE DeliveredAtUtc END,DeliveredBy=CASE WHEN @TargetStatus=12 THEN @UserId ELSE DeliveredBy END,
            ClosedAtUtc=CASE WHEN @TargetStatus=16 THEN @Now ELSE ClosedAtUtc END,ClosedBy=CASE WHEN @TargetStatus=16 THEN @UserId ELSE ClosedBy END,
            TotalDispatchedQuantity=CASE WHEN @TargetStatus=6 THEN (SELECT SUM(DispatchedQuantity) FROM dbo.ShipmentItems WHERE ShipmentId=@Id) ELSE TotalDispatchedQuantity END
        WHERE Id=@Id;
        INSERT dbo.ShipmentTrackingEvents(ShipmentId,EventType,EventStatus,EventDateTimeUtc,Source,Remarks,CreatedBy) VALUES(@Id,@EventType,CONVERT(NVARCHAR(50),@TargetStatus),@Now,N'System',@Remarks,@UserId);
        COMMIT; SELECT 200 StatusCode,N'Shipment transitioned.' Message;
    END TRY
    BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; SELECT 500 StatusCode,ERROR_MESSAGE() Message; END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_ShipmentOperations_Shipment_Cancel @Id BIGINT,@Reason NVARCHAR(1000),@UserId BIGINT=NULL
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    BEGIN TRY
        IF NULLIF(LTRIM(RTRIM(@Reason)),N'') IS NULL BEGIN SELECT 400 StatusCode,N'A cancellation reason is required.' Message;RETURN;END;
        BEGIN TRAN;
        DECLARE @Status INT,@DispatchedAt DATETIME2(3); SELECT @Status=Status,@DispatchedAt=DispatchedAtUtc FROM dbo.Shipments WITH(UPDLOCK,HOLDLOCK) WHERE Id=@Id AND IsDeleted=0;
        IF @Status IS NULL BEGIN ROLLBACK;SELECT 404 StatusCode,N'Shipment was not found.' Message;RETURN;END;
        IF @Status=16 OR @DispatchedAt IS NOT NULL BEGIN ROLLBACK;SELECT 409 StatusCode,N'Only pre-dispatch, non-closed shipments can be cancelled.' Message;RETURN;END;
        IF @Status=15 BEGIN ROLLBACK;SELECT 409 StatusCode,N'Shipment is already cancelled.' Message;RETURN;END;
        UPDATE dbo.Shipments SET Status=15,CancelledAtUtc=SYSUTCDATETIME(),CancelledBy=@UserId,CancellationReason=@Reason,UpdatedAtUtc=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE Id=@Id;
        INSERT dbo.ShipmentTrackingEvents(ShipmentId,EventType,EventDateTimeUtc,Source,Remarks,CreatedBy) VALUES(@Id,16,SYSUTCDATETIME(),N'System',@Reason,@UserId);
        COMMIT; SELECT 200 StatusCode,N'Shipment cancelled.' Message;
    END TRY
    BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; SELECT 500 StatusCode,ERROR_MESSAGE() Message; END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_ShipmentOperations_Packing_SuggestionInputs @ShipmentId BIGINT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT si.Id ShipmentItemId,si.ItemId,si.ItemCodeSnapshot ItemCode,si.ItemNameSnapshot ItemName,si.PlannedQuantity,si.PackedQuantity,si.UnitsPerBoxSnapshot,
           COALESCE(p.Length,0) Length,COALESCE(p.Width,0) Width,COALESCE(p.Height,0) Height,COALESCE(p.GrossWeight,0) GrossWeight,COALESCE(p.NetWeight,0) NetWeight,p.VolumetricDivisor
    FROM dbo.ShipmentItems si LEFT JOIN dbo.ItemPackagingProfiles p ON p.Id=si.PackagingProfileId
    WHERE si.ShipmentId=@ShipmentId AND EXISTS(SELECT 1 FROM dbo.Shipments s WHERE s.Id=@ShipmentId AND s.IsDeleted=0);
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_ShipmentOperations_Package_Save
    @ShipmentId BIGINT,@PackageNumber NVARCHAR(100),@PackageType NVARCHAR(50),@PackagingProfileId BIGINT=NULL,@Length DECIMAL(19,6)=0,@Width DECIMAL(19,6)=0,@Height DECIMAL(19,6)=0,
    @DimensionUnit NVARCHAR(5)=N'CM',@GrossWeight DECIMAL(19,6)=0,@NetWeight DECIMAL(19,6)=0,@WeightUnit NVARCHAR(5)=N'KG',@VolumetricDivisor DECIMAL(19,6)=NULL,
    @TrackingLabel NVARCHAR(200)=NULL,@Barcode NVARCHAR(200)=NULL,@SealNumber NVARCHAR(100)=NULL,@IsMixedPackage BIT=0,@Notes NVARCHAR(1000)=NULL,@ItemsJson NVARCHAR(MAX),@UserId BIGINT=NULL
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    BEGIN TRY
        DECLARE @Lines TABLE(ShipmentItemId BIGINT NOT NULL PRIMARY KEY,Quantity DECIMAL(19,6) NOT NULL);
        INSERT @Lines SELECT ShipmentItemId,Quantity FROM OPENJSON(@ItemsJson) WITH(ShipmentItemId BIGINT '$.shipmentItemId',Quantity DECIMAL(19,6) '$.quantity');
        IF NOT EXISTS(SELECT 1 FROM @Lines) OR EXISTS(SELECT 1 FROM @Lines WHERE Quantity<=0) BEGIN SELECT 400 StatusCode,N'Package must contain at least one positive Shipment Item quantity.' Message;RETURN;END;
        IF @NetWeight>@GrossWeight OR @Length<0 OR @Width<0 OR @Height<0 OR @GrossWeight<0 OR @NetWeight<0 OR (@VolumetricDivisor IS NOT NULL AND @VolumetricDivisor<=0) BEGIN SELECT 400 StatusCode,N'Package dimensions or weights are invalid.' Message;RETURN;END;
        BEGIN TRAN;
        DECLARE @Status INT; SELECT @Status=Status FROM dbo.Shipments WITH(UPDLOCK,HOLDLOCK) WHERE Id=@ShipmentId AND IsDeleted=0;
        IF @Status IS NULL BEGIN ROLLBACK;SELECT 404 StatusCode,N'Shipment was not found.' Message;RETURN;END;
        IF @Status NOT IN(1,2,3) BEGIN ROLLBACK;SELECT 409 StatusCode,N'Packages can only be added while the shipment is in a packing state.' Message;RETURN;END;
        IF EXISTS(SELECT 1 FROM dbo.ShipmentPackages WHERE ShipmentId=@ShipmentId AND PackageNumber=@PackageNumber AND IsDeleted=0) BEGIN ROLLBACK;SELECT 409 StatusCode,N'Package number must be unique within a shipment.' Message;RETURN;END;
        IF EXISTS(SELECT 1 FROM @Lines l LEFT JOIN dbo.ShipmentItems si ON si.Id=l.ShipmentItemId AND si.ShipmentId=@ShipmentId WHERE si.Id IS NULL) BEGIN ROLLBACK;SELECT 409 StatusCode,N'Every package Item must belong to this shipment.' Message;RETURN;END;
        IF @IsMixedPackage=0 AND (SELECT COUNT(*) FROM @Lines)>1 BEGIN ROLLBACK;SELECT 409 StatusCode,N'A package with multiple Items must be marked mixed.' Message;RETURN;END;
        IF EXISTS(
            SELECT 1 FROM @Lines l JOIN dbo.ShipmentItems si ON si.Id=l.ShipmentItemId
            OUTER APPLY(SELECT SUM(pi.Quantity) ExistingQuantity FROM dbo.ShipmentPackageItems pi JOIN dbo.ShipmentPackages p ON p.Id=pi.ShipmentPackageId WHERE pi.ShipmentItemId=l.ShipmentItemId AND p.IsDeleted=0) e
            WHERE COALESCE(e.ExistingQuantity,0)+l.Quantity>si.PlannedQuantity
        ) BEGIN ROLLBACK;SELECT 409 StatusCode,N'Package quantity exceeds remaining unpacked Shipment Item quantity.' Message;RETURN;END;
        IF @PackagingProfileId IS NOT NULL AND NOT EXISTS(SELECT 1 FROM dbo.ItemPackagingProfiles WHERE Id=@PackagingProfileId AND IsActive=1 AND IsDeleted=0) BEGIN ROLLBACK;SELECT 409 StatusCode,N'Packaging profile was not found or is inactive.' Message;RETURN;END;
        INSERT dbo.ShipmentPackages(ShipmentId,PackageNumber,PackageType,PackagingProfileId,Length,Width,Height,DimensionUnit,GrossWeight,NetWeight,WeightUnit,VolumetricDivisor,TrackingLabel,Barcode,SealNumber,IsMixedPackage,Notes,CreatedBy)
        VALUES(@ShipmentId,@PackageNumber,@PackageType,@PackagingProfileId,@Length,@Width,@Height,@DimensionUnit,@GrossWeight,@NetWeight,@WeightUnit,@VolumetricDivisor,@TrackingLabel,@Barcode,@SealNumber,@IsMixedPackage,@Notes,@UserId);
        DECLARE @PackageId BIGINT=SCOPE_IDENTITY();
        INSERT dbo.ShipmentPackageItems(ShipmentPackageId,ShipmentItemId,Quantity,CreatedBy) SELECT @PackageId,ShipmentItemId,Quantity,@UserId FROM @Lines;
        UPDATE si SET PackedQuantity=COALESCE(x.Quantity,0),UpdatedAtUtc=SYSUTCDATETIME(),UpdatedBy=@UserId
        FROM dbo.ShipmentItems si OUTER APPLY(SELECT SUM(pi.Quantity) Quantity FROM dbo.ShipmentPackageItems pi JOIN dbo.ShipmentPackages p ON p.Id=pi.ShipmentPackageId WHERE pi.ShipmentItemId=si.Id AND p.IsDeleted=0) x
        WHERE si.ShipmentId=@ShipmentId;
        UPDATE dbo.Shipments SET Status=CASE WHEN Status IN(1,2) THEN 3 ELSE Status END,TotalPackedQuantity=(SELECT SUM(PackedQuantity) FROM dbo.ShipmentItems WHERE ShipmentId=@ShipmentId),
            TotalPackages=(SELECT COUNT(1) FROM dbo.ShipmentPackages WHERE ShipmentId=@ShipmentId AND IsDeleted=0),
            TotalGrossWeight=(SELECT COALESCE(SUM(GrossWeight),0) FROM dbo.ShipmentPackages WHERE ShipmentId=@ShipmentId AND IsDeleted=0),
            TotalVolumetricWeight=(SELECT COALESCE(SUM(VolumetricWeight),0) FROM dbo.ShipmentPackages WHERE ShipmentId=@ShipmentId AND IsDeleted=0),
            TotalChargeableWeight=(SELECT COALESCE(SUM(ChargeableWeight),0) FROM dbo.ShipmentPackages WHERE ShipmentId=@ShipmentId AND IsDeleted=0),UpdatedAtUtc=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE Id=@ShipmentId;
        IF @Status IN(1,2) INSERT dbo.ShipmentTrackingEvents(ShipmentId,EventType,EventDateTimeUtc,Source,Remarks,CreatedBy) VALUES(@ShipmentId,3,SYSUTCDATETIME(),N'System',N'Packing started.',@UserId);
        COMMIT; SELECT 200 StatusCode,N'Package saved.' Message;
    END TRY
    BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; SELECT 500 StatusCode,ERROR_MESSAGE() Message; END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_ShipmentOperations_Docket_Save
    @ShipmentId BIGINT,@TransporterPartyId UNIQUEIDENTIFIER,@DocketNumber NVARCHAR(100),@DocketDate DATE,@DispatchMode INT,
    @TrackingUrl NVARCHAR(1000)=NULL,@VehicleNumber NVARCHAR(50)=NULL,@DriverName NVARCHAR(150)=NULL,@DriverMobile NVARCHAR(30)=NULL,@PickupReference NVARCHAR(100)=NULL,
    @EstimatedDeliveryDate DATE=NULL,@ActualPickupDateUtc DATETIME2(3)=NULL,@Notes NVARCHAR(1000)=NULL,@UserId BIGINT=NULL
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    BEGIN TRY
        BEGIN TRAN;
        DECLARE @Status INT; SELECT @Status=Status FROM dbo.Shipments WITH(UPDLOCK,HOLDLOCK) WHERE Id=@ShipmentId AND IsDeleted=0;
        IF @Status IS NULL BEGIN ROLLBACK;SELECT 404 StatusCode,N'Shipment was not found.' Message;RETURN;END;
        IF @Status=16 BEGIN ROLLBACK;SELECT 409 StatusCode,N'Closed shipments are immutable.' Message;RETURN;END;
        IF NOT EXISTS(SELECT 1 FROM dbo.Parties p JOIN dbo.PartyRoles r ON r.PartyId=p.Id AND r.RoleCode=N'Transporter' WHERE p.Id=@TransporterPartyId AND p.IsActive=1 AND p.IsDeleted=0) BEGIN ROLLBACK;SELECT 409 StatusCode,N'Transporter Party must be active and assigned the Transporter role.' Message;RETURN;END;
        IF EXISTS(SELECT 1 FROM dbo.ShipmentDockets WHERE TransporterPartyId=@TransporterPartyId AND DocketNumber=@DocketNumber AND IsDeleted=0) BEGIN ROLLBACK;SELECT 409 StatusCode,N'Docket number is already recorded for this transporter.' Message;RETURN;END;
        INSERT dbo.ShipmentDockets(ShipmentId,TransporterPartyId,DocketNumber,DocketDate,DispatchMode,TrackingUrl,VehicleNumber,DriverName,DriverMobile,PickupReference,EstimatedDeliveryDate,ActualPickupDateUtc,Notes,CreatedBy)
        VALUES(@ShipmentId,@TransporterPartyId,@DocketNumber,@DocketDate,@DispatchMode,@TrackingUrl,@VehicleNumber,@DriverName,@DriverMobile,@PickupReference,@EstimatedDeliveryDate,@ActualPickupDateUtc,@Notes,@UserId);
        UPDATE dbo.Shipments SET TransporterPartyId=@TransporterPartyId,DispatchMode=@DispatchMode,UpdatedAtUtc=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE Id=@ShipmentId;
        INSERT dbo.ShipmentTrackingEvents(ShipmentId,EventType,EventDateTimeUtc,ReferenceNumber,Source,Remarks,CreatedBy) VALUES(@ShipmentId,5,SYSUTCDATETIME(),@DocketNumber,N'System',N'Docket created.',@UserId);
        COMMIT; SELECT 200 StatusCode,N'Docket saved.' Message;
    END TRY
    BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; SELECT 500 StatusCode,ERROR_MESSAGE() Message; END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_ShipmentOperations_Appointment_Save
    @ShipmentId BIGINT,@AppointmentReference NVARCHAR(100)=NULL,@AppointmentDate DATE,@TimeFrom TIME=NULL,@TimeTo TIME=NULL,@AppointmentStatus INT,@Remarks NVARCHAR(1000)=NULL,@CancellationReason NVARCHAR(1000)=NULL,@UserId BIGINT=NULL
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    BEGIN TRY
        BEGIN TRAN;
        DECLARE @Status INT,@AttemptNumber INT,@Now DATETIME2(3)=SYSUTCDATETIME(); SELECT @Status=Status FROM dbo.Shipments WITH(UPDLOCK,HOLDLOCK) WHERE Id=@ShipmentId AND IsDeleted=0;
        IF @Status IS NULL BEGIN ROLLBACK;SELECT 404 StatusCode,N'Shipment was not found.' Message;RETURN;END;
        IF @Status=16 BEGIN ROLLBACK;SELECT 409 StatusCode,N'Closed shipments are immutable.' Message;RETURN;END;
        IF @TimeFrom IS NOT NULL AND @TimeTo IS NOT NULL AND @TimeTo<@TimeFrom BEGIN ROLLBACK;SELECT 400 StatusCode,N'Appointment end time cannot be earlier than start time.' Message;RETURN;END;
        IF @AppointmentStatus=8 AND NULLIF(LTRIM(RTRIM(@CancellationReason)),N'') IS NULL BEGIN ROLLBACK;SELECT 400 StatusCode,N'A cancellation reason is required for a cancelled appointment.' Message;RETURN;END;
        SELECT @AttemptNumber=COALESCE(MAX(AttemptNumber),0)+1 FROM dbo.ShipmentAppointments WITH(UPDLOCK,HOLDLOCK) WHERE ShipmentId=@ShipmentId;
        INSERT dbo.ShipmentAppointments(ShipmentId,AppointmentReference,AppointmentDate,TimeFrom,TimeTo,AppointmentStatus,AttemptNumber,RequestedAtUtc,RequestedBy,BookedAtUtc,BookedBy,CompletedAtUtc,CancelledAtUtc,CancellationReason,Remarks,CreatedBy)
        VALUES(@ShipmentId,@AppointmentReference,@AppointmentDate,@TimeFrom,@TimeTo,@AppointmentStatus,@AttemptNumber,CASE WHEN @AppointmentStatus IN(2,3) THEN @Now END,CASE WHEN @AppointmentStatus IN(2,3) THEN @UserId END,CASE WHEN @AppointmentStatus=4 THEN @Now END,CASE WHEN @AppointmentStatus=4 THEN @UserId END,CASE WHEN @AppointmentStatus=6 THEN @Now END,CASE WHEN @AppointmentStatus=8 THEN @Now END,@CancellationReason,@Remarks,@UserId);
        INSERT dbo.ShipmentTrackingEvents(ShipmentId,EventType,EventDateTimeUtc,ReferenceNumber,Source,Remarks,CreatedBy) VALUES(@ShipmentId,CASE WHEN @AppointmentStatus IN(4,5) THEN 7 ELSE 6 END,@Now,@AppointmentReference,N'System',@Remarks,@UserId);
        COMMIT; SELECT 200 StatusCode,N'Appointment saved as a new history attempt.' Message;
    END TRY
    BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; SELECT 500 StatusCode,ERROR_MESSAGE() Message; END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_ShipmentOperations_Tracking_Add
    @ShipmentId BIGINT,@EventType INT,@EventStatus NVARCHAR(100)=NULL,@EventDateTimeUtc DATETIME2(3),@Location NVARCHAR(250)=NULL,@ReferenceNumber NVARCHAR(100)=NULL,@Source NVARCHAR(50),@Remarks NVARCHAR(1000)=NULL,@UserId BIGINT=NULL
AS
BEGIN
    SET NOCOUNT ON;
    IF NOT EXISTS(SELECT 1 FROM dbo.Shipments WHERE Id=@ShipmentId AND IsDeleted=0) BEGIN SELECT 404 StatusCode,N'Shipment was not found.' Message;RETURN;END;
    IF EXISTS(SELECT 1 FROM dbo.Shipments WHERE Id=@ShipmentId AND Status=16) BEGIN SELECT 409 StatusCode,N'Closed shipments are immutable.' Message;RETURN;END;
    INSERT dbo.ShipmentTrackingEvents(ShipmentId,EventType,EventStatus,EventDateTimeUtc,Location,ReferenceNumber,Source,Remarks,CreatedBy) VALUES(@ShipmentId,@EventType,@EventStatus,@EventDateTimeUtc,@Location,@ReferenceNumber,@Source,@Remarks,@UserId);
    SELECT 200 StatusCode,N'Tracking event appended.' Message;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_ShipmentOperations_DeliveryAttempt_Add
    @ShipmentId BIGINT,@AttemptDateTimeUtc DATETIME2(3),@Outcome INT,@ReasonCode NVARCHAR(100)=NULL,@Remarks NVARCHAR(1000)=NULL,@NextAttemptDate DATE=NULL,@UserId BIGINT=NULL
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    BEGIN TRY
        BEGIN TRAN;
        DECLARE @Status INT,@AttemptNumber INT; SELECT @Status=Status FROM dbo.Shipments WITH(UPDLOCK,HOLDLOCK) WHERE Id=@ShipmentId AND IsDeleted=0;
        IF @Status IS NULL BEGIN ROLLBACK;SELECT 404 StatusCode,N'Shipment was not found.' Message;RETURN;END;
        IF @Status NOT IN(6,7,8,9,10,11) BEGIN ROLLBACK;SELECT 409 StatusCode,N'Delivery attempts can be recorded only after dispatch.' Message;RETURN;END;
        SELECT @AttemptNumber=COALESCE(MAX(AttemptNumber),0)+1 FROM dbo.ShipmentDeliveryAttempts WITH(UPDLOCK,HOLDLOCK) WHERE ShipmentId=@ShipmentId;
        INSERT dbo.ShipmentDeliveryAttempts(ShipmentId,AttemptNumber,AttemptDateTimeUtc,Outcome,ReasonCode,Remarks,NextAttemptDate,CreatedBy) VALUES(@ShipmentId,@AttemptNumber,@AttemptDateTimeUtc,@Outcome,@ReasonCode,@Remarks,@NextAttemptDate,@UserId);
        IF @Outcome<>1 UPDATE dbo.Shipments SET Status=10,UpdatedAtUtc=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE Id=@ShipmentId;
        INSERT dbo.ShipmentTrackingEvents(ShipmentId,EventType,EventDateTimeUtc,Source,Remarks,CreatedBy) VALUES(@ShipmentId,11,@AttemptDateTimeUtc,N'System',@Remarks,@UserId);
        COMMIT; SELECT 200 StatusCode,N'Delivery attempt recorded.' Message;
    END TRY
    BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; SELECT 500 StatusCode,ERROR_MESSAGE() Message; END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_ShipmentOperations_Receipt_Create
    @ShipmentId BIGINT,@ReceiptDate DATE,@MarketplaceReceiptReference NVARCHAR(150)=NULL,@ReceivedByName NVARCHAR(150)=NULL,@ProofAttachmentUrl NVARCHAR(1000)=NULL,@Notes NVARCHAR(1000)=NULL,@ItemsJson NVARCHAR(MAX),@UserId BIGINT=NULL
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    BEGIN TRY
        DECLARE @Lines TABLE(ShipmentItemId BIGINT NOT NULL PRIMARY KEY,ReceivedQuantity DECIMAL(19,6) NOT NULL,RejectedQuantity DECIMAL(19,6) NOT NULL,DamagedQuantity DECIMAL(19,6) NOT NULL,ShortQuantity DECIMAL(19,6) NOT NULL,ReasonCode NVARCHAR(100) NULL,Notes NVARCHAR(1000) NULL);
        INSERT @Lines SELECT ShipmentItemId,ReceivedQuantity,RejectedQuantity,DamagedQuantity,ShortQuantity,ReasonCode,Notes FROM OPENJSON(@ItemsJson)
        WITH(ShipmentItemId BIGINT '$.shipmentItemId',ReceivedQuantity DECIMAL(19,6) '$.receivedQuantity',RejectedQuantity DECIMAL(19,6) '$.rejectedQuantity',DamagedQuantity DECIMAL(19,6) '$.damagedQuantity',ShortQuantity DECIMAL(19,6) '$.shortQuantity',ReasonCode NVARCHAR(100) '$.reasonCode',Notes NVARCHAR(1000) '$.notes');
        IF NOT EXISTS(SELECT 1 FROM @Lines) OR EXISTS(SELECT 1 FROM @Lines WHERE ReceivedQuantity<0 OR RejectedQuantity<0 OR DamagedQuantity<0 OR ShortQuantity<0 OR ReceivedQuantity+RejectedQuantity+DamagedQuantity+ShortQuantity<=0) BEGIN SELECT 400 StatusCode,N'Receipt quantities are invalid.' Message;RETURN;END;
        BEGIN TRAN;
        DECLARE @Status INT,@Now DATETIME2(3)=SYSUTCDATETIME(); SELECT @Status=Status FROM dbo.Shipments WITH(UPDLOCK,HOLDLOCK) WHERE Id=@ShipmentId AND IsDeleted=0;
        IF @Status IS NULL BEGIN ROLLBACK;SELECT 404 StatusCode,N'Shipment was not found.' Message;RETURN;END;
        IF @Status NOT IN(6,7,8,9,10,11) BEGIN ROLLBACK;SELECT 409 StatusCode,N'Receipts can be recorded only after dispatch.' Message;RETURN;END;
        IF EXISTS(SELECT 1 FROM @Lines l LEFT JOIN dbo.ShipmentItems si ON si.Id=l.ShipmentItemId AND si.ShipmentId=@ShipmentId WHERE si.Id IS NULL) BEGIN ROLLBACK;SELECT 409 StatusCode,N'Receipt Item does not belong to this shipment.' Message;RETURN;END;
        IF EXISTS(
            SELECT 1 FROM @Lines l JOIN dbo.ShipmentItems si ON si.Id=l.ShipmentItemId
            OUTER APPLY(SELECT SUM(ri.ReceivedQuantity+ri.RejectedQuantity+ri.DamagedQuantity+ri.ShortQuantity) ExistingQuantity FROM dbo.ShipmentReceiptItems ri JOIN dbo.ShipmentReceipts r ON r.Id=ri.ShipmentReceiptId WHERE ri.ShipmentItemId=l.ShipmentItemId) e
            WHERE COALESCE(e.ExistingQuantity,0)+l.ReceivedQuantity+l.RejectedQuantity+l.DamagedQuantity+l.ShortQuantity>si.DispatchedQuantity
        ) BEGIN ROLLBACK;SELECT 409 StatusCode,N'Receipt quantity exceeds dispatched quantity.' Message;RETURN;END;
        DECLARE @NextNumber BIGINT,@Prefix NVARCHAR(20),@Padding INT;
        SELECT @NextNumber=NextNumber,@Prefix=Prefix,@Padding=PaddingLength FROM dbo.NumberSequences WITH(UPDLOCK,HOLDLOCK) WHERE ModuleName=N'ShipmentReceipt';
        IF @NextNumber IS NULL BEGIN INSERT dbo.NumberSequences(ModuleName,Prefix,NextNumber,PaddingLength) VALUES(N'ShipmentReceipt',N'SRC-',1,6); SET @NextNumber=1;SET @Prefix=N'SRC-';SET @Padding=6; END;
        UPDATE dbo.NumberSequences SET NextNumber=@NextNumber+1,UpdatedAtUtc=@Now WHERE ModuleName=N'ShipmentReceipt';
        DECLARE @ReceiptNumber NVARCHAR(50)=@Prefix+RIGHT(REPLICATE(N'0',@Padding)+CONVERT(NVARCHAR(30),@NextNumber),@Padding),@ReceiptId BIGINT;
        INSERT dbo.ShipmentReceipts(ShipmentId,ReceiptNumber,ReceiptDate,MarketplaceReceiptReference,ReceivedByName,ProofAttachmentUrl,Notes,CreatedBy) VALUES(@ShipmentId,@ReceiptNumber,@ReceiptDate,@MarketplaceReceiptReference,@ReceivedByName,@ProofAttachmentUrl,@Notes,@UserId);
        SET @ReceiptId=SCOPE_IDENTITY();
        INSERT dbo.ShipmentReceiptItems(ShipmentReceiptId,ShipmentItemId,ReceivedQuantity,RejectedQuantity,DamagedQuantity,ShortQuantity,ReasonCode,Notes,CreatedBy)
        SELECT @ReceiptId,ShipmentItemId,ReceivedQuantity,RejectedQuantity,DamagedQuantity,ShortQuantity,ReasonCode,Notes,@UserId FROM @Lines;
        UPDATE si SET ReceivedQuantity=COALESCE(x.ReceivedQuantity,0),RejectedQuantity=COALESCE(x.RejectedQuantity,0),DamagedQuantity=COALESCE(x.DamagedQuantity,0),ShortQuantity=COALESCE(x.ShortQuantity,0),UpdatedAtUtc=@Now,UpdatedBy=@UserId
        FROM dbo.ShipmentItems si OUTER APPLY(SELECT SUM(ri.ReceivedQuantity) ReceivedQuantity,SUM(ri.RejectedQuantity) RejectedQuantity,SUM(ri.DamagedQuantity) DamagedQuantity,SUM(ri.ShortQuantity) ShortQuantity FROM dbo.ShipmentReceiptItems ri WHERE ri.ShipmentItemId=si.Id) x
        WHERE si.ShipmentId=@ShipmentId;
        DECLARE @Dispatched DECIMAL(19,6)=(SELECT SUM(DispatchedQuantity) FROM dbo.ShipmentItems WHERE ShipmentId=@ShipmentId),@Resolved DECIMAL(19,6)=(SELECT SUM(ReceivedQuantity+RejectedQuantity+DamagedQuantity+ShortQuantity) FROM dbo.ShipmentItems WHERE ShipmentId=@ShipmentId);
        UPDATE dbo.Shipments SET Status=CASE WHEN @Resolved=@Dispatched THEN 12 ELSE 11 END,DeliveredAtUtc=CASE WHEN @Resolved=@Dispatched THEN @Now ELSE DeliveredAtUtc END,DeliveredBy=CASE WHEN @Resolved=@Dispatched THEN @UserId ELSE DeliveredBy END,
            TotalReceivedQuantity=(SELECT SUM(ReceivedQuantity) FROM dbo.ShipmentItems WHERE ShipmentId=@ShipmentId),UpdatedAtUtc=@Now,UpdatedBy=@UserId WHERE Id=@ShipmentId;
        INSERT dbo.ShipmentTrackingEvents(ShipmentId,EventType,EventDateTimeUtc,ReferenceNumber,Source,Remarks,CreatedBy) VALUES(@ShipmentId,CASE WHEN @Resolved=@Dispatched THEN 13 ELSE 12 END,@Now,@ReceiptNumber,N'System',N'Receipt recorded.',@UserId);
        COMMIT; SELECT 200 StatusCode,N'Shipment receipt recorded.' Message;
    END TRY
    BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; SELECT 500 StatusCode,ERROR_MESSAGE() Message; END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_ShipmentOperations_Return_Create
    @ShipmentId BIGINT,@ReturnDate DATE,@ReturnReason NVARCHAR(1000),@TransporterPartyId UNIQUEIDENTIFIER=NULL,@DocketNumber NVARCHAR(100)=NULL,@ExpectedReturnDate DATE=NULL,@Notes NVARCHAR(1000)=NULL,@ItemsJson NVARCHAR(MAX),@UserId BIGINT=NULL
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    BEGIN TRY
        DECLARE @Lines TABLE(ShipmentItemId BIGINT NOT NULL PRIMARY KEY,ReturnQuantity DECIMAL(19,6) NOT NULL,ReasonCode NVARCHAR(100) NULL,Notes NVARCHAR(1000) NULL);
        INSERT @Lines SELECT ShipmentItemId,ReturnQuantity,ReasonCode,Notes FROM OPENJSON(@ItemsJson) WITH(ShipmentItemId BIGINT '$.shipmentItemId',ReturnQuantity DECIMAL(19,6) '$.returnQuantity',ReasonCode NVARCHAR(100) '$.reasonCode',Notes NVARCHAR(1000) '$.notes');
        IF NOT EXISTS(SELECT 1 FROM @Lines) OR EXISTS(SELECT 1 FROM @Lines WHERE ReturnQuantity<=0) BEGIN SELECT 400 StatusCode,N'Return must contain at least one positive Item quantity.' Message;RETURN;END;
        BEGIN TRAN;
        DECLARE @Status INT; SELECT @Status=Status FROM dbo.Shipments WITH(UPDLOCK,HOLDLOCK) WHERE Id=@ShipmentId AND IsDeleted=0;
        IF @Status IS NULL BEGIN ROLLBACK;SELECT 404 StatusCode,N'Shipment was not found.' Message;RETURN;END;
        IF @Status NOT IN(6,7,8,9,10,11,12,13) BEGIN ROLLBACK;SELECT 409 StatusCode,N'Returns can be initiated only after dispatch.' Message;RETURN;END;
        IF @ExpectedReturnDate IS NOT NULL AND @ExpectedReturnDate<@ReturnDate BEGIN ROLLBACK;SELECT 400 StatusCode,N'Expected return date cannot be earlier than return date.' Message;RETURN;END;
        IF @TransporterPartyId IS NOT NULL AND NOT EXISTS(SELECT 1 FROM dbo.Parties p JOIN dbo.PartyRoles r ON r.PartyId=p.Id AND r.RoleCode=N'Transporter' WHERE p.Id=@TransporterPartyId AND p.IsActive=1 AND p.IsDeleted=0) BEGIN ROLLBACK;SELECT 409 StatusCode,N'Transporter Party must be active and assigned the Transporter role.' Message;RETURN;END;
        IF EXISTS(SELECT 1 FROM @Lines l LEFT JOIN dbo.ShipmentItems si ON si.Id=l.ShipmentItemId AND si.ShipmentId=@ShipmentId WHERE si.Id IS NULL) BEGIN ROLLBACK;SELECT 409 StatusCode,N'Return Item does not belong to this shipment.' Message;RETURN;END;
        IF EXISTS(
            SELECT 1 FROM @Lines l JOIN dbo.ShipmentItems si ON si.Id=l.ShipmentItemId
            OUTER APPLY(SELECT SUM(ri.ReturnQuantity) ExistingQuantity FROM dbo.ShipmentReturnItems ri JOIN dbo.ShipmentReturns r ON r.Id=ri.ShipmentReturnId WHERE ri.ShipmentItemId=l.ShipmentItemId AND r.Status<>6) e
            WHERE COALESCE(e.ExistingQuantity,0)+l.ReturnQuantity>si.DispatchedQuantity
        ) BEGIN ROLLBACK;SELECT 409 StatusCode,N'Return quantity exceeds eligible dispatched quantity.' Message;RETURN;END;
        DECLARE @NextNumber BIGINT,@Prefix NVARCHAR(20),@Padding INT;
        SELECT @NextNumber=NextNumber,@Prefix=Prefix,@Padding=PaddingLength FROM dbo.NumberSequences WITH(UPDLOCK,HOLDLOCK) WHERE ModuleName=N'ShipmentReturn';
        IF @NextNumber IS NULL BEGIN INSERT dbo.NumberSequences(ModuleName,Prefix,NextNumber,PaddingLength) VALUES(N'ShipmentReturn',N'SRT-',1,6); SET @NextNumber=1;SET @Prefix=N'SRT-';SET @Padding=6; END;
        UPDATE dbo.NumberSequences SET NextNumber=@NextNumber+1,UpdatedAtUtc=SYSUTCDATETIME() WHERE ModuleName=N'ShipmentReturn';
        DECLARE @ReturnNumber NVARCHAR(50)=@Prefix+RIGHT(REPLICATE(N'0',@Padding)+CONVERT(NVARCHAR(30),@NextNumber),@Padding),@ReturnId BIGINT;
        INSERT dbo.ShipmentReturns(ReturnNumber,ShipmentId,ReturnDate,ReturnReason,Status,TransporterPartyId,DocketNumber,ExpectedReturnDate,Notes,CreatedBy) VALUES(@ReturnNumber,@ShipmentId,@ReturnDate,@ReturnReason,2,@TransporterPartyId,@DocketNumber,@ExpectedReturnDate,@Notes,@UserId);
        SET @ReturnId=SCOPE_IDENTITY();
        INSERT dbo.ShipmentReturnItems(ShipmentReturnId,ShipmentItemId,ReturnQuantity,ReasonCode,Notes,CreatedBy) SELECT @ReturnId,ShipmentItemId,ReturnQuantity,ReasonCode,Notes,@UserId FROM @Lines;
        UPDATE si SET ReturnedQuantity=COALESCE(x.Quantity,0),UpdatedAtUtc=SYSUTCDATETIME(),UpdatedBy=@UserId FROM dbo.ShipmentItems si OUTER APPLY(SELECT SUM(ri.ReturnQuantity) Quantity FROM dbo.ShipmentReturnItems ri JOIN dbo.ShipmentReturns r ON r.Id=ri.ShipmentReturnId WHERE ri.ShipmentItemId=si.Id AND r.Status<>6) x WHERE si.ShipmentId=@ShipmentId;
        UPDATE dbo.Shipments SET Status=13,TotalReturnedQuantity=(SELECT SUM(ReturnedQuantity) FROM dbo.ShipmentItems WHERE ShipmentId=@ShipmentId),UpdatedAtUtc=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE Id=@ShipmentId;
        INSERT dbo.ShipmentTrackingEvents(ShipmentId,EventType,EventDateTimeUtc,ReferenceNumber,Source,Remarks,CreatedBy) VALUES(@ShipmentId,14,SYSUTCDATETIME(),@ReturnNumber,N'System',@ReturnReason,@UserId);
        COMMIT; SELECT 201 StatusCode,N'Shipment return created.' Message; SELECT @ReturnId Id;
    END TRY
    BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; SELECT 500 StatusCode,ERROR_MESSAGE() Message; END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_ShipmentOperations_Return_Get @Id BIGINT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT r.Id,r.ReturnNumber,r.ShipmentId,r.ReturnDate,r.ReturnReason,r.Status,r.TransporterPartyId,p.PartyName TransporterName,r.DocketNumber,r.ExpectedReturnDate,r.ReceivedBackDate,r.Notes
    FROM dbo.ShipmentReturns r LEFT JOIN dbo.Parties p ON p.Id=r.TransporterPartyId WHERE r.Id=@Id;
    SELECT Id,ShipmentReturnId,ShipmentItemId,ReturnQuantity,ReceivedBackQuantity,RestockableQuantity,DamagedQuantity,NonRestockableQuantity,ReasonCode,Notes FROM dbo.ShipmentReturnItems WHERE ShipmentReturnId=@Id ORDER BY Id;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_ShipmentOperations_Return_Receive
    @Id BIGINT,@ReceivedBackDate DATE,@Notes NVARCHAR(1000)=NULL,@ItemsJson NVARCHAR(MAX),@UserId BIGINT=NULL
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    BEGIN TRY
        DECLARE @Lines TABLE(ShipmentReturnItemId BIGINT NOT NULL PRIMARY KEY,ReceivedBackQuantity DECIMAL(19,6) NOT NULL,RestockableQuantity DECIMAL(19,6) NOT NULL,DamagedQuantity DECIMAL(19,6) NOT NULL,NonRestockableQuantity DECIMAL(19,6) NOT NULL,ReasonCode NVARCHAR(100) NULL,Notes NVARCHAR(1000) NULL);
        INSERT @Lines SELECT ShipmentReturnItemId,ReceivedBackQuantity,RestockableQuantity,DamagedQuantity,NonRestockableQuantity,ReasonCode,Notes FROM OPENJSON(@ItemsJson)
        WITH(ShipmentReturnItemId BIGINT '$.shipmentReturnItemId',ReceivedBackQuantity DECIMAL(19,6) '$.receivedBackQuantity',RestockableQuantity DECIMAL(19,6) '$.restockableQuantity',DamagedQuantity DECIMAL(19,6) '$.damagedQuantity',NonRestockableQuantity DECIMAL(19,6) '$.nonRestockableQuantity',ReasonCode NVARCHAR(100) '$.reasonCode',Notes NVARCHAR(1000) '$.notes');
        IF NOT EXISTS(SELECT 1 FROM @Lines) OR EXISTS(SELECT 1 FROM @Lines WHERE ReceivedBackQuantity<=0 OR RestockableQuantity<0 OR DamagedQuantity<0 OR NonRestockableQuantity<0 OR RestockableQuantity+DamagedQuantity+NonRestockableQuantity>ReceivedBackQuantity) BEGIN SELECT 400 StatusCode,N'Return receipt quantities are invalid.' Message;RETURN;END;
        BEGIN TRAN;
        DECLARE @ShipmentId BIGINT,@Status INT; SELECT @ShipmentId=ShipmentId,@Status=Status FROM dbo.ShipmentReturns WITH(UPDLOCK,HOLDLOCK) WHERE Id=@Id;
        IF @ShipmentId IS NULL BEGIN ROLLBACK;SELECT 404 StatusCode,N'Shipment return was not found.' Message;RETURN;END;
        IF @Status NOT IN(1,2,3,5) BEGIN ROLLBACK;SELECT 409 StatusCode,N'Return is not open for receipt.' Message;RETURN;END;
        IF EXISTS(SELECT 1 FROM @Lines l LEFT JOIN dbo.ShipmentReturnItems ri ON ri.Id=l.ShipmentReturnItemId AND ri.ShipmentReturnId=@Id WHERE ri.Id IS NULL) BEGIN ROLLBACK;SELECT 409 StatusCode,N'Return Item does not belong to this return.' Message;RETURN;END;
        IF EXISTS(SELECT 1 FROM @Lines l JOIN dbo.ShipmentReturnItems ri ON ri.Id=l.ShipmentReturnItemId WHERE ri.ReceivedBackQuantity<>0 OR l.ReceivedBackQuantity>ri.ReturnQuantity) BEGIN ROLLBACK;SELECT 409 StatusCode,N'Each return Item can be received once and cannot exceed its returned quantity.' Message;RETURN;END;
        IF EXISTS(SELECT 1 FROM @Lines l JOIN dbo.ShipmentReturnItems ri ON ri.Id=l.ShipmentReturnItemId JOIN dbo.ShipmentItems si ON si.Id=ri.ShipmentItemId JOIN dbo.Items i WITH(UPDLOCK,HOLDLOCK) ON i.Id=si.ItemId WHERE i.ItemType=1 AND i.TrackInventory=1 AND EXISTS(SELECT 1 FROM dbo.StockMovements sm WHERE sm.SourceType=N'ShipmentReturn' AND sm.SourceId=ri.Id AND sm.ItemId=si.ItemId)) BEGIN ROLLBACK;SELECT 409 StatusCode,N'Restock movement already exists for one or more return items.' Message;RETURN;END;
        UPDATE ri SET ReceivedBackQuantity=l.ReceivedBackQuantity,RestockableQuantity=l.RestockableQuantity,DamagedQuantity=l.DamagedQuantity,NonRestockableQuantity=l.NonRestockableQuantity,ReasonCode=COALESCE(l.ReasonCode,ri.ReasonCode),Notes=COALESCE(l.Notes,ri.Notes),UpdatedAtUtc=SYSUTCDATETIME(),UpdatedBy=@UserId
        FROM dbo.ShipmentReturnItems ri JOIN @Lines l ON l.ShipmentReturnItemId=ri.Id;
        UPDATE i SET CurrentStock=i.CurrentStock+l.RestockableQuantity,ModifiedAt=SYSUTCDATETIME(),ModifiedBy=@UserId
        FROM dbo.Items i JOIN dbo.ShipmentItems si ON si.ItemId=i.Id JOIN dbo.ShipmentReturnItems ri ON ri.ShipmentItemId=si.Id JOIN @Lines l ON l.ShipmentReturnItemId=ri.Id
        WHERE i.ItemType=1 AND i.TrackInventory=1 AND l.RestockableQuantity>0;
        INSERT dbo.StockMovements(ItemId,SourceType,SourceId,MovementType,Quantity,CreatedBy)
        SELECT si.ItemId,N'ShipmentReturn',ri.Id,6,l.RestockableQuantity,@UserId FROM dbo.ShipmentItems si JOIN dbo.ShipmentReturnItems ri ON ri.ShipmentItemId=si.Id JOIN @Lines l ON l.ShipmentReturnItemId=ri.Id JOIN dbo.Items i ON i.Id=si.ItemId
        WHERE i.ItemType=1 AND i.TrackInventory=1 AND l.RestockableQuantity>0;
        UPDATE si SET RestockableReturnQuantity=COALESCE(x.RestockableQuantity,0),NonRestockableReturnQuantity=COALESCE(x.NonRestockableQuantity,0),UpdatedAtUtc=SYSUTCDATETIME(),UpdatedBy=@UserId
        FROM dbo.ShipmentItems si OUTER APPLY(SELECT SUM(ri.RestockableQuantity) RestockableQuantity,SUM(ri.NonRestockableQuantity) NonRestockableQuantity FROM dbo.ShipmentReturnItems ri WHERE ri.ShipmentItemId=si.Id) x WHERE si.ShipmentId=@ShipmentId;
        DECLARE @Complete BIT=CASE WHEN NOT EXISTS(SELECT 1 FROM dbo.ShipmentReturnItems WHERE ShipmentReturnId=@Id AND ReceivedBackQuantity<ReturnQuantity) THEN 1 ELSE 0 END;
        UPDATE dbo.ShipmentReturns SET Status=CASE WHEN @Complete=1 THEN 4 ELSE 5 END,ReceivedBackDate=@ReceivedBackDate,Notes=COALESCE(@Notes,Notes),UpdatedAtUtc=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE Id=@Id;
        UPDATE dbo.Shipments SET Status=CASE WHEN @Complete=1 THEN 14 ELSE 13 END,UpdatedAtUtc=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE Id=@ShipmentId;
        INSERT dbo.ShipmentTrackingEvents(ShipmentId,EventType,EventDateTimeUtc,Source,Remarks,CreatedBy) VALUES(@ShipmentId,15,SYSUTCDATETIME(),N'System',N'Return receipt recorded.',@UserId);
        COMMIT; SELECT 200 StatusCode,N'Return receipt recorded.' Message;
    END TRY
    BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; SELECT 500 StatusCode,ERROR_MESSAGE() Message; END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_ShipmentOperations_Freight_Create
    @ShipmentId BIGINT,@TransporterPartyId UNIQUEIDENTIFIER=NULL,@ChargeType INT,@CurrencyCode CHAR(3),@BaseFreight DECIMAL(19,6),@FuelSurcharge DECIMAL(19,6)=0,@HandlingCharge DECIMAL(19,6)=0,
    @LoadingCharge DECIMAL(19,6)=0,@UnloadingCharge DECIMAL(19,6)=0,@AppointmentCharge DECIMAL(19,6)=0,@ReturnFreight DECIMAL(19,6)=0,@OtherCharge DECIMAL(19,6)=0,@TaxAmount DECIMAL(19,6)=0,@DiscountAmount DECIMAL(19,6)=0,
    @ActualWeight DECIMAL(19,6)=0,@VolumetricWeight DECIMAL(19,6)=0,@ChargeableWeight DECIMAL(19,6)=0,@RatePerWeightUnit DECIMAL(19,6)=NULL,@TransporterInvoiceNumber NVARCHAR(100)=NULL,@TransporterInvoiceDate DATE=NULL,@UserId BIGINT=NULL
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    BEGIN TRY
        IF @BaseFreight+@FuelSurcharge+@HandlingCharge+@LoadingCharge+@UnloadingCharge+@AppointmentCharge+@ReturnFreight+@OtherCharge+@TaxAmount-@DiscountAmount<=0 BEGIN SELECT 400 StatusCode,N'Total freight charge must be greater than zero.' Message;RETURN;END;
        BEGIN TRAN;
        DECLARE @ShipmentStatus INT; SELECT @ShipmentStatus=Status FROM dbo.Shipments WITH(UPDLOCK,HOLDLOCK) WHERE Id=@ShipmentId AND IsDeleted=0;
        IF @ShipmentStatus IS NULL BEGIN ROLLBACK;SELECT 404 StatusCode,N'Shipment was not found.' Message;RETURN;END;
        IF @ShipmentStatus=16 BEGIN ROLLBACK;SELECT 409 StatusCode,N'Closed shipments are immutable.' Message;RETURN;END;
        IF @TransporterPartyId IS NOT NULL AND NOT EXISTS(SELECT 1 FROM dbo.Parties p JOIN dbo.PartyRoles r ON r.PartyId=p.Id AND r.RoleCode=N'Transporter' WHERE p.Id=@TransporterPartyId AND p.IsActive=1 AND p.IsDeleted=0) BEGIN ROLLBACK;SELECT 409 StatusCode,N'Transporter Party must be active and assigned the Transporter role.' Message;RETURN;END;
        INSERT dbo.ShipmentFreightCharges(ShipmentId,TransporterPartyId,ChargeType,CurrencyCode,BaseFreight,FuelSurcharge,HandlingCharge,LoadingCharge,UnloadingCharge,AppointmentCharge,ReturnFreight,OtherCharge,TaxAmount,DiscountAmount,ActualWeight,VolumetricWeight,ChargeableWeight,RatePerWeightUnit,TransporterInvoiceNumber,TransporterInvoiceDate,CreatedBy)
        VALUES(@ShipmentId,@TransporterPartyId,@ChargeType,@CurrencyCode,@BaseFreight,@FuelSurcharge,@HandlingCharge,@LoadingCharge,@UnloadingCharge,@AppointmentCharge,@ReturnFreight,@OtherCharge,@TaxAmount,@DiscountAmount,@ActualWeight,@VolumetricWeight,@ChargeableWeight,@RatePerWeightUnit,@TransporterInvoiceNumber,@TransporterInvoiceDate,@UserId);
        DECLARE @Id BIGINT=SCOPE_IDENTITY(); COMMIT; SELECT 201 StatusCode,N'Freight charge created.' Message;SELECT @Id Id;
    END TRY
    BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; SELECT 500 StatusCode,ERROR_MESSAGE() Message; END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_ShipmentOperations_Freight_Get @Id BIGINT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT f.Id,f.ShipmentId,f.TransporterPartyId,p.PartyName TransporterName,f.ChargeType,f.CurrencyCode,f.BaseFreight,f.FuelSurcharge,f.HandlingCharge,f.LoadingCharge,
           f.UnloadingCharge,f.AppointmentCharge,f.ReturnFreight,f.OtherCharge,f.TaxAmount,f.DiscountAmount,f.TotalCharge,f.ActualWeight,f.VolumetricWeight,
           f.ChargeableWeight,f.RatePerWeightUnit,f.TransporterInvoiceNumber,f.TransporterInvoiceDate,f.Status,f.ApprovalNotes,f.ApprovedAtUtc,f.ApprovedBy,
           f.PaidAtUtc,f.PaidBy,f.RojmelTransactionId
    FROM dbo.ShipmentFreightCharges f LEFT JOIN dbo.Parties p ON p.Id=f.TransporterPartyId WHERE f.Id=@Id AND f.IsDeleted=0;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_ShipmentOperations_Freight_Submit @Id BIGINT,@UserId BIGINT=NULL
AS
BEGIN
    SET NOCOUNT ON;
    IF NOT EXISTS(SELECT 1 FROM dbo.ShipmentFreightCharges WHERE Id=@Id AND IsDeleted=0) BEGIN SELECT 404 StatusCode,N'Freight charge was not found.' Message;RETURN;END;
    IF NOT EXISTS(SELECT 1 FROM dbo.ShipmentFreightCharges WHERE Id=@Id AND Status=1 AND IsDeleted=0) BEGIN SELECT 409 StatusCode,N'Only Draft freight charges can be submitted.' Message;RETURN;END;
    UPDATE dbo.ShipmentFreightCharges SET Status=2,UpdatedAtUtc=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE Id=@Id;
    SELECT 200 StatusCode,N'Freight submitted.' Message;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_ShipmentOperations_Freight_Approve @Id BIGINT,@ApprovalNotes NVARCHAR(1000)=NULL,@UserId BIGINT=NULL
AS
BEGIN
    SET NOCOUNT ON;
    IF NOT EXISTS(SELECT 1 FROM dbo.ShipmentFreightCharges WHERE Id=@Id AND IsDeleted=0) BEGIN SELECT 404 StatusCode,N'Freight charge was not found.' Message;RETURN;END;
    IF NOT EXISTS(SELECT 1 FROM dbo.ShipmentFreightCharges WHERE Id=@Id AND Status=2 AND IsDeleted=0) BEGIN SELECT 409 StatusCode,N'Only submitted freight charges can be approved.' Message;RETURN;END;
    UPDATE dbo.ShipmentFreightCharges SET Status=3,ApprovalNotes=@ApprovalNotes,ApprovedAtUtc=SYSUTCDATETIME(),ApprovedBy=@UserId,UpdatedAtUtc=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE Id=@Id;
    SELECT 200 StatusCode,N'Freight approved without automatic Rojmel posting.' Message;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_ShipmentOperations_Freight_Reject @Id BIGINT,@Reason NVARCHAR(1000),@UserId BIGINT=NULL
AS
BEGIN
    SET NOCOUNT ON;
    IF NULLIF(LTRIM(RTRIM(@Reason)),N'') IS NULL BEGIN SELECT 400 StatusCode,N'A rejection reason is required.' Message;RETURN;END;
    IF NOT EXISTS(SELECT 1 FROM dbo.ShipmentFreightCharges WHERE Id=@Id AND IsDeleted=0) BEGIN SELECT 404 StatusCode,N'Freight charge was not found.' Message;RETURN;END;
    IF NOT EXISTS(SELECT 1 FROM dbo.ShipmentFreightCharges WHERE Id=@Id AND Status=2 AND IsDeleted=0) BEGIN SELECT 409 StatusCode,N'Only submitted freight charges can be rejected.' Message;RETURN;END;
    UPDATE dbo.ShipmentFreightCharges SET Status=4,ApprovalNotes=@Reason,UpdatedAtUtc=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE Id=@Id;
    SELECT 200 StatusCode,N'Freight rejected.' Message;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_ShipmentOperations_Freight_MarkPaid @Id BIGINT,@PaidAtUtc DATETIME2(3),@PaymentReference NVARCHAR(100)=NULL,@UserId BIGINT=NULL
AS
BEGIN
    SET NOCOUNT ON;
    IF NOT EXISTS(SELECT 1 FROM dbo.ShipmentFreightCharges WHERE Id=@Id AND IsDeleted=0) BEGIN SELECT 404 StatusCode,N'Freight charge was not found.' Message;RETURN;END;
    IF NOT EXISTS(SELECT 1 FROM dbo.ShipmentFreightCharges WHERE Id=@Id AND Status IN(3,5) AND IsDeleted=0) BEGIN SELECT 409 StatusCode,N'Only approved freight charges can be marked paid.' Message;RETURN;END;
    UPDATE dbo.ShipmentFreightCharges SET Status=6,PaidAtUtc=@PaidAtUtc,PaidBy=@UserId,PaymentReference=@PaymentReference,UpdatedAtUtc=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE Id=@Id;
    SELECT 200 StatusCode,N'Freight marked paid without automatic Rojmel posting.' Message;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_ShipmentOperations_Freight_ReserveRojmel @Id BIGINT,@UserId BIGINT=NULL
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    BEGIN TRY
        BEGIN TRAN;
        DECLARE @Status INT,@RojmelExportStatus INT,@RojmelTransactionId BIGINT,@Token UNIQUEIDENTIFIER=NEWID(),@ShipmentId BIGINT,@Amount DECIMAL(19,6),@CurrencyCode CHAR(3),@ShipmentNumber NVARCHAR(50),@TransporterInvoiceNumber NVARCHAR(100);
        SELECT @Status=f.Status,@RojmelExportStatus=f.RojmelExportStatus,@RojmelTransactionId=f.RojmelTransactionId,@ShipmentId=f.ShipmentId,@Amount=f.TotalCharge,@CurrencyCode=f.CurrencyCode,@ShipmentNumber=s.ShipmentNumber,@TransporterInvoiceNumber=f.TransporterInvoiceNumber
        FROM dbo.ShipmentFreightCharges f WITH(UPDLOCK,HOLDLOCK) JOIN dbo.Shipments s ON s.Id=f.ShipmentId WHERE f.Id=@Id AND f.IsDeleted=0;
        IF @ShipmentId IS NULL BEGIN ROLLBACK;SELECT 404 StatusCode,N'Freight charge was not found.' Message;RETURN;END;
        IF @Status<>3 BEGIN ROLLBACK;SELECT 409 StatusCode,N'Only approved freight charges can be posted to Rojmel.' Message;RETURN;END;
        IF @RojmelTransactionId IS NOT NULL OR @RojmelExportStatus=2 BEGIN ROLLBACK;SELECT 409 StatusCode,N'Freight charge already has a linked Rojmel transaction.' Message;RETURN;END;
        IF @RojmelExportStatus=1 BEGIN ROLLBACK;SELECT 409 StatusCode,N'Freight charge is already reserved for a Rojmel hand-off.' Message;RETURN;END;
        UPDATE dbo.ShipmentFreightCharges SET RojmelExportStatus=1,RojmelReservationToken=@Token,UpdatedAtUtc=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE Id=@Id;
        COMMIT; SELECT 200 StatusCode,N'Rojmel hand-off reserved.' Message; SELECT @Id FreightChargeId,@ShipmentId ShipmentId,@Token ReservationToken,@Amount Amount,@CurrencyCode CurrencyCode,@ShipmentNumber ShipmentNumber,@TransporterInvoiceNumber TransporterInvoiceNumber;
    END TRY
    BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; SELECT 500 StatusCode,ERROR_MESSAGE() Message; END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_ShipmentOperations_Freight_CompleteRojmel @Id BIGINT,@ReservationToken UNIQUEIDENTIFIER,@RojmelTransactionId BIGINT,@UserId BIGINT=NULL
AS
BEGIN
    SET NOCOUNT ON;
    IF NOT EXISTS(SELECT 1 FROM dbo.WalletTransactions WHERE Id=@RojmelTransactionId AND Status=1 AND IsDeleted=0) BEGIN SELECT 409 StatusCode,N'Linked Rojmel transaction was not found or is not posted.' Message;RETURN;END;
    IF NOT EXISTS(SELECT 1 FROM dbo.ShipmentFreightCharges WHERE Id=@Id AND Status=3 AND RojmelExportStatus=1 AND RojmelReservationToken=@ReservationToken AND RojmelTransactionId IS NULL AND IsDeleted=0) BEGIN SELECT 409 StatusCode,N'Freight Rojmel reservation is invalid or has already completed.' Message;RETURN;END;
    UPDATE dbo.ShipmentFreightCharges SET Status=6,PaidAtUtc=SYSUTCDATETIME(),PaidBy=@UserId,RojmelTransactionId=@RojmelTransactionId,RojmelExportStatus=2,RojmelReservationToken=NULL,UpdatedAtUtc=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE Id=@Id;
    SELECT 200 StatusCode,N'Freight linked to Rojmel.' Message;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_ShipmentOperations_Freight_ReleaseRojmel @Id BIGINT,@ReservationToken UNIQUEIDENTIFIER,@UserId BIGINT=NULL
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.ShipmentFreightCharges SET RojmelExportStatus=0,RojmelReservationToken=NULL,UpdatedAtUtc=SYSUTCDATETIME(),UpdatedBy=@UserId
    WHERE Id=@Id AND RojmelExportStatus=1 AND RojmelReservationToken=@ReservationToken AND RojmelTransactionId IS NULL;
    SELECT 200 StatusCode,N'Freight Rojmel reservation released.' Message;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_ShipmentOperations_Transporter_Set @PartyId UNIQUEIDENTIFIER,@IsTransporter BIT,@UserId BIGINT=NULL
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    IF NOT EXISTS(SELECT 1 FROM dbo.Parties WHERE Id=@PartyId AND IsDeleted=0) BEGIN SELECT 404 StatusCode,N'Party was not found.' Message;RETURN;END;
    IF @IsTransporter=1 AND NOT EXISTS(SELECT 1 FROM dbo.PartyRoles WHERE PartyId=@PartyId AND RoleCode=N'Transporter') INSERT dbo.PartyRoles(PartyId,RoleCode,CreatedBy) VALUES(@PartyId,N'Transporter',@UserId);
    IF @IsTransporter=0 DELETE FROM dbo.PartyRoles WHERE PartyId=@PartyId AND RoleCode=N'Transporter';
    SELECT 200 StatusCode,N'Transporter role updated.' Message;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_ShipmentOperations_Transporter_List @Search NVARCHAR(200)=NULL
AS
BEGIN
    SET NOCOUNT ON;
    SELECT p.Id PartyId,p.PartyCode,p.PartyName,p.MobileNo,p.Email,CONVERT(BIT,1) IsTransporter
    FROM dbo.Parties p JOIN dbo.PartyRoles r ON r.PartyId=p.Id AND r.RoleCode=N'Transporter'
    WHERE p.IsDeleted=0 AND p.IsActive=1 AND (@Search IS NULL OR p.PartyCode LIKE N'%'+@Search+N'%' OR p.PartyName LIKE N'%'+@Search+N'%') ORDER BY p.PartyName;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_ShipmentOperations_Report_List
    @ChannelId BIGINT=NULL,@WarehouseId BIGINT=NULL,@Status INT=NULL,@FromDate DATE=NULL,@ToDate DATE=NULL,@PageNumber INT=1,@PageSize INT=200
AS
BEGIN
    SET NOCOUNT ON;
    SET @PageNumber=IIF(@PageNumber<1,1,@PageNumber); SET @PageSize=IIF(@PageSize<1,200,IIF(@PageSize>500,500,@PageSize));
    SELECT s.ShipmentNumber,s.ShipmentDate,c.Code ChannelCode,s.WarehouseCodeSnapshot WarehouseCode,si.ItemCodeSnapshot ItemCode,si.ItemNameSnapshot ItemName,
           si.PlannedQuantity,si.DispatchedQuantity,si.ReceivedQuantity,si.ReturnedQuantity,s.Status,d.DocketNumber,COALESCE(f.FreightAmount,0) FreightAmount,COUNT(1) OVER() TotalCount
    FROM dbo.Shipments s JOIN dbo.SalesChannels c ON c.Id=s.ChannelId JOIN dbo.ShipmentItems si ON si.ShipmentId=s.Id
    OUTER APPLY(SELECT TOP(1) DocketNumber FROM dbo.ShipmentDockets WHERE ShipmentId=s.Id AND IsDeleted=0 ORDER BY Id DESC) d
    OUTER APPLY(SELECT SUM(TotalCharge) FreightAmount FROM dbo.ShipmentFreightCharges WHERE ShipmentId=s.Id AND IsDeleted=0 AND Status<>7) f
    WHERE s.IsDeleted=0 AND (@ChannelId IS NULL OR s.ChannelId=@ChannelId) AND (@WarehouseId IS NULL OR s.WarehouseId=@WarehouseId) AND (@Status IS NULL OR s.Status=@Status)
      AND (@FromDate IS NULL OR s.ShipmentDate>=@FromDate) AND (@ToDate IS NULL OR s.ShipmentDate<=@ToDate)
    ORDER BY s.ShipmentDate DESC,s.Id DESC,si.Id OFFSET (@PageNumber-1)*@PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_ShipmentOperations_Dashboard @AsOfDate DATE=NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET @AsOfDate=COALESCE(@AsOfDate,CONVERT(DATE,SYSUTCDATETIME()));
    SELECT
        SUM(CASE WHEN Status IN(1,2,3,4) THEN 1 ELSE 0 END) DraftCount,
        SUM(CASE WHEN Status=5 THEN 1 ELSE 0 END) ReadyForDispatchCount,
        SUM(CASE WHEN Status IN(6,7,8,9) THEN 1 ELSE 0 END) InTransitCount,
        SUM(CASE WHEN Status=10 THEN 1 ELSE 0 END) DeliveryAttemptCount,
        SUM(CASE WHEN Status=13 THEN 1 ELSE 0 END) ReturnInProgressCount,
        SUM(CASE WHEN ExpectedDeliveryDate IS NOT NULL AND ExpectedDeliveryDate<@AsOfDate AND Status IN(6,7,8,9,10,11,13) THEN 1 ELSE 0 END) OverdueCount,
        COALESCE(SUM(TotalDispatchedQuantity),0) DispatchedQuantity,
        COALESCE(SUM(TotalReceivedQuantity),0) DeliveredQuantity,
        COALESCE((SELECT SUM(TotalCharge) FROM dbo.ShipmentFreightCharges WHERE IsDeleted=0 AND Status IN(1,2,3,5)),0) OpenFreightAmount
    FROM dbo.Shipments WHERE IsDeleted=0;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_ShipmentOperations_Import_Validate
    @OriginalFileName NVARCHAR(260),@FileHash CHAR(64),@RowsJson NVARCHAR(MAX),@CorrelationId NVARCHAR(100)=NULL,@UserId BIGINT=NULL
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    BEGIN TRY
        DECLARE @Rows TABLE(RowNumber INT NOT NULL PRIMARY KEY,SourceShipmentReference NVARCHAR(150) NULL,ChannelCode NVARCHAR(50) NOT NULL,WarehouseCode NVARCHAR(50) NOT NULL,ChannelSku NVARCHAR(150) NOT NULL,Quantity DECIMAL(19,6) NOT NULL,ShipmentDate DATE NOT NULL,ShipmentStatus INT NOT NULL,DocketNumber NVARCHAR(100) NULL,InvoiceNumber NVARCHAR(100) NULL,StoNumber NVARCHAR(100) NULL,TransporterPartyCode NVARCHAR(50) NULL,FreightAmount DECIMAL(19,6) NULL,Notes NVARCHAR(1000) NULL);
        INSERT @Rows SELECT RowNumber,SourceShipmentReference,ChannelCode,WarehouseCode,ChannelSku,Quantity,ShipmentDate,ShipmentStatus,DocketNumber,InvoiceNumber,StoNumber,TransporterPartyCode,FreightAmount,Notes
        FROM OPENJSON(@RowsJson) WITH(RowNumber INT '$.rowNumber',SourceShipmentReference NVARCHAR(150) '$.sourceShipmentReference',ChannelCode NVARCHAR(50) '$.channelCode',WarehouseCode NVARCHAR(50) '$.warehouseCode',ChannelSku NVARCHAR(150) '$.channelSku',Quantity DECIMAL(19,6) '$.quantity',ShipmentDate DATE '$.shipmentDate',ShipmentStatus INT '$.status',DocketNumber NVARCHAR(100) '$.docketNumber',InvoiceNumber NVARCHAR(100) '$.invoiceNumber',StoNumber NVARCHAR(100) '$.stoNumber',TransporterPartyCode NVARCHAR(50) '$.transporterPartyCode',FreightAmount DECIMAL(19,6) '$.freightAmount',Notes NVARCHAR(1000) '$.notes');
        IF NOT EXISTS(SELECT 1 FROM @Rows) BEGIN SELECT 400 StatusCode,N'Historical import contains no rows.' Message;RETURN;END;
        BEGIN TRAN;
        DECLARE @BatchId BIGINT;
        INSERT dbo.SupplyChainImportBatches(ModuleType,ImportType,OriginalFileName,FileHash,Status,TotalRows,ValidRows,InvalidRows,DuplicateRows,ValidationSummaryJson,UploadedBy,CorrelationId)
        VALUES(N'ShipmentOperations',N'WorkListHistorical',@OriginalFileName,@FileHash,2,(SELECT COUNT(*) FROM @Rows),0,(SELECT COUNT(*) FROM @Rows),0,NULL,@UserId,@CorrelationId);
        SET @BatchId=SCOPE_IDENTITY();
        INSERT dbo.ShipmentImportStagedRows(BatchId,RowNumber,SourceShipmentReference,ChannelCode,WarehouseCode,ChannelSku,Quantity,ShipmentDate,ShipmentStatus,DocketNumber,InvoiceNumber,StoNumber,TransporterPartyCode,FreightAmount,Notes,ChannelId,WarehouseId,ItemId,ChannelItemMappingId,IsDuplicate,ErrorsJson)
        SELECT @BatchId,r.RowNumber,r.SourceShipmentReference,r.ChannelCode,r.WarehouseCode,r.ChannelSku,r.Quantity,r.ShipmentDate,r.ShipmentStatus,r.DocketNumber,r.InvoiceNumber,r.StoNumber,r.TransporterPartyCode,r.FreightAmount,r.Notes,
               c.Id,w.Id,m.ItemId,m.Id,
               CONVERT(BIT,CASE WHEN COUNT(1) OVER(PARTITION BY COALESCE(NULLIF(r.SourceShipmentReference,N''),CONCAT(N'ROW-',r.RowNumber)),r.ChannelCode,r.WarehouseCode,r.ChannelSku)>1 THEN 1 ELSE 0 END),
               CASE WHEN r.Quantity<=0 THEN N'[{"field":"quantity","message":"Quantity must be greater than zero."}]'
                    WHEN r.ShipmentStatus NOT IN(1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16) THEN N'[{"field":"status","message":"Shipment status is invalid."}]'
                    WHEN c.Id IS NULL THEN N'[{"field":"channelCode","message":"Active Channel was not found."}]'
                    WHEN w.Id IS NULL THEN N'[{"field":"warehouseCode","message":"Active warehouse was not found for the Channel."}]'
                    WHEN m.Id IS NULL THEN N'[{"field":"channelSku","message":"Active Channel SKU mapping was not found."}]'
                    ELSE N'[]' END
        FROM @Rows r
        LEFT JOIN dbo.SalesChannels c ON c.Code=r.ChannelCode AND c.IsActive=1 AND c.IsDeleted=0
        LEFT JOIN dbo.ChannelWarehouses w ON w.ChannelId=c.Id AND w.WarehouseCode=r.WarehouseCode AND w.IsActive=1 AND w.IsDeleted=0
        LEFT JOIN dbo.ChannelSkuMappings m ON m.SalesChannelId=c.Id AND m.ChannelSku=r.ChannelSku AND m.IsActive=1 AND m.IsDeleted=0;
        DECLARE @Invalid INT=(SELECT COUNT(1) FROM dbo.ShipmentImportStagedRows WHERE BatchId=@BatchId AND ErrorsJson<>N'[]'),@Duplicates INT=(SELECT COUNT(1) FROM dbo.ShipmentImportStagedRows WHERE BatchId=@BatchId AND IsDuplicate=1),@Valid INT=(SELECT COUNT(1) FROM dbo.ShipmentImportStagedRows WHERE BatchId=@BatchId AND ErrorsJson=N'[]'),@Unmatched INT=(SELECT COUNT(1) FROM dbo.ShipmentImportStagedRows WHERE BatchId=@BatchId AND ChannelItemMappingId IS NULL);
        UPDATE dbo.SupplyChainImportBatches SET Status=CASE WHEN @Invalid=0 THEN 3 ELSE 4 END,ValidRows=@Valid,InvalidRows=@Invalid,DuplicateRows=@Duplicates,ValidationSummaryJson=(SELECT @Duplicates DuplicateRows,@Unmatched UnmatchedSkuCount FOR JSON PATH,WITHOUT_ARRAY_WRAPPER) WHERE Id=@BatchId;
        COMMIT;
        SELECT 200 StatusCode,N'Historical shipment import validated.' Message;
        SELECT @BatchId BatchId,(SELECT TotalRows FROM dbo.SupplyChainImportBatches WHERE Id=@BatchId) TotalRows,@Valid ValidRows,@Invalid InvalidRows,@Duplicates DuplicateRows,@Unmatched UnmatchedSkuCount,CONVERT(BIT,IIF(@Invalid=0,1,0)) CanCommit;
        SELECT s.RowNumber,JSON_VALUE(e.value,N'$.field') Field,JSON_VALUE(e.value,N'$.message') Message,CAST(NULL AS NVARCHAR(500)) OriginalValue FROM dbo.ShipmentImportStagedRows s CROSS APPLY OPENJSON(s.ErrorsJson) e WHERE s.BatchId=@BatchId ORDER BY s.RowNumber;
    END TRY
    BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; SELECT 500 StatusCode,ERROR_MESSAGE() Message; END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_ShipmentOperations_Import_Get @Id BIGINT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id,OriginalFileName,FileHash,Status,TotalRows,ValidRows,InvalidRows,CommittedRows,UploadedAtUtc,CommittedAtUtc FROM dbo.SupplyChainImportBatches WHERE Id=@Id AND ModuleType=N'ShipmentOperations' AND ImportType=N'WorkListHistorical';
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_ShipmentOperations_Import_List @Status INT=NULL,@PageNumber INT=1,@PageSize INT=20
AS
BEGIN
    SET NOCOUNT ON; SET @PageNumber=IIF(@PageNumber<1,1,@PageNumber);SET @PageSize=IIF(@PageSize<1,20,IIF(@PageSize>200,200,@PageSize));
    SELECT Id,OriginalFileName,FileHash,Status,TotalRows,ValidRows,InvalidRows,CommittedRows,UploadedAtUtc,CommittedAtUtc,COUNT(1) OVER() TotalCount
    FROM dbo.SupplyChainImportBatches WHERE ModuleType=N'ShipmentOperations' AND ImportType=N'WorkListHistorical' AND (@Status IS NULL OR Status=@Status)
    ORDER BY UploadedAtUtc DESC,Id DESC OFFSET (@PageNumber-1)*@PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_ShipmentOperations_Import_Commit
    @Id BIGINT,@AllowDuplicate BIT=0,@CorrectionReason NVARCHAR(1000)=NULL,@UserId BIGINT=NULL
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    BEGIN TRY
        BEGIN TRAN;
        DECLARE @Status INT,@FileHash CHAR(64),@InvalidRows INT,@DuplicateRows INT,@ExistingCommitted BIT;
        SELECT @Status=Status,@FileHash=FileHash,@InvalidRows=InvalidRows,@DuplicateRows=DuplicateRows FROM dbo.SupplyChainImportBatches WITH(UPDLOCK,HOLDLOCK) WHERE Id=@Id AND ModuleType=N'ShipmentOperations' AND ImportType=N'WorkListHistorical';
        IF @Status IS NULL BEGIN ROLLBACK;SELECT 404 StatusCode,N'Historical shipment import batch was not found.' Message;RETURN;END;
        IF @Status<>3 BEGIN ROLLBACK;SELECT 409 StatusCode,N'Only a validated historical shipment import can be committed.' Message;RETURN;END;
        IF @InvalidRows<>0 BEGIN ROLLBACK;SELECT 409 StatusCode,N'Historical shipment import contains invalid rows.' Message;RETURN;END;
        SELECT @ExistingCommitted=CONVERT(BIT,CASE WHEN EXISTS(SELECT 1 FROM dbo.SupplyChainImportBatches WHERE ModuleType=N'ShipmentOperations' AND ImportType=N'WorkListHistorical' AND FileHash=@FileHash AND Status=5 AND Id<>@Id) THEN 1 ELSE 0 END);
        IF (@ExistingCommitted=1 OR @DuplicateRows>0) AND @AllowDuplicate=0 BEGIN ROLLBACK;SELECT 409 StatusCode,N'Duplicate file or rows require AllowDuplicate and a correction reason.' Message;RETURN;END;
        IF (@ExistingCommitted=1 OR @DuplicateRows>0) AND NULLIF(LTRIM(RTRIM(@CorrectionReason)),N'') IS NULL BEGIN ROLLBACK;SELECT 400 StatusCode,N'A correction reason is required for duplicate historical import.' Message;RETURN;END;

        DECLARE @Groups TABLE(GroupId INT IDENTITY(1,1) NOT NULL PRIMARY KEY,SourceKey NVARCHAR(150) NOT NULL,ChannelId BIGINT NOT NULL,WarehouseId BIGINT NOT NULL,ShipmentDate DATE NOT NULL,ShipmentStatus INT NOT NULL,DocketNumber NVARCHAR(100) NULL,InvoiceNumber NVARCHAR(100) NULL,StoNumber NVARCHAR(100) NULL,TransporterPartyCode NVARCHAR(50) NULL,FreightAmount DECIMAL(19,6) NULL,Notes NVARCHAR(1000) NULL);
        INSERT @Groups(SourceKey,ChannelId,WarehouseId,ShipmentDate,ShipmentStatus,DocketNumber,InvoiceNumber,StoNumber,TransporterPartyCode,FreightAmount,Notes)
        SELECT COALESCE(NULLIF(SourceShipmentReference,N''),CONCAT(N'ROW-',RowNumber)),ChannelId,WarehouseId,MIN(ShipmentDate),MAX(ShipmentStatus),NULLIF(MAX(COALESCE(DocketNumber,N'')),N''),NULLIF(MAX(COALESCE(InvoiceNumber,N'')),N''),NULLIF(MAX(COALESCE(StoNumber,N'')),N''),NULLIF(MAX(COALESCE(TransporterPartyCode,N'')),N''),SUM(COALESCE(FreightAmount,0)),NULLIF(MAX(COALESCE(Notes,N'')),N'')
        FROM dbo.ShipmentImportStagedRows WHERE BatchId=@Id GROUP BY COALESCE(NULLIF(SourceShipmentReference,N''),CONCAT(N'ROW-',RowNumber)),ChannelId,WarehouseId;
        DECLARE @GroupCount INT=(SELECT COUNT(*) FROM @Groups),@NextNumber BIGINT,@Prefix NVARCHAR(20),@Padding INT;
        SELECT @NextNumber=NextNumber,@Prefix=Prefix,@Padding=PaddingLength FROM dbo.NumberSequences WITH(UPDLOCK,HOLDLOCK) WHERE ModuleName=N'Shipment';
        IF @NextNumber IS NULL BEGIN INSERT dbo.NumberSequences(ModuleName,Prefix,NextNumber,PaddingLength) VALUES(N'Shipment',N'SHP-',1,6); SET @NextNumber=1;SET @Prefix=N'SHP-';SET @Padding=6; END;
        UPDATE dbo.NumberSequences SET NextNumber=@NextNumber+@GroupCount,UpdatedAtUtc=SYSUTCDATETIME() WHERE ModuleName=N'Shipment';
        DECLARE @Created TABLE(SourceKey NVARCHAR(150) NOT NULL,ChannelId BIGINT NOT NULL,WarehouseId BIGINT NOT NULL,ShipmentId BIGINT NOT NULL PRIMARY KEY,UNIQUE(SourceKey,ChannelId,WarehouseId));
        INSERT dbo.Shipments(ShipmentNumber,SourceType,ChannelId,WarehouseId,ChannelCodeSnapshot,WarehouseCodeSnapshot,WarehouseNameSnapshot,ShipmentDate,InvoiceNumber,StoNumber,ExternalShipmentReference,TransporterPartyId,DispatchMode,Status,Priority,ManualReason,Notes,CreatedBy)
        OUTPUT inserted.ExternalShipmentReference,inserted.ChannelId,inserted.WarehouseId,inserted.Id INTO @Created(SourceKey,ChannelId,WarehouseId,ShipmentId)
        SELECT @Prefix+RIGHT(REPLICATE(N'0',@Padding)+CONVERT(NVARCHAR(30),@NextNumber+g.GroupId-1),@Padding),3,g.ChannelId,g.WarehouseId,c.Code,w.WarehouseCode,w.WarehouseName,g.ShipmentDate,g.InvoiceNumber,g.StoNumber,g.SourceKey,p.Id,4,g.ShipmentStatus,2,N'Historical Work List import',g.Notes,@UserId
        FROM @Groups g JOIN dbo.SalesChannels c ON c.Id=g.ChannelId JOIN dbo.ChannelWarehouses w ON w.Id=g.WarehouseId
        OUTER APPLY(SELECT TOP(1) pt.Id FROM dbo.Parties pt JOIN dbo.PartyRoles pr ON pr.PartyId=pt.Id AND pr.RoleCode=N'Transporter' WHERE pt.PartyCode=g.TransporterPartyCode AND pt.IsActive=1 AND pt.IsDeleted=0) p;
        INSERT dbo.ShipmentItems(ShipmentId,ItemId,ChannelItemMappingId,PlannedQuantity,PackedQuantity,DispatchedQuantity,UnitsPerBoxSnapshot,PackagingProfileId,ChannelSkuSnapshot,ItemCodeSnapshot,ItemNameSnapshot,CreatedBy)
        SELECT created.ShipmentId,s.ItemId,s.ChannelItemMappingId,SUM(s.Quantity),0,0,COALESCE(pp.UnitsPerBox,1),pp.Id,s.ChannelSku,i.ItemCode,i.Name,@UserId
        FROM dbo.ShipmentImportStagedRows s JOIN @Groups g ON g.SourceKey=COALESCE(NULLIF(s.SourceShipmentReference,N''),CONCAT(N'ROW-',s.RowNumber)) AND g.ChannelId=s.ChannelId AND g.WarehouseId=s.WarehouseId
        JOIN @Created created ON created.SourceKey=g.SourceKey AND created.ChannelId=g.ChannelId AND created.WarehouseId=g.WarehouseId JOIN dbo.Items i ON i.Id=s.ItemId
        OUTER APPLY(SELECT TOP(1) p.Id,p.UnitsPerBox FROM dbo.ItemPackagingProfiles p WHERE p.ItemId=s.ItemId AND p.IsActive=1 AND p.IsDeleted=0 AND (p.ChannelId=s.ChannelId OR p.ChannelId IS NULL) ORDER BY CASE WHEN p.ChannelId=s.ChannelId THEN 0 ELSE 1 END,p.IsDefault DESC,p.Id) pp
        GROUP BY created.ShipmentId,s.ItemId,s.ChannelItemMappingId,pp.Id,pp.UnitsPerBox,s.ChannelSku,i.ItemCode,i.Name;
        UPDATE s SET TotalPlannedQuantity=x.PlannedQuantity,TotalPackedQuantity=CASE WHEN s.Status IN(4,5,6,7,8,9,10,11,12,13,14) THEN x.PlannedQuantity ELSE 0 END,
            TotalDispatchedQuantity=CASE WHEN s.Status IN(6,7,8,9,10,11,12,13,14) THEN x.PlannedQuantity ELSE 0 END
        FROM dbo.Shipments s JOIN (SELECT ShipmentId,SUM(PlannedQuantity) PlannedQuantity FROM dbo.ShipmentItems GROUP BY ShipmentId) x ON x.ShipmentId=s.Id JOIN @Created created ON created.ShipmentId=s.Id;
        UPDATE si SET PackedQuantity=s.TotalPackedQuantity,DispatchedQuantity=s.TotalDispatchedQuantity FROM dbo.ShipmentItems si JOIN dbo.Shipments s ON s.Id=si.ShipmentId JOIN @Created c ON c.ShipmentId=s.Id;
        INSERT dbo.ShipmentDockets(ShipmentId,TransporterPartyId,DocketNumber,DocketDate,DispatchMode,Notes,CreatedBy)
        SELECT created.ShipmentId,s.TransporterPartyId,g.DocketNumber,g.ShipmentDate,4,N'Imported historical docket.',@UserId
        FROM @Groups g JOIN @Created created ON created.SourceKey=g.SourceKey AND created.ChannelId=g.ChannelId AND created.WarehouseId=g.WarehouseId JOIN dbo.Shipments s ON s.Id=created.ShipmentId
        WHERE g.DocketNumber IS NOT NULL AND s.TransporterPartyId IS NOT NULL AND NOT EXISTS(SELECT 1 FROM dbo.ShipmentDockets d WHERE d.TransporterPartyId=s.TransporterPartyId AND d.DocketNumber=g.DocketNumber AND d.IsDeleted=0);
        INSERT dbo.ShipmentFreightCharges(ShipmentId,TransporterPartyId,ChargeType,CurrencyCode,BaseFreight,Status,CreatedBy)
        SELECT created.ShipmentId,s.TransporterPartyId,1,N'INR',g.FreightAmount,1,@UserId FROM @Groups g JOIN @Created created ON created.SourceKey=g.SourceKey AND created.ChannelId=g.ChannelId AND created.WarehouseId=g.WarehouseId JOIN dbo.Shipments s ON s.Id=created.ShipmentId WHERE COALESCE(g.FreightAmount,0)>0;
        INSERT dbo.ShipmentTrackingEvents(ShipmentId,EventType,EventDateTimeUtc,Source,Remarks,CreatedBy)
        SELECT ShipmentId,1,SYSUTCDATETIME(),N'HistoricalImport',N'Created by Work List historical import. Inventory was intentionally not changed.',@UserId FROM @Created;
        UPDATE dbo.SupplyChainImportBatches SET Status=5,CommittedRows=(SELECT COUNT(1) FROM dbo.ShipmentImportStagedRows WHERE BatchId=@Id),CommittedAtUtc=SYSUTCDATETIME(),CommittedBy=@UserId,ValidationSummaryJson=COALESCE(ValidationSummaryJson,N'{}') WHERE Id=@Id;
        COMMIT;
        SELECT 200 StatusCode,N'Historical shipment import committed without inventory movements.' Message;
        SELECT Id,OriginalFileName,FileHash,Status,TotalRows,ValidRows,InvalidRows,CommittedRows,UploadedAtUtc,CommittedAtUtc FROM dbo.SupplyChainImportBatches WHERE Id=@Id;
    END TRY
    BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; SELECT 500 StatusCode,ERROR_MESSAGE() Message; END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_ShipmentOperations_Import_Cancel @Id BIGINT,@Reason NVARCHAR(1000),@UserId BIGINT=NULL
AS
BEGIN
    SET NOCOUNT ON;
    IF NULLIF(LTRIM(RTRIM(@Reason)),N'') IS NULL BEGIN SELECT 400 StatusCode,N'A cancellation reason is required.' Message;RETURN;END;
    IF NOT EXISTS(SELECT 1 FROM dbo.SupplyChainImportBatches WHERE Id=@Id AND ModuleType=N'ShipmentOperations' AND ImportType=N'WorkListHistorical') BEGIN SELECT 404 StatusCode,N'Historical shipment import batch was not found.' Message;RETURN;END;
    IF EXISTS(SELECT 1 FROM dbo.SupplyChainImportBatches WHERE Id=@Id AND Status=5) BEGIN SELECT 409 StatusCode,N'Committed historical imports cannot be cancelled.' Message;RETURN;END;
    UPDATE dbo.SupplyChainImportBatches SET Status=6,CancelledAtUtc=SYSUTCDATETIME(),CancelledBy=@UserId,CancellationReason=@Reason WHERE Id=@Id;
    SELECT 200 StatusCode,N'Historical shipment import cancelled.' Message;
END;
GO
