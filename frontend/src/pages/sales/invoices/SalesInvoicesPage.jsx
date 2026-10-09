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
import {
  cancelInvoice,
  confirmInvoice,
  fetchInvoiceById,
  fetchInvoices,
  setInvoiceFilters,
  setInvoicePage,
  setInvoicePageSize,
} from "../../../store/slices/sales/invoiceSlice";
import {
  getPartyDisplayName,
  getPartyType,
} from "../../party/partyHelpers";
import { partyService } from "../../party/partyService";
import { PartyFormModal } from "../../party";
import { exportInvoicePdf } from "../invoiceTemplates/exportInvoicePdf";
import { getStoredInvoiceTemplate } from "../invoiceTemplates/templateStorage";
import InvoiceFilters from "./InvoiceFilters";
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
    pageName: "Sales.Invoice",
    resource: ["saleInvoices", "salesInvoices", "invoices"],
    route: "/sales/invoices",
  });
  const canCreateCustomer = useCreatePermission({
    label: "Party Master",
    pageName: "Party",
    resource: "party",
    route: "/party",
  });
  const [searchInput, setSearchInput] = useState(
    invoiceState.filters.Search,
  );
  const [lookups, setLookups] = useState({
    customers: [],
    customersError: null,
    customersLoading: false,
  });
  const lookupCacheRef = useRef({
    customers: { loaded: false, promise: null },
  });
  const [lookupCreateModal, setLookupCreateModal] = useState({
    customer: false,
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

    const request = partyService.getParties({
      PageNumber: 1,
      PageSize: 200,
      IsActive: true,
    });

    setLookups((current) => ({
      ...current,
      customersLoading: true,
      customersError: null,
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

          return ["customer", "both"].includes(getPartyType(entry));
        });

        cache.loaded = true;
        setLookups((current) => ({
          ...current,
          customers: records,
          customersLoading: false,
          customersError: null,
        }));

        return null;
      })
      .catch((error) => {
        const message = getActionError(error, "Unable to load customers.");

        setLookups((current) => ({
          ...current,
          customersLoading: false,
          customersError: message,
        }));

        return message;
      })
      .finally(() => {
        cache.promise = null;
      });

    return cache.promise;
  }, []);

  const loadLookups = useCallback(async () => {
    const error = await loadLookup("customers");

    if (error) {
      toast.error(error);
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

  const openCreate = useCallback(() => {
    if (!capabilities.canCreate) {
      toast.error("You don't have permission to create invoices.");
      return;
    }

    navigate("/sales/invoices/new");
  }, [capabilities.canCreate, navigate]);

  const openLookupCreate = useCallback(
    (type) => {
      if (type === "customer" && canCreateCustomer) {
        setLookupCreateModal((current) => ({ ...current, [type]: true }));
        return;
      }

      toast.error("You don't have permission to create this record.");
    },
    [canCreateCustomer],
  );

  const closeLookupCreate = useCallback((type) => {
    setLookupCreateModal((current) => ({ ...current, [type]: false }));
  }, []);

  const submitLookupCreate = useCallback(
    async (type, payload) => {
      if (type !== "customer" || !canCreateCustomer) {
        toast.error("You don't have permission to create this record.");
        return;
      }

      try {
        await partyService.createParty(payload);
        toast.success("Customer created successfully");
        lookupCacheRef.current.customers.loaded = false;
        await loadLookup("customers", { force: true });
        closeLookupCreate(type);
      } catch (error) {
        toast.error(getActionError(error, "Unable to create record."));
        throw error;
      }
    },
    [canCreateCustomer, closeLookupCreate, loadLookup],
  );

  const openEdit = useCallback(
    (invoice) => {
      if (!capabilities.canUpdate) {
        toast.error("You don't have permission to update invoices.");
        return;
      }

      navigate(`/sales/invoices/${invoice.id}/edit`);
    },
    [capabilities.canUpdate, navigate],
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

      <PartyFormModal
        isLoading={false}
        isOpen={lookupCreateModal.customer}
        mode="create"
        onClose={() => closeLookupCreate("customer")}
        onSubmit={(payload) => submitLookupCreate("customer", payload)}
        submitLabel="Create Customer"
        title="Add Customer"
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
