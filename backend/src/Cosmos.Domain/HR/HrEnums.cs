namespace Cosmos.Domain.HR;

public enum Gender
{
    Unspecified = 0,
    Male = 1,
    Female = 2,
    Other = 3
}

public enum EmploymentType
{
    Permanent = 1,
    Contract = 2,
    Temporary = 3,
    Intern = 4
}

public enum EmployeeStatus
{
    Active = 1,
    Inactive = 2,
    Resigned = 3,
    Terminated = 4
}

public enum AttendanceStatus
{
    Present = 1,
    Absent = 2,
    HalfDay = 3,
    Leave = 4,
    Holiday = 5,
    WeekOff = 6,
    WFH = 7
}

public enum ApprovalStatus
{
    Pending = 1,
    Approved = 2,
    Rejected = 3
}

public enum LeaveApplicationStatus
{
    Pending = 1,
    Approved = 2,
    Rejected = 3,
    Cancelled = 4
}

public enum SalaryComponentType
{
    Earning = 1,
    Deduction = 2
}

public enum PayrollRunStatus
{
    Draft = 1,
    Processed = 2,
    Approved = 3
}
