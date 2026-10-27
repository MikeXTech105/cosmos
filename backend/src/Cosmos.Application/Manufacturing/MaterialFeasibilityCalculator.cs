using Cosmos.Contracts.Manufacturing;
using Cosmos.Shared.Exceptions;

namespace Cosmos.Application.Manufacturing;

public static class MaterialFeasibilityCalculator
{
    public static MaterialFeasibilityDto Calculate(Guid source, IReadOnlyCollection<MaterialFeasibilityInput> inputs)
    {
        if (inputs.Any(x => x.QuantityPerOutput <= 0 || x.OutputQuantity < 0 || x.OutputIncrement <= 0 || x.WastePercent is < 0 or > 100))
            throw new CosmosException("Material feasibility requires verified quantities, increments and additive waste.");
        if (inputs.GroupBy(x => (x.ProductItemId, x.MaterialItemId)).Any(x => x.Count() > 1))
            throw new CosmosException("Duplicate component requirements must be reconciled before allocation.");
        var pool = inputs.GroupBy(x => x.MaterialItemId).ToDictionary(x => x.Key, x =>
        {
            if (x.Select(y => (y.UnitId, y.PhysicalStock, y.ReservedStock)).Distinct().Count() != 1)
                throw new CosmosException("A shared component must have one consistent base unit and stock snapshot.");
            return Math.Max(0, x.First().PhysicalStock - x.First().ReservedStock);
        });
        var available = new Dictionary<long, decimal>(pool);
        var products = new List<ProductMaterialFeasibility>();
        foreach (var product in inputs.GroupBy(x => x.ProductItemId).OrderBy(x => x.Key))
        {
            var quantity = product.First().OutputQuantity;
            var increment = product.First().OutputIncrement;
            if (product.Any(x => x.OutputQuantity != quantity || x.OutputIncrement != increment)) throw new CosmosException("Product quantity and output increment must be consistent across its components.");
            var limit = quantity; long? bottleneck = null;
            foreach (var material in product)
            {
                var perOutput = material.QuantityPerOutput * (1 + material.WastePercent / 100);
                var materialLimit = pool[material.MaterialItemId] / perOutput;
                if (materialLimit < limit) { limit = materialLimit; bottleneck = material.MaterialItemId; }
            }
            var feasible = decimal.Floor(limit / increment) * increment;
            foreach (var material in product)
            {
                var allocation = ProductionCalculations.ExpectedMaterial(feasible, 1, material.QuantityPerOutput, material.WastePercent);
                // Round only the executed allocation boundary and never promise more than the pool.
                pool[material.MaterialItemId] = Math.Max(0, pool[material.MaterialItemId] - allocation);
            }
            products.Add(new(product.Key, quantity, feasible, bottleneck, feasible < quantity ? "SHARED_MATERIAL_SHORTAGE" : null));
        }
        var materials = inputs.GroupBy(x => x.MaterialItemId).Select(g =>
        {
            var required = g.Sum(x => ProductionCalculations.ExpectedMaterial(x.OutputQuantity, 1, x.QuantityPerOutput, x.WastePercent));
            var free = available[g.Key];
            return new SharedMaterialFeasibility(g.Key, g.First().UnitId, required, ProductionCalculations.Quantity(free - pool[g.Key]),
                free, ProductionCalculations.Quantity(pool[g.Key]), ProductionCalculations.Quantity(Math.Max(0, required - free)));
        }).OrderBy(x => x.ItemId).ToArray();
        return new(source, ProductionCalculations.Version, products, materials);
    }
}
