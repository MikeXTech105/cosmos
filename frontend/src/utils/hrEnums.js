export const HR_GENDER = {
  MALE: 1,
  FEMALE: 2,
  OTHER: 3,
};

export const HR_EMPLOYMENT_TYPE = {
  FULL_TIME: 1,
  PART_TIME: 2,
  CONTRACT: 3,
  INTERN: 4,
};

export const HR_EMPLOYEE_STATUS = {
  ACTIVE: 1,
  ON_LEAVE: 2,
  INACTIVE: 3,
  TERMINATED: 4,
};

export const HR_ATTENDANCE_STATUS = {
  PRESENT: 1,
  ABSENT: 2,
  LATE: 3,
  ON_LEAVE: 4,
};

export const HR_LEAVE_STATUS = {
  PENDING: 1,
  APPROVED: 2,
  REJECTED: 3,
  CANCELLED: 4,
};

export const HR_LEAVE_TYPE = {
  SICK: 1,
  CASUAL: 2,
  EARNED: 3,
  UNPAID: 4,
};

export const HR_GENDER_OPTIONS = [
  { value: HR_GENDER.MALE, label: "Male" },
  { value: HR_GENDER.FEMALE, label: "Female" },
  { value: HR_GENDER.OTHER, label: "Other" },
];

export const HR_EMPLOYMENT_TYPE_OPTIONS = [
  { value: HR_EMPLOYMENT_TYPE.FULL_TIME, label: "Full Time" },
  { value: HR_EMPLOYMENT_TYPE.PART_TIME, label: "Part Time" },
  { value: HR_EMPLOYMENT_TYPE.CONTRACT, label: "Contract" },
  { value: HR_EMPLOYMENT_TYPE.INTERN, label: "Intern" },
];

export const HR_EMPLOYEE_STATUS_OPTIONS = [
  { value: HR_EMPLOYEE_STATUS.ACTIVE, label: "Active" },
  { value: HR_EMPLOYEE_STATUS.ON_LEAVE, label: "On Leave" },
  { value: HR_EMPLOYEE_STATUS.INACTIVE, label: "Inactive" },
  { value: HR_EMPLOYEE_STATUS.TERMINATED, label: "Terminated" },
];

export const HR_ATTENDANCE_STATUS_OPTIONS = [
  { value: HR_ATTENDANCE_STATUS.PRESENT, label: "Present" },
  { value: HR_ATTENDANCE_STATUS.ABSENT, label: "Absent" },
  { value: HR_ATTENDANCE_STATUS.LATE, label: "Late" },
  { value: HR_ATTENDANCE_STATUS.ON_LEAVE, label: "On Leave" },
];

export const HR_LEAVE_STATUS_OPTIONS = [
  { value: HR_LEAVE_STATUS.PENDING, label: "Pending" },
  { value: HR_LEAVE_STATUS.APPROVED, label: "Approved" },
  { value: HR_LEAVE_STATUS.REJECTED, label: "Rejected" },
  { value: HR_LEAVE_STATUS.CANCELLED, label: "Cancelled" },
];

export const HR_LEAVE_TYPE_OPTIONS = [
  { value: HR_LEAVE_TYPE.SICK, label: "Sick Leave" },
  { value: HR_LEAVE_TYPE.CASUAL, label: "Casual Leave" },
  { value: HR_LEAVE_TYPE.EARNED, label: "Earned Leave" },
  { value: HR_LEAVE_TYPE.UNPAID, label: "Unpaid Leave" },
];

export const getHrOptionLabel = (options, value, fallback = "-") => {
  const option = options.find((item) => String(item.value) === String(value));

  return option?.label ?? fallback;
};
