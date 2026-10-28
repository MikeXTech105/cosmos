import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Plus, Save, Trash2, UserRound } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Controller,
  useFieldArray,
  useForm,
  useWatch,
} from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import AppButton from "../../../components/common/AppButton";
import AppImageUpload from "../../../components/common/AppImageUpload";
import AppInput from "../../../components/common/AppInput";
import PageHeader from "../../../components/common/PageHeader";
import AppSelect from "../../../components/common/AppSelect";
import useCreatePermission from "../../../hooks/useCreatePermission";
import useUnsavedChanges from "../../../hooks/useUnsavedChanges";
import useScopedDraft from "../../../hooks/useScopedDraft";
import { withoutDirtyPrompt } from "../../../utils/dirtyWork";
import { getApiFieldErrors } from "../../../utils/apiError";
import { hrDepartmentService } from "../../../services/hr/departmentService";
import { hrDesignationService } from "../../../services/hr/designationService";
import { hrEmployeeService } from "../../../services/hr/employeeService";
import { hrShiftService } from "../../../services/hr/shiftService";
import {
  createHrEmployee,
  fetchHrEmployeeBankDetails,
  fetchHrEmployeeById,
  saveHrEmployeeBankDetails,
  updateHrEmployee,
} from "../../../store/slices/hr/employeeSlice";
import {
  HR_EMPLOYEE_STATUS_OPTIONS,
  HR_EMPLOYMENT_TYPE_OPTIONS,
  HR_GENDER_OPTIONS,
} from "../../../utils/hrEnums";
import { hrEmployeeSchema } from "../../../utils/validationSchemas";
import DepartmentFormModal from "../departments/DepartmentFormModal";
import DesignationFormModal from "../designations/DesignationFormModal";
import ShiftFormModal from "../shifts/ShiftFormModal";
import {
  extractHrEntity,
  getEmployeeName,
  getHrActionError,
  getHrRecordId,
  getHrSuccessMessage,
} from "../hrHelpers";
import useHrCapabilities from "../useHrCapabilities";
import {
  hasBankDetails,
  mapEmployeeToForm,
  mapFormToBankDetails,
  mapFormToPayload,
} from "./employeeFormMappers";
import { exportEmployeeProfilePdf } from "./exportEmployeeProfilePdf";
import { saveEmployeeBankSafely } from "./bankSaveRecovery";

const extractList = (response) => {
  if (Array.isArray(response?.data?.items)) {
    return response.data.items;
  }

  if (Array.isArray(response?.data)) {
    return response.data;
  }

  return [];
};

const toOption = (record, idResource, labelCandidates, metadata = {}) => {
  const value = getHrRecordId(record, idResource);
  const label = labelCandidates
    .map((candidate) =>
      typeof candidate === "function" ? candidate(record) : record?.[candidate],
    )
    .find((candidate) => String(candidate ?? "").trim());

  return label && value ? { label, value, ...metadata } : null;
};

const Section = ({ children, title, optional = false }) => optional ? (
  <details className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><summary className="cursor-pointer text-base font-semibold text-slate-900">{title} — optional</summary><div className="mt-4 space-y-4">{children}</div></details>
) : (
  <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <h2 className="mb-4 text-base font-semibold text-slate-900">{title}</h2>
    <div className="space-y-4">{children}</div>
  </section>
);

