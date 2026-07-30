import {
  Banknote,
  CalendarCheck,
  CalendarOff,
  Download,
  FileText,
  LogOut,
  Pencil,
  Plus,
  Trash2,
  UserPlus,
  UserRound,
} from "lucide-react";
import { useMemo, useState } from "react";

import AppButton from "../../../components/common/AppButton";
import AppTooltip from "../../../components/common/AppTooltip";
import {
  HR_ATTENDANCE_STATUS_OPTIONS,
  HR_EMPLOYEE_STATUS_KEY,
  HR_EMPLOYMENT_TYPE_OPTIONS,
  HR_GENDER_OPTIONS,
  HR_LEAVE_STATUS_OPTIONS,
  HR_LEAVE_TYPE_OPTIONS,
  getEmployeeStatusKey,
  getEmployeeStatusLabel,
  getHrOptionLabel,
} from "../../../utils/hrEnums";
import {
  formatHrDate,
  formatHrDateTime,
  formatHrTime,
  getEmployeeName,
  getHrRecordId,
  getLookupLabel,
} from "../hrHelpers";
import { EmployeeAvatar, EmployeeStatusPill } from "./EmployeeList";

const tabs = [
  { id: "overview", icon: UserRound, label: "Overview" },
  { id: "bank", icon: Banknote, label: "Bank Details" },
  { id: "documents", icon: FileText, label: "Documents" },
  { id: "attendance", icon: CalendarCheck, label: "Attendance" },
  { id: "leaves", icon: CalendarOff, label: "Leaves" },
];

const DetailRow = ({ label, value }) => {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-medium text-slate-900">
        {value || "-"}
      </p>
    </div>
  );
};

const EmptyPanel = ({ children, icon: Icon, title }) => {
  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-light text-brand">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">
        {children}
      </p>
    </div>
  );
};

const RelatedLoadingRows = () => (
  <div className="space-y-3">
    {Array.from({ length: 4 }, (_, index) => (
      <div key={index} className="h-14 animate-pulse rounded-xl bg-slate-100" />
    ))}
  </div>
);

