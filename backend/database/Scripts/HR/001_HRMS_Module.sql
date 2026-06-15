/*
    Cosmos ERP HRMS Module
    SQL Server, idempotent deployment script.
*/
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF OBJECT_ID(N'dbo.HR_Departments', N'U') IS NULL
CREATE TABLE dbo.HR_Departments
(
    Id BIGINT IDENTITY(1,1) CONSTRAINT PK_HR_Departments PRIMARY KEY,
    DepartmentCode NVARCHAR(20) NOT NULL,
    DepartmentName NVARCHAR(200) NOT NULL,
    Description NVARCHAR(500) NULL,
    IsActive BIT NOT NULL CONSTRAINT DF_HR_Departments_IsActive DEFAULT (1),
    CreatedOn DATETIME2(3) NOT NULL CONSTRAINT DF_HR_Departments_CreatedOn DEFAULT SYSUTCDATETIME(),
    CreatedBy BIGINT NULL, UpdatedOn DATETIME2(3) NULL, UpdatedBy BIGINT NULL,
    DeletedOn DATETIME2(3) NULL, DeletedBy BIGINT NULL,
    IsDeleted BIT NOT NULL CONSTRAINT DF_HR_Departments_IsDeleted DEFAULT (0)
);
GO

IF OBJECT_ID(N'dbo.HR_Designations', N'U') IS NULL
CREATE TABLE dbo.HR_Designations
(
    Id BIGINT IDENTITY(1,1) CONSTRAINT PK_HR_Designations PRIMARY KEY,
    DesignationCode NVARCHAR(20) NOT NULL,
    DesignationName NVARCHAR(200) NOT NULL,
    DepartmentId BIGINT NOT NULL,
    Description NVARCHAR(500) NULL,
    IsActive BIT NOT NULL CONSTRAINT DF_HR_Designations_IsActive DEFAULT (1),
    CreatedOn DATETIME2(3) NOT NULL CONSTRAINT DF_HR_Designations_CreatedOn DEFAULT SYSUTCDATETIME(),
    CreatedBy BIGINT NULL, UpdatedOn DATETIME2(3) NULL, UpdatedBy BIGINT NULL,
    DeletedOn DATETIME2(3) NULL, DeletedBy BIGINT NULL,
    IsDeleted BIT NOT NULL CONSTRAINT DF_HR_Designations_IsDeleted DEFAULT (0),
    CONSTRAINT FK_HR_Designations_Department FOREIGN KEY (DepartmentId) REFERENCES dbo.HR_Departments(Id)
);
GO

IF OBJECT_ID(N'dbo.HR_Shifts', N'U') IS NULL
CREATE TABLE dbo.HR_Shifts
(
    Id BIGINT IDENTITY(1,1) CONSTRAINT PK_HR_Shifts PRIMARY KEY,
    ShiftCode NVARCHAR(20) NOT NULL, ShiftName NVARCHAR(200) NOT NULL,
    StartTime TIME(0) NOT NULL, EndTime TIME(0) NOT NULL,
    GraceMinutes INT NOT NULL CONSTRAINT DF_HR_Shifts_Grace DEFAULT (0),
    IsNightShift BIT NOT NULL CONSTRAINT DF_HR_Shifts_Night DEFAULT (0),
    WeeklyHours DECIMAL(6,2) NOT NULL CONSTRAINT DF_HR_Shifts_Weekly DEFAULT (0),
    IsActive BIT NOT NULL CONSTRAINT DF_HR_Shifts_IsActive DEFAULT (1),
    CreatedOn DATETIME2(3) NOT NULL CONSTRAINT DF_HR_Shifts_CreatedOn DEFAULT SYSUTCDATETIME(),
    CreatedBy BIGINT NULL, UpdatedOn DATETIME2(3) NULL, UpdatedBy BIGINT NULL,
    DeletedOn DATETIME2(3) NULL, DeletedBy BIGINT NULL,
    IsDeleted BIT NOT NULL CONSTRAINT DF_HR_Shifts_IsDeleted DEFAULT (0),
    CONSTRAINT CK_HR_Shifts_Grace CHECK (GraceMinutes BETWEEN 0 AND 240),
    CONSTRAINT CK_HR_Shifts_WeeklyHours CHECK (WeeklyHours BETWEEN 0 AND 168)
);
GO

IF OBJECT_ID(N'dbo.HR_Employees', N'U') IS NULL
CREATE TABLE dbo.HR_Employees
(
    Id BIGINT IDENTITY(1,1) CONSTRAINT PK_HR_Employees PRIMARY KEY,
    EmployeeCode NVARCHAR(30) NOT NULL, FirstName NVARCHAR(100) NOT NULL, LastName NVARCHAR(100) NULL,
    Gender INT NOT NULL, DateOfBirth DATE NULL, JoiningDate DATE NOT NULL,
    Mobile NVARCHAR(20) NULL, Email NVARCHAR(200) NULL,
    DepartmentId BIGINT NOT NULL, DesignationId BIGINT NOT NULL,
    ReportingManagerId BIGINT NULL, ShiftId BIGINT NOT NULL,
    EmploymentType INT NOT NULL, Status INT NOT NULL,
    ProfilePhotoUrl NVARCHAR(1000) NULL,
    IsActive AS CONVERT(BIT, CASE WHEN Status = 1 AND IsDeleted = 0 THEN 1 ELSE 0 END) PERSISTED,
    CreatedOn DATETIME2(3) NOT NULL CONSTRAINT DF_HR_Employees_CreatedOn DEFAULT SYSUTCDATETIME(),
    CreatedBy BIGINT NULL, UpdatedOn DATETIME2(3) NULL, UpdatedBy BIGINT NULL,
    DeletedOn DATETIME2(3) NULL, DeletedBy BIGINT NULL,
    IsDeleted BIT NOT NULL CONSTRAINT DF_HR_Employees_IsDeleted DEFAULT (0),
    CONSTRAINT FK_HR_Employees_Department FOREIGN KEY (DepartmentId) REFERENCES dbo.HR_Departments(Id),
    CONSTRAINT FK_HR_Employees_Designation FOREIGN KEY (DesignationId) REFERENCES dbo.HR_Designations(Id),
    CONSTRAINT FK_HR_Employees_Manager FOREIGN KEY (ReportingManagerId) REFERENCES dbo.HR_Employees(Id),
    CONSTRAINT FK_HR_Employees_Shift FOREIGN KEY (ShiftId) REFERENCES dbo.HR_Shifts(Id),
    CONSTRAINT CK_HR_Employees_Gender CHECK (Gender BETWEEN 0 AND 3),
    CONSTRAINT CK_HR_Employees_EmploymentType CHECK (EmploymentType BETWEEN 1 AND 4),
    CONSTRAINT CK_HR_Employees_Status CHECK (Status BETWEEN 1 AND 4)
);
GO

IF OBJECT_ID(N'dbo.HR_EmployeeAddresses', N'U') IS NULL
CREATE TABLE dbo.HR_EmployeeAddresses
(
    Id BIGINT IDENTITY(1,1) CONSTRAINT PK_HR_EmployeeAddresses PRIMARY KEY,
    EmployeeId BIGINT NOT NULL, AddressType NVARCHAR(30) NOT NULL,
    AddressLine1 NVARCHAR(250) NOT NULL, AddressLine2 NVARCHAR(250) NULL,
    City NVARCHAR(100) NULL, State NVARCHAR(100) NULL, Country NVARCHAR(100) NULL, Pincode NVARCHAR(20) NULL,
    CreatedOn DATETIME2(3) NOT NULL CONSTRAINT DF_HR_EmployeeAddresses_CreatedOn DEFAULT SYSUTCDATETIME(),
    CreatedBy BIGINT NULL, UpdatedOn DATETIME2(3) NULL, UpdatedBy BIGINT NULL,
    DeletedOn DATETIME2(3) NULL, DeletedBy BIGINT NULL,
    IsDeleted BIT NOT NULL CONSTRAINT DF_HR_EmployeeAddresses_IsDeleted DEFAULT (0),
    CONSTRAINT FK_HR_EmployeeAddresses_Employee FOREIGN KEY (EmployeeId) REFERENCES dbo.HR_Employees(Id)
);
GO

IF OBJECT_ID(N'dbo.HR_EmployeeBankAccounts', N'U') IS NULL
CREATE TABLE dbo.HR_EmployeeBankAccounts
(
    Id BIGINT IDENTITY(1,1) CONSTRAINT PK_HR_EmployeeBankAccounts PRIMARY KEY,
    EmployeeId BIGINT NOT NULL, BankName NVARCHAR(150) NOT NULL,
    AccountNumber NVARCHAR(50) NOT NULL, IFSCCode NVARCHAR(20) NOT NULL,
    BranchName NVARCHAR(150) NULL, UPIId NVARCHAR(100) NULL,
    CreatedOn DATETIME2(3) NOT NULL CONSTRAINT DF_HR_EmployeeBank_CreatedOn DEFAULT SYSUTCDATETIME(),
    CreatedBy BIGINT NULL, UpdatedOn DATETIME2(3) NULL, UpdatedBy BIGINT NULL,
    DeletedOn DATETIME2(3) NULL, DeletedBy BIGINT NULL,
    IsDeleted BIT NOT NULL CONSTRAINT DF_HR_EmployeeBank_IsDeleted DEFAULT (0),
    CONSTRAINT FK_HR_EmployeeBank_Employee FOREIGN KEY (EmployeeId) REFERENCES dbo.HR_Employees(Id)
);
GO

IF OBJECT_ID(N'dbo.HR_EmployeeDocuments', N'U') IS NULL
CREATE TABLE dbo.HR_EmployeeDocuments
(
    Id BIGINT IDENTITY(1,1) CONSTRAINT PK_HR_EmployeeDocuments PRIMARY KEY,
    EmployeeId BIGINT NOT NULL, DocumentType NVARCHAR(50) NOT NULL,
    FileName NVARCHAR(255) NOT NULL, FilePath NVARCHAR(1000) NOT NULL, ExpiryDate DATE NULL,
    CreatedOn DATETIME2(3) NOT NULL CONSTRAINT DF_HR_EmployeeDocuments_CreatedOn DEFAULT SYSUTCDATETIME(),
    CreatedBy BIGINT NULL, UpdatedOn DATETIME2(3) NULL, UpdatedBy BIGINT NULL,
    DeletedOn DATETIME2(3) NULL, DeletedBy BIGINT NULL,
    IsDeleted BIT NOT NULL CONSTRAINT DF_HR_EmployeeDocuments_IsDeleted DEFAULT (0),
    CONSTRAINT FK_HR_EmployeeDocuments_Employee FOREIGN KEY (EmployeeId) REFERENCES dbo.HR_Employees(Id)
);
GO

IF OBJECT_ID(N'dbo.HR_Attendance', N'U') IS NULL
CREATE TABLE dbo.HR_Attendance
(
    Id BIGINT IDENTITY(1,1) CONSTRAINT PK_HR_Attendance PRIMARY KEY,
    EmployeeId BIGINT NOT NULL, AttendanceDate DATE NOT NULL,
    CheckInTime DATETIME2(3) NULL, CheckOutTime DATETIME2(3) NULL,
    WorkingMinutes INT NOT NULL CONSTRAINT DF_HR_Attendance_Working DEFAULT (0),
    OvertimeMinutes INT NOT NULL CONSTRAINT DF_HR_Attendance_Overtime DEFAULT (0),
    AttendanceStatus INT NOT NULL,
    CreatedOn DATETIME2(3) NOT NULL CONSTRAINT DF_HR_Attendance_CreatedOn DEFAULT SYSUTCDATETIME(),
    CreatedBy BIGINT NULL, UpdatedOn DATETIME2(3) NULL, UpdatedBy BIGINT NULL,
    DeletedOn DATETIME2(3) NULL, DeletedBy BIGINT NULL,
    IsDeleted BIT NOT NULL CONSTRAINT DF_HR_Attendance_IsDeleted DEFAULT (0),
    CONSTRAINT FK_HR_Attendance_Employee FOREIGN KEY (EmployeeId) REFERENCES dbo.HR_Employees(Id),
    CONSTRAINT CK_HR_Attendance_Status CHECK (AttendanceStatus BETWEEN 1 AND 7),
    CONSTRAINT CK_HR_Attendance_Times CHECK (CheckOutTime IS NULL OR CheckInTime IS NULL OR CheckOutTime > CheckInTime)
);
GO

