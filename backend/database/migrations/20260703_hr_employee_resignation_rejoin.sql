/*
    HR Employee resignation/rejoin workflow.
    Project enum mapping: EmployeeStatus.Resigned = 3.
*/

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF OBJECT_ID(N'dbo.HR_Employees', N'U') IS NOT NULL
BEGIN
    IF COL_LENGTH(N'dbo.HR_Employees', N'ResignedDate') IS NULL
        ALTER TABLE dbo.HR_Employees ADD ResignedDate DATETIME2(3) NULL;

    IF COL_LENGTH(N'dbo.HR_Employees', N'LastWorkingDate') IS NULL
        ALTER TABLE dbo.HR_Employees ADD LastWorkingDate DATE NULL;

    IF COL_LENGTH(N'dbo.HR_Employees', N'ResignationReason') IS NULL
        ALTER TABLE dbo.HR_Employees ADD ResignationReason NVARCHAR(500) NULL;

    IF COL_LENGTH(N'dbo.HR_Employees', N'RejoinedDate') IS NULL
        ALTER TABLE dbo.HR_Employees ADD RejoinedDate DATETIME2(3) NULL;

    IF COL_LENGTH(N'dbo.HR_Employees', N'RejoinRemarks') IS NULL
        ALTER TABLE dbo.HR_Employees ADD RejoinRemarks NVARCHAR(500) NULL;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Employee_GetById @Id BIGINT AS
BEGIN SET NOCOUNT ON;
 SELECT e.Id,e.EmployeeCode,e.FirstName,e.LastName,e.Gender,e.DateOfBirth,e.JoiningDate,e.Mobile,e.Email,e.DepartmentId,d.DepartmentName,
  e.DesignationId,g.DesignationName,e.ReportingManagerId,CONCAT(m.FirstName,IIF(m.LastName IS NULL,N'',N' '+m.LastName)) ReportingManagerName,
  e.ShiftId,s.ShiftName,e.EmploymentType,e.Status,e.ProfilePhotoUrl,
  CASE e.Status WHEN 1 THEN N'Active' WHEN 2 THEN N'Inactive' WHEN 3 THEN N'Resigned' WHEN 4 THEN N'Terminated' ELSE N'Unknown' END StatusName,
  e.IsActive,e.IsDeleted,e.ResignedDate,e.LastWorkingDate,e.ResignationReason,e.RejoinedDate,e.RejoinRemarks,e.CreatedOn,e.UpdatedOn
 FROM dbo.HR_Employees e JOIN dbo.HR_Departments d ON d.Id=e.DepartmentId JOIN dbo.HR_Designations g ON g.Id=e.DesignationId JOIN dbo.HR_Shifts s ON s.Id=e.ShiftId
 LEFT JOIN dbo.HR_Employees m ON m.Id=e.ReportingManagerId WHERE e.Id=@Id AND e.IsDeleted=0;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Employee_GetList
 @Search NVARCHAR(200)=NULL,@DepartmentId BIGINT=NULL,@DesignationId BIGINT=NULL,@Status INT=NULL,@IsActive BIT=NULL,
 @IncludeResigned BIT=1,@PageNumber INT=1,@PageSize INT=20,@SortBy NVARCHAR(50)=N'EmployeeCode',@SortDirection NVARCHAR(4)=N'ASC' AS
