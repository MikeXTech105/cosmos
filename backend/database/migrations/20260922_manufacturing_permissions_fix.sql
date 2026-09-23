/*
   Repairs Manufacturing navigation and normal SuperAdmin permissions on databases
   where the original Manufacturing migration was applied before these seeds existed.
   Safe to rerun. Does not alter protected System Owner records or unrelated permissions.
*/
SET XACT_ABORT ON;

MERGE dbo.Pages AS target
USING (VALUES (N'Manufacturing', N'Manufacturing', N'/manufacturing', N'factory', 150)) AS source(Name, DisplayName, Route, Icon, SortOrder)
ON target.Name = source.Name
WHEN MATCHED THEN UPDATE SET DisplayName = source.DisplayName, Route = source.Route, Icon = source.Icon, ParentPageId = NULL, SortOrder = source.SortOrder, IsActive = 1
WHEN NOT MATCHED THEN INSERT(Name, DisplayName, Route, Icon, ParentPageId, SortOrder, IsActive) VALUES(source.Name, source.DisplayName, source.Route, source.Icon, NULL, source.SortOrder, 1);
GO

DECLARE @ManufacturingParentPageId INT = (SELECT Id FROM dbo.Pages WHERE Name = N'Manufacturing');
MERGE dbo.Pages AS target
USING (VALUES
    (N'Manufacturing.Boms', N'Manufacturing BOMs', N'/manufacturing/boms', N'list-tree', 151),
    (N'Manufacturing.Productions', N'Manufacturing Productions', N'/manufacturing/productions', N'clipboard-check', 152)
) AS source(Name, DisplayName, Route, Icon, SortOrder)
ON target.Name = source.Name
WHEN MATCHED THEN UPDATE SET DisplayName = source.DisplayName, Route = source.Route, Icon = source.Icon, ParentPageId = @ManufacturingParentPageId, SortOrder = source.SortOrder, IsActive = 1
WHEN NOT MATCHED THEN INSERT(Name, DisplayName, Route, Icon, ParentPageId, SortOrder, IsActive) VALUES(source.Name, source.DisplayName, source.Route, source.Icon, @ManufacturingParentPageId, source.SortOrder, 1);
GO

;WITH RequiredPermissions AS
(
    SELECT N'Manufacturing' AS PageName, CAST(1 AS bit) AS CanView, CAST(0 AS bit) AS CanCreate, CAST(0 AS bit) AS CanEdit, CAST(0 AS bit) AS CanDelete, CAST(0 AS bit) AS CanExport, CAST(0 AS bit) AS CanApprove
    UNION ALL SELECT N'Manufacturing.Boms', 1, 1, 1, 1, 0, 0
    UNION ALL SELECT N'Manufacturing.Productions', 1, 1, 1, 0, 0, 0
)
MERGE dbo.RolePermissions AS target
USING
(
    SELECT r.Id AS RoleId, p.Id AS PageId, required.CanView, required.CanCreate, required.CanEdit, required.CanDelete, required.CanExport, required.CanApprove
    FROM dbo.Roles r
    CROSS JOIN RequiredPermissions required
    JOIN dbo.Pages p ON p.Name = required.PageName
    WHERE r.Name = N'SuperAdmin'
) AS source
ON target.RoleId = source.RoleId AND target.PageId = source.PageId
WHEN MATCHED THEN UPDATE SET CanView = source.CanView, CanCreate = source.CanCreate, CanEdit = source.CanEdit, CanDelete = source.CanDelete, CanExport = source.CanExport, CanApprove = source.CanApprove
WHEN NOT MATCHED THEN INSERT(RoleId, PageId, CanView, CanCreate, CanEdit, CanDelete, CanExport, CanApprove) VALUES(source.RoleId, source.PageId, source.CanView, source.CanCreate, source.CanEdit, source.CanDelete, source.CanExport, source.CanApprove);
GO
