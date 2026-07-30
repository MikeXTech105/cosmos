import { FileText, ListChecks, MonitorCog } from "lucide-react";

import AppearanceSection from "./sections/AppearanceSection";
import GettingStartedSection from "./sections/GettingStartedSection";
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
  {
    Component: GettingStartedSection,
    description: "First-run checklist visibility.",
    icon: ListChecks,
    id: "getting-started",
    label: "Getting started",
  },
];

export default settingsNav;
