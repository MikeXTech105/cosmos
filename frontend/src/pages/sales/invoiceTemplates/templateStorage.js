import {
  DEFAULT_INVOICE_TEMPLATE_ID,
  invoiceTemplates,
} from "./templateRegistry";

export const INVOICE_TEMPLATE_STORAGE_KEY = "cosmos.invoiceTemplate";

export const getStoredInvoiceTemplate = () => {
  if (typeof window === "undefined") {
    return DEFAULT_INVOICE_TEMPLATE_ID;
  }

  const storedValue = window.localStorage.getItem(
    INVOICE_TEMPLATE_STORAGE_KEY,
  );
  const exists = invoiceTemplates.some((template) => {
    return template.id === storedValue;
  });

  return exists ? storedValue : DEFAULT_INVOICE_TEMPLATE_ID;
};

export const setStoredInvoiceTemplate = (templateId) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(INVOICE_TEMPLATE_STORAGE_KEY, templateId);
};