const MiniStatusPill = ({ className, label }) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${className}`}
  >
    <span className="h-1.5 w-1.5 rounded-full bg-current opacity-75" />
    {label}
  </span>
);

const AttendanceStatusPill = ({ status }) => {
  const value = Number(status);
  const className =
    value === 1
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : value === 3
        ? "bg-amber-50 text-amber-700 ring-amber-200"
        : value === 4
          ? "bg-brand-light text-brand ring-brand/20"
          : "bg-red-50 text-red-700 ring-red-200";

  return (
    <MiniStatusPill
      className={className}
      label={getHrOptionLabel(HR_ATTENDANCE_STATUS_OPTIONS, status, "Unknown")}
    />
  );
};

const LeaveStatusPill = ({ status }) => {
  const value = Number(status);
  const className =
    value === 2
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : value === 3
        ? "bg-red-50 text-red-700 ring-red-200"
        : value === 4
          ? "bg-slate-100 text-slate-600 ring-slate-200"
          : "bg-amber-50 text-amber-700 ring-amber-200";

  return (
    <MiniStatusPill
      className={className}
      label={getHrOptionLabel(HR_LEAVE_STATUS_OPTIONS, status, "Unknown")}
    />
  );
};

const formatRelatedTime = (value) => {
  if (!value) {
    return "-";
  }

  return String(value).includes("T") ? formatHrDateTime(value) : formatHrTime(value);
};

const hasBankInfo = (bankDetails) => {
  return ["bankName", "accountNumber", "ifscCode", "branchName", "upiId"].some(
    (field) => String(bankDetails?.[field] ?? "").trim(),
  );
};

const getDocumentExpiryState = (expiryDate) => {
  if (!expiryDate) {
    return null;
  }

  const expiry = new Date(expiryDate);

  if (Number.isNaN(expiry.getTime())) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);

  const daysUntilExpiry = Math.ceil((expiry - today) / 86400000);

  if (daysUntilExpiry < 0) {
    return {
      className: "bg-red-50 text-red-700 ring-red-200",
      label: "Expired",
    };
  }

  if (daysUntilExpiry <= 30) {
    return {
      className: "bg-amber-50 text-amber-700 ring-amber-200",
      label: `${daysUntilExpiry} days left`,
    };
  }

  return {
    className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    label: "Valid",
  };
};

const humanizeKey = (key) =>
  String(key)
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (letter) => letter.toUpperCase());

const getLeaveBalanceRows = (leaveBalance) => {
  const candidateList =
    leaveBalance?.items ??
    leaveBalance?.balances ??
    leaveBalance?.leaveBalances ??
    leaveBalance?.data;

  if (Array.isArray(candidateList)) {
    return candidateList.map((item) => ({
      label:
        item.leaveTypeName ??
        item.typeName ??
        item.name ??
        getHrOptionLabel(HR_LEAVE_TYPE_OPTIONS, item.leaveType ?? item.type, "Leave"),
      value:
        item.remainingDays ??
        item.remaining ??
        item.balance ??
        item.availableDays ??
        item.available ??
        item.totalDays ??
        item.total ??
        0,
    }));
  }

  if (leaveBalance && typeof leaveBalance === "object") {
    return Object.entries(leaveBalance)
      .filter(([, value]) => ["number", "string"].includes(typeof value))
      .map(([key, value]) => ({ label: humanizeKey(key), value }));
  }

  return [];
};

const EmployeeProfilePanel = ({
  attendanceRecords = [],
  bankDetails,
  canDelete = false,
  canEdit = false,
  departmentOptions,
  designationOptions,
  documents,
  employee,
  leaveBalance,
  leaveRecords = [],
  onAddDocument,
  onDelete,
  onDeleteDocument,
  onEdit,
  onEditBank,
  onRejoin,
  onResign,
  relatedLoading,
  shiftOptions,
}) => {
  const [activeTab, setActiveTab] = useState("overview");
  const addresses = Array.isArray(employee?.addresses)
    ? employee.addresses
    : employee?.address
      ? [employee.address]
      : [];
  const employeeId = getHrRecordId(employee, "employee");
  const currentBankDetails = bankDetails ?? employee?.bankDetails;
  const documentList = useMemo(
    () => (Array.isArray(documents) ? documents : []),
    [documents],
  );
  const balanceRows = useMemo(
    () => getLeaveBalanceRows(leaveBalance),
    [leaveBalance],
  );
  const statusKey = getEmployeeStatusKey(employee?.status, employee?.statusName);
  const isActiveEmployee = statusKey === HR_EMPLOYEE_STATUS_KEY.ACTIVE;
  const isResignedEmployee = statusKey === HR_EMPLOYEE_STATUS_KEY.RESIGNED;
  const canEditCurrentEmployee = canEdit && !isResignedEmployee;
  const canDeleteCurrentEmployee = canDelete && !isResignedEmployee;

  if (!employee) {
    return (
      <EmptyPanel icon={UserRound} title="Select an employee">
        Choose an employee from the list to view profile, bank, document,
        attendance, and leave details.
      </EmptyPanel>
    );
  }

  return (
    <div className="flex h-full min-h-[560px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <EmployeeAvatar employee={employee} isSelected size="lg" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-lg font-semibold text-slate-900">
                  {getEmployeeName(employee)}
                </h2>
                <EmployeeStatusPill
                  status={employee.status}
                  statusName={employee.statusName}
                />
              </div>
              <p className="mt-1 text-sm text-slate-500">
                {employee.employeeCode ?? "-"} -{" "}
                {getLookupLabel(
                  designationOptions,
                  employee.designationId,
                  employee.designationName ?? "-",
                )}
              </p>
              {isResignedEmployee && (
                <p className="mt-2 text-xs font-medium text-amber-700">
                  Resigned {formatHrDate(employee.resignedDate)} - Last working{" "}
                  day {formatHrDate(employee.lastWorkingDate)}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap justify-start gap-2 lg:justify-end">
            {isResignedEmployee && canEdit ? (
              <AppButton
                className="h-9 rounded-lg px-3"
                onClick={() => onRejoin?.(employee)}
              >
                <UserPlus className="h-4 w-4" />
                Rejoin
              </AppButton>
            ) : (
              <>
                {canEditCurrentEmployee && (
                  <AppButton
                    variant="secondary"
                    className="h-9 rounded-lg px-3"
                    onClick={() => onEdit(employee)}
                  >
                    <Pencil className="h-4 w-4" />
                    Edit
                  </AppButton>
                )}
                {isActiveEmployee && canEdit && (
                  <AppButton
                    variant="secondary"
                    className="h-9 rounded-lg px-3 text-amber-700 hover:bg-amber-50"
                    onClick={() => onResign?.(employee)}
                  >
                    <LogOut className="h-4 w-4" />
                    Resign
                  </AppButton>
                )}
                {canDeleteCurrentEmployee && (
                  <AppTooltip label="Delete employee">
                    <button
                      type="button"
                      onClick={() => onDelete(employee)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600"
                      aria-label="Delete employee"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </AppTooltip>
                )}
              </>
            )}
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          <div className="flex gap-1 border-b border-slate-200">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={[
                    "flex h-11 items-center gap-2 border-b-2 px-3 text-sm font-medium transition-colors",
                    isActive
                      ? "border-brand text-brand"
                      : "border-transparent text-slate-500 hover:text-slate-800",
                  ].join(" ")}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        {activeTab === "overview" && (
          <div className="space-y-5">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Personal & Contact
              </h3>
              <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <DetailRow
                  label="Gender"
                  value={getHrOptionLabel(HR_GENDER_OPTIONS, employee.gender)}
                />
                <DetailRow
                  label="Date of Birth"
                  value={formatHrDate(employee.dateOfBirth)}
                />
                <DetailRow label="Mobile" value={employee.mobile} />
                <DetailRow label="Email" value={employee.email} />
                <DetailRow
                  label="Joining Date"
                  value={formatHrDate(employee.joiningDate)}
                />
                <DetailRow
                  label="Employment Type"
                  value={getHrOptionLabel(
                    HR_EMPLOYMENT_TYPE_OPTIONS,
                    employee.employmentType,
                  )}
                />
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Employment
              </h3>
              <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <DetailRow
                  label="Department"
                  value={getLookupLabel(
                    departmentOptions,
                    employee.departmentId,
                    employee.departmentName,
                  )}
                />
                <DetailRow
                  label="Designation"
                  value={getLookupLabel(
                    designationOptions,
                    employee.designationId,
                    employee.designationName,
                  )}
                />
                <DetailRow
                  label="Shift"
                  value={getLookupLabel(
                    shiftOptions,
                    employee.shiftId,
                    employee.shiftName,
                  )}
                />
                <DetailRow
                  label="Status"
                  value={getEmployeeStatusLabel(
                    employee.status,
                    employee.statusName,
                  )}
                />
                <DetailRow
                  label="Reporting Manager"
                  value={employee.reportingManagerName}
                />
                {isResignedEmployee && (
                  <>
                    <DetailRow
                      label="Resigned Date"
                      value={formatHrDate(employee.resignedDate)}
                    />
                    <DetailRow
                      label="Last Working Date"
                      value={formatHrDate(employee.lastWorkingDate)}
                    />
                    <DetailRow
                      label="Resignation Reason"
                      value={employee.resignationReason}
                    />
                  </>
                )}
                {employee.rejoinedDate && (
                  <DetailRow
                    label="Rejoined Date"
                    value={formatHrDate(employee.rejoinedDate)}
                  />
                )}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-900">Addresses</h3>
              {addresses.length === 0 ? (
                <div className="mt-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                  No address has been saved for this employee.
                </div>
              ) : (
                <div className="mt-3 space-y-3">
                  {addresses.map((address, index) => (
                    <div
                      key={`${address.addressType ?? "address"}-${index}`}
                      className="rounded-xl border border-slate-100 bg-slate-50 p-3"
                    >
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Address {index + 1}
                      </p>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <DetailRow
                          label="Address Type"
                          value={address.addressType}
                        />
                        <DetailRow
                          label="Address Line 1"
                          value={address.addressLine1}
                        />
                        <DetailRow
                          label="Address Line 2"
                          value={address.addressLine2}
                        />
                        <DetailRow label="City" value={address.city} />
                        <DetailRow label="State" value={address.state} />
                        <DetailRow label="Country" value={address.country} />
                        <DetailRow label="Pincode" value={address.pincode} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "bank" && (
          <div>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-slate-900">
                Bank Details
              </h3>
              {canEdit && (
                <AppButton
                  variant="secondary"
                  className="h-9 rounded-lg px-3"
                  onClick={() => onEditBank(employee)}
                >
                  <Pencil className="h-4 w-4" />
                  {hasBankInfo(currentBankDetails) ? "Edit Bank" : "Add Bank"}
                </AppButton>
              )}
            </div>
            {!hasBankInfo(currentBankDetails) ? (
              <EmptyPanel icon={Banknote} title="No bank details">
                Add payroll bank details for this employee when they are ready.
              </EmptyPanel>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                <DetailRow
                  label="Bank Name"
                  value={currentBankDetails?.bankName}
                />
                <DetailRow
                  label="Account Number"
                  value={currentBankDetails?.accountNumber}
                />
                <DetailRow
                  label="IFSC Code"
                  value={currentBankDetails?.ifscCode}
                />
                <DetailRow
                  label="Branch"
                  value={currentBankDetails?.branchName}
                />
                <DetailRow label="UPI ID" value={currentBankDetails?.upiId} />
              </div>
            )}
          </div>
        )}

        {activeTab === "documents" && (
          <div>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-slate-900">
                Documents
              </h3>
              {canEdit && (
                <AppButton
                  className="h-9 rounded-lg px-3"
                  onClick={onAddDocument}
                >
                  <Plus className="h-4 w-4" />
                  Add Document
                </AppButton>
              )}
            </div>

            {relatedLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }, (_, index) => (
                  <div
                    key={index}
                    className="h-16 animate-pulse rounded-xl bg-slate-100"
                  />
                ))}
              </div>
            ) : documentList.length === 0 ? (
              <EmptyPanel icon={FileText} title="No documents">
                Upload identity, contract, or certification documents for this
                employee.
              </EmptyPanel>
            ) : (
              <div className="space-y-3">
                {documentList.map((document) => {
                  const documentId = getHrRecordId(document, "document");
                  const expiryState = getDocumentExpiryState(document.expiryDate);

                  return (
                    <div
                      key={documentId ?? document.fileName}
                      className="flex flex-col gap-3 rounded-xl border border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {document.fileName ?? "-"}
                          </p>
                          {expiryState && (
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${expiryState.className}`}
                            >
                              {expiryState.label}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {document.documentType ?? "Document"} - Expiry{" "}
                          {formatHrDate(document.expiryDate)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        {document.filePath && (
                          <a
                            href={document.filePath}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-brand hover:bg-brand-light"
                          >
                            <Download className="h-3.5 w-3.5" />
                            Open
                          </a>
                        )}
                        {canDelete && (
                          <AppTooltip label="Delete document">
                            <button
                              type="button"
                              onClick={() => onDeleteDocument(document)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                              aria-label="Delete document"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </AppTooltip>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === "attendance" && (
          <div>
            <h3 className="mb-4 text-sm font-semibold text-slate-900">
              Recent Attendance
            </h3>
            {relatedLoading ? (
              <RelatedLoadingRows />
            ) : attendanceRecords.length === 0 ? (
              <EmptyPanel icon={CalendarCheck} title="No attendance records">
                No attendance has been recorded yet for employee #{employeeId}.
              </EmptyPanel>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full min-w-[680px] text-left">
                  <thead className="bg-slate-50">
                    <tr>
                      {["Date", "Check In", "Check Out", "Status"].map(
                        (heading) => (
                          <th
                            key={heading}
                            className="border-b border-slate-200 px-4 py-3 text-xs font-medium uppercase tracking-wide text-slate-500"
                          >
                            {heading}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceRecords.map((record, index) => (
                      <tr
                        key={record.id ?? record.attendanceId ?? index}
                        className="hover:bg-slate-50"
                      >
                        <td className="border-b border-slate-100 px-4 py-3 text-sm font-medium text-slate-900">
                          {formatHrDate(
                            record.attendanceDate ?? record.date ?? record.workDate,
                          )}
                        </td>
                        <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-600">
                          {formatRelatedTime(
                            record.checkInTime ?? record.checkIn ?? record.inTime,
                          )}
                        </td>
                        <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-600">
                          {formatRelatedTime(
                            record.checkOutTime ?? record.checkOut ?? record.outTime,
                          )}
                        </td>
                        <td className="border-b border-slate-100 px-4 py-3">
                          <AttendanceStatusPill
                            status={
                              record.attendanceStatus ??
                              record.status ??
                              record.attendanceStatusId
                            }
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === "leaves" && (
          <div className="space-y-5">
            <div>
              <h3 className="mb-4 text-sm font-semibold text-slate-900">
                Leave Balance
              </h3>
              {relatedLoading ? (
                <RelatedLoadingRows />
              ) : balanceRows.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                  No leave balance is available for employee #{employeeId}.
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {balanceRows.map((item) => (
                    <div
                      key={item.label}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
                    >
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        {item.label}
                      </p>
                      <p className="mt-1 text-lg font-bold text-slate-900">
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="mb-4 text-sm font-semibold text-slate-900">
                Leave History
              </h3>
              {relatedLoading ? (
                <RelatedLoadingRows />
              ) : leaveRecords.length === 0 ? (
                <EmptyPanel icon={CalendarOff} title="No leave records">
                  No leave requests have been recorded yet for employee #
                  {employeeId}.
                </EmptyPanel>
              ) : (
                <div className="space-y-3">
                  {leaveRecords.map((leave, index) => (
                    <div
                      key={leave.id ?? leave.leaveId ?? index}
                      className="flex flex-col gap-3 rounded-xl border border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {getHrOptionLabel(
                            HR_LEAVE_TYPE_OPTIONS,
                            leave.leaveType ?? leave.type,
                            leave.leaveTypeName ?? "Leave",
                          )}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatHrDate(leave.fromDate ?? leave.startDate)} -{" "}
                          {formatHrDate(leave.toDate ?? leave.endDate)}
                        </p>
                      </div>
                      <LeaveStatusPill status={leave.status ?? leave.leaveStatus} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeProfilePanel;
