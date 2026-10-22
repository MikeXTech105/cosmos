import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2, UserRound } from "lucide-react";
import { useEffect, useMemo } from "react";
import {
  Controller,
  useFieldArray,
  useForm,
  useWatch,
} from "react-hook-form";
import { toast } from "sonner";

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
import {
  clearFormDraft,
  readFormDraft,
  saveFormDraft,
} from "../../../utils/formDraftStorage";
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
  canCreateDepartment = false,
  canCreateDesignation = false,
  canCreateReportingManager = false,
  canCreateShift = false,
  departmentOptions,
  designationOptions,
  employee,
  isLoading,
  isOpen,
  mode,
  onClose,
  onCreateDepartment,
  onCreateDesignation,
  onCreateReportingManager,
  onCreateShift,
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
    getValues,
    register,
    reset,
    setValue,
  } = useForm({
    resolver: zodResolver(hrEmployeeSchema),
    defaultValues: mapEmployeeToForm(employee),
  });
  const {
    append: appendAddress,
    fields: addressFields,
    remove: removeAddress,
  } = useFieldArray({
    control,
    name: "addresses",
  });
  const selectedDepartmentId = useWatch({ control, name: "departmentId" });
  const selectedDesignationId = useWatch({ control, name: "designationId" });
  const filteredDesignationOptions = useMemo(() => {
    if (!selectedDepartmentId) return [];

    return designationOptions.filter((option) => {
      return (
        option.departmentId === null ||
        option.departmentId === undefined ||
        String(option.departmentId) === String(selectedDepartmentId)
      );
    });
  }, [designationOptions, selectedDepartmentId]);

  useEffect(() => {
    if (isOpen) {
      const savedDraft = !employee && mode === "create"
        ? readFormDraft("employee-create")
        : null;
      reset(savedDraft ?? mapEmployeeToForm(employee));
      if (savedDraft) {
        toast.info("Your saved employee draft has been restored.");
      }
    }
  }, [employee, isOpen, mode, reset]);

  useEffect(() => {
    if (!selectedDesignationId) return;

    const selectedOption = designationOptions.find(
      (option) => String(option.value) === String(selectedDesignationId),
    );

    if (
      selectedOption?.departmentId !== null &&
      selectedOption?.departmentId !== undefined &&
      String(selectedOption.departmentId) !== String(selectedDepartmentId)
    ) {
      setValue("designationId", "", {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  }, [
    designationOptions,
    selectedDepartmentId,
    selectedDesignationId,
    setValue,
  ]);

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
    if (!isEdit) {
      clearFormDraft("employee-create");
    }
  };

  const title = isView
    ? "View Employee"
    : isEdit
      ? "Edit Employee"
      : "Add Employee";

  return (
    <AppModal
      isBusy={isSubmitting}
      isOpen={isOpen}
      maxWidth="max-w-[1480px]"
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
                      onChange={(value) => {
                        field.onChange(value);
                        setValue("designationId", "", {
                          shouldDirty: true,
                          shouldValidate: false,
                        });
                      }}
                      options={departmentOptions}
                      placeholder="Select department"
                      disabled={isView}
                      error={errors.departmentId?.message}
                      creatable={canCreateDepartment}
                      createLabel="Create new department"
                      onCreateClick={onCreateDepartment}
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
                      options={filteredDesignationOptions}
                      placeholder={
                        selectedDepartmentId
                          ? "Select designation"
                          : "Select department first"
                      }
                      emptyMessage="No active designations for this department"
                      disabled={isView || !selectedDepartmentId}
                      error={errors.designationId?.message}
                      creatable={canCreateDesignation}
                      createLabel="Create new designation"
                      onCreateClick={onCreateDesignation}
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
                      creatable={canCreateReportingManager}
                      createLabel="Create new employee"
                      onCreateClick={onCreateReportingManager}
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
                      creatable={canCreateShift}
                      createLabel="Create new shift"
                      onCreateClick={onCreateShift}
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

            <Section title="Addresses">
              <div className="space-y-4">
                {addressFields.map((addressField, index) => {
                  const addressErrors = errors.addresses?.[index] ?? {};

                  return (
                    <div
                      key={addressField.id}
                      className="rounded-xl border border-slate-100 bg-slate-50 p-3"
                    >
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Address {index + 1}
                        </p>
                        {!isView && addressFields.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeAddress(index)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                            aria-label={`Remove address ${index + 1}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <AppInput
                          id={`addressType-${index}`}
                          label="Address Type"
                          disabled={isView}
                          error={addressErrors.addressType?.message}
                          {...register(`addresses.${index}.addressType`)}
                        />
                        <AppInput
                          id={`addressLine1-${index}`}
                          label="Address Line 1"
                          disabled={isView}
                          error={addressErrors.addressLine1?.message}
                          {...register(`addresses.${index}.addressLine1`)}
                        />
                        <AppInput
                          id={`addressLine2-${index}`}
                          label="Address Line 2"
                          disabled={isView}
                          error={addressErrors.addressLine2?.message}
                          {...register(`addresses.${index}.addressLine2`)}
                        />
                        <AppInput
                          id={`city-${index}`}
                          label="City"
                          disabled={isView}
                          error={addressErrors.city?.message}
                          {...register(`addresses.${index}.city`)}
                        />
                        <AppInput
                          id={`state-${index}`}
                          label="State"
                          disabled={isView}
                          error={addressErrors.state?.message}
                          {...register(`addresses.${index}.state`)}
                        />
                        <AppInput
                          id={`country-${index}`}
                          label="Country"
                          disabled={isView}
                          error={addressErrors.country?.message}
                          {...register(`addresses.${index}.country`)}
                        />
                        <AppInput
                          id={`pincode-${index}`}
                          label="Pincode"
                          disabled={isView}
                          error={addressErrors.pincode?.message}
                          {...register(`addresses.${index}.pincode`)}
                        />
                      </div>
                    </div>
                  );
                })}

                {!isView && (
                  <AppButton
                    variant="secondary"
                    className="h-10 rounded-lg px-3"
                    onClick={() =>
                      appendAddress({
                        addressType: "Secondary",
                        addressLine1: "",
                        addressLine2: "",
                        city: "",
                        state: "",
                        country: "",
                        pincode: "",
                      })
                    }
                  >
                    <Plus className="h-4 w-4" />
                    Add Address
                  </AppButton>
                )}
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
              <>
                {!isEdit && (
                  <AppButton
                    variant="secondary"
                    disabled={isSubmitting}
                    onClick={() => {
                      saveFormDraft("employee-create", getValues());
                      toast.success("Employee draft saved on this device");
                      onClose();
                    }}
                  >
                    Save as Draft
                  </AppButton>
                )}
                <AppButton type="submit" isLoading={isSubmitting} loadingText="Saving…">
                  {isEdit ? "Save Changes" : "Create Employee"}
                </AppButton>
              </>
            )}
          </div>
        </form>
      )}
    </AppModal>
  );
};

export default EmployeeFormModal;