IF OBJECT_ID(N'dbo.HR_AttendanceAdjustments', N'U') IS NULL
CREATE TABLE dbo.HR_AttendanceAdjustments
(
    Id BIGINT IDENTITY(1,1) CONSTRAINT PK_HR_AttendanceAdjustments PRIMARY KEY,
    EmployeeId BIGINT NOT NULL, AttendanceId BIGINT NOT NULL,
    Reason NVARCHAR(500) NOT NULL, Remarks NVARCHAR(500) NULL,
    Status INT NOT NULL CONSTRAINT DF_HR_AttendanceAdjustments_Status DEFAULT (1),
    ApprovedBy BIGINT NULL, ApprovedOn DATETIME2(3) NULL,
    CreatedOn DATETIME2(3) NOT NULL CONSTRAINT DF_HR_AttendanceAdjustments_CreatedOn DEFAULT SYSUTCDATETIME(),
    CreatedBy BIGINT NULL, UpdatedOn DATETIME2(3) NULL, UpdatedBy BIGINT NULL,
    DeletedOn DATETIME2(3) NULL, DeletedBy BIGINT NULL,
    IsDeleted BIT NOT NULL CONSTRAINT DF_HR_AttendanceAdjustments_IsDeleted DEFAULT (0),
    CONSTRAINT FK_HR_AttendanceAdjustments_Employee FOREIGN KEY (EmployeeId) REFERENCES dbo.HR_Employees(Id),
    CONSTRAINT FK_HR_AttendanceAdjustments_Attendance FOREIGN KEY (AttendanceId) REFERENCES dbo.HR_Attendance(Id),
    CONSTRAINT CK_HR_AttendanceAdjustments_Status CHECK (Status BETWEEN 1 AND 3)
);
GO

IF OBJECT_ID(N'dbo.HR_LeaveTypes', N'U') IS NULL
CREATE TABLE dbo.HR_LeaveTypes
(
    Id BIGINT IDENTITY(1,1) CONSTRAINT PK_HR_LeaveTypes PRIMARY KEY,
    LeaveCode NVARCHAR(20) NOT NULL, LeaveName NVARCHAR(100) NOT NULL,
    AnnualQuota DECIMAL(8,2) NOT NULL, IsPaidLeave BIT NOT NULL,
    IsActive BIT NOT NULL CONSTRAINT DF_HR_LeaveTypes_IsActive DEFAULT (1),
    CreatedOn DATETIME2(3) NOT NULL CONSTRAINT DF_HR_LeaveTypes_CreatedOn DEFAULT SYSUTCDATETIME(),
    CreatedBy BIGINT NULL, UpdatedOn DATETIME2(3) NULL, UpdatedBy BIGINT NULL,
    DeletedOn DATETIME2(3) NULL, DeletedBy BIGINT NULL,
    IsDeleted BIT NOT NULL CONSTRAINT DF_HR_LeaveTypes_IsDeleted DEFAULT (0)
);
GO

IF OBJECT_ID(N'dbo.HR_LeaveBalances', N'U') IS NULL
CREATE TABLE dbo.HR_LeaveBalances
(
    Id BIGINT IDENTITY(1,1) CONSTRAINT PK_HR_LeaveBalances PRIMARY KEY,
    EmployeeId BIGINT NOT NULL, LeaveTypeId BIGINT NOT NULL,
    OpeningBalance DECIMAL(8,2) NOT NULL, UsedBalance DECIMAL(8,2) NOT NULL CONSTRAINT DF_HR_LeaveBalances_Used DEFAULT (0),
    RemainingBalance DECIMAL(8,2) NOT NULL,
    CreatedOn DATETIME2(3) NOT NULL CONSTRAINT DF_HR_LeaveBalances_CreatedOn DEFAULT SYSUTCDATETIME(),
    CreatedBy BIGINT NULL, UpdatedOn DATETIME2(3) NULL, UpdatedBy BIGINT NULL,
    DeletedOn DATETIME2(3) NULL, DeletedBy BIGINT NULL,
    IsDeleted BIT NOT NULL CONSTRAINT DF_HR_LeaveBalances_IsDeleted DEFAULT (0),
    CONSTRAINT FK_HR_LeaveBalances_Employee FOREIGN KEY (EmployeeId) REFERENCES dbo.HR_Employees(Id),
    CONSTRAINT FK_HR_LeaveBalances_Type FOREIGN KEY (LeaveTypeId) REFERENCES dbo.HR_LeaveTypes(Id)
);
GO

IF OBJECT_ID(N'dbo.HR_LeaveApplications', N'U') IS NULL
CREATE TABLE dbo.HR_LeaveApplications
(
    Id BIGINT IDENTITY(1,1) CONSTRAINT PK_HR_LeaveApplications PRIMARY KEY,
    EmployeeId BIGINT NOT NULL, LeaveTypeId BIGINT NOT NULL,
    StartDate DATE NOT NULL, EndDate DATE NOT NULL,
    LeaveDays AS CONVERT(DECIMAL(8,2), DATEDIFF(DAY, StartDate, EndDate) + 1) PERSISTED,
    Reason NVARCHAR(500) NOT NULL, Remarks NVARCHAR(500) NULL,
    Status INT NOT NULL CONSTRAINT DF_HR_LeaveApplications_Status DEFAULT (1),
    ApprovedBy BIGINT NULL, ApprovedOn DATETIME2(3) NULL,
    CreatedOn DATETIME2(3) NOT NULL CONSTRAINT DF_HR_LeaveApplications_CreatedOn DEFAULT SYSUTCDATETIME(),
    CreatedBy BIGINT NULL, UpdatedOn DATETIME2(3) NULL, UpdatedBy BIGINT NULL,
    DeletedOn DATETIME2(3) NULL, DeletedBy BIGINT NULL,
    IsDeleted BIT NOT NULL CONSTRAINT DF_HR_LeaveApplications_IsDeleted DEFAULT (0),
    CONSTRAINT FK_HR_LeaveApplications_Employee FOREIGN KEY (EmployeeId) REFERENCES dbo.HR_Employees(Id),
    CONSTRAINT FK_HR_LeaveApplications_Type FOREIGN KEY (LeaveTypeId) REFERENCES dbo.HR_LeaveTypes(Id),
    CONSTRAINT CK_HR_LeaveApplications_Dates CHECK (EndDate >= StartDate),
    CONSTRAINT CK_HR_LeaveApplications_Status CHECK (Status BETWEEN 1 AND 4)
);
GO

IF OBJECT_ID(N'dbo.HR_SalaryStructures', N'U') IS NULL
CREATE TABLE dbo.HR_SalaryStructures
(
    Id BIGINT IDENTITY(1,1) CONSTRAINT PK_HR_SalaryStructures PRIMARY KEY,
    Name NVARCHAR(150) NOT NULL,
    CreatedOn DATETIME2(3) NOT NULL CONSTRAINT DF_HR_SalaryStructures_CreatedOn DEFAULT SYSUTCDATETIME(),
    CreatedBy BIGINT NULL, UpdatedOn DATETIME2(3) NULL, UpdatedBy BIGINT NULL,
    DeletedOn DATETIME2(3) NULL, DeletedBy BIGINT NULL,
    IsDeleted BIT NOT NULL CONSTRAINT DF_HR_SalaryStructures_IsDeleted DEFAULT (0)
);
GO

IF OBJECT_ID(N'dbo.HR_SalaryComponents', N'U') IS NULL
CREATE TABLE dbo.HR_SalaryComponents
(
    Id BIGINT IDENTITY(1,1) CONSTRAINT PK_HR_SalaryComponents PRIMARY KEY,
    ComponentName NVARCHAR(150) NOT NULL, ComponentType INT NOT NULL,
    CreatedOn DATETIME2(3) NOT NULL CONSTRAINT DF_HR_SalaryComponents_CreatedOn DEFAULT SYSUTCDATETIME(),
    CreatedBy BIGINT NULL, UpdatedOn DATETIME2(3) NULL, UpdatedBy BIGINT NULL,
    DeletedOn DATETIME2(3) NULL, DeletedBy BIGINT NULL,
    IsDeleted BIT NOT NULL CONSTRAINT DF_HR_SalaryComponents_IsDeleted DEFAULT (0),
    CONSTRAINT CK_HR_SalaryComponents_Type CHECK (ComponentType IN (1,2))
);
GO

-- Component amounts are required to make a salary structure calculable.
IF OBJECT_ID(N'dbo.HR_SalaryStructureComponents', N'U') IS NULL
CREATE TABLE dbo.HR_SalaryStructureComponents
(
    Id BIGINT IDENTITY(1,1) CONSTRAINT PK_HR_SalaryStructureComponents PRIMARY KEY,
    SalaryStructureId BIGINT NOT NULL, SalaryComponentId BIGINT NOT NULL, Amount DECIMAL(18,2) NOT NULL,
    CreatedOn DATETIME2(3) NOT NULL CONSTRAINT DF_HR_SalaryStructureComponents_CreatedOn DEFAULT SYSUTCDATETIME(),
    CreatedBy BIGINT NULL, UpdatedOn DATETIME2(3) NULL, UpdatedBy BIGINT NULL,
    DeletedOn DATETIME2(3) NULL, DeletedBy BIGINT NULL,
    IsDeleted BIT NOT NULL CONSTRAINT DF_HR_SalaryStructureComponents_IsDeleted DEFAULT (0),
    CONSTRAINT FK_HR_SalaryStructureComponents_Structure FOREIGN KEY (SalaryStructureId) REFERENCES dbo.HR_SalaryStructures(Id),
    CONSTRAINT FK_HR_SalaryStructureComponents_Component FOREIGN KEY (SalaryComponentId) REFERENCES dbo.HR_SalaryComponents(Id)
);
GO

IF OBJECT_ID(N'dbo.HR_EmployeeSalaryStructures', N'U') IS NULL
CREATE TABLE dbo.HR_EmployeeSalaryStructures
(
    Id BIGINT IDENTITY(1,1) CONSTRAINT PK_HR_EmployeeSalaryStructures PRIMARY KEY,
    EmployeeId BIGINT NOT NULL, SalaryStructureId BIGINT NOT NULL, EffectiveDate DATE NOT NULL,
    CreatedOn DATETIME2(3) NOT NULL CONSTRAINT DF_HR_EmployeeSalaryStructures_CreatedOn DEFAULT SYSUTCDATETIME(),
    CreatedBy BIGINT NULL, UpdatedOn DATETIME2(3) NULL, UpdatedBy BIGINT NULL,
    DeletedOn DATETIME2(3) NULL, DeletedBy BIGINT NULL,
    IsDeleted BIT NOT NULL CONSTRAINT DF_HR_EmployeeSalaryStructures_IsDeleted DEFAULT (0),
    CONSTRAINT FK_HR_EmployeeSalaryStructures_Employee FOREIGN KEY (EmployeeId) REFERENCES dbo.HR_Employees(Id),
    CONSTRAINT FK_HR_EmployeeSalaryStructures_Structure FOREIGN KEY (SalaryStructureId) REFERENCES dbo.HR_SalaryStructures(Id)
);
GO

IF OBJECT_ID(N'dbo.HR_PayrollRuns', N'U') IS NULL
CREATE TABLE dbo.HR_PayrollRuns
(
    Id BIGINT IDENTITY(1,1) CONSTRAINT PK_HR_PayrollRuns PRIMARY KEY,
    PayrollMonth INT NOT NULL, PayrollYear INT NOT NULL, Status INT NOT NULL,
    CreatedOn DATETIME2(3) NOT NULL CONSTRAINT DF_HR_PayrollRuns_CreatedOn DEFAULT SYSUTCDATETIME(),
    CreatedBy BIGINT NULL, UpdatedOn DATETIME2(3) NULL, UpdatedBy BIGINT NULL,
    DeletedOn DATETIME2(3) NULL, DeletedBy BIGINT NULL,
    IsDeleted BIT NOT NULL CONSTRAINT DF_HR_PayrollRuns_IsDeleted DEFAULT (0),
    CONSTRAINT CK_HR_PayrollRuns_Month CHECK (PayrollMonth BETWEEN 1 AND 12),
    CONSTRAINT CK_HR_PayrollRuns_Status CHECK (Status BETWEEN 1 AND 3)
);
GO

