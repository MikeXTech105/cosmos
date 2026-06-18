import ClassicTemplate from "./ClassicTemplate";
import CompactTemplate from "./CompactTemplate";
import CorporateTemplate from "./CorporateTemplate";
import MinimalTemplate from "./MinimalTemplate";
import ModernTemplate from "./ModernTemplate";

export const INVOICE_TEMPLATE_IDS = {
  CLASSIC: "classic",
  MODERN: "modern",
  MINIMAL: "minimal",
  CORPORATE: "corporate",
  COMPACT: "compact",
};

export const DEFAULT_INVOICE_TEMPLATE_ID = INVOICE_TEMPLATE_IDS.CLASSIC;

export const invoiceTemplates = [
  {
    id: INVOICE_TEMPLATE_IDS.CLASSIC,
    name: "Classic",
    description: "Formal bordered GST invoice layout.",
    Component: ClassicTemplate,
    thumbnailClass: "border-slate-900 bg-white",
  },
  {
    id: INVOICE_TEMPLATE_IDS.MODERN,
    name: "Modern",
    description: "Clean accent header with roomy totals.",
    Component: ModernTemplate,
    thumbnailClass: "border-brand bg-brand-light",
  },
  {
    id: INVOICE_TEMPLATE_IDS.MINIMAL,
    name: "Minimal",
    description: "Monochrome thin-rule invoice.",
    Component: MinimalTemplate,
    thumbnailClass: "border-slate-300 bg-white",
  },
  {
    id: INVOICE_TEMPLATE_IDS.CORPORATE,
    name: "Corporate",
    description: "Company panel with bank and terms block.",
    Component: CorporateTemplate,
    thumbnailClass: "border-slate-950 bg-slate-100",
  },
  {
    id: INVOICE_TEMPLATE_IDS.COMPACT,
    name: "Compact",
    description: "Dense single-page style for longer invoices.",
    Component: CompactTemplate,
    thumbnailClass: "border-slate-400 bg-white",
  },
];

export const getInvoiceTemplate = (templateId) => {
  return (
    invoiceTemplates.find((template) => template.id === templateId) ??
    invoiceTemplates[0]
  );
};
