import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Download,
  FileCheck2,
  FileX2,
  FolderTree,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "sonner";

import AppSelect from "../../../components/common/AppSelect";
import AppTooltip from "../../../components/common/AppTooltip";
import { pageService } from "../../../services/rbac/pageService";
import { getApiErrorMessage } from "../../../utils/apiError";
import PageFilters from "./PageFilters";
import PageModal from "./PageModal";
import PageStats from "./PageStats";
import PageTable from "./PageTable";

const DEFAULT_FILTERS = {
  parentPageId: "all",
  search: "",
  status: "all",
};

const PAGE_SIZE_OPTIONS = [10, 25, 50];
const LIST_KEYS = ["items", "pages", "records", "results", "content"];
const PAGE_PERMISSIONS = {
  activate: "pages.activate",
  create: "pages.create",
  deactivate: "pages.deactivate",
  delete: "pages.delete",
  update: "pages.update",
  view: "pages.view",
};

const getErrorMessage = (error, fallback) => {
  return getApiErrorMessage(error, fallback);
};

const extractCollection = (payload, responseMeta) => {
  if (Array.isArray(payload)) {
    return { items: payload, meta: responseMeta ?? {} };
  }

  const listKey = LIST_KEYS.find((key) => Array.isArray(payload?.[key]));

  return {
    items: listKey ? payload[listKey] : [],
    meta: {
      ...(responseMeta ?? {}),
      ...(payload?.meta ?? {}),
      ...(payload?.pagination ?? {}),
      total:
        payload?.total ??
        payload?.totalCount ??
        payload?.totalElements ??
        responseMeta?.total ??
        responseMeta?.totalCount ??
        responseMeta?.totalElements,
    },
  };
};

const extractSinglePage = (payload) => {
  return payload?.page ?? payload?.item ?? payload?.record ?? payload;
};

const getEntityId = (page) => {
  return page?.id ?? page?.pageId ?? page?.pageID ?? page?._id ?? page?.route;
};

const getParentId = (page) => {
  const parentId =
    page?.parentPageId ?? page?.parentId ?? page?.parent_id ?? page?.parent?.id;

  return parentId === 0 ||
    parentId === "0" ||
    parentId === "" ||
    parentId === null ||
    parentId === undefined
    ? null
    : parentId;
};

const flattenPageRecords = (pages, inheritedParentId = null) => {
  return pages.flatMap((page) => {
    const pageId = getEntityId(page);
    const normalizedPage = {
      ...page,
      parentPageId: getParentId(page) ?? inheritedParentId,
    };
    const children = Array.isArray(page.children) ? page.children : [];

    return [normalizedPage, ...flattenPageRecords(children, pageId)];
  });
};

const normalizeActiveState = (page) => {
  const rawValue =
    page?.isActive ?? page?.active ?? page?.enabled ?? page?.status;

  if (rawValue === undefined || rawValue === null) {
    return true;
  }

  if (typeof rawValue === "boolean") {
    return rawValue;
  }

  if (typeof rawValue === "number") {
    return rawValue === 1;
  }

  if (typeof rawValue === "string") {
    return ["active", "enabled", "true", "1"].includes(
      rawValue.trim().toLowerCase(),
    );
  }

  return Boolean(rawValue);
};

const normalizePage = (page) => {
  if (!page) {
    return null;
  }

  const name = page.name ?? page.pageName ?? page.key ?? page.route;
  const displayName =
    page.displayName ?? page.label ?? page.title ?? page.pageName ?? name;
  const id = getEntityId(page);

  if (!id || !name || !displayName) {
    return null;
  }

  return {
    displayName,
    icon: page.icon ?? page.iconName ?? page.moduleIcon ?? "AppWindow",
    id,
    isActive: normalizeActiveState(page),
    name,
    parentPageId: getParentId(page),
    route: page.route ?? page.path ?? page.url ?? "",
    sortOrder: Number(
      page.sortOrder ??
        page.displayOrder ??
        page.sequence ??
        page.order ??
        page.position ??
        0,
    ),
  };
};

const dedupePages = (pages) => {
  const pageMap = new Map();

  pages.filter(Boolean).forEach((page) => {
    pageMap.set(String(page.id), page);
  });

  return Array.from(pageMap.values());
};

const buildPaginationMeta = ({ currentPage, currentPageSize, itemCount, meta }) => {
  const total =
    meta?.total ??
    meta?.totalCount ??
    meta?.totalElements ??
    meta?.count ??
    itemCount;

  return {
    page: Number(meta?.page ?? meta?.pageNumber ?? meta?.currentPage) || currentPage,
    pageSize:
      Number(meta?.pageSize ?? meta?.size ?? meta?.limit) || currentPageSize,
    total: Number(total) || itemCount,
  };
};

