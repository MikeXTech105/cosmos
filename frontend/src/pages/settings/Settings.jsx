import { useState } from "react";

import PageHeader from "../../components/common/PageHeader";
import settingsNav from "./settingsNav";

const SettingsNav = ({ activeSectionId, onSelect }) => {
  return (
    <nav
      aria-label="Settings sections"
      className="w-full shrink-0 border-b border-slate-100 pb-4 lg:w-64 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-4"
    >
      <p className="mb-2 hidden px-2 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500 lg:block">
        Settings menu
      </p>
      <div className="-mx-1 overflow-x-auto px-1 pb-1 lg:mx-0 lg:overflow-visible lg:px-0 lg:pb-0">
        <div className="flex min-w-max gap-2 lg:min-w-0 lg:flex-col">
          {settingsNav.map((section) => {
            const Icon = section.icon;
            const isActive = section.id === activeSectionId;

            return (
              <button
                key={section.id}
                type="button"
                aria-current={isActive ? "page" : undefined}
                className={[
                  "group flex min-w-0 items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/25 lg:w-full",
                  isActive
                    ? "bg-brand-light text-brand shadow-sm ring-1 ring-inset ring-brand/15"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                ].join(" ")}
                onClick={() => onSelect(section.id)}
              >
                <span
                  className={[
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors",
                    isActive
                      ? "bg-white text-brand shadow-sm"
                      : "bg-slate-100 text-slate-500 group-hover:bg-white group-hover:text-slate-700",
                  ].join(" ")}
                >
                  <Icon aria-hidden="true" className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">
                    {section.label}
                  </span>
                  <span
                    className={[
                      "mt-0.5 hidden truncate text-xs lg:block",
                      isActive ? "text-brand" : "text-slate-500",
                    ].join(" ")}
                  >
                    {section.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

const Settings = () => {
  const [activeSectionId, setActiveSectionId] = useState(settingsNav[0].id);
  const activeSection =
    settingsNav.find((section) => section.id === activeSectionId) ?? settingsNav[0];
  const ActiveSection = activeSection.Component;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Settings"
        description="Manage client-side preferences for your COSMOS ERP experience."
      />

      <div className="flex flex-col gap-5 rounded-2xl border border-border bg-surface p-3 shadow-sm sm:p-4 lg:flex-row">
        <SettingsNav
          activeSectionId={activeSection.id}
          onSelect={setActiveSectionId}
        />

        <section
          aria-labelledby="settings-section-title"
          className="min-w-0 flex-1"
        >
          <header className="mb-4 px-1">
            <h2
              id="settings-section-title"
              className="text-lg font-semibold text-slate-900"
            >
              {activeSection.label}
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              {activeSection.description}
            </p>
          </header>

          <ActiveSection />
        </section>
      </div>
    </div>
  );
};

export default Settings;