IF OBJECT_ID(N'dbo.HR_PayrollDetails', N'U') IS NULL
CREATE TABLE dbo.HR_PayrollDetails
(
    Id BIGINT IDENTITY(1,1) CONSTRAINT PK_HR_PayrollDetails PRIMARY KEY,
    PayrollRunId BIGINT NOT NULL, EmployeeId BIGINT NOT NULL,
    PayableDays DECIMAL(8,2) NOT NULL, GrossSalary DECIMAL(18,2) NOT NULL,
    TotalDeduction DECIMAL(18,2) NOT NULL, NetSalary DECIMAL(18,2) NOT NULL,
    CreatedOn DATETIME2(3) NOT NULL CONSTRAINT DF_HR_PayrollDetails_CreatedOn DEFAULT SYSUTCDATETIME(),
    CreatedBy BIGINT NULL, UpdatedOn DATETIME2(3) NULL, UpdatedBy BIGINT NULL,
    DeletedOn DATETIME2(3) NULL, DeletedBy BIGINT NULL,
    IsDeleted BIT NOT NULL CONSTRAINT DF_HR_PayrollDetails_IsDeleted DEFAULT (0),
    CONSTRAINT FK_HR_PayrollDetails_Run FOREIGN KEY (PayrollRunId) REFERENCES dbo.HR_PayrollRuns(Id),
    CONSTRAINT FK_HR_PayrollDetails_Employee FOREIGN KEY (EmployeeId) REFERENCES dbo.HR_Employees(Id)
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_HR_Departments_Code' AND object_id=OBJECT_ID(N'dbo.HR_Departments'))
    CREATE UNIQUE INDEX UX_HR_Departments_Code ON dbo.HR_Departments(DepartmentCode) WHERE IsDeleted=0;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_HR_Departments_Name' AND object_id=OBJECT_ID(N'dbo.HR_Departments'))
    CREATE UNIQUE INDEX UX_HR_Departments_Name ON dbo.HR_Departments(DepartmentName) WHERE IsDeleted=0;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_HR_Designations_Code' AND object_id=OBJECT_ID(N'dbo.HR_Designations'))
    CREATE UNIQUE INDEX UX_HR_Designations_Code ON dbo.HR_Designations(DesignationCode) WHERE IsDeleted=0;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_HR_Shifts_Code' AND object_id=OBJECT_ID(N'dbo.HR_Shifts'))
    CREATE UNIQUE INDEX UX_HR_Shifts_Code ON dbo.HR_Shifts(ShiftCode) WHERE IsDeleted=0;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_HR_Employees_Code' AND object_id=OBJECT_ID(N'dbo.HR_Employees'))
    CREATE UNIQUE INDEX UX_HR_Employees_Code ON dbo.HR_Employees(EmployeeCode) WHERE IsDeleted=0;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_HR_Employees_Email' AND object_id=OBJECT_ID(N'dbo.HR_Employees'))
    CREATE UNIQUE INDEX UX_HR_Employees_Email ON dbo.HR_Employees(Email) WHERE IsDeleted=0 AND Email IS NOT NULL;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_HR_Employees_Mobile' AND object_id=OBJECT_ID(N'dbo.HR_Employees'))
    CREATE UNIQUE INDEX UX_HR_Employees_Mobile ON dbo.HR_Employees(Mobile) WHERE IsDeleted=0 AND Mobile IS NOT NULL;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_HR_Attendance_EmployeeDate' AND object_id=OBJECT_ID(N'dbo.HR_Attendance'))
    CREATE UNIQUE INDEX UX_HR_Attendance_EmployeeDate ON dbo.HR_Attendance(EmployeeId, AttendanceDate) WHERE IsDeleted=0;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_HR_LeaveBalances_EmployeeType' AND object_id=OBJECT_ID(N'dbo.HR_LeaveBalances'))
    CREATE UNIQUE INDEX UX_HR_LeaveBalances_EmployeeType ON dbo.HR_LeaveBalances(EmployeeId, LeaveTypeId) WHERE IsDeleted=0;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_HR_PayrollRuns_Period' AND object_id=OBJECT_ID(N'dbo.HR_PayrollRuns'))
    CREATE UNIQUE INDEX UX_HR_PayrollRuns_Period ON dbo.HR_PayrollRuns(PayrollMonth, PayrollYear) WHERE IsDeleted=0;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_HR_PayrollDetails_RunEmployee' AND object_id=OBJECT_ID(N'dbo.HR_PayrollDetails'))
    CREATE UNIQUE INDEX UX_HR_PayrollDetails_RunEmployee ON dbo.HR_PayrollDetails(PayrollRunId, EmployeeId) WHERE IsDeleted=0;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Entity_Exists @Entity NVARCHAR(30), @Id BIGINT AS
BEGIN
    SET NOCOUNT ON;
    SELECT CONVERT(BIT, CASE
        WHEN @Entity=N'Department' AND EXISTS(SELECT 1 FROM dbo.HR_Departments WHERE Id=@Id AND IsDeleted=0) THEN 1
        WHEN @Entity=N'Designation' AND EXISTS(SELECT 1 FROM dbo.HR_Designations WHERE Id=@Id AND IsDeleted=0) THEN 1
        WHEN @Entity=N'Shift' AND EXISTS(SELECT 1 FROM dbo.HR_Shifts WHERE Id=@Id AND IsDeleted=0) THEN 1
        WHEN @Entity=N'Employee' AND EXISTS(SELECT 1 FROM dbo.HR_Employees WHERE Id=@Id AND IsDeleted=0) THEN 1
        ELSE 0 END);
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Department_GetById @Id BIGINT AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id,DepartmentCode,DepartmentName,Description,IsActive,CreatedOn,UpdatedOn,0 TotalCount
    FROM dbo.HR_Departments WHERE Id=@Id AND IsDeleted=0;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Department_GetList
 @Search NVARCHAR(200)=NULL,@IsActive BIT=NULL,@PageNumber INT=1,@PageSize INT=20,@SortBy NVARCHAR(50)=NULL,@SortDirection NVARCHAR(4)=N'ASC' AS
BEGIN
 SET NOCOUNT ON; SET @PageNumber=IIF(@PageNumber<1,1,@PageNumber); SET @PageSize=IIF(@PageSize<1,20,IIF(@PageSize>200,200,@PageSize));
 SET @SortBy=CASE WHEN @SortBy IN(N'DepartmentCode',N'DepartmentName',N'CreatedOn') THEN @SortBy ELSE N'DepartmentName' END;
 SET @SortDirection=IIF(UPPER(@SortDirection)=N'DESC',N'DESC',N'ASC');
 DECLARE @sql NVARCHAR(MAX)=N'SELECT Id,DepartmentCode,DepartmentName,Description,IsActive,CreatedOn,UpdatedOn,COUNT(1) OVER() TotalCount
 FROM dbo.HR_Departments WHERE IsDeleted=0 AND (@a IS NULL OR IsActive=@a) AND (@s IS NULL OR DepartmentCode LIKE @s OR DepartmentName LIKE @s OR Description LIKE @s)
 ORDER BY '+QUOTENAME(@SortBy)+N' '+@SortDirection+N' OFFSET @o ROWS FETCH NEXT @p ROWS ONLY';
 DECLARE @pattern NVARCHAR(210)=IIF(NULLIF(LTRIM(RTRIM(@Search)),N'') IS NULL,NULL,N'%'+LTRIM(RTRIM(@Search))+N'%');
 EXEC sp_executesql @sql,N'@a BIT,@s NVARCHAR(210),@o INT,@p INT',@a=@IsActive,@s=@pattern,@o=(@PageNumber-1)*@PageSize,@p=@PageSize;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Department_ValueExists @Field NVARCHAR(30),@Value NVARCHAR(200),@ExcludingId BIGINT=NULL AS
BEGIN
 SET NOCOUNT ON;
 SELECT CONVERT(BIT,IIF(EXISTS(SELECT 1 FROM dbo.HR_Departments WHERE IsDeleted=0 AND (@ExcludingId IS NULL OR Id<>@ExcludingId)
 AND ((@Field=N'DepartmentCode' AND DepartmentCode=LTRIM(RTRIM(@Value))) OR (@Field=N'DepartmentName' AND DepartmentName=LTRIM(RTRIM(@Value))))),1,0));
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Department_Create
 @DepartmentCode NVARCHAR(20),@DepartmentName NVARCHAR(200),@Description NVARCHAR(500)=NULL,@IsActive BIT=1,@UserId BIGINT=NULL AS
BEGIN
 SET NOCOUNT ON;
 BEGIN TRY
  IF EXISTS(SELECT 1 FROM dbo.HR_Departments WHERE IsDeleted=0 AND (DepartmentCode=@DepartmentCode OR DepartmentName=@DepartmentName))
  BEGIN SELECT 409 StatusCode,N'Department code or name already exists.' Message; RETURN; END
  INSERT dbo.HR_Departments(DepartmentCode,DepartmentName,Description,IsActive,CreatedBy)
  VALUES(LTRIM(RTRIM(@DepartmentCode)),LTRIM(RTRIM(@DepartmentName)),@Description,@IsActive,@UserId);
  DECLARE @Id BIGINT=SCOPE_IDENTITY(); SELECT 201 StatusCode,N'Department created.' Message; EXEC dbo.sp_HR_Department_GetById @Id;
 END TRY BEGIN CATCH SELECT 500 StatusCode,ERROR_MESSAGE() Message; END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Department_Update
 @Id BIGINT,@DepartmentCode NVARCHAR(20),@DepartmentName NVARCHAR(200),@Description NVARCHAR(500)=NULL,@IsActive BIT=1,@UserId BIGINT=NULL AS
BEGIN
 SET NOCOUNT ON;
 BEGIN TRY
  IF EXISTS(SELECT 1 FROM dbo.HR_Departments WHERE IsDeleted=0 AND Id<>@Id AND (DepartmentCode=@DepartmentCode OR DepartmentName=@DepartmentName))
  BEGIN SELECT 409 StatusCode,N'Department code or name already exists.' Message; RETURN; END
  UPDATE dbo.HR_Departments SET DepartmentCode=LTRIM(RTRIM(@DepartmentCode)),DepartmentName=LTRIM(RTRIM(@DepartmentName)),
   Description=@Description,IsActive=@IsActive,UpdatedOn=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE Id=@Id AND IsDeleted=0;
  IF @@ROWCOUNT=0 BEGIN SELECT 404 StatusCode,N'Department was not found.' Message; RETURN; END
  SELECT 200 StatusCode,N'Department updated.' Message; EXEC dbo.sp_HR_Department_GetById @Id;
 END TRY BEGIN CATCH SELECT 500 StatusCode,ERROR_MESSAGE() Message; END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Department_Delete @Id BIGINT,@UserId BIGINT=NULL AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM dbo.HR_Employees WHERE DepartmentId=@Id AND IsDeleted=0) OR EXISTS(SELECT 1 FROM dbo.HR_Designations WHERE DepartmentId=@Id AND IsDeleted=0)
 BEGIN SELECT 409 StatusCode,N'Department is in use.' Message; RETURN; END
 UPDATE dbo.HR_Departments SET IsDeleted=1,IsActive=0,DeletedOn=SYSUTCDATETIME(),DeletedBy=@UserId,UpdatedOn=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE Id=@Id AND IsDeleted=0;
 SELECT IIF(@@ROWCOUNT=0,404,200) StatusCode,IIF(@@ROWCOUNT=0,N'Department was not found.',N'Department deleted.') Message;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Designation_GetById @Id BIGINT AS
BEGIN SET NOCOUNT ON;
 SELECT x.Id,x.DesignationCode,x.DesignationName,x.DepartmentId,d.DepartmentName,x.Description,x.IsActive,x.CreatedOn,x.UpdatedOn,0 TotalCount
 FROM dbo.HR_Designations x JOIN dbo.HR_Departments d ON d.Id=x.DepartmentId WHERE x.Id=@Id AND x.IsDeleted=0;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Designation_GetList
 @Search NVARCHAR(200)=NULL,@IsActive BIT=NULL,@PageNumber INT=1,@PageSize INT=20,@SortBy NVARCHAR(50)=NULL,@SortDirection NVARCHAR(4)=N'ASC' AS
