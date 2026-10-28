using Cosmos.API.Controllers.HR;
using Cosmos.API.Security;
using Cosmos.Application.HR;
using Cosmos.Application.Validators;
using Cosmos.Domain.Security;
using Microsoft.SqlServer.TransactSql.ScriptDom;

namespace Cosmos.Tests.Hr;

public sealed class HrOperatorSetupTests
{
    [Fact]
    public void Salary_structure_rejects_duplicate_components_negative_amounts_and_excess_precision()
    {
        var validator = new SaveSalaryStructureValidator();
        Assert.False(validator.Validate(new SaveSalaryStructureCommand("Pay", [new(1, 100), new(1, 200)])).IsValid);
        Assert.False(validator.Validate(new SaveSalaryStructureCommand("Pay", [new(1, -1)])).IsValid);
        Assert.False(validator.Validate(new SaveSalaryStructureCommand("Pay", [new(1, 0.001m)])).IsValid);
        Assert.True(validator.Validate(new SaveSalaryStructureCommand("Pay", [new(1, 90071992547409.91m), new(2, 0.01m)])).IsValid);
    }

    [Fact]
    public void Leave_and_assignment_requests_require_real_identity_and_supported_decimal_values()
    {
        Assert.False(new SaveLeaveTypeValidator().Validate(new SaveLeaveTypeCommand("", "Leave", -1, true, true)).IsValid);
        Assert.False(new SaveEmployeeLeaveEntitlementValidator().Validate(new SaveEmployeeLeaveEntitlementCommand(0, 1, 12)).IsValid);
        Assert.False(new SaveEmployeeLeaveEntitlementValidator().Validate(new SaveEmployeeLeaveEntitlementCommand(1, 1, 0.001m)).IsValid);
        Assert.True(new SaveEmployeeLeaveEntitlementValidator().Validate(new SaveEmployeeLeaveEntitlementCommand(9007199254740993L, 1, 12.50m)).IsValid);
        Assert.False(new AssignSalaryStructureValidator().Validate(new AssignSalaryStructureCommand(1, 1, default)).IsValid);
        Assert.False(new GetPayrollRunsValidator().Validate(new GetPayrollRunsQuery(PageSize: 1000)).IsValid);
    }

    [Fact]
    public void Proposed_attendance_changes_require_reviewed_original_context_and_valid_time_order()
    {
        var validator = new AttendanceAdjustmentRequestValidator();
        Assert.False(validator.Validate(new AttendanceAdjustmentRequestCommand(1, 2, "Correction", ProposedAttendanceStatus: 1)).IsValid);
        Assert.False(validator.Validate(new AttendanceAdjustmentRequestCommand(1, 2, "Correction", 1, DateTime.UtcNow, DateTime.UtcNow.AddHours(-1), 2)).IsValid);
        Assert.True(validator.Validate(new AttendanceAdjustmentRequestCommand(1, 2, "Correction", 1, null, null, 2)).IsValid);
        Assert.True(validator.Validate(new AttendanceAdjustmentRequestCommand(1, 2, "Legacy decision-only request")).IsValid);
    }

    [Fact]
    public void Period_rate_selections_require_one_reviewed_versioned_assignment_per_employee()
    {
        var validator = new ProcessPayrollValidator();
        var selection = new PayrollRateSelectionRequest(9007199254740993L, 42, new byte[8], true);
        Assert.True(validator.Validate(new ProcessPayrollCommand(10, 2026, [selection])).IsValid);
        Assert.False(validator.Validate(new ProcessPayrollCommand(10, 2026, [selection, selection])).IsValid);
        Assert.False(validator.Validate(new ProcessPayrollCommand(10, 2026, [selection with { Reviewed = false }])).IsValid);
        Assert.False(validator.Validate(new ProcessPayrollCommand(10, 2026, [selection with { RowVersion = new byte[3] }])).IsValid);
    }

    [Theory]
    [InlineData(nameof(HrSetupController.CreateLeaveType), PermissionAction.Create)]
    [InlineData(nameof(HrSetupController.UpdateLeaveType), PermissionAction.Edit)]
    [InlineData(nameof(HrSetupController.SetEntitlement), PermissionAction.Edit)]
    [InlineData(nameof(HrSetupController.CreateComponent), PermissionAction.Create)]
    [InlineData(nameof(HrSetupController.UpdateComponent), PermissionAction.Edit)]
    [InlineData(nameof(HrSetupController.CreateStructure), PermissionAction.Create)]
    [InlineData(nameof(HrSetupController.UpdateStructure), PermissionAction.Edit)]
    [InlineData(nameof(HrSetupController.Assign), PermissionAction.Create)]
    [InlineData(nameof(HrSetupController.PendingAdjustments), PermissionAction.Approve)]
    public void Setup_actions_have_independent_server_permission_gates(string method, PermissionAction action)
    {
        var attribute = Assert.Single(typeof(HrSetupController).GetMethod(method)!.GetCustomAttributes(typeof(RequirePermissionAttribute), false).Cast<RequirePermissionAttribute>());
        Assert.Equal(action, Assert.IsType<PermissionAction>(attribute.Arguments![1]));
    }

    [Fact]
    public void Additive_hr_migration_is_valid_TSQL()
    {
        var root = new DirectoryInfo(AppContext.BaseDirectory);
        while (root is not null && !Directory.Exists(Path.Combine(root.FullName, "backend", "database"))) root = root.Parent;
        Assert.NotNull(root);
        var path = Path.Combine(root.FullName, "backend", "database", "migrations", "20261028_02_hr_operator_setup.sql");
        new TSql160Parser(true).Parse(new StringReader(File.ReadAllText(path)), out var errors);
        Assert.True(errors.Count == 0, string.Join(Environment.NewLine, errors.Select(error => $"Line {error.Line}: {error.Message}")));
    }
}
