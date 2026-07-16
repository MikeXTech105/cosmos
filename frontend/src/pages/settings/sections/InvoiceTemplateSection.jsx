import { Check, FileText } from "lucide-react";
import { useState } from "react";

import { invoiceTemplates } from "../../sales/invoiceTemplates/templateRegistry";
import {
  getStoredInvoiceTemplate,
  setStoredInvoiceTemplate,
} from "../../sales/invoiceTemplates/templateStorage";
import InvoiceTemplateOption from "../components/InvoiceTemplateOption";
import SettingsCard from "../components/SettingsCard";

const InvoiceTemplateSection = () => {
  const [invoiceTemplateId, setInvoiceTemplateId] = useState(
    getStoredInvoiceTemplate,
  );
  const selectedTemplate = invoiceTemplates.find((template) => {
    return template.id === invoiceTemplateId;
  });

  const selectInvoiceTemplate = (templateId) => {
    setInvoiceTemplateId(templateId);
    setStoredInvoiceTemplate(templateId);
  };

  return (
    <SettingsCard
      icon={FileText}
      title="Invoice template"
      description="Sets the default template for sale invoice preview and PDF downloads."
      action={
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-brand-light px-3 py-1.5 text-xs font-semibold text-brand ring-1 ring-inset ring-brand/10">
          <Check className="h-3.5 w-3.5" />
          {selectedTemplate?.name ?? "Classic"}
        </span>
      }
      bodyAriaLabel="Default invoice template"
      bodyClassName="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-5"
      bodyRole="radiogroup"
    >
      {invoiceTemplates.map((template) => (
        <InvoiceTemplateOption
          key={template.id}
          template={template}
          isSelected={invoiceTemplateId === template.id}
          onSelect={selectInvoiceTemplate}
        />
      ))}
    </SettingsCard>
  );
};

export default InvoiceTemplateSection;
