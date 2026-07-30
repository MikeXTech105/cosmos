import { Plus, ReceiptText, RefreshCw } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import AppButton from "../../../components/common/AppButton";
import PageHeader from "../../../components/common/PageHeader";
import useCapabilities from "../../../hooks/useCapabilities";
import useCreatePermission from "../../../hooks/useCreatePermission";
import { categoryService } from "../../../services/inventory/categoryService";
import { itemService } from "../../../services/inventory/itemService";
import { unitService } from "../../../services/inventory/unitService";
import {
  cancelInvoice,
  confirmInvoice,
  createInvoice,
  fetchInvoiceById,
  fetchInvoices,
  setInvoiceFilters,
  setInvoicePage,
  setInvoicePageSize,
  updateInvoice,
} from "../../../store/slices/sales/invoiceSlice";
import {
  getPartyDisplayName,
  getPartyType,
} from "../../party/partyHelpers";
import { partyService } from "../../party/partyService";
import { PartyFormModal } from "../../party";
import CategoryFormModal from "../../inventory/categories/CategoryFormModal";
import ItemFormModal from "../../inventory/items/ItemFormModal";
import UnitFormModal from "../../inventory/units/UnitFormModal";
import { exportInvoicePdf } from "../invoiceTemplates/exportInvoicePdf";
import { getStoredInvoiceTemplate } from "../invoiceTemplates/templateStorage";
import InvoiceFilters from "./InvoiceFilters";
import InvoiceFormModal from "./InvoiceFormModal";
import InvoiceStats from "./InvoiceStats";
import InvoiceTable from "./InvoiceTable";
import { InvoiceConfirmDialog } from "./InvoiceShared";
import {
  buildInvoiceQueryParams,
  formatCurrency,
  getActionError,
  getSuccessMessage,
  isInvoiceOverdue,
} from "./invoiceHelpers";

const getLookupList = (response) => {
  const data = response?.data;

  if (Array.isArray(data)) {
    return data;
  }

  return data?.items ?? [];
};

const getResponseInvoice = (response) => {
  return response?.data?.invoice ?? response?.data ?? null;
};

const SalesInvoicesPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const invoiceState = useSelector((state) => state.salesInvoices);
  const capabilities = useCapabilities({
    actions: ["view", "create", "update", "confirm", "cancel", "export"],
    label: "Sale Invoices",
    resource: ["saleInvoices", "salesInvoices", "invoices"],
    route: "/sales/invoices",
  });
  const canCreateCustomer = useCreatePermission({
    label: "Party Master",
    resource: "party",
    route: "/party",
  });
  const canCreateItem = useCreatePermission({
    label: "Items",
    resource: "items",
    route: "/items",
  });
  const canCreateCategory = useCreatePermission({
    label: "Categories",
    resource: "categories",
    route: "/categories",
  });
  const canCreateUnit = useCreatePermission({
    label: "Units",
    resource: "units",
    route: "/units",
  });
  const [searchInput, setSearchInput] = useState(
    invoiceState.filters.Search,
  );
  const [lookups, setLookups] = useState({
    customers: [],
    customersError: null,
    customersLoading: false,
    items: [],
    itemsError: null,
    itemsLoading: false,
  });
  const lookupCacheRef = useRef({
    customers: { loaded: false, promise: null },
    items: { loaded: false, promise: null },
  });
  const [modal, setModal] = useState({
    entity: null,
    isLoading: false,
    isOpen: false,
    mode: "create",
  });
  const [lookupCreateModal, setLookupCreateModal] = useState({
    category: false,
    customer: false,
    item: false,
    unit: false,
  });
  const [itemCreateLookups, setItemCreateLookups] = useState({
    categories: [],
    categoriesLoading: false,
    units: [],
    unitsLoading: false,
  });
  const [confirmation, setConfirmation] = useState({
    action: "confirm",
    entity: null,
    isLoading: false,
    isOpen: false,
  });
  const [isPdfLoading, setIsPdfLoading] = useState(false);

  const queryParams = useMemo(
    () =>
      buildInvoiceQueryParams({
        filters: invoiceState.filters,
        pageNumber: invoiceState.pageNumber,
        pageSize: invoiceState.pageSize,
      }),
    [
      invoiceState.filters,
      invoiceState.pageNumber,
      invoiceState.pageSize,
    ],
  );

  const loadInvoices = useCallback(() => {
    return dispatch(fetchInvoices(queryParams));
  }, [dispatch, queryParams]);

  const loadLookup = useCallback((type, { force = false } = {}) => {
    const cache = lookupCacheRef.current[type];

    if (cache.loaded && !force) {
      return Promise.resolve(null);
    }

    if (cache.promise) {
      return cache.promise;
    }

    const isCustomers = type === "customers";
    const loadingKey = isCustomers ? "customersLoading" : "itemsLoading";
    const errorKey = isCustomers ? "customersError" : "itemsError";
    const request = isCustomers
      ? partyService.getParties({
          PageNumber: 1,
          PageSize: 200,
          IsActive: true,
        })
      : itemService.getItems({
          PageNumber: 1,
          PageSize: 200,
          IsActive: true,
        });

    setLookups((current) => ({
      ...current,
      [loadingKey]: true,
      [errorKey]: null,
    }));

    cache.promise = request
      .then((response) => {
        const records = getLookupList(response).filter((entry) => {
          if (entry?.id === null || entry?.id === undefined) {
            return false;
          }

          if (entry?.isActive === false) {
            return false;
          }

          if (isCustomers) {
            return ["customer", "both"].includes(getPartyType(entry));
          }

          return Boolean(String(entry?.name ?? "").trim());
        });

        cache.loaded = true;
        setLookups((current) => ({
          ...current,
          [type]: records,
          [loadingKey]: false,
          [errorKey]: null,
        }));

        return null;
      })
      .catch((error) => {
        const message = getActionError(
          error,
          `Unable to load ${isCustomers ? "customers" : "items"}.`,
        );

        setLookups((current) => ({
          ...current,
          [loadingKey]: false,
          [errorKey]: message,
        }));

        return message;
      })
      .finally(() => {
        cache.promise = null;
      });

    return cache.promise;
  }, []);

  const loadLookups = useCallback(async () => {
    const errors = (
      await Promise.all([loadLookup("customers"), loadLookup("items")])
    ).filter(Boolean);

    if (errors.length > 0) {
      toast.error([...new Set(errors)].join(" "));
    }
  }, [loadLookup]);

  useEffect(() => {
    void Promise.resolve().then(loadInvoices);
  }, [loadInvoices]);

  useEffect(() => {
    void loadLookups();
  }, [loadLookups]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      dispatch(setInvoiceFilters({ Search: searchInput }));
      dispatch(setInvoicePage(1));
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [dispatch, searchInput]);

  const customerOptions = useMemo(
    () =>
      lookups.customers.map((customer) => ({
        value: customer.id,
        label: getPartyDisplayName(customer),
      })),
    [lookups.customers],
  );

  const customerById = useMemo(() => {
    return new Map(
      lookups.customers.map((customer) => [String(customer.id), customer]),
    );
  }, [lookups.customers]);

  const itemOptions = useMemo(
    () =>
      lookups.items.map((item) => ({
        value: Number(item.id),
        label: [item.name, item.itemCode].filter(Boolean).join(" - "),
      })),
    [lookups.items],
  );

  const itemsById = useMemo(() => {
    return new Map(lookups.items.map((item) => [String(item.id), item]));
  }, [lookups.items]);

  const stats = useMemo(() => {
    const totalSales = invoiceState.list.reduce((total, invoice) => {
      return total + Number(invoice.grandTotal || 0);
    }, 0);
    const unpaid = invoiceState.list.reduce((total, invoice) => {
      return total + Number(invoice.dueAmount || 0);
    }, 0);

    return {
      overdue:
        invoiceState.summary?.overdueCount ??
        invoiceState.list.filter(isInvoiceOverdue).length,
      totalInvoices:
        invoiceState.summary?.totalInvoices ?? invoiceState.totalCount,
      totalSales: formatCurrency(
        invoiceState.summary?.totalSalesAmount ?? totalSales,
      ),
      unpaid: formatCurrency(invoiceState.summary?.unpaidAmount ?? unpaid),
      metricScope: invoiceState.summaryScope,
      totalScope: "all-matching",
    };
  }, [invoiceState.list, invoiceState.summary, invoiceState.summaryScope, invoiceState.totalCount]);

  const closeModal = useCallback(() => {
    setModal((current) => ({ ...current, isOpen: false }));
  }, []);

  const openCreate = useCallback(() => {
    if (!capabilities.canCreate) {
      toast.error("You don't have permission to create invoices.");
      return;
    }

    void loadLookups();
    setModal({
      entity: null,
      isLoading: false,
      isOpen: true,
      mode: "create",
    });
  }, [capabilities.canCreate, loadLookups]);

  const loadItemCreateLookups = useCallback(async () => {
    setItemCreateLookups((current) => ({
      ...current,
      categoriesLoading: true,
      unitsLoading: true,
    }));

    try {
      const [categories, units] = await Promise.all([
        categoryService.getCategories({
          IsActive: true,
          PageNumber: 1,
          PageSize: 200,
        }),
        unitService.getUnits({
          IsActive: true,
          PageNumber: 1,
          PageSize: 200,
        }),
      ]);

      setItemCreateLookups({
        categories: getLookupList(categories),
        categoriesLoading: false,
        units: getLookupList(units),
        unitsLoading: false,
      });
    } catch (error) {
      toast.error(
        getActionError(error, "Unable to load item form lookups."),
      );
      setItemCreateLookups((current) => ({
        ...current,
        categoriesLoading: false,
        unitsLoading: false,
      }));
    }
  }, []);

  const openLookupCreate = useCallback(
    (type) => {
      const allowed = {
        category: canCreateCategory,
        customer: canCreateCustomer,
        item: canCreateItem,
        unit: canCreateUnit,
      }[type];

      if (!allowed) {
        toast.error("You don't have permission to create this record.");
        return;
      }

      if (type === "item") {
        void loadItemCreateLookups();
      }

      setLookupCreateModal((current) => ({ ...current, [type]: true }));
    },
    [
      canCreateCategory,
      canCreateCustomer,
      canCreateItem,
      canCreateUnit,
      loadItemCreateLookups,
    ],
  );

  const closeLookupCreate = useCallback((type) => {
    setLookupCreateModal((current) => ({ ...current, [type]: false }));
  }, []);

  const refreshItemCreateLookup = useCallback(async (type) => {
    if (type === "category") {
      const response = await categoryService.getCategories({
        IsActive: true,
        PageNumber: 1,
        PageSize: 200,
      });
      setItemCreateLookups((current) => ({
        ...current,
        categories: getLookupList(response),
      }));
      return;
    }

    const response = await unitService.getUnits({
      IsActive: true,
      PageNumber: 1,
      PageSize: 200,
    });
    setItemCreateLookups((current) => ({
      ...current,
      units: getLookupList(response),
    }));
  }, []);

  const submitLookupCreate = useCallback(
    async (type, payload, saveAndNew = false) => {
      const allowed = {
        category: canCreateCategory,
        customer: canCreateCustomer,
        item: canCreateItem,
        unit: canCreateUnit,
      }[type];

      if (!allowed) {
        toast.error("You don't have permission to create this record.");
        return;
      }

      try {
        if (type === "customer") {
          await partyService.createParty(payload);
          toast.success("Customer created successfully");
          lookupCacheRef.current.customers.loaded = false;
          await loadLookup("customers", { force: true });
        } else if (type === "item") {
          await itemService.createItem(payload);
          toast.success("Item created successfully");
          lookupCacheRef.current.items.loaded = false;
          await loadLookup("items", { force: true });
        } else if (type === "category") {
          await categoryService.createCategory(payload);
          toast.success("Category created successfully");
          await refreshItemCreateLookup("category");
        } else {
          await unitService.createUnit(payload);
          toast.success("Unit created successfully");
          await refreshItemCreateLookup("unit");
        }

        if (!saveAndNew) {
          closeLookupCreate(type);
        }
      } catch (error) {
        toast.error(getActionError(error, "Unable to create record."));
        throw error;
      }
    },
    [
      canCreateCategory,
      canCreateCustomer,
      canCreateItem,
      canCreateUnit,
      closeLookupCreate,
      loadLookup,
      refreshItemCreateLookup,
    ],
  );

  const openEdit = useCallback(
    async (invoice) => {
      if (!capabilities.canUpdate) {
        toast.error("You don't have permission to update invoices.");
        return;
      }

      void loadLookups();
      setModal({
        entity: invoice,
        isLoading: true,
        isOpen: true,
        mode: "edit",
      });

      try {
        const response = await dispatch(fetchInvoiceById(invoice.id)).unwrap();
        setModal({
          entity: getResponseInvoice(response),
          isLoading: false,
          isOpen: true,
          mode: "edit",
        });
      } catch (error) {
        toast.error(getActionError(error, "Unable to load invoice details."));
        setModal((current) => ({ ...current, isLoading: false }));
      }
    },
    [capabilities.canUpdate, dispatch, loadLookups],
  );

  const submitInvoice = useCallback(
    async (payload) => {
      const allowed =
        modal.mode === "edit"
          ? capabilities.canUpdate
          : capabilities.canCreate;

      if (!allowed) {
        toast.error("You don't have permission to save this invoice.");
        return;
      }

      try {
        const response =
          modal.mode === "edit"
            ? await dispatch(
                updateInvoice({ id: modal.entity.id, payload }),
              ).unwrap()
            : await dispatch(createInvoice(payload)).unwrap();

        toast.success(
          getSuccessMessage(
            response,
            modal.mode === "edit"
              ? "Invoice updated successfully"
              : "Invoice created successfully",
          ),
        );
        closeModal();
        await loadInvoices();
      } catch (error) {
        toast.error(getActionError(error, "Unable to save invoice."));
        throw error;
      }
    },
    [
      capabilities.canCreate,
      capabilities.canUpdate,
      closeModal,
      dispatch,
      loadInvoices,
      modal.entity,
      modal.mode,
    ],
  );

  const openConfirmation = useCallback((action, invoice) => {
    const allowed =
      action === "cancel" ? capabilities.canCancel : capabilities.canConfirm;

    if (!allowed) {
      toast.error("You don't have permission to perform this invoice action.");
      return;
    }

    setConfirmation({
      action,
      entity: invoice,
      isLoading: false,
      isOpen: true,
    });
  }, [capabilities.canCancel, capabilities.canConfirm]);

  const closeConfirmation = useCallback(() => {
    setConfirmation({
      action: "confirm",
      entity: null,
      isLoading: false,
      isOpen: false,
    });
  }, []);

  const submitConfirmation = useCallback(async () => {
    if (!confirmation.entity) {
      return;
    }

    const allowed =
      confirmation.action === "cancel"
        ? capabilities.canCancel
        : capabilities.canConfirm;

    if (!allowed) {
      toast.error("You don't have permission to perform this invoice action.");
      closeConfirmation();
      return;
    }

    setConfirmation((current) => ({ ...current, isLoading: true }));

    try {
      const response =
        confirmation.action === "cancel"
          ? await dispatch(cancelInvoice(confirmation.entity.id)).unwrap()
          : await dispatch(confirmInvoice(confirmation.entity.id)).unwrap();

      toast.success(
        getSuccessMessage(
          response,
          confirmation.action === "cancel"
            ? "Invoice cancelled successfully"
            : "Invoice confirmed successfully",
        ),
      );
      closeConfirmation();
      await loadInvoices();
    } catch (error) {
      toast.error(
        getActionError(
          error,
          confirmation.action === "cancel"
            ? "Unable to cancel invoice."
            : "Unable to confirm invoice.",
        ),
      );
      setConfirmation((current) => ({ ...current, isLoading: false }));
    }
  }, [
    capabilities.canCancel,
    capabilities.canConfirm,
    closeConfirmation,
    confirmation,
    dispatch,
    loadInvoices,
  ]);

  const downloadPdf = useCallback(
    async (invoice) => {
      if (!capabilities.canExport) {
        toast.error("You don't have permission to export invoices.");
        return;
      }

      setIsPdfLoading(true);
      try {
        const response = await dispatch(fetchInvoiceById(invoice.id)).unwrap();
        const detailedInvoice = getResponseInvoice(response);
        const customer = customerById.get(
          String(detailedInvoice?.customerPartyId ?? invoice.customerPartyId),
        );

        await exportInvoicePdf({
          invoice: detailedInvoice ?? invoice,
          customer,
          templateId: getStoredInvoiceTemplate(),
        });
        toast.success("Invoice PDF downloaded");
      } catch (error) {
        toast.error(getActionError(error, "Unable to download invoice PDF."));
      } finally {
        setIsPdfLoading(false);
      }
    },
    [capabilities.canExport, customerById, dispatch],
  );

  const filterControls = {
    ...invoiceState.filters,
    Search: searchInput,
  };

  return (
    <section className="min-w-0 space-y-5">
      <PageHeader
        badge={
          <>
            <ReceiptText className="h-3.5 w-3.5" />
            Sales / Invoices
          </>
        }
        title="Sale Invoices"
        description="Create and manage customer invoices."
        actions={
          <>
            <AppButton
              variant="secondary"
              className="h-10"
              disabled={invoiceState.loading}
              onClick={loadInvoices}
            >
              <RefreshCw
                className={`h-4 w-4 ${invoiceState.loading ? "animate-spin" : ""}`}
              />
              Refresh
            </AppButton>
            {capabilities.canCreate && (
              <AppButton className="h-10" onClick={openCreate}>
                <Plus className="h-4 w-4" />
                New Invoice
              </AppButton>
            )}
          </>
        }
      />

      <InvoiceStats {...stats} />

      <InvoiceFilters
        canCreateCustomer={canCreateCustomer}
        customerOptions={customerOptions}
        filters={filterControls}
        resultCount={invoiceState.list.length}
        onCreateCustomer={() => openLookupCreate("customer")}
        onChange={(patch) => {
          if (Object.hasOwn(patch, "Search")) {
            setSearchInput(patch.Search);
            return;
          }

          dispatch(setInvoiceFilters(patch));
          dispatch(setInvoicePage(1));
        }}
        onClear={() => {
          setSearchInput("");
          dispatch(
            setInvoiceFilters({
              Search: "",
              CustomerPartyId: "all",
              Status: "all",
              PaymentStatus: "all",
              FromDate: "",
              ToDate: "",
              SortBy: "",
              SortDirection: "",
            }),
          );
          dispatch(setInvoicePage(1));
        }}
      />

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <InvoiceTable
          actions={{
            canCancel: capabilities.canCancel,
            canConfirm: capabilities.canConfirm,
            canExport: capabilities.canExport,
            canUpdate: capabilities.canUpdate,
            canView: capabilities.canView,
            onCancel: (invoice) => openConfirmation("cancel", invoice),
            onConfirm: (invoice) => openConfirmation("confirm", invoice),
            onDownloadPdf: downloadPdf,
            onEdit: openEdit,
            onView: (invoice) => navigate(`/sales/invoices/${invoice.id}`),
          }}
          error={invoiceState.error}
          invoices={invoiceState.list}
          isLoading={invoiceState.loading}
          onCreate={capabilities.canCreate ? openCreate : undefined}
          onPageChange={(value) => dispatch(setInvoicePage(value))}
          onPageSizeChange={(value) => dispatch(setInvoicePageSize(value))}
          onRetry={loadInvoices}
          onSelect={(invoice) => navigate(`/sales/invoices/${invoice.id}`)}
          pageNumber={invoiceState.pageNumber}
          pageSize={invoiceState.pageSize}
          totalCount={invoiceState.totalCount}
          totalPages={invoiceState.totalPages}
        />
      </div>

      <InvoiceFormModal
        canCreateCustomer={canCreateCustomer}
        canCreateItem={canCreateItem}
        key={`${modal.isOpen}-${modal.mode}-${modal.entity?.id ?? "new"}`}
        customerEmptyMessage={
          lookups.customersError
            ? "Unable to load customers. Close and reopen to retry."
            : "No customers found in Party Master."
        }
        customerLoading={lookups.customersLoading}
        customerOptions={customerOptions}
        invoice={modal.entity}
        isLoading={modal.isLoading}
        isOpen={modal.isOpen}
        itemEmptyMessage={
          lookups.itemsError
            ? "Unable to load items. Close and reopen to retry."
            : "No items found in inventory."
        }
        itemLoading={lookups.itemsLoading}
        itemOptions={itemOptions}
        itemsById={itemsById}
        mode={modal.mode}
        onClose={closeModal}
        onCreateCustomer={() => openLookupCreate("customer")}
        onCreateItem={() => openLookupCreate("item")}
        onSubmit={submitInvoice}
      />

      <PartyFormModal
        isLoading={false}
        isOpen={lookupCreateModal.customer}
        mode="create"
        onClose={() => closeLookupCreate("customer")}
        onSubmit={(payload) => submitLookupCreate("customer", payload)}
        submitLabel="Create Customer"
        title="Add Customer"
      />

      <ItemFormModal
        canCreateCategory={canCreateCategory}
        canCreateUnit={canCreateUnit}
        categoryOptions={itemCreateLookups.categories.map((category) => ({
          value: Number(category.id),
          label: category.name,
        }))}
        categoryEmptyMessage="No categories yet - add one in Categories."
        categoryLoading={itemCreateLookups.categoriesLoading}
        isLoading={false}
        isOpen={lookupCreateModal.item}
        item={null}
        mode="create"
        onClose={() => closeLookupCreate("item")}
        onCreateCategory={() => openLookupCreate("category")}
        onCreateUnit={() => openLookupCreate("unit")}
        onSubmit={(payload, saveAndNew) =>
          submitLookupCreate("item", payload, saveAndNew)
        }
        unitOptions={itemCreateLookups.units.map((unit) => ({
          value: Number(unit.id),
          label: unit.shortName ? `${unit.name} (${unit.shortName})` : unit.name,
        }))}
        unitEmptyMessage="No units yet - add one in Units."
        unitLoading={itemCreateLookups.unitsLoading}
      />

      <CategoryFormModal
        category={null}
        isLoading={false}
        isOpen={lookupCreateModal.category}
        mode="create"
        onClose={() => closeLookupCreate("category")}
        onSubmit={(payload) => submitLookupCreate("category", payload)}
      />

      <UnitFormModal
        isLoading={false}
        isOpen={lookupCreateModal.unit}
        mode="create"
        onClose={() => closeLookupCreate("unit")}
        onSubmit={(payload, saveAndNew) =>
          submitLookupCreate("unit", payload, saveAndNew)
        }
        unit={null}
      />

      <InvoiceConfirmDialog
        confirmLabel={
          confirmation.action === "cancel" ? "Cancel Invoice" : "Confirm"
        }
        description={`${
          confirmation.entity?.invoiceNumber ??
          `Invoice #${confirmation.entity?.id ?? ""}`
        } will be ${
          confirmation.action === "cancel" ? "cancelled" : "confirmed"
        }.`}
        isLoading={confirmation.isLoading}
        isOpen={confirmation.isOpen}
        tone={confirmation.action === "cancel" ? "danger" : "primary"}
        title={
          confirmation.action === "cancel"
            ? "Cancel Invoice?"
            : "Confirm Invoice?"
        }
        onCancel={closeConfirmation}
        onConfirm={submitConfirmation}
      />

      {isPdfLoading && (
        <div className="fixed bottom-4 right-4 z-40 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-lg">
          Preparing invoice PDF...
        </div>
      )}
    </section>
  );
};

export default SalesInvoicesPage;
