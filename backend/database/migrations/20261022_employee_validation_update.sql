/*
    Employee validation update
    Prerequisite: HR employee tables and procedures installed by the existing HR migrations.
    This script is forward-only and intentionally changes only Employee address/bank nullability
    and the Employee create/update/bank stored procedures. Review and run in SSMS; do not run
    against production without the normal deployment review.
*/
SET NOCOUNT ON;
SET XACT_ABORT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF OBJECT_ID(N'dbo.HR_Employees', N'U') IS NULL
   OR OBJECT_ID(N'dbo.HR_EmployeeAddresses', N'U') IS NULL
   OR OBJECT_ID(N'dbo.HR_EmployeeBankAccounts', N'U') IS NULL
    THROW 51000, 'Expected Employee tables were not found. Apply the HR foundation migration first.', 1;
GO

BEGIN TRY
    BEGIN TRANSACTION;

    ALTER TABLE dbo.HR_EmployeeAddresses ALTER COLUMN AddressType NVARCHAR(30) NULL;
    ALTER TABLE dbo.HR_EmployeeAddresses ALTER COLUMN AddressLine1 NVARCHAR(250) NULL;
    ALTER TABLE dbo.HR_EmployeeBankAccounts ALTER COLUMN BankName NVARCHAR(150) NULL;
    ALTER TABLE dbo.HR_EmployeeBankAccounts ALTER COLUMN AccountNumber NVARCHAR(50) NULL;
    ALTER TABLE dbo.HR_EmployeeBankAccounts ALTER COLUMN IFSCCode NVARCHAR(20) NULL;

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Employee_Create
    @EmployeeCode NVARCHAR(30), @FirstName NVARCHAR(100), @LastName NVARCHAR(100) = NULL,
    @Gender INT, @DateOfBirth DATE = NULL, @JoiningDate DATE,
    @Mobile NVARCHAR(20) = NULL, @Email NVARCHAR(200) = NULL,
    @DepartmentId BIGINT, @DesignationId BIGINT, @ReportingManagerId BIGINT = NULL, @ShiftId BIGINT,
    @EmploymentType INT, @Status INT, @ProfilePhotoUrl NVARCHAR(1000) = NULL,
    @AddressesJson NVARCHAR(MAX) = NULL, @BankDetailsJson NVARCHAR(MAX) = NULL, @UserId BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    SET @Mobile = NULLIF(LTRIM(RTRIM(@Mobile)), N'');
    SET @Email = NULLIF(LTRIM(RTRIM(@Email)), N'');
    IF @Mobile IS NOT NULL AND (@Mobile LIKE N'%[^0-9+]%' OR CHARINDEX(N'+', @Mobile) > 1 OR LEN(@Mobile) - LEN(REPLACE(@Mobile, N'+', N'')) > 1 OR LEN(REPLACE(@Mobile, N'+', N'')) NOT BETWEEN 7 AND 15)
    BEGIN SELECT 400 StatusCode, N'Mobile number must contain 7 to 15 digits and may start with +.' Message; RETURN; END;
    BEGIN TRY
        IF @DateOfBirth IS NOT NULL AND @DateOfBirth >= @JoiningDate BEGIN SELECT 400 StatusCode, N'Date of birth must be before joining date.' Message; RETURN; END;
        IF @Status NOT BETWEEN 1 AND 4 OR @Status = 3 BEGIN SELECT 400 StatusCode, N'Employee status is invalid for create.' Message; RETURN; END;
        IF EXISTS (SELECT 1 FROM dbo.HR_Employees WHERE IsDeleted = 0 AND (EmployeeCode = LTRIM(RTRIM(@EmployeeCode)) OR (@Email IS NOT NULL AND Email = @Email) OR (@Mobile IS NOT NULL AND Mobile = @Mobile))) BEGIN SELECT 409 StatusCode, N'Employee code, email, or mobile already exists.' Message; RETURN; END;
        IF NOT EXISTS (SELECT 1 FROM dbo.HR_Designations WHERE Id = @DesignationId AND DepartmentId = @DepartmentId AND IsDeleted = 0 AND IsActive = 1) BEGIN SELECT 400 StatusCode, N'Designation does not belong to the active department.' Message; RETURN; END;
        IF NOT EXISTS (SELECT 1 FROM dbo.HR_Shifts WHERE Id = @ShiftId AND IsDeleted = 0 AND IsActive = 1) BEGIN SELECT 400 StatusCode, N'Shift was not found or is inactive.' Message; RETURN; END;
        IF @ReportingManagerId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.HR_Employees WHERE Id = @ReportingManagerId AND IsDeleted = 0 AND IsActive = 1 AND Status = 1) BEGIN SELECT 400 StatusCode, N'Reporting manager was not found or is inactive.' Message; RETURN; END;
        BEGIN TRANSACTION;
        INSERT dbo.HR_Employees(EmployeeCode, FirstName, LastName, Gender, DateOfBirth, JoiningDate, Mobile, Email, DepartmentId, DesignationId, ReportingManagerId, ShiftId, EmploymentType, Status, ProfilePhotoUrl, CreatedBy)
        VALUES(LTRIM(RTRIM(@EmployeeCode)), LTRIM(RTRIM(@FirstName)), NULLIF(LTRIM(RTRIM(@LastName)), N''), @Gender, @DateOfBirth, @JoiningDate, @Mobile, @Email, @DepartmentId, @DesignationId, @ReportingManagerId, @ShiftId, @EmploymentType, @Status, NULLIF(LTRIM(RTRIM(@ProfilePhotoUrl)), N''), @UserId);
        DECLARE @Id BIGINT = SCOPE_IDENTITY();
        IF ISJSON(@AddressesJson) = 1
            INSERT dbo.HR_EmployeeAddresses(EmployeeId, AddressType, AddressLine1, AddressLine2, City, State, Country, Pincode, CreatedBy)
            SELECT @Id, NULLIF(LTRIM(RTRIM(AddressType)), N''), NULLIF(LTRIM(RTRIM(AddressLine1)), N''), NULLIF(LTRIM(RTRIM(AddressLine2)), N''), NULLIF(LTRIM(RTRIM(City)), N''), NULLIF(LTRIM(RTRIM(State)), N''), NULLIF(LTRIM(RTRIM(Country)), N''), NULLIF(LTRIM(RTRIM(Pincode)), N''), @UserId
            FROM OPENJSON(@AddressesJson) WITH (AddressType NVARCHAR(30) '$.addressType', AddressLine1 NVARCHAR(250) '$.addressLine1', AddressLine2 NVARCHAR(250) '$.addressLine2', City NVARCHAR(100) '$.city', State NVARCHAR(100) '$.state', Country NVARCHAR(100) '$.country', Pincode NVARCHAR(20) '$.pincode');
        IF ISJSON(@BankDetailsJson) = 1
            INSERT dbo.HR_EmployeeBankAccounts(EmployeeId, BankName, AccountNumber, IFSCCode, BranchName, UPIId, CreatedBy)
            SELECT @Id, NULLIF(LTRIM(RTRIM(BankName)), N''), NULLIF(LTRIM(RTRIM(AccountNumber)), N''), NULLIF(LTRIM(RTRIM(IFSCCode)), N''), NULLIF(LTRIM(RTRIM(BranchName)), N''), NULLIF(LTRIM(RTRIM(UPIId)), N''), @UserId
            FROM OPENJSON(@BankDetailsJson) WITH (BankName NVARCHAR(150) '$.bankName', AccountNumber NVARCHAR(50) '$.accountNumber', IFSCCode NVARCHAR(20) '$.ifscCode', BranchName NVARCHAR(150) '$.branchName', UPIId NVARCHAR(100) '$.upiId');
        INSERT dbo.HR_LeaveBalances(EmployeeId, LeaveTypeId, OpeningBalance, UsedBalance, RemainingBalance, CreatedBy)
            SELECT @Id, Id, AnnualQuota, 0, AnnualQuota, @UserId FROM dbo.HR_LeaveTypes WHERE IsDeleted = 0 AND IsActive = 1;
        COMMIT TRANSACTION;
        SELECT 201 StatusCode, N'Employee created.' Message; EXEC dbo.sp_HR_Employee_GetById @Id;
    END TRY
    BEGIN CATCH IF XACT_STATE() <> 0 ROLLBACK TRANSACTION; SELECT 500 StatusCode, ERROR_MESSAGE() Message; END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Employee_Update
    @Id BIGINT, @EmployeeCode NVARCHAR(30), @FirstName NVARCHAR(100), @LastName NVARCHAR(100) = NULL,
    @Gender INT, @DateOfBirth DATE = NULL, @JoiningDate DATE,
    @Mobile NVARCHAR(20) = NULL, @Email NVARCHAR(200) = NULL,
    @DepartmentId BIGINT, @DesignationId BIGINT, @ReportingManagerId BIGINT = NULL, @ShiftId BIGINT,
    @EmploymentType INT, @Status INT, @ProfilePhotoUrl NVARCHAR(1000) = NULL,
    @AddressesJson NVARCHAR(MAX) = NULL, @UserId BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    SET @Mobile = NULLIF(LTRIM(RTRIM(@Mobile)), N''); SET @Email = NULLIF(LTRIM(RTRIM(@Email)), N'');
    IF @Mobile IS NOT NULL AND (@Mobile LIKE N'%[^0-9+]%' OR CHARINDEX(N'+', @Mobile) > 1 OR LEN(@Mobile) - LEN(REPLACE(@Mobile, N'+', N'')) > 1 OR LEN(REPLACE(@Mobile, N'+', N'')) NOT BETWEEN 7 AND 15)
    BEGIN SELECT 400 StatusCode, N'Mobile number must contain 7 to 15 digits and may start with +.' Message; RETURN; END;
    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM dbo.HR_Employees WHERE Id = @Id AND IsDeleted = 0) BEGIN SELECT 404 StatusCode, N'Employee was not found.' Message; RETURN; END;
        IF @DateOfBirth IS NOT NULL AND @DateOfBirth >= @JoiningDate BEGIN SELECT 400 StatusCode, N'Date of birth must be before joining date.' Message; RETURN; END;
        IF @Status NOT BETWEEN 1 AND 4 BEGIN SELECT 400 StatusCode, N'Employee status is invalid.' Message; RETURN; END;
        IF @ReportingManagerId = @Id BEGIN SELECT 400 StatusCode, N'Employee cannot report to themselves.' Message; RETURN; END;
        IF @ReportingManagerId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.HR_Employees WHERE Id = @ReportingManagerId AND IsDeleted = 0 AND IsActive = 1 AND Status = 1) BEGIN SELECT 400 StatusCode, N'Reporting manager was not found or is inactive.' Message; RETURN; END;
        IF (SELECT Status FROM dbo.HR_Employees WHERE Id = @Id AND IsDeleted = 0) = 3 AND @Status <> 3 BEGIN SELECT 400 StatusCode, N'A resigned employee must be rejoined through the rejoin endpoint.' Message; RETURN; END;
        IF (SELECT Status FROM dbo.HR_Employees WHERE Id = @Id AND IsDeleted = 0) <> 3 AND @Status = 3 BEGIN SELECT 400 StatusCode, N'Use the resign endpoint to mark an employee as resigned.' Message; RETURN; END;
        IF EXISTS (SELECT 1 FROM dbo.HR_Employees WHERE Id <> @Id AND IsDeleted = 0 AND (EmployeeCode = LTRIM(RTRIM(@EmployeeCode)) OR (@Email IS NOT NULL AND Email = @Email) OR (@Mobile IS NOT NULL AND Mobile = @Mobile))) BEGIN SELECT 409 StatusCode, N'Employee code, email, or mobile already exists.' Message; RETURN; END;
        IF NOT EXISTS (SELECT 1 FROM dbo.HR_Designations WHERE Id = @DesignationId AND DepartmentId = @DepartmentId AND IsDeleted = 0 AND IsActive = 1) BEGIN SELECT 400 StatusCode, N'Designation does not belong to the active department.' Message; RETURN; END;
        IF NOT EXISTS (SELECT 1 FROM dbo.HR_Shifts WHERE Id = @ShiftId AND IsDeleted = 0 AND IsActive = 1) BEGIN SELECT 400 StatusCode, N'Shift was not found or is inactive.' Message; RETURN; END;
        BEGIN TRANSACTION;
        UPDATE dbo.HR_Employees SET EmployeeCode = LTRIM(RTRIM(@EmployeeCode)), FirstName = LTRIM(RTRIM(@FirstName)), LastName = NULLIF(LTRIM(RTRIM(@LastName)), N''), Gender = @Gender, DateOfBirth = @DateOfBirth, JoiningDate = @JoiningDate, Mobile = @Mobile, Email = @Email, DepartmentId = @DepartmentId, DesignationId = @DesignationId, ReportingManagerId = @ReportingManagerId, ShiftId = @ShiftId, EmploymentType = @EmploymentType, Status = @Status, ProfilePhotoUrl = NULLIF(LTRIM(RTRIM(@ProfilePhotoUrl)), N''), UpdatedOn = SYSUTCDATETIME(), UpdatedBy = @UserId WHERE Id = @Id AND IsDeleted = 0;
        -- NULL means the address collection was omitted and must be preserved. [] explicitly clears it.
        IF ISJSON(@AddressesJson) = 1 BEGIN
            UPDATE dbo.HR_EmployeeAddresses SET IsDeleted = 1, DeletedOn = SYSUTCDATETIME(), DeletedBy = @UserId WHERE EmployeeId = @Id AND IsDeleted = 0;
            INSERT dbo.HR_EmployeeAddresses(EmployeeId, AddressType, AddressLine1, AddressLine2, City, State, Country, Pincode, CreatedBy)
            SELECT @Id, NULLIF(LTRIM(RTRIM(AddressType)), N''), NULLIF(LTRIM(RTRIM(AddressLine1)), N''), NULLIF(LTRIM(RTRIM(AddressLine2)), N''), NULLIF(LTRIM(RTRIM(City)), N''), NULLIF(LTRIM(RTRIM(State)), N''), NULLIF(LTRIM(RTRIM(Country)), N''), NULLIF(LTRIM(RTRIM(Pincode)), N''), @UserId
            FROM OPENJSON(@AddressesJson) WITH (AddressType NVARCHAR(30) '$.addressType', AddressLine1 NVARCHAR(250) '$.addressLine1', AddressLine2 NVARCHAR(250) '$.addressLine2', City NVARCHAR(100) '$.city', State NVARCHAR(100) '$.state', Country NVARCHAR(100) '$.country', Pincode NVARCHAR(20) '$.pincode');
        END;
        COMMIT TRANSACTION;
        SELECT 200 StatusCode, N'Employee updated.' Message; EXEC dbo.sp_HR_Employee_GetById @Id;
    END TRY
    BEGIN CATCH IF XACT_STATE() <> 0 ROLLBACK TRANSACTION; SELECT 500 StatusCode, ERROR_MESSAGE() Message; END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_EmployeeBank_Create
    @EmployeeId BIGINT, @BankName NVARCHAR(150) = NULL, @AccountNumber NVARCHAR(50) = NULL,
    @IFSCCode NVARCHAR(20) = NULL, @BranchName NVARCHAR(150) = NULL, @UPIId NVARCHAR(100) = NULL, @UserId BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    IF NOT EXISTS (SELECT 1 FROM dbo.HR_Employees WHERE Id = @EmployeeId AND IsDeleted = 0) BEGIN SELECT 404 StatusCode, N'Employee was not found.' Message; RETURN; END;
    INSERT dbo.HR_EmployeeBankAccounts(EmployeeId, BankName, AccountNumber, IFSCCode, BranchName, UPIId, CreatedBy)
    VALUES(@EmployeeId, NULLIF(LTRIM(RTRIM(@BankName)), N''), NULLIF(LTRIM(RTRIM(@AccountNumber)), N''), NULLIF(LTRIM(RTRIM(@IFSCCode)), N''), NULLIF(LTRIM(RTRIM(@BranchName)), N''), NULLIF(LTRIM(RTRIM(@UPIId)), N''), @UserId);
    DECLARE @Id BIGINT = SCOPE_IDENTITY(); SELECT 201 StatusCode, N'Employee bank details added.' Message;
    SELECT Id, EmployeeId, BankName, AccountNumber, IFSCCode, BranchName, UPIId, CreatedOn FROM dbo.HR_EmployeeBankAccounts WHERE Id = @Id;
END;
GO
