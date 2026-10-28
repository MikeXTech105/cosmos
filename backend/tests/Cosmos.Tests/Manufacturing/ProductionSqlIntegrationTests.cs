using System.Text.Json;
using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Contracts.Manufacturing;
using Cosmos.Persistence.Connection;
using Cosmos.Persistence.Repositories;
using Cosmos.Shared.Exceptions;
using Dapper;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;

namespace Cosmos.Tests.Manufacturing;

/// <summary>These tests execute real procedures. They never read application connection settings.</summary>
public sealed class ProductionSqlIntegrationTests
{
    public const string Variable = "COSMOS_PRODUCTION_INTEGRATION_CONNECTION_STRING";
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    [ProductionSqlFact, Trait("Category", "SqlIntegration")]
    public async Task Exact_master_lookup_retains_inactive_history_and_isolates_company()
    {
        var f = await Fixture.Create();
        var order = await f.Draft(1);
        var operationId = await f.Scalar<long>("SELECT TOP(1) OperationId FROM dbo.ItemProductionRoutingSteps WHERE RoutingId=@Routing", new { Routing = order.RoutingId });
        var current = await f.Command<ProductionMasterDto>("sp_ProductionMaster_Read", new { Kind = "operations", Id = operationId });
        Assert.Equal(operationId, current.Id); Assert.Equal(10m, current.DefaultRate); Assert.True(current.IsActive);
        await f.Scalar<int>("UPDATE dbo.ProductionOperations SET IsActive=0 WHERE Id=@Id; SELECT 1", new { Id = operationId });
        var historic = await f.Command<ProductionMasterDto>("sp_ProductionMaster_Read", new { Kind = "operations", Id = operationId });
        Assert.False(historic.IsActive); Assert.NotEqual(current.Version, historic.Version);
        var otherCompany = await Assert.ThrowsAsync<CosmosException>(() => f.Repository.ExecuteAsync<ProductionMasterDto>("sp_ProductionMaster_Read", "other-company", 1, new { Kind = "operations", Id = operationId }, default));
        Assert.Equal(404, otherCompany.StatusCode);
    }

    [ProductionSqlFact, Trait("Category", "SqlIntegration")]
    public async Task Release_is_reserve_only_and_competing_releases_cannot_oversell()
    {
        var f = await Fixture.Create();
        var one = await f.Draft(60);
        var two = await f.Draft(60);
        var attempts = await Task.WhenAll(Release(one), Release(two));
        Assert.Single(attempts, x => x);
        var balances = await f.Balances();
        Assert.Equal(100m, balances.MaterialStock); Assert.Equal(71.4m, balances.Reserved); Assert.Equal(0m, balances.OutputStock);
        Assert.Equal(0, await f.Scalar<int>("SELECT COUNT(*) FROM dbo.StockMovements WHERE ItemId IN(@Material,@Output)"));
        async Task<bool> Release(ProductionOrderDto order)
        {
            try { await f.Release(order, $"release-{order.Id}"); return true; }
            catch (CosmosException e) when (e.StatusCode == 409) { return false; }
        }
    }

    [ProductionSqlFact, Trait("Category", "SqlIntegration")]
    public async Task Partial_good_and_rejected_output_consume_once_and_preserve_remaining_reservation()
    {
        var f = await Fixture.Create();
        var order = await f.Draft(60);
        var release = await f.Release(order, "release");
        var payload = f.Completion(release.Version, "partial", 20, 5, 29.75m);
        var first = await f.Command<ProductionCommandResult>("sp_ProductionOrder_Complete", new { Id = order.Id, Request = payload });
        var retry = await f.Command<ProductionCommandResult>("sp_ProductionOrder_Complete", new { Id = order.Id, Request = payload });
        Assert.Equal(first, retry);
        var balances = await f.Balances();
        Assert.Equal(70.25m, balances.MaterialStock); Assert.Equal(41.65m, balances.Reserved); Assert.Equal(20m, balances.OutputStock);
        var after = await f.Order(order.Id);
        Assert.Equal(35m, after.RemainingQuantity); Assert.Equal(5m, after.RejectedQuantity);
        await Assert.ThrowsAsync<CosmosException>(() => f.Command<ProductionCommandResult>("sp_ProductionOrder_Complete", new { Id = order.Id, Request = payload with { GoodOutput = 21 } }));
        var last = f.Completion(first.Version, "final", 35, 0, 41.65m);
        await f.Command<ProductionCommandResult>("sp_ProductionOrder_Complete", new { Id = order.Id, Request = last });
        balances = await f.Balances(); Assert.Equal(0m, balances.Reserved); Assert.Equal(55m, balances.OutputStock);
        Assert.Equal(4, await f.Scalar<int>("SELECT COUNT(*) FROM dbo.StockMovements WHERE ItemId IN(@Material,@Output)"));
    }

