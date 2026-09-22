import { FileText, MonitorCog, Package } from "lucide-react";

import AppearanceSection from "./sections/AppearanceSection";
import InvoiceTemplateSection from "./sections/InvoiceTemplateSection";
import ItemSettingsSection from "./sections/ItemSettingsSection";

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
    Component: ItemSettingsSection,
    description: "Inventory and manufacturing options.",
    icon: Package,
    id: "item-settings",
    label: "Item settings",
  },
];

export default settingsNav;