BEGIN
 SET NOCOUNT ON; SET @PageNumber=IIF(@PageNumber<1,1,@PageNumber); SET @PageSize=IIF(@PageSize<1,20,IIF(@PageSize>200,200,@PageSize));
 SET @SortBy=CASE WHEN @SortBy IN(N'EmployeeCode',N'FirstName',N'JoiningDate',N'Status') THEN @SortBy ELSE N'EmployeeCode' END; SET @SortDirection=IIF(UPPER(@SortDirection)=N'DESC',N'DESC',N'ASC');
 DECLARE @sql NVARCHAR(MAX)=N'SELECT e.Id,e.EmployeeCode,e.FirstName,e.LastName,e.Mobile,e.Email,e.DepartmentId,d.DepartmentName,e.DesignationId,g.DesignationName,
 e.ReportingManagerId,CONCAT(m.FirstName,IIF(m.LastName IS NULL,N'''',N'' ''+m.LastName)) ReportingManagerName,e.EmploymentType,e.Status,
 CASE e.Status WHEN 1 THEN N''Active'' WHEN 2 THEN N''Inactive'' WHEN 3 THEN N''Resigned'' WHEN 4 THEN N''Terminated'' ELSE N''Unknown'' END StatusName,
 e.JoiningDate,e.IsActive,e.IsDeleted,e.ResignedDate,e.LastWorkingDate,e.ResignationReason,e.RejoinedDate,e.RejoinRemarks,COUNT(1) OVER() TotalCount
 FROM dbo.HR_Employees e JOIN dbo.HR_Departments d ON d.Id=e.DepartmentId JOIN dbo.HR_Designations g ON g.Id=e.DesignationId LEFT JOIN dbo.HR_Employees m ON m.Id=e.ReportingManagerId
 WHERE e.IsDeleted=0 AND (@d IS NULL OR e.DepartmentId=@d) AND (@g IS NULL OR e.DesignationId=@g) AND (@st IS NULL OR e.Status=@st) AND (@a IS NULL OR e.IsActive=@a)
 AND (@st IS NOT NULL OR @ir=1 OR e.Status<>3)
 AND (@s IS NULL OR e.EmployeeCode LIKE @s OR e.FirstName LIKE @s OR e.LastName LIKE @s OR e.Mobile LIKE @s OR e.Email LIKE @s)
 ORDER BY e.'+QUOTENAME(@SortBy)+N' '+@SortDirection+N' OFFSET @o ROWS FETCH NEXT @p ROWS ONLY';
 DECLARE @pattern NVARCHAR(210)=IIF(NULLIF(LTRIM(RTRIM(@Search)),N'') IS NULL,NULL,N'%'+LTRIM(RTRIM(@Search))+N'%');
 DECLARE @Offset INT;
 SET @Offset = (@PageNumber - 1) * @PageSize;
 EXEC sp_executesql @sql,N'@d BIGINT,@g BIGINT,@st INT,@a BIT,@ir BIT,@s NVARCHAR(210),@o INT,@p INT',@d=@DepartmentId,@g=@DesignationId,@st=@Status,@a=@IsActive,@ir=@IncludeResigned,@s=@pattern,@o=@Offset,@p=@PageSize;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Employee_Resign
 @Id BIGINT,@LastWorkingDate DATE,@ResignationReason NVARCHAR(500)=NULL,@UserId BIGINT=NULL AS
BEGIN SET NOCOUNT ON;
 BEGIN TRY
  DECLARE @JoiningDate DATE,@Status INT,@IsDeleted BIT;
  SELECT @JoiningDate=JoiningDate,@Status=Status,@IsDeleted=IsDeleted FROM dbo.HR_Employees WHERE Id=@Id;
  IF @JoiningDate IS NULL OR @IsDeleted=1 BEGIN SELECT 404 StatusCode,N'Employee was not found.' Message; RETURN; END
  IF @Status=3 BEGIN SELECT 400 StatusCode,N'Employee is already resigned.' Message; RETURN; END
  IF @LastWorkingDate<@JoiningDate BEGIN SELECT 400 StatusCode,N'Last working date cannot be before joining date.' Message; RETURN; END
  UPDATE dbo.HR_Employees
  SET Status=3,ResignedDate=SYSUTCDATETIME(),LastWorkingDate=@LastWorkingDate,ResignationReason=NULLIF(LTRIM(RTRIM(@ResignationReason)),N''),
      IsDeleted=0,DeletedOn=NULL,DeletedBy=NULL,UpdatedOn=SYSUTCDATETIME(),UpdatedBy=@UserId
  WHERE Id=@Id AND IsDeleted=0;
  SELECT 200 StatusCode,N'Employee resigned.' Message; EXEC dbo.sp_HR_Employee_GetById @Id;
 END TRY BEGIN CATCH SELECT 500 StatusCode,ERROR_MESSAGE() Message; END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Employee_Rejoin
 @Id BIGINT,@RejoinedDate DATE=NULL,@RejoinRemarks NVARCHAR(500)=NULL,@UserId BIGINT=NULL AS
BEGIN SET NOCOUNT ON;
 BEGIN TRY
  DECLARE @Status INT,@IsDeleted BIT,@LastWorkingDate DATE,@EffectiveRejoinedDate DATE=COALESCE(@RejoinedDate,CONVERT(DATE,SYSUTCDATETIME()));
  SELECT @Status=Status,@IsDeleted=IsDeleted,@LastWorkingDate=LastWorkingDate FROM dbo.HR_Employees WHERE Id=@Id;
  IF @Status IS NULL OR @IsDeleted=1 BEGIN SELECT 404 StatusCode,N'Employee was not found.' Message; RETURN; END
  IF @Status<>3 BEGIN SELECT 400 StatusCode,N'Only resigned employees can rejoin.' Message; RETURN; END
  IF @LastWorkingDate IS NOT NULL AND @EffectiveRejoinedDate<@LastWorkingDate BEGIN SELECT 400 StatusCode,N'Rejoined date cannot be before last working date.' Message; RETURN; END
  UPDATE dbo.HR_Employees
  SET Status=1,RejoinedDate=CONVERT(DATETIME2(3),@EffectiveRejoinedDate),RejoinRemarks=NULLIF(LTRIM(RTRIM(@RejoinRemarks)),N''),
      IsDeleted=0,DeletedOn=NULL,DeletedBy=NULL,UpdatedOn=SYSUTCDATETIME(),UpdatedBy=@UserId
  WHERE Id=@Id AND IsDeleted=0;
  SELECT 200 StatusCode,N'Employee rejoined.' Message; EXEC dbo.sp_HR_Employee_GetById @Id;
 END TRY BEGIN CATCH SELECT 500 StatusCode,ERROR_MESSAGE() Message; END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Employee_GetDropdown @Search NVARCHAR(200)=NULL,@IncludeResigned BIT=0 AS
BEGIN SET NOCOUNT ON;
 DECLARE @s NVARCHAR(210)=IIF(NULLIF(LTRIM(RTRIM(@Search)),N'') IS NULL,NULL,N'%'+LTRIM(RTRIM(@Search))+N'%');
 SELECT TOP(100) Id,EmployeeCode,CONCAT(FirstName,IIF(LastName IS NULL,N'',N' '+LastName)) EmployeeName FROM dbo.HR_Employees
 WHERE IsDeleted=0 AND (Status=1 OR (@IncludeResigned=1 AND Status=3)) AND (@s IS NULL OR EmployeeCode LIKE @s OR FirstName LIKE @s OR LastName LIKE @s) ORDER BY FirstName,LastName;
END;
GO

UPDATE dbo.HR_Employees
SET
    IsDeleted = 0,
    DeletedOn = NULL,
    DeletedBy = NULL
WHERE Status = 3
  AND IsDeleted = 1;
GO