const buildPageQueryParams = ({ filters, page, pageSize }) => {
  const hasStatus = filters.status !== "all";

  return {
    isActive: hasStatus ? filters.status === "active" : undefined,
    page,
    pageSize,
    parentPageId:
      filters.parentPageId === "all"
        ? undefined
        : filters.parentPageId === "root"
          ? 0
          : filters.parentPageId,
    search: filters.search.trim() || undefined,
    status: hasStatus ? filters.status : undefined,
  };
};

const getPagePayload = (page, isActive = page.isActive) => {
  return {
    displayName: page.displayName,
    icon: page.icon,
    isActive,
    name: page.name,
    parentPageId: page.parentPageId ?? 0,
    route: page.route,
    sortOrder: page.sortOrder,
  };
};

const ConfirmDialog = ({ confirmation, onCancel, onConfirm }) => {
  const displayName =
    confirmation.page?.displayName ?? confirmation.page?.name ?? "this page";
  const copy = {
    activate: {
      actionLabel: "Activate",
      buttonClassName: "bg-emerald-600 hover:bg-emerald-700",
      description: `${displayName} will become active as a page record. Navigation release remains managed separately.`,
      icon: FileCheck2,
      iconClassName: "bg-emerald-50 text-emerald-600",
      title: "Activate Page?",
    },
    deactivate: {
      actionLabel: "Deactivate",
      buttonClassName: "bg-amber-600 hover:bg-amber-700",
      description: `${displayName} will become inactive as a page record.`,
      icon: FileX2,
      iconClassName: "bg-amber-50 text-amber-600",
      title: "Deactivate Page?",
    },
    delete: {
      actionLabel: "Delete",
      buttonClassName: "bg-red-600 hover:bg-red-700",
      description:
        "This permanently removes the page record. Child pages may need reassignment first.",
      icon: Trash2,
      iconClassName: "bg-red-50 text-red-600",
      title: "Delete Page?",
    },
  }[confirmation.type];
  const Icon = copy?.icon ?? AlertTriangle;

  return (
    <AnimatePresence>
      {confirmation.isOpen && copy && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4 py-6 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={onCancel}
        >
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-labelledby="page-confirm-dialog-title"
            className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="px-6 py-6">
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${copy.iconClassName}`}>
                <Icon className="h-5 w-5" />
              </div>
              <h2 id="page-confirm-dialog-title" className="mt-4 text-lg font-bold tracking-tight text-slate-950">
                {copy.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {copy.description}
              </p>
            </div>
            <div className="flex flex-col-reverse gap-2 border-t border-slate-200 px-6 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onCancel}
                disabled={confirmation.isSubmitting}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={confirmation.isSubmitting}
                className={`inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold text-white shadow-sm transition-colors disabled:opacity-70 ${copy.buttonClassName}`}
              >
                {confirmation.isSubmitting ? "Processing..." : copy.actionLabel}
              </button>
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const Pages = () => {
  const authPages = useSelector((state) => state.auth.pages ?? []);
  const [pages, setPages] = useState([]);
  const [parentOptions, setParentOptions] = useState([]);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [paginationMeta, setPaginationMeta] = useState({
    page: 1,
    pageSize: PAGE_SIZE_OPTIONS[0],
    total: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isParentsLoading, setIsParentsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [parentsError, setParentsError] = useState(null);
  const [modalState, setModalState] = useState({
    isLoading: false,
    isOpen: false,
    mode: "create",
    page: null,
  });
  const [confirmation, setConfirmation] = useState({
    isOpen: false,
    isSubmitting: false,
    page: null,
    type: null,
  });

  const permissionSet = useMemo(() => {
    return new Set(
      authPages
        .flatMap((pageItem) =>
          Array.isArray(pageItem.permissions) ? pageItem.permissions : [],
        )
        .map(String),
    );
  }, [authPages]);

  const capabilities = useMemo(() => {
    const canPerform = (permission) => {
      return permissionSet.size === 0 || permissionSet.has(permission);
    };

    return {
      canActivate: canPerform(PAGE_PERMISSIONS.activate),
      canCreate: canPerform(PAGE_PERMISSIONS.create),
      canDeactivate: canPerform(PAGE_PERMISSIONS.deactivate),
      canDelete: canPerform(PAGE_PERMISSIONS.delete),
      canUpdate: canPerform(PAGE_PERMISSIONS.update),
      canView: canPerform(PAGE_PERMISSIONS.view),
    };
  }, [permissionSet]);

  const loadParentPages = useCallback(async () => {
    setIsParentsLoading(true);
    setParentsError(null);

    try {
      const response = await pageService.getPages({ pageSize: 500 });
      const collection = extractCollection(response.data, response.meta);
      setParentOptions(
        dedupePages(
          flattenPageRecords(collection.items).map(normalizePage).filter(Boolean),
        ),
      );
    } catch (error) {
      setParentOptions([]);
      setParentsError(getErrorMessage(error, "Unable to load parent pages."));
    } finally {
      setIsParentsLoading(false);
    }
  }, []);

  const loadPages = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await pageService.getPages(
        buildPageQueryParams({ filters, page, pageSize }),
      );
      const collection = extractCollection(response.data, response.meta);
      const normalizedPages = flattenPageRecords(collection.items)
        .map(normalizePage)
        .filter(Boolean);

      setPages(normalizedPages);
      setPaginationMeta(
        buildPaginationMeta({
          currentPage: page,
          currentPageSize: pageSize,
          itemCount: normalizedPages.length,
          meta: collection.meta,
        }),
      );
    } catch (error) {
      setPages([]);
      setErrorMessage(
        getErrorMessage(error, "Unable to load pages. Please try again."),
      );
    } finally {
      setIsLoading(false);
    }
  }, [filters, page, pageSize]);

  useEffect(() => {
    void Promise.resolve().then(loadParentPages);
  }, [loadParentPages]);

  useEffect(() => {
    void Promise.resolve().then(loadPages);
  }, [loadPages]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setFilters((current) => {
        return current.search === searchInput
          ? current
          : { ...current, search: searchInput };
      });
      setPage(1);
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [searchInput]);

  const totalItems = paginationMeta.total;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const rangeStart = pages.length ? (page - 1) * pageSize + 1 : 0;
  const rangeEnd = pages.length ? rangeStart + pages.length - 1 : 0;
  const filterControls = useMemo(
    () => ({ ...filters, search: searchInput }),
    [filters, searchInput],
  );
  const parentLookup = useMemo(() => {
    return new Map(parentOptions.map((item) => [String(item.id), item]));
  }, [parentOptions]);
  const stats = useMemo(
    () => ({
      active: pages.filter((item) => item.isActive).length,
      inactive: pages.filter((item) => !item.isActive).length,
      total: totalItems,
    }),
    [pages, totalItems],
  );

  const refreshPages = useCallback(async () => {
    await Promise.all([loadPages(), loadParentPages()]);
  }, [loadPages, loadParentPages]);

  const closeModal = useCallback(() => {
    setModalState((current) => ({ ...current, isLoading: false, isOpen: false }));
  }, []);

  const openCreateModal = useCallback(() => {
    loadParentPages();
    setModalState({ isLoading: false, isOpen: true, mode: "create", page: null });
  }, [loadParentPages]);

  const openPageModal = useCallback(async (mode, pageItem) => {
    loadParentPages();
    setModalState({ isLoading: true, isOpen: true, mode, page: pageItem });

    try {
      const response = await pageService.getPageById(pageItem.id);
      setModalState({
        isLoading: false,
        isOpen: true,
        mode,
        page: normalizePage(extractSinglePage(response.data)),
      });
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to load the latest page details."));
      setModalState((current) => ({ ...current, isLoading: false }));
    }
  }, [loadParentPages]);

  const submitPage = useCallback(async (payload) => {
    try {
      if (modalState.mode === "edit") {
        await pageService.updatePage(modalState.page.id, payload);
        toast.success("Page updated successfully");
      } else {
        await pageService.createPage(payload);
        toast.success("Page created successfully");
      }

      closeModal();
      await refreshPages();
    } catch (error) {
      toast.error(
        getErrorMessage(
          error,
          modalState.mode === "edit"
            ? "Unable to update page."
            : "Unable to create page.",
        ),
      );
    }
  }, [closeModal, modalState.mode, modalState.page, refreshPages]);

  const openConfirmation = useCallback((type, pageItem) => {
    setConfirmation({ isOpen: true, isSubmitting: false, page: pageItem, type });
  }, []);

  const closeConfirmation = useCallback(() => {
    setConfirmation({ isOpen: false, isSubmitting: false, page: null, type: null });
  }, []);

  const confirmAction = useCallback(async () => {
    if (!confirmation.page) {
      return;
    }

    setConfirmation((current) => ({ ...current, isSubmitting: true }));

    try {
      if (confirmation.type === "delete") {
        await pageService.deletePage(confirmation.page.id);
        toast.success("Page deleted successfully");
      } else {
        const shouldActivate = confirmation.type === "activate";
        await pageService.updatePage(
          confirmation.page.id,
          getPagePayload(confirmation.page, shouldActivate),
        );
        toast.success(
          shouldActivate
            ? "Page activated successfully"
            : "Page deactivated successfully",
        );
      }

      closeConfirmation();
      await refreshPages();
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to complete this action."));
      setConfirmation((current) => ({ ...current, isSubmitting: false }));
    }
  }, [closeConfirmation, confirmation.page, confirmation.type, refreshPages]);

  const handleFilterChange = useCallback((patch) => {
    if (Object.hasOwn(patch, "search")) {
      setSearchInput(patch.search);
    }

    const filterPatch = { ...patch };
    delete filterPatch.search;

    if (Object.keys(filterPatch).length) {
      setFilters((current) => ({ ...current, ...filterPatch }));
      setPage(1);
    }
  }, []);

  const clearFilters = useCallback(() => {
    setSearchInput("");
    setFilters(DEFAULT_FILTERS);
    setPage(1);
  }, []);

  const handlePageSizeChange = useCallback((value) => {
    setPageSize(Number(value));
    setPage(1);
  }, []);

  const handleExport = useCallback(() => {
    toast.info("Export is available as a UI action and will connect to reporting.");
  }, []);

  const tableActions = useMemo(
    () => ({
      canActivate: capabilities.canActivate,
      canDeactivate: capabilities.canDeactivate,
      canDelete: capabilities.canDelete,
      canEdit: capabilities.canUpdate,
      canView: capabilities.canView,
      onActivate: (item) => openConfirmation("activate", item),
      onDeactivate: (item) => openConfirmation("deactivate", item),
      onDelete: (item) => openConfirmation("delete", item),
      onEdit: (item) => openPageModal("edit", item),
      onView: (item) => openPageModal("view", item),
    }),
    [
      capabilities.canActivate,
      capabilities.canDeactivate,
      capabilities.canDelete,
      capabilities.canUpdate,
      capabilities.canView,
      openConfirmation,
      openPageModal,
    ],
  );

  return (
    <section className="min-w-0 space-y-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-light px-3 py-1 text-xs font-semibold text-brand ring-1 ring-inset ring-brand/10">
            <FolderTree className="h-3.5 w-3.5" />
            RBAC / Page Management
          </div>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-950">
            Pages
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
            Manage page records, routes and hierarchy before navigation release.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap xl:justify-end">
          <AppTooltip label="Refresh Pages">
            <button
              type="button"
              onClick={refreshPages}
              disabled={isLoading || isParentsLoading}
              aria-label="Refresh Pages"
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 disabled:opacity-60 active:scale-[0.98] sm:w-auto"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </AppTooltip>
          <AppTooltip label="Export Pages">
            <button
              type="button"
              onClick={handleExport}
              aria-label="Export Pages"
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 active:scale-[0.98] sm:w-auto"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
          </AppTooltip>
          <AppTooltip label="Add Page">
            <button
              type="button"
              onClick={openCreateModal}
              disabled={!capabilities.canCreate}
              aria-label="Add Page"
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-dark disabled:opacity-60 active:scale-[0.98] sm:w-auto"
            >
              <Plus className="h-4 w-4" />
              Add Page
            </button>
          </AppTooltip>
        </div>
      </div>

      <PageStats {...stats} />
      <PageFilters
        filters={filterControls}
        isParentsLoading={isParentsLoading}
        parentOptions={parentOptions}
        parentsError={parentsError}
        resultCount={totalItems}
        onChange={handleFilterChange}
        onClear={clearFilters}
      />
      <PageTable
        actions={tableActions}
        currentPage={page}
        errorMessage={errorMessage}
        hasError={Boolean(errorMessage)}
        isLoading={isLoading}
        onCreate={openCreateModal}
        onRetry={loadPages}
        pageSize={pageSize}
        pages={pages}
        parentLookup={parentLookup}
      />

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <p>
          Showing <span className="font-semibold text-slate-900">{rangeStart}</span>{" "}
          to <span className="font-semibold text-slate-900">{rangeEnd}</span> of{" "}
          <span className="font-semibold text-slate-900">{totalItems}</span> pages
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
            <span>Rows</span>
            <AppSelect
              value={pageSize}
              onChange={handlePageSizeChange}
              options={PAGE_SIZE_OPTIONS}
              className="w-20"
              aria-label="Rows per page"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={isLoading || page <= 1}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50 disabled:opacity-50"
            >
              Previous
            </button>
            <span className="min-w-20 text-center text-xs font-semibold text-slate-500">
              Page {page} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={isLoading || page >= totalPages}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <PageModal
        isLoading={modalState.isLoading}
        isOpen={modalState.isOpen}
        isParentsLoading={isParentsLoading}
        mode={modalState.mode}
        page={modalState.page}
        parentOptions={parentOptions}
        parentsError={parentsError}
        onClose={closeModal}
        onRetryParents={loadParentPages}
        onSubmit={submitPage}
      />
      <ConfirmDialog
        confirmation={confirmation}
        onCancel={closeConfirmation}
        onConfirm={confirmAction}
      />
    </section>
  );
};

export default Pages;
