import { Rows3 } from "lucide-react";
import { useState } from "react";

import PageHeader from "../../components/common/PageHeader";
import AppearanceSection from "../settings/sections/AppearanceSection";
import SettingsCard from "../settings/components/SettingsCard";
import {
  getStoredPreferences,
  PAGE_SIZE_OPTIONS,
  updateStoredPreferences,
} from "../../utils/preferencesStorage";

const PreferencesPage = () => {
  const [defaultPageSize, setDefaultPageSize] = useState(
    () => getStoredPreferences().defaultPageSize,
  );

  const handlePageSizeChange = (event) => {
    const preferences = updateStoredPreferences({
      defaultPageSize: event.target.value,
    });

    setDefaultPageSize(preferences.defaultPageSize);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="My display preferences — this browser"
        description="Appearance and table defaults are saved in this browser. They do not change company setup or follow your account to another device."
      />

      <AppearanceSection />

      <SettingsCard
        icon={Rows3}
        title="Table display"
        description="Choose the default number of rows for tables that do not require a domain-specific page size."
        action={
          <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
            <span>Rows per page</span>
            <select
              value={defaultPageSize}
              onChange={handlePageSizeChange}
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              aria-label="Default rows per page"
            >
              {PAGE_SIZE_OPTIONS.map((pageSize) => (
                <option key={pageSize} value={pageSize}>
                  {pageSize}
                </option>
              ))}
            </select>
          </label>
        }
      />
    </div>
  );
};

export default PreferencesPage;
