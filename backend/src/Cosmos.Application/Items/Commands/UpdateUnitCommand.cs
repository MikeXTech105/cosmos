namespace Cosmos.Application.Items.Commands;

public sealed record UpdateUnitCommand(string Name, string ShortName, string? Description, bool IsActive);