    [ProductionSqlFact, Trait("Category", "SqlIntegration")]
    public async Task Failed_extra_consumption_rolls_back_order_reservation_completion_and_movements()
    {
        var f = await Fixture.Create(); var order = await f.Draft(60); var released = await f.Release(order, "release");
        var bad = f.Completion(released.Version, "too-much", 1, 0, 200m) with { VarianceReason = "Investigate" };
        await Assert.ThrowsAsync<CosmosException>(() => f.Command<ProductionCommandResult>("sp_ProductionOrder_Complete", new { Id = order.Id, Request = bad }));
        var balances = await f.Balances(); Assert.Equal(100m, balances.MaterialStock); Assert.Equal(71.4m, balances.Reserved);
        Assert.Equal(released.Version, (await f.Order(order.Id)).Version);
        Assert.Equal(0, await f.Scalar<int>("SELECT COUNT(*) FROM dbo.ProductionCompletions WHERE OrderId=@Order", new { Order = order.Id }));
        Assert.Equal(0, await f.Scalar<int>("SELECT COUNT(*) FROM dbo.StockMovements WHERE ItemId IN(@Material,@Output)"));
    }

    [ProductionSqlFact, Trait("Category", "SqlIntegration")]
    public async Task Reversal_is_compensating_once_and_never_silently_reopens_reservations()
    {
        var f = await Fixture.Create(); var order = await f.Draft(60); var released = await f.Release(order, "release");
        var posted = await f.Command<ProductionCommandResult>("sp_ProductionOrder_Complete", new { Id = order.Id, Request = f.Completion(released.Version, "post", 20, 0, 23.8m) });
        var action = new ProductionOrderActionRequest(posted.Version, "Wrong production entry", "reverse");
        var result = await f.Command<ProductionCommandResult>("sp_ProductionOrder_Action", new { Id = posted.CompletionId, Action = "reverse-completion", BusinessDate = f.Date, Request = action });
        var retry = await f.Command<ProductionCommandResult>("sp_ProductionOrder_Action", new { Id = posted.CompletionId, Action = "reverse-completion", BusinessDate = f.Date, Request = action });
        Assert.Equal(result, retry);
        var balances = await f.Balances(); Assert.Equal(100m, balances.MaterialStock); Assert.Equal(0m, balances.Reserved); Assert.Equal(0m, balances.OutputStock);
        Assert.Equal("Closed", result.Status);
        Assert.Equal(4, await f.Scalar<int>("SELECT COUNT(*) FROM dbo.StockMovements WHERE ItemId IN(@Material,@Output)"));
    }

    [ProductionSqlFact, Trait("Category", "SqlIntegration")]
    public async Task Stale_version_and_cross_company_reads_fail_without_mutation()
    {
        var f = await Fixture.Create(); var order = await f.Draft(10); await f.Release(order, "release");
        var stale = await Assert.ThrowsAsync<CosmosException>(() => f.Release(order, "other-release")); Assert.Equal(409, stale.StatusCode);
        var other = await Assert.ThrowsAsync<CosmosException>(() => f.Repository.ExecuteAsync<ProductionOrderDto>("sp_ProductionOrder_Read", "other-company", 1, new { Id = order.Id }, default));
        Assert.Equal(404, other.StatusCode);

        // Exercise the installed capacity read, then verify both sides of its
        // returned bound with the scheduling transaction's literal typed guard.
        var draft = await f.Draft(0.000001m);
        foreach (var vector in new (decimal Required, decimal Factor, long Seconds)[]
        { (0.010000m, 0.600000m, 1), (0.016667m, 1m, 1), (0.016668m, 1m, 2), (30.000001m, 0.5m, 3601) })
        {
            await f.Scalar<int>("UPDATE dbo.ItemProductionRoutingSteps SET SetupMinutes=@Required,Rate=1000000,QuantityBasis=1 WHERE RoutingId=@RoutingId;UPDATE c SET CapacityFactor=@Factor FROM dbo.ProductionWorkCentreShifts c JOIN dbo.ItemProductionRoutingSteps s ON s.WorkCentreId=c.WorkCentreId WHERE s.RoutingId=@RoutingId;SELECT 1", new { vector.Required, vector.Factor, draft.RoutingId });
            var capacity = await f.Command<CapacityFeasibilityDto>("sp_ProductionCapacity_Read", new { Id = draft.Id, BusinessDate = f.Date, TimeZone = "UTC" });
            var line = Assert.Single(capacity.Lines);
            Assert.Equal(vector.Required, line.RequiredMinutes);
            Assert.Equal(vector.Seconds, line.MinimumBookingSeconds);
            foreach (var seconds in new[] { vector.Seconds - 1, vector.Seconds })
            {
                var accepted = await f.Scalar<bool>("SELECT CONVERT(BIT,CASE WHEN CONVERT(BIGINT,@Seconds)/60.0*CONVERT(DECIMAL(9,6),@Factor)>=CONVERT(DECIMAL(22,6),@Required) THEN 1 ELSE 0 END)", new { Seconds = seconds, vector.Factor, vector.Required });
                Assert.Equal(seconds == vector.Seconds, accepted);
            }
        }
    }

