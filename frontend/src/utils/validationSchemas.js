import { z } from "zod";
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
  usernameOrEmail: z.string().min(1, "Username or email is required"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Enter a valid email address"),
});

export const resetPasswordSchema = z
  .object({
    email: z.string().email("Enter a valid email address"),
    resetToken: z.string().min(1, "Reset token is required"),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters"),
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
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters"),
    confirmPassword: z
      .string()
      .min(8, "Confirm password must be at least 8 characters"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const categorySchema = z.object({
  name: z.string().trim().min(2, "Category name is required"),
  description: z
    .string()
    .trim()
    .max(500, "Description is too long")
    .optional(),
  isActive: z.boolean(),
});

export const unitSchema = z.object({
  name: z.string().trim().min(2, "Unit name is required"),
  shortName: z.string().trim().min(1, "Short name is required"),
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

export const hrDepartmentSchema = z.object({
  departmentCode: z
    .string()
    .trim()
    .min(1, "Department code is required")
    .max(50, "Department code is too long"),
  departmentName: z
    .string()
    .trim()
    .min(2, "Department name is required")
    .max(100, "Department name is too long"),
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
    .max(50, "Designation code is too long"),
  designationName: z
    .string()
    .trim()
    .min(2, "Designation name is required")
    .max(100, "Designation name is too long"),
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
    .max(50, "Shift code is too long"),
  shiftName: z
    .string()
    .trim()
    .min(2, "Shift name is required")
    .max(100, "Shift name is too long"),
  startTime: z.string().trim().min(1, "Start time is required"),
  endTime: z.string().trim().min(1, "End time is required"),
  graceMinutes: z.coerce
    .number()
    .int("Grace minutes must be a whole number")
    .min(0, "Grace minutes cannot be negative"),
  isNightShift: z.boolean(),
  weeklyHours: nonNegativeNumber("Weekly hours"),
  isActive: z.boolean(),
});

export const hrEmployeeSchema = z.object({
  employeeCode: z
    .string()
    .trim()
    .min(1, "Employee code is required")
    .max(50, "Employee code is too long"),
  firstName: z
    .string()
    .trim()
    .min(2, "First name is required")
    .max(100, "First name is too long"),
  lastName: z
    .string()
    .trim()
    .min(1, "Last name is required")
    .max(100, "Last name is too long"),
  gender: z.coerce.number().int().min(HR_GENDER.MALE),
  dateOfBirth: z.string().trim().min(1, "Date of birth is required"),
  joiningDate: z.string().trim().min(1, "Joining date is required"),
  mobile: z
    .string()
    .trim()
    .min(7, "Mobile number is required")
    .max(20, "Mobile number is too long"),
  email: z.string().trim().email("Enter a valid email address"),
  departmentId: z.coerce.number().int().positive("Department is required"),
  designationId: z.coerce.number().int().positive("Designation is required"),
  reportingManagerId: optionalPositiveId,
  shiftId: z.coerce.number().int().positive("Shift is required"),
  employmentType: z.coerce.number().int().min(HR_EMPLOYMENT_TYPE.FULL_TIME),
  status: z.coerce
    .number()
    .int()
    .min(HR_EMPLOYEE_STATUS.ACTIVE)
    .max(HR_EMPLOYEE_STATUS.TERMINATED),
  profilePhotoUrl: z.string().trim().optional(),
  addresses: z
    .array(
      z.object({
        addressType: z.string().trim().optional(),
        addressLine1: z.string().trim().optional(),
        addressLine2: z.string().trim().optional(),
        city: z.string().trim().optional(),
        state: z.string().trim().optional(),
        country: z.string().trim().optional(),
        pincode: z.string().trim().optional(),
      }),
    )
    .optional(),
  addressType: z.string().trim().optional(),
  addressLine1: z.string().trim().optional(),
  addressLine2: z.string().trim().optional(),
  city: z.string().trim().optional(),
  state: z.string().trim().optional(),
  country: z.string().trim().optional(),
  pincode: z.string().trim().optional(),
  bankName: z.string().trim().optional(),
  accountNumber: z.string().trim().optional(),
  ifscCode: z.string().trim().optional(),
  branchName: z.string().trim().optional(),
  upiId: z.string().trim().optional(),
});

export const hrBankDetailsSchema = z.object({
  bankName: z.string().trim().min(2, "Bank name is required"),
  accountNumber: z.string().trim().min(4, "Account number is required"),
  ifscCode: z.string().trim().min(4, "IFSC code is required"),
  branchName: z.string().trim().optional(),
  upiId: z.string().trim().optional(),
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
  attendanceStatus: z.coerce.number().int().min(HR_ATTENDANCE_STATUS.PRESENT),
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
  startDate: z.string().trim().min(1, "Start date is required"),
  endDate: z.string().trim().min(1, "End date is required"),
  reason: z.string().trim().optional(),
});

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
    name: z.string().trim().min(2, "Item name is required"),
    itemCode: z.string().trim().optional(),
    barcode: z.string().trim().optional(),
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
    hsnCode: z.string().trim().optional(),
    gstRate: nonNegativeNumber("GST rate"),
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
    if (values.itemType !== ITEM_TYPE.PRODUCT) {
      return;
    }

    if (!values.categoryId) {
      context.addIssue({
        code: "custom",
        message: "Category is required for products",
        path: ["categoryId"],
      });
    }

    if (!values.unitId) {
      context.addIssue({
        code: "custom",
        message: "Unit is required for products",
        path: ["unitId"],
      });
    }
  });
