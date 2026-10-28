using System.Text.RegularExpressions;
using Cosmos.Application.HR;
using Cosmos.Persistence.Connection;
using Cosmos.Persistence.Repositories;
using Cosmos.Shared.Exceptions;
using Dapper;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;

namespace Cosmos.Tests.Hr;

public sealed class HrOperatorSetupSqlIntegrationTests
{
    public const string Variable = "COSMOS_HR_INTEGRATION_CONNECTION_STRING";

    [HrSqlFact, Trait("Category", "SqlIntegration")]
    public async Task Maintained_setup_conserves_used_leave_blocks_missing_payroll_staff_and_preserves_processed_history()
    {
        var connectionString = Environment.GetEnvironmentVariable(Variable) ?? throw new InvalidOperationException("Explicit disposable HR connection required.");
        var builder = new SqlConnectionStringBuilder(connectionString);
        Assert.StartsWith("CosmosHrIntegrationTests_", builder.InitialCatalog, StringComparison.OrdinalIgnoreCase);
        await using var connection = new SqlConnection(connectionString); await connection.OpenAsync();
        Assert.Equal(builder.InitialCatalog, await connection.QuerySingleAsync<string>("SELECT DB_NAME()"));
        // This dedicated test catalog must contain schema, not company staff. Other active staff
        // would change payroll eligibility and should never be silently excluded by this fixture.
        Assert.Equal(0, await connection.QuerySingleAsync<int>("SELECT COUNT(*) FROM dbo.HR_Employees WHERE IsDeleted=0 AND Status=1"));
        var year = await connection.QuerySingleAsync<int>("SELECT ISNULL(MAX(PayrollYear),8999)+1 FROM dbo.HR_PayrollRuns WHERE PayrollYear>=9000");
        Assert.InRange(year, 9000, 9998);
        var token = "HRIT" + Guid.NewGuid().ToString("N")[..12];
        var employeeId = await connection.QuerySingleAsync<long>("""
            INSERT dbo.HR_Departments(DepartmentCode,DepartmentName) VALUES(@Code,@Code); DECLARE @D BIGINT=SCOPE_IDENTITY();
            INSERT dbo.HR_Designations(DesignationCode,DesignationName,DepartmentId) VALUES(@Code,@Code,@D); DECLARE @G BIGINT=SCOPE_IDENTITY();
            INSERT dbo.HR_Shifts(ShiftCode,ShiftName,StartTime,EndTime) VALUES(@Code,@Code,'08:00','16:00'); DECLARE @S BIGINT=SCOPE_IDENTITY();
            INSERT dbo.HR_Employees(EmployeeCode,FirstName,Gender,JoiningDate,DepartmentId,DesignationId,ShiftId,EmploymentType,Status)
            VALUES(@Code,N'Isolated HR fixture',1,'20200101',@D,@G,@S,1,1); SELECT CONVERT(BIGINT,SCOPE_IDENTITY());
            """, new { Code = token });
        var root = new DirectoryInfo(AppContext.BaseDirectory);
        while (root is not null && !Directory.Exists(Path.Combine(root.FullName, "backend", "database"))) root = root.Parent;
        Assert.NotNull(root);
        var migration = File.ReadAllText(Path.Combine(root.FullName, "backend", "database", "migrations", "20261028_02_hr_operator_setup.sql"));
        for (var repeat = 0; repeat < 2; repeat++)
            foreach (var batch in Regex.Split(migration, @"^\s*GO\s*$", RegexOptions.Multiline | RegexOptions.IgnoreCase).Where(batch => !string.IsNullOrWhiteSpace(batch)))
                await connection.ExecuteAsync(batch, commandTimeout: 60);
        Assert.Equal(token, await connection.QuerySingleAsync<string>("SELECT EmployeeCode FROM dbo.HR_Employees WHERE Id=@employeeId", new { employeeId }));
        var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?> { ["ConnectionStrings:CosmosDb"] = connectionString }).Build();
        var repository = new HrRepository(new SqlConnectionFactory(config));
        var ct = CancellationToken.None;
        var type = await repository.SaveLeaveTypeAsync(null, new(token, "Fixture paid leave", 10, true, true), null, ct);
        var entitlement = await repository.SaveLeaveEntitlementAsync(new(employeeId, type.Id, 10), null, ct);
        var leave = await repository.ApplyLeaveAsync(new(employeeId, type.Id, new(year, 2, 1), new(year, 2, 1), "Integration fixture"), null, ct);
        await repository.ActOnLeaveAsync(leave.Id, "Approve", employeeId, null, null, ct);
        var latest = Assert.Single(await repository.GetLeaveEntitlementsAsync(employeeId, ct));
        Assert.Equal(1, latest.UsedBalance); Assert.Equal(9, latest.RemainingBalance);
        await Assert.ThrowsAsync<CosmosException>(() => repository.SaveLeaveEntitlementAsync(new(employeeId, type.Id, 12, entitlement.RowVersion), null, ct));
        latest = await repository.SaveLeaveEntitlementAsync(new(employeeId, type.Id, 12.5m, latest.RowVersion), null, ct);
        Assert.Equal(1, latest.UsedBalance); Assert.Equal(11.5m, latest.RemainingBalance);
        await Assert.ThrowsAsync<CosmosException>(() => repository.SaveLeaveEntitlementAsync(new(employeeId, type.Id, 0, latest.RowVersion), null, ct));
        var correctionDay = await repository.ManualAttendanceAsync(new(employeeId, new(year, 2, 2), new DateTime(year, 2, 2, 8, 0, 0, DateTimeKind.Utc), new DateTime(year, 2, 2, 16, 0, 0, DateTimeKind.Utc), 2), null, ct);
        var correction = await repository.RequestAttendanceAdjustmentAsync(new(employeeId, correctionDay.Id, "Reviewed status and hours", 1, correctionDay.CheckInTime, new DateTime(year, 2, 2, 17, 0, 0, DateTimeKind.Utc), 2, correctionDay.CheckInTime, correctionDay.CheckOutTime), null, ct);
        await repository.DecideAttendanceAdjustmentAsync(correction.Id, true, "Verified", null, ct);
        var corrected = Assert.Single(await repository.GetEmployeeAttendanceAsync(employeeId, new(year, 2, 2), new(year, 2, 2), ct));
        Assert.Equal(1, corrected.AttendanceStatus); Assert.Equal(540, corrected.WorkingMinutes); Assert.Equal(60, corrected.OvertimeMinutes);
        Assert.Equal(1, await connection.QuerySingleAsync<int>("SELECT COUNT(*) FROM dbo.AuditLogs WHERE TableName=N'HR.Attendance' AND RecordId=CONVERT(NVARCHAR(100),@Id) AND ActionType=N'ApprovedCorrection'", new { Id = correctionDay.Id }));
        await Assert.ThrowsAsync<CosmosException>(() => repository.DecideAttendanceAdjustmentAsync(correction.Id, true, null, null, ct));
        var stale = await repository.RequestAttendanceAdjustmentAsync(new(employeeId, corrected.Id, "Concurrent correction fixture", 2, corrected.CheckInTime, corrected.CheckOutTime, 1, corrected.CheckInTime, corrected.CheckOutTime), null, ct);
        await connection.ExecuteAsync("UPDATE dbo.HR_Attendance SET UpdatedOn=SYSUTCDATETIME() WHERE Id=@Id", new { corrected.Id });
        await Assert.ThrowsAsync<CosmosException>(() => repository.DecideAttendanceAdjustmentAsync(stale.Id, true, null, null, ct));
        await repository.DecideAttendanceAdjustmentAsync(stale.Id, false, "Stale request rejected", null, ct);
        var period = new ProcessPayrollCommand(1, year);
        Assert.Contains(await repository.GetPayrollPreflightAsync(period, ct), row => row.EmployeeId == employeeId && row.BlockedReason != null);
        await Assert.ThrowsAsync<CosmosException>(() => repository.ProcessPayrollAsync(period, null, ct));
        Assert.Equal(0, await connection.QuerySingleAsync<int>("SELECT COUNT(*) FROM dbo.HR_PayrollRuns WHERE PayrollYear=@year AND PayrollMonth=1", new { year }));
        var earnings = await repository.SaveSalaryComponentAsync(null, new(token + " earnings", 1), null, ct);
        var deduction = await repository.SaveSalaryComponentAsync(null, new(token + " deduction", 2), null, ct);
        var structure = await repository.SaveSalaryStructureAsync(null, new(token, [new(earnings.Id, 1000), new(deduction.Id, 100)]), null, ct);
        await repository.AssignSalaryStructureAsync(new(employeeId, structure.Id, new(year, 1, 1)), null, ct);
        await Assert.ThrowsAsync<CosmosException>(() => repository.AssignSalaryStructureAsync(new(employeeId, structure.Id, new(year, 1, 1)), null, ct));
        Assert.Contains(await repository.GetPayrollPreflightAsync(period, ct), row => row.EmployeeId == employeeId && row.AttendanceDays == 0 && row.BlockedReason != null);
        for (var day = 1; day <= 31; day++) await repository.ManualAttendanceAsync(new(employeeId, new(year, 1, day), null, null, 1), null, ct);
        Assert.Null(Assert.Single(await repository.GetPayrollPreflightAsync(period, ct)).BlockedReason);
        var run = await repository.ProcessPayrollAsync(period, null, ct);
        var detail = Assert.Single(run.Details!); Assert.Equal(employeeId, detail.EmployeeId); Assert.Equal(1000, detail.GrossSalary); Assert.Equal(100, detail.TotalDeduction); Assert.Equal(900, detail.NetSalary);
        await Assert.ThrowsAsync<CosmosException>(() => repository.ProcessPayrollAsync(period, null, ct));
        await Assert.ThrowsAsync<CosmosException>(() => repository.AssignSalaryStructureAsync(new(employeeId, structure.Id, new(year, 1, 2)), null, ct));
        await Assert.ThrowsAsync<CosmosException>(() => repository.SaveSalaryStructureAsync(structure.Id, new(token, [new(earnings.Id, 2000)], structure.RowVersion), null, ct));
        var approved = await repository.ApprovePayrollAsync(run.Id, null, ct); Assert.Equal(3, approved.Status);
        Assert.Equal(900, (await repository.GetPayslipAsync(new(employeeId, 1, year), ct))!.NetSalary);
        var lockedDay = Assert.Single(await repository.GetEmployeeAttendanceAsync(employeeId, new(year, 1, 1), new(year, 1, 1), ct));
        await Assert.ThrowsAsync<CosmosException>(() => repository.RequestAttendanceAdjustmentAsync(new(employeeId, lockedDay.Id, "Protected posted period", 2, null, null, lockedDay.AttendanceStatus, lockedDay.CheckInTime, lockedDay.CheckOutTime), null, ct));
        await connection.ExecuteAsync("UPDATE dbo.HR_Employees SET Status=2 WHERE Id=@employeeId", new { employeeId });
        var resigned = await connection.QuerySingleAsync<long>("""
            INSERT dbo.HR_Employees(EmployeeCode,FirstName,Gender,JoiningDate,LastWorkingDate,DepartmentId,DesignationId,ShiftId,EmploymentType,Status)
            SELECT @Code,N'Resigned period fixture',1,DATEFROMPARTS(@year,3,10),DATEFROMPARTS(@year,3,20),DepartmentId,DesignationId,ShiftId,1,3 FROM dbo.HR_Employees WHERE Id=@employeeId;
            SELECT CONVERT(BIGINT,SCOPE_IDENTITY());
            """, new { Code = token + "R", year, employeeId });
        var partialStructure = await repository.SaveSalaryStructureAsync(null, new(token + " partial", [new(earnings.Id, 3100), new(deduction.Id, 100)]), null, ct);
        await repository.AssignSalaryStructureAsync(new(resigned, partialStructure.Id, new(year, 3, 10)), null, ct);
        for (var day = 1; day <= 31; day++) await repository.ManualAttendanceAsync(new(resigned, new(year, 3, day), null, null, 1), null, ct);
        await repository.SaveLeaveEntitlementAsync(new(resigned, type.Id, 30), null, ct);
        var crossMonthLeave = await repository.ApplyLeaveAsync(new(resigned, type.Id, new(year, 3, 19), new(year, 4, 2), "Cross-month fixture"), null, ct);
        await repository.ActOnLeaveAsync(crossMonthLeave.Id, "Approve", resigned, null, null, ct);
        var partialPeriod = new ProcessPayrollCommand(3, year);
        var blocked = Assert.Single(await repository.GetPayrollPreflightAsync(partialPeriod, ct));
        Assert.Equal(11, blocked.EmploymentDays); Assert.Contains("overlap", blocked.BlockedReason!, StringComparison.OrdinalIgnoreCase);
        await Assert.ThrowsAsync<CosmosException>(() => repository.ProcessPayrollAsync(partialPeriod, null, ct));
        // Isolated test records only: simulate HR correcting duplicate attendance evidence.
        await connection.ExecuteAsync("DELETE dbo.HR_Attendance WHERE EmployeeId=@resigned AND AttendanceDate BETWEEN DATEFROMPARTS(@year,3,19) AND DATEFROMPARTS(@year,3,20)", new { resigned, year });
        var partial = Assert.Single((await repository.ProcessPayrollAsync(partialPeriod, null, ct)).Details!);
        Assert.Equal(resigned, partial.EmployeeId); Assert.Equal(11, partial.PayableDays); Assert.Equal(1100, partial.GrossSalary); Assert.Equal(100, partial.TotalDeduction); Assert.Equal(1000, partial.NetSalary);
        var rejoined = await connection.QuerySingleAsync<long>("""
            INSERT dbo.HR_Employees(EmployeeCode,FirstName,Gender,JoiningDate,LastWorkingDate,RejoinedDate,DepartmentId,DesignationId,ShiftId,EmploymentType,Status)
            SELECT @Code,N'Rejoined fixture',1,DATEFROMPARTS(@year,1,1),DATEFROMPARTS(@year,5,5),DATEFROMPARTS(@year,5,10),DepartmentId,DesignationId,ShiftId,1,1 FROM dbo.HR_Employees WHERE Id=@employeeId;
            SELECT CONVERT(BIGINT,SCOPE_IDENTITY());
            """, new { Code = token + "J", year, employeeId });
        await repository.AssignSalaryStructureAsync(new(rejoined, partialStructure.Id, new(year, 1, 1)), null, ct);
        for (var day = 1; day <= 31; day++) await repository.ManualAttendanceAsync(new(rejoined, new(year, 5, day), null, null, 1), null, ct);
        Assert.Equal(27, Assert.Single(await repository.GetPayrollPreflightAsync(new(5, year), ct)).EmploymentDays);
        var rejoinPay = Assert.Single((await repository.ProcessPayrollAsync(new(5, year), null, ct)).Details!);
        Assert.Equal(27, rejoinPay.PayableDays); Assert.Equal(2700, rejoinPay.GrossSalary); Assert.Equal(2600, rejoinPay.NetSalary);
        await connection.ExecuteAsync("UPDATE dbo.HR_Employees SET JoiningDate=CONVERT(DATE,RejoinedDate) WHERE Id=@rejoined", new { rejoined });
        Assert.Contains("boundaries", Assert.Single(await repository.GetPayrollPreflightAsync(new(4, year), ct)).BlockedReason!, StringComparison.OrdinalIgnoreCase);
        await connection.ExecuteAsync("""
            INSERT dbo.AuditLogs(TableName,RecordId,ActionType,NewValues)
            VALUES(N'HR.Employees',CONVERT(NVARCHAR(100),@rejoined),N'Resign',@Snapshot);
            """, new { rejoined, Snapshot = System.Text.Json.JsonSerializer.Serialize(new { joiningDate = new DateOnly(year, 1, 1), lastWorkingDate = new DateOnly(year, 5, 5), status = 3 }) });
        var recoveredHistory = Assert.Single(await repository.GetPayrollPreflightAsync(new(4, year), ct));
        Assert.Equal(30, recoveredHistory.EmploymentDays); Assert.DoesNotContain("boundaries", recoveredHistory.BlockedReason ?? "", StringComparison.OrdinalIgnoreCase);
        await connection.ExecuteAsync("UPDATE dbo.HR_Employees SET Status=2 WHERE Id=@rejoined", new { rejoined });
        var missingCycle = await connection.QuerySingleAsync<long>("""
            INSERT dbo.HR_Employees(EmployeeCode,FirstName,Gender,JoiningDate,LastWorkingDate,RejoinedDate,DepartmentId,DesignationId,ShiftId,EmploymentType,Status)
            SELECT @Code,N'Missing middle-cycle fixture',1,DATEFROMPARTS(@year,1,1),DATEFROMPARTS(@year,4,5),DATEFROMPARTS(@year,5,1),DepartmentId,DesignationId,ShiftId,1,1 FROM dbo.HR_Employees WHERE Id=@employeeId;
            SELECT CONVERT(BIGINT,SCOPE_IDENTITY());
            """, new { Code = token + "M", year, employeeId });
        async Task Snapshot(object value) => await connection.ExecuteAsync("INSERT dbo.AuditLogs(TableName,RecordId,ActionType,NewValues) VALUES(N'HR.Employees',CONVERT(NVARCHAR(100),@Id),N'FixtureHistory',@Snapshot)", new { Id = missingCycle, Snapshot = System.Text.Json.JsonSerializer.Serialize(value) });
        await Snapshot(new { joiningDate = new DateOnly(year, 1, 1), lastWorkingDate = new DateOnly(year, 1, 5), status = 3 });
        await Snapshot(new { joiningDate = new DateOnly(year, 1, 1), rejoinedDate = new DateOnly(year, 2, 1), lastWorkingDate = new DateOnly(year, 1, 5), status = 1 });
        // The retained March rejoin lacks the preceding February last-working boundary.
        await Snapshot(new { joiningDate = new DateOnly(year, 1, 1), rejoinedDate = new DateOnly(year, 3, 1), status = 1 });
        var missingMiddle = (await repository.GetPayrollPreflightAsync(new(2, year), ct)).Single(row => row.EmployeeId == missingCycle);
        Assert.Contains("boundaries", missingMiddle.BlockedReason!, StringComparison.OrdinalIgnoreCase);
        await Snapshot(new { joiningDate = new DateOnly(year, 1, 1), rejoinedDate = new DateOnly(year, 2, 1), lastWorkingDate = new DateOnly(year, 2, 5), status = 3 });
        var repairedMiddle = (await repository.GetPayrollPreflightAsync(new(2, year), ct)).Single(row => row.EmployeeId == missingCycle);
        Assert.Equal(5, repairedMiddle.EmploymentDays); Assert.DoesNotContain("boundaries", repairedMiddle.BlockedReason ?? "", StringComparison.OrdinalIgnoreCase);
        await connection.ExecuteAsync("INSERT dbo.AuditLogs(TableName,RecordId,ActionType,NewValues) VALUES(N'HR.Employees',CONVERT(NVARCHAR(100),@Id),N'Rejoin',N'{}')", new { Id = missingCycle });
        var unknownMarker = (await repository.GetPayrollPreflightAsync(new(2, year), ct)).Single(row => row.EmployeeId == missingCycle);
        Assert.Contains("boundaries", unknownMarker.BlockedReason!, StringComparison.OrdinalIgnoreCase);
        Assert.Equal(0, await connection.QuerySingleAsync<int>("SELECT COUNT(*) FROM dbo.fn_HR_PayrollEmploymentDates(DATEFROMPARTS(@year,1,1),DATEFROMPARTS(@year,1,31)) WHERE EmployeeId=@missingCycle AND WorkDate=DATEFROMPARTS(@year,1,6)", new { year, missingCycle }));
        var firstRate = await repository.AssignSalaryStructureAsync(new(missingCycle, partialStructure.Id, new(year, 1, 1)), null, ct);
        await repository.AssignSalaryStructureAsync(new(missingCycle, structure.Id, new(year, 6, 15)), null, ct);
        var futureRate = await repository.AssignSalaryStructureAsync(new(missingCycle, structure.Id, new(year, 7, 1)), null, ct);
        for (var day = 1; day <= 30; day++) await repository.ManualAttendanceAsync(new(missingCycle, new(year, 6, day), null, null, 1), null, ct);
        var mixedPeriod = (await repository.GetPayrollPreflightAsync(new(6, year), ct)).Single(row => row.EmployeeId == missingCycle);
        Assert.True(mixedPeriod.RequiresRateSelection); Assert.Null(mixedPeriod.BlockedReason);
        Assert.Equal(2, (await repository.GetPayrollRateOptionsAsync(new(6, year), ct)).Count(row => row.EmployeeId == missingCycle));
        await Assert.ThrowsAsync<CosmosException>(() => repository.ProcessPayrollAsync(new(6, year), null, ct));
        var review = new PayrollRateSelectionRequest(missingCycle, firstRate.Id, firstRate.RowVersion, true);
        await Assert.ThrowsAsync<CosmosException>(() => repository.ProcessPayrollAsync(new(6, year, [review with { SalaryAssignmentId = futureRate.Id, RowVersion = futureRate.RowVersion }]), null, ct));
        await Assert.ThrowsAsync<CosmosException>(() => repository.ProcessPayrollAsync(new(6, year, [review with { Reviewed = false }]), null, ct));
        var unrelated = (await repository.GetSalaryAssignmentsAsync(employeeId, ct)).First();
        await Assert.ThrowsAsync<CosmosException>(() => repository.ProcessPayrollAsync(new(6, year, [review with { SalaryAssignmentId = unrelated.Id, RowVersion = unrelated.RowVersion }]), null, ct));
        await connection.ExecuteAsync("UPDATE dbo.HR_EmployeeSalaryStructures SET UpdatedOn=SYSUTCDATETIME() WHERE Id=@Id", new { firstRate.Id });
        await Assert.ThrowsAsync<CosmosException>(() => repository.ProcessPayrollAsync(new(6, year, [review]), null, ct));
        var latestRate = (await repository.GetSalaryAssignmentsAsync(missingCycle, ct)).Single(row => row.Id == firstRate.Id);
        var selectedRun = await repository.ProcessPayrollAsync(new(6, year, [review with { RowVersion = latestRate.RowVersion }]), null, ct);
        var selectedPay = Assert.Single(selectedRun.Details!); Assert.Equal(3100, selectedPay.GrossSalary); Assert.Equal(100, selectedPay.TotalDeduction); Assert.Equal(3000, selectedPay.NetSalary);
        Assert.Equal(firstRate.Id, await connection.QuerySingleAsync<long>("SELECT SalaryAssignmentId FROM dbo.HR_PayrollDetails WHERE PayrollRunId=@Id AND EmployeeId=@missingCycle", new { selectedRun.Id, missingCycle }));
        // Keep synthetic history as upgrade evidence; exclude these fixture workers from later runs.
        await connection.ExecuteAsync("UPDATE dbo.HR_Employees SET Status=2 WHERE Id IN(@employeeId,@resigned,@rejoined,@missingCycle)", new { employeeId, resigned, rejoined, missingCycle });
    }
}

public sealed class HrSqlFactAttribute : FactAttribute
{
    public HrSqlFactAttribute()
    {
        if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable(HrOperatorSetupSqlIntegrationTests.Variable)))
            Skip = "SQL not executed: prepare an isolated CosmosHrIntegrationTests_* catalog with the existing HR schema, then set COSMOS_HR_INTEGRATION_CONNECTION_STRING privately.";
    }
}
