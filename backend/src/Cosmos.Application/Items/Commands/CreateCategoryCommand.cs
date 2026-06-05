namespace Cosmos.Application.Items.Commands;

public sealed record CreateCategoryCommand(string Name, string? Description, bool IsActive);
