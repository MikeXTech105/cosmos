import { describe, expect, it } from "vitest";
import { passwordPolicySchema, positiveIntegerId, enumNumber, isValidDate } from "./validationRules";
import { categorySchema, hrEmployeeSchema, hrShiftSchema, hrLeaveApplySchema, itemSchema, forgotPasswordSchema, resetPasswordSchema } from "./validationSchemas";
import { mapEmployeeToForm, mapFormToPayload } from "../pages/hr/employees/employeeFormMappers";
import { buildItemPayload, getItemDefaultValues } from "../pages/inventory/items/itemHelpers";
import { dispatchRunSchema } from "../pages/dispatch/dispatchSchemas";
import { packagingProfileSchema } from "../pages/supplyChain/supplyChainSchemas";
import { shipmentDocketSchema, shipmentPackageSchema, shipmentAppointmentSchema, manualShipmentSchema } from "../pages/shipments/shipmentSchemas";
import { validateProductMedia } from "./websiteContent";

const employee = () => ({ ...mapEmployeeToForm(null), employeeCode: "E1", firstName: "A",
  joiningDate: "2026-10-14", departmentId: 1, designationId: 1, shiftId: 1 });
const packaging = () => ({ itemId: "1", channelId: "", dimensionUnit: "CM", weightUnit: "KG",
  packagingCode: "BOX", packagingName: "", unitsPerBox: 1, isActive: true, isDefault: false,
  effectiveFrom: "", effectiveTo: "" });
const shipmentPackage = () => ({ packageNumber: "P1", packageType: "Box", dimensionUnit: "cm",
  weightUnit: "kg", grossWeight: 2, netWeight: 1, height: 0, width: 0, length: 0,
  isMixedPackage: false, items: [{ shipmentItemId: 1, quantity: 1 }] });

