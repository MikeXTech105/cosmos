/*
   Runtime/API contract repair migration.
   Prerequisites: 001_Full_Database_Setup.sql, 20260703_hr_employee_resignation_rejoin.sql,
   and 20260720_backend_api_frontend_fixes.sql.
*/
SET NOCOUNT ON;
SET XACT_ABORT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Entity_Exists
    @Entity NVARCHAR(30),
    @Id BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT CONVERT(BIT, CASE
        WHEN @Entity = N'Department' AND EXISTS (SELECT 1 FROM dbo.HR_Departments WHERE Id = @Id AND IsDeleted = 0 AND IsActive = 1) THEN 1
        WHEN @Entity = N'Designation' AND EXISTS (SELECT 1 FROM dbo.HR_Designations WHERE Id = @Id AND IsDeleted = 0 AND IsActive = 1) THEN 1
        WHEN @Entity = N'Shift' AND EXISTS (SELECT 1 FROM dbo.HR_Shifts WHERE Id = @Id AND IsDeleted = 0 AND IsActive = 1) THEN 1
        WHEN @Entity = N'Employee' AND EXISTS (SELECT 1 FROM dbo.HR_Employees WHERE Id = @Id AND IsDeleted = 0 AND IsActive = 1 AND Status = 1) THEN 1
        ELSE 0
    END);
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Employee_Create
    @EmployeeCode NVARCHAR(30),
    @FirstName NVARCHAR(100),
    @LastName NVARCHAR(100) = NULL,
    @Gender INT,
    @DateOfBirth DATE = NULL,
    @JoiningDate DATE,
    @Mobile NVARCHAR(20) = NULL,
    @Email NVARCHAR(200) = NULL,
    @DepartmentId BIGINT,
    @DesignationId BIGINT,
    @ReportingManagerId BIGINT = NULL,
    @ShiftId BIGINT,
    @EmploymentType INT,
    @Status INT,
    @ProfilePhotoUrl NVARCHAR(1000) = NULL,
    @AddressesJson NVARCHAR(MAX) = NULL,
    @BankDetailsJson NVARCHAR(MAX) = NULL,
    @UserId BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        IF @DateOfBirth IS NOT NULL AND @DateOfBirth >= @JoiningDate
        BEGIN SELECT 400 StatusCode, N'Date of birth must be before joining date.' Message; RETURN; END;
        IF @Status NOT BETWEEN 1 AND 4
        BEGIN SELECT 400 StatusCode, N'Employee status is invalid.' Message; RETURN; END;
        IF @Status = 3
        BEGIN SELECT 400 StatusCode, N'Use the resign endpoint to mark an employee as resigned.' Message; RETURN; END;
        IF @ReportingManagerId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.HR_Employees WHERE Id = @ReportingManagerId AND IsDeleted = 0 AND IsActive = 1 AND Status = 1)
        BEGIN SELECT 400 StatusCode, N'Reporting manager was not found or is inactive.' Message; RETURN; END;
        IF EXISTS (SELECT 1 FROM dbo.HR_Employees WHERE IsDeleted = 0 AND (EmployeeCode = @EmployeeCode OR (@Email IS NOT NULL AND Email = @Email) OR (@Mobile IS NOT NULL AND Mobile = @Mobile)))
        BEGIN SELECT 409 StatusCode, N'Employee code, email, or mobile already exists.' Message; RETURN; END;
        IF NOT EXISTS (SELECT 1 FROM dbo.HR_Designations WHERE Id = @DesignationId AND DepartmentId = @DepartmentId AND IsDeleted = 0 AND IsActive = 1)
        BEGIN SELECT 400 StatusCode, N'Designation does not belong to the active department.' Message; RETURN; END;
        IF NOT EXISTS (SELECT 1 FROM dbo.HR_Shifts WHERE Id = @ShiftId AND IsDeleted = 0 AND IsActive = 1)
        BEGIN SELECT 400 StatusCode, N'Shift was not found or is inactive.' Message; RETURN; END;

        BEGIN TRAN;
        INSERT dbo.HR_Employees
        (
            EmployeeCode, FirstName, LastName, Gender, DateOfBirth, JoiningDate, Mobile, Email,
            DepartmentId, DesignationId, ReportingManagerId, ShiftId, EmploymentType, Status,
            IsActive, ProfilePhotoUrl, CreatedBy
        )
        VALUES
        (
            LTRIM(RTRIM(@EmployeeCode)), LTRIM(RTRIM(@FirstName)), NULLIF(LTRIM(RTRIM(@LastName)), N''), @Gender, @DateOfBirth, @JoiningDate, NULLIF(LTRIM(RTRIM(@Mobile)), N''), NULLIF(LTRIM(RTRIM(@Email)), N''),
            @DepartmentId, @DesignationId, @ReportingManagerId, @ShiftId, @EmploymentType, @Status,
            CASE WHEN @Status = 1 THEN 1 ELSE 0 END, @ProfilePhotoUrl, @UserId
        );
        DECLARE @Id BIGINT = SCOPE_IDENTITY();
        IF ISJSON(@AddressesJson) = 1
            INSERT dbo.HR_EmployeeAddresses(EmployeeId, AddressType, AddressLine1, AddressLine2, City, State, Country, Pincode, CreatedBy)
            SELECT @Id, AddressType, AddressLine1, AddressLine2, City, State, Country, Pincode, @UserId
            FROM OPENJSON(@AddressesJson)
            WITH (AddressType NVARCHAR(30) '$.addressType', AddressLine1 NVARCHAR(250) '$.addressLine1', AddressLine2 NVARCHAR(250) '$.addressLine2', City NVARCHAR(100) '$.city', State NVARCHAR(100) '$.state', Country NVARCHAR(100) '$.country', Pincode NVARCHAR(20) '$.pincode');
        IF ISJSON(@BankDetailsJson) = 1
            INSERT dbo.HR_EmployeeBankAccounts(EmployeeId, BankName, AccountNumber, IFSCCode, BranchName, UPIId, CreatedBy)
            SELECT @Id, BankName, AccountNumber, IFSCCode, BranchName, UPIId, @UserId
            FROM OPENJSON(@BankDetailsJson)
            WITH (BankName NVARCHAR(150) '$.bankName', AccountNumber NVARCHAR(50) '$.accountNumber', IFSCCode NVARCHAR(20) '$.ifscCode', BranchName NVARCHAR(150) '$.branchName', UPIId NVARCHAR(100) '$.upiId');
        INSERT dbo.HR_LeaveBalances(EmployeeId, LeaveTypeId, OpeningBalance, UsedBalance, RemainingBalance, CreatedBy)
            SELECT @Id, Id, AnnualQuota, 0, AnnualQuota, @UserId FROM dbo.HR_LeaveTypes WHERE IsDeleted = 0 AND IsActive = 1;
        COMMIT;
        SELECT 201 StatusCode, N'Employee created.' Message;
        EXEC dbo.sp_HR_Employee_GetById @Id;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0 ROLLBACK;
        SELECT 500 StatusCode, ERROR_MESSAGE() Message;
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Employee_Update
    @Id BIGINT,
    @EmployeeCode NVARCHAR(30),
    @FirstName NVARCHAR(100),
    @LastName NVARCHAR(100) = NULL,
    @Gender INT,
    @DateOfBirth DATE = NULL,
    @JoiningDate DATE,
    @Mobile NVARCHAR(20) = NULL,
    @Email NVARCHAR(200) = NULL,
    @DepartmentId BIGINT,
    @DesignationId BIGINT,
    @ReportingManagerId BIGINT = NULL,
    @ShiftId BIGINT,
    @EmploymentType INT,
    @Status INT,
    @ProfilePhotoUrl NVARCHAR(1000) = NULL,
    @AddressesJson NVARCHAR(MAX) = NULL,
    @UserId BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        DECLARE @CurrentStatus INT;
        SELECT @CurrentStatus = Status FROM dbo.HR_Employees WHERE Id = @Id AND IsDeleted = 0;
        IF @CurrentStatus IS NULL
        BEGIN SELECT 404 StatusCode, N'Employee was not found.' Message; RETURN; END;
        IF @DateOfBirth IS NOT NULL AND @DateOfBirth >= @JoiningDate
        BEGIN SELECT 400 StatusCode, N'Date of birth must be before joining date.' Message; RETURN; END;
        IF @Status NOT BETWEEN 1 AND 4
        BEGIN SELECT 400 StatusCode, N'Employee status is invalid.' Message; RETURN; END;
        IF @ReportingManagerId = @Id
        BEGIN SELECT 400 StatusCode, N'Employee cannot report to themselves.' Message; RETURN; END;
        IF @ReportingManagerId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.HR_Employees WHERE Id = @ReportingManagerId AND IsDeleted = 0 AND IsActive = 1 AND Status = 1)
        BEGIN SELECT 400 StatusCode, N'Reporting manager was not found or is inactive.' Message; RETURN; END;
        IF @CurrentStatus = 3 AND @Status <> 3
        BEGIN SELECT 400 StatusCode, N'A resigned employee must be rejoined through the rejoin endpoint.' Message; RETURN; END;
        IF @CurrentStatus <> 3 AND @Status = 3
        BEGIN SELECT 400 StatusCode, N'Use the resign endpoint to mark an employee as resigned.' Message; RETURN; END;
        IF EXISTS (SELECT 1 FROM dbo.HR_Employees WHERE Id <> @Id AND IsDeleted = 0 AND (EmployeeCode = @EmployeeCode OR (@Email IS NOT NULL AND Email = @Email) OR (@Mobile IS NOT NULL AND Mobile = @Mobile)))
        BEGIN SELECT 409 StatusCode, N'Employee code, email, or mobile already exists.' Message; RETURN; END;
        IF NOT EXISTS (SELECT 1 FROM dbo.HR_Designations WHERE Id = @DesignationId AND DepartmentId = @DepartmentId AND IsDeleted = 0 AND IsActive = 1)
        BEGIN SELECT 400 StatusCode, N'Designation does not belong to the active department.' Message; RETURN; END;
        IF NOT EXISTS (SELECT 1 FROM dbo.HR_Shifts WHERE Id = @ShiftId AND IsDeleted = 0 AND IsActive = 1)
        BEGIN SELECT 400 StatusCode, N'Shift was not found or is inactive.' Message; RETURN; END;

        BEGIN TRAN;
        UPDATE dbo.HR_Employees
        SET EmployeeCode = LTRIM(RTRIM(@EmployeeCode)), FirstName = LTRIM(RTRIM(@FirstName)), LastName = NULLIF(LTRIM(RTRIM(@LastName)), N''), Gender = @Gender, DateOfBirth = @DateOfBirth,
            JoiningDate = @JoiningDate, Mobile = NULLIF(LTRIM(RTRIM(@Mobile)), N''), Email = NULLIF(LTRIM(RTRIM(@Email)), N''), DepartmentId = @DepartmentId, DesignationId = @DesignationId,
            ReportingManagerId = @ReportingManagerId, ShiftId = @ShiftId, EmploymentType = @EmploymentType, Status = @Status, IsActive = CASE WHEN @Status = 1 THEN 1 ELSE 0 END,
            ProfilePhotoUrl = @ProfilePhotoUrl, UpdatedOn = SYSUTCDATETIME(), UpdatedBy = @UserId
        WHERE Id = @Id AND IsDeleted = 0;
        IF ISJSON(@AddressesJson) = 1
        BEGIN
            UPDATE dbo.HR_EmployeeAddresses SET IsDeleted = 1, DeletedOn = SYSUTCDATETIME(), DeletedBy = @UserId WHERE EmployeeId = @Id AND IsDeleted = 0;
            INSERT dbo.HR_EmployeeAddresses(EmployeeId, AddressType, AddressLine1, AddressLine2, City, State, Country, Pincode, CreatedBy)
            SELECT @Id, AddressType, AddressLine1, AddressLine2, City, State, Country, Pincode, @UserId
            FROM OPENJSON(@AddressesJson)
            WITH (AddressType NVARCHAR(30) '$.addressType', AddressLine1 NVARCHAR(250) '$.addressLine1', AddressLine2 NVARCHAR(250) '$.addressLine2', City NVARCHAR(100) '$.city', State NVARCHAR(100) '$.state', Country NVARCHAR(100) '$.country', Pincode NVARCHAR(20) '$.pincode');
        END;
        COMMIT;
        SELECT 200 StatusCode, N'Employee updated.' Message;
        EXEC dbo.sp_HR_Employee_GetById @Id;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0 ROLLBACK;
        SELECT 500 StatusCode, ERROR_MESSAGE() Message;
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Employee_Resign
    @Id BIGINT,
    @LastWorkingDate DATE,
    @ResignationReason NVARCHAR(500) = NULL,
    @UserId BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        DECLARE @JoiningDate DATE, @Status INT, @IsDeleted BIT;
        SELECT @JoiningDate = JoiningDate, @Status = Status, @IsDeleted = IsDeleted FROM dbo.HR_Employees WHERE Id = @Id;
        IF @JoiningDate IS NULL OR @IsDeleted = 1 BEGIN SELECT 404 StatusCode, N'Employee was not found.' Message; RETURN; END;
        IF @Status = 3 BEGIN SELECT 400 StatusCode, N'Employee is already resigned.' Message; RETURN; END;
        IF @LastWorkingDate < @JoiningDate BEGIN SELECT 400 StatusCode, N'Last working date cannot be before joining date.' Message; RETURN; END;
        UPDATE dbo.HR_Employees
        SET Status = 3, IsActive = 0, ResignedDate = SYSUTCDATETIME(), LastWorkingDate = @LastWorkingDate, ResignationReason = NULLIF(LTRIM(RTRIM(@ResignationReason)), N''),
            IsDeleted = 0, DeletedOn = NULL, DeletedBy = NULL, UpdatedOn = SYSUTCDATETIME(), UpdatedBy = @UserId
        WHERE Id = @Id AND IsDeleted = 0;
        SELECT 200 StatusCode, N'Employee resigned.' Message;
        EXEC dbo.sp_HR_Employee_GetById @Id;
    END TRY
    BEGIN CATCH
        SELECT 500 StatusCode, ERROR_MESSAGE() Message;
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Employee_Rejoin
    @Id BIGINT,
    @RejoinedDate DATE = NULL,
    @RejoinRemarks NVARCHAR(500) = NULL,
    @UserId BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        DECLARE @Status INT, @IsDeleted BIT, @LastWorkingDate DATE, @EffectiveRejoinedDate DATE = COALESCE(@RejoinedDate, CONVERT(DATE, SYSUTCDATETIME()));
        SELECT @Status = Status, @IsDeleted = IsDeleted, @LastWorkingDate = LastWorkingDate FROM dbo.HR_Employees WHERE Id = @Id;
        IF @Status IS NULL OR @IsDeleted = 1 BEGIN SELECT 404 StatusCode, N'Employee was not found.' Message; RETURN; END;
        IF @Status <> 3 BEGIN SELECT 400 StatusCode, N'Only resigned employees can rejoin.' Message; RETURN; END;
        IF @LastWorkingDate IS NOT NULL AND @EffectiveRejoinedDate < @LastWorkingDate BEGIN SELECT 400 StatusCode, N'Rejoined date cannot be before last working date.' Message; RETURN; END;
        UPDATE dbo.HR_Employees
        SET Status = 1, IsActive = 1, RejoinedDate = CONVERT(DATETIME2(3), @EffectiveRejoinedDate), RejoinRemarks = NULLIF(LTRIM(RTRIM(@RejoinRemarks)), N''),
            IsDeleted = 0, DeletedOn = NULL, DeletedBy = NULL, UpdatedOn = SYSUTCDATETIME(), UpdatedBy = @UserId
        WHERE Id = @Id AND IsDeleted = 0;
        SELECT 200 StatusCode, N'Employee rejoined.' Message;
        EXEC dbo.sp_HR_Employee_GetById @Id;
    END TRY
    BEGIN CATCH
        SELECT 500 StatusCode, ERROR_MESSAGE() Message;
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Employee_Delete
    @Id BIGINT,
    @UserId BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM dbo.HR_Employees WHERE Id = @Id AND IsDeleted = 0 AND Status = 3)
    BEGIN SELECT 409 StatusCode, N'Resigned employees must be retained for lifecycle history.' Message; RETURN; END;
    IF EXISTS (SELECT 1 FROM dbo.HR_Employees WHERE ReportingManagerId = @Id AND IsDeleted = 0)
    BEGIN SELECT 409 StatusCode, N'Employee is assigned as a reporting manager.' Message; RETURN; END;
    UPDATE dbo.HR_Employees
    SET IsDeleted = 1, IsActive = 0, Status = 2, DeletedOn = SYSUTCDATETIME(), DeletedBy = @UserId, UpdatedOn = SYSUTCDATETIME(), UpdatedBy = @UserId
    WHERE Id = @Id AND IsDeleted = 0;
    SELECT IIF(@@ROWCOUNT = 0, 404, 200) StatusCode, IIF(@@ROWCOUNT = 0, N'Employee was not found.', N'Employee deleted.') Message;
END;
GO
