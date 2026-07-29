import { BadgeCheck, Plus, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";

import AppButton from "../../../components/common/AppButton";
import PageHeader from "../../../components/common/PageHeader";
import useCreatePermission from "../../../hooks/useCreatePermission";
import useLatestRequest from "../../../hooks/useLatestRequest";
import { getApiStatus } from "../../../utils/apiError";
import { hrDepartmentService } from "../../../services/hr/departmentService";
import {
  createHrDesignation,
  deleteHrDesignation,
  fetchHrDesignationById,
  fetchHrDesignations,
  setHrDesignationFilters,
  setHrDesignationPage,
  setHrDesignationPageSize,
  updateHrDesignation,
} from "../../../store/slices/hr/designationSlice";
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
import DesignationFilters from "./DesignationFilters";
import DesignationFormModal from "./DesignationFormModal";
import DesignationStats from "./DesignationStats";
import DesignationTable from "./DesignationTable";
import DepartmentFormModal from "../departments/DepartmentFormModal";

const extractDepartmentList = (response) => {
  if (Array.isArray(response?.data?.items)) {
    return response.data.items;
  }

  if (Array.isArray(response?.data)) {
    return response.data;
  }

  return [];
};

const DesignationsPage = () => {
  const dispatch = useDispatch();
  const designationsState = useSelector((state) => state.hrDesignations);
  const capabilities = useHrCapabilities({
    label: "Designations",
    resource: "designations",
    route: "/hr/designations",
  });
  const canCreateDepartment = useCreatePermission({
    label: "Departments",
    resource: "departments",
    route: "/hr/departments",
  });
  const [searchInput, setSearchInput] = useState(
    designationsState.filters.Search,
  );
  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(false);
  const [modal, setModal] = useState({
    entity: null,
    isLoading: false,
    isOpen: false,
    mode: "create",
  });
  const detailPromiseRef = useRef(null);
  const {
    beginRequest: beginDetailRequest,
    cancelAllRequests: cancelDetailRequests,
    isLatestRequest: isLatestDetailRequest,
  } = useLatestRequest();
  const [departmentCreateOpen, setDepartmentCreateOpen] = useState(false);
  const [confirmation, setConfirmation] = useState({
    entity: null,
    isLoading: false,
    isOpen: false,
  });

  const queryParams = useMemo(
    () =>
      buildHrQueryParams({
        filters: designationsState.filters,
        pageNumber: designationsState.pageNumber,
        pageSize: designationsState.pageSize,
      }),
    [
      designationsState.filters,
      designationsState.pageNumber,
      designationsState.pageSize,
    ],
  );

  const loadDesignations = useCallback(() => {
    return dispatch(fetchHrDesignations(queryParams));
  }, [dispatch, queryParams]);

  const loadDepartments = useCallback(async () => {
    setDepartmentsLoading(true);

    try {
      const response = await hrDepartmentService.getDepartments({
        IsActive: true,
        PageNumber: 1,
        PageSize: 200,
      });
      setDepartmentOptions(
        extractDepartmentList(response)
          .map((department) => ({
            label: department.departmentName,
            value: getHrRecordId(department, "department"),
          }))
          .filter((option) => option.label && option.value),
      );
    } catch (error) {
      toast.error(
        getHrActionError(error, "Unable to load department options."),
      );
    } finally {
      setDepartmentsLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadDesignations);
  }, [loadDesignations]);

  useEffect(() => {
    void Promise.resolve().then(loadDepartments);
  }, [loadDepartments]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      dispatch(setHrDesignationFilters({ Search: searchInput }));
      dispatch(setHrDesignationPage(1));
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [dispatch, searchInput]);

  const departmentLabels = useMemo(() => {
    return new Map(
      departmentOptions.map((option) => [String(option.value), option.label]),
    );
  }, [departmentOptions]);

  const stats = useMemo(
    () => ({
      active:
        designationsState.summary?.activeCount ??
        designationsState.list.filter((designation) =>
          getHrBoolean(designation.isActive),
        ).length,
      inactive:
        designationsState.summary?.inactiveCount ??
        designationsState.list.filter(
          (designation) => !getHrBoolean(designation.isActive),
        ).length,
      total:
        designationsState.summary?.totalCount ?? designationsState.totalCount,
      metricScope: designationsState.summaryScope,
      totalScope: "all-matching",
    }),
    [designationsState.list, designationsState.summary, designationsState.summaryScope, designationsState.totalCount],
  );

  const closeModal = useCallback(() => {
    cancelDetailRequests();
    detailPromiseRef.current?.abort?.();
    detailPromiseRef.current = null;
    setModal((current) => ({ ...current, isOpen: false }));
  }, [cancelDetailRequests]);

  const openCreate = useCallback(() => {
    if (!capabilities.canCreate) {
      return;
    }

    cancelDetailRequests();
    detailPromiseRef.current?.abort?.();
    detailPromiseRef.current = null;
    setModal({
      entity: null,
      isLoading: false,
      isOpen: true,
      mode: "create",
    });
  }, [cancelDetailRequests, capabilities.canCreate]);

  const openEntity = useCallback(
    async (mode, designation) => {
      const isAllowed =
        mode === "edit" ? capabilities.canUpdate : capabilities.canView;

      if (!isAllowed) {
        return;
      }

      const id = getHrRecordId(designation, "designation");

      if (!id) {
        toast.error("Unable to find designation id.");
        return;
      }

      setModal({ entity: designation, isLoading: true, isOpen: true, mode });
      detailPromiseRef.current?.abort?.();
      const requestId = beginDetailRequest();
      const detailPromise = dispatch(fetchHrDesignationById(id));
      detailPromiseRef.current = detailPromise;

      try {
        const response = await detailPromise.unwrap();
        if (!isLatestDetailRequest(requestId)) return;
        setModal({
          entity: extractHrEntity(response.data, "designation"),
          isLoading: false,
          isOpen: true,
          mode,
        });
      } catch (error) {
        if (!isLatestDetailRequest(requestId)) return;
        if (getApiStatus(error) === 404) {
          toast.error("This designation no longer exists. The list was refreshed.");
          closeModal();
          await loadDesignations();
          return;
        }
        toast.error(
          getHrActionError(error, "Unable to load designation details."),
        );
        setModal((current) =>
          current.isOpen &&
          current.mode === mode &&
          String(getHrRecordId(current.entity, "designation")) === String(id)
            ? { ...current, isLoading: false }
            : current,
        );
      } finally {
        if (detailPromiseRef.current === detailPromise) {
          detailPromiseRef.current = null;
        }
      }
    },
    [
      beginDetailRequest,
      capabilities.canUpdate,
      capabilities.canView,
      closeModal,
      dispatch,
      isLatestDetailRequest,
      loadDesignations,
    ],
  );

  const submitDesignation = useCallback(
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
                updateHrDesignation({
                  id: getHrRecordId(modal.entity, "designation"),
                  payload,
                }),
              ).unwrap()
            : await dispatch(createHrDesignation(payload)).unwrap();

        toast.success(
          getHrSuccessMessage(
            response,
            modal.mode === "edit"
              ? "Designation updated successfully"
              : "Designation created successfully",
          ),
        );
        closeModal();
        await loadDesignations();
      } catch (error) {
        if (modal.mode === "edit" && getApiStatus(error) === 404) {
          toast.error("This designation no longer exists. The list was refreshed.");
          closeModal();
          await loadDesignations();
          return;
        }
        toast.error(getHrActionError(error, "Unable to save designation."));
        throw error;
      }
    },
    [
      capabilities.canCreate,
      capabilities.canUpdate,
      closeModal,
      dispatch,
      loadDesignations,
      modal.entity,
      modal.mode,
    ],
  );

  const submitDepartment = useCallback(
    async (payload) => {
      if (!canCreateDepartment) {
        return;
      }

      try {
        await hrDepartmentService.createDepartment(payload);
        toast.success("Department created successfully");
        setDepartmentCreateOpen(false);
        await loadDepartments();
      } catch (error) {
        toast.error(getHrActionError(error, "Unable to create department."));
        throw error;
      }
    },
    [canCreateDepartment, loadDepartments],
  );

  const confirmDelete = useCallback(async () => {
    if (!capabilities.canDelete || !confirmation.entity) {
      return;
    }

    const id = getHrRecordId(confirmation.entity, "designation");

    if (!id) {
      toast.error("Unable to find designation id.");
      return;
    }

    setConfirmation((current) => ({ ...current, isLoading: true }));

    try {
      const result = await dispatch(deleteHrDesignation(id)).unwrap();
      toast.success(
        getHrSuccessMessage(
          result.response,
          "Designation deleted successfully",
        ),
      );
      setConfirmation({ entity: null, isLoading: false, isOpen: false });
      await loadDesignations();
    } catch (error) {
      toast.error(getHrActionError(error, "Unable to delete designation."));
      setConfirmation((current) => ({ ...current, isLoading: false }));
    }
  }, [
    capabilities.canDelete,
    confirmation.entity,
    dispatch,
    loadDesignations,
  ]);

  const filterControls = {
    ...designationsState.filters,
    Search: searchInput,
  };

  return (
    <section className="min-w-0 space-y-5">
      <PageHeader
        badge={
          <>
            <BadgeCheck className="h-3.5 w-3.5" />
            HR / Designations
          </>
        }
        title="Designations"
        description="Maintain role titles and map them to departments."
        actions={
          <>
            <AppButton
              variant="secondary"
              className="h-10"
              disabled={designationsState.loading}
              onClick={loadDesignations}
            >
              <RefreshCw
                className={`h-4 w-4 ${designationsState.loading ? "animate-spin" : ""}`}
              />
              Refresh
            </AppButton>
            {capabilities.canCreate && (
              <AppButton className="h-10" onClick={openCreate}>
                <Plus className="h-4 w-4" />
                Add Designation
              </AppButton>
            )}
          </>
        }
      />

      <DesignationStats {...stats} loading={designationsState.loading} />
      <DesignationFilters
        filters={filterControls}
        resultCount={designationsState.list.length}
        onChange={(patch) => {
          if (Object.hasOwn(patch, "Search")) {
            setSearchInput(patch.Search);
          } else {
            dispatch(setHrDesignationFilters(patch));
            dispatch(setHrDesignationPage(1));
          }
        }}
        onClear={() => {
          setSearchInput("");
          dispatch(setHrDesignationFilters({ Search: "", IsActive: "all" }));
          dispatch(setHrDesignationPage(1));
        }}
      />

      <DesignationTable
        actions={{
          ...capabilities,
          onDelete: (designation) =>
            setConfirmation({
              entity: designation,
              isLoading: false,
              isOpen: true,
            }),
          onEdit: (designation) => openEntity("edit", designation),
          onView: (designation) => openEntity("view", designation),
        }}
        departmentLabels={departmentLabels}
        designations={designationsState.list}
        error={designationsState.error}
        isLoading={designationsState.loading}
        onCreate={capabilities.canCreate ? openCreate : undefined}
        onPageChange={(value) => dispatch(setHrDesignationPage(value))}
        onPageSizeChange={(value) => dispatch(setHrDesignationPageSize(value))}
        onRetry={loadDesignations}
        pageNumber={designationsState.pageNumber}
        pageSize={designationsState.pageSize}
        totalCount={designationsState.totalCount}
        totalPages={designationsState.totalPages}
      />

      <DesignationFormModal
        canCreateDepartment={canCreateDepartment}
        departmentOptions={departmentOptions}
        departmentsLoading={departmentsLoading}
        designation={modal.entity}
        isLoading={modal.isLoading}
        isOpen={modal.isOpen}
        mode={modal.mode}
        onClose={closeModal}
        onCreateDepartment={() => {
          if (canCreateDepartment) {
            setDepartmentCreateOpen(true);
          }
        }}
        onSubmit={submitDesignation}
      />

      <DepartmentFormModal
        department={null}
        isLoading={false}
        isOpen={departmentCreateOpen}
        mode="create"
        onClose={() => setDepartmentCreateOpen(false)}
        onSubmit={submitDepartment}
      />

      <HrConfirmDialog
        isLoading={confirmation.isLoading}
        isOpen={confirmation.isOpen}
        title="Delete 1 designation?"
        description={`${confirmation.entity?.designationName ?? "This designation"} will be permanently removed.`}
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

export default DesignationsPage;
