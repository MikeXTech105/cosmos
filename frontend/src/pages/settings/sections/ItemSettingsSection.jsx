import { CheckCircle2, Factory, Package, XCircle } from "lucide-react";

import useManufacturingPreference from "../../../hooks/useManufacturingPreference";
import SettingsCard from "../components/SettingsCard";

const ItemSettingsSection = () => {
  const { manufacturingEnabled, setManufacturingEnabled } = useManufacturingPreference();
  const StatusIcon = manufacturingEnabled ? CheckCircle2 : XCircle;

  return (
    <SettingsCard
      icon={Package}
      title="Item display — this browser"
      description="Show or hide Item manufacturing screens on this browser. Company production setup, permissions and stock posting are managed separately by your administrator."
      action={
        <span className={[
          "inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset",
          manufacturingEnabled
            ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
            : "bg-slate-100 text-slate-600 ring-slate-200",
        ].join(" ")}>
          <StatusIcon className="h-3.5 w-3.5" />
          Manufacturing screens {manufacturingEnabled ? "shown" : "hidden"}
        </span>
      }
    >
      <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
        <span className="flex min-w-0 items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-brand shadow-sm ring-1 ring-inset ring-slate-200">
            <Factory className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-slate-900">Show Item manufacturing screens</span>
            <span className="mt-0.5 block text-xs leading-5 text-slate-500">
              Shows Manufacturing inside product items for BOM setup and production entries.
            </span>
          </span>
        </span>
        <input
          type="checkbox"
          className="h-4 w-4 shrink-0 accent-brand"
          checked={manufacturingEnabled}
          onChange={(event) => setManufacturingEnabled(event.target.checked)}
        />
      </label>
    </SettingsCard>
  );
};

export default ItemSettingsSection;
