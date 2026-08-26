import { FileText, MonitorCog } from "lucide-react";

import AppearanceSection from "./sections/AppearanceSection";
import InvoiceTemplateSection from "./sections/InvoiceTemplateSection";

const settingsNav = [
  {
    Component: AppearanceSection,
    description: "Login and app-wide visual preferences.",
    icon: MonitorCog,
    id: "appearance",
    label: "Appearance",
  },
  {
    Component: InvoiceTemplateSection,
    description: "Default layout for sale invoices.",
    icon: FileText,
    id: "invoice-template",
    label: "Invoice template",
  },
];

export default settingsNav;
