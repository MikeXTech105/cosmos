import { createRoot } from "react-dom/client";

import { buildTemplateInvoice } from "../invoices/invoiceHelpers";
import { getInvoiceTemplate } from "./templateRegistry";

const waitForPaint = () => {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(resolve);
    });
  });
};

export const exportInvoicePdf = async ({
  customer = null,
  invoice,
  templateId,
}) => {
  const template = getInvoiceTemplate(templateId);
  const TemplateComponent = template.Component;
  const container = document.createElement("div");

  container.style.position = "fixed";
  container.style.left = "-10000px";
  container.style.top = "0";
  container.style.width = "794px";
  container.style.background = "#ffffff";
  document.body.appendChild(container);

  const root = createRoot(container);
  const normalizedInvoice = buildTemplateInvoice(invoice, customer);

  try {
    const dependenciesPromise = Promise.all([
      import("html2canvas"),
      import("jspdf"),
    ]);

    root.render(<TemplateComponent invoice={normalizedInvoice} />);
    await waitForPaint();

    const [html2canvasModule, jsPdfModule] = await dependenciesPromise;
    const html2canvas = html2canvasModule.default ?? html2canvasModule;
    const JsPdf =
      jsPdfModule.jsPDF ?? jsPdfModule.default?.jsPDF ?? jsPdfModule.default;

    if (typeof html2canvas !== "function" || typeof JsPdf !== "function") {
      throw new Error("PDF export dependencies could not be loaded.");
    }

    const canvas = await html2canvas(container, {
      backgroundColor: "#ffffff",
      scale: 2,
      useCORS: true,
    });
    const imageData = canvas.toDataURL("image/png");
    const pdf = new JsPdf("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imageWidth = pageWidth;
    const imageHeight = (canvas.height * imageWidth) / canvas.width;
    let heightLeft = imageHeight;
    let position = 0;

    pdf.addImage(imageData, "PNG", 0, position, imageWidth, imageHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imageHeight;
      pdf.addPage();
      pdf.addImage(imageData, "PNG", 0, position, imageWidth, imageHeight);
      heightLeft -= pageHeight;
    }

    const safeNumber = String(
      normalizedInvoice.invoiceNumber ?? normalizedInvoice.id ?? "Draft",
    ).replace(/[^a-z0-9-]+/gi, "-");

    pdf.save(`Invoice-${safeNumber}.pdf`);
  } finally {
    root.unmount();
    container.remove();
  }
};
