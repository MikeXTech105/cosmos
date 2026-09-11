import {
  HR_EMPLOYMENT_TYPE_OPTIONS,
  HR_GENDER_OPTIONS,
  getEmployeeStatusLabel,
  getHrOptionLabel,
} from "../../../utils/hrEnums";
import { getEmployeeName, getLookupLabel } from "../hrHelpers";

const text = (value, fallback = "-") => {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
};

const dateText = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? text(value)
    : new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(date);
};

const safeFilePart = (value) =>
  text(value, "Employee").replace(/[^a-z0-9-]+/gi, "-").replace(/-+/g, "-");

const getAddresses = (employee) => {
  if (Array.isArray(employee?.addresses)) return employee.addresses;
  if (Array.isArray(employee?.employeeAddresses)) return employee.employeeAddresses;
  return employee?.address ? [employee.address] : [];
};

export const exportEmployeeProfilePdf = async ({
  bankDetails,
  departmentOptions = [],
  designationOptions = [],
  employee,
  shiftOptions = [],
}) => {
  const jsPdfModule = await import("jspdf");
  const JsPdf =
    jsPdfModule.jsPDF ?? jsPdfModule.default?.jsPDF ?? jsPdfModule.default;

  if (typeof JsPdf !== "function") {
    throw new Error("PDF export dependency could not be loaded.");
  }

  const pdf = new JsPdf("p", "mm", "a4");
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  let y = 18;

  const ensureSpace = (height = 12) => {
    if (y + height <= pageHeight - margin) return;
    pdf.addPage();
    y = 18;
  };

  const addSection = (title, rows) => {
    ensureSpace(18);
    pdf.setFillColor(238, 242, 255);
    pdf.roundedRect(margin, y, contentWidth, 8, 1.5, 1.5, "F");
    pdf.setTextColor(67, 56, 202);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.text(title.toUpperCase(), margin + 3, y + 5.4);
    y += 12;

    rows.forEach(([label, value]) => {
      ensureSpace(12);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(71, 85, 105);
      pdf.setFontSize(8.5);
      pdf.text(`${label}:`, margin, y);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(15, 23, 42);
      const lines = pdf.splitTextToSize(text(value), contentWidth - 47);
      pdf.text(lines, margin + 47, y);
      y += Math.max(7, lines.length * 4.5);
    });
    y += 3;
  };

  const fullName = getEmployeeName(employee);
  const currentBank = bankDetails ?? employee?.bankDetails ?? {};

  pdf.setFillColor(79, 70, 229);
  pdf.rect(0, 0, pageWidth, 42, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(22);
  pdf.text(fullName, margin, 19);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.text(
    `${text(employee?.employeeCode, "Employee")}  |  ${getLookupLabel(
      designationOptions,
      employee?.designationId,
      employee?.designationName,
    )}`,
    margin,
    28,
  );
  pdf.setFontSize(8);
  pdf.text("COSMOS  -  A WEWEL PRODUCT", margin, 36);
  y = 52;

  addSection("Personal & Contact", [
    ["Full name", fullName],
    ["Gender", getHrOptionLabel(HR_GENDER_OPTIONS, employee?.gender)],
    ["Date of birth", dateText(employee?.dateOfBirth)],
    ["Mobile", employee?.mobile ?? employee?.mobileNumber],
    ["Email", employee?.email ?? employee?.emailAddress],
  ]);

  addSection("Employment", [
    ["Employee code", employee?.employeeCode ?? employee?.code],
    ["Department", getLookupLabel(departmentOptions, employee?.departmentId, employee?.departmentName)],
    ["Designation", getLookupLabel(designationOptions, employee?.designationId, employee?.designationName)],
    ["Shift", getLookupLabel(shiftOptions, employee?.shiftId, employee?.shiftName)],
    ["Joining date", dateText(employee?.joiningDate)],
    ["Employment type", getHrOptionLabel(HR_EMPLOYMENT_TYPE_OPTIONS, employee?.employmentType)],
    ["Status", getEmployeeStatusLabel(employee?.status, employee?.statusName)],
  ]);

  getAddresses(employee).forEach((address, index) => {
    addSection(`Address ${index + 1}`, [
      ["Type", address?.addressType ?? address?.type],
      ["Address", [address?.addressLine1, address?.addressLine2].filter(Boolean).join(", ")],
      ["City", address?.city],
      ["State", address?.state],
      ["Country", address?.country],
      ["Pincode", address?.pincode ?? address?.pinCode ?? address?.postalCode],
    ]);
  });

  if (Object.values(currentBank).some((value) => text(value, ""))) {
    addSection("Bank Details", [
      ["Bank", currentBank?.bankName],
      ["Account number", currentBank?.accountNumber ?? currentBank?.accountNo],
      ["IFSC", currentBank?.ifscCode ?? currentBank?.ifsc],
      ["Branch", currentBank?.branchName ?? currentBank?.branch],
      ["UPI ID", currentBank?.upiId ?? currentBank?.upi],
    ]);
  }

  pdf.setFontSize(7.5);
  pdf.setTextColor(100, 116, 139);
  pdf.text(
    `Generated by COSMOS on ${new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date())}`,
    margin,
    pageHeight - 8,
  );
  pdf.save(`Employee-${safeFilePart(employee?.employeeCode ?? fullName)}.pdf`);
};
