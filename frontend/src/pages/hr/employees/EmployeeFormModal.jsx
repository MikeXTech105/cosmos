import { zodResolver } from "@hookform/resolvers/zod";
import { UserRound } from "lucide-react";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";

import AppButton from "../../../components/common/AppButton";
import AppImageUpload from "../../../components/common/AppImageUpload";
import AppInput from "../../../components/common/AppInput";
import AppModal from "../../../components/common/AppModal";
import AppSelect from "../../../components/common/AppSelect";
import {
  HR_EMPLOYEE_STATUS_OPTIONS,
  HR_EMPLOYMENT_TYPE_OPTIONS,
  HR_GENDER_OPTIONS,
} from "../../../utils/hrEnums";
import { hrEmployeeSchema } from "../../../utils/validationSchemas";
import { getHrRecordId } from "../hrHelpers";
import {
  hasBankDetails,
  mapEmployeeToForm,
  mapFormToBankDetails,
  mapFormToPayload,
} from "./employeeFormMappers";

const Section = ({ children, title }) => {
  return (
    <div className="rounded-2xl border border-slate-200 p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {title}
      </h3>
      <div className="mt-4 space-y-4">{children}</div>
    </div>
  );
};

const EmployeeFormModal = ({
  departmentOptions,
  designationOptions,
  employee,
  isLoading,
  isOpen,
  mode,
  onClose,
  onSubmit,
  reportingManagerOptions,
  shiftOptions,
}) => {
  const isView = mode === "view";
  const isEdit = mode === "edit";
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm({
    resolver: zodResolver(hrEmployeeSchema),
    defaultValues: mapEmployeeToForm(employee),
  });

  useEffect(() => {
    if (isOpen) {
      reset(mapEmployeeToForm(employee));
    }
  }, [employee, isOpen, reset]);

  const submitForm = async (values) => {
    await onSubmit(
      mapFormToPayload(values, { includeBankDetails: !isEdit }),
      {
        bankDetails: mapFormToBankDetails(values),
        shouldSaveBankDetails:
          isEdit &&
          (hasBankDetails(values) || hasBankDetails(employee?.bankDetails)),
      },
    );
  };

  const title = isView
    ? "View Employee"
    : isEdit
      ? "Edit Employee"
      : "Add Employee";

  return (
    <AppModal
      isOpen={isOpen}
      maxWidth="max-w-5xl"
      onClose={isSubmitting ? undefined : onClose}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-light text-brand">
          <UserRound className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">
            Maintain employee identity, contact, employment, address, and bank
            details.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-6 space-y-4">
          {Array.from({ length: 8 }, (_, index) => (
            <div
              key={index}
              className="h-12 animate-pulse rounded-xl bg-slate-100"
            />
          ))}
        </div>
      ) : (
        <form
          className="mt-6 max-h-[70vh] overflow-y-auto pr-1"
          onSubmit={handleSubmit(submitForm)}
        >
          <div className="space-y-4">
            <Section title="Personal Information">
              <Controller
                name="profilePhotoUrl"
                control={control}
                render={({ field }) => (
                  <AppImageUpload
                    label="Profile Photo"
                    value={field.value}
                    onChange={field.onChange}
                    disabled={isView}
                    error={errors.profilePhotoUrl?.message}
                  />
                )}
              />

              <div className="grid gap-4 md:grid-cols-3">
                <AppInput
                  id="employeeCode"
                  label="Employee Code"
                  required
                  disabled={isView}
                  error={errors.employeeCode?.message}
                  {...register("employeeCode")}
                />
                <AppInput
                  id="firstName"
                  label="First Name"
                  required
                  disabled={isView}
                  error={errors.firstName?.message}
                  {...register("firstName")}
                />
                <AppInput
                  id="lastName"
                  label="Last Name"
                  required
                  disabled={isView}
                  error={errors.lastName?.message}
                  {...register("lastName")}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <Controller
                  name="gender"
                  control={control}
                  render={({ field }) => (
                    <AppSelect
                      label="Gender"
                      value={field.value}
                      onChange={field.onChange}
                      options={HR_GENDER_OPTIONS}
                      disabled={isView}
                      error={errors.gender?.message}
                    />
                  )}
                />
                <AppInput
                  id="dateOfBirth"
                  label="Date of Birth"
                  type="date"
                  required
                  disabled={isView}
                  error={errors.dateOfBirth?.message}
                  {...register("dateOfBirth")}
                />
                <AppInput
                  id="joiningDate"
                  label="Joining Date"
                  type="date"
                  required
                  disabled={isView}
                  error={errors.joiningDate?.message}
                  {...register("joiningDate")}
                />
              </div>
            </Section>

            <Section title="Contact">
              <div className="grid gap-4 md:grid-cols-2">
                <AppInput
                  id="mobile"
                  label="Mobile"
                  required
                  disabled={isView}
                  error={errors.mobile?.message}
                  {...register("mobile")}
                />
                <AppInput
                  id="email"
                  label="Email"
                  type="email"
                  required
                  disabled={isView}
                  error={errors.email?.message}
                  {...register("email")}
                />
              </div>
            </Section>

            <Section title="Employment">
              <div className="grid gap-4 md:grid-cols-2">
                <Controller
                  name="departmentId"
                  control={control}
                  render={({ field }) => (
                    <AppSelect
                      label="Department"
                      required
                      value={field.value}
                      onChange={field.onChange}
                      options={departmentOptions}
                      placeholder="Select department"
                      disabled={isView}
                      error={errors.departmentId?.message}
                    />
                  )}
                />
                <Controller
                  name="designationId"
                  control={control}
                  render={({ field }) => (
                    <AppSelect
                      label="Designation"
                      required
                      value={field.value}
                      onChange={field.onChange}
                      options={designationOptions}
                      placeholder="Select designation"
                      disabled={isView}
                      error={errors.designationId?.message}
                    />
                  )}
                />
                <Controller
                  name="reportingManagerId"
                  control={control}
                  render={({ field }) => (
                    <AppSelect
                      label="Reporting Manager"
                      value={field.value}
                      onChange={field.onChange}
                      options={[
                        { value: "", label: "No manager" },
                        ...reportingManagerOptions.filter((option) => {
                          return (
                            String(option.value) !==
                            String(getHrRecordId(employee, "employee"))
                          );
                        }),
                      ]}
                      disabled={isView}
                      error={errors.reportingManagerId?.message}
                    />
                  )}
                />
                <Controller
                  name="shiftId"
                  control={control}
                  render={({ field }) => (
                    <AppSelect
                      label="Shift"
                      required
                      value={field.value}
                      onChange={field.onChange}
                      options={shiftOptions}
                      placeholder="Select shift"
                      disabled={isView}
                      error={errors.shiftId?.message}
                    />
                  )}
                />
                <Controller
                  name="employmentType"
                  control={control}
                  render={({ field }) => (
                    <AppSelect
                      label="Employment Type"
                      value={field.value}
                      onChange={field.onChange}
                      options={HR_EMPLOYMENT_TYPE_OPTIONS}
                      disabled={isView}
                      error={errors.employmentType?.message}
                    />
                  )}
                />
                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <AppSelect
                      label="Status"
                      value={field.value}
                      onChange={field.onChange}
                      options={HR_EMPLOYEE_STATUS_OPTIONS}
                      disabled={isView}
                      error={errors.status?.message}
                    />
                  )}
                />
              </div>
            </Section>

            <Section title="Address">
              <div className="grid gap-4 md:grid-cols-2">
                <AppInput
                  id="addressType"
                  label="Address Type"
                  disabled={isView}
                  error={errors.addressType?.message}
                  {...register("addressType")}
                />
                <AppInput
                  id="addressLine1"
                  label="Address Line 1"
                  disabled={isView}
                  error={errors.addressLine1?.message}
                  {...register("addressLine1")}
                />
                <AppInput
                  id="addressLine2"
                  label="Address Line 2"
                  disabled={isView}
                  error={errors.addressLine2?.message}
                  {...register("addressLine2")}
                />
                <AppInput
                  id="city"
                  label="City"
                  disabled={isView}
                  error={errors.city?.message}
                  {...register("city")}
                />
                <AppInput
                  id="state"
                  label="State"
                  disabled={isView}
                  error={errors.state?.message}
                  {...register("state")}
                />
                <AppInput
                  id="country"
                  label="Country"
                  disabled={isView}
                  error={errors.country?.message}
                  {...register("country")}
                />
                <AppInput
                  id="pincode"
                  label="Pincode"
                  disabled={isView}
                  error={errors.pincode?.message}
                  {...register("pincode")}
                />
              </div>
            </Section>

            {!isView && (
              <Section title="Bank Details">
                <div className="grid gap-4 md:grid-cols-2">
                  <AppInput
                    id="bankName"
                    label="Bank Name"
                    error={errors.bankName?.message}
                    {...register("bankName")}
                  />
                  <AppInput
                    id="accountNumber"
                    label="Account Number"
                    error={errors.accountNumber?.message}
                    {...register("accountNumber")}
                  />
                  <AppInput
                    id="ifscCode"
                    label="IFSC Code"
                    error={errors.ifscCode?.message}
                    {...register("ifscCode")}
                  />
                  <AppInput
                    id="branchName"
                    label="Branch Name"
                    error={errors.branchName?.message}
                    {...register("branchName")}
                  />
                  <AppInput
                    id="upiId"
                    label="UPI ID"
                    error={errors.upiId?.message}
                    {...register("upiId")}
                  />
                </div>
              </Section>
            )}
          </div>

          <div className="sticky bottom-0 mt-5 flex flex-col-reverse gap-2 border-t border-slate-200 bg-white pt-4 sm:flex-row sm:justify-end">
            <AppButton variant="secondary" onClick={onClose}>
              {isView ? "Close" : "Cancel"}
            </AppButton>
            {!isView && (
              <AppButton type="submit" isLoading={isSubmitting}>
                {isEdit ? "Save Changes" : "Create Employee"}
              </AppButton>
            )}
          </div>
        </form>
      )}
    </AppModal>
  );
};

export default EmployeeFormModal;
