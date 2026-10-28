-- Additive HR maintenance. Apply after the existing HR schema, to a backed-up catalog.
-- Existing leave balances are deliberately NOT rebased by changing a type's annual quota.
-- Existing assignments form a start-date timeline; later dates supersede earlier dates.
SET XACT_ABORT ON;
IF OBJECT_ID(N'dbo.HR_LeaveTypes', N'U') IS NULL
    THROW 51000, 'Apply the existing HR schema before HR operator setup.', 1;
IF COL_LENGTH(N'dbo.HR_LeaveTypes', N'RowVersion') IS NULL ALTER TABLE dbo.HR_LeaveTypes ADD RowVersion ROWVERSION;
IF COL_LENGTH(N'dbo.HR_SalaryComponents', N'RowVersion') IS NULL ALTER TABLE dbo.HR_SalaryComponents ADD RowVersion ROWVERSION;
IF COL_LENGTH(N'dbo.HR_SalaryStructures', N'RowVersion') IS NULL ALTER TABLE dbo.HR_SalaryStructures ADD RowVersion ROWVERSION;
IF COL_LENGTH(N'dbo.HR_LeaveBalances', N'RowVersion') IS NULL ALTER TABLE dbo.HR_LeaveBalances ADD RowVersion ROWVERSION;
IF COL_LENGTH(N'dbo.HR_Attendance', N'RowVersion') IS NULL ALTER TABLE dbo.HR_Attendance ADD RowVersion ROWVERSION;
IF COL_LENGTH(N'dbo.HR_EmployeeSalaryStructures', N'RowVersion') IS NULL ALTER TABLE dbo.HR_EmployeeSalaryStructures ADD RowVersion ROWVERSION;
IF COL_LENGTH(N'dbo.HR_PayrollDetails', N'SalaryAssignmentId') IS NULL ALTER TABLE dbo.HR_PayrollDetails ADD SalaryAssignmentId BIGINT NULL,SalaryStructureId BIGINT NULL,SalaryAssignmentVersion BINARY(8) NULL,MonthlyEarnings DECIMAL(18,2) NULL,FixedDeductions DECIMAL(18,2) NULL;
IF COL_LENGTH(N'dbo.HR_AttendanceAdjustments', N'ProposedAttendanceStatus') IS NULL ALTER TABLE dbo.HR_AttendanceAdjustments ADD ProposedAttendanceStatus INT NULL,ProposedCheckInTime DATETIME2(3) NULL,ProposedCheckOutTime DATETIME2(3) NULL,OriginalAttendanceVersion BINARY(8) NULL,OriginalValues NVARCHAR(MAX) NULL;
GO
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.AuditLogs') AND name=N'IX_AuditLogs_HrEmploymentRecord') CREATE INDEX IX_AuditLogs_HrEmploymentRecord ON dbo.AuditLogs(TableName,RecordId) INCLUDE(ActionType);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.HR_EmployeeSalaryStructures') AND name=N'IX_HR_EmployeeSalaryStructures_Effective') CREATE INDEX IX_HR_EmployeeSalaryStructures_Effective ON dbo.HR_EmployeeSalaryStructures(EmployeeId,EffectiveDate DESC) INCLUDE(SalaryStructureId,IsDeleted);
IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_HR_PayrollDetails_SelectedAssignment') ALTER TABLE dbo.HR_PayrollDetails ADD CONSTRAINT FK_HR_PayrollDetails_SelectedAssignment FOREIGN KEY(SalaryAssignmentId) REFERENCES dbo.HR_EmployeeSalaryStructures(Id);
IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_HR_PayrollDetails_SelectedStructure') ALTER TABLE dbo.HR_PayrollDetails ADD CONSTRAINT FK_HR_PayrollDetails_SelectedStructure FOREIGN KEY(SalaryStructureId) REFERENCES dbo.HR_SalaryStructures(Id);
GO
CREATE OR ALTER PROCEDURE dbo.sp_HR_Payroll_GetRuns @Search NVARCHAR(100)=NULL,@PageNumber INT=1,@PageSize INT=40 AS
BEGIN SET NOCOUNT ON;
 IF @PageNumber<1 OR @PageSize NOT BETWEEN 1 AND 100 THROW 51000,'Invalid payroll page.',1;
 SELECT r.Id,r.PayrollMonth,r.PayrollYear,r.Status,CONVERT(INT,COUNT(d.Id)) EmployeeCount,CONVERT(DECIMAL(18,2),COALESCE(SUM(d.NetSalary),0)) NetSalary,COUNT(*) OVER() TotalCount
 FROM dbo.HR_PayrollRuns r LEFT JOIN dbo.HR_PayrollDetails d ON d.PayrollRunId=r.Id AND d.IsDeleted=0
 WHERE r.IsDeleted=0 AND (NULLIF(@Search,N'') IS NULL OR CONCAT(r.PayrollMonth,N'/',r.PayrollYear) LIKE N'%'+@Search+N'%')
 GROUP BY r.Id,r.PayrollMonth,r.PayrollYear,r.Status ORDER BY r.PayrollYear DESC,r.PayrollMonth DESC,r.Id DESC OFFSET (@PageNumber-1)*@PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;
END;
GO
CREATE OR ALTER PROCEDURE dbo.sp_HR_AttendanceAdjustment_Pending AS
BEGIN SET NOCOUNT ON;
 SELECT q.Id,q.EmployeeId,e.EmployeeCode,CONCAT(e.FirstName,N' ',e.LastName) EmployeeName,q.AttendanceId,a.AttendanceDate,a.CheckInTime,a.CheckOutTime,a.AttendanceStatus,q.Reason,q.Status,q.ProposedAttendanceStatus,q.ProposedCheckInTime,q.ProposedCheckOutTime
 FROM dbo.HR_AttendanceAdjustments q JOIN dbo.HR_Employees e ON e.Id=q.EmployeeId JOIN dbo.HR_Attendance a ON a.Id=q.AttendanceId
 WHERE q.IsDeleted=0 AND q.Status=1 AND a.IsDeleted=0 ORDER BY q.CreatedOn,q.Id;
