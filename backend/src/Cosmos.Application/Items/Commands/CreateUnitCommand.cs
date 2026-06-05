namespace Cosmos.Application.Items.Commands;

public sealed record CreateUnitCommand(string Name, string ShortName, string? Description, bool IsActive);