    [ProductionSqlFact,Trait("Category","SqlIntegration")]
    public async Task Fractional_partial_rounding_residue_is_consumed_at_the_cumulative_boundary()
    {
        var f=await Fixture.Create();
        await f.Scalar<int>("UPDATE dbo.ManufacturingBoms SET OutputBaseQuantity=3 WHERE Id=@Bom;UPDATE dbo.ManufacturingBomItems SET Quantity=1 WHERE BomId=@Bom;SELECT 1",new {f.Bom});
        var order=await f.Draft(3);var result=await f.Release(order,"release");
        foreach(var pair in new[]{("one",0.333333m),("two",0.333334m),("three",0.333333m)})
            result=await f.Command<ProductionCommandResult>("sp_ProductionOrder_Complete",new {Id=order.Id,Request=f.Completion(result.Version,pair.Item1,1,0,pair.Item2)});
        var balances=await f.Balances();Assert.Equal(99m,balances.MaterialStock);Assert.Equal(0m,balances.Reserved);Assert.Equal(3m,balances.OutputStock);
        Assert.Equal(1m,await f.Scalar<decimal>("SELECT SUM(m.ExpectedQuantity) FROM dbo.ProductionCompletionMaterials m JOIN dbo.ProductionCompletions c ON c.Id=m.CompletionId WHERE c.OrderId=@Order",new {Order=order.Id}));
    }

    [ProductionSqlFact,Trait("Category","SqlIntegration")]
    public async Task Partial_amendment_preserves_actual_history_and_reallocates_only_remaining_material()
    {
        var f=await Fixture.Create();var order=await f.Draft(20);var release=await f.Release(order,"release");
        var partial=await f.Command<ProductionCommandResult>("sp_ProductionOrder_Complete",new {Id=order.Id,Request=f.Completion(release.Version,"partial",10,0,11.9m)});
        var amendment=new ProductionOrderAmendRequest(partial.Version,"amend",30,f.Date,f.Date.AddDays(3),"Additional approved work",30);
        var amended=await f.Command<ProductionCommandResult>("sp_ProductionOrder_Amend",new {Id=order.Id,BusinessDate=f.Date,Request=amendment});
        var balances=await f.Balances();Assert.Equal(88.1m,balances.MaterialStock);Assert.Equal(23.8m,balances.Reserved);Assert.Equal(10m,balances.OutputStock);
        await f.Command<ProductionCommandResult>("sp_ProductionOrder_Complete",new {Id=order.Id,Request=f.Completion(amended.Version,"final",20,0,23.8m)});
        balances=await f.Balances();Assert.Equal(64.3m,balances.MaterialStock);Assert.Equal(0m,balances.Reserved);Assert.Equal(30m,balances.OutputStock);
        Assert.Equal(2,(await f.Order(order.Id)).Revision);
    }

    [ProductionSqlFact,Trait("Category","SqlIntegration")]
    public async Task Reconciled_cutover_adopts_existing_balance_without_adding_stock_twice()
    {
        var f=await Fixture.Create();
        var stage=new ProductionImportRequest(Guid.NewGuid().ToString("N"),"verified-opening.csv",f.Date,[new("CURREENT STOCK",2,"B","opening-"+Guid.NewGuid().ToString("N"),"{\"sourceBalance\":100}",null,null)]);
        var batch=await f.Command<ProductionImportResult>("sp_ProductionImport_Stage",stage);
        var preview=await f.Command<ProductionImportPreview>("sp_ProductionImport_Preview",new {Id=batch.BatchId,Query=new ProductionWorkspaceQuery()});
        var row=Assert.Single(preview.Rows.Items);
        var mapping=new ProductionImportMappingRequest(preview.Version,"map",row.Id,ProductionImportDisposition.Opening,f.Material,f.MaterialUnit,100,f.Date,"opening-proof","Verified opening reconciliation");
        batch=await f.Command<ProductionImportResult>("sp_ProductionImport_Map",new {Id=batch.BatchId,Request=mapping});
        foreach(var action in new[]{"validate","reconcile","approve","post"})
            batch=await f.Command<ProductionImportResult>("sp_ProductionImport_Action",new {Id=batch.BatchId,Action=action,BusinessDate=f.Date,Request=new ProductionImportActionRequest(batch.Version!,action,[row.Id],"Audited source")});
        var report=await f.Command<Cosmos.Contracts.Common.PagedResult<ProductionOperationalReportRow>>("sp_ProductionOperationalReport_Read",new {Kind="stock-as-of",CurrentBusinessDate=f.Date,Query=new ProductionWorkspaceQuery(ItemId:f.Material,AsOfDate:f.Date)});
        var balance=Assert.Single(report.Items);Assert.Equal(100m,balance.OnHandQuantity);Assert.Equal(0m,balance.ReconciliationDifference);
        Assert.Equal(100m,(await f.Balances()).MaterialStock);Assert.Equal(0,await f.Scalar<int>("SELECT COUNT(*) FROM dbo.StockMovements WHERE ItemId IN(@Material,@Output)"));
    }