END;
GO
CREATE OR ALTER PROCEDURE dbo.sp_HR_LeaveEntitlement_GetList @EmployeeId BIGINT AS
BEGIN SET NOCOUNT ON; SELECT Id,EmployeeId,LeaveTypeId,OpeningBalance,UsedBalance,RemainingBalance,RowVersion FROM dbo.HR_LeaveBalances WHERE EmployeeId=@EmployeeId AND IsDeleted=0 ORDER BY LeaveTypeId; END;
GO
CREATE OR ALTER PROCEDURE dbo.sp_HR_LeaveEntitlement_Save @EmployeeId BIGINT,@LeaveTypeId BIGINT,@OpeningBalance DECIMAL(8,2),@RowVersion BINARY(8)=NULL,@UserId BIGINT=NULL AS
BEGIN SET NOCOUNT ON; SET XACT_ABORT ON;
 BEGIN TRY
  IF @OpeningBalance<0 BEGIN SELECT 400 StatusCode,N'Entitlement cannot be negative.' Message; RETURN; END;
  BEGIN TRAN;
  IF NOT EXISTS(SELECT 1 FROM dbo.HR_Employees WITH(UPDLOCK,HOLDLOCK) WHERE Id=@EmployeeId AND IsDeleted=0) OR NOT EXISTS(SELECT 1 FROM dbo.HR_LeaveTypes WITH(UPDLOCK,HOLDLOCK) WHERE Id=@LeaveTypeId AND IsDeleted=0)
   BEGIN ROLLBACK; SELECT 400 StatusCode,N'Employee or leave type is unavailable.' Message; RETURN; END;
  DECLARE @Id BIGINT,@used DECIMAL(8,2);
  SELECT @Id=Id,@used=UsedBalance FROM dbo.HR_LeaveBalances WITH(UPDLOCK,HOLDLOCK) WHERE EmployeeId=@EmployeeId AND LeaveTypeId=@LeaveTypeId AND IsDeleted=0;
  IF @Id IS NULL BEGIN
   IF @RowVersion IS NOT NULL BEGIN ROLLBACK; SELECT 409 StatusCode,N'The balance no longer exists. Reload before saving.' Message; RETURN; END;
   INSERT dbo.HR_LeaveBalances(EmployeeId,LeaveTypeId,OpeningBalance,UsedBalance,RemainingBalance,CreatedBy) VALUES(@EmployeeId,@LeaveTypeId,@OpeningBalance,0,@OpeningBalance,@UserId); SET @Id=SCOPE_IDENTITY();
  END
  ELSE BEGIN
   IF @OpeningBalance<@used BEGIN ROLLBACK; SELECT 409 StatusCode,N'Entitlement cannot be below leave already used.' Message; RETURN; END;
   UPDATE dbo.HR_LeaveBalances SET OpeningBalance=@OpeningBalance,RemainingBalance=@OpeningBalance-UsedBalance,UpdatedOn=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE Id=@Id AND RowVersion=@RowVersion;
   IF @@ROWCOUNT=0 BEGIN ROLLBACK; SELECT 409 StatusCode,N'The balance changed. Reload before saving.' Message; RETURN; END;
  END;
  COMMIT; SELECT 200 StatusCode,N'Employee entitlement saved; used leave was retained.' Message;
  SELECT Id,EmployeeId,LeaveTypeId,OpeningBalance,UsedBalance,RemainingBalance,RowVersion FROM dbo.HR_LeaveBalances WHERE Id=@Id;
 END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; THROW; END CATCH;
END;
GO
CREATE OR ALTER PROCEDURE dbo.sp_HR_AttendanceAdjustment_Create
 @EmployeeId BIGINT,@AttendanceId BIGINT,@Reason NVARCHAR(500),@UserId BIGINT=NULL,
 @ProposedAttendanceStatus INT=NULL,@ProposedCheckInTime DATETIME2(3)=NULL,@ProposedCheckOutTime DATETIME2(3)=NULL,
 @ExpectedAttendanceStatus INT=NULL,@ExpectedCheckInTime DATETIME2(3)=NULL,@ExpectedCheckOutTime DATETIME2(3)=NULL AS
