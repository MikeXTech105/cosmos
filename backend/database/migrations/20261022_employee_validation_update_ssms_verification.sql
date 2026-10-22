/* Safe verification: this script creates only a synthetic Employee inside a transaction and always rolls it back. */
SET NOCOUNT ON;
SET XACT_ABORT ON;

IF EXISTS (
    SELECT 1 FROM sys.columns c JOIN sys.tables t ON t.object_id = c.object_id JOIN sys.schemas s ON s.schema_id = t.schema_id
    WHERE s.name = N'dbo' AND t.name IN (N'HR_EmployeeAddresses', N'HR_EmployeeBankAccounts')
      AND c.name IN (N'AddressType', N'AddressLine1', N'BankName', N'AccountNumber', N'IFSCCode') AND c.is_nullable = 0
) THROW 51001, 'Employee validation migration has not made all required columns nullable.', 1;

IF OBJECT_ID(N'dbo.sp_HR_Employee_Create', N'P') IS NULL OR OBJECT_ID(N'dbo.sp_HR_Employee_Update', N'P') IS NULL OR OBJECT_ID(N'dbo.sp_HR_EmployeeBank_Create', N'P') IS NULL
    THROW 51002, 'One or more expected Employee stored procedures are missing.', 1;

DECLARE @DepartmentId BIGINT, @DesignationId BIGINT, @ShiftId BIGINT, @EmployeeId BIGINT, @Code NVARCHAR(30) = N'VERIFY-EMP-' + CONVERT(NVARCHAR(12), ABS(CHECKSUM(NEWID())));
SELECT TOP (1) @DesignationId = d.Id, @DepartmentId = d.DepartmentId FROM dbo.HR_Designations d JOIN dbo.HR_Departments dep ON dep.Id = d.DepartmentId AND dep.IsDeleted = 0 AND dep.IsActive = 1 WHERE d.IsDeleted = 0 AND d.IsActive = 1 ORDER BY d.Id;
SELECT TOP (1) @ShiftId = Id FROM dbo.HR_Shifts WHERE IsDeleted = 0 AND IsActive = 1 ORDER BY Id;
IF @DepartmentId IS NULL OR @DesignationId IS NULL OR @ShiftId IS NULL THROW 51003, 'An active Department, Designation, and Shift are required for the synthetic test.', 1;

DECLARE @EmployeesBefore INT = (SELECT COUNT(*) FROM dbo.HR_Employees);
BEGIN TRANSACTION;
BEGIN TRY
    EXEC dbo.sp_HR_Employee_Create @EmployeeCode = @Code, @FirstName = N'Validation', @LastName = N'Probe', @Gender = 1, @DateOfBirth = '1990-01-01', @JoiningDate = '2020-01-01', @Mobile = N'+14155552671', @Email = NULL, @DepartmentId = @DepartmentId, @DesignationId = @DesignationId, @ShiftId = @ShiftId, @EmploymentType = 1, @Status = 1, @AddressesJson = NULL, @BankDetailsJson = NULL;
    SELECT @EmployeeId = Id FROM dbo.HR_Employees WHERE EmployeeCode = @Code;
    IF @EmployeeId IS NULL THROW 51004, 'Synthetic Employee creation failed.', 1;
    EXEC dbo.sp_HR_Employee_Update @Id = @EmployeeId, @EmployeeCode = @Code, @FirstName = N'Validation', @LastName = N'Probe', @Gender = 1, @DateOfBirth = '1990-01-01', @JoiningDate = '2020-01-01', @Mobile = N'+14155552671', @Email = NULL, @DepartmentId = @DepartmentId, @DesignationId = @DesignationId, @ShiftId = @ShiftId, @EmploymentType = 1, @Status = 1, @AddressesJson = NULL;
    EXEC dbo.sp_HR_EmployeeBank_Create @EmployeeId = @EmployeeId, @BankName = NULL, @AccountNumber = NULL, @IFSCCode = NULL;
    IF NOT EXISTS (SELECT 1 FROM dbo.HR_EmployeeBankAccounts WHERE EmployeeId = @EmployeeId AND BankName IS NULL AND AccountNumber IS NULL AND IFSCCode IS NULL) THROW 51005, 'Optional bank detail test failed.', 1;
    CREATE TABLE #InvalidMobileResult (StatusCode INT, Message NVARCHAR(500));
    INSERT #InvalidMobileResult EXEC dbo.sp_HR_Employee_Update @Id = @EmployeeId, @EmployeeCode = @Code, @FirstName = N'Validation', @LastName = N'Probe', @Gender = 1, @DateOfBirth = '1990-01-01', @JoiningDate = '2020-01-01', @Mobile = N'abc', @Email = NULL, @DepartmentId = @DepartmentId, @DesignationId = @DesignationId, @ShiftId = @ShiftId, @EmploymentType = 1, @Status = 1;
    IF NOT EXISTS (SELECT 1 FROM #InvalidMobileResult WHERE StatusCode = 400) THROW 51006, 'Invalid mobile was unexpectedly accepted.', 1;
    ROLLBACK TRANSACTION;
    IF (SELECT COUNT(*) FROM dbo.HR_Employees) <> @EmployeesBefore THROW 51007, 'Rollback did not preserve existing Employee data.', 1;
    SELECT N'PASS: nullable columns, procedures, optional create/update/bank, invalid mobile rejection, and rollback preservation verified.' AS VerificationResult;
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