    [ProductionSqlFact,Trait("Category","SqlIntegration")]
    public async Task Controlled_adjustment_is_idempotent_and_cannot_take_another_orders_reserved_stock()
    {
        var f=await Fixture.Create();var order=await f.Draft(60);await f.Release(order,"release");
        var current=await f.Command<StockBalanceDto>("sp_ProductionStock_Balance",new {Id=f.Material});
        var bad=new StockAdjustmentRequest(current.Version,"adjust-bad",f.Date,current.UnitId,-30,"Count difference","count-bad");
        await Assert.ThrowsAsync<CosmosException>(()=>f.Command<ProductionCommandResult>("sp_ProductionStock_Adjust",new {Id=f.Material,Request=bad}));
        var request=bad with {IdempotencyKey="adjust",SignedQuantity=2,SourceReference="count-proof"};
        var first=await f.Command<ProductionCommandResult>("sp_ProductionStock_Adjust",new {Id=f.Material,Request=request});
        var retry=await f.Command<ProductionCommandResult>("sp_ProductionStock_Adjust",new {Id=f.Material,Request=request});
        Assert.Equal(first,retry);Assert.Equal(102m,(await f.Balances()).MaterialStock);
        Assert.Equal(1,await f.Scalar<int>("SELECT COUNT(*) FROM dbo.StockMovements WHERE ItemId=@Material AND SourceType=N'StockAdjustment'"));
    }

    [ProductionSqlFact,Trait("Category","SqlIntegration")]
    public async Task Partial_receipt_later_bill_return_and_financial_credit_share_one_physical_posting_owner()
    {
        var f=await Fixture.Create();
        var ids=await f.PurchaseFixture();
        var version=await f.Scalar<string>("SELECT CONVERT(VARCHAR(18),RowVersion,1) FROM dbo.PurchaseOrders WHERE Id=@Order",new {ids.Order});
        var request=new PurchaseReceiptRequest(version,"receive",f.Date,ids.Supplier,"GRN",[new(ids.OrderLine,f.Material,f.MaterialUnit,3,1,1,2)]);
        var received=await f.Command<ProductionCommandResult>("sp_PurchasePhysical_Command",new {Action="purchase-receipt",Id=ids.Order,Request=request});
        Assert.Equal(received,await f.Command<ProductionCommandResult>("sp_PurchasePhysical_Command",new {Action="purchase-receipt",Id=ids.Order,Request=request}));
        Assert.Equal(103m,(await f.Balances()).MaterialStock);
        var receipt=await f.Command<PurchasePhysicalContext>("sp_PurchasePhysical_Read",new {Id=received.Id,Kind="receipt"});
        var line=Assert.Single(receipt.Lines);
        var billVersion=await f.Scalar<string>("SELECT CONVERT(VARCHAR(18),RowVersion,1) FROM dbo.PurchaseBills WHERE Id=@Bill",new {ids.Bill});
        await f.Command<ProductionCommandResult>("sp_PurchasePhysical_Command",new {Action="purchase-bill-links",Id=ids.Bill,Request=new PurchaseReceiptBillLinkRequest(billVersion,"link",[new(line.Id,ids.BillLine,3)])});
        Assert.Equal(200,await f.Scalar<int>("EXEC dbo.sp_PurchaseBill_Confirm @Id=@Bill,@UserId=1",new {ids.Bill}));
        Assert.Equal(103m,(await f.Balances()).MaterialStock);
        var returned=await f.Command<ProductionCommandResult>("sp_PurchasePhysical_Command",new {Action="purchase-return",Id=received.Id,Request=new PurchaseReceiptReturnRequest(receipt.Version,"return",f.Date,line.Id,1,0,0,"Damaged accepted goods")});
        Assert.Equal(102m,(await f.Balances()).MaterialStock);
        var credit=new PurchaseReceiptCreditRequest("credit",ids.BillLine,f.Date,"Supplier credit against returned billed goods");
        var financial=await f.Command<ProductionCommandResult>("sp_PurchasePhysical_ReturnCredit",new {Id=returned.Id,Request=credit});
        Assert.Equal(financial,await f.Command<ProductionCommandResult>("sp_PurchasePhysical_ReturnCredit",new {Id=returned.Id,Request=credit}));
        Assert.Equal(102m,(await f.Balances()).MaterialStock);
        Assert.Equal(2,await f.Scalar<int>("SELECT COUNT(*) FROM dbo.StockMovements WHERE ItemId=@Material"));
        Assert.Equal(-2m,await f.Scalar<decimal>("SELECT Amount FROM dbo.PartyLedgerEntries WHERE SourceType=N'PurchaseReturn' AND SourceId=@Credit AND IsDeleted=0",new {Credit=financial.Id}));
        version=await f.Scalar<string>("SELECT CONVERT(VARCHAR(18),RowVersion,1) FROM dbo.PurchaseOrders WHERE Id=@Order",new {ids.Order});
        await Assert.ThrowsAsync<CosmosException>(()=>f.Command<ProductionCommandResult>("sp_PurchasePhysical_Command",new {Action="purchase-receipt",Id=ids.Order,Request=request with {Version=version,IdempotencyKey="over",SourceReference="over",Lines=[new(ids.OrderLine,f.Material,f.MaterialUnit,8)]}}));
    }

