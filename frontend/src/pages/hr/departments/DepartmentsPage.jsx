import { Building2, Plus, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";

import AppButton from "../../../components/common/AppButton";
import PageHeader from "../../../components/common/PageHeader";
import {
  createHrDepartment,
  deleteHrDepartment,
  fetchHrDepartmentById,
  fetchHrDepartments,
  setHrDepartmentFilters,
  setHrDepartmentPage,
  setHrDepartmentPageSize,
  updateHrDepartment,
} from "../../../store/slices/hr/departmentSlice";
import {
  buildHrQueryParams,
  extractHrEntity,
  getHrActionError,
  getHrBoolean,
  getHrRecordId,
  getHrSuccessMessage,
} from "../hrHelpers";
import { HrConfirmDialog } from "../HrShared";
import useHrCapabilities from "../useHrCapabilities";
import DepartmentFilters from "./DepartmentFilters";
import DepartmentFormModal from "./DepartmentFormModal";
import DepartmentStats from "./DepartmentStats";
import DepartmentTable from "./DepartmentTable";

const DepartmentsPage = () => {
  const dispatch = useDispatch();
  const departmentsState = useSelector((state) => state.hrDepartments);
  const capabilities = useHrCapabilities({
    label: "Departments",
    resource: "departments",
    route: "/hr/departments",
  });
  const [searchInput, setSearchInput] = useState(
    departmentsState.filters.Search,
  );
  const [modal, setModal] = useState({
    entity: null,
    isLoading: false,
    isOpen: false,
    mode: "create",
  });
  const [confirmation, setConfirmation] = useState({
    entity: null,
    isLoading: false,
    isOpen: false,
  });

  const queryParams = useMemo(
    () =>
      buildHrQueryParams({
        filters: departmentsState.filters,
        pageNumber: departmentsState.pageNumber,
        pageSize: departmentsState.pageSize,
      }),
    [
      departmentsState.filters,
      departmentsState.pageNumber,
      departmentsState.pageSize,
    ],
  );

  const loadDepartments = useCallback(() => {
    return dispatch(fetchHrDepartments(queryParams));
  }, [dispatch, queryParams]);

  useEffect(() => {
    void Promise.resolve().then(loadDepartments);
  }, [loadDepartments]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      dispatch(setHrDepartmentFilters({ Search: searchInput }));
      dispatch(setHrDepartmentPage(1));
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [dispatch, searchInput]);

  const stats = useMemo(
    () => ({
      active: departmentsState.list.filter((department) =>
        getHrBoolean(department.isActive),
      ).length,
      inactive: departmentsState.list.filter(
        (department) => !getHrBoolean(department.isActive),
      ).length,
      total: departmentsState.totalCount,
    }),
    [departmentsState.list, departmentsState.totalCount],
  );

  const closeModal = useCallback(() => {
    setModal((current) => ({ ...current, isOpen: false }));
  }, []);

  const openCreate = useCallback(() => {
    if (!capabilities.canCreate) {
      return;
    }

    setModal({
      entity: null,
      isLoading: false,
      isOpen: true,
      mode: "create",
    });
  }, [capabilities.canCreate]);

  const openEntity = useCallback(
    async (mode, department) => {
      const isAllowed =
        mode === "edit" ? capabilities.canUpdate : capabilities.canView;

      if (!isAllowed) {
        return;
      }

      const id = getHrRecordId(department, "department");

      if (!id) {
        toast.error("Unable to find department id.");
        return;
      }

      setModal({ entity: department, isLoading: true, isOpen: true, mode });

      try {
        const response = await dispatch(fetchHrDepartmentById(id)).unwrap();
        setModal({
          entity: extractHrEntity(response.data, "department"),
          isLoading: false,
          isOpen: true,
          mode,
        });
      } catch (error) {
        toast.error(
          getHrActionError(error, "Unable to load department details."),
        );
        setModal((current) => ({ ...current, isLoading: false }));
      }
    },
    [capabilities.canUpdate, capabilities.canView, dispatch],
  );

  const submitDepartment = useCallback(
    async (payload) => {
      const isAllowed =
        modal.mode === "edit"
          ? capabilities.canUpdate
          : capabilities.canCreate;

      if (!isAllowed) {
        return;
      }

      try {
        const response =
          modal.mode === "edit"
            ? await dispatch(
                updateHrDepartment({
                  id: getHrRecordId(modal.entity, "department"),
                  payload,
                }),
              ).unwrap()
            : await dispatch(createHrDepartment(payload)).unwrap();

        toast.success(
          getHrSuccessMessage(
            response,
            modal.mode === "edit"
              ? "Department updated successfully"
              : "Department created successfully",
          ),
        );
        closeModal();
        await loadDepartments();
      } catch (error) {
        toast.error(getHrActionError(error, "Unable to save department."));
        throw error;
      }
    },
    [
      capabilities.canCreate,
      capabilities.canUpdate,
      closeModal,
      dispatch,
      loadDepartments,
      modal.entity,
      modal.mode,
    ],
  );

  const confirmDelete = useCallback(async () => {
    if (!capabilities.canDelete || !confirmation.entity) {
      return;
    }

    const id = getHrRecordId(confirmation.entity, "department");

    if (!id) {
      toast.error("Unable to find department id.");
      return;
    }

    setConfirmation((current) => ({ ...current, isLoading: true }));

    try {
      const result = await dispatch(deleteHrDepartment(id)).unwrap();
      toast.success(
        getHrSuccessMessage(result.response, "Department deleted successfully"),
      );
      setConfirmation({ entity: null, isLoading: false, isOpen: false });
      await loadDepartments();
    } catch (error) {
      toast.error(getHrActionError(error, "Unable to delete department."));
      setConfirmation((current) => ({ ...current, isLoading: false }));
    }
  }, [
    capabilities.canDelete,
    confirmation.entity,
    dispatch,
    loadDepartments,
  ]);

  const filterControls = {
    ...departmentsState.filters,
    Search: searchInput,
  };

  return (
    <section className="min-w-0 space-y-5">
      <PageHeader
        badge={
          <>
            <Building2 className="h-3.5 w-3.5" />
            HR / Departments
          </>
        }
        title="Departments"
        description="Organize teams and business units across the company."
        actions={
          <>
            <AppButton
              variant="secondary"
              className="h-10"
              disabled={departmentsState.loading}
              onClick={loadDepartments}
            >
              <RefreshCw
                className={`h-4 w-4 ${departmentsState.loading ? "animate-spin" : ""}`}
              />
              Refresh
            </AppButton>
            {capabilities.canCreate && (
              <AppButton className="h-10" onClick={openCreate}>
                <Plus className="h-4 w-4" />
                Add Department
              </AppButton>
            )}
          </>
        }
      />

      <DepartmentStats {...stats} />
      <DepartmentFilters
        filters={filterControls}
        resultCount={departmentsState.list.length}
        onChange={(patch) => {
          if (Object.hasOwn(patch, "Search")) {
            setSearchInput(patch.Search);
          } else {
            dispatch(setHrDepartmentFilters(patch));
            dispatch(setHrDepartmentPage(1));
          }
        }}
        onClear={() => {
          setSearchInput("");
          dispatch(setHrDepartmentFilters({ Search: "", IsActive: "all" }));
          dispatch(setHrDepartmentPage(1));
        }}
      />

      <DepartmentTable
        actions={{
          ...capabilities,
          canEdit: capabilities.canEdit,
          onDelete: (department) =>
            setConfirmation({
              entity: department,
              isLoading: false,
              isOpen: true,
            }),
          onEdit: (department) => openEntity("edit", department),
          onView: (department) => openEntity("view", department),
        }}
        departments={departmentsState.list}
        error={departmentsState.error}
        isLoading={departmentsState.loading}
        onCreate={capabilities.canCreate ? openCreate : undefined}
        onPageChange={(value) => dispatch(setHrDepartmentPage(value))}
        onPageSizeChange={(value) => dispatch(setHrDepartmentPageSize(value))}
        onRetry={loadDepartments}
        pageNumber={departmentsState.pageNumber}
        pageSize={departmentsState.pageSize}
        totalCount={departmentsState.totalCount}
        totalPages={departmentsState.totalPages}
      />

      <DepartmentFormModal
        department={modal.entity}
        isLoading={modal.isLoading}
        isOpen={modal.isOpen}
        mode={modal.mode}
        onClose={closeModal}
        onSubmit={submitDepartment}
      />

      <HrConfirmDialog
        isLoading={confirmation.isLoading}
        isOpen={confirmation.isOpen}
        title="Delete Department?"
        description={`${confirmation.entity?.departmentName ?? "This department"} will be permanently removed.`}
        onCancel={() =>
          setConfirmation({
            entity: null,
            isLoading: false,
            isOpen: false,
          })
        }
        onConfirm={confirmDelete}
      />
    </section>
  );
};

export default DepartmentsPage;