BEGIN
 SET NOCOUNT ON; SET @PageNumber=IIF(@PageNumber<1,1,@PageNumber); SET @PageSize=IIF(@PageSize<1,20,IIF(@PageSize>200,200,@PageSize));
 SET @SortBy=CASE WHEN @SortBy IN(N'DesignationCode',N'DesignationName',N'CreatedOn') THEN @SortBy ELSE N'DesignationName' END; SET @SortDirection=IIF(UPPER(@SortDirection)=N'DESC',N'DESC',N'ASC');
 DECLARE @sql NVARCHAR(MAX)=N'SELECT x.Id,x.DesignationCode,x.DesignationName,x.DepartmentId,d.DepartmentName,x.Description,x.IsActive,x.CreatedOn,x.UpdatedOn,COUNT(1) OVER() TotalCount
 FROM dbo.HR_Designations x JOIN dbo.HR_Departments d ON d.Id=x.DepartmentId WHERE x.IsDeleted=0 AND (@a IS NULL OR x.IsActive=@a)
 AND (@s IS NULL OR x.DesignationCode LIKE @s OR x.DesignationName LIKE @s OR d.DepartmentName LIKE @s) ORDER BY x.'+QUOTENAME(@SortBy)+N' '+@SortDirection+N' OFFSET @o ROWS FETCH NEXT @p ROWS ONLY';
 DECLARE @pattern NVARCHAR(210)=IIF(NULLIF(LTRIM(RTRIM(@Search)),N'') IS NULL,NULL,N'%'+LTRIM(RTRIM(@Search))+N'%');
 EXEC sp_executesql @sql,N'@a BIT,@s NVARCHAR(210),@o INT,@p INT',@a=@IsActive,@s=@pattern,@o=(@PageNumber-1)*@PageSize,@p=@PageSize;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Designation_Create
 @DesignationCode NVARCHAR(20),@DesignationName NVARCHAR(200),@DepartmentId BIGINT,@Description NVARCHAR(500)=NULL,@IsActive BIT=1,@UserId BIGINT=NULL AS
BEGIN SET NOCOUNT ON;
 BEGIN TRY
  IF NOT EXISTS(SELECT 1 FROM dbo.HR_Departments WHERE Id=@DepartmentId AND IsDeleted=0) BEGIN SELECT 404 StatusCode,N'Department was not found.' Message; RETURN; END
  IF EXISTS(SELECT 1 FROM dbo.HR_Designations WHERE DesignationCode=@DesignationCode AND IsDeleted=0) BEGIN SELECT 409 StatusCode,N'Designation code already exists.' Message; RETURN; END
  INSERT dbo.HR_Designations(DesignationCode,DesignationName,DepartmentId,Description,IsActive,CreatedBy) VALUES(LTRIM(RTRIM(@DesignationCode)),LTRIM(RTRIM(@DesignationName)),@DepartmentId,@Description,@IsActive,@UserId);
  DECLARE @Id BIGINT=SCOPE_IDENTITY(); SELECT 201 StatusCode,N'Designation created.' Message; EXEC dbo.sp_HR_Designation_GetById @Id;
 END TRY BEGIN CATCH SELECT 500 StatusCode,ERROR_MESSAGE() Message; END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Designation_Update
 @Id BIGINT,@DesignationCode NVARCHAR(20),@DesignationName NVARCHAR(200),@DepartmentId BIGINT,@Description NVARCHAR(500)=NULL,@IsActive BIT=1,@UserId BIGINT=NULL AS
BEGIN SET NOCOUNT ON;
 BEGIN TRY
  IF NOT EXISTS(SELECT 1 FROM dbo.HR_Departments WHERE Id=@DepartmentId AND IsDeleted=0) BEGIN SELECT 404 StatusCode,N'Department was not found.' Message; RETURN; END
  IF EXISTS(SELECT 1 FROM dbo.HR_Designations WHERE DesignationCode=@DesignationCode AND Id<>@Id AND IsDeleted=0) BEGIN SELECT 409 StatusCode,N'Designation code already exists.' Message; RETURN; END
  UPDATE dbo.HR_Designations SET DesignationCode=LTRIM(RTRIM(@DesignationCode)),DesignationName=LTRIM(RTRIM(@DesignationName)),DepartmentId=@DepartmentId,Description=@Description,IsActive=@IsActive,UpdatedOn=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE Id=@Id AND IsDeleted=0;
  IF @@ROWCOUNT=0 BEGIN SELECT 404 StatusCode,N'Designation was not found.' Message; RETURN; END
  SELECT 200 StatusCode,N'Designation updated.' Message; EXEC dbo.sp_HR_Designation_GetById @Id;
 END TRY BEGIN CATCH SELECT 500 StatusCode,ERROR_MESSAGE() Message; END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Designation_Delete @Id BIGINT,@UserId BIGINT=NULL AS
BEGIN SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM dbo.HR_Employees WHERE DesignationId=@Id AND IsDeleted=0) BEGIN SELECT 409 StatusCode,N'Designation is in use.' Message; RETURN; END
 UPDATE dbo.HR_Designations SET IsDeleted=1,IsActive=0,DeletedOn=SYSUTCDATETIME(),DeletedBy=@UserId,UpdatedOn=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE Id=@Id AND IsDeleted=0;
 SELECT IIF(@@ROWCOUNT=0,404,200) StatusCode,IIF(@@ROWCOUNT=0,N'Designation was not found.',N'Designation deleted.') Message;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Shift_GetById @Id BIGINT AS
BEGIN SET NOCOUNT ON;
 SELECT Id,ShiftCode,ShiftName,StartTime,EndTime,GraceMinutes,IsNightShift,WeeklyHours,IsActive,CreatedOn,UpdatedOn,0 TotalCount FROM dbo.HR_Shifts WHERE Id=@Id AND IsDeleted=0;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Shift_GetList
 @Search NVARCHAR(200)=NULL,@IsActive BIT=NULL,@PageNumber INT=1,@PageSize INT=20,@SortBy NVARCHAR(50)=NULL,@SortDirection NVARCHAR(4)=N'ASC' AS
BEGIN
 SET NOCOUNT ON; SET @PageNumber=IIF(@PageNumber<1,1,@PageNumber); SET @PageSize=IIF(@PageSize<1,20,IIF(@PageSize>200,200,@PageSize));
 SET @SortBy=CASE WHEN @SortBy IN(N'ShiftCode',N'ShiftName',N'StartTime',N'CreatedOn') THEN @SortBy ELSE N'ShiftName' END; SET @SortDirection=IIF(UPPER(@SortDirection)=N'DESC',N'DESC',N'ASC');
 DECLARE @sql NVARCHAR(MAX)=N'SELECT Id,ShiftCode,ShiftName,StartTime,EndTime,GraceMinutes,IsNightShift,WeeklyHours,IsActive,CreatedOn,UpdatedOn,COUNT(1) OVER() TotalCount FROM dbo.HR_Shifts
 WHERE IsDeleted=0 AND (@a IS NULL OR IsActive=@a) AND (@s IS NULL OR ShiftCode LIKE @s OR ShiftName LIKE @s) ORDER BY '+QUOTENAME(@SortBy)+N' '+@SortDirection+N' OFFSET @o ROWS FETCH NEXT @p ROWS ONLY';
 DECLARE @pattern NVARCHAR(210)=IIF(NULLIF(LTRIM(RTRIM(@Search)),N'') IS NULL,NULL,N'%'+LTRIM(RTRIM(@Search))+N'%');
 EXEC sp_executesql @sql,N'@a BIT,@s NVARCHAR(210),@o INT,@p INT',@a=@IsActive,@s=@pattern,@o=(@PageNumber-1)*@PageSize,@p=@PageSize;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Shift_Create
 @ShiftCode NVARCHAR(20),@ShiftName NVARCHAR(200),@StartTime TIME(0),@EndTime TIME(0),@GraceMinutes INT,@IsNightShift BIT,@WeeklyHours DECIMAL(6,2),@IsActive BIT=1,@UserId BIGINT=NULL AS
BEGIN SET NOCOUNT ON;
 BEGIN TRY
  IF EXISTS(SELECT 1 FROM dbo.HR_Shifts WHERE ShiftCode=@ShiftCode AND IsDeleted=0) BEGIN SELECT 409 StatusCode,N'Shift code already exists.' Message; RETURN; END
  INSERT dbo.HR_Shifts(ShiftCode,ShiftName,StartTime,EndTime,GraceMinutes,IsNightShift,WeeklyHours,IsActive,CreatedBy)
  VALUES(LTRIM(RTRIM(@ShiftCode)),LTRIM(RTRIM(@ShiftName)),@StartTime,@EndTime,@GraceMinutes,@IsNightShift,@WeeklyHours,@IsActive,@UserId);
  DECLARE @Id BIGINT=SCOPE_IDENTITY(); SELECT 201 StatusCode,N'Shift created.' Message; EXEC dbo.sp_HR_Shift_GetById @Id;
 END TRY BEGIN CATCH SELECT 500 StatusCode,ERROR_MESSAGE() Message; END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Shift_Update
 @Id BIGINT,@ShiftCode NVARCHAR(20),@ShiftName NVARCHAR(200),@StartTime TIME(0),@EndTime TIME(0),@GraceMinutes INT,@IsNightShift BIT,@WeeklyHours DECIMAL(6,2),@IsActive BIT=1,@UserId BIGINT=NULL AS
BEGIN SET NOCOUNT ON;
 BEGIN TRY
  IF EXISTS(SELECT 1 FROM dbo.HR_Shifts WHERE ShiftCode=@ShiftCode AND Id<>@Id AND IsDeleted=0) BEGIN SELECT 409 StatusCode,N'Shift code already exists.' Message; RETURN; END
  UPDATE dbo.HR_Shifts SET ShiftCode=LTRIM(RTRIM(@ShiftCode)),ShiftName=LTRIM(RTRIM(@ShiftName)),StartTime=@StartTime,EndTime=@EndTime,GraceMinutes=@GraceMinutes,
   IsNightShift=@IsNightShift,WeeklyHours=@WeeklyHours,IsActive=@IsActive,UpdatedOn=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE Id=@Id AND IsDeleted=0;
  IF @@ROWCOUNT=0 BEGIN SELECT 404 StatusCode,N'Shift was not found.' Message; RETURN; END
  SELECT 200 StatusCode,N'Shift updated.' Message; EXEC dbo.sp_HR_Shift_GetById @Id;
 END TRY BEGIN CATCH SELECT 500 StatusCode,ERROR_MESSAGE() Message; END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Shift_Delete @Id BIGINT,@UserId BIGINT=NULL AS
BEGIN SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM dbo.HR_Employees WHERE ShiftId=@Id AND IsDeleted=0) BEGIN SELECT 409 StatusCode,N'Shift is in use.' Message; RETURN; END
 UPDATE dbo.HR_Shifts SET IsDeleted=1,IsActive=0,DeletedOn=SYSUTCDATETIME(),DeletedBy=@UserId,UpdatedOn=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE Id=@Id AND IsDeleted=0;
 SELECT IIF(@@ROWCOUNT=0,404,200) StatusCode,IIF(@@ROWCOUNT=0,N'Shift was not found.',N'Shift deleted.') Message;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Employee_GetById @Id BIGINT AS
BEGIN SET NOCOUNT ON;
 SELECT e.Id,e.EmployeeCode,e.FirstName,e.LastName,e.Gender,e.DateOfBirth,e.JoiningDate,e.Mobile,e.Email,e.DepartmentId,d.DepartmentName,
  e.DesignationId,g.DesignationName,e.ReportingManagerId,CONCAT(m.FirstName,IIF(m.LastName IS NULL,N'',N' '+m.LastName)) ReportingManagerName,
  e.ShiftId,s.ShiftName,e.EmploymentType,e.Status,e.ProfilePhotoUrl,e.IsActive,e.CreatedOn,e.UpdatedOn
 FROM dbo.HR_Employees e JOIN dbo.HR_Departments d ON d.Id=e.DepartmentId JOIN dbo.HR_Designations g ON g.Id=e.DesignationId JOIN dbo.HR_Shifts s ON s.Id=e.ShiftId
 LEFT JOIN dbo.HR_Employees m ON m.Id=e.ReportingManagerId WHERE e.Id=@Id AND e.IsDeleted=0;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Employee_GetList
 @Search NVARCHAR(200)=NULL,@DepartmentId BIGINT=NULL,@DesignationId BIGINT=NULL,@Status INT=NULL,@IsActive BIT=NULL,
 @PageNumber INT=1,@PageSize INT=20,@SortBy NVARCHAR(50)=N'EmployeeCode',@SortDirection NVARCHAR(4)=N'ASC' AS
