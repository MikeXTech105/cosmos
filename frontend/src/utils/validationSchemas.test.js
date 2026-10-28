import { describe, expect, it } from "vitest";

import { hrBankDetailsSchema, hrEmployeeSchema } from "./validationSchemas";
import { mapFormToPayload } from "../pages/hr/employees/employeeFormMappers";

const validEmployee = {
  employeeCode: "EMP-1", firstName: "Test", lastName: "User", gender: 1,
  dateOfBirth: "1990-01-01", joiningDate: "2020-01-01", mobile: "", email: "test@example.com",
  departmentId: 1, designationId: 1, reportingManagerId: null, shiftId: 1,
  employmentType: 1, status: 1, profilePhotoUrl: "", addresses: [],
  bankName: "", accountNumber: "", ifscCode: "", branchName: "", upiId: "",
};

describe("Employee validation", () => {
  it("accepts an optional empty mobile and normalizes an international mobile", () => {
    expect(hrEmployeeSchema.safeParse(validEmployee).success).toBe(true);
    const parsed = hrEmployeeSchema.parse({ ...validEmployee, mobile: " +1 (415) 555-2671 " });
    expect(parsed.mobile).toBe("+14155552671");
  });

  it.each(["abc", "12#34", "+123", "1234567890123456"])("rejects invalid mobile %s", (mobile) => {
    expect(hrEmployeeSchema.safeParse({ ...validEmployee, mobile }).success).toBe(false);
  });

  it("accepts optional bank details and preserves omitted address/bank replacements on update", () => {
    expect(hrBankDetailsSchema.safeParse({}).success).toBe(true);
    expect(hrBankDetailsSchema.safeParse({ bankName: "Bank" }).success).toBe(true);
    const payload = mapFormToPayload(validEmployee, { includeBankDetails: false, preserveExistingAddresses: true });
    expect(payload).not.toHaveProperty("addresses");
    expect(payload).not.toHaveProperty("bankDetails");
    const created = mapFormToPayload(validEmployee);
    expect(created.addresses).toEqual([]);
    expect(created.bankDetails).toBeNull();
  });
});
