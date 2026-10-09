import { Plus, RefreshCw, UsersRound } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import AppButton from "../../../components/common/AppButton";
import PageHeader from "../../../components/common/PageHeader";
import useCreatePermission from "../../../hooks/useCreatePermission";
import { hrAttendanceService } from "../../../services/hr/attendanceService";
import { hrDepartmentService } from "../../../services/hr/departmentService";
import { hrDesignationService } from "../../../services/hr/designationService";
import { hrEmployeeService } from "../../../services/hr/employeeService";
import { hrLeaveService } from "../../../services/hr/leaveService";
import { hrShiftService } from "../../../services/hr/shiftService";
import {
  addHrEmployeeDocument,
  createHrEmployee,
  deleteHrEmployee,
  deleteHrEmployeeDocument,
  fetchHrEmployeeBankDetails,
  fetchHrEmployeeById,
  fetchHrEmployeeDocuments,
  fetchHrEmployees,
  rejoinHrEmployee,
  resignHrEmployee,
  saveHrEmployeeBankDetails,
  setHrEmployeeFilters,
  setHrEmployeePage,
  setHrEmployeePageSize,
  setSelectedHrEmployee,
} from "../../../store/slices/hr/employeeSlice";
import {
  buildHrQueryParams,
  extractHrEntity,
  getEmployeeName,
  getHrActionError,
  getHrRecordId,
  getHrSuccessMessage,
} from "../hrHelpers";
import { HrConfirmDialog } from "../HrShared";
import useHrCapabilities from "../useHrCapabilities";
import EmployeeBankModal from "./EmployeeBankModal";
import EmployeeDocumentModal from "./EmployeeDocumentModal";
import EmployeeFilters from "./EmployeeFilters";
import EmployeeFormModal from "./EmployeeFormModal";
import EmployeeLifecycleModal from "./EmployeeLifecycleModal";
import EmployeeList from "./EmployeeList";
import EmployeeProfilePanel from "./EmployeeProfilePanel";
import EmployeeStats from "./EmployeeStats";
import DepartmentFormModal from "../departments/DepartmentFormModal";
import DesignationFormModal from "../designations/DesignationFormModal";
import ShiftFormModal from "../shifts/ShiftFormModal";

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

const buildEmployeeQueryParams = ({ filters, pageNumber, pageSize }) => {
  return buildHrQueryParams({
    filters,
    pageNumber,
    pageSize,
    extra: {
      DepartmentId:
        filters.DepartmentId === "all" ? undefined : Number(filters.DepartmentId),
      DesignationId:
        filters.DesignationId === "all"
          ? undefined
          : Number(filters.DesignationId),
      IncludeResigned: Boolean(filters.IncludeResigned),
      Status: filters.Status === "all" ? undefined : filters.Status,
    },
  });
};

const EmployeesPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const employeesState = useSelector((state) => state.hrEmployees);
  const capabilities = useHrCapabilities({
    label: "Employees",
    pageName: "HR.Employee",
    resource: "employees",
    route: "/hr/employees",
  });
  const canCreateDepartment = useCreatePermission({
    label: "Departments",
    pageName: "HR.Department",
    resource: "departments",
    route: "/hr/departments",
  });
  const canCreateDesignation = useCreatePermission({
    label: "Designations",
    pageName: "HR.Designation",
    resource: "designations",
    route: "/hr/designations",
  });
  const canCreateShift = useCreatePermission({
    label: "Shifts",
    pageName: "HR.Shift",
    resource: "shifts",
    route: "/hr/shifts",
  });
  const [searchInput, setSearchInput] = useState(
    employeesState.filters.Search,
  );
  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [designationOptions, setDesignationOptions] = useState([]);
  const [shiftOptions, setShiftOptions] = useState([]);
  const [reportingManagerOptions, setReportingManagerOptions] = useState([]);
  const [lookupCreateModal, setLookupCreateModal] = useState({
    department: false,
    designation: false,
    employee: false,
    shift: false,
  });
  const [bankModal, setBankModal] = useState(false);
  const [documentModal, setDocumentModal] = useState(false);
  const [lifecycleModal, setLifecycleModal] = useState({
    employee: null,
    isOpen: false,
    mode: "resign",
  });
  const [employeeRelated, setEmployeeRelated] = useState({
    attendance: [],
    leaveBalance: null,
    leaves: [],
    loading: false,
  });
  const [confirmation, setConfirmation] = useState({
    entity: null,
    isLoading: false,
    isOpen: false,
    type: "employee",
  });

  const queryParams = useMemo(
    () =>
      buildEmployeeQueryParams({
        filters: employeesState.filters,
        pageNumber: employeesState.pageNumber,
        pageSize: employeesState.pageSize,
      }),
    [
      employeesState.filters,
      employeesState.pageNumber,
      employeesState.pageSize,
    ],
  );

  const loadEmployees = useCallback(() => {
    return dispatch(fetchHrEmployees(queryParams));
  }, [dispatch, queryParams]);

  const loadLookups = useCallback(async () => {
    try {
      const [departments, designations, shifts, managers] = await Promise.all([
        hrDepartmentService.getDepartments({
          IsActive: true,
          PageNumber: 1,
          PageSize: 200,
        }),
        hrDesignationService.getDesignations({
          IsActive: true,
          PageNumber: 1,
          PageSize: 200,
        }),
        hrShiftService.getShifts({
          IsActive: true,
          PageNumber: 1,
          PageSize: 200,
        }),
        hrEmployeeService.getReportingManagers(),
      ]);

      setDepartmentOptions(
        extractList(departments)
          .map((department) =>
            toOption(department, "department", ["departmentName"]),
          )
          .filter(Boolean),
      );
      setDesignationOptions(
        extractList(designations)
          .map((designation) =>
            toOption(
              designation,
              "designation",
              ["designationName"],
              {
                departmentId:
                  designation.departmentId ?? designation.department?.id ?? null,
              },
            ),
          )
          .filter(Boolean),
      );
      setShiftOptions(
        extractList(shifts)
          .map((shift) => toOption(shift, "shift", ["shiftName"]))
          .filter(Boolean),
      );
      setReportingManagerOptions(
        extractList(managers)
          .map((employee) =>
            toOption(employee, "employee", [
              (record) => getEmployeeName(record),
              "name",
              "employeeName",
            ]),
          )
          .filter(Boolean),
      );
    } catch (error) {
      toast.error(getHrActionError(error, "Unable to load HR lookup data."));
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadEmployees);
  }, [loadEmployees]);

  useEffect(() => {
    void Promise.resolve().then(loadLookups);
  }, [loadLookups]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      dispatch(setHrEmployeeFilters({ Search: searchInput }));
      dispatch(setHrEmployeePage(1));
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [dispatch, searchInput]);

  const selectedId = getHrRecordId(employeesState.selected, "employee");

  const loadEmployeeRelated = useCallback(async (employeeId) => {
    setEmployeeRelated((current) => ({ ...current, loading: true }));

    const [attendanceResult, leavesResult, balanceResult] =
      await Promise.allSettled([
        hrAttendanceService.getAttendanceByEmployee(employeeId, {
          PageNumber: 1,
          PageSize: 10,
        }),
        hrLeaveService.getLeaves({
          EmployeeId: employeeId,
          PageNumber: 1,
          PageSize: 10,
        }),
        hrLeaveService.getLeaveBalance(employeeId),
      ]);

    setEmployeeRelated({
      attendance:
        attendanceResult.status === "fulfilled"
          ? extractList(attendanceResult.value)
          : [],
      leaveBalance:
        balanceResult.status === "fulfilled"
          ? (balanceResult.value?.data ?? balanceResult.value)
          : null,
      leaves: leavesResult.status === "fulfilled" ? extractList(leavesResult.value) : [],
      loading: false,
    });
  }, []);

  const selectEmployee = useCallback(
    async (employee) => {
      if (!capabilities.canView) {
        return;
      }

      const id = getHrRecordId(employee, "employee");

      if (!id) {
        toast.error("Unable to find employee id.");
        return;
      }

      dispatch(setSelectedHrEmployee(employee));

      try {
        const response = await dispatch(fetchHrEmployeeById(id)).unwrap();
        dispatch(setSelectedHrEmployee(extractHrEntity(response.data, "employee")));
      } catch (error) {
        toast.error(getHrActionError(error, "Unable to load employee details."));
      }

      void dispatch(fetchHrEmployeeBankDetails(id));
      void dispatch(fetchHrEmployeeDocuments(id));
      void loadEmployeeRelated(id);
    },
    [capabilities.canView, dispatch, loadEmployeeRelated],
  );

  useEffect(() => {
    if (!employeesState.selected && employeesState.list.length > 0) {
      const timeoutId = window.setTimeout(() => {
        void selectEmployee(employeesState.list[0]);
      }, 0);

      return () => window.clearTimeout(timeoutId);
    }
  }, [employeesState.list, employeesState.selected, selectEmployee]);

  const openLookupCreate = useCallback(
    (type) => {
      const allowed = {
        department: canCreateDepartment,
        designation: canCreateDesignation,
        employee: capabilities.canCreate,
        shift: canCreateShift,
      }[type];

      if (allowed) {
        setLookupCreateModal((current) => ({ ...current, [type]: true }));
      }
    },
    [
      canCreateDepartment,
      canCreateDesignation,
      canCreateShift,
      capabilities.canCreate,
    ],
  );

  const closeLookupCreate = useCallback((type) => {
    setLookupCreateModal((current) => ({ ...current, [type]: false }));
  }, []);

  const submitLookupCreate = useCallback(
    async (type, payload) => {
      const allowed = {
        department: canCreateDepartment,
        designation: canCreateDesignation,
        employee: capabilities.canCreate,
        shift: canCreateShift,
      }[type];

      if (!allowed) {
        return;
      }

      try {
        if (type === "department") {
          await hrDepartmentService.createDepartment(payload);
          toast.success("Department created successfully");
        } else if (type === "designation") {
          await hrDesignationService.createDesignation(payload);
          toast.success("Designation created successfully");
        } else if (type === "shift") {
          await hrShiftService.createShift(payload);
          toast.success("Shift created successfully");
        } else {
          await dispatch(createHrEmployee(payload)).unwrap();
          toast.success("Employee created successfully");
        }

        await loadLookups();
        closeLookupCreate(type);
      } catch (error) {
        toast.error(getHrActionError(error, "Unable to create record."));
        throw error;
      }
    },
    [
      canCreateDepartment,
      canCreateDesignation,
      canCreateShift,
      capabilities.canCreate,
      closeLookupCreate,
      dispatch,
      loadLookups,
    ],
  );

  const openCreate = useCallback(() => {
    if (!capabilities.canCreate) {
      return;
    }

    navigate("/hr/employees/new");
  }, [capabilities.canCreate, navigate]);

  const openEdit = useCallback(
    (employee) => {
      if (!capabilities.canUpdate) {
        return;
      }

      const id = getHrRecordId(employee, "employee");

      if (!id) {
        toast.error("Unable to find employee id.");
        return;
      }

      navigate(`/hr/employees/${id}/edit`);
    },
    [capabilities.canUpdate, navigate],
  );

  const confirmDelete = useCallback(async () => {
    if (!capabilities.canDelete || !confirmation.entity) {
      return;
    }

    setConfirmation((current) => ({ ...current, isLoading: true }));

    try {
      if (confirmation.type === "document") {
        const documentId = getHrRecordId(confirmation.entity, "document");
        await dispatch(deleteHrEmployeeDocument(documentId)).unwrap();
        toast.success("Document deleted successfully");
      } else {
        const id = getHrRecordId(confirmation.entity, "employee");
        const result = await dispatch(deleteHrEmployee(id)).unwrap();
        toast.success(
          getHrSuccessMessage(result.response, "Employee deleted successfully"),
        );
        await loadEmployees();
      }

      setConfirmation({
        entity: null,
        isLoading: false,
        isOpen: false,
        type: "employee",
      });
    } catch (error) {
      toast.error(getHrActionError(error, "Unable to delete record."));
      setConfirmation((current) => ({ ...current, isLoading: false }));
    }
  }, [
    capabilities.canDelete,
    confirmation.entity,
    confirmation.type,
    dispatch,
    loadEmployees,
  ]);

  const submitBankDetails = useCallback(
    async (payload) => {
      if (!capabilities.canUpdate) {
        return;
      }

      const id = getHrRecordId(employeesState.selected, "employee");

      if (!id) {
        toast.error("Select an employee first.");
        return;
      }

      try {
        const response = await dispatch(
          saveHrEmployeeBankDetails({ id, payload }),
        ).unwrap();
        toast.success(
          getHrSuccessMessage(response, "Bank details saved successfully"),
        );
        setBankModal(false);
        void dispatch(fetchHrEmployeeBankDetails(id));
      } catch (error) {
        toast.error(getHrActionError(error, "Unable to save bank details."));
        throw error;
      }
    },
    [capabilities.canUpdate, dispatch, employeesState.selected],
  );

  const submitDocument = useCallback(
    async (payload) => {
      if (!capabilities.canUpdate) {
        return;
      }

      const id = getHrRecordId(employeesState.selected, "employee");

      if (!id) {
        toast.error("Select an employee first.");
        return;
      }

      try {
        const response = await dispatch(
          addHrEmployeeDocument({ id, payload }),
        ).unwrap();
        toast.success(
          getHrSuccessMessage(response, "Document added successfully"),
        );
        setDocumentModal(false);
        void dispatch(fetchHrEmployeeDocuments(id));
      } catch (error) {
        toast.error(getHrActionError(error, "Unable to add document."));
        throw error;
      }
    },
    [capabilities.canUpdate, dispatch, employeesState.selected],
  );

  const openLifecycleModal = useCallback(
    (mode, employee) => {
      if (!capabilities.canUpdate) {
        return;
      }

      setLifecycleModal({
        employee,
        isOpen: true,
        mode,
      });
    },
    [capabilities.canUpdate],
  );

  const closeLifecycleModal = useCallback(() => {
    setLifecycleModal((current) => ({ ...current, isOpen: false }));
  }, []);

  const submitLifecycle = useCallback(
    async (payload) => {
      if (!capabilities.canUpdate) {
        return;
      }

      const employee = lifecycleModal.employee ?? employeesState.selected;
      const id = getHrRecordId(employee, "employee");
      const isRejoin = lifecycleModal.mode === "rejoin";

      if (!id) {
        toast.error("Select an employee first.");
        return;
      }

      try {
        const response = await dispatch(
          isRejoin
            ? rejoinHrEmployee({ id, payload })
            : resignHrEmployee({ id, payload }),
        ).unwrap();
        const updatedEmployee = extractHrEntity(response.data, "employee");

        if (updatedEmployee) {
          dispatch(setSelectedHrEmployee(updatedEmployee));
        }

        if (!isRejoin) {
          dispatch(setHrEmployeeFilters({ IncludeResigned: true }));
          dispatch(setHrEmployeePage(1));
        }

        toast.success(
          getHrSuccessMessage(
            response,
            isRejoin
              ? "Employee rejoined successfully"
              : "Employee resigned successfully",
          ),
        );
        closeLifecycleModal();

        await dispatch(fetchHrEmployeeById(id)).unwrap();
        await dispatch(
          fetchHrEmployees({
            ...queryParams,
            IncludeResigned: !isRejoin || queryParams.IncludeResigned,
            PageNumber: !isRejoin ? 1 : queryParams.PageNumber,
          }),
        ).unwrap();
      } catch (error) {
        toast.error(
          getHrActionError(
            error,
            isRejoin
              ? "Unable to rejoin employee."
              : "Unable to resign employee.",
          ),
        );
        throw error;
      }
    },
    [
      capabilities.canUpdate,
      closeLifecycleModal,
      dispatch,
      employeesState.selected,
      lifecycleModal.employee,
      lifecycleModal.mode,
      queryParams,
    ],
  );

  const filterControls = {
    ...employeesState.filters,
    Search: searchInput,
  };

  return (
    <section className="min-w-0 space-y-5">
      <PageHeader
        badge={
          <>
            <UsersRound className="h-3.5 w-3.5" />
            HR / Employees
          </>
        }
        title="Employees"
        description="Manage employee profiles, reporting lines, bank details, and documents."
        actions={
          <>
            <AppButton
              variant="secondary"
              className="h-10"
              disabled={employeesState.loading}
              onClick={loadEmployees}
            >
              <RefreshCw
                className={`h-4 w-4 ${employeesState.loading ? "animate-spin" : ""}`}
              />
              Refresh
            </AppButton>
            {capabilities.canCreate && (
              <AppButton className="h-10" onClick={openCreate}>
                <Plus className="h-4 w-4" />
                Add Employee
              </AppButton>
            )}
          </>
        }
      />

      <EmployeeStats
        employees={employeesState.list}
        total={employeesState.totalCount}
      />

      <EmployeeFilters
        canCreateDepartment={canCreateDepartment}
        canCreateDesignation={canCreateDesignation}
        departmentOptions={departmentOptions}
        designationOptions={designationOptions}
        filters={filterControls}
        resultCount={employeesState.list.length}
        onCreateDepartment={() => openLookupCreate("department")}
        onCreateDesignation={() => openLookupCreate("designation")}
        onChange={(patch) => {
          if (Object.hasOwn(patch, "Search")) {
            setSearchInput(patch.Search);
          } else {
            dispatch(setHrEmployeeFilters(patch));
            dispatch(setHrEmployeePage(1));
          }
        }}
        onClear={() => {
          setSearchInput("");
          dispatch(
            setHrEmployeeFilters({
              DepartmentId: "all",
              DesignationId: "all",
              IncludeResigned: false,
              Search: "",
              Status: "all",
            }),
          );
          dispatch(setHrEmployeePage(1));
        }}
      />

      <div className="grid items-stretch gap-4 xl:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.5fr)]">
        <EmployeeList
          actions={capabilities}
          departmentOptions={departmentOptions}
          designationOptions={designationOptions}
          employees={employeesState.list}
          error={employeesState.error}
          isLoading={employeesState.loading}
          onCreate={capabilities.canCreate ? openCreate : undefined}
          onPageChange={(value) => dispatch(setHrEmployeePage(value))}
          onPageSizeChange={(value) => dispatch(setHrEmployeePageSize(value))}
          onRetry={loadEmployees}
          onSelect={selectEmployee}
          pageNumber={employeesState.pageNumber}
          pageSize={employeesState.pageSize}
          selectedId={selectedId}
          totalCount={employeesState.totalCount}
          totalPages={employeesState.totalPages}
        />

        <EmployeeProfilePanel
          bankDetails={employeesState.bankDetails}
          canDelete={capabilities.canDelete}
          canEdit={capabilities.canEdit}
          departmentOptions={departmentOptions}
          designationOptions={designationOptions}
          documents={employeesState.documents}
          employee={employeesState.selected}
          attendanceRecords={employeeRelated.attendance}
          leaveBalance={employeeRelated.leaveBalance}
          leaveRecords={employeeRelated.leaves}
          onAddDocument={() => {
            if (capabilities.canUpdate) {
              setDocumentModal(true);
            }
          }}
          onDelete={(employee) =>
            setConfirmation({
              entity: employee,
              isLoading: false,
              isOpen: true,
              type: "employee",
            })
          }
          onDeleteDocument={(document) =>
            setConfirmation({
              entity: document,
              isLoading: false,
              isOpen: true,
              type: "document",
            })
          }
          onEdit={openEdit}
          onEditBank={() => {
            if (capabilities.canUpdate) {
              setBankModal(true);
            }
          }}
          onRejoin={(employee) => openLifecycleModal("rejoin", employee)}
          onResign={(employee) => openLifecycleModal("resign", employee)}
          relatedLoading={
            employeesState.detailLoading ||
            employeesState.relatedLoading ||
            employeeRelated.loading
          }
          shiftOptions={shiftOptions}
        />
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

      <EmployeeFormModal
        canCreateDepartment={canCreateDepartment}
        canCreateDesignation={canCreateDesignation}
        canCreateReportingManager={false}
        canCreateShift={canCreateShift}
        departmentOptions={departmentOptions}
        designationOptions={designationOptions}
        employee={null}
        isLoading={false}
        isOpen={lookupCreateModal.employee}
        mode="create"
        onClose={() => closeLookupCreate("employee")}
        onCreateDepartment={() => openLookupCreate("department")}
        onCreateDesignation={() => openLookupCreate("designation")}
        onCreateShift={() => openLookupCreate("shift")}
        onSubmit={(payload) => submitLookupCreate("employee", payload)}
        reportingManagerOptions={reportingManagerOptions}
        shiftOptions={shiftOptions}
      />

      <EmployeeBankModal
        bankDetails={employeesState.bankDetails}
        isOpen={bankModal}
        onClose={() => setBankModal(false)}
        onSubmit={submitBankDetails}
      />

      <EmployeeDocumentModal
        isOpen={documentModal}
        onClose={() => setDocumentModal(false)}
        onSubmit={submitDocument}
      />

      <EmployeeLifecycleModal
        employee={lifecycleModal.employee}
        isOpen={lifecycleModal.isOpen}
        mode={lifecycleModal.mode}
        onClose={closeLifecycleModal}
        onSubmit={submitLifecycle}
      />

      <HrConfirmDialog
        isLoading={confirmation.isLoading}
        isOpen={confirmation.isOpen}
        title={
          confirmation.type === "document"
            ? "Delete Document?"
            : "Delete Employee?"
        }
        description={`${
          confirmation.type === "document"
            ? confirmation.entity?.fileName ?? "This document"
            : getEmployeeName(confirmation.entity)
        } will be permanently removed.`}
        onCancel={() =>
          setConfirmation({
            entity: null,
            isLoading: false,
            isOpen: false,
            type: "employee",
          })
        }
        onConfirm={confirmDelete}
      />
    </section>
  );
};

export default EmployeesPage;