describe("frontend API validation alignment", () => {
  it("allows an employee without optional identity/contact/bank fields", () => {
    const parsed = hrEmployeeSchema.parse(employee());
    const payload = mapFormToPayload(parsed);
    expect(payload.dateOfBirth).toBeNull();
    expect(payload.bankDetails).toBeNull();
    expect(payload.addresses).toEqual([]);
  });
  it("requires complete bank details only when supplied", () => {
    expect(hrEmployeeSchema.safeParse({ ...employee(), accountNumber: "123" }).success).toBe(false);
    const form = { ...employee(), bankName: "Bank", accountNumber: "123", ifscCode: "CODE" };
    expect(hrEmployeeSchema.safeParse(form).success).toBe(true);
    expect(mapFormToPayload(form).bankDetails.accountNumber).toBe("123");
  });
  it("validates partially populated addresses without requiring an empty address", () => {
    expect(hrEmployeeSchema.safeParse({ ...employee(), addresses: [{ city: "Surat", addressLine1: "" }] }).success).toBe(false);
    expect(mapFormToPayload(employee()).addresses).toEqual([]);
  });
  it("rejects invalid employee dates and enum values", () => {
    expect(hrEmployeeSchema.safeParse({ ...employee(), dateOfBirth: "2026-10-15" }).success).toBe(false);
    expect(hrEmployeeSchema.safeParse({ ...employee(), gender: 99 }).success).toBe(false);
  });
  it("allows short names while enforcing API length limits", () => {
    expect(categorySchema.safeParse({ name: "A", isActive: true }).success).toBe(true);
    expect(categorySchema.safeParse({ name: "A".repeat(101), isActive: true }).success).toBe(false);
    expect(hrEmployeeSchema.safeParse({ ...employee(), employeeCode: "E".repeat(31) }).success).toBe(false);
  });
  it("checks HR leave ordering, reason and shift maxima", () => {
    const leave = { employeeId: 1, leaveTypeId: 1, startDate: "2026-10-14", endDate: "2026-10-13", reason: "" };
    expect(hrLeaveApplySchema.safeParse(leave).success).toBe(false);
    const shift = { shiftCode: "S", shiftName: "A", startTime: "09:00", endTime: "18:00", graceMinutes: 241, weeklyHours: 169, isNightShift: false, isActive: true };
    expect(hrShiftSchema.safeParse(shift).success).toBe(false);
  });
  it.each(["abcdefgh", "Abcdefgh", "Abcdefg1", "ABCDEF1!", "abcdef1!"])("rejects weak new password %s", password => {
    expect(passwordPolicySchema.safeParse(password).success).toBe(false);
  });
  it("accepts the backend password policy", () => expect(passwordPolicySchema.safeParse("Abcdef1!").success).toBe(true));
  it("keeps recovery email required while employee email is optional", () => {
    expect(forgotPasswordSchema.safeParse({ email: "" }).success).toBe(false);
    expect(resetPasswordSchema.safeParse({ email: "", resetToken: "token", newPassword: "Abcdef1!", confirmPassword: "Abcdef1!" }).success).toBe(false);
    expect(forgotPasswordSchema.safeParse({ email: "user@example.com" }).success).toBe(true);
  });
  it.each([0, -1, 0.5, "abc", ""])("rejects invalid identifier %s", value => {
    expect(positiveIntegerId().safeParse(value).success).toBe(false);
  });
  it("accepts numeric-string IDs and rejects undefined enum members", () => {
    expect(positiveIntegerId().parse("2")).toBe(2);
    expect(enumNumber({ CASH: 1, OTHER: 99 }).safeParse(0).success).toBe(false);
  });
  it("checks calendar dates, including leap years", () => {
    expect(isValidDate("2024-02-29")).toBe(true);
    expect(isValidDate("2026-02-29")).toBe(false);
  });
  it("rejects invalid dispatch IDs before submitting", () => {
    expect(dispatchRunSchema.safeParse({ channelId: 0, salesImportBatchId: 0, warehouseStockImportBatchId: 0, planningDate: "bad" }).success).toBe(false);
  });
  it("allows unnamed packaging and omits blank optional dates", () => {
    const parsed = packagingProfileSchema.parse(packaging());
    expect(parsed.effectiveFrom).toBeUndefined();
    expect(parsed.packagingName).toBe("");
    expect(packagingProfileSchema.safeParse({ ...packaging(), itemId: 0.5 }).success).toBe(false);
  });
  it("requires the docket number enforced by backend", () => {
    expect(shipmentDocketSchema.safeParse({ dispatchMode: "Road", docketDate: "2026-10-14", transporterPartyId: "id", docketNumber: "" }).success).toBe(false);
  });
  it("normalizes packing units and validates net/gross weights", () => {
    expect(shipmentPackageSchema.parse(shipmentPackage()).dimensionUnit).toBe("CM");
    expect(shipmentPackageSchema.safeParse({ ...shipmentPackage(), netWeight: 3 }).success).toBe(false);
  });
  it("retains zero packing rows for UI input and detects duplicate allocations", () => {
    expect(shipmentPackageSchema.safeParse({ ...shipmentPackage(), items: [{ shipmentItemId: 1, quantity: 1 }, { shipmentItemId: 2, quantity: 0 }] }).success).toBe(true);
    expect(shipmentPackageSchema.safeParse({ ...shipmentPackage(), isMixedPackage: true, items: [{ shipmentItemId: 1, quantity: 1 }, { shipmentItemId: 1, quantity: 1 }] }).success).toBe(false);
  });
  it("requires cancellation reasons and correct appointment time ordering", () => {
    expect(shipmentAppointmentSchema.safeParse({ appointmentDate: "2026-10-14", appointmentStatus: "Cancelled", timeFrom: "12:00", timeTo: "10:00" }).success).toBe(false);
  });
  it("requires a manual reason and valid delivery ordering", () => {
    expect(manualShipmentSchema.safeParse({ channelId: 1, warehouseId: 1, dispatchMode: "Road", priority: "Normal", shipmentDate: "2026-10-14", expectedDeliveryDate: "2026-10-13", manualReason: "", items: [{ itemId: 1, plannedQuantity: 1 }] }).success).toBe(false);
  });
  it("preserves service units in payloads and enforces code and GST limits", () => {
    expect(buildItemPayload({ name: "Service", itemType: 2, categoryId: 1, unitId: 2 }).unitId).toBe(2);
    const form = { ...getItemDefaultValues(null), name: "Service", itemCode: "S1", itemType: 2, categoryId: 1, unitId: 2 };
    expect(itemSchema.safeParse(form).success).toBe(true);
    expect(itemSchema.safeParse({ ...form, itemCode: "" }).success).toBe(false);
    expect(itemSchema.safeParse({ ...form, gstRate: 101 }).success).toBe(false);
    expect(itemSchema.safeParse({ ...form, unitId: "" }).success).toBe(false);
  });
  it("allows optional alt text but limits its length", () => {
    expect(validateProductMedia([{ publicUrl: "/uploads/image.png", isPrimary: true, altText: "" }])).toEqual({});
    expect(validateProductMedia([{ publicUrl: "/uploads/image.png", isPrimary: true, altText: "a".repeat(501) }])).toHaveProperty("media.0.altText");
  });
});
