/*
06_MANUAL_REVIEW_REQUIRED.sql
Do not run this file as an automatic migration. It contains review notes only.
*/

/*
Review item 1: Unused stored procedures.
The export and project SQL scripts contain these procedures, but current C# repository code does not call them:
- dbo.sp_HR_Attendance_GetById
- dbo.sp_HR_Leave_GetById

No DROP statements are generated. Keep them if they are reserved for future endpoints or diagnostics.
*/

/*
Review item 2: Manager role permissions.
The generated master-data script does not grant Manager permissions. Define the intended Manager permission matrix before inserting or updating RolePermissions for RoleId/Name = Manager.
*/

/*
Review item 3: SuperAdmin OEE permission bits.
Existing exported OEE RolePermissions are preserved. If business policy requires SuperAdmin to have every permission bit on every page, review existing OEE rows before updating them.
Example review query:

SELECT r.Name AS RoleName, p.Name AS PageName, rp.*
FROM dbo.RolePermissions rp
JOIN dbo.Roles r ON r.Id = rp.RoleId
JOIN dbo.Pages p ON p.Id = rp.PageId
WHERE r.Name = N'SuperAdmin' AND p.Name LIKE N'OEE%'
ORDER BY p.SortOrder;
*/