    [ProductionSqlFact,Trait("Category","SqlIntegration")]
    public async Task Linked_invoice_before_or_after_two_partial_dispatches_never_posts_stock_twice()
    {
        foreach(var invoiceFirst in new[]{true,false})
        {
            var f=await Fixture.Create();var ids=await f.InvoiceFixture(true);
            var version=await f.Scalar<string>("SELECT CONVERT(VARCHAR(18),RowVersion,1) FROM dbo.SalesInvoices WHERE Id=@Invoice",new {ids.Invoice});
            await f.Command<ProductionCommandResult>("sp_PhysicalInventory_Ownership",new {Id=ids.Invoice,Action="invoice-policy",Request=new InvoiceOwnershipRequest(version,"policy",[new(ids.InvoiceLine,InvoiceInventoryOwner.Shipment)])});
            foreach(var pair in new[]{(ids.Shipment1,ids.ShipmentLine1),(ids.Shipment2,ids.ShipmentLine2)})
            {
                version=await f.Scalar<string>("SELECT CONVERT(VARCHAR(18),RowVersion,1) FROM dbo.Shipments WHERE Id=@Shipment",new {Shipment=pair.Item1});
                await f.Command<ProductionCommandResult>("sp_PhysicalInventory_Ownership",new {Id=pair.Item1,Action="shipment-links",Request=new ShipmentInvoiceLinkRequest(version,"link-"+pair.Item1,[new(pair.Item2,ids.InvoiceLine,5)])});
            }
            if(invoiceFirst){Assert.Equal(200,await f.Scalar<int>("EXEC dbo.sp_SalesInvoice_Confirm @Id=@Invoice,@UserId=1",new {ids.Invoice}));Assert.Equal(100m,(await f.Balances()).MaterialStock);}
            foreach(var shipment in new[]{ids.Shipment1,ids.Shipment2}) Assert.Equal(200,await f.Scalar<int>("EXEC dbo.usp_ShipmentOperations_Shipment_Transition @Id=@Shipment,@SourceStatus=5,@TargetStatus=6,@UserId=1",new {Shipment=shipment}));
            if(!invoiceFirst)Assert.Equal(200,await f.Scalar<int>("EXEC dbo.sp_SalesInvoice_Confirm @Id=@Invoice,@UserId=1",new {ids.Invoice}));
            Assert.Equal(90m,(await f.Balances()).MaterialStock);
            Assert.Equal(0,await f.Scalar<int>("SELECT COUNT(*) FROM dbo.StockMovements WHERE SourceType=N'SalesInvoice' AND SourceId=@Invoice",new {ids.Invoice}));
            Assert.Equal(200,await f.Scalar<int>("EXEC dbo.sp_SalesInvoice_Cancel @Id=@Invoice,@UserId=1",new {ids.Invoice}));
            Assert.Equal(90m,(await f.Balances()).MaterialStock);
        }
    }

    [ProductionSqlFact,Trait("Category","SqlIntegration")]
    public async Task Standalone_invoice_posts_and_cancels_its_own_stock_once()
    {
        var f=await Fixture.Create();var ids=await f.InvoiceFixture(false);
        Assert.Equal(200,await f.Scalar<int>("EXEC dbo.sp_SalesInvoice_Confirm @Id=@Invoice,@UserId=1",new {ids.Invoice}));
        Assert.Equal(90m,(await f.Balances()).MaterialStock);
        Assert.Equal(200,await f.Scalar<int>("EXEC dbo.sp_SalesInvoice_Cancel @Id=@Invoice,@UserId=1",new {ids.Invoice}));
        Assert.Equal(100m,(await f.Balances()).MaterialStock);
        Assert.Equal(409,await f.Scalar<int>("EXEC dbo.sp_SalesInvoice_Cancel @Id=@Invoice,@UserId=1",new {ids.Invoice}));
        Assert.Equal(2,await f.Scalar<int>("SELECT COUNT(*) FROM dbo.StockMovements WHERE SourceType=N'SalesInvoice' AND SourceId=@Invoice",new {ids.Invoice}));
    }

