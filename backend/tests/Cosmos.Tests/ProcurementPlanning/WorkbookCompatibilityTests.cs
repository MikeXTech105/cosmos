using Cosmos.Application.ProcurementPlanning;
using Cosmos.Application.Services;
using Cosmos.Domain.Items;
using Cosmos.Domain.ProcurementPlanning;

namespace Cosmos.Tests.ProcurementPlanning;

public sealed class WorkbookCompatibilityTests
{
    [Fact]
    public void CleanWorkbookInputs_MatchExpectedProcurementRecommendations()
    {
        var sales = new[]
        {
            Sale(1, "BLACK ULTIMATE HANGER 20", 145m), Sale(2, "BLACK ULTIMATE HANGER 25", 55m), Sale(3, "BLACK ULTIMATE HANGER 40", 201m),
            Sale(4, "FLEXI-16", 105m), Sale(5, "GREY ULTIMATE HANGER 20", 169m), Sale(6, "MULTICOLOR HANGER 20", 149m),
            Sale(7, "ORA 20 WITH STORAGE BOX", 81m), Sale(9, "OREO CLIP 36 WITH STORAGE BOX", 77m),
            Sale(10, "OREO CLIP 60 WITH STORAGE BOX", 120m), Sale(14, "RAINBOWCLIP 36 WITH STORAGE BOX", 184m),
            Sale(19, "WHITE ULTIMATE HANGER 20", 140m), Sale(20, "WHITE-GREY ULTIMATE HANGER 20", 92m),
            Sale(23, "DELUX CLIP 24 WITH DELUX BOX", 47m), Sale(24, "DELUX CLIP 48 WITH DELUX BOX", 83m)
        };

        var bom = new[]
        {
            Bom(6,101,"MH HANGER",20m,0m,30m,1m,99m),
            Bom(1,102,"BLACK HANGER",20m,0m,30m,1m,34m), Bom(2,102,"BLACK HANGER",25m,0m,30m,1m,34m), Bom(3,102,"BLACK HANGER",40m,0m,30m,1m,34m),
            Bom(19,103,"WHITE HANGER",20m,0m,30m,1m,56m), Bom(20,103,"WHITE HANGER",10m,0m,30m,1m,56m),
            Bom(5,104,"GREY HANGER",20m,0m,30m,1m,88m), Bom(20,104,"GREY HANGER",10m,0m,30m,1m,88m),
            Bom(4,105,"FLEXI BLACK HANGER",16m,0m,30m,1m,21m),
            Bom(14,106,"KEEPER 55",1m,64m,13m,2m,89m), Bom(7,106,"KEEPER 55",1m,64m,13m,2m,89m), Bom(10,106,"KEEPER 55",1m,64m,13m,2m,89m),
            Bom(9,107,"OREO CLIP (DZN)",3m,0m,30m,2.5m,33m), Bom(10,107,"OREO CLIP (DZN)",5m,0m,30m,2.5m,33m),
            Bom(23,108,"DELUX CLIP (DZN)",2m,95m,30m,3m,82m), Bom(24,108,"DELUX CLIP (DZN)",4m,95m,30m,3m,82m)
        };

        var result = new ProcurementCalculationService().Calculate(
            new ProcurementCalculationData(sales, bom, []),
            new DateOnly(2026, 6, 1),
            new DateOnly(2026, 6, 30));

        Assert.Empty(result.Validation.BlockingErrors);
        AssertQuantity(result, "MH HANGER", 5960m);
        AssertQuantity(result, "BLACK HANGER", 24630m);
        AssertQuantity(result, "WHITE HANGER", 7440m);
        AssertQuantity(result, "GREY HANGER", 8600m);
        AssertQuantity(result, "FLEXI BLACK HANGER", 3360m);
        AssertQuantity(result, "KEEPER 55", 872.833333m);
        AssertQuantity(result, "OREO CLIP (DZN)", 2908.5m);
        AssertQuantity(result, "DELUX CLIP (DZN)", 1609m);
    }

    private static void AssertQuantity(ProcurementCalculationResult result, string material, decimal expected) =>
        Assert.Equal(expected, result.Lines.Single(x => x.MaterialItemName == material).CalculatedSuggestedQuantity);

    private static ProductSalesInput Sale(long id, string name, decimal quantity) =>
        new(id, $"FP-{id}", name, true, (int)ProcurementItemClassification.FinishedProduct, quantity);

    private static BomCalculationInput Bom(long productId, long materialId, string materialName, decimal quantity, decimal stock, decimal lead, decimal safety, decimal moq) =>
        new(productId, materialId, $"RM-{materialId}", materialName, true, (int)ProcurementItemClassification.RawMaterial, materialId, "Workbook unit", "Unit", quantity,
            true, stock, materialId, lead, null, null, safety, moq, null, true, false, (int)PlanningRoundingRule.UpToOrderMultiple, true);
}