BEGIN SET NOCOUNT ON; SET XACT_ABORT ON;
 BEGIN TRY
  IF NULLIF(LTRIM(RTRIM(@Reason)),N'') IS NULL OR (@ProposedAttendanceStatus IS NOT NULL AND @ProposedAttendanceStatus NOT BETWEEN 1 AND 7)
   BEGIN SELECT 400 StatusCode,N'A reason and a valid proposed attendance status are required.' Message; RETURN; END;
  IF @ProposedCheckInTime IS NOT NULL AND @ProposedCheckOutTime IS NOT NULL AND @ProposedCheckOutTime<=@ProposedCheckInTime
   BEGIN SELECT 400 StatusCode,N'Proposed check-out must be after check-in.' Message; RETURN; END;
  BEGIN TRAN;
  DECLARE @version BINARY(8),@date DATE,@currentStatus INT,@currentIn DATETIME2(3),@currentOut DATETIME2(3),@original NVARCHAR(MAX);
  SELECT @version=RowVersion,@date=AttendanceDate,@currentStatus=AttendanceStatus,@currentIn=CheckInTime,@currentOut=CheckOutTime FROM dbo.HR_Attendance WITH(UPDLOCK,HOLDLOCK) WHERE Id=@AttendanceId AND EmployeeId=@EmployeeId AND IsDeleted=0;
  IF @version IS NULL BEGIN ROLLBACK; SELECT 404 StatusCode,N'Attendance was not found for this employee.' Message; RETURN; END;
  IF @ProposedAttendanceStatus IS NOT NULL AND (@ExpectedAttendanceStatus IS NULL OR @currentStatus<>@ExpectedAttendanceStatus OR ISNULL(@currentIn,'00010101')<>ISNULL(@ExpectedCheckInTime,'00010101') OR ISNULL(@currentOut,'00010101')<>ISNULL(@ExpectedCheckOutTime,'00010101'))
   BEGIN ROLLBACK; SELECT 409 StatusCode,N'Attendance changed since it was reviewed. Reload before requesting correction.' Message; RETURN; END;
  IF EXISTS(SELECT 1 FROM dbo.HR_PayrollRuns WITH(UPDLOCK,HOLDLOCK) WHERE PayrollMonth=MONTH(@date) AND PayrollYear=YEAR(@date) AND Status IN(2,3) AND IsDeleted=0)
   BEGIN ROLLBACK; SELECT 409 StatusCode,N'Payroll is already processed for this attendance period. Use the payroll correction process.' Message; RETURN; END;
  IF EXISTS(SELECT 1 FROM dbo.HR_AttendanceAdjustments WITH(UPDLOCK,HOLDLOCK) WHERE AttendanceId=@AttendanceId AND Status=1 AND IsDeleted=0)
   BEGIN ROLLBACK; SELECT 409 StatusCode,N'A pending correction already exists for this day.' Message; RETURN; END;
  SELECT @original=(SELECT AttendanceStatus,CheckInTime,CheckOutTime,WorkingMinutes,OvertimeMinutes FROM dbo.HR_Attendance WHERE Id=@AttendanceId FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
  INSERT dbo.HR_AttendanceAdjustments(EmployeeId,AttendanceId,Reason,Status,CreatedBy,ProposedAttendanceStatus,ProposedCheckInTime,ProposedCheckOutTime,OriginalAttendanceVersion,OriginalValues)
  VALUES(@EmployeeId,@AttendanceId,LTRIM(RTRIM(@Reason)),1,@UserId,@ProposedAttendanceStatus,@ProposedCheckInTime,@ProposedCheckOutTime,@version,@original);
  DECLARE @Id BIGINT=SCOPE_IDENTITY();
  COMMIT; SELECT 201 StatusCode,N'Attendance correction requested.' Message;
  SELECT Id,EmployeeId,AttendanceId,Reason,Status,ApprovedBy,ApprovedOn,CreatedOn FROM dbo.HR_AttendanceAdjustments WHERE Id=@Id;
 END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; THROW; END CATCH;
END;
GO
CREATE OR ALTER PROCEDURE dbo.sp_HR_AttendanceAdjustment_Decide @AdjustmentId BIGINT,@Approve BIT,@Remarks NVARCHAR(500)=NULL,@UserId BIGINT=NULL AS
BEGIN SET NOCOUNT ON; SET XACT_ABORT ON;
 BEGIN TRY
  BEGIN TRAN;
  DECLARE @attendance BIGINT,@version BINARY(8),@status INT,@in DATETIME2(3),@out DATETIME2(3),@date DATE,@original NVARCHAR(MAX),@after NVARCHAR(MAX);
  SELECT @attendance=AttendanceId,@version=OriginalAttendanceVersion,@status=ProposedAttendanceStatus,@in=ProposedCheckInTime,@out=ProposedCheckOutTime,@original=OriginalValues FROM dbo.HR_AttendanceAdjustments WITH(UPDLOCK,HOLDLOCK) WHERE Id=@AdjustmentId AND Status=1 AND IsDeleted=0;
  IF @attendance IS NULL BEGIN ROLLBACK; SELECT 409 StatusCode,N'This correction is no longer pending. Reload the inbox.' Message; RETURN; END;
  IF @Approve=1 AND @status IS NOT NULL
  BEGIN
   SELECT @date=AttendanceDate FROM dbo.HR_Attendance WITH(UPDLOCK,HOLDLOCK) WHERE Id=@attendance AND IsDeleted=0 AND RowVersion=@version;
   IF @date IS NULL BEGIN ROLLBACK; SELECT 409 StatusCode,N'Attendance changed after this request. Reject it and review a new correction.' Message; RETURN; END;
   IF EXISTS(SELECT 1 FROM dbo.HR_PayrollRuns WITH(UPDLOCK,HOLDLOCK) WHERE PayrollMonth=MONTH(@date) AND PayrollYear=YEAR(@date) AND Status IN(2,3) AND IsDeleted=0)
    BEGIN ROLLBACK; SELECT 409 StatusCode,N'Payroll was processed after this request. Use the payroll correction process.' Message; RETURN; END;
   DECLARE @minutes INT=CASE WHEN @in IS NULL OR @out IS NULL THEN 0 ELSE DATEDIFF(MINUTE,@in,@out) END;
   UPDATE dbo.HR_Attendance SET AttendanceStatus=@status,CheckInTime=@in,CheckOutTime=@out,WorkingMinutes=@minutes,OvertimeMinutes=IIF(@minutes>480,@minutes-480,0),UpdatedOn=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE Id=@attendance AND RowVersion=@version;
   SELECT @after=(SELECT AttendanceStatus,CheckInTime,CheckOutTime,WorkingMinutes,OvertimeMinutes FROM dbo.HR_Attendance WHERE Id=@attendance FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
   INSERT dbo.AuditLogs(TableName,RecordId,ActionType,OldValues,NewValues,CreatedBy) VALUES(N'HR.Attendance',CONVERT(NVARCHAR(100),@attendance),N'ApprovedCorrection',@original,@after,@UserId);
  END;
  UPDATE dbo.HR_AttendanceAdjustments SET Status=IIF(@Approve=1,2,3),Remarks=@Remarks,ApprovedBy=@UserId,ApprovedOn=SYSUTCDATETIME(),UpdatedOn=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE Id=@AdjustmentId AND Status=1 AND IsDeleted=0;
  COMMIT; SELECT 200 StatusCode,N'Attendance correction decision saved.' Message;
  SELECT Id,EmployeeId,AttendanceId,Reason,Status,ApprovedBy,ApprovedOn,CreatedOn FROM dbo.HR_AttendanceAdjustments WHERE Id=@AdjustmentId;
 END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; THROW; END CATCH;
END;
GO
CREATE OR ALTER PROCEDURE dbo.sp_HR_LeaveType_GetList AS
BEGIN SET NOCOUNT ON; SELECT Id,LeaveCode,LeaveName,AnnualQuota,IsPaidLeave,IsActive,RowVersion FROM dbo.HR_LeaveTypes WHERE IsDeleted=0 ORDER BY LeaveName,Id; END;
GO
CREATE OR ALTER PROCEDURE dbo.sp_HR_LeaveType_Save
 @Id BIGINT=NULL,@LeaveCode NVARCHAR(20),@LeaveName NVARCHAR(100),@AnnualQuota DECIMAL(8,2),@IsPaidLeave BIT,@IsActive BIT,@RowVersion BINARY(8)=NULL,@UserId BIGINT=NULL AS
BEGIN SET NOCOUNT ON; SET XACT_ABORT ON;
 BEGIN TRY
  IF NULLIF(LTRIM(RTRIM(@LeaveCode)),N'') IS NULL OR NULLIF(LTRIM(RTRIM(@LeaveName)),N'') IS NULL OR @AnnualQuota<0
   BEGIN SELECT 400 StatusCode,N'Leave code, name and a nonnegative quota are required.' Message; RETURN; END;
  BEGIN TRAN;
  IF EXISTS(SELECT 1 FROM dbo.HR_LeaveTypes WITH(UPDLOCK,HOLDLOCK) WHERE IsDeleted=0 AND LeaveCode=LTRIM(RTRIM(@LeaveCode)) AND (@Id IS NULL OR Id<>@Id))
   BEGIN ROLLBACK; SELECT 409 StatusCode,N'Leave code is already used.' Message; RETURN; END;
  IF @Id IS NULL
  BEGIN
   INSERT dbo.HR_LeaveTypes(LeaveCode,LeaveName,AnnualQuota,IsPaidLeave,IsActive,CreatedBy) VALUES(LTRIM(RTRIM(@LeaveCode)),LTRIM(RTRIM(@LeaveName)),@AnnualQuota,@IsPaidLeave,@IsActive,@UserId);
   SET @Id=SCOPE_IDENTITY();
  END
  ELSE BEGIN
   -- Paid/unpaid history must retain its meaning. Make a new type for a policy change.
   IF EXISTS(SELECT 1 FROM dbo.HR_LeaveTypes t WHERE t.Id=@Id AND t.IsPaidLeave<>@IsPaidLeave AND EXISTS(SELECT 1 FROM dbo.HR_LeaveApplications a WHERE a.LeaveTypeId=t.Id AND a.IsDeleted=0))
    BEGIN ROLLBACK; SELECT 409 StatusCode,N'This leave type has applications. Create a new type to change paid/unpaid policy.' Message; RETURN; END;
   UPDATE dbo.HR_LeaveTypes SET LeaveCode=LTRIM(RTRIM(@LeaveCode)),LeaveName=LTRIM(RTRIM(@LeaveName)),AnnualQuota=@AnnualQuota,IsPaidLeave=@IsPaidLeave,IsActive=@IsActive,UpdatedOn=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE Id=@Id AND IsDeleted=0 AND RowVersion=@RowVersion;
   IF @@ROWCOUNT=0 BEGIN ROLLBACK; SELECT 409 StatusCode,N'This leave type changed or no longer exists. Reload before saving.' Message; RETURN; END;
  END;
  COMMIT; SELECT 200 StatusCode,N'Leave type saved. Existing balances are unchanged.' Message;
  SELECT Id,LeaveCode,LeaveName,AnnualQuota,IsPaidLeave,IsActive,RowVersion FROM dbo.HR_LeaveTypes WHERE Id=@Id;
 END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; THROW; END CATCH;
END;
GO
CREATE OR ALTER PROCEDURE dbo.sp_HR_SalaryComponent_GetList AS
BEGIN SET NOCOUNT ON; SELECT Id,ComponentName,ComponentType,RowVersion FROM dbo.HR_SalaryComponents WHERE IsDeleted=0 ORDER BY ComponentName,Id; END;
GO
CREATE OR ALTER PROCEDURE dbo.sp_HR_SalaryComponent_Save
 @Id BIGINT=NULL,@ComponentName NVARCHAR(150),@ComponentType INT,@RowVersion BINARY(8)=NULL,@UserId BIGINT=NULL AS
BEGIN SET NOCOUNT ON; SET XACT_ABORT ON;
 BEGIN TRY
  IF NULLIF(LTRIM(RTRIM(@ComponentName)),N'') IS NULL OR @ComponentType NOT IN(1,2) BEGIN SELECT 400 StatusCode,N'Name and earnings/deduction type are required.' Message; RETURN; END;
  BEGIN TRAN;
  IF EXISTS(SELECT 1 FROM dbo.HR_SalaryComponents WITH(UPDLOCK,HOLDLOCK) WHERE ComponentName=LTRIM(RTRIM(@ComponentName)) AND IsDeleted=0 AND (@Id IS NULL OR Id<>@Id))
   BEGIN ROLLBACK; SELECT 409 StatusCode,N'Component name is already used.' Message; RETURN; END;
  IF @Id IS NULL BEGIN INSERT dbo.HR_SalaryComponents(ComponentName,ComponentType,CreatedBy) VALUES(LTRIM(RTRIM(@ComponentName)),@ComponentType,@UserId); SET @Id=SCOPE_IDENTITY(); END
  ELSE BEGIN
   IF EXISTS(SELECT 1 FROM dbo.HR_SalaryComponents c WHERE c.Id=@Id AND c.ComponentType<>@ComponentType AND EXISTS(SELECT 1 FROM dbo.HR_SalaryStructureComponents sc WHERE sc.SalaryComponentId=c.Id AND sc.IsDeleted=0))
    BEGIN ROLLBACK; SELECT 409 StatusCode,N'An in-use component cannot change earnings/deduction type. Create a new component.' Message; RETURN; END;
   UPDATE dbo.HR_SalaryComponents SET ComponentName=LTRIM(RTRIM(@ComponentName)),ComponentType=@ComponentType,UpdatedOn=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE Id=@Id AND IsDeleted=0 AND RowVersion=@RowVersion;
   IF @@ROWCOUNT=0 BEGIN ROLLBACK; SELECT 409 StatusCode,N'This component changed or no longer exists. Reload before saving.' Message; RETURN; END;
  END;
  COMMIT; SELECT 200 StatusCode,N'Salary component saved.' Message;
  SELECT Id,ComponentName,ComponentType,RowVersion FROM dbo.HR_SalaryComponents WHERE Id=@Id;
 END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; THROW; END CATCH;
END;
GO
CREATE OR ALTER PROCEDURE dbo.sp_HR_SalaryStructure_GetList AS
BEGIN SET NOCOUNT ON; SELECT Id,Name,RowVersion FROM dbo.HR_SalaryStructures WHERE IsDeleted=0 ORDER BY Name,Id; END;
GO
CREATE OR ALTER PROCEDURE dbo.sp_HR_SalaryStructure_GetAmounts AS
BEGIN SET NOCOUNT ON; SELECT sc.SalaryStructureId,sc.SalaryComponentId,c.ComponentName,c.ComponentType,sc.Amount FROM dbo.HR_SalaryStructureComponents sc JOIN dbo.HR_SalaryComponents c ON c.Id=sc.SalaryComponentId AND c.IsDeleted=0 WHERE sc.IsDeleted=0 ORDER BY sc.SalaryStructureId,c.ComponentType,c.ComponentName; END;
GO
CREATE OR ALTER PROCEDURE dbo.sp_HR_SalaryStructure_Save
 @Id BIGINT=NULL,@Name NVARCHAR(150),@ComponentsJson NVARCHAR(MAX),@RowVersion BINARY(8)=NULL,@UserId BIGINT=NULL AS
BEGIN SET NOCOUNT ON; SET XACT_ABORT ON;
 BEGIN TRY
  IF NULLIF(LTRIM(RTRIM(@Name)),N'') IS NULL OR ISJSON(@ComponentsJson)<>1 BEGIN SELECT 400 StatusCode,N'Name and component amounts are required.' Message; RETURN; END;
  DECLARE @parts TABLE(SalaryComponentId BIGINT,Amount DECIMAL(18,2));
  INSERT @parts SELECT salaryComponentId,amount FROM OPENJSON(@ComponentsJson) WITH(salaryComponentId BIGINT,amount DECIMAL(18,2));
  IF NOT EXISTS(SELECT 1 FROM @parts) OR EXISTS(SELECT 1 FROM @parts WHERE SalaryComponentId IS NULL OR Amount IS NULL OR Amount<0) OR EXISTS(SELECT SalaryComponentId FROM @parts GROUP BY SalaryComponentId HAVING COUNT(*)>1)
   BEGIN SELECT 400 StatusCode,N'Use unique components with nonnegative two-decimal amounts.' Message; RETURN; END;
  BEGIN TRAN;
  IF EXISTS(SELECT 1 FROM @parts p LEFT JOIN dbo.HR_SalaryComponents c WITH(UPDLOCK,HOLDLOCK) ON c.Id=p.SalaryComponentId AND c.IsDeleted=0 WHERE c.Id IS NULL)
   BEGIN ROLLBACK; SELECT 400 StatusCode,N'A component is unavailable. Reload setup.' Message; RETURN; END;
  IF NOT EXISTS(SELECT 1 FROM @parts p JOIN dbo.HR_SalaryComponents c ON c.Id=p.SalaryComponentId WHERE c.ComponentType=1 AND p.Amount>0)
   BEGIN ROLLBACK; SELECT 400 StatusCode,N'At least one positive earnings component is required.' Message; RETURN; END;
  IF EXISTS(SELECT 1 FROM dbo.HR_SalaryStructures WITH(UPDLOCK,HOLDLOCK) WHERE Name=LTRIM(RTRIM(@Name)) AND IsDeleted=0 AND (@Id IS NULL OR Id<>@Id))
   BEGIN ROLLBACK; SELECT 409 StatusCode,N'Structure name is already used.' Message; RETURN; END;
  IF @Id IS NULL BEGIN INSERT dbo.HR_SalaryStructures(Name,CreatedBy) VALUES(LTRIM(RTRIM(@Name)),@UserId); SET @Id=SCOPE_IDENTITY(); END
  ELSE BEGIN
   IF EXISTS(SELECT 1 FROM dbo.HR_EmployeeSalaryStructures WITH(UPDLOCK,HOLDLOCK) WHERE SalaryStructureId=@Id AND IsDeleted=0)
    BEGIN ROLLBACK; SELECT 409 StatusCode,N'This structure is assigned to employees. Create a new structure and effective assignment to preserve history.' Message; RETURN; END;
   UPDATE dbo.HR_SalaryStructures SET Name=LTRIM(RTRIM(@Name)),UpdatedOn=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE Id=@Id AND IsDeleted=0 AND RowVersion=@RowVersion;
   IF @@ROWCOUNT=0 BEGIN ROLLBACK; SELECT 409 StatusCode,N'This structure changed or no longer exists. Reload before saving.' Message; RETURN; END;
   UPDATE dbo.HR_SalaryStructureComponents SET IsDeleted=1,DeletedOn=SYSUTCDATETIME(),DeletedBy=@UserId WHERE SalaryStructureId=@Id AND IsDeleted=0;
  END;
  INSERT dbo.HR_SalaryStructureComponents(SalaryStructureId,SalaryComponentId,Amount,CreatedBy) SELECT @Id,SalaryComponentId,Amount,@UserId FROM @parts;
  COMMIT; SELECT 200 StatusCode,N'Salary structure saved.' Message;
  SELECT Id,Name,RowVersion FROM dbo.HR_SalaryStructures WHERE Id=@Id;
 END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; THROW; END CATCH;
END;
GO
CREATE OR ALTER PROCEDURE dbo.sp_HR_SalaryAssignment_GetList @EmployeeId BIGINT=NULL AS
BEGIN SET NOCOUNT ON; SELECT a.Id,a.EmployeeId,CONCAT(e.FirstName,N' ',e.LastName) EmployeeName,a.SalaryStructureId,s.Name StructureName,a.EffectiveDate,a.RowVersion FROM dbo.HR_EmployeeSalaryStructures a JOIN dbo.HR_Employees e ON e.Id=a.EmployeeId JOIN dbo.HR_SalaryStructures s ON s.Id=a.SalaryStructureId WHERE a.IsDeleted=0 AND (@EmployeeId IS NULL OR a.EmployeeId=@EmployeeId) ORDER BY a.EmployeeId,a.EffectiveDate DESC,a.Id DESC; END;
GO
CREATE OR ALTER PROCEDURE dbo.sp_HR_SalaryAssignment_Create @EmployeeId BIGINT,@SalaryStructureId BIGINT,@EffectiveDate DATE,@UserId BIGINT=NULL AS
BEGIN SET NOCOUNT ON; SET XACT_ABORT ON;
 BEGIN TRY
  BEGIN TRAN;
  IF NOT EXISTS(SELECT 1 FROM dbo.HR_Employees WITH(UPDLOCK,HOLDLOCK) WHERE Id=@EmployeeId AND IsDeleted=0 AND JoiningDate<=@EffectiveDate)
   BEGIN ROLLBACK; SELECT 400 StatusCode,N'Employee is unavailable or the assignment predates joining.' Message; RETURN; END;
  IF EXISTS(SELECT 1 FROM dbo.HR_EmployeeSalaryStructures WITH(UPDLOCK,HOLDLOCK) WHERE EmployeeId=@EmployeeId AND EffectiveDate=@EffectiveDate AND IsDeleted=0)
   BEGIN ROLLBACK; SELECT 409 StatusCode,N'An assignment already starts on this date.' Message; RETURN; END;
  IF EXISTS(SELECT 1 FROM dbo.HR_PayrollRuns r WITH(UPDLOCK,HOLDLOCK) JOIN dbo.HR_PayrollDetails d ON d.PayrollRunId=r.Id AND d.EmployeeId=@EmployeeId AND d.IsDeleted=0 WHERE r.IsDeleted=0 AND EOMONTH(DATEFROMPARTS(r.PayrollYear,r.PayrollMonth,1))>=@EffectiveDate)
   BEGIN ROLLBACK; SELECT 409 StatusCode,N'This date would change a processed payroll period. Use a later effective date.' Message; RETURN; END;
  IF NOT EXISTS(SELECT 1 FROM dbo.HR_SalaryStructures s WITH(UPDLOCK,HOLDLOCK) WHERE s.Id=@SalaryStructureId AND s.IsDeleted=0 AND EXISTS(SELECT 1 FROM dbo.HR_SalaryStructureComponents sc WHERE sc.SalaryStructureId=s.Id AND sc.IsDeleted=0))
   BEGIN ROLLBACK; SELECT 400 StatusCode,N'Select a saved salary structure with component amounts.' Message; RETURN; END;
  INSERT dbo.HR_EmployeeSalaryStructures(EmployeeId,SalaryStructureId,EffectiveDate,CreatedBy) VALUES(@EmployeeId,@SalaryStructureId,@EffectiveDate,@UserId);
  DECLARE @Id BIGINT=SCOPE_IDENTITY();
  COMMIT; SELECT 201 StatusCode,N'Salary assignment saved.' Message;
  SELECT a.Id,a.EmployeeId,CONCAT(e.FirstName,N' ',e.LastName) EmployeeName,a.SalaryStructureId,s.Name StructureName,a.EffectiveDate,a.RowVersion FROM dbo.HR_EmployeeSalaryStructures a JOIN dbo.HR_Employees e ON e.Id=a.EmployeeId JOIN dbo.HR_SalaryStructures s ON s.Id=a.SalaryStructureId WHERE a.Id=@Id;
 END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; THROW; END CATCH;
END;
GO
CREATE OR ALTER VIEW dbo.v_HR_PayrollEmploymentSnapshots AS
 SELECT DISTINCT TRY_CONVERT(BIGINT,a.RecordId) EmployeeId,TRY_CONVERT(DATE,JSON_VALUE(j.Document,'$.joiningDate')) JoiningDate,
  TRY_CONVERT(DATE,JSON_VALUE(j.Document,'$.rejoinedDate')) RejoinedDate,TRY_CONVERT(DATE,JSON_VALUE(j.Document,'$.lastWorkingDate')) LastWorkingDate,
  TRY_CONVERT(INT,JSON_VALUE(j.Document,'$.status')) Status
 FROM dbo.AuditLogs a CROSS APPLY(VALUES(a.OldValues),(a.NewValues)) v(Snapshot)
 CROSS APPLY(SELECT CASE WHEN ISJSON(v.Snapshot)=1 THEN v.Snapshot ELSE N'{}' END Document) j
 WHERE a.TableName=N'HR.Employees' AND TRY_CONVERT(BIGINT,a.RecordId) IS NOT NULL;
GO
CREATE OR ALTER VIEW dbo.v_HR_PayrollRejoins AS
 SELECT Id EmployeeId,CONVERT(DATE,RejoinedDate) RejoinedDate FROM dbo.HR_Employees WHERE RejoinedDate IS NOT NULL
 UNION SELECT EmployeeId,RejoinedDate FROM dbo.v_HR_PayrollEmploymentSnapshots WHERE RejoinedDate IS NOT NULL;
GO
CREATE OR ALTER VIEW dbo.v_HR_PayrollRejoinMarkers AS
 SELECT TRY_CONVERT(BIGINT,a.RecordId) EmployeeId,TRY_CONVERT(DATE,JSON_VALUE(CASE WHEN ISJSON(a.NewValues)=1 THEN a.NewValues ELSE N'{}' END,'$.rejoinedDate')) RejoinedDate
 FROM dbo.AuditLogs a WHERE a.TableName=N'HR.Employees' AND LOWER(a.ActionType) IN(N'rejoin',N'rejoined') AND TRY_CONVERT(BIGINT,a.RecordId) IS NOT NULL;
GO
CREATE OR ALTER VIEW dbo.v_HR_PayrollEmploymentPeriods AS
 SELECT e.Id EmployeeId,CONVERT(DATE,COALESCE(e.RejoinedDate,CONVERT(DATETIME2,e.JoiningDate))) FromDate,CASE WHEN e.Status=3 THEN e.LastWorkingDate ELSE NULL END ThroughDate
 FROM dbo.HR_Employees e WHERE e.IsDeleted=0 AND e.Status IN(1,3)
 UNION
 SELECT e.Id,COALESCE(prior.RejoinedDate,e.JoiningDate),e.LastWorkingDate FROM dbo.HR_Employees e
 OUTER APPLY(SELECT MAX(r.RejoinedDate) RejoinedDate FROM dbo.v_HR_PayrollRejoins r WHERE r.EmployeeId=e.Id AND r.RejoinedDate<CONVERT(DATE,e.RejoinedDate)) prior
 WHERE e.IsDeleted=0 AND e.Status=1 AND e.LastWorkingDate<=CONVERT(DATE,e.RejoinedDate) AND COALESCE(prior.RejoinedDate,e.JoiningDate)<=e.LastWorkingDate
  AND NOT EXISTS(SELECT 1 FROM dbo.v_HR_PayrollRejoinMarkers marker WHERE marker.EmployeeId=e.Id AND marker.RejoinedDate IS NULL)
 UNION
 SELECT snapshot.EmployeeId,COALESCE(prior.RejoinedDate,snapshot.JoiningDate),snapshot.LastWorkingDate
 FROM dbo.v_HR_PayrollEmploymentSnapshots snapshot
 OUTER APPLY(SELECT MAX(r.RejoinedDate) RejoinedDate FROM dbo.v_HR_PayrollRejoins r WHERE r.EmployeeId=snapshot.EmployeeId AND r.RejoinedDate<snapshot.RejoinedDate) prior
 WHERE snapshot.Status=1 AND snapshot.LastWorkingDate<=snapshot.RejoinedDate AND COALESCE(prior.RejoinedDate,snapshot.JoiningDate)<=snapshot.LastWorkingDate
  AND NOT EXISTS(SELECT 1 FROM dbo.v_HR_PayrollRejoinMarkers marker WHERE marker.EmployeeId=snapshot.EmployeeId AND marker.RejoinedDate IS NULL)
 UNION
 SELECT EmployeeId,COALESCE(RejoinedDate,JoiningDate),LastWorkingDate FROM dbo.v_HR_PayrollEmploymentSnapshots
 WHERE Status=3 AND LastWorkingDate IS NOT NULL AND COALESCE(RejoinedDate,JoiningDate)<=LastWorkingDate;
GO
-- Reconstruct only explicit employment intervals. No unknown gap is filled with paid days.
CREATE OR ALTER FUNCTION dbo.fn_HR_PayrollEmploymentDates(@Start DATE,@End DATE)
RETURNS TABLE AS RETURN
(
 WITH Days AS
 (
  SELECT DATEADD(DAY,n.DayNumber,@Start) WorkDate FROM (VALUES(0),(1),(2),(3),(4),(5),(6),(7),(8),(9),(10),(11),(12),(13),(14),(15),(16),(17),(18),(19),(20),(21),(22),(23),(24),(25),(26),(27),(28),(29),(30)) n(DayNumber) WHERE DATEADD(DAY,n.DayNumber,@Start)<=@End
 )
 SELECT DISTINCT p.EmployeeId,d.WorkDate FROM dbo.v_HR_PayrollEmploymentPeriods p CROSS JOIN Days d
 WHERE p.FromDate<=d.WorkDate AND (p.ThroughDate IS NULL OR p.ThroughDate>=d.WorkDate)
);
GO
CREATE OR ALTER FUNCTION dbo.fn_HR_PayrollApplicableRates(@Start DATE,@End DATE)
RETURNS TABLE AS RETURN
(
 WITH Applicable AS
 (
  SELECT DISTINCT days.EmployeeId,effective.Id SalaryAssignmentId FROM dbo.fn_HR_PayrollEmploymentDates(@Start,@End) days
  CROSS APPLY(SELECT TOP(1) assignment.Id FROM dbo.HR_EmployeeSalaryStructures assignment JOIN dbo.HR_SalaryStructures structure ON structure.Id=assignment.SalaryStructureId AND structure.IsDeleted=0 WHERE assignment.EmployeeId=days.EmployeeId AND assignment.IsDeleted=0 AND assignment.EffectiveDate<=days.WorkDate ORDER BY assignment.EffectiveDate DESC,assignment.Id DESC) effective
 )
 SELECT relevant.EmployeeId,assignment.Id SalaryAssignmentId,assignment.SalaryStructureId,structure.Name StructureName,assignment.EffectiveDate,assignment.RowVersion,
  CONVERT(DECIMAL(18,2),COALESCE(amounts.MonthlyEarnings,0)) MonthlyEarnings,CONVERT(DECIMAL(18,2),COALESCE(amounts.FixedDeductions,0)) FixedDeductions
 FROM Applicable relevant JOIN dbo.HR_EmployeeSalaryStructures assignment ON assignment.Id=relevant.SalaryAssignmentId JOIN dbo.HR_SalaryStructures structure ON structure.Id=assignment.SalaryStructureId AND structure.IsDeleted=0
 OUTER APPLY(SELECT SUM(CASE WHEN component.ComponentType=1 THEN amount.Amount ELSE 0 END) MonthlyEarnings,SUM(CASE WHEN component.ComponentType=2 THEN amount.Amount ELSE 0 END) FixedDeductions FROM dbo.HR_SalaryStructureComponents amount JOIN dbo.HR_SalaryComponents component ON component.Id=amount.SalaryComponentId AND component.IsDeleted=0 WHERE amount.SalaryStructureId=assignment.SalaryStructureId AND amount.IsDeleted=0) amounts
);
GO
CREATE OR ALTER PROCEDURE dbo.sp_HR_Payroll_RateOptions @PayrollMonth INT,@PayrollYear INT AS
BEGIN SET NOCOUNT ON;
 IF @PayrollMonth NOT BETWEEN 1 AND 12 OR @PayrollYear NOT BETWEEN 2000 AND 9999 THROW 51000,'Select a valid payroll period.',1;
 SELECT EmployeeId,SalaryAssignmentId,SalaryStructureId,StructureName,EffectiveDate,RowVersion,MonthlyEarnings,FixedDeductions FROM dbo.fn_HR_PayrollApplicableRates(DATEFROMPARTS(@PayrollYear,@PayrollMonth,1),EOMONTH(DATEFROMPARTS(@PayrollYear,@PayrollMonth,1))) ORDER BY EmployeeId,EffectiveDate DESC,SalaryAssignmentId DESC;
END;
GO
CREATE OR ALTER PROCEDURE dbo.sp_HR_Payroll_Preflight @PayrollMonth INT,@PayrollYear INT AS
BEGIN SET NOCOUNT ON;
 IF @PayrollMonth NOT BETWEEN 1 AND 12 OR @PayrollYear NOT BETWEEN 2000 AND 9999 THROW 51000,'Select a valid payroll period.',1;
 DECLARE @end DATE=EOMONTH(DATEFROMPARTS(@PayrollYear,@PayrollMonth,1)),@start DATE=DATEFROMPARTS(@PayrollYear,@PayrollMonth,1);
 SELECT e.Id EmployeeId,e.EmployeeCode,CONCAT(e.FirstName,N' ',e.LastName) EmployeeName,a.SalaryStructureId,
  CONVERT(INT,c.ComponentCount) ComponentCount,CONVERT(INT,t.AttendanceDays) AttendanceDays,CONVERT(INT,em.EmploymentDays) EmploymentDays,CONVERT(BIT,CASE WHEN mixed.AssignmentCount>1 THEN 1 ELSE 0 END) RequiresRateSelection,
  CONVERT(NVARCHAR(300),CASE
   WHEN e.Status=3 AND e.LastWorkingDate IS NULL THEN N'Last working date is missing. Repair employment history before payroll.'
   WHEN history.NeedsReview=1 THEN N'Employment boundaries before the latest rejoin cannot be reconstructed. Review retained employee history before payroll.'
   WHEN a.SalaryStructureId IS NULL THEN N'No effective salary assignment.'
   WHEN a.Duplicates>1 THEN N'Multiple salary assignments start on the same effective date.'
   WHEN mixed.AmbiguousDays>0 THEN N'An employed date has multiple effective assignments. Repair the duplicate effective date before payroll.'
   WHEN c.ComponentCount=0 AND mixed.AssignmentCount<=1 THEN N'The salary structure has no component amounts.'
   WHEN c.EarningsCount=0 AND mixed.AssignmentCount<=1 THEN N'The salary structure has no positive earnings.'
   WHEN EXISTS(SELECT 1 FROM dbo.HR_LeaveApplications l JOIN dbo.HR_LeaveTypes lt ON lt.Id=l.LeaveTypeId AND lt.IsPaidLeave=1 JOIN dbo.HR_Attendance at ON at.EmployeeId=l.EmployeeId AND at.IsDeleted=0 AND at.AttendanceDate BETWEEN l.StartDate AND l.EndDate JOIN dbo.fn_HR_PayrollEmploymentDates(@start,@end) days ON days.EmployeeId=l.EmployeeId AND days.WorkDate=at.AttendanceDate WHERE l.EmployeeId=e.Id AND l.Status=2 AND l.IsDeleted=0) THEN N'Attendance and approved paid leave overlap. HR must correct the records before payroll.'
   WHEN t.AttendanceDays=0 AND NOT EXISTS(SELECT 1 FROM dbo.HR_LeaveApplications l JOIN dbo.HR_LeaveTypes lt ON lt.Id=l.LeaveTypeId AND lt.IsPaidLeave=1 JOIN dbo.fn_HR_PayrollEmploymentDates(@start,@end) days ON days.EmployeeId=l.EmployeeId AND days.WorkDate BETWEEN l.StartDate AND l.EndDate WHERE l.EmployeeId=e.Id AND l.Status=2 AND l.IsDeleted=0) THEN N'No attendance or approved paid leave in the employed portion of this period. Review attendance.'
   ELSE NULL END) BlockedReason
 FROM dbo.HR_Employees e
 OUTER APPLY(SELECT COUNT(*) EmploymentDays,MAX(WorkDate) LastEmployedDate FROM dbo.fn_HR_PayrollEmploymentDates(@start,@end) days WHERE days.EmployeeId=e.Id) em
 OUTER APPLY(SELECT CONVERT(BIT,CASE WHEN EXISTS(SELECT 1 FROM dbo.v_HR_PayrollRejoinMarkers marker WHERE marker.EmployeeId=e.Id AND marker.RejoinedDate IS NULL AND (e.RejoinedDate IS NULL OR @start<CONVERT(DATE,e.RejoinedDate))) OR EXISTS(
  SELECT 1 FROM dbo.v_HR_PayrollRejoins r
  OUTER APPLY(SELECT MAX(previous.RejoinedDate) RejoinedDate FROM dbo.v_HR_PayrollRejoins previous WHERE previous.EmployeeId=r.EmployeeId AND previous.RejoinedDate<r.RejoinedDate) prior
  WHERE r.EmployeeId=e.Id AND r.RejoinedDate>@start AND (prior.RejoinedDate IS NULL OR prior.RejoinedDate<=@end)
   AND NOT EXISTS(SELECT 1 FROM dbo.v_HR_PayrollEmploymentPeriods p WHERE p.EmployeeId=e.Id AND p.ThroughDate IS NOT NULL AND p.ThroughDate<=r.RejoinedDate AND p.FromDate<=p.ThroughDate AND (prior.RejoinedDate IS NULL OR p.FromDate=prior.RejoinedDate))
 ) THEN 1 ELSE 0 END) NeedsReview) history
 OUTER APPLY(SELECT TOP(1) es.SalaryStructureId,COUNT(*) OVER(PARTITION BY es.EffectiveDate) Duplicates FROM dbo.HR_EmployeeSalaryStructures es JOIN dbo.HR_SalaryStructures s ON s.Id=es.SalaryStructureId AND s.IsDeleted=0 WHERE es.EmployeeId=e.Id AND es.IsDeleted=0 AND es.EffectiveDate<=COALESCE(em.LastEmployedDate,@end) ORDER BY es.EffectiveDate DESC,es.Id DESC) a
 OUTER APPLY(SELECT COUNT(DISTINCT effective.SalaryStructureId) AssignmentCount,COUNT(CASE WHEN effective.SalaryStructureId IS NULL THEN 1 END) MissingDays,COUNT(CASE WHEN effective.Duplicates>1 THEN 1 END) AmbiguousDays
  FROM dbo.fn_HR_PayrollEmploymentDates(@start,@end) days
  OUTER APPLY(SELECT TOP(1) assignment.SalaryStructureId,COUNT(*) OVER(PARTITION BY assignment.EffectiveDate) Duplicates FROM dbo.HR_EmployeeSalaryStructures assignment JOIN dbo.HR_SalaryStructures s ON s.Id=assignment.SalaryStructureId AND s.IsDeleted=0 WHERE assignment.EmployeeId=e.Id AND assignment.IsDeleted=0 AND assignment.EffectiveDate<=days.WorkDate ORDER BY assignment.EffectiveDate DESC,assignment.Id DESC) effective
  WHERE days.EmployeeId=e.Id) mixed
 OUTER APPLY(SELECT COUNT(*) ComponentCount,COUNT(CASE WHEN c.ComponentType=1 AND sc.Amount>0 THEN 1 END) EarningsCount FROM dbo.HR_SalaryStructureComponents sc JOIN dbo.HR_SalaryComponents c ON c.Id=sc.SalaryComponentId AND c.IsDeleted=0 WHERE sc.SalaryStructureId=a.SalaryStructureId AND sc.IsDeleted=0) c
 OUTER APPLY(SELECT COUNT(DISTINCT AttendanceDate) AttendanceDays FROM dbo.HR_Attendance t JOIN dbo.fn_HR_PayrollEmploymentDates(@start,@end) days ON days.EmployeeId=t.EmployeeId AND days.WorkDate=t.AttendanceDate WHERE t.EmployeeId=e.Id AND t.IsDeleted=0) t
 WHERE e.IsDeleted=0 AND e.Status IN(1,3) AND (em.EmploymentDays>0 OR history.NeedsReview=1 OR (e.Status=3 AND e.LastWorkingDate IS NULL AND e.JoiningDate<=@end)) ORDER BY e.EmployeeCode,e.Id;
END;
GO
CREATE OR ALTER PROCEDURE dbo.sp_HR_Payroll_Process @PayrollMonth INT,@PayrollYear INT,@UserId BIGINT=NULL,@RateSelectionsJson NVARCHAR(MAX)=NULL AS
BEGIN SET NOCOUNT ON; SET XACT_ABORT ON; SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
 BEGIN TRY
  IF @PayrollMonth NOT BETWEEN 1 AND 12 OR @PayrollYear NOT BETWEEN 2000 AND 9999 BEGIN SELECT 400 StatusCode,N'Payroll month is invalid.' Message; RETURN; END
  BEGIN TRAN;
  DECLARE @existing BIGINT=(SELECT Id FROM dbo.HR_PayrollRuns WITH(UPDLOCK,HOLDLOCK) WHERE PayrollMonth=@PayrollMonth AND PayrollYear=@PayrollYear AND IsDeleted=0);
  IF @existing IS NOT NULL BEGIN ROLLBACK; SELECT 409 StatusCode,N'Payroll already exists for this period.' Message; RETURN; END
  DECLARE @days INT=DAY(EOMONTH(DATEFROMPARTS(@PayrollYear,@PayrollMonth,1)));
  DECLARE @preflight TABLE(EmployeeId BIGINT,EmployeeCode NVARCHAR(50),EmployeeName NVARCHAR(250),SalaryStructureId BIGINT NULL,ComponentCount INT,AttendanceDays INT,EmploymentDays INT,RequiresRateSelection BIT,BlockedReason NVARCHAR(300));
  INSERT @preflight EXEC dbo.sp_HR_Payroll_Preflight @PayrollMonth,@PayrollYear;
  IF NOT EXISTS(SELECT 1 FROM @preflight) OR EXISTS(SELECT 1 FROM @preflight WHERE BlockedReason IS NOT NULL)
   BEGIN ROLLBACK; SELECT 409 StatusCode,N'Payroll preflight has blocked employees or no eligible staff. Review the preflight list.' Message; RETURN; END;
  SET @RateSelectionsJson=COALESCE(@RateSelectionsJson,N'[]');
  IF ISJSON(@RateSelectionsJson)<>1 BEGIN ROLLBACK; SELECT 400 StatusCode,N'Provide reviewed employee period-rate selections.' Message; RETURN; END;
  DECLARE @requested TABLE(EmployeeId BIGINT,SalaryAssignmentId BIGINT,RowVersionHex NVARCHAR(16),Reviewed BIT);
  INSERT @requested SELECT EmployeeId,SalaryAssignmentId,RowVersionHex,Reviewed FROM OPENJSON(@RateSelectionsJson) WITH(EmployeeId BIGINT '$.employeeId',SalaryAssignmentId BIGINT '$.salaryAssignmentId',RowVersionHex NVARCHAR(16) '$.rowVersionHex',Reviewed BIT '$.reviewed');
  IF EXISTS(SELECT 1 FROM @requested WHERE EmployeeId IS NULL OR SalaryAssignmentId IS NULL OR RowVersionHex IS NULL OR ISNULL(Reviewed,0)=0)
   OR EXISTS(SELECT EmployeeId FROM @requested GROUP BY EmployeeId HAVING COUNT(*)>1)
   OR EXISTS(SELECT 1 FROM @requested requested WHERE NOT EXISTS(SELECT 1 FROM @preflight employee WHERE employee.EmployeeId=requested.EmployeeId))
   BEGIN ROLLBACK; SELECT 400 StatusCode,N'Each selected employee needs one reviewed, versioned period rate from this payroll period.' Message; RETURN; END;
  DECLARE @selectedRates TABLE(EmployeeId BIGINT PRIMARY KEY,SalaryAssignmentId BIGINT,SalaryStructureId BIGINT,RowVersion BINARY(8),MonthlyEarnings DECIMAL(18,2),FixedDeductions DECIMAL(18,2));
  INSERT @selectedRates
  SELECT employee.EmployeeId,rate.SalaryAssignmentId,rate.SalaryStructureId,rate.RowVersion,rate.MonthlyEarnings,rate.FixedDeductions
  FROM @preflight employee LEFT JOIN @requested requested ON requested.EmployeeId=employee.EmployeeId
  OUTER APPLY(SELECT TOP(1) choice.SalaryAssignmentId FROM dbo.fn_HR_PayrollApplicableRates(DATEFROMPARTS(@PayrollYear,@PayrollMonth,1),EOMONTH(DATEFROMPARTS(@PayrollYear,@PayrollMonth,1))) choice WHERE choice.EmployeeId=employee.EmployeeId ORDER BY choice.EffectiveDate DESC,choice.SalaryAssignmentId DESC) automatic
  JOIN dbo.fn_HR_PayrollApplicableRates(DATEFROMPARTS(@PayrollYear,@PayrollMonth,1),EOMONTH(DATEFROMPARTS(@PayrollYear,@PayrollMonth,1))) rate ON rate.EmployeeId=employee.EmployeeId AND rate.SalaryAssignmentId=COALESCE(requested.SalaryAssignmentId,automatic.SalaryAssignmentId)
  WHERE (employee.RequiresRateSelection=0 OR requested.EmployeeId IS NOT NULL)
   AND (requested.EmployeeId IS NULL OR rate.RowVersion=TRY_CONVERT(BINARY(8),N'0x'+requested.RowVersionHex,1));
  IF (SELECT COUNT(*) FROM @selectedRates)<>(SELECT COUNT(*) FROM @preflight)
   BEGIN ROLLBACK; SELECT 409 StatusCode,N'A period rate is missing, stale, belongs to another employee, or was not applicable during employed dates. Reload and review the choices.' Message; RETURN; END;
  IF EXISTS(SELECT 1 FROM @selectedRates WHERE MonthlyEarnings<=0 OR FixedDeductions<0)
   OR EXISTS(SELECT 1 FROM @selectedRates selected JOIN dbo.HR_SalaryStructureComponents amount ON amount.SalaryStructureId=selected.SalaryStructureId AND amount.IsDeleted=0 WHERE amount.Amount<0)
   BEGIN ROLLBACK; SELECT 409 StatusCode,N'A selected salary structure has invalid or missing component amounts. Repair setup before payroll.' Message; RETURN; END;
  INSERT dbo.HR_PayrollRuns(PayrollMonth,PayrollYear,Status,CreatedBy) VALUES(@PayrollMonth,@PayrollYear,2,@UserId);
  DECLARE @run BIGINT=SCOPE_IDENTITY();
  ;WITH Payable AS
  (
   SELECT days.EmployeeId,CONVERT(DECIMAL(8,2),SUM(CASE WHEN paid.IsPaid=1 THEN 1.0 WHEN a.AttendanceStatus IN(1,5,6,7) THEN 1.0 WHEN a.AttendanceStatus=3 THEN 0.5 ELSE 0 END)) PayableDays
   FROM dbo.fn_HR_PayrollEmploymentDates(DATEFROMPARTS(@PayrollYear,@PayrollMonth,1),EOMONTH(DATEFROMPARTS(@PayrollYear,@PayrollMonth,1))) days
   JOIN @preflight eligible ON eligible.EmployeeId=days.EmployeeId
   LEFT JOIN dbo.HR_Attendance a ON a.EmployeeId=days.EmployeeId AND a.AttendanceDate=days.WorkDate AND a.IsDeleted=0
   OUTER APPLY(SELECT CONVERT(BIT,CASE WHEN EXISTS(SELECT 1 FROM dbo.HR_LeaveApplications l JOIN dbo.HR_LeaveTypes t ON t.Id=l.LeaveTypeId AND t.IsPaidLeave=1 WHERE l.EmployeeId=days.EmployeeId AND l.Status=2 AND l.IsDeleted=0 AND days.WorkDate BETWEEN l.StartDate AND l.EndDate) THEN 1 ELSE 0 END) IsPaid) paid
   GROUP BY days.EmployeeId
  )
  INSERT dbo.HR_PayrollDetails(PayrollRunId,EmployeeId,PayableDays,GrossSalary,TotalDeduction,NetSalary,CreatedBy,SalaryAssignmentId,SalaryStructureId,SalaryAssignmentVersion,MonthlyEarnings,FixedDeductions)
  SELECT @run,s.EmployeeId,IIF(p.PayableDays>@days,@days,p.PayableDays),
   ROUND(s.MonthlyEarnings*IIF(p.PayableDays>@days,@days,p.PayableDays)/@days,2),s.FixedDeductions,
   ROUND(s.MonthlyEarnings*IIF(p.PayableDays>@days,@days,p.PayableDays)/@days,2)-s.FixedDeductions,@UserId,s.SalaryAssignmentId,s.SalaryStructureId,s.RowVersion,s.MonthlyEarnings,s.FixedDeductions
  FROM @selectedRates s JOIN Payable p ON p.EmployeeId=s.EmployeeId;
  IF (SELECT COUNT(*) FROM dbo.HR_PayrollDetails WHERE PayrollRunId=@run AND IsDeleted=0)<>(SELECT COUNT(*) FROM @preflight)
   BEGIN ROLLBACK; SELECT 409 StatusCode,N'Payroll staff changed during processing. Review preflight and retry.' Message; RETURN; END;
  IF EXISTS(SELECT 1 FROM dbo.HR_PayrollDetails WHERE PayrollRunId=@run AND NetSalary<0)
   BEGIN ROLLBACK; SELECT 409 StatusCode,N'Payroll produces negative net pay. Review component amounts and payable days.' Message; RETURN; END;
  COMMIT; SELECT 201 StatusCode,N'Payroll processed.' Message; EXEC dbo.sp_HR_Payroll_GetRun @run;
 END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; SELECT 500 StatusCode,ERROR_MESSAGE() Message; END CATCH
END;
GO
