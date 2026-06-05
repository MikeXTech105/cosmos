namespace Cosmos.Application.Items.Commands;

public sealed record UpdateCategoryCommand(string Name, string? Description, bool IsActive);