BEGIN
 SET NOCOUNT ON; SET @PageNumber=IIF(@PageNumber<1,1,@PageNumber); SET @PageSize=IIF(@PageSize<1,20,IIF(@PageSize>200,200,@PageSize));
 SET @SortBy=CASE WHEN @SortBy IN(N'EmployeeCode',N'FirstName',N'JoiningDate',N'Status') THEN @SortBy ELSE N'EmployeeCode' END; SET @SortDirection=IIF(UPPER(@SortDirection)=N'DESC',N'DESC',N'ASC');
 DECLARE @sql NVARCHAR(MAX)=N'SELECT e.Id,e.EmployeeCode,e.FirstName,e.LastName,e.Mobile,e.Email,e.DepartmentId,d.DepartmentName,e.DesignationId,g.DesignationName,
 e.ReportingManagerId,CONCAT(m.FirstName,IIF(m.LastName IS NULL,N'''',N'' ''+m.LastName)) ReportingManagerName,e.EmploymentType,e.Status,e.JoiningDate,e.IsActive,COUNT(1) OVER() TotalCount
 FROM dbo.HR_Employees e JOIN dbo.HR_Departments d ON d.Id=e.DepartmentId JOIN dbo.HR_Designations g ON g.Id=e.DesignationId LEFT JOIN dbo.HR_Employees m ON m.Id=e.ReportingManagerId
 WHERE e.IsDeleted=0 AND (@d IS NULL OR e.DepartmentId=@d) AND (@g IS NULL OR e.DesignationId=@g) AND (@st IS NULL OR e.Status=@st) AND (@a IS NULL OR e.IsActive=@a)
 AND (@s IS NULL OR e.EmployeeCode LIKE @s OR e.FirstName LIKE @s OR e.LastName LIKE @s OR e.Mobile LIKE @s OR e.Email LIKE @s)
 ORDER BY e.'+QUOTENAME(@SortBy)+N' '+@SortDirection+N' OFFSET @o ROWS FETCH NEXT @p ROWS ONLY';
 DECLARE @pattern NVARCHAR(210)=IIF(NULLIF(LTRIM(RTRIM(@Search)),N'') IS NULL,NULL,N'%'+LTRIM(RTRIM(@Search))+N'%');
 EXEC sp_executesql @sql,N'@d BIGINT,@g BIGINT,@st INT,@a BIT,@s NVARCHAR(210),@o INT,@p INT',@d=@DepartmentId,@g=@DesignationId,@st=@Status,@a=@IsActive,@s=@pattern,@o=(@PageNumber-1)*@PageSize,@p=@PageSize;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Employee_ValueExists @Field NVARCHAR(30),@Value NVARCHAR(200),@ExcludingId BIGINT=NULL AS
BEGIN SET NOCOUNT ON;
 SELECT CONVERT(BIT,IIF(EXISTS(SELECT 1 FROM dbo.HR_Employees WHERE IsDeleted=0 AND (@ExcludingId IS NULL OR Id<>@ExcludingId) AND
 ((@Field=N'EmployeeCode' AND EmployeeCode=LTRIM(RTRIM(@Value))) OR (@Field=N'Email' AND Email=LTRIM(RTRIM(@Value))) OR (@Field=N'Mobile' AND Mobile=LTRIM(RTRIM(@Value))))),1,0));
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Employee_Create
 @EmployeeCode NVARCHAR(30),@FirstName NVARCHAR(100),@LastName NVARCHAR(100)=NULL,@Gender INT,@DateOfBirth DATE=NULL,@JoiningDate DATE,
 @Mobile NVARCHAR(20)=NULL,@Email NVARCHAR(200)=NULL,@DepartmentId BIGINT,@DesignationId BIGINT,@ReportingManagerId BIGINT=NULL,@ShiftId BIGINT,
 @EmploymentType INT,@Status INT,@ProfilePhotoUrl NVARCHAR(1000)=NULL,@AddressesJson NVARCHAR(MAX)=NULL,@BankDetailsJson NVARCHAR(MAX)=NULL,@UserId BIGINT=NULL AS
BEGIN SET NOCOUNT ON; SET XACT_ABORT ON;
 BEGIN TRY
  IF EXISTS(SELECT 1 FROM dbo.HR_Employees WHERE IsDeleted=0 AND (EmployeeCode=@EmployeeCode OR (@Email IS NOT NULL AND Email=@Email) OR (@Mobile IS NOT NULL AND Mobile=@Mobile)))
  BEGIN SELECT 409 StatusCode,N'Employee code, email, or mobile already exists.' Message; RETURN; END
  IF NOT EXISTS(SELECT 1 FROM dbo.HR_Designations WHERE Id=@DesignationId AND DepartmentId=@DepartmentId AND IsDeleted=0) BEGIN SELECT 400 StatusCode,N'Designation does not belong to the department.' Message; RETURN; END
  BEGIN TRAN;
  INSERT dbo.HR_Employees(EmployeeCode,FirstName,LastName,Gender,DateOfBirth,JoiningDate,Mobile,Email,DepartmentId,DesignationId,ReportingManagerId,ShiftId,EmploymentType,Status,ProfilePhotoUrl,CreatedBy)
  VALUES(LTRIM(RTRIM(@EmployeeCode)),LTRIM(RTRIM(@FirstName)),NULLIF(LTRIM(RTRIM(@LastName)),N''),@Gender,@DateOfBirth,@JoiningDate,NULLIF(LTRIM(RTRIM(@Mobile)),N''),NULLIF(LTRIM(RTRIM(@Email)),N''),@DepartmentId,@DesignationId,@ReportingManagerId,@ShiftId,@EmploymentType,@Status,@ProfilePhotoUrl,@UserId);
  DECLARE @Id BIGINT=SCOPE_IDENTITY();
  IF ISJSON(@AddressesJson)=1
   INSERT dbo.HR_EmployeeAddresses(EmployeeId,AddressType,AddressLine1,AddressLine2,City,State,Country,Pincode,CreatedBy)
   SELECT @Id,AddressType,AddressLine1,AddressLine2,City,State,Country,Pincode,@UserId FROM OPENJSON(@AddressesJson)
   WITH(AddressType NVARCHAR(30) '$.addressType',AddressLine1 NVARCHAR(250) '$.addressLine1',AddressLine2 NVARCHAR(250) '$.addressLine2',City NVARCHAR(100) '$.city',State NVARCHAR(100) '$.state',Country NVARCHAR(100) '$.country',Pincode NVARCHAR(20) '$.pincode');
  IF ISJSON(@BankDetailsJson)=1
   INSERT dbo.HR_EmployeeBankAccounts(EmployeeId,BankName,AccountNumber,IFSCCode,BranchName,UPIId,CreatedBy)
   SELECT @Id,BankName,AccountNumber,IFSCCode,BranchName,UPIId,@UserId FROM OPENJSON(@BankDetailsJson)
   WITH(BankName NVARCHAR(150) '$.bankName',AccountNumber NVARCHAR(50) '$.accountNumber',IFSCCode NVARCHAR(20) '$.ifscCode',BranchName NVARCHAR(150) '$.branchName',UPIId NVARCHAR(100) '$.upiId');
  INSERT dbo.HR_LeaveBalances(EmployeeId,LeaveTypeId,OpeningBalance,UsedBalance,RemainingBalance,CreatedBy)
   SELECT @Id,Id,AnnualQuota,0,AnnualQuota,@UserId FROM dbo.HR_LeaveTypes WHERE IsDeleted=0 AND IsActive=1;
  COMMIT; SELECT 201 StatusCode,N'Employee created.' Message; EXEC dbo.sp_HR_Employee_GetById @Id;
 END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; SELECT 500 StatusCode,ERROR_MESSAGE() Message; END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Employee_Update
 @Id BIGINT,@EmployeeCode NVARCHAR(30),@FirstName NVARCHAR(100),@LastName NVARCHAR(100)=NULL,@Gender INT,@DateOfBirth DATE=NULL,@JoiningDate DATE,
 @Mobile NVARCHAR(20)=NULL,@Email NVARCHAR(200)=NULL,@DepartmentId BIGINT,@DesignationId BIGINT,@ReportingManagerId BIGINT=NULL,@ShiftId BIGINT,
 @EmploymentType INT,@Status INT,@ProfilePhotoUrl NVARCHAR(1000)=NULL,@AddressesJson NVARCHAR(MAX)=NULL,@UserId BIGINT=NULL AS
BEGIN SET NOCOUNT ON; SET XACT_ABORT ON;
 BEGIN TRY
  IF @ReportingManagerId=@Id BEGIN SELECT 400 StatusCode,N'Employee cannot report to themselves.' Message; RETURN; END
  IF EXISTS(SELECT 1 FROM dbo.HR_Employees WHERE Id<>@Id AND IsDeleted=0 AND (EmployeeCode=@EmployeeCode OR (@Email IS NOT NULL AND Email=@Email) OR (@Mobile IS NOT NULL AND Mobile=@Mobile)))
  BEGIN SELECT 409 StatusCode,N'Employee code, email, or mobile already exists.' Message; RETURN; END
  IF NOT EXISTS(SELECT 1 FROM dbo.HR_Designations WHERE Id=@DesignationId AND DepartmentId=@DepartmentId AND IsDeleted=0) BEGIN SELECT 400 StatusCode,N'Designation does not belong to the department.' Message; RETURN; END
  BEGIN TRAN;
  UPDATE dbo.HR_Employees SET EmployeeCode=LTRIM(RTRIM(@EmployeeCode)),FirstName=LTRIM(RTRIM(@FirstName)),LastName=NULLIF(LTRIM(RTRIM(@LastName)),N''),Gender=@Gender,DateOfBirth=@DateOfBirth,
   JoiningDate=@JoiningDate,Mobile=NULLIF(LTRIM(RTRIM(@Mobile)),N''),Email=NULLIF(LTRIM(RTRIM(@Email)),N''),DepartmentId=@DepartmentId,DesignationId=@DesignationId,
   ReportingManagerId=@ReportingManagerId,ShiftId=@ShiftId,EmploymentType=@EmploymentType,Status=@Status,ProfilePhotoUrl=@ProfilePhotoUrl,UpdatedOn=SYSUTCDATETIME(),UpdatedBy=@UserId
  WHERE Id=@Id AND IsDeleted=0;
  IF @@ROWCOUNT=0 BEGIN ROLLBACK; SELECT 404 StatusCode,N'Employee was not found.' Message; RETURN; END
  IF ISJSON(@AddressesJson)=1
  BEGIN
   UPDATE dbo.HR_EmployeeAddresses SET IsDeleted=1,DeletedOn=SYSUTCDATETIME(),DeletedBy=@UserId WHERE EmployeeId=@Id AND IsDeleted=0;
   INSERT dbo.HR_EmployeeAddresses(EmployeeId,AddressType,AddressLine1,AddressLine2,City,State,Country,Pincode,CreatedBy)
   SELECT @Id,AddressType,AddressLine1,AddressLine2,City,State,Country,Pincode,@UserId FROM OPENJSON(@AddressesJson)
   WITH(AddressType NVARCHAR(30) '$.addressType',AddressLine1 NVARCHAR(250) '$.addressLine1',AddressLine2 NVARCHAR(250) '$.addressLine2',City NVARCHAR(100) '$.city',State NVARCHAR(100) '$.state',Country NVARCHAR(100) '$.country',Pincode NVARCHAR(20) '$.pincode');
  END
  COMMIT; SELECT 200 StatusCode,N'Employee updated.' Message; EXEC dbo.sp_HR_Employee_GetById @Id;
 END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; SELECT 500 StatusCode,ERROR_MESSAGE() Message; END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Employee_Delete @Id BIGINT,@UserId BIGINT=NULL AS
BEGIN SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM dbo.HR_Employees WHERE ReportingManagerId=@Id AND IsDeleted=0) BEGIN SELECT 409 StatusCode,N'Employee is assigned as a reporting manager.' Message; RETURN; END
 UPDATE dbo.HR_Employees SET IsDeleted=1,Status=2,DeletedOn=SYSUTCDATETIME(),DeletedBy=@UserId,UpdatedOn=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE Id=@Id AND IsDeleted=0;
 SELECT IIF(@@ROWCOUNT=0,404,200) StatusCode,IIF(@@ROWCOUNT=0,N'Employee was not found.',N'Employee deleted.') Message;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Employee_GetDropdown @Search NVARCHAR(200)=NULL AS
BEGIN SET NOCOUNT ON;
 DECLARE @s NVARCHAR(210)=IIF(NULLIF(LTRIM(RTRIM(@Search)),N'') IS NULL,NULL,N'%'+LTRIM(RTRIM(@Search))+N'%');
 SELECT TOP(100) Id,EmployeeCode,CONCAT(FirstName,IIF(LastName IS NULL,N'',N' '+LastName)) EmployeeName FROM dbo.HR_Employees
 WHERE IsDeleted=0 AND Status=1 AND (@s IS NULL OR EmployeeCode LIKE @s OR FirstName LIKE @s OR LastName LIKE @s) ORDER BY FirstName,LastName;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Employee_GetReportingManagers @DepartmentId BIGINT=NULL,@ExcludingEmployeeId BIGINT=NULL AS
BEGIN SET NOCOUNT ON;
 SELECT Id,EmployeeCode,CONCAT(FirstName,IIF(LastName IS NULL,N'',N' '+LastName)) EmployeeName FROM dbo.HR_Employees
 WHERE IsDeleted=0 AND Status=1 AND (@DepartmentId IS NULL OR DepartmentId=@DepartmentId) AND (@ExcludingEmployeeId IS NULL OR Id<>@ExcludingEmployeeId) ORDER BY FirstName,LastName;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_EmployeeDocument_GetList @EmployeeId BIGINT AS
BEGIN SET NOCOUNT ON;
 SELECT Id,EmployeeId,DocumentType,FileName,FilePath,ExpiryDate,CreatedOn FROM dbo.HR_EmployeeDocuments WHERE EmployeeId=@EmployeeId AND IsDeleted=0 ORDER BY CreatedOn DESC;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_EmployeeDocument_Create
 @EmployeeId BIGINT,@DocumentType NVARCHAR(50),@FileName NVARCHAR(255),@FilePath NVARCHAR(1000),@ExpiryDate DATE=NULL,@UserId BIGINT=NULL AS
BEGIN SET NOCOUNT ON;
 IF NOT EXISTS(SELECT 1 FROM dbo.HR_Employees WHERE Id=@EmployeeId AND IsDeleted=0) BEGIN SELECT 404 StatusCode,N'Employee was not found.' Message; RETURN; END
 INSERT dbo.HR_EmployeeDocuments(EmployeeId,DocumentType,FileName,FilePath,ExpiryDate,CreatedBy) VALUES(@EmployeeId,@DocumentType,@FileName,@FilePath,@ExpiryDate,@UserId);
 DECLARE @Id BIGINT=SCOPE_IDENTITY(); SELECT 201 StatusCode,N'Employee document added.' Message;
 SELECT Id,EmployeeId,DocumentType,FileName,FilePath,ExpiryDate,CreatedOn FROM dbo.HR_EmployeeDocuments WHERE Id=@Id;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_EmployeeDocument_Delete @Id BIGINT,@UserId BIGINT=NULL AS
BEGIN SET NOCOUNT ON;
 UPDATE dbo.HR_EmployeeDocuments SET IsDeleted=1,DeletedOn=SYSUTCDATETIME(),DeletedBy=@UserId WHERE Id=@Id AND IsDeleted=0;
 SELECT IIF(@@ROWCOUNT=0,404,200) StatusCode,IIF(@@ROWCOUNT=0,N'Employee document was not found.',N'Employee document deleted.') Message;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_EmployeeBank_GetList @EmployeeId BIGINT AS
BEGIN SET NOCOUNT ON;
 SELECT Id,EmployeeId,BankName,AccountNumber,IFSCCode,BranchName,UPIId,CreatedOn FROM dbo.HR_EmployeeBankAccounts WHERE EmployeeId=@EmployeeId AND IsDeleted=0 ORDER BY CreatedOn DESC;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_EmployeeBank_Create
 @EmployeeId BIGINT,@BankName NVARCHAR(150),@AccountNumber NVARCHAR(50),@IFSCCode NVARCHAR(20),@BranchName NVARCHAR(150)=NULL,@UPIId NVARCHAR(100)=NULL,@UserId BIGINT=NULL AS
BEGIN SET NOCOUNT ON;
 IF NOT EXISTS(SELECT 1 FROM dbo.HR_Employees WHERE Id=@EmployeeId AND IsDeleted=0) BEGIN SELECT 404 StatusCode,N'Employee was not found.' Message; RETURN; END
 INSERT dbo.HR_EmployeeBankAccounts(EmployeeId,BankName,AccountNumber,IFSCCode,BranchName,UPIId,CreatedBy) VALUES(@EmployeeId,@BankName,@AccountNumber,@IFSCCode,@BranchName,@UPIId,@UserId);
 DECLARE @Id BIGINT=SCOPE_IDENTITY(); SELECT 201 StatusCode,N'Employee bank details added.' Message;
 SELECT Id,EmployeeId,BankName,AccountNumber,IFSCCode,BranchName,UPIId,CreatedOn FROM dbo.HR_EmployeeBankAccounts WHERE Id=@Id;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Attendance_GetById @Id BIGINT AS
BEGIN SET NOCOUNT ON;
 SELECT a.Id,a.EmployeeId,e.EmployeeCode,CONCAT(e.FirstName,IIF(e.LastName IS NULL,N'',N' '+e.LastName)) EmployeeName,a.AttendanceDate,a.CheckInTime,a.CheckOutTime,a.WorkingMinutes,a.OvertimeMinutes,a.AttendanceStatus,a.CreatedOn,0 TotalCount
 FROM dbo.HR_Attendance a JOIN dbo.HR_Employees e ON e.Id=a.EmployeeId WHERE a.Id=@Id AND a.IsDeleted=0;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Attendance_CheckIn @EmployeeId BIGINT,@CheckInTime DATETIME2(3)=NULL,@UserId BIGINT=NULL AS
BEGIN SET NOCOUNT ON;
 SET @CheckInTime=COALESCE(@CheckInTime,SYSUTCDATETIME()); DECLARE @date DATE=CONVERT(DATE,@CheckInTime);
 IF EXISTS(SELECT 1 FROM dbo.HR_Attendance WHERE EmployeeId=@EmployeeId AND AttendanceDate=@date AND IsDeleted=0) BEGIN SELECT 409 StatusCode,N'Attendance already exists for this employee and date.' Message; RETURN; END
 IF NOT EXISTS(SELECT 1 FROM dbo.HR_Employees WHERE Id=@EmployeeId AND IsDeleted=0 AND Status=1) BEGIN SELECT 404 StatusCode,N'Active employee was not found.' Message; RETURN; END
 INSERT dbo.HR_Attendance(EmployeeId,AttendanceDate,CheckInTime,AttendanceStatus,CreatedBy) VALUES(@EmployeeId,@date,@CheckInTime,1,@UserId);
 DECLARE @Id BIGINT=SCOPE_IDENTITY(); SELECT 201 StatusCode,N'Checked in.' Message; EXEC dbo.sp_HR_Attendance_GetById @Id;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Attendance_CheckOut @EmployeeId BIGINT,@CheckOutTime DATETIME2(3)=NULL,@UserId BIGINT=NULL AS
BEGIN SET NOCOUNT ON;
 SET @CheckOutTime=COALESCE(@CheckOutTime,SYSUTCDATETIME()); DECLARE @date DATE=CONVERT(DATE,@CheckOutTime),@Id BIGINT,@in DATETIME2(3);
 SELECT @Id=Id,@in=CheckInTime FROM dbo.HR_Attendance WHERE EmployeeId=@EmployeeId AND AttendanceDate=@date AND IsDeleted=0;
 IF @Id IS NULL BEGIN SELECT 404 StatusCode,N'Check-in was not found for this date.' Message; RETURN; END
 IF @in IS NULL OR @CheckOutTime<=@in BEGIN SELECT 400 StatusCode,N'Check-out must be after check-in.' Message; RETURN; END
 DECLARE @minutes INT=DATEDIFF(MINUTE,@in,@CheckOutTime);
 UPDATE dbo.HR_Attendance SET CheckOutTime=@CheckOutTime,WorkingMinutes=@minutes,OvertimeMinutes=IIF(@minutes>480,@minutes-480,0),UpdatedOn=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE Id=@Id;
 SELECT 200 StatusCode,N'Checked out.' Message; EXEC dbo.sp_HR_Attendance_GetById @Id;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Attendance_ManualEntry
 @EmployeeId BIGINT,@AttendanceDate DATE,@CheckInTime DATETIME2(3)=NULL,@CheckOutTime DATETIME2(3)=NULL,@AttendanceStatus INT,@UserId BIGINT=NULL AS
BEGIN SET NOCOUNT ON;
 IF @CheckInTime IS NOT NULL AND @CheckOutTime IS NOT NULL AND @CheckOutTime<=@CheckInTime BEGIN SELECT 400 StatusCode,N'Check-out must be after check-in.' Message; RETURN; END
 IF EXISTS(SELECT 1 FROM dbo.HR_Attendance WHERE EmployeeId=@EmployeeId AND AttendanceDate=@AttendanceDate AND IsDeleted=0) BEGIN SELECT 409 StatusCode,N'Attendance already exists for this employee and date.' Message; RETURN; END
 DECLARE @minutes INT=IIF(@CheckInTime IS NULL OR @CheckOutTime IS NULL,0,DATEDIFF(MINUTE,@CheckInTime,@CheckOutTime));
 INSERT dbo.HR_Attendance(EmployeeId,AttendanceDate,CheckInTime,CheckOutTime,WorkingMinutes,OvertimeMinutes,AttendanceStatus,CreatedBy)
 VALUES(@EmployeeId,@AttendanceDate,@CheckInTime,@CheckOutTime,@minutes,IIF(@minutes>480,@minutes-480,0),@AttendanceStatus,@UserId);
 DECLARE @Id BIGINT=SCOPE_IDENTITY(); SELECT 201 StatusCode,N'Attendance created.' Message; EXEC dbo.sp_HR_Attendance_GetById @Id;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Attendance_GetList
 @EmployeeId BIGINT=NULL,@DepartmentId BIGINT=NULL,@FromDate DATE=NULL,@ToDate DATE=NULL,@Status INT=NULL,@PageNumber INT=1,@PageSize INT=20 AS
BEGIN SET NOCOUNT ON;
 SET @PageNumber=IIF(@PageNumber<1,1,@PageNumber); SET @PageSize=IIF(@PageSize<1,20,IIF(@PageSize>200,200,@PageSize));
 SELECT a.Id,a.EmployeeId,e.EmployeeCode,CONCAT(e.FirstName,IIF(e.LastName IS NULL,N'',N' '+e.LastName)) EmployeeName,a.AttendanceDate,a.CheckInTime,a.CheckOutTime,a.WorkingMinutes,a.OvertimeMinutes,a.AttendanceStatus,a.CreatedOn,COUNT(1) OVER() TotalCount
 FROM dbo.HR_Attendance a JOIN dbo.HR_Employees e ON e.Id=a.EmployeeId WHERE a.IsDeleted=0 AND (@EmployeeId IS NULL OR a.EmployeeId=@EmployeeId) AND (@DepartmentId IS NULL OR e.DepartmentId=@DepartmentId)
 AND (@FromDate IS NULL OR a.AttendanceDate>=@FromDate) AND (@ToDate IS NULL OR a.AttendanceDate<=@ToDate) AND (@Status IS NULL OR a.AttendanceStatus=@Status)
 ORDER BY a.AttendanceDate DESC,e.EmployeeCode OFFSET (@PageNumber-1)*@PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Attendance_GetByEmployee @EmployeeId BIGINT,@FromDate DATE=NULL,@ToDate DATE=NULL AS
BEGIN SET NOCOUNT ON;
 SELECT a.Id,a.EmployeeId,e.EmployeeCode,CONCAT(e.FirstName,IIF(e.LastName IS NULL,N'',N' '+e.LastName)) EmployeeName,a.AttendanceDate,a.CheckInTime,a.CheckOutTime,a.WorkingMinutes,a.OvertimeMinutes,a.AttendanceStatus,a.CreatedOn,0 TotalCount
 FROM dbo.HR_Attendance a JOIN dbo.HR_Employees e ON e.Id=a.EmployeeId WHERE a.EmployeeId=@EmployeeId AND a.IsDeleted=0 AND (@FromDate IS NULL OR a.AttendanceDate>=@FromDate) AND (@ToDate IS NULL OR a.AttendanceDate<=@ToDate) ORDER BY a.AttendanceDate DESC;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_AttendanceAdjustment_Create @EmployeeId BIGINT,@AttendanceId BIGINT,@Reason NVARCHAR(500),@UserId BIGINT=NULL AS
BEGIN SET NOCOUNT ON;
 IF NOT EXISTS(SELECT 1 FROM dbo.HR_Attendance WHERE Id=@AttendanceId AND EmployeeId=@EmployeeId AND IsDeleted=0) BEGIN SELECT 404 StatusCode,N'Attendance was not found for the employee.' Message; RETURN; END
 IF EXISTS(SELECT 1 FROM dbo.HR_AttendanceAdjustments WHERE AttendanceId=@AttendanceId AND Status=1 AND IsDeleted=0) BEGIN SELECT 409 StatusCode,N'A pending adjustment already exists.' Message; RETURN; END
 INSERT dbo.HR_AttendanceAdjustments(EmployeeId,AttendanceId,Reason,Status,CreatedBy) VALUES(@EmployeeId,@AttendanceId,@Reason,1,@UserId);
 DECLARE @Id BIGINT=SCOPE_IDENTITY(); SELECT 201 StatusCode,N'Attendance adjustment requested.' Message;
 SELECT Id,EmployeeId,AttendanceId,Reason,Status,ApprovedBy,ApprovedOn,CreatedOn FROM dbo.HR_AttendanceAdjustments WHERE Id=@Id;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_AttendanceAdjustment_Decide @AdjustmentId BIGINT,@Approve BIT,@Remarks NVARCHAR(500)=NULL,@UserId BIGINT=NULL AS
BEGIN SET NOCOUNT ON;
 UPDATE dbo.HR_AttendanceAdjustments SET Status=IIF(@Approve=1,2,3),Remarks=@Remarks,ApprovedBy=@UserId,ApprovedOn=SYSUTCDATETIME(),UpdatedOn=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE Id=@AdjustmentId AND Status=1 AND IsDeleted=0;
 IF @@ROWCOUNT=0 BEGIN SELECT 404 StatusCode,N'Pending attendance adjustment was not found.' Message; RETURN; END
 SELECT 200 StatusCode,IIF(@Approve=1,N'Attendance adjustment approved.',N'Attendance adjustment rejected.') Message;
 SELECT Id,EmployeeId,AttendanceId,Reason,Status,ApprovedBy,ApprovedOn,CreatedOn FROM dbo.HR_AttendanceAdjustments WHERE Id=@AdjustmentId;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Attendance_MonthlyReport @EmployeeId BIGINT=NULL,@Month INT,@Year INT AS
BEGIN SET NOCOUNT ON;
 SELECT e.Id EmployeeId,e.EmployeeCode,CONCAT(e.FirstName,IIF(e.LastName IS NULL,N'',N' '+e.LastName)) EmployeeName,@Month PayrollMonth,@Year PayrollYear,
 SUM(IIF(a.AttendanceStatus=1,1,0)) PresentDays,SUM(IIF(a.AttendanceStatus=2,1,0)) AbsentDays,SUM(IIF(a.AttendanceStatus=3,1,0)) HalfDays,
 SUM(IIF(a.AttendanceStatus=4,1,0)) LeaveDays,SUM(IIF(a.AttendanceStatus=5,1,0)) Holidays,SUM(IIF(a.AttendanceStatus=6,1,0)) WeekOffDays,
 SUM(IIF(a.AttendanceStatus=7,1,0)) WfhDays,SUM(a.WorkingMinutes) WorkingMinutes,SUM(a.OvertimeMinutes) OvertimeMinutes
 FROM dbo.HR_Employees e JOIN dbo.HR_Attendance a ON a.EmployeeId=e.Id AND a.IsDeleted=0 AND MONTH(a.AttendanceDate)=@Month AND YEAR(a.AttendanceDate)=@Year
 WHERE e.IsDeleted=0 AND (@EmployeeId IS NULL OR e.Id=@EmployeeId) GROUP BY e.Id,e.EmployeeCode,e.FirstName,e.LastName ORDER BY e.EmployeeCode;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Attendance_DepartmentReport @DepartmentId BIGINT=NULL,@AttendanceDate DATE AS
BEGIN SET NOCOUNT ON;
 SELECT d.Id DepartmentId,d.DepartmentName,@AttendanceDate AttendanceDate,COUNT(e.Id) EmployeeCount,
 SUM(IIF(a.AttendanceStatus IN(1,7),1,0)) PresentCount,SUM(IIF(a.AttendanceStatus=2 OR a.Id IS NULL,1,0)) AbsentCount,
 SUM(IIF(a.AttendanceStatus=4,1,0)) LeaveCount,SUM(IIF(a.AttendanceStatus IN(3,5,6),1,0)) OtherCount
 FROM dbo.HR_Departments d JOIN dbo.HR_Employees e ON e.DepartmentId=d.Id AND e.IsDeleted=0 AND e.Status=1
 LEFT JOIN dbo.HR_Attendance a ON a.EmployeeId=e.Id AND a.AttendanceDate=@AttendanceDate AND a.IsDeleted=0
 WHERE d.IsDeleted=0 AND (@DepartmentId IS NULL OR d.Id=@DepartmentId) GROUP BY d.Id,d.DepartmentName ORDER BY d.DepartmentName;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Leave_GetById @Id BIGINT AS
BEGIN SET NOCOUNT ON;
 SELECT a.Id,a.EmployeeId,e.EmployeeCode,CONCAT(e.FirstName,IIF(e.LastName IS NULL,N'',N' '+e.LastName)) EmployeeName,a.LeaveTypeId,t.LeaveName,a.StartDate,a.EndDate,a.LeaveDays,a.Reason,a.Status,a.ApprovedBy,a.ApprovedOn,a.CreatedOn,0 TotalCount
 FROM dbo.HR_LeaveApplications a JOIN dbo.HR_Employees e ON e.Id=a.EmployeeId JOIN dbo.HR_LeaveTypes t ON t.Id=a.LeaveTypeId WHERE a.Id=@Id AND a.IsDeleted=0;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Leave_Apply @EmployeeId BIGINT,@LeaveTypeId BIGINT,@StartDate DATE,@EndDate DATE,@Reason NVARCHAR(500),@UserId BIGINT=NULL AS
BEGIN SET NOCOUNT ON;
 IF @EndDate<@StartDate BEGIN SELECT 400 StatusCode,N'End date must be on or after start date.' Message; RETURN; END
 IF NOT EXISTS(SELECT 1 FROM dbo.HR_LeaveBalances WHERE EmployeeId=@EmployeeId AND LeaveTypeId=@LeaveTypeId AND IsDeleted=0) BEGIN SELECT 404 StatusCode,N'Leave balance was not found.' Message; RETURN; END
 IF EXISTS(SELECT 1 FROM dbo.HR_LeaveApplications WHERE EmployeeId=@EmployeeId AND Status IN(1,2) AND IsDeleted=0 AND @StartDate<=EndDate AND @EndDate>=StartDate)
 BEGIN SELECT 409 StatusCode,N'Leave dates overlap an existing application.' Message; RETURN; END
 INSERT dbo.HR_LeaveApplications(EmployeeId,LeaveTypeId,StartDate,EndDate,Reason,Status,CreatedBy) VALUES(@EmployeeId,@LeaveTypeId,@StartDate,@EndDate,@Reason,1,@UserId);
 DECLARE @Id BIGINT=SCOPE_IDENTITY(); SELECT 201 StatusCode,N'Leave application submitted.' Message; EXEC dbo.sp_HR_Leave_GetById @Id;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Leave_Action @LeaveApplicationId BIGINT,@Action NVARCHAR(20),@EmployeeId BIGINT=NULL,@Remarks NVARCHAR(500)=NULL,@UserId BIGINT=NULL AS
BEGIN SET NOCOUNT ON; SET XACT_ABORT ON;
 BEGIN TRY
  DECLARE @status INT,@owner BIGINT,@type BIGINT,@days DECIMAL(8,2);
  SELECT @status=Status,@owner=EmployeeId,@type=LeaveTypeId,@days=LeaveDays FROM dbo.HR_LeaveApplications WITH(UPDLOCK,HOLDLOCK) WHERE Id=@LeaveApplicationId AND IsDeleted=0;
  IF @status IS NULL BEGIN SELECT 404 StatusCode,N'Leave application was not found.' Message; RETURN; END
  BEGIN TRAN;
  IF @Action=N'Approve'
  BEGIN
   IF @status<>1 BEGIN ROLLBACK; SELECT 409 StatusCode,N'Only pending leave can be approved.' Message; RETURN; END
   IF NOT EXISTS(SELECT 1 FROM dbo.HR_LeaveBalances WHERE EmployeeId=@owner AND LeaveTypeId=@type AND RemainingBalance>=@days AND IsDeleted=0)
   BEGIN ROLLBACK; SELECT 409 StatusCode,N'Insufficient leave balance.' Message; RETURN; END
   UPDATE dbo.HR_LeaveBalances SET UsedBalance=UsedBalance+@days,RemainingBalance=RemainingBalance-@days,UpdatedOn=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE EmployeeId=@owner AND LeaveTypeId=@type AND IsDeleted=0;
   UPDATE dbo.HR_LeaveApplications SET Status=2,Remarks=@Remarks,ApprovedBy=@UserId,ApprovedOn=SYSUTCDATETIME(),UpdatedOn=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE Id=@LeaveApplicationId;
  END
  ELSE IF @Action=N'Reject'
  BEGIN
   IF @status<>1 BEGIN ROLLBACK; SELECT 409 StatusCode,N'Only pending leave can be rejected.' Message; RETURN; END
   UPDATE dbo.HR_LeaveApplications SET Status=3,Remarks=@Remarks,ApprovedBy=@UserId,ApprovedOn=SYSUTCDATETIME(),UpdatedOn=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE Id=@LeaveApplicationId;
  END
  ELSE IF @Action=N'Cancel'
  BEGIN
   IF @EmployeeId IS NOT NULL AND @EmployeeId<>@owner BEGIN ROLLBACK; SELECT 403 StatusCode,N'Leave application does not belong to the employee.' Message; RETURN; END
   IF @status NOT IN(1,2) BEGIN ROLLBACK; SELECT 409 StatusCode,N'Leave application cannot be cancelled.' Message; RETURN; END
   IF @status=2 UPDATE dbo.HR_LeaveBalances SET UsedBalance=UsedBalance-@days,RemainingBalance=RemainingBalance+@days,UpdatedOn=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE EmployeeId=@owner AND LeaveTypeId=@type AND IsDeleted=0;
   UPDATE dbo.HR_LeaveApplications SET Status=4,Remarks=@Remarks,UpdatedOn=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE Id=@LeaveApplicationId;
  END
  ELSE BEGIN ROLLBACK; SELECT 400 StatusCode,N'Invalid leave action.' Message; RETURN; END
  COMMIT; SELECT 200 StatusCode,N'Leave action completed.' Message; EXEC dbo.sp_HR_Leave_GetById @LeaveApplicationId;
 END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; SELECT 500 StatusCode,ERROR_MESSAGE() Message; END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Leave_GetList
 @EmployeeId BIGINT=NULL,@LeaveTypeId BIGINT=NULL,@Status INT=NULL,@FromDate DATE=NULL,@ToDate DATE=NULL,@PageNumber INT=1,@PageSize INT=20 AS
BEGIN SET NOCOUNT ON;
 SET @PageNumber=IIF(@PageNumber<1,1,@PageNumber); SET @PageSize=IIF(@PageSize<1,20,IIF(@PageSize>200,200,@PageSize));
 SELECT a.Id,a.EmployeeId,e.EmployeeCode,CONCAT(e.FirstName,IIF(e.LastName IS NULL,N'',N' '+e.LastName)) EmployeeName,a.LeaveTypeId,t.LeaveName,a.StartDate,a.EndDate,a.LeaveDays,a.Reason,a.Status,a.ApprovedBy,a.ApprovedOn,a.CreatedOn,COUNT(1) OVER() TotalCount
 FROM dbo.HR_LeaveApplications a JOIN dbo.HR_Employees e ON e.Id=a.EmployeeId JOIN dbo.HR_LeaveTypes t ON t.Id=a.LeaveTypeId
 WHERE a.IsDeleted=0 AND (@EmployeeId IS NULL OR a.EmployeeId=@EmployeeId) AND (@LeaveTypeId IS NULL OR a.LeaveTypeId=@LeaveTypeId) AND (@Status IS NULL OR a.Status=@Status)
 AND (@FromDate IS NULL OR a.EndDate>=@FromDate) AND (@ToDate IS NULL OR a.StartDate<=@ToDate)
 ORDER BY a.CreatedOn DESC OFFSET (@PageNumber-1)*@PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Leave_GetBalance @EmployeeId BIGINT AS
BEGIN SET NOCOUNT ON;
 SELECT b.Id,b.EmployeeId,b.LeaveTypeId,t.LeaveCode,t.LeaveName,b.OpeningBalance,b.UsedBalance,b.RemainingBalance
 FROM dbo.HR_LeaveBalances b JOIN dbo.HR_LeaveTypes t ON t.Id=b.LeaveTypeId WHERE b.EmployeeId=@EmployeeId AND b.IsDeleted=0 ORDER BY t.LeaveName;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Leave_GetPendingApprovals @ReportingManagerId BIGINT=NULL,@PageNumber INT=1,@PageSize INT=20 AS
BEGIN SET NOCOUNT ON;
 SET @PageNumber=IIF(@PageNumber<1,1,@PageNumber); SET @PageSize=IIF(@PageSize<1,20,IIF(@PageSize>200,200,@PageSize));
 SELECT a.Id,a.EmployeeId,e.EmployeeCode,CONCAT(e.FirstName,IIF(e.LastName IS NULL,N'',N' '+e.LastName)) EmployeeName,a.LeaveTypeId,t.LeaveName,a.StartDate,a.EndDate,a.LeaveDays,a.Reason,a.Status,a.ApprovedBy,a.ApprovedOn,a.CreatedOn,COUNT(1) OVER() TotalCount
 FROM dbo.HR_LeaveApplications a JOIN dbo.HR_Employees e ON e.Id=a.EmployeeId JOIN dbo.HR_LeaveTypes t ON t.Id=a.LeaveTypeId
 WHERE a.IsDeleted=0 AND a.Status=1 AND (@ReportingManagerId IS NULL OR e.ReportingManagerId=@ReportingManagerId)
 ORDER BY a.CreatedOn OFFSET (@PageNumber-1)*@PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Payroll_GetRun @Id BIGINT AS
BEGIN SET NOCOUNT ON;
 SELECT Id,PayrollMonth,PayrollYear,Status,CreatedOn,UpdatedOn FROM dbo.HR_PayrollRuns WHERE Id=@Id AND IsDeleted=0;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Payroll_GetRunDetails @PayrollRunId BIGINT AS
BEGIN SET NOCOUNT ON;
 SELECT p.Id,p.PayrollRunId,p.EmployeeId,e.EmployeeCode,CONCAT(e.FirstName,IIF(e.LastName IS NULL,N'',N' '+e.LastName)) EmployeeName,p.PayableDays,p.GrossSalary,p.TotalDeduction,p.NetSalary
 FROM dbo.HR_PayrollDetails p JOIN dbo.HR_Employees e ON e.Id=p.EmployeeId WHERE p.PayrollRunId=@PayrollRunId AND p.IsDeleted=0 ORDER BY e.EmployeeCode;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Payroll_Process @PayrollMonth INT,@PayrollYear INT,@UserId BIGINT=NULL AS
BEGIN SET NOCOUNT ON; SET XACT_ABORT ON;
 BEGIN TRY
  IF @PayrollMonth NOT BETWEEN 1 AND 12 BEGIN SELECT 400 StatusCode,N'Payroll month is invalid.' Message; RETURN; END
  DECLARE @existing BIGINT=(SELECT Id FROM dbo.HR_PayrollRuns WHERE PayrollMonth=@PayrollMonth AND PayrollYear=@PayrollYear AND IsDeleted=0);
  IF @existing IS NOT NULL BEGIN SELECT 409 StatusCode,N'Payroll already exists for this period.' Message; RETURN; END
  DECLARE @days INT=DAY(EOMONTH(DATEFROMPARTS(@PayrollYear,@PayrollMonth,1)));
  BEGIN TRAN;
  INSERT dbo.HR_PayrollRuns(PayrollMonth,PayrollYear,Status,CreatedBy) VALUES(@PayrollMonth,@PayrollYear,2,@UserId);
  DECLARE @run BIGINT=SCOPE_IDENTITY();
  ;WITH Salary AS
  (
   SELECT e.Id EmployeeId,
    SUM(IIF(c.ComponentType=1,sc.Amount,0)) Earnings,
    SUM(IIF(c.ComponentType=2,sc.Amount,0)) Deductions
   FROM dbo.HR_Employees e
   CROSS APPLY(SELECT TOP(1) es.SalaryStructureId FROM dbo.HR_EmployeeSalaryStructures es WHERE es.EmployeeId=e.Id AND es.EffectiveDate<=EOMONTH(DATEFROMPARTS(@PayrollYear,@PayrollMonth,1)) AND es.IsDeleted=0 ORDER BY es.EffectiveDate DESC) x
   JOIN dbo.HR_SalaryStructureComponents sc ON sc.SalaryStructureId=x.SalaryStructureId AND sc.IsDeleted=0
   JOIN dbo.HR_SalaryComponents c ON c.Id=sc.SalaryComponentId AND c.IsDeleted=0
   WHERE e.IsDeleted=0 AND e.Status=1 GROUP BY e.Id
  ), Payable AS
  (
   SELECT e.Id EmployeeId,
    CONVERT(DECIMAL(8,2),COALESCE(SUM(CASE WHEN a.AttendanceStatus IN(1,5,6,7) THEN 1.0 WHEN a.AttendanceStatus=3 THEN 0.5 ELSE 0 END),0)
     +COALESCE((SELECT SUM(l.LeaveDays) FROM dbo.HR_LeaveApplications l JOIN dbo.HR_LeaveTypes t ON t.Id=l.LeaveTypeId AND t.IsPaidLeave=1
       WHERE l.EmployeeId=e.Id AND l.Status=2 AND l.IsDeleted=0 AND MONTH(l.StartDate)=@PayrollMonth AND YEAR(l.StartDate)=@PayrollYear),0)) PayableDays
   FROM dbo.HR_Employees e LEFT JOIN dbo.HR_Attendance a ON a.EmployeeId=e.Id AND a.IsDeleted=0 AND MONTH(a.AttendanceDate)=@PayrollMonth AND YEAR(a.AttendanceDate)=@PayrollYear
   WHERE e.IsDeleted=0 AND e.Status=1 GROUP BY e.Id
  )
  INSERT dbo.HR_PayrollDetails(PayrollRunId,EmployeeId,PayableDays,GrossSalary,TotalDeduction,NetSalary,CreatedBy)
  SELECT @run,s.EmployeeId,IIF(p.PayableDays>@days,@days,p.PayableDays),
   ROUND(s.Earnings*IIF(p.PayableDays>@days,@days,p.PayableDays)/@days,2),s.Deductions,
   ROUND(s.Earnings*IIF(p.PayableDays>@days,@days,p.PayableDays)/@days,2)-s.Deductions,@UserId
  FROM Salary s JOIN Payable p ON p.EmployeeId=s.EmployeeId;
  COMMIT; SELECT 201 StatusCode,N'Payroll processed.' Message; EXEC dbo.sp_HR_Payroll_GetRun @run;
 END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; SELECT 500 StatusCode,ERROR_MESSAGE() Message; END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Payroll_Approve @PayrollRunId BIGINT,@UserId BIGINT=NULL AS
BEGIN SET NOCOUNT ON;
 UPDATE dbo.HR_PayrollRuns SET Status=3,UpdatedOn=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE Id=@PayrollRunId AND Status=2 AND IsDeleted=0;
 IF @@ROWCOUNT=0 BEGIN SELECT 409 StatusCode,N'Processed payroll run was not found.' Message; RETURN; END
 SELECT 200 StatusCode,N'Payroll approved.' Message; EXEC dbo.sp_HR_Payroll_GetRun @PayrollRunId;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Payroll_GetHistory @EmployeeId BIGINT AS
BEGIN SET NOCOUNT ON;
 SELECT p.Id,p.PayrollRunId,p.EmployeeId,e.EmployeeCode,CONCAT(e.FirstName,IIF(e.LastName IS NULL,N'',N' '+e.LastName)) EmployeeName,p.PayableDays,p.GrossSalary,p.TotalDeduction,p.NetSalary
 FROM dbo.HR_PayrollDetails p JOIN dbo.HR_PayrollRuns r ON r.Id=p.PayrollRunId JOIN dbo.HR_Employees e ON e.Id=p.EmployeeId
 WHERE p.EmployeeId=@EmployeeId AND p.IsDeleted=0 AND r.IsDeleted=0 ORDER BY r.PayrollYear DESC,r.PayrollMonth DESC;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Payroll_GetPayslip @EmployeeId BIGINT,@PayrollMonth INT=NULL,@PayrollYear INT=NULL AS
BEGIN SET NOCOUNT ON;
 SELECT TOP(1) r.Id PayrollRunId,r.PayrollMonth,r.PayrollYear,p.EmployeeId,e.EmployeeCode,CONCAT(e.FirstName,IIF(e.LastName IS NULL,N'',N' '+e.LastName)) EmployeeName,
  p.PayableDays,p.GrossSalary,p.TotalDeduction,p.NetSalary,r.Status
 FROM dbo.HR_PayrollDetails p JOIN dbo.HR_PayrollRuns r ON r.Id=p.PayrollRunId JOIN dbo.HR_Employees e ON e.Id=p.EmployeeId
 WHERE p.EmployeeId=@EmployeeId AND p.IsDeleted=0 AND r.IsDeleted=0 AND (@PayrollMonth IS NULL OR r.PayrollMonth=@PayrollMonth) AND (@PayrollYear IS NULL OR r.PayrollYear=@PayrollYear)
 ORDER BY r.PayrollYear DESC,r.PayrollMonth DESC;
END;
GO

IF NOT EXISTS(SELECT 1 FROM dbo.HR_LeaveTypes WHERE LeaveCode=N'CL')
 INSERT dbo.HR_LeaveTypes(LeaveCode,LeaveName,AnnualQuota,IsPaidLeave) VALUES(N'CL',N'Casual Leave',12,1);
IF NOT EXISTS(SELECT 1 FROM dbo.HR_LeaveTypes WHERE LeaveCode=N'SL')
 INSERT dbo.HR_LeaveTypes(LeaveCode,LeaveName,AnnualQuota,IsPaidLeave) VALUES(N'SL',N'Sick Leave',12,1);
IF NOT EXISTS(SELECT 1 FROM dbo.HR_LeaveTypes WHERE LeaveCode=N'LWP')
 INSERT dbo.HR_LeaveTypes(LeaveCode,LeaveName,AnnualQuota,IsPaidLeave) VALUES(N'LWP',N'Leave Without Pay',365,0);
GO

IF OBJECT_ID(N'dbo.Pages',N'U') IS NOT NULL
BEGIN
 MERGE dbo.Pages AS t USING (VALUES
  (N'HR.Department',N'HR Departments',N'/hr/departments',N'building',100),
  (N'HR.Designation',N'HR Designations',N'/hr/designations',N'badge',101),
  (N'HR.Shift',N'HR Shifts',N'/hr/shifts',N'clock',102),
  (N'HR.Employee',N'HR Employees',N'/hr/employees',N'users',103),
  (N'HR.Attendance',N'HR Attendance',N'/hr/attendance',N'calendar',104),
  (N'HR.Leave',N'HR Leave',N'/hr/leaves',N'calendar-off',105),
  (N'HR.Payroll',N'HR Payroll',N'/hr/payroll',N'wallet',106)
 ) s(Name,DisplayName,Route,Icon,SortOrder) ON t.Name=s.Name
 WHEN MATCHED THEN UPDATE SET DisplayName=s.DisplayName,Route=s.Route,Icon=s.Icon,SortOrder=s.SortOrder,IsActive=1
 WHEN NOT MATCHED THEN INSERT(Name,DisplayName,Route,Icon,SortOrder,IsActive) VALUES(s.Name,s.DisplayName,s.Route,s.Icon,s.SortOrder,1);
END;
GO

IF OBJECT_ID(N'dbo.Roles',N'U') IS NOT NULL AND OBJECT_ID(N'dbo.Pages',N'U') IS NOT NULL AND OBJECT_ID(N'dbo.RolePermissions',N'U') IS NOT NULL
BEGIN
 DECLARE @role INT=(SELECT TOP(1) Id FROM dbo.Roles WHERE Name=N'SuperAdmin');
 IF @role IS NOT NULL
 MERGE dbo.RolePermissions AS t
 USING (SELECT @role RoleId,Id PageId FROM dbo.Pages WHERE Name LIKE N'HR.%') s
 ON t.RoleId=s.RoleId AND t.PageId=s.PageId
 WHEN MATCHED THEN UPDATE SET CanView=1,CanCreate=1,CanEdit=1,CanDelete=1,CanApprove=1
 WHEN NOT MATCHED THEN INSERT(RoleId,PageId,CanView,CanCreate,CanEdit,CanDelete,CanExport,CanApprove) VALUES(s.RoleId,s.PageId,1,1,1,1,0,1);
END;
GO
