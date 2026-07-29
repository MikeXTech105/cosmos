import {
  HR_EMPLOYEE_STATUS,
  HR_EMPLOYMENT_TYPE,
  HR_GENDER,
} from "../../../utils/hrEnums";
import { EMPTY_VALUE, formatDateInput } from "../../../utils/format";

const BANK_FIELDS = [
  "bankName",
  "accountNumber",
  "ifscCode",
  "branchName",
  "upiId",
];

const getFirstValue = (...values) => {
  return values.find((value) => {
    return value !== undefined && value !== null && String(value).trim() !== "";
  });
};

const getText = (...values) => {
  return String(getFirstValue(...values) ?? "");
};

const getNumberOrEmpty = (...values) => {
  const value = getFirstValue(...values);

  if (value === undefined) {
    return "";
  }

  const numberValue = Number(value);

  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : "";
};

const getEnumValue = (value, fallback) => {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) && numberValue > 0
    ? numberValue
    : fallback;
};

const getDateInputValue = (...values) => {
  const value = getFirstValue(...values);

  if (!value) {
    return "";
  }

  const formatted = formatDateInput(value);
  return formatted === EMPTY_VALUE ? "" : formatted;
};

const splitName = (employee) => {
  const fullName = getText(
    employee?.fullName,
    employee?.employeeName,
    employee?.name,
  ).trim();

  if (!fullName) {
    return { firstName: "", lastName: "" };
  }

  const [firstName, ...rest] = fullName.split(/\s+/);

  return {
    firstName,
    lastName: rest.join(" "),
  };
};

const getStatus = (employee) => {
  if (employee?.status !== undefined && employee?.status !== null) {
    return getEnumValue(employee.status, HR_EMPLOYEE_STATUS.ACTIVE);
  }

  if (employee?.isActive === false) {
    return HR_EMPLOYEE_STATUS.INACTIVE;
  }

  return HR_EMPLOYEE_STATUS.ACTIVE;
};

const getAddresses = (employee) => {
  if (Array.isArray(employee?.addresses)) {
    return employee.addresses;
  }

  if (Array.isArray(employee?.employeeAddresses)) {
    return employee.employeeAddresses;
  }

  if (employee?.address) {
    return [employee.address];
  }

  return [];
};

export const extractEmployeeBankDetails = (payload) => {
  const data = payload?.data ?? payload;
  const nested =
    data?.bankDetails ??
    data?.employeeBankDetails ??
    data?.bankAccount ??
    data?.bank ??
    data?.accountDetails;

  if (nested) {
    return nested;
  }

  return BANK_FIELDS.some((field) => data?.[field] !== undefined) ? data : {};
};

export const hasBankDetails = (values = {}) => {
  return BANK_FIELDS.some((field) => String(values?.[field] ?? "").trim());
};

const hasFlatAddress = (values) => {
  return [
    values.addressLine1,
    values.addressLine2,
    values.city,
    values.state,
    values.country,
    values.pincode,
  ].some((value) => String(value ?? "").trim());
};

const hasAddress = (address = {}) => {
  return [
    address.addressLine1,
    address.addressLine2,
    address.city,
    address.state,
    address.country,
    address.pincode,
  ].some((value) => String(value ?? "").trim());
};

const mapAddressToForm = (address = {}) => {
  return {
    addressType: getText(address.addressType, address.type) || "Primary",
    addressLine1: getText(
      address.addressLine1,
      address.line1,
      address.address1,
    ),
    addressLine2: getText(
      address.addressLine2,
      address.line2,
      address.address2,
    ),
    city: getText(address.city),
    state: getText(address.state),
    country: getText(address.country) || "India",
    pincode: getText(address.pincode, address.pinCode, address.postalCode),
  };
};

const mapBankToForm = (bank = {}) => {
  return {
    bankName: getText(bank.bankName, bank.name),
    accountNumber: getText(bank.accountNumber, bank.accountNo),
    ifscCode: getText(bank.ifscCode, bank.ifsc),
    branchName: getText(bank.branchName, bank.branch),
    upiId: getText(bank.upiId, bank.upi),
  };
};

