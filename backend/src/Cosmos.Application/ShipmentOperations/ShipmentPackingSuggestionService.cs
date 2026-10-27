using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Contracts.ShipmentOperations;
using Cosmos.Shared.Exceptions;

namespace Cosmos.Application.ShipmentOperations;

public interface IShipmentPackingSuggestionService
{
    IReadOnlyCollection<ShipmentPackingSuggestionDto> Suggest(IReadOnlyCollection<ShipmentPackingSuggestionInput> items, ShipmentPackingSuggestionRequest request);
}

public sealed class ShipmentPackingSuggestionService : IShipmentPackingSuggestionService
{
    public IReadOnlyCollection<ShipmentPackingSuggestionDto> Suggest(IReadOnlyCollection<ShipmentPackingSuggestionInput> items, ShipmentPackingSuggestionRequest request)
    {
        var results = new List<ShipmentPackingSuggestionDto>();
        foreach (var item in items.Where(x => x.PlannedQuantity > x.PackedQuantity))
        {
            var quantity = item.PlannedQuantity - item.PackedQuantity;
            if (item.UnitsPerBox <= 0)
                throw new CosmosException($"Verified packaging is required for Item {item.ItemCode}; units per box is missing or invalid.");
            var unitsPerBox = item.UnitsPerBox;
            var fullPackageCount = (int)decimal.Floor(quantity / unitsPerBox);
            var looseQuantity = quantity - (fullPackageCount * unitsPerBox);
            var packageCount = fullPackageCount + (request.IncludeLoosePackage && looseQuantity > 0 ? 1 : 0);

            if (packageCount == 0 && quantity > 0)
            {
                packageCount = 1;
                looseQuantity = quantity;
            }

            results.Add(new ShipmentPackingSuggestionDto(
                item.ShipmentItemId, item.ItemId, item.ItemCode, item.ItemName, quantity, unitsPerBox, packageCount,
                looseQuantity, item.Length, item.Width, item.Height, item.GrossWeight, item.NetWeight, item.VolumetricDivisor));
        }

        return results;
    }
}
