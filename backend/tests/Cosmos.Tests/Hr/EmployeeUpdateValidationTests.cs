using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Application.HR;
using Cosmos.Application.Services;
using Cosmos.Application.Validators;
using Cosmos.Contracts.HR;
using Cosmos.Domain.HR;
using Cosmos.Shared.Exceptions;
using Cosmos.Shared.Security;
using FluentValidation;
using Moq;

namespace Cosmos.Tests.Hr;

public sealed class EmployeeUpdateValidationTests
{
    private readonly Mock<IHrRepository> _repository = new();

    public EmployeeUpdateValidationTests()
    {
        _repository.Setup(x => x.EmployeeValueExistsAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<long?>(), It.IsAny<CancellationToken>())).ReturnsAsync(false);
        _repository.Setup(x => x.EntityExistsAsync(It.IsAny<string>(), It.IsAny<long>(), It.IsAny<CancellationToken>())).ReturnsAsync(true);
    }

    [Fact]
    public async Task Valid_update_with_unchanged_unique_values_uses_the_route_id_as_the_exclusion()
    {
        var validator = new UpdateEmployeeValidator(_repository.Object);
        var context = new ValidationContext<UpdateEmployeeCommand>(ValidCommand());
        context.RootContextData["Id"] = 42L;

        var result = await validator.ValidateAsync(context);

        Assert.True(result.IsValid);
        _repository.Verify(x => x.EmployeeValueExistsAsync("EmployeeCode", "EMP-42", 42L, It.IsAny<CancellationToken>()), Times.Once);
        _repository.Verify(x => x.EmployeeValueExistsAsync("Email", "employee@example.com", 42L, It.IsAny<CancellationToken>()), Times.Once);
        _repository.Verify(x => x.EmployeeValueExistsAsync("Mobile", "9000000000", 42L, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Duplicate_unique_value_for_another_employee_returns_a_field_error()
    {
        _repository.Setup(x => x.EmployeeValueExistsAsync("Email", "employee@example.com", 42L, It.IsAny<CancellationToken>())).ReturnsAsync(true);
        var validator = new UpdateEmployeeValidator(_repository.Object);
        var context = new ValidationContext<UpdateEmployeeCommand>(ValidCommand());
        context.RootContextData["Id"] = 42L;

        var result = await validator.ValidateAsync(context);

        Assert.Contains(result.Errors, x => x.PropertyName == nameof(UpdateEmployeeCommand.Email) && x.ErrorMessage == "Email already exists.");
    }

    [Fact]
    public async Task Invalid_foreign_key_returns_a_field_error()
    {
        _repository.Setup(x => x.EntityExistsAsync("Department", 1, It.IsAny<CancellationToken>())).ReturnsAsync(false);

        var result = await new UpdateEmployeeValidator(_repository.Object).ValidateAsync(ValidCommand());

        Assert.Contains(result.Errors, x => x.PropertyName == nameof(UpdateEmployeeCommand.DepartmentId));
    }

    [Fact]
    public async Task Nullable_reporting_manager_is_valid_and_does_not_query_employee_existence()
    {
        var result = await new UpdateEmployeeValidator(_repository.Object).ValidateAsync(ValidCommand() with { ReportingManagerId = null });

        Assert.True(result.IsValid);
        _repository.Verify(x => x.EntityExistsAsync("Employee", It.IsAny<long>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Undefined_employee_enum_values_return_field_errors()
    {
        var result = await new UpdateEmployeeValidator(_repository.Object).ValidateAsync(ValidCommand() with
        {
            Gender = 99,
            EmploymentType = 99,
            Status = 99
        });

        Assert.Contains(result.Errors, x => x.PropertyName == nameof(UpdateEmployeeCommand.Gender));
        Assert.Contains(result.Errors, x => x.PropertyName == nameof(UpdateEmployeeCommand.EmploymentType));
        Assert.Contains(result.Errors, x => x.PropertyName == nameof(UpdateEmployeeCommand.Status));
    }

    [Theory]
    [InlineData(" +1 (415) 555-2671 ", "+14155552671")]
    [InlineData("9000000000", "9000000000")]
    public async Task Valid_mobile_is_normalized_and_accepted(string input, string expected)
    {
        var command = EmployeeInputNormalizer.Normalize(ValidCommand() with { Mobile = input });

        var result = await new UpdateEmployeeValidator(_repository.Object).ValidateAsync(command);

        Assert.True(result.IsValid);
        Assert.Equal(expected, command.Mobile);
    }

    [Theory]
    [InlineData("abc")]
    [InlineData("123-abc")]
    [InlineData("+123")]
    [InlineData("1234567890123456")]
    public async Task Invalid_mobile_returns_a_field_error(string input)
    {
        var command = EmployeeInputNormalizer.Normalize(ValidCommand() with { Mobile = input });

        var result = await new UpdateEmployeeValidator(_repository.Object).ValidateAsync(command);

        Assert.Contains(result.Errors, x => x.PropertyName == nameof(UpdateEmployeeCommand.Mobile));
    }

    [Fact]
    public async Task Whitespace_only_optional_mobile_and_optional_address_are_accepted()
    {
        var command = EmployeeInputNormalizer.Normalize(ValidCommand() with
        {
            Mobile = "   ",
            Addresses = [new EmployeeAddressRequest(" ", " ", " ", " ", " ", " ", " ")]
        });

        var result = await new UpdateEmployeeValidator(_repository.Object).ValidateAsync(command);

        Assert.True(result.IsValid);
        Assert.Null(command.Mobile);
    }

    [Fact]
    public async Task Partial_and_empty_bank_details_are_accepted()
    {
        var validator = new CreateEmployeeValidator(_repository.Object);
        var partial = EmployeeInputNormalizer.Normalize(new CreateEmployeeCommand(
            "EMP-BANK", "Employee", "Example", (int)Gender.Male, new DateOnly(1990, 1, 1),
            new DateOnly(2020, 1, 1), null, "bank@example.com", 1, 2, null, 3,
            (int)EmploymentType.Permanent, (int)EmployeeStatus.Active, null, null,
            new EmployeeBankAccountRequest("Bank", null, null, null, null)));

        var empty = EmployeeInputNormalizer.Normalize(new AddEmployeeBankDetailsCommand(" ", " ", " ", null, null));

        Assert.True((await validator.ValidateAsync(partial)).IsValid);
        Assert.True((await new AddEmployeeBankDetailsValidator().ValidateAsync(empty)).IsValid);
        Assert.Null(empty.BankName);
    }

    [Fact]
    public async Task Validator_failure_uses_the_standard_400_field_error_exception()
    {
        var exception = await Assert.ThrowsAsync<CosmosException>(() => ValidationRunner.ValidateAsync(
            new UpdateEmployeeValidator(_repository.Object),
            ValidCommand() with { DepartmentId = 0 },
            CancellationToken.None));

        Assert.Equal(400, exception.StatusCode);
        Assert.Contains(nameof(UpdateEmployeeCommand.DepartmentId), exception.FieldErrors!.Keys);
    }

    [Fact]
    public async Task Direct_resignation_and_reactivation_are_rejected_by_the_update_service()
    {
        var active = Employee(status: (int)EmployeeStatus.Active, isActive: true);
        _repository.Setup(x => x.GetEmployeeAsync(42, It.IsAny<CancellationToken>())).ReturnsAsync(active);
        var service = CreateService();

        var resignation = await Assert.ThrowsAsync<CosmosException>(() => service.UpdateEmployeeAsync(42, ValidCommand() with { Status = (int)EmployeeStatus.Resigned }, CancellationToken.None));
        Assert.Contains("resign endpoint", resignation.FieldErrors![nameof(UpdateEmployeeCommand.Status)].Single());

        _repository.Setup(x => x.GetEmployeeAsync(42, It.IsAny<CancellationToken>())).ReturnsAsync(Employee(status: (int)EmployeeStatus.Resigned, isActive: false));
        var reactivation = await Assert.ThrowsAsync<CosmosException>(() => service.UpdateEmployeeAsync(42, ValidCommand() with { Status = (int)EmployeeStatus.Active }, CancellationToken.None));
        Assert.Contains("rejoin endpoint", reactivation.FieldErrors![nameof(UpdateEmployeeCommand.Status)].Single());
    }

    [Fact]
    public async Task Rejoin_endpoint_reactivates_a_resigned_employee()
    {
        _repository.Setup(x => x.GetEmployeeAsync(42, It.IsAny<CancellationToken>())).ReturnsAsync(Employee(status: (int)EmployeeStatus.Resigned, isActive: false));
        _repository.Setup(x => x.RejoinEmployeeAsync(42, It.IsAny<RejoinEmployeeCommand>(), It.IsAny<long?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Employee(status: (int)EmployeeStatus.Active, isActive: true));

        var result = await CreateService().RejoinEmployeeAsync(42, new RejoinEmployeeCommand(DateOnly.FromDateTime(DateTime.UtcNow), "Returned"), CancellationToken.None);

        Assert.True(result.Succeeded);
        Assert.Equal((int)EmployeeStatus.Active, result.Data!.Status);
        Assert.True(result.Data.IsActive);
    }

    private HrService CreateService()
    {
        var audit = new Mock<IAuditRepository>();
        audit.Setup(x => x.AddAsync(It.IsAny<Cosmos.Contracts.Audit.AuditEntryRequest>(), It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);
        var currentUser = new Mock<ICurrentUser>();
        currentUser.SetupGet(x => x.UserId).Returns(7);
        return new HrService(_repository.Object, audit.Object, currentUser.Object, new ValidatorProvider(new UpdateEmployeeValidator(_repository.Object), new RejoinEmployeeValidator()));
    }

    private static UpdateEmployeeCommand ValidCommand() => new(
        "EMP-42", "Employee", "Example", (int)Gender.Male, new DateOnly(1990, 1, 1),
        new DateOnly(2020, 1, 1), "9000000000", "employee@example.com", 1, 2,
        null, 3, (int)EmploymentType.Permanent, (int)EmployeeStatus.Active, null, []);

    private static EmployeeDto Employee(int status, bool isActive) => new(
        42, "EMP-42", "Employee", "Example", (int)Gender.Male, new DateOnly(1990, 1, 1), new DateOnly(2020, 1, 1),
        "9000000000", "employee@example.com", 1, "Department", 2, "Designation", null, null, 3, "Shift",
        (int)EmploymentType.Permanent, status, null, status == (int)EmployeeStatus.Resigned ? "Resigned" : "Active", isActive, false,
        status == (int)EmployeeStatus.Resigned ? DateTime.UtcNow : null, null, null, null, null, DateTime.UtcNow, null);

    private sealed class ValidatorProvider(IValidator<UpdateEmployeeCommand> update, IValidator<RejoinEmployeeCommand> rejoin) : IServiceProvider
    {
        public object? GetService(Type serviceType) => serviceType == typeof(IValidator<UpdateEmployeeCommand>)
            ? update
            : serviceType == typeof(IValidator<RejoinEmployeeCommand>)
                ? rejoin
                : null;
    }
}
