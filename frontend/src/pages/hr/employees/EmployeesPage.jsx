import { Plus, RefreshCw, UsersRound } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";

import AppButton from "../../../components/common/AppButton";
import PageHeader from "../../../components/common/PageHeader";
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
  saveHrEmployeeBankDetails,
  setHrEmployeeFilters,
  setHrEmployeePage,
  setHrEmployeePageSize,
  setSelectedHrEmployee,
  updateHrEmployee,
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
import EmployeeList from "./EmployeeList";
import EmployeeProfilePanel from "./EmployeeProfilePanel";
import EmployeeStats from "./EmployeeStats";
import { extractEmployeeBankDetails } from "./employeeFormMappers";

const extractList = (response) => {
  if (Array.isArray(response?.data?.items)) {
    return response.data.items;
  }

  if (Array.isArray(response?.data)) {
    return response.data;
  }

  return [];
};

const toOption = (record, idResource, labelCandidates) => {
  const value = getHrRecordId(record, idResource);
  const label = labelCandidates
    .map((candidate) =>
      typeof candidate === "function" ? candidate(record) : record?.[candidate],
    )
    .find((candidate) => String(candidate ?? "").trim());

  return label && value ? { label, value } : null;
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
      Status: filters.Status === "all" ? undefined : Number(filters.Status),
    },
  });
};

const EmployeesPage = () => {
  const dispatch = useDispatch();
  const employeesState = useSelector((state) => state.hrEmployees);
  const capabilities = useHrCapabilities({
    label: "Employees",
    resource: "employees",
    route: "/hr/employees",
  });
  const [searchInput, setSearchInput] = useState(
    employeesState.filters.Search,
  );
  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [designationOptions, setDesignationOptions] = useState([]);
  const [shiftOptions, setShiftOptions] = useState([]);
  const [reportingManagerOptions, setReportingManagerOptions] = useState([]);
  const [lookupsLoaded, setLookupsLoaded] = useState(false);
  const [modal, setModal] = useState({
    entity: null,
    isLoading: false,
    isOpen: false,
    mode: "create",
  });
  const [bankModal, setBankModal] = useState(false);
  const [documentModal, setDocumentModal] = useState(false);
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
            toOption(designation, "designation", ["designationName"]),
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
      setLookupsLoaded(true);
    } catch (error) {
      toast.error(getHrActionError(error, "Unable to load HR lookup data."));
    }
  }, []);

  const loadLookupsIfNeeded = useCallback(() => {
    return lookupsLoaded ? Promise.resolve() : loadLookups();
  }, [loadLookups, lookupsLoaded]);

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
    [dispatch, loadEmployeeRelated],
  );

  useEffect(() => {
    if (!employeesState.selected && employeesState.list.length > 0) {
      const timeoutId = window.setTimeout(() => {
        void selectEmployee(employeesState.list[0]);
      }, 0);

      return () => window.clearTimeout(timeoutId);
    }
  }, [employeesState.list, employeesState.selected, selectEmployee]);

  const closeModal = useCallback(() => {
    setModal((current) => ({ ...current, isOpen: false }));
  }, []);

  const openCreate = useCallback(() => {
    void loadLookupsIfNeeded();
    setModal({
      entity: null,
      isLoading: false,
      isOpen: true,
      mode: "create",
    });
  }, [loadLookupsIfNeeded]);

  const openEdit = useCallback(
    async (employee) => {
      const id = getHrRecordId(employee, "employee");

      if (!id) {
        toast.error("Unable to find employee id.");
        return;
      }

      setModal({ entity: employee, isLoading: true, isOpen: true, mode: "edit" });

      const [detailResult, bankResult] = await Promise.allSettled([
        dispatch(fetchHrEmployeeById(id)).unwrap(),
        dispatch(fetchHrEmployeeBankDetails(id)).unwrap(),
        loadLookupsIfNeeded(),
      ]);

      if (detailResult.status === "fulfilled") {
        const employeeDetail = extractHrEntity(
          detailResult.value.data,
          "employee",
        );
        const bankDetails =
          bankResult.status === "fulfilled"
            ? extractEmployeeBankDetails(bankResult.value.data)
            : extractEmployeeBankDetails(employeeDetail);

        setModal({
          entity: {
            ...employeeDetail,
            bankDetails,
          },
          isLoading: false,
          isOpen: true,
          mode: "edit",
        });
        return;
      }

      toast.error(
        getHrActionError(
          detailResult.reason,
          "Unable to load employee details.",
        ),
      );
      setModal((current) => ({ ...current, isLoading: false }));
    },
    [dispatch, loadLookupsIfNeeded],
  );

  const submitEmployee = useCallback(
    async (payload, options = {}) => {
      try {
        const employeeId = getHrRecordId(modal.entity, "employee");
        const response =
          modal.mode === "edit"
            ? await dispatch(
                updateHrEmployee({
                  id: employeeId,
                  payload,
                }),
              ).unwrap()
            : await dispatch(createHrEmployee(payload)).unwrap();

        if (
          modal.mode === "edit" &&
          employeeId &&
          options.shouldSaveBankDetails
        ) {
          await dispatch(
            saveHrEmployeeBankDetails({
              id: employeeId,
              payload: options.bankDetails,
            }),
          ).unwrap();
        }

        toast.success(
          getHrSuccessMessage(
            response,
            modal.mode === "edit"
              ? "Employee updated successfully"
              : "Employee created successfully",
          ),
        );
        closeModal();
        await loadEmployees();
      } catch (error) {
        toast.error(getHrActionError(error, "Unable to save employee."));
        throw error;
      }
    },
    [closeModal, dispatch, loadEmployees, modal.entity, modal.mode],
  );

  const confirmDelete = useCallback(async () => {
    if (!confirmation.entity) {
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
  }, [confirmation.entity, confirmation.type, dispatch, loadEmployees]);

  const submitBankDetails = useCallback(
    async (payload) => {
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
    [dispatch, employeesState.selected],
  );

  const submitDocument = useCallback(
    async (payload) => {
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
    [dispatch, employeesState.selected],
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
            <AppButton
              className="h-10"
              disabled={!capabilities.canCreate}
              onClick={openCreate}
            >
              <Plus className="h-4 w-4" />
              Add Employee
            </AppButton>
          </>
        }
      />

      <EmployeeStats
        employees={employeesState.list}
        total={employeesState.totalCount}
      />

      <EmployeeFilters
        departmentOptions={departmentOptions}
        designationOptions={designationOptions}
        filters={filterControls}
        resultCount={employeesState.list.length}
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
          onCreate={openCreate}
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
          onAddDocument={() => setDocumentModal(true)}
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
          onEditBank={() => setBankModal(true)}
          relatedLoading={employeesState.relatedLoading || employeeRelated.loading}
          shiftOptions={shiftOptions}
        />
      </div>

      <EmployeeFormModal
        departmentOptions={departmentOptions}
        designationOptions={designationOptions}
        employee={modal.entity}
        isLoading={modal.isLoading}
        isOpen={modal.isOpen}
        mode={modal.mode}
        onClose={closeModal}
        onSubmit={submitEmployee}
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
