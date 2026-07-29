using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Application.ShipmentOperations;
using Cosmos.Contracts.ShipmentOperations;
using Cosmos.Domain.ShipmentOperations;
using Cosmos.Shared.Exceptions;
using System.Text.Json;

namespace Cosmos.Tests.ShipmentOperations;

public sealed class ShipmentOperationsEngineTests
{
    private readonly ShipmentPackingSuggestionService _packing = new();
    private readonly ShipmentStatusTransitionService _transitions = new();

    [Fact]
    public void Suggest_UsesPackagingProfileAndKeepsLooseQuantityExplicit()
    {
        var result = Assert.Single(_packing.Suggest(
        [
            new ShipmentPackingSuggestionInput(10, 1, "SKU-1", "Item 1", 25m, 0m, 12m, 30m, 20m, 10m, 4m, 3m, 5000m)
        ], new ShipmentPackingSuggestionRequest()));

        Assert.Equal(3, result.SuggestedPackageCount);
        Assert.Equal(1m, result.SuggestedLooseQuantity);
        Assert.Equal(25m, result.Quantity);
    }

    [Fact]
    public void Suggest_ExcludesAlreadyPackedQuantity()
    {
        var result = Assert.Single(_packing.Suggest(
        [
            new ShipmentPackingSuggestionInput(10, 1, "SKU-1", "Item 1", 24m, 12m, 12m, 0m, 0m, 0m, 0m, 0m, null)
        ], new ShipmentPackingSuggestionRequest()));

        Assert.Equal(12m, result.Quantity);
        Assert.Equal(1, result.SuggestedPackageCount);
        Assert.Equal(0m, result.SuggestedLooseQuantity);
    }

    [Fact]
    public void Transition_RejectsDispatchBeforeReadyForDispatch()
    {
        var exception = Assert.Throws<CosmosException>(() => _transitions.EnsureAllowed(ShipmentStatus.Packed, ShipmentStatus.Dispatched));

        Assert.Equal(409, exception.StatusCode);
    }

    [Fact]
    public void Transition_RejectsAllClosedShipmentMutation()
    {
        var exception = Assert.Throws<CosmosException>(() => _transitions.EnsureAllowed(ShipmentStatus.Closed, ShipmentStatus.Delivered));

        Assert.Equal(409, exception.StatusCode);
    }

    [Fact]
    public void ShipmentEnums_SerializeAsNamedValues()
    {
        var serialized = JsonSerializer.Serialize(ShipmentStatus.ReadyForDispatch);
        var deserialized = JsonSerializer.Deserialize<ShipmentStatus>("\"ReadyForDispatch\"");

        Assert.Equal("\"ReadyForDispatch\"", serialized);
        Assert.Equal(ShipmentStatus.ReadyForDispatch, deserialized);
    }
}
