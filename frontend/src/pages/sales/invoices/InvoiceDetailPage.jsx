import {
  ArrowLeft,
  Ban,
  CheckCircle2,
  CreditCard,
  Download,
  Pencil,
  Printer,
  RefreshCw,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useState,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import AppButton from "../../../components/common/AppButton";
import AppSelect from "../../../components/common/AppSelect";
import PageHeader from "../../../components/common/PageHeader";
import useCapabilities from "../../../hooks/useCapabilities";
import {
  cancelInvoice,
  confirmInvoice,
  fetchInvoiceById,
  fetchInvoicePayments,
  recordInvoicePayment,
} from "../../../store/slices/sales/invoiceSlice";
import { partyService } from "../../party/partyService";
import { exportInvoicePdf } from "../invoiceTemplates/exportInvoicePdf";
import {
  getInvoiceTemplate,
  invoiceTemplates,
} from "../invoiceTemplates/templateRegistry";
import { getStoredInvoiceTemplate } from "../invoiceTemplates/templateStorage";
import PaymentModal from "./PaymentModal";
import {
  buildTemplateInvoice,
  formatCurrency,
  formatDate,
  getActionError,
  getInvoiceStatusMeta,
  getPaymentModeLabel,
  getPaymentStatusMeta,
  getSuccessMessage,
  isInvoiceCancelled,
  isInvoiceConfirmed,
  isInvoiceDraft,
} from "./invoiceHelpers";
import {
  InvoiceConfirmDialog,
  InvoiceStatusPill,
} from "./InvoiceShared";

const PaymentHistory = ({ error, isLoading, payments }) => {
  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">
          Payment History
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-semibold">Date</th>
              <th className="px-4 py-3 text-right font-semibold">Amount</th>
              <th className="px-4 py-3 font-semibold">Mode</th>
              <th className="px-4 py-3 font-semibold">Reference</th>
              <th className="px-4 py-3 font-semibold">Notes</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 3 }, (_, index) => (
                <tr key={index}>
                  <td colSpan={5} className="px-4 py-3">
                    <div className="h-10 animate-pulse rounded-xl bg-slate-100" />
                  </td>
                </tr>
              ))
            ) : payments.length > 0 ? (
              payments.map((payment) => (
                <tr key={payment.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 text-slate-600">
                    {formatDate(payment.paymentDate)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">
                    {formatCurrency(payment.amount)}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {getPaymentModeLabel(payment.paymentMode)}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {payment.referenceNumber || "-"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {payment.notes || "-"}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-sm text-slate-500"
                >
                  {error || "No payments recorded yet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

const InvoiceDetailPage = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const invoiceState = useSelector((state) => state.salesInvoices);
  const capabilities = useCapabilities({
    actions: ["view", "update", "confirm", "cancel", "payment", "export"],
    label: "Sale Invoices",
    pageName: "Sales.Invoice",
    resource: ["saleInvoices", "salesInvoices", "invoices"],
    route: "/sales/invoices",
  });
  const invoice =
    String(invoiceState.selected?.id ?? "") === String(id)
      ? invoiceState.selected
      : null;
  const [customer, setCustomer] = useState(null);
  const [templateId, setTemplateId] = useState(getStoredInvoiceTemplate);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [confirmation, setConfirmation] = useState({
    action: "confirm",
    entity: null,
    isLoading: false,
    isOpen: false,
  });

  const loadInvoice = useCallback(async () => {
    try {
      await dispatch(fetchInvoiceById(id)).unwrap();
    } catch (error) {
      toast.error(getActionError(error, "Unable to load invoice details."));
    }

    try {
      await dispatch(fetchInvoicePayments(id)).unwrap();
    } catch {
      // The page still renders invoice details if payment history is unavailable.
    }
  }, [dispatch, id]);

  useEffect(() => {
    void Promise.resolve().then(loadInvoice);
  }, [loadInvoice]);

  useEffect(() => {
    if (!invoice?.customerPartyId) {
      return undefined;
    }

    let isActive = true;

    partyService
      .getPartyById(invoice.customerPartyId)
      .then((response) => {
        if (isActive) {
          setCustomer(response?.data?.party ?? response?.data ?? null);
        }
      })
      .catch(() => {
        if (isActive) {
          setCustomer(null);
        }
      });

    return () => {
      isActive = false;
    };
  }, [invoice?.customerPartyId]);

  const template = getInvoiceTemplate(templateId);
  const TemplateComponent = template.Component;
  const templateInvoice = invoice ? buildTemplateInvoice(invoice, customer) : null;

  const openEdit = useCallback(() => {
    if (!invoice) {
      return;
    }

    if (!capabilities.canUpdate) {
      toast.error("You don't have permission to update invoices.");
      return;
    }

    navigate(`/sales/invoices/${invoice.id}/edit`);
  }, [capabilities.canUpdate, invoice, navigate]);

  const openConfirmation = useCallback((action) => {
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
  }, [capabilities.canCancel, capabilities.canConfirm, invoice]);

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
      await loadInvoice();
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
    loadInvoice,
  ]);

  const submitPayment = useCallback(
    async (payload) => {
      if (!capabilities.canPayment) {
        toast.error("You don't have permission to record invoice payments.");
        return;
      }

      try {
        const response = await dispatch(
          recordInvoicePayment({ id: invoice.id, payload }),
        ).unwrap();

        toast.success(getSuccessMessage(response, "Payment recorded"));
        setPaymentOpen(false);
        await loadInvoice();
      } catch (error) {
        toast.error(getActionError(error, "Unable to record payment."));
        throw error;
      }
    },
    [capabilities.canPayment, dispatch, invoice, loadInvoice],
  );

  const openPayment = useCallback(() => {
    if (!capabilities.canPayment) {
      toast.error("You don't have permission to record invoice payments.");
      return;
    }

    setPaymentOpen(true);
  }, [capabilities.canPayment]);

  const downloadPdf = useCallback(async () => {
    if (!invoice) {
      return;
    }

    if (!capabilities.canExport) {
      toast.error("You don't have permission to export invoices.");
      return;
    }

    setIsPdfLoading(true);
    try {
      await exportInvoicePdf({ invoice, customer, templateId });
      toast.success("Invoice PDF downloaded");
    } catch (error) {
      toast.error(getActionError(error, "Unable to download invoice PDF."));
    } finally {
      setIsPdfLoading(false);
    }
  }, [capabilities.canExport, customer, invoice, templateId]);

  const printInvoice = useCallback(() => {
    if (!capabilities.canExport) {
      toast.error("You don't have permission to export invoices.");
      return;
    }

    window.print();
  }, [capabilities.canExport]);

  if (invoiceState.detailLoading && !invoice) {
    return (
      <section className="space-y-5">
        <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
        <div className="h-[720px] animate-pulse rounded-2xl bg-slate-100" />
      </section>
    );
  }

  if (invoiceState.detailError && !invoice) {
    return (
      <section className="space-y-5">
        <PageHeader
          title="Invoice Not Available"
          description={invoiceState.detailError}
          actions={
            <AppButton
              variant="secondary"
              className="h-10"
              onClick={() => navigate("/sales/invoices")}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </AppButton>
          }
        />
      </section>
    );
  }

  return (
    <section className="min-w-0 space-y-5">
      <PageHeader
        title={invoice?.invoiceNumber ?? `Invoice #${id}`}
        description="Preview, print, download, confirm, cancel, and record payments."
        actions={
          <div className="no-print flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
            <AppButton
              variant="secondary"
              className="h-10"
              onClick={() => navigate("/sales/invoices")}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </AppButton>
            <AppButton
              variant="secondary"
              className="h-10"
              disabled={invoiceState.detailLoading}
              onClick={loadInvoice}
            >
              <RefreshCw
                className={`h-4 w-4 ${invoiceState.detailLoading ? "animate-spin" : ""}`}
              />
              Refresh
            </AppButton>
          </div>
        }
      />

      {invoice && (
        <div className="no-print grid gap-4 xl:grid-cols-[1fr_auto]">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Customer
                </p>
                <p className="mt-1 truncate text-sm font-semibold text-slate-900">
                  {invoice.customerName ?? "Customer"}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Total
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {formatCurrency(invoice.grandTotal)}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Balance
                </p>
                <p className="mt-1 text-sm font-semibold text-red-600">
                  {formatCurrency(invoice.dueAmount)}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Status
                </p>
                <div className="mt-1">
                  <InvoiceStatusPill
                    meta={getInvoiceStatusMeta(invoice.status)}
                  />
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Payment
                </p>
                <div className="mt-1">
                  <InvoiceStatusPill
                    meta={getPaymentStatusMeta(invoice.paymentStatus)}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row xl:items-center">
            <AppSelect
              value={templateId}
              onChange={setTemplateId}
              options={invoiceTemplates.map((entry) => ({
                value: entry.id,
                label: entry.name,
              }))}
              className="min-w-44"
              aria-label="Invoice template"
            />
            {capabilities.canUpdate && (
              <AppButton
                variant="secondary"
                className="h-10 rounded-lg px-3"
                disabled={!isInvoiceDraft(invoice)}
                onClick={openEdit}
              >
                <Pencil className="h-4 w-4" />
                Edit
              </AppButton>
            )}
            {capabilities.canConfirm && (
              <AppButton
                variant="secondary"
                className="h-10 rounded-lg px-3"
                disabled={!isInvoiceDraft(invoice)}
                onClick={() => openConfirmation("confirm")}
              >
                <CheckCircle2 className="h-4 w-4" />
                Confirm
              </AppButton>
            )}
            {capabilities.canCancel && (
              <AppButton
                variant="secondary"
                className="h-10 rounded-lg px-3"
                disabled={!isInvoiceConfirmed(invoice)}
                onClick={() => openConfirmation("cancel")}
              >
                <Ban className="h-4 w-4" />
                Cancel
              </AppButton>
            )}
            {capabilities.canPayment && (
              <AppButton
                className="h-10 rounded-lg px-3"
                disabled={isInvoiceCancelled(invoice)}
                onClick={openPayment}
              >
                <CreditCard className="h-4 w-4" />
                Record Payment
              </AppButton>
            )}
            {capabilities.canExport && (
              <>
                <AppButton
                  variant="secondary"
                  className="h-10 rounded-lg px-3"
                  onClick={printInvoice}
                >
                  <Printer className="h-4 w-4" />
                  Print
                </AppButton>
                <AppButton
                  variant="secondary"
                  className="h-10 rounded-lg px-3"
                  disabled={isPdfLoading}
                  onClick={downloadPdf}
                >
                  <Download className="h-4 w-4" />
                  PDF
                </AppButton>
              </>
            )}
          </div>
        </div>
      )}

      {templateInvoice && (
        <div className="invoice-print-area overflow-x-auto rounded-xl border border-slate-200 bg-slate-100 p-4 shadow-sm">
          <TemplateComponent invoice={templateInvoice} />
        </div>
      )}

      <div className="no-print grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <PaymentHistory
          error={invoiceState.paymentsError}
          isLoading={invoiceState.paymentsLoading}
          payments={invoiceState.payments}
        />
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">
            Balance Summary
          </h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Invoice Date</dt>
              <dd className="font-semibold text-slate-900">
                {formatDate(invoice?.invoiceDate)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Due Date</dt>
              <dd className="font-semibold text-slate-900">
                {formatDate(invoice?.dueDate)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Paid</dt>
              <dd className="font-semibold text-emerald-700">
                {formatCurrency(invoice?.paidAmount)}
              </dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-slate-200 pt-3">
              <dt className="font-semibold text-slate-900">Balance Due</dt>
              <dd className="text-lg font-bold text-red-600">
                {formatCurrency(invoice?.dueAmount)}
              </dd>
            </div>
          </dl>
        </section>
      </div>

      <PaymentModal
        balanceAmount={Number(invoice?.dueAmount || 0)}
        isOpen={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        onSubmit={submitPayment}
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

export default InvoiceDetailPage;
