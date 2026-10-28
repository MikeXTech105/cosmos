import { z } from "zod";
import { passwordPolicySchema, enumNumber, requiredDate, optionalDate, dateOrder } from "./validationRules";
import {
  HR_EMPLOYEE_STATUS,
  HR_EMPLOYMENT_TYPE,
  HR_ATTENDANCE_STATUS,
  HR_GENDER,
} from "./hrEnums";
import { ProcurementItemClassification } from "../constants/procurementEnums";
import { normalizeItemClassification } from "./itemClassification";
import { ITEM_TYPE } from "./itemTypes";

export const loginSchema = z.object({
  usernameOrEmail: z.string().trim().min(1, "Username or email is required").max(256),
  password: z.string().min(1, "Password is required").max(128),
  rememberMe: z.boolean().optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Enter a valid email address").max(256),
});

export const resetPasswordSchema = z
  .object({
    email: z.string().trim().email("Enter a valid email address").max(256),
    resetToken: z.string().min(1, "Reset token is required"),
    newPassword: passwordPolicySchema,
    confirmPassword: z
      .string()
      .min(8, "Confirm password must be at least 8 characters"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: passwordPolicySchema,
    confirmPassword: z
      .string()
      .min(8, "Confirm password must be at least 8 characters"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const categorySchema = z.object({
  name: z.string().trim().min(1, "Category name is required").max(100),
  description: z
    .string()
    .trim()
    .max(500, "Description is too long")
    .optional(),
  isActive: z.boolean(),
});

export const unitSchema = z.object({
  name: z.string().trim().min(1, "Unit name is required").max(100),
  shortName: z.string().trim().min(1, "Short name is required").max(20),
  description: z
    .string()
    .trim()
    .max(500, "Description is too long")
    .optional(),
  isActive: z.boolean(),
});

const nonNegativeNumber = (label) => {
  return z.coerce.number().min(0, `${label} cannot be negative`);
};

const optionalPositiveId = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  return Number(value);
}, z.number().int().positive().nullable());

export const normalizeEmployeeMobile = (value) => {
  if (typeof value !== "string") return value;

  return value
    .trim()
    .replace(/[\s()-]/g, "");
};

export const hrDepartmentSchema = z.object({
  departmentCode: z
    .string()
    .trim()
    .min(1, "Department code is required")
    .max(20, "Department code is too long"),
  departmentName: z
    .string()
    .trim()
    .min(1, "Department name is required")
    .max(200, "Department name is too long"),
  description: z
    .string()
    .trim()
    .max(500, "Description is too long")
    .optional(),
  isActive: z.boolean(),
});

export const hrDesignationSchema = z.object({
  designationCode: z
    .string()
    .trim()
    .min(1, "Designation code is required")
    .max(20, "Designation code is too long"),
  designationName: z
    .string()
    .trim()
    .min(1, "Designation name is required")
    .max(200, "Designation name is too long"),
  departmentId: z.coerce.number().int().positive("Department is required"),
  description: z
    .string()
    .trim()
    .max(500, "Description is too long")
    .optional(),
  isActive: z.boolean(),
});

export const hrShiftSchema = z.object({
  shiftCode: z
    .string()
    .trim()
    .min(1, "Shift code is required")
    .max(20, "Shift code is too long"),
  shiftName: z
    .string()
    .trim()
    .min(1, "Shift name is required")
    .max(200, "Shift name is too long"),
  startTime: z.string().trim().min(1, "Start time is required"),
  endTime: z.string().trim().min(1, "End time is required"),
  graceMinutes: z.coerce
    .number()
    .int("Grace minutes must be a whole number")
    .min(0, "Grace minutes cannot be negative").max(240, "Grace minutes cannot exceed 240"),
  isNightShift: z.boolean(),
  weeklyHours: nonNegativeNumber("Weekly hours").max(168, "Weekly hours cannot exceed 168"),
  isActive: z.boolean(),
});

export const hrEmployeeSchema = z.object({
  employeeCode: z
    .string()
    .trim()
    .min(1, "Employee code is required")
    .max(30, "Employee code is too long"),
  firstName: z
    .string()
    .trim()
    .min(1, "First name is required")
    .max(100, "First name is too long"),
  lastName: z
    .string()
    .trim()
    .max(100, "Last name is too long"),
  gender: enumNumber(HR_GENDER, "Gender"),
  dateOfBirth: optionalDate,
  joiningDate: requiredDate("Joining date"),
  mobile: z
    .string()
    .transform(normalizeEmployeeMobile)
    .refine(
      (value) => value === "" || /^\+?[0-9]{7,15}$/.test(value),
      "Enter a valid mobile number with 7 to 15 digits; + is allowed only at the start",
    ),
  email: z.string().trim().max(200).pipe(z.union([z.literal(""), z.string().email("Enter a valid email address")])).default(""),
  departmentId: z.coerce.number().int().positive("Department is required"),
  designationId: z.coerce.number().int().positive("Designation is required"),
  reportingManagerId: optionalPositiveId,
  shiftId: z.coerce.number().int().positive("Shift is required"),
  employmentType: enumNumber(HR_EMPLOYMENT_TYPE, "Employment type"),
  status: z.coerce
    .number()
    .int()
    .min(HR_EMPLOYEE_STATUS.ACTIVE)
    .max(HR_EMPLOYEE_STATUS.TERMINATED),
  profilePhotoUrl: z.string().trim().max(1000).optional(),
  addresses: z
    .array(
      z.object({
        addressType: z.string().trim().max(30).optional(),
        addressLine1: z.string().trim().max(250).optional(),
        addressLine2: z.string().trim().max(250).optional(),
        city: z.string().trim().max(100).optional(),
        state: z.string().trim().max(100).optional(),
        country: z.string().trim().max(100).optional(),
        pincode: z.string().trim().max(20).optional(),
      }),
    )
    .optional(),
  addressType: z.string().trim().max(30).optional(),
  addressLine1: z.string().trim().max(250).optional(),
  addressLine2: z.string().trim().max(250).optional(),
  city: z.string().trim().max(100).optional(),
  state: z.string().trim().max(100).optional(),
  country: z.string().trim().max(100).optional(),
  pincode: z.string().trim().max(20).optional(),
  bankName: z.string().trim().max(150).optional(),
  accountNumber: z.string().trim().max(50).optional(),
  ifscCode: z.string().trim().max(20).optional(),
  branchName: z.string().trim().max(150).optional(),
  upiId: z.string().trim().max(100).optional(),
}).superRefine((values, context) => {
  dateOrder(values, context, "dateOfBirth", "joiningDate", "Joining date must be after date of birth");
  if (values.dateOfBirth && values.dateOfBirth === values.joiningDate) context.addIssue({code:"custom",path:["dateOfBirth"],message:"Date of birth must be before joining date"});
  const bankFields = ["bankName", "accountNumber", "ifscCode", "branchName", "upiId"];
  if (bankFields.some(field => values[field]?.trim())) {
    for (const field of ["bankName", "accountNumber", "ifscCode"]) if (!values[field]?.trim()) context.addIssue({code:"custom",path:[field],message:"Required when bank details are entered"});
  }
  for (const [index, address] of (values.addresses ?? []).entries()) {
    if (["addressLine1","addressLine2","city","state","pincode"].some(field => address[field]?.trim()) && !address.addressLine1?.trim()) context.addIssue({code:"custom",path:["addresses",index,"addressLine1"],message:"Address line 1 is required when an address is entered"});
  }
  if (["addressLine2","city","state","pincode"].some(field => values[field]?.trim()) && !values.addressLine1?.trim()) context.addIssue({code:"custom",path:["addressLine1"],message:"Address line 1 is required when an address is entered"});
});

export const hrBankDetailsSchema = z.object({
  bankName: z.string().trim().max(150, "Bank name is too long").optional(),
  accountNumber: z.string().trim().max(50, "Account number is too long").optional(),
  ifscCode: z.string().trim().max(20, "IFSC code is too long").optional(),
  branchName: z.string().trim().max(150, "Branch name is too long").optional(),
  upiId: z.string().trim().max(100, "UPI ID is too long").optional(),
});

export const hrDocumentSchema = z.object({
  documentType: z.string().trim().min(1, "Document type is required"),
  fileName: z.string().trim().min(1, "File name is required"),
  filePath: z.string().trim().min(1, "Upload or enter a file path"),
  expiryDate: z.string().trim().optional(),
});

export const hrEmployeeResignSchema = z.object({
  lastWorkingDate: z.string().trim().min(1, "Last working date is required"),
  resignationReason: z.string().trim().optional(),
});

export const hrEmployeeRejoinSchema = z.object({
  rejoinedDate: z.string().trim().min(1, "Rejoined date is required"),
  remarks: z.string().trim().optional(),
});

export const hrAttendanceQuickActionSchema = z.object({
  employeeId: z.coerce.number().int().positive("Employee is required"),
  actionTime: z.string().trim().min(1, "Time is required"),
});

export const hrAttendanceManualSchema = z.object({
  employeeId: z.coerce.number().int().positive("Employee is required"),
  attendanceDate: z.string().trim().min(1, "Attendance date is required"),
  checkInTime: z.string().trim().optional(),
  checkOutTime: z.string().trim().optional(),
  attendanceStatus: enumNumber(HR_ATTENDANCE_STATUS, "Attendance status"),
});

export const hrAttendanceAdjustmentSchema = z.object({
  employeeId: z.coerce.number().int().positive("Employee is required"),
  attendanceId: z.coerce.number().int().positive("Attendance id is required"),
  reason: z.string().trim().min(1, "Reason is required"),
});

export const hrAttendanceDecisionSchema = z.object({
  adjustmentId: z.coerce.number().int().positive("Adjustment id is required"),
  remarks: z.string().trim().optional(),
});

export const hrLeaveApplySchema = z.object({
  employeeId: z.coerce.number().int().positive("Employee is required"),
  leaveTypeId: z.coerce.number().int().positive("Leave type is required"),
  startDate: requiredDate("Start date"),
  endDate: requiredDate("End date"),
  reason: z.string().trim().min(1, "Reason is required").max(500),
}).superRefine((values, context) => dateOrder(values, context, "startDate", "endDate", "End date cannot be before start date"));

export const hrLeaveActionSchema = z.object({
  leaveApplicationId: z.coerce
    .number()
    .int()
    .positive("Leave application id is required"),
  employeeId: optionalPositiveId,
  remarks: z.string().trim().optional(),
});

export const hrPayrollProcessSchema = z.object({
  payrollMonth: z.coerce.number().int().min(1).max(12),
  payrollYear: z.coerce.number().int().min(2000).max(2100),
});

export const hrPayrollApproveSchema = z.object({
  payrollRunId: z.coerce.number().int().positive("Payroll run id is required"),
});

const lookupId = z.union([
  z.literal(""),
  z.number().int().positive(),
]);

const parseItemTypeInput = (value) => {
  if (value === null || value === undefined || value === "") {
    return ITEM_TYPE.PRODUCT;
  }

  const stringValue = String(value).toLowerCase();

  if (stringValue === "product") {
    return ITEM_TYPE.PRODUCT;
  }

  if (stringValue === "service") {
    return ITEM_TYPE.SERVICE;
  }

  return Number(value);
};

const itemTypeSchema = z.preprocess(
  parseItemTypeInput,
  z.union([
    z.literal(ITEM_TYPE.PRODUCT),
    z.literal(ITEM_TYPE.SERVICE),
  ]),
);

const imageUrlPattern =
  /^(https?:\/\/.+|\/[^/].+|data:image\/(png|jpe?g|webp);base64,.+)$/i;

export const itemSchema = z
  .object({
    name: z.string().trim().min(1, "Item name is required").max(200),
    itemCode: z.string().trim().min(1, "Item code is required").max(50),
    barcode: z.string().trim().max(100).optional(),
    categoryId: lookupId,
    unitId: lookupId,
    itemType: itemTypeSchema,
    procurementClassification: z
      .preprocess(
        normalizeItemClassification,
        z.nativeEnum(ProcurementItemClassification).nullable(),
      )
      .optional(),
    salesPrice: nonNegativeNumber("Sales price"),
    purchasePrice: nonNegativeNumber("Purchase price"),
      hsnCode: z.string().trim().max(50).refine(
        (value) => !value || /^[A-Za-z0-9]+$/.test(value),
        "HSN code may contain letters and digits only",
      ).optional(),
    gstRate: nonNegativeNumber("GST rate").max(100, "GST rate cannot exceed 100%"),
    trackInventory: z.boolean(),
    isManufactured: z.boolean(),
    openingStock: nonNegativeNumber("Opening stock"),
    openingStockValue: nonNegativeNumber("Opening stock value"),
    currentStock: nonNegativeNumber("Current stock"),
    reservedStock: nonNegativeNumber("Reserved stock"),
    minimumStock: nonNegativeNumber("Minimum stock"),
    description: z
      .string()
      .trim()
      .max(1000, "Description is too long")
      .optional(),
    imageUrl: z
      .string()
      .trim()
      .refine(
        (value) => !value || imageUrlPattern.test(value),
        "Enter a valid image URL",
      ),
    imageFile: z.any().optional(),
    isActive: z.boolean(),
  })
  .superRefine((values, context) => {
    if (!values.categoryId) {
      context.addIssue({
        code: "custom",
        message: "Category is required",
        path: ["categoryId"],
      });
    }

    if (!values.unitId) {
      context.addIssue({
        code: "custom",
        message: "Unit is required",
        path: ["unitId"],
      });
    }
  });
