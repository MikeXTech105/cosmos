/* Run after Supply Chain, Dispatch Planning, Rojmel, and Shipment Operations migrations. Read-only verification. */
SET NOCOUNT ON;

DECLARE @RequiredTables TABLE(Name SYSNAME);
INSERT @RequiredTables VALUES
 (N'PartyRoles'),(N'Shipments'),(N'ShipmentItems'),(N'ShipmentPackages'),(N'ShipmentPackageItems'),
 (N'ShipmentDockets'),(N'ShipmentAppointments'),(N'ShipmentTrackingEvents'),(N'ShipmentDeliveryAttempts'),
 (N'ShipmentReceipts'),(N'ShipmentReceiptItems'),(N'ShipmentReturns'),(N'ShipmentReturnItems'),
 (N'ShipmentFreightCharges'),(N'ShipmentImportStagedRows');

IF EXISTS(SELECT 1 FROM @RequiredTables x WHERE OBJECT_ID(N'dbo.'+x.Name,N'U') IS NULL)
    THROW 52100,N'Shipment Operations table verification failed.',1;

DECLARE @RequiredProcedures TABLE(Name SYSNAME);
INSERT @RequiredProcedures VALUES
 (N'usp_ShipmentOperations_Shipment_List'),(N'usp_ShipmentOperations_Shipment_Get'),
 (N'usp_ShipmentOperations_Shipment_CreateManual'),(N'usp_ShipmentOperations_Shipment_CreateFromDispatchPlan'),
 (N'usp_ShipmentOperations_Shipment_Transition'),(N'usp_ShipmentOperations_Shipment_Cancel'),
 (N'usp_ShipmentOperations_Packing_SuggestionInputs'),(N'usp_ShipmentOperations_Package_Save'),
 (N'usp_ShipmentOperations_Docket_Save'),(N'usp_ShipmentOperations_Appointment_Save'),
 (N'usp_ShipmentOperations_Tracking_Add'),(N'usp_ShipmentOperations_DeliveryAttempt_Add'),
 (N'usp_ShipmentOperations_Receipt_Create'),(N'usp_ShipmentOperations_Return_Create'),
 (N'usp_ShipmentOperations_Return_Get'),(N'usp_ShipmentOperations_Return_Receive'),
 (N'usp_ShipmentOperations_Freight_Create'),(N'usp_ShipmentOperations_Freight_Get'),
 (N'usp_ShipmentOperations_Freight_Submit'),(N'usp_ShipmentOperations_Freight_Approve'),
 (N'usp_ShipmentOperations_Freight_Reject'),(N'usp_ShipmentOperations_Freight_MarkPaid'),
 (N'usp_ShipmentOperations_Freight_ReserveRojmel'),(N'usp_ShipmentOperations_Freight_CompleteRojmel'),
 (N'usp_ShipmentOperations_Freight_ReleaseRojmel'),(N'usp_ShipmentOperations_Transporter_Set'),
 (N'usp_ShipmentOperations_Transporter_List'),(N'usp_ShipmentOperations_Report_List'),
 (N'usp_ShipmentOperations_Dashboard'),(N'usp_ShipmentOperations_Import_Validate'),
 (N'usp_ShipmentOperations_Import_Commit'),(N'usp_ShipmentOperations_Import_Cancel'),(N'usp_ShipmentOperations_Import_List');

IF EXISTS(SELECT 1 FROM @RequiredProcedures x WHERE OBJECT_ID(N'dbo.'+x.Name,N'P') IS NULL)
    THROW 52101,N'Shipment Operations procedure verification failed.',1;

IF COL_LENGTH(N'dbo.Shipments',N'RowVersion') IS NULL OR COL_LENGTH(N'dbo.ShipmentItems',N'DispatchPlanningAllocationId') IS NULL
    THROW 52102,N'Shipment concurrency or Dispatch Planning integration columns are missing.',1;
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.ShipmentItems') AND name=N'UX_ShipmentItems_ShipmentItemAllocation')
    THROW 52103,N'Shipment Item allocation uniqueness index is missing.',1;
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.StockMovements') AND name=N'UX_StockMovements_ShipmentIdempotency')
    THROW 52104,N'Shipment StockMovement idempotency index is missing.',1;
IF OBJECT_ID(N'dbo.TR_ShipmentTrackingEvents_AppendOnly',N'TR') IS NULL
    THROW 52105,N'Append-only ShipmentTrackingEvents trigger is missing.',1;

IF EXISTS(SELECT 1 FROM dbo.Pages WHERE Name IN(N'ShipmentOperations',N'ShipmentOperations.Shipments',N'ShipmentOperations.Packing',N'ShipmentOperations.Dockets',N'ShipmentOperations.Appointments',N'ShipmentOperations.Tracking',N'ShipmentOperations.Receipts',N'ShipmentOperations.Returns',N'ShipmentOperations.Freight',N'ShipmentOperations.Imports',N'ShipmentOperations.Reports') GROUP BY Name HAVING COUNT(*)<>1)
    THROW 52106,N'Shipment Operations permission pages are incomplete or duplicated.',1;

/* Only the two intentional physical-stock procedures can mutate the shared stock source. */
IF EXISTS
(
    SELECT 1 FROM sys.sql_modules m JOIN sys.objects o ON o.object_id=m.object_id
    WHERE o.name LIKE N'usp_ShipmentOperations_%' AND m.definition LIKE N'%UPDATE dbo.Items%'
      AND o.name NOT IN(N'usp_ShipmentOperations_Shipment_Transition',N'usp_ShipmentOperations_Return_Receive')
)
    THROW 52107,N'Unexpected Shipment Operations stock mutation detected.',1;
IF EXISTS
(
    SELECT 1 FROM sys.sql_modules m JOIN sys.objects o ON o.object_id=m.object_id
    WHERE o.name IN(N'usp_ShipmentOperations_Shipment_CreateManual',N'usp_ShipmentOperations_Shipment_CreateFromDispatchPlan',N'usp_ShipmentOperations_Package_Save',N'usp_ShipmentOperations_Docket_Save',N'usp_ShipmentOperations_Import_Commit')
      AND (m.definition LIKE N'%UPDATE dbo.Items%' OR m.definition LIKE N'%INSERT dbo.StockMovements%')
)
    THROW 52108,N'Non-dispatch Shipment Operations workflow attempts to mutate inventory.',1;
IF EXISTS
(
    SELECT 1 FROM sys.sql_modules m JOIN sys.objects o ON o.object_id=m.object_id
    WHERE o.name=N'usp_ShipmentOperations_Freight_Approve' AND m.definition LIKE N'%WalletTransactions%'
)
    THROW 52109,N'Freight approval must not create an automatic Rojmel transaction.',1;

SELECT N'PASS' Result, N'Shipment Operations schema, procedures, permissions, append-only tracking, allocation/stock idempotency, and Rojmel boundary verified.' Detail;
