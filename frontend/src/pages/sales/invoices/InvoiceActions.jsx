import {
  Ban,
  CheckCircle2,
  Download,
  Eye,
  Pencil,
} from "lucide-react";

import AppTooltip from "../../../components/common/AppTooltip";
import {
  isInvoiceCancelled,
  isInvoiceConfirmed,
  isInvoiceDraft,
} from "./invoiceHelpers";

const ActionButton = ({
  disabled = false,
  icon: Icon,
  label,
  onClick,
  tone = "default",
}) => {
  const toneClass =
    tone === "danger"
      ? "hover:bg-red-50 hover:text-red-600"
      : "hover:bg-slate-100 hover:text-brand";

  return (
    <AppTooltip label={label}>
      <button
        type="button"
        aria-label={label}
        disabled={disabled}
        onClick={(event) => {
          event.stopPropagation();
          onClick();
        }}
        className={[
          "inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors",
          toneClass,
          disabled ? "cursor-not-allowed opacity-40" : "",
        ].join(" ")}
      >
        <Icon className="h-4 w-4" />
      </button>
    </AppTooltip>
  );
};

const InvoiceActions = ({
  canCancel = false,
  canConfirm = false,
  canExport = false,
  canUpdate = false,
  canView = false,
  invoice,
  onCancel,
  onConfirm,
  onDownloadPdf,
  onEdit,
  onView,
}) => {
  const mayEditStatus = isInvoiceDraft(invoice);
  const mayConfirmStatus = isInvoiceDraft(invoice);
  const mayCancelStatus = isInvoiceConfirmed(invoice);

  return (
    <div className="flex items-center justify-end gap-0.5">
      {canView && (
        <ActionButton
          icon={Eye}
          label="View Invoice"
          onClick={() => onView(invoice)}
        />
      )}
      {canUpdate && (
        <ActionButton
          icon={Pencil}
          label="Edit Invoice"
          disabled={!mayEditStatus}
          onClick={() => onEdit(invoice)}
        />
      )}
      {canConfirm && (
        <ActionButton
          icon={CheckCircle2}
          label="Confirm Invoice"
          disabled={!mayConfirmStatus}
          onClick={() => onConfirm(invoice)}
        />
      )}
      {canCancel && (
        <ActionButton
          icon={Ban}
          label="Cancel Invoice"
          tone="danger"
          disabled={!mayCancelStatus || isInvoiceCancelled(invoice)}
          onClick={() => onCancel(invoice)}
        />
      )}
      {canExport && (
        <ActionButton
          icon={Download}
          label="Download PDF"
          onClick={() => onDownloadPdf(invoice)}
        />
      )}
    </div>
  );
};

export default InvoiceActions;