export const mapEmployeeToForm = (employee) => {
  const nameParts = splitName(employee);
  const addresses = getAddresses(employee).map(mapAddressToForm);
  const primaryAddress = addresses[0] ?? mapAddressToForm();
  const bank = mapBankToForm(extractEmployeeBankDetails(employee));

  return {
    employeeCode: getText(employee?.employeeCode, employee?.code),
    firstName: getText(employee?.firstName, nameParts.firstName),
    lastName: getText(employee?.lastName, nameParts.lastName),
    gender: getEnumValue(employee?.gender, HR_GENDER.MALE),
    dateOfBirth: getDateInputValue(
      employee?.dateOfBirth,
      employee?.birthDate,
      employee?.dob,
    ),
    joiningDate: getDateInputValue(
      employee?.joiningDate,
      employee?.dateOfJoining,
      employee?.joinDate,
    ),
    mobile: getText(
      employee?.mobile,
      employee?.mobileNumber,
      employee?.phone,
      employee?.phoneNumber,
    ),
    email: getText(employee?.email, employee?.emailAddress),
    departmentId: getNumberOrEmpty(
      employee?.departmentId,
      employee?.department?.departmentId,
      employee?.department?.id,
    ),
    designationId: getNumberOrEmpty(
      employee?.designationId,
      employee?.designation?.designationId,
      employee?.designation?.id,
    ),
    reportingManagerId: getNumberOrEmpty(
      employee?.reportingManagerId,
      employee?.managerId,
      employee?.reportingManager?.employeeId,
      employee?.reportingManager?.id,
    ),
    shiftId: getNumberOrEmpty(
      employee?.shiftId,
      employee?.shift?.shiftId,
      employee?.shift?.id,
    ),
    employmentType: getEnumValue(
      employee?.employmentType,
      HR_EMPLOYMENT_TYPE.FULL_TIME,
    ),
    status: getStatus(employee),
    profilePhotoUrl: getText(
      employee?.profilePhotoUrl,
      employee?.photoUrl,
      employee?.imageUrl,
    ),
    addresses: addresses.length > 0 ? addresses : [primaryAddress],
    ...primaryAddress,
    ...bank,
  };
};

const trimValue = (value) => String(value ?? "").trim();

const mapAddressToPayload = (values) => ({
  addressType: trimValue(values.addressType) || "Primary",
  addressLine1: trimValue(values.addressLine1),
  addressLine2: trimValue(values.addressLine2),
  city: trimValue(values.city),
  state: trimValue(values.state),
  country: trimValue(values.country),
  pincode: trimValue(values.pincode),
});

export const mapFormToBankDetails = (values) => ({
  bankName: trimValue(values.bankName),
  accountNumber: trimValue(values.accountNumber),
  ifscCode: trimValue(values.ifscCode),
  branchName: trimValue(values.branchName),
  upiId: trimValue(values.upiId),
});

export const mapFormToPayload = (
  values,
  { includeBankDetails = true } = {},
) => {
  const addresses = Array.isArray(values.addresses)
    ? values.addresses.filter(hasAddress).map(mapAddressToPayload)
    : [];
  const payload = {
    employeeCode: trimValue(values.employeeCode),
    firstName: trimValue(values.firstName),
    lastName: trimValue(values.lastName),
    gender: Number(values.gender),
    dateOfBirth: trimValue(values.dateOfBirth),
    joiningDate: trimValue(values.joiningDate),
    mobile: trimValue(values.mobile),
    email: trimValue(values.email),
    departmentId: Number(values.departmentId),
    designationId: Number(values.designationId),
    reportingManagerId: values.reportingManagerId
      ? Number(values.reportingManagerId)
      : null,
    shiftId: Number(values.shiftId),
    employmentType: Number(values.employmentType),
    status: Number(values.status),
    profilePhotoUrl: trimValue(values.profilePhotoUrl),
    addresses:
      addresses.length > 0
        ? addresses
        : hasFlatAddress(values)
          ? [mapAddressToPayload(values)]
          : [],
  };

  if (includeBankDetails) {
    payload.bankDetails = mapFormToBankDetails(values);
  }

  return payload;
};
