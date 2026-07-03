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
  invoice,
  onCancel,
  onConfirm,
  onDownloadPdf,
  onEdit,
  onView,
}) => {
  const canEdit = isInvoiceDraft(invoice);
  const canConfirm = isInvoiceDraft(invoice);
  const canCancel = isInvoiceConfirmed(invoice);

  return (
    <div className="flex items-center justify-end gap-0.5">
      <ActionButton
        icon={Eye}
        label="View Invoice"
        onClick={() => onView(invoice)}
      />
      <ActionButton
        icon={Pencil}
        label="Edit Invoice"
        disabled={!canEdit}
        onClick={() => onEdit(invoice)}
      />
      <ActionButton
        icon={CheckCircle2}
        label="Confirm Invoice"
        disabled={!canConfirm}
        onClick={() => onConfirm(invoice)}
      />
      <ActionButton
        icon={Ban}
        label="Cancel Invoice"
        tone="danger"
        disabled={!canCancel || isInvoiceCancelled(invoice)}
        onClick={() => onCancel(invoice)}
      />
      <ActionButton
        icon={Download}
        label="Download PDF"
        onClick={() => onDownloadPdf(invoice)}
      />
    </div>
  );
};

export default InvoiceActions;