const EmployeeFormPage = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const capabilities = useHrCapabilities({ label: "Employees", pageName: "HR.Employee", resource: "employees", route: "/hr/employees" });
  const canCreateDepartment = useCreatePermission({ label: "Departments", pageName: "HR.Department", resource: "departments", route: "/hr/departments" });
  const canCreateDesignation = useCreatePermission({ label: "Designations", pageName: "HR.Designation", resource: "designations", route: "/hr/designations" });
  const canCreateShift = useCreatePermission({ label: "Shifts", pageName: "HR.Shift", resource: "shifts", route: "/hr/shifts" });

  const detailLoading = useSelector((state) => state.hrEmployees.detailLoading);
  const detailError = useSelector((state) => state.hrEmployees.detailError);
  const detailEmployee = useSelector((state) => state.hrEmployees.selected);
  const detailBankDetails = useSelector((state) => state.hrEmployees.bankDetails);

  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [designationOptions, setDesignationOptions] = useState([]);
  const [shiftOptions, setShiftOptions] = useState([]);
  const [reportingManagerOptions, setReportingManagerOptions] = useState([]);
  const [lookupCreateModal, setLookupCreateModal] = useState({ department: false, designation: false, shift: false });
  const [pendingBankUpdate, setPendingBankUpdate] = useState(null);
  const [retryingBankUpdate, setRetryingBankUpdate] = useState(false);

  const {
    control,
    formState: { errors, isDirty, isSubmitting },
    handleSubmit,
    getValues,
    register,
    reset,
    setValue,
    setError,
  } = useForm({
    resolver: zodResolver(hrEmployeeSchema),
    defaultValues: mapEmployeeToForm(null),
  });
  const {
    append: appendAddress,
    fields: addressFields,
    remove: removeAddress,
  } = useFieldArray({ control, name: "addresses" });
  const selectedDepartmentId = useWatch({ control, name: "departmentId" });
  const allValues = useWatch({ control });
  const safeDraftValues = { ...allValues, bankName: "", accountNumber: "", ifscCode: "", branchName: "", upiId: "" };
  const scopedDraft = useScopedDraft({ entity: "employee-onboarding", context: "new", values: safeDraftValues, enabled: !isEdit && isDirty });
  useUnsavedChanges({ when: isDirty || Boolean(pendingBankUpdate) });
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

  const loadLookups = useCallback(async () => {
    try {
      const [departments, designations, shifts, managers] = await Promise.all([
        hrDepartmentService.getDepartments({ IsActive: true, PageNumber: 1, PageSize: 200 }),
        hrDesignationService.getDesignations({ IsActive: true, PageNumber: 1, PageSize: 200 }),
        hrShiftService.getShifts({ IsActive: true, PageNumber: 1, PageSize: 200 }),
        hrEmployeeService.getReportingManagers(),
      ]);

      setDepartmentOptions(extractList(departments).map((department) => toOption(department, "department", ["departmentName"])).filter(Boolean));
      setDesignationOptions(extractList(designations).map((designation) => toOption(designation, "designation", ["designationName"], { departmentId: designation.departmentId ?? designation.department?.id ?? null })).filter(Boolean));
      setShiftOptions(extractList(shifts).map((shift) => toOption(shift, "shift", ["shiftName"])).filter(Boolean));
      setReportingManagerOptions(
        extractList(managers)
          .map((employee) => toOption(employee, "employee", [(record) => getEmployeeName(record), "name", "employeeName"]))
          .filter((option) => option && String(option.value) !== String(id)),
      );
    } catch (error) {
      toast.error(getHrActionError(error, "Unable to load HR lookup data."));
    }
  }, [id]);

  useEffect(() => {
    void Promise.resolve().then(loadLookups);
  }, [loadLookups]);

  useEffect(() => {
    if (!isEdit) {
      return undefined;
    }

    const detailRequest = dispatch(fetchHrEmployeeById(id));
    void dispatch(fetchHrEmployeeBankDetails(id));
    detailRequest.unwrap().catch((error) => {
      if (error?.name !== "AbortError") {
        toast.error(getHrActionError(error, "Unable to load this employee."));
      }
    });

    return () => detailRequest.abort();
  }, [dispatch, id, isEdit]);

  useEffect(() => {
    if (isEdit) {
      if (!isDirty && detailEmployee && String(getHrRecordId(detailEmployee, "employee")) === String(id)) {
        reset(mapEmployeeToForm({ ...detailEmployee, bankDetails: detailBankDetails ?? detailEmployee.bankDetails }));
      }
      return;
    }

  }, [detailBankDetails, detailEmployee, id, isDirty, isEdit, reset]);

  useEffect(() => {
    if (!selectedDesignationId) return;

    const selectedOption = designationOptions.find((option) => String(option.value) === String(selectedDesignationId));

    if (
      selectedOption?.departmentId !== null &&
      selectedOption?.departmentId !== undefined &&
      String(selectedOption.departmentId) !== String(selectedDepartmentId)
    ) {
      setValue("designationId", "", { shouldDirty: true, shouldValidate: true });
    }
  }, [designationOptions, selectedDepartmentId, selectedDesignationId, setValue]);

  const openLookupCreate = useCallback((type) => {
    const allowed = { department: canCreateDepartment, designation: canCreateDesignation, shift: canCreateShift }[type];

    if (allowed) {
      setLookupCreateModal((current) => ({ ...current, [type]: true }));
    }
  }, [canCreateDepartment, canCreateDesignation, canCreateShift]);
  const closeLookupCreate = useCallback((type) => setLookupCreateModal((current) => ({ ...current, [type]: false })), []);
  const submitLookupCreate = useCallback(async (type, payload) => {
    try {
      let response;
      if (type === "department") {
        response = await hrDepartmentService.createDepartment(payload);
        toast.success("Department created successfully");
      } else if (type === "designation") {
        response = await hrDesignationService.createDesignation(payload);
        toast.success("Designation created successfully");
      } else {
        response = await hrShiftService.createShift(payload);
        toast.success("Shift created successfully");
      }

      await loadLookups();
      const created = extractHrEntity(response?.data, type);
      const savedId = getHrRecordId(created, type);
      if (savedId) {
        const option = toOption(created, type, [`${type}Name`, "name"], type === "designation" ? { departmentId: created.departmentId ?? payload.departmentId } : {});
        const setter = { department: setDepartmentOptions, designation: setDesignationOptions, shift: setShiftOptions }[type];
        if (option) setter((current) => [...current.filter((item) => String(item.value) !== String(savedId)), option]);
        if (type === "designation" && payload.departmentId) setValue("departmentId", payload.departmentId, { shouldDirty: true });
        setValue(`${type}Id`, savedId, { shouldDirty: true, shouldValidate: true });
      }
      closeLookupCreate(type);
      window.setTimeout(() => document.getElementById(`employee-${type}`)?.focus(), 0);
    } catch (error) {
      toast.error(getHrActionError(error, "Unable to create record."));
      throw error;
    }
  }, [closeLookupCreate, loadLookups, setValue]);

  const saveDisabledReason = (isEdit ? capabilities.canUpdate : capabilities.canCreate)
    ? ""
    : `You need ${isEdit ? "edit" : "create"} permission for employees.`;

  const submitForm = async (values) => {
    if (saveDisabledReason) {
      toast.error(saveDisabledReason);
      return;
    }

    if (isEdit && hasBankDetails(detailBankDetails) && !hasBankDetails(values)) {
      setError("bankName", { type: "manual", message: "Existing bank details cannot be cleared here. Enter bank name, account number and IFSC." });
      return;
    }

    const payload = mapFormToPayload(values, { includeBankDetails: !isEdit, preserveExistingAddresses: isEdit });
    const bankDetails = mapFormToBankDetails(values);
    const shouldSaveBankDetails = isEdit && (hasBankDetails(values) || hasBankDetails(detailBankDetails));

    try {
      const response = isEdit
        ? await dispatch(updateHrEmployee({ id, payload })).unwrap()
        : await dispatch(createHrEmployee(payload)).unwrap();
      const employeeId = isEdit ? id : getHrRecordId(extractHrEntity(response?.data, "employee"), "employee");

      if (isEdit && employeeId && shouldSaveBankDetails) {
        try {
          await saveEmployeeBankSafely(employeeId, bankDetails, { read: hrEmployeeService.getBankDetails, save: (savedId, savedPayload) => dispatch(saveHrEmployeeBankDetails({ id: savedId, payload: savedPayload })).unwrap() });
          await dispatch(fetchHrEmployeeBankDetails(employeeId));
          setPendingBankUpdate(null);
        } catch (error) {
          setPendingBankUpdate({ employeeId, payload: bankDetails, error: getHrActionError(error, "Bank details could not be saved.") });
          await dispatch(fetchHrEmployeeById(employeeId));
          return;
        }
      }

      toast.success(getHrSuccessMessage(response, isEdit ? "Employee updated successfully" : "Employee created successfully"));

      if (!isEdit) {
        scopedDraft.clearDraft();

        withoutDirtyPrompt(() => navigate(employeeId ? `/hr/employees/${employeeId}/edit` : "/hr/employees", { replace: true }));
      } else {
        reset(values);
      }
    } catch (error) {
      Object.entries(getApiFieldErrors(error)).forEach(([field, message]) => setError(field.charAt(0).toLowerCase() + field.slice(1), { type: "server", message }));
      setError("root", { type: "server", message: getHrActionError(error, "Employee could not be saved. Review the highlighted fields.") });
      toast.error(getHrActionError(error, "Unable to save employee."));
    }
  };

  const saveDraft = () => {
    if (!scopedDraft.saveDraft()) { toast.error("Draft recovery needs your current user and company identity. Save the employee before leaving."); return; }
    toast.success("Employee draft kept for this user and company. Bank details are excluded.");
    withoutDirtyPrompt(() => navigate("/hr/employees"));
  };

  const title = isEdit ? "Edit employee" : "Add employee";

  if (isEdit && detailError) {
    return (
      <div className="space-y-5">
        <PageHeader badge="HR / Employees" title={title} />
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{detailError}</div>
        <AppButton variant="secondary" onClick={() => navigate("/hr/employees")}>
          <ArrowLeft className="h-4 w-4" /> Back to employees
        </AppButton>
      </div>
    );
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit(submitForm)} noValidate>
      {errors.root && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{errors.root.message}</div>}
      {!isEdit && scopedDraft.recoveredDraft && !isDirty && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">A saved onboarding draft is available. <button className="mr-4 font-semibold underline" type="button" disabled={scopedDraft.stale} onClick={() => { reset(scopedDraft.recoveredDraft.values, { keepDefaultValues: true }); scopedDraft.acknowledgeRecovery(); }}>Restore draft</button><button className="underline" type="button" onClick={scopedDraft.clearDraft}>Discard draft</button></div>}
      {pendingBankUpdate && <div role="alert" className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><p><strong>Employee changes were saved.</strong> Bank details are still pending. {pendingBankUpdate.error}</p><AppButton variant="secondary" disabled={!capabilities.canUpdate} isLoading={retryingBankUpdate} onClick={async () => {
        setRetryingBankUpdate(true);
        try { await saveEmployeeBankSafely(pendingBankUpdate.employeeId, pendingBankUpdate.payload, { read: hrEmployeeService.getBankDetails, save: (savedId, savedPayload) => dispatch(saveHrEmployeeBankDetails({ id: savedId, payload: savedPayload })).unwrap() }); await dispatch(fetchHrEmployeeBankDetails(pendingBankUpdate.employeeId)); setPendingBankUpdate(null); reset(getValues()); toast.success("Bank details saved"); }
        catch (error) { setPendingBankUpdate((current) => ({ ...current, error: getHrActionError(error, "Bank details could not be saved.") })); }
        finally { setRetryingBankUpdate(false); }
      }}>Retry bank update</AppButton></div>}
      <PageHeader
        badge={<><UserRound className="h-3.5 w-3.5" /> HR / Employees</>}
        title={title}
        description="Maintain employee identity, contact, employment, address, and bank details."
        actions={
          <>
            <AppButton variant="secondary" onClick={() => navigate("/hr/employees")}>
              <ArrowLeft className="h-4 w-4" /> Back
            </AppButton>
            {isEdit && <AppButton variant="secondary" onClick={() => exportEmployeeProfilePdf({ employee: detailEmployee, bankDetails: detailBankDetails, departmentOptions, designationOptions, shiftOptions }).catch((error) => toast.error(error.message || "Unable to create profile PDF."))}>Download saved profile</AppButton>}
            <AppButton type="submit" isLoading={isSubmitting} loadingText="Saving…" disabled={Boolean(saveDisabledReason)} title={saveDisabledReason || undefined}>
              <Save className="h-4 w-4" /> {isEdit ? "Save changes" : "Save employee"}
            </AppButton>
          </>
        }
      />

      {isEdit && detailLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 8 }, (_, index) => (
            <div key={index} className="h-12 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      ) : (
        <>
          <Section title="Personal Information">
            <Controller
              name="profilePhotoUrl"
              control={control}
              render={({ field }) => (
                <AppImageUpload label="Profile Photo" value={field.value} onChange={field.onChange} error={errors.profilePhotoUrl?.message} />
              )}
            />

            <div className="grid gap-4 md:grid-cols-3">
              <AppInput id="employeeCode" label="Employee Code" required error={errors.employeeCode?.message} {...register("employeeCode")} />
              <AppInput id="firstName" label="First Name" required error={errors.firstName?.message} {...register("firstName")} />
              <AppInput id="lastName" label="Last Name" error={errors.lastName?.message} {...register("lastName")} />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Controller
                name="gender"
                control={control}
                render={({ field }) => (
                  <AppSelect label="Gender" value={field.value} onChange={field.onChange} options={HR_GENDER_OPTIONS} error={errors.gender?.message} />
                )}
              />
              <AppInput id="dateOfBirth" label="Date of Birth" type="date" error={errors.dateOfBirth?.message} {...register("dateOfBirth")} />
              <AppInput id="joiningDate" label="Joining Date" type="date" required error={errors.joiningDate?.message} {...register("joiningDate")} />
            </div>
          </Section>

          <Section title="Contact">
            <div className="grid gap-4 md:grid-cols-2">
              <AppInput id="mobile" label="Mobile" error={errors.mobile?.message} {...register("mobile")} />
              <AppInput id="email" label="Email" type="email" error={errors.email?.message} {...register("email")} />
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
                    id="employee-department"
                    required
                    value={field.value}
                    onChange={(value) => {
                      field.onChange(value);
                      setValue("designationId", "", { shouldDirty: true, shouldValidate: false });
                    }}
                    options={departmentOptions}
                    placeholder="Select department"
                    error={errors.departmentId?.message}
                    creatable={canCreateDepartment}
                    createLabel="Create new department"
                    onCreateClick={() => openLookupCreate("department")}
                  />
                )}
              />
              <Controller
                name="designationId"
                control={control}
                render={({ field }) => (
                  <AppSelect
                    label="Designation"
                    id="employee-designation"
                    required
                    value={field.value}
                    onChange={field.onChange}
                    options={filteredDesignationOptions}
                    placeholder={selectedDepartmentId ? "Select designation" : "Select department first"}
                    emptyMessage="No active designations for this department"
                    disabled={!selectedDepartmentId}
                    error={errors.designationId?.message}
                    creatable={canCreateDesignation}
                    createLabel="Create new designation"
                    onCreateClick={() => openLookupCreate("designation")}
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
                    options={[{ value: "", label: "No manager" }, ...reportingManagerOptions]}
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
                    id="employee-shift"
                    required
                    value={field.value}
                    onChange={field.onChange}
                    options={shiftOptions}
                    placeholder="Select shift"
                    error={errors.shiftId?.message}
                    creatable={canCreateShift}
                    createLabel="Create new shift"
                    onCreateClick={() => openLookupCreate("shift")}
                  />
                )}
              />
              <Controller
                name="employmentType"
                control={control}
                render={({ field }) => (
                  <AppSelect label="Employment Type" value={field.value} onChange={field.onChange} options={HR_EMPLOYMENT_TYPE_OPTIONS} error={errors.employmentType?.message} />
                )}
              />
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <AppSelect label="Status" value={field.value} onChange={field.onChange} options={isEdit ? HR_EMPLOYEE_STATUS_OPTIONS : HR_EMPLOYEE_STATUS_OPTIONS.filter(option => option.value !== 3)} error={errors.status?.message} />
                )}
              />
            </div>
          </Section>

          <Section title="Addresses" optional>
            {addressFields.map((addressField, index) => {
              const addressErrors = errors.addresses?.[index] ?? {};

              return (
                <div key={addressField.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Address {index + 1}</p>
                    {addressFields.length > 1 && (
                      <button type="button" onClick={() => removeAddress(index)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600" aria-label={`Remove address ${index + 1}`}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <AppInput id={`addressType-${index}`} label="Address Type" error={addressErrors.addressType?.message} {...register(`addresses.${index}.addressType`)} />
                    <AppInput id={`addressLine1-${index}`} label="Address Line 1" error={addressErrors.addressLine1?.message} {...register(`addresses.${index}.addressLine1`)} />
                    <AppInput id={`addressLine2-${index}`} label="Address Line 2" error={addressErrors.addressLine2?.message} {...register(`addresses.${index}.addressLine2`)} />
                    <AppInput id={`city-${index}`} label="City" error={addressErrors.city?.message} {...register(`addresses.${index}.city`)} />
                    <AppInput id={`state-${index}`} label="State" error={addressErrors.state?.message} {...register(`addresses.${index}.state`)} />
                    <AppInput id={`country-${index}`} label="Country" error={addressErrors.country?.message} {...register(`addresses.${index}.country`)} />
                    <AppInput id={`pincode-${index}`} label="Pincode" error={addressErrors.pincode?.message} {...register(`addresses.${index}.pincode`)} />
                  </div>
                </div>
              );
            })}

            <AppButton
              variant="secondary"
              className="h-10 rounded-lg px-3"
              onClick={() => appendAddress({ addressType: "Secondary", addressLine1: "", addressLine2: "", city: "", state: "", country: "", pincode: "" })}
            >
              <Plus className="h-4 w-4" /> Add Address
            </AppButton>
          </Section>

          <Section title="Bank Details" optional>
            <div className="grid gap-4 md:grid-cols-2">
              <AppInput id="bankName" label="Bank Name" error={errors.bankName?.message} {...register("bankName")} />
              <AppInput id="accountNumber" label="Account Number" error={errors.accountNumber?.message} {...register("accountNumber")} />
              <AppInput id="ifscCode" label="IFSC Code" error={errors.ifscCode?.message} {...register("ifscCode")} />
              <AppInput id="branchName" label="Branch Name" error={errors.branchName?.message} {...register("branchName")} />
              <AppInput id="upiId" label="UPI ID" error={errors.upiId?.message} {...register("upiId")} />
            </div>
          </Section>
        </>
      )}

      <div className="sticky bottom-4 flex flex-col-reverse gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-lg sm:flex-row sm:justify-end">
        <AppButton variant="secondary" disabled={isSubmitting} onClick={() => navigate("/hr/employees")}>
          Cancel
        </AppButton>
        {!isEdit && (
          <AppButton type="button" variant="secondary" disabled={isSubmitting} onClick={saveDraft}>
            Save as Draft
          </AppButton>
        )}
        <AppButton type="submit" isLoading={isSubmitting} loadingText="Saving…" disabled={Boolean(saveDisabledReason)} title={saveDisabledReason || undefined}>
          {isEdit ? "Save Changes" : "Create Employee"}
        </AppButton>
      </div>

      <DepartmentFormModal
        department={null}
        isLoading={false}
        isOpen={lookupCreateModal.department}
        mode="create"
        onClose={() => closeLookupCreate("department")}
        onSubmit={(payload) => submitLookupCreate("department", payload)}
      />

      <DesignationFormModal
        canCreateDepartment={canCreateDepartment}
        departmentOptions={departmentOptions}
        departmentsLoading={false}
        designation={null}
        isLoading={false}
        isOpen={lookupCreateModal.designation}
        mode="create"
        onClose={() => closeLookupCreate("designation")}
        onCreateDepartment={() => openLookupCreate("department")}
        onSubmit={(payload) => submitLookupCreate("designation", payload)}
      />

      <ShiftFormModal
        isLoading={false}
        isOpen={lookupCreateModal.shift}
        mode="create"
        onClose={() => closeLookupCreate("shift")}
        onSubmit={(payload) => submitLookupCreate("shift", payload)}
        shift={null}
      />
    </form>
  );
};

export default EmployeeFormPage;