    private sealed class Fixture(string connectionString, string company, long material, long output, long bom, long route, long machine, long mould, long shift, long materialUnit)
    {
        public long Material=>material;
        public long MaterialUnit=>materialUnit;
        public long Bom=>bom;
        public async Task<(long Invoice,long InvoiceLine,long Shipment1,long ShipmentLine1,long Shipment2,long ShipmentLine2)> InvoiceFixture(bool linked)
        {
            await using var c=new SqlConnection(connectionString);await c.OpenAsync();
            return await c.QuerySingleAsync<(long,long,long,long,long,long)>("""
                DECLARE @Party UNIQUEIDENTIFIER=NEWID();INSERT dbo.Parties(Id,PartyCode,PartyName,GSTTreatment,OpeningBalanceType) VALUES(@Party,@Company,N'Test customer/transporter',1,1);
                INSERT dbo.PartyRoles(PartyId,RoleCode) VALUES(@Party,N'Transporter');
                INSERT dbo.SalesInvoices(InvoiceNumber,InvoiceDate,CustomerPartyId,SubTotal,GrandTotal,DueAmount) VALUES(@Company,'20261027',@Party,20,20,20);DECLARE @Invoice BIGINT=SCOPE_IDENTITY();
                INSERT dbo.SalesInvoiceItems(SalesInvoiceId,ItemId,ItemNameSnapshot,Quantity,UnitId,Rate,LineTotal) VALUES(@Invoice,@Material,N'Material',10,@Unit,2,20);DECLARE @InvoiceLine BIGINT=SCOPE_IDENTITY();
                INSERT dbo.SalesChannels(Code,Name) VALUES(LEFT(@Company,20),@Company);DECLARE @Channel BIGINT=SCOPE_IDENTITY();
                INSERT dbo.ChannelWarehouses(ChannelId,WarehouseCode,WarehouseName) VALUES(@Channel,N'WH',N'External test destination');DECLARE @Warehouse BIGINT=SCOPE_IDENTITY();
                INSERT dbo.ItemPackagingProfiles(ItemId,PackagingCode,UnitsPerBox,DimensionUnit,WeightUnit) VALUES(@Material,N'BOX',5,N'CM',N'KG');DECLARE @Profile BIGINT=SCOPE_IDENTITY();
                INSERT dbo.Shipments(ShipmentNumber,ChannelId,WarehouseId,ChannelCodeSnapshot,WarehouseCodeSnapshot,WarehouseNameSnapshot,ShipmentDate,InvoiceId,Status) VALUES(@Company+N'-1',@Channel,@Warehouse,@Company,N'WH',N'External test destination','20261027',CASE WHEN @Linked=1 THEN @Invoice END,5);DECLARE @S1 BIGINT=SCOPE_IDENTITY();
                INSERT dbo.ShipmentItems(ShipmentId,ItemId,PlannedQuantity,PackedQuantity,UnitsPerBoxSnapshot,PackagingProfileId,ItemCodeSnapshot,ItemNameSnapshot,BaseUnitIdSnapshot) VALUES(@S1,@Material,5,5,5,@Profile,@Company,N'Material',@Unit);DECLARE @L1 BIGINT=SCOPE_IDENTITY();
                INSERT dbo.Shipments(ShipmentNumber,ChannelId,WarehouseId,ChannelCodeSnapshot,WarehouseCodeSnapshot,WarehouseNameSnapshot,ShipmentDate,InvoiceId,Status) VALUES(@Company+N'-2',@Channel,@Warehouse,@Company,N'WH',N'External test destination','20261027',CASE WHEN @Linked=1 THEN @Invoice END,5);DECLARE @S2 BIGINT=SCOPE_IDENTITY();
                INSERT dbo.ShipmentItems(ShipmentId,ItemId,PlannedQuantity,PackedQuantity,UnitsPerBoxSnapshot,PackagingProfileId,ItemCodeSnapshot,ItemNameSnapshot,BaseUnitIdSnapshot) VALUES(@S2,@Material,5,5,5,@Profile,@Company,N'Material',@Unit);DECLARE @L2 BIGINT=SCOPE_IDENTITY();
                INSERT dbo.ShipmentDockets(ShipmentId,TransporterPartyId,DocketNumber,DocketDate,DispatchMode) VALUES(@S1,@Party,@Company+N'-1','20261027',1),(@S2,@Party,@Company+N'-2','20261027',1);
                SELECT @Invoice,@InvoiceLine,@S1,@L1,@S2,@L2;
                """,new {Company=company,Material=material,Unit=materialUnit,Linked=linked});
        }
        public async Task<(Guid Supplier,long Order,long OrderLine,long Bill,long BillLine)> PurchaseFixture()
        {
            await using var c=new SqlConnection(connectionString);await c.OpenAsync();
            return await c.QuerySingleAsync<(Guid,long,long,long,long)>("""
                DECLARE @Supplier UNIQUEIDENTIFIER=NEWID();
                INSERT dbo.Parties(Id,PartyCode,PartyName,GSTTreatment,OpeningBalanceType) VALUES(@Supplier,@Company,N'Test supplier',1,1);
                INSERT dbo.PurchaseOrders(PurchaseOrderNo,SupplierId,OrderDate,ExpectedDeliveryDate,Status,SubTotal,DiscountAmount,TaxAmount,GrandTotal) VALUES(@Company,@Supplier,'20261027','20261028',1,20,0,0,20);DECLARE @Order BIGINT=SCOPE_IDENTITY();
                INSERT dbo.PurchaseOrderItems(PurchaseOrderId,ItemId,ItemNameSnapshot,Quantity,UnitId,UnitNameSnapshot,PurchasePrice,DiscountPercentage,DiscountAmount,TaxPercentage,TaxAmount,LineTotal) VALUES(@Order,@Material,N'Material',10,@Unit,N'KG',2,0,0,0,0,20);DECLARE @OrderLine BIGINT=SCOPE_IDENTITY();
                INSERT dbo.PurchaseBills(PurchaseBillNo,SupplierId,BillDate,PaymentType,PaymentStatus,SubTotal,DiscountAmount,TaxAmount,RoundOff,GrandTotal,PaidAmount,BalanceAmount,Status) VALUES(@Company,@Supplier,'20261027',2,1,6,0,0,0,6,0,6,1);DECLARE @Bill BIGINT=SCOPE_IDENTITY();
                INSERT dbo.PurchaseBillItems(PurchaseBillId,ItemId,ItemNameSnapshot,Quantity,UnitId,UnitNameSnapshot,PurchasePrice,DiscountPercentage,DiscountAmount,TaxPercentage,TaxAmount,LineTotal) VALUES(@Bill,@Material,N'Material',3,@Unit,N'KG',2,0,0,0,0,6);DECLARE @BillLine BIGINT=SCOPE_IDENTITY();
                SELECT @Supplier,@Order,@OrderLine,@Bill,@BillLine;
                """,new {Company=company,Material=material,Unit=materialUnit});
        }
        public DateOnly Date { get; } = new(2026, 10, 27);
        public IProductionWorkspaceRepository Repository { get; } = new ProductionWorkspaceRepository(new SqlConnectionFactory(new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?> { ["ConnectionStrings:CosmosDb"] = connectionString }).Build()));
        public Task<T> Command<T>(string procedure, object request) => Repository.ExecuteAsync<T>(procedure, company, 1, request, default);
        public Task<ProductionOrderDto> Draft(decimal qty) => Command<ProductionOrderDto>("sp_ProductionOrder_SaveDraft", new { Request = new ProductionOrderDraftRequest(Date, Date, Date.AddDays(2), output, bom, route, qty, machine, mould, shift) });
        public Task<ProductionOrderDto> Order(long id) => Command<ProductionOrderDto>("sp_ProductionOrder_Read", new { Id = id });
        public Task<ProductionCommandResult> Release(ProductionOrderDto order, string key) => Command<ProductionCommandResult>("sp_ProductionOrder_Release", new { Id = order.Id, BusinessDate = Date, Request = new ProductionOrderReleaseRequest(order.Version, order.PlannedQuantity, key) });
        public ProductionCompletionRequest Completion(string version, string key, decimal good, decimal reject, decimal consumed) => new(version, key, Date, new DateTimeOffset(2026, 10, 27, 12, 0, 0, TimeSpan.FromHours(5.5)), good, reject, machine, mould, shift, [new(material, materialUnit, consumed)]);
        public async Task<(decimal MaterialStock, decimal Reserved, decimal OutputStock)> Balances()
        {
            await using var c = new SqlConnection(connectionString); await c.OpenAsync();
            return await c.QuerySingleAsync<(decimal, decimal, decimal)>("SELECT m.CurrentStock,m.ReservedStock,o.CurrentStock FROM dbo.Items m CROSS JOIN dbo.Items o WHERE m.Id=@material AND o.Id=@output", new { material, output });
        }
        public async Task<T> Scalar<T>(string sql, object? parameters = null)
        {
            await using var c = new SqlConnection(connectionString); await c.OpenAsync();
            return await c.QuerySingleAsync<T>(sql, parameters ?? new { Material = material, Output = output });
        }
        public static async Task<Fixture> Create()
        {
            var cs = Environment.GetEnvironmentVariable(Variable) ?? throw new InvalidOperationException("Explicit test connection is required.");
            var builder = new SqlConnectionStringBuilder(cs);
            Assert.StartsWith("CosmosProductionIntegrationTests_", builder.InitialCatalog, StringComparison.OrdinalIgnoreCase);
            await using var c = new SqlConnection(cs); await c.OpenAsync();
            Assert.Equal(builder.InitialCatalog, await c.QuerySingleAsync<string>("SELECT DB_NAME()"));
            var company = "test-" + Guid.NewGuid().ToString("N");
            var ids = await c.QuerySingleAsync<(long Material, long Output, long Bom, long Route, long Machine, long Mould, long Shift, long MaterialUnit)>(
                """
                SET XACT_ABORT ON; BEGIN TRAN;
                INSERT dbo.Units(Name,ShortName) VALUES(@Company+N'-KG',N'KG'); DECLARE @KG BIGINT=SCOPE_IDENTITY();
                INSERT dbo.Units(Name,ShortName) VALUES(@Company+N'-PCS',N'PCS'); DECLARE @PCS BIGINT=SCOPE_IDENTITY();
                INSERT dbo.Categories(Name) VALUES(@Company); DECLARE @Cat BIGINT=SCOPE_IDENTITY();
                INSERT dbo.Items(Name,ItemCode,CategoryId,UnitId,ItemType,CurrentStock,OpeningStock,IsManufactured) VALUES(N'Material',@Company+N'-RM',@Cat,@KG,1,100,100,0); DECLARE @RM BIGINT=SCOPE_IDENTITY();
                INSERT dbo.Items(Name,ItemCode,CategoryId,UnitId,ItemType,IsManufactured) VALUES(N'Output',@Company+N'-FG',@Cat,@PCS,1,1); DECLARE @FG BIGINT=SCOPE_IDENTITY();
                INSERT dbo.OeeMachines(MachineCode,MachineName) VALUES(@Company,N'Test'); DECLARE @Machine BIGINT=SCOPE_IDENTITY();
                INSERT dbo.OeeMoulds(MouldName,TargetShotPerDay,Cavity) VALUES(@Company,100,2); DECLARE @Mould BIGINT=SCOPE_IDENTITY();
                INSERT dbo.HR_Shifts(ShiftCode,ShiftName,StartTime,EndTime) VALUES(LEFT(@Company,20),@Company,'08:00','16:00'); DECLARE @Shift BIGINT=SCOPE_IDENTITY();
                INSERT dbo.ProductionWorkCentres(CompanyKey,Code,Name,IsActive,CapacityBasis,CreatedBy) VALUES(@Company,N'WC',N'Work centre',1,N'Minutes',1); DECLARE @WC BIGINT=SCOPE_IDENTITY();
                INSERT dbo.ProductionOperations(CompanyKey,Code,Name,IsActive,RateBasis,DefaultRate,CreatedBy) VALUES(@Company,N'OP',N'Operation',1,1,10,1); DECLARE @OP BIGINT=SCOPE_IDENTITY();
                INSERT dbo.ItemProductionRoutings(CompanyKey,ItemId,Revision,EffectiveFrom,CreatedBy) VALUES(@Company,@FG,N'1','20260101',1); DECLARE @Route BIGINT=SCOPE_IDENTITY();
                INSERT dbo.ItemProductionRoutingSteps(RoutingId,Sequence,OperationId,WorkCentreId,RateBasis,Rate,SetupMinutes,QuantityBasis) VALUES(@Route,1,@OP,@WC,1,10,0,1);
                INSERT dbo.ItemProductionEligibility(CompanyKey,ItemId,MachineId,MouldId,SkuOutputPerShot,EffectiveFrom,IsActive,CreatedBy) VALUES(@Company,@FG,@Machine,@Mould,2,'20260101',1,1);
                INSERT dbo.ProductionWorkCentreShifts(CompanyKey,WorkCentreId,ShiftId,EffectiveFrom,BreakMinutes,CapacityFactor,IsActive,CreatedBy) VALUES(@Company,@WC,@Shift,'20260101',0,1,1,1);
                INSERT dbo.ManufacturingBoms(BomNumber,FinishedItemId,Version,Status,EffectiveFrom,IsActive) VALUES(@Company,@FG,N'1',2,'20260101',1); DECLARE @Bom BIGINT=SCOPE_IDENTITY();
                INSERT dbo.ManufacturingBomItems(BomId,ComponentItemId,Quantity,UnitId) VALUES(@Bom,@RM,1.19,@KG);
                COMMIT;
                SELECT @RM Material,@FG Output,@Bom Bom,@Route Route,@Machine Machine,@Mould Mould,@Shift Shift,@KG MaterialUnit;
                """, new { Company = company });
            return new(cs, company, ids.Material, ids.Output, ids.Bom, ids.Route, ids.Machine, ids.Mould, ids.Shift, ids.MaterialUnit);
        }
    }
}

public sealed class ProductionSqlFactAttribute : FactAttribute
{
    public ProductionSqlFactAttribute()
    {
        if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable(ProductionSqlIntegrationTests.Variable)))
            Skip = $"No disposable SQL runtime: set {ProductionSqlIntegrationTests.Variable} to an explicitly prepared CosmosProductionIntegrationTests_* catalog.";
    }
}
