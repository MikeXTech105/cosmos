import {
  Check,
  FileText,
  MonitorCog,
  Moon,
  Palette,
  Sparkles,
  Sun,
} from "lucide-react";
import { useState } from "react";

import PageHeader from "../../components/common/PageHeader";
import { APP_THEMES } from "../../config/sidebarThemes";
import useAuthTheme from "../../hooks/useAuthTheme";
import useSidebarTheme from "../../hooks/useSidebarTheme";
import { invoiceTemplates } from "../sales/invoiceTemplates/templateRegistry";
import {
  getStoredInvoiceTemplate,
  setStoredInvoiceTemplate,
} from "../sales/invoiceTemplates/templateStorage";
import { AUTH_THEME } from "../../utils/authTheme";

const AUTH_THEME_OPTIONS = [
  {
    icon: Sun,
    label: "Light",
    value: AUTH_THEME.LIGHT,
  },
  {
    icon: Moon,
    label: "Dark",
    value: AUTH_THEME.DARK,
  },
];

const CardHeader = ({ badge, description, icon: Icon, title }) => {
  return (
    <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-brand-dark text-white shadow-sm">
          <Icon className="h-5 w-5" />
        </div>

        <div>
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
      </div>

      {badge}
    </div>
  );
};

const LoginPreview = ({ mode }) => {
  const isDark = mode === AUTH_THEME.DARK;

  return (
    <div
      className={[
        "grid h-36 overflow-hidden rounded-xl border p-2",
        isDark
          ? "border-slate-800 bg-slate-950"
          : "border-slate-200 bg-slate-100",
      ].join(" ")}
    >
      <div className="grid grid-cols-[0.85fr_1fr] overflow-hidden rounded-lg shadow-sm">
        <div
          className={[
            "flex flex-col justify-between p-3",
            isDark ? "bg-slate-900" : "bg-brand",
          ].join(" ")}
        >
          <div>
            <div className="h-7 w-7 rounded-lg bg-white/95" />
            <div className="mt-4 h-2 w-16 rounded-full bg-white/80" />
            <div className="mt-2 h-2 w-11 rounded-full bg-white/45" />
          </div>
          <div className="h-8 rounded-lg bg-white/10" />
        </div>

        <div
          className={[
            "flex flex-col justify-center gap-2 border-l p-3",
            isDark
              ? "border-slate-800 bg-slate-900"
              : "border-slate-200 bg-white",
          ].join(" ")}
        >
          <div
            className={[
              "h-2 w-20 rounded-full",
              isDark ? "bg-slate-600" : "bg-slate-300",
            ].join(" ")}
          />
          <div
            className={[
              "h-7 rounded-lg",
              isDark ? "bg-slate-800" : "bg-slate-100",
            ].join(" ")}
          />
          <div
            className={[
              "h-7 rounded-lg",
              isDark ? "bg-slate-800" : "bg-slate-100",
            ].join(" ")}
          />
          <div className="mt-1 h-7 rounded-lg bg-brand" />
        </div>
      </div>
    </div>
  );
};

const LoginThemeOption = ({ isSelected, onSelect, option }) => {
  const Icon = option.icon;

  return (
    <button
      type="button"
      role="radio"
      aria-checked={isSelected}
      className={[
        "overflow-hidden rounded-2xl border-2 bg-white text-left shadow-sm transition-all",
        isSelected
          ? "border-brand shadow-md shadow-brand/10"
          : "border-slate-200 hover:border-slate-300 hover:shadow-md",
      ].join(" ")}
      onClick={() => onSelect(option.value)}
    >
      <div className="p-3">
        <LoginPreview mode={option.value} />
      </div>

      <div
        className={[
          "flex items-center justify-between gap-3 border-t px-4 py-3",
          isSelected
            ? "border-brand/10 bg-brand-light text-brand"
            : "border-slate-100 bg-slate-50 text-slate-700",
        ].join(" ")}
      >
        <span className="flex items-center gap-2 text-sm font-semibold">
          <Icon className="h-4 w-4" />
          {option.label}
        </span>

        {isSelected && (
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand text-white">
            <Check className="h-3.5 w-3.5" />
          </span>
        )}
      </div>
    </button>
  );
};

const ThemeSwatch = ({ isSelected, onSelect, theme }) => {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={isSelected}
      className={[
        "group relative overflow-hidden rounded-xl border-2 bg-white text-left transition-all",
        isSelected
          ? `${theme.preview.border} ${theme.preview.shadow} shadow-lg`
          : "border-slate-200 hover:border-slate-300 hover:shadow-sm",
      ].join(" ")}
      onClick={() => onSelect(theme.id)}
    >
      {isSelected && (
        <span
          className={[
            "absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full text-white shadow-sm",
            theme.preview.accent,
          ].join(" ")}
        >
          <Check className="h-3.5 w-3.5" />
        </span>
      )}

      <div className="p-2.5">
        <div className="grid h-28 grid-cols-[34px_1fr] overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div
            className={[
              "flex flex-col gap-2 p-2",
              theme.preview.root,
            ].join(" ")}
          >
            <span className={["h-4 w-4 rounded-md", theme.preview.accent].join(" ")} />
            <span className={["h-2.5 rounded-full", theme.preview.sidebarText].join(" ")} />
            <span className={["h-2.5 w-4 rounded-full", theme.preview.sidebarText].join(" ")} />
          </div>

          <div className="flex flex-col justify-between bg-slate-50 p-3">
            <div className="space-y-2">
              <span className="block h-2.5 w-20 rounded-full bg-slate-300" />
              <span className={["block h-2 w-28 rounded-full", theme.preview.line].join(" ")} />
              <span className={["block h-2 w-20 rounded-full", theme.preview.muted].join(" ")} />
            </div>

            <div className="flex items-end justify-between gap-3">
              <span className={["h-7 w-16 rounded-lg", theme.preview.accentLight].join(" ")} />
              <span className={["h-7 w-12 rounded-lg", theme.preview.button].join(" ")} />
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-3.5 py-3">
        <span className="flex min-w-0 items-center gap-2">
          <span
            className={[
              "h-3 w-3 shrink-0 rounded-full",
              theme.preview.accent,
            ].join(" ")}
          />
          <span className="truncate text-sm font-semibold text-slate-900">
            {theme.name}
          </span>
        </span>

        <span
          className={[
            "h-1.5 w-8 shrink-0 rounded-full opacity-80 transition-opacity group-hover:opacity-100",
            theme.preview.accent,
          ].join(" ")}
        />
      </div>
    </button>
  );
};

const InvoiceTemplateOption = ({ isSelected, onSelect, template }) => {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={isSelected}
      className={[
        "overflow-hidden rounded-2xl border-2 bg-white text-left shadow-sm transition-all",
        isSelected
          ? "border-brand shadow-md shadow-brand/10"
          : "border-slate-200 hover:border-slate-300 hover:shadow-md",
      ].join(" ")}
      onClick={() => onSelect(template.id)}
    >
      <div className="p-3">
        <div
          className={[
            "h-36 rounded-xl border-2 p-3",
            template.thumbnailClass,
          ].join(" ")}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <span className="block h-2 w-16 rounded-full bg-slate-900" />
              <span className="block h-2 w-24 rounded-full bg-slate-300" />
              <span className="block h-2 w-20 rounded-full bg-slate-200" />
            </div>
            <span className="block h-8 w-14 rounded-lg bg-brand" />
          </div>
          <div className="mt-5 space-y-2">
            <span className="block h-2 rounded-full bg-slate-200" />
            <span className="block h-2 rounded-full bg-slate-200" />
            <span className="block h-2 w-2/3 rounded-full bg-slate-200" />
          </div>
          <div className="mt-5 ml-auto space-y-2">
            <span className="block h-2 w-24 rounded-full bg-slate-300" />
            <span className="block h-3 w-28 rounded-full bg-slate-900" />
          </div>
        </div>
      </div>

      <div
        className={[
          "flex items-start justify-between gap-3 border-t px-4 py-3",
          isSelected
            ? "border-brand/10 bg-brand-light"
            : "border-slate-100 bg-slate-50",
        ].join(" ")}
      >
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-slate-900">
            {template.name}
          </span>
          <span className="mt-1 block text-xs leading-5 text-slate-500">
            {template.description}
          </span>
        </span>
        {isSelected && (
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-white">
            <Check className="h-3.5 w-3.5" />
          </span>
        )}
      </div>
    </button>
  );
};

const Settings = () => {
  const { authTheme, setAuthTheme } = useAuthTheme();
  const { setSidebarTheme, sidebarTheme, sidebarThemeId } = useSidebarTheme();
  const [invoiceTemplateId, setInvoiceTemplateId] = useState(
    getStoredInvoiceTemplate,
  );

  const selectInvoiceTemplate = (templateId) => {
    setInvoiceTemplateId(templateId);
    setStoredInvoiceTemplate(templateId);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Settings"
        description="Manage client-side preferences for your COSMOS ERP experience."
      />

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <CardHeader
          icon={MonitorCog}
          title="Login Screen"
          description="Controls only the public authentication screens."
        />

        <div
          className="grid gap-4 p-5 sm:grid-cols-2"
          role="radiogroup"
          aria-label="Login screen theme"
        >
          {AUTH_THEME_OPTIONS.map((option) => (
            <LoginThemeOption
              key={option.value}
              option={option}
              isSelected={authTheme === option.value}
              onSelect={setAuthTheme}
            />
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <CardHeader
          icon={Palette}
          title="Accent Theme"
          description="Applies live to the sidebar and all app accent surfaces."
          badge={
            <span
              className={[
                "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold",
                sidebarTheme.preview.accentLight,
                sidebarTheme.accent.textClassName,
              ].join(" ")}
            >
              <Sparkles className="h-3.5 w-3.5" />
              {sidebarTheme.name}
            </span>
          }
        />

        <div
          className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-4"
          role="radiogroup"
          aria-label="Accent theme"
        >
          {APP_THEMES.map((theme) => (
            <ThemeSwatch
              key={theme.id}
              theme={theme}
              isSelected={sidebarThemeId === theme.id}
              onSelect={setSidebarTheme}
            />
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <CardHeader
          icon={FileText}
          title="Invoice Template"
          description="Sets the default template for sale invoice preview and PDF downloads."
          badge={
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-light px-3 py-1.5 text-xs font-semibold text-brand">
              <Check className="h-3.5 w-3.5" />
              {invoiceTemplates.find((template) => {
                return template.id === invoiceTemplateId;
              })?.name ?? "Classic"}
            </span>
          }
        />

        <div
          className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-5"
          role="radiogroup"
          aria-label="Default invoice template"
        >
          {invoiceTemplates.map((template) => (
            <InvoiceTemplateOption
              key={template.id}
              template={template}
              isSelected={invoiceTemplateId === template.id}
              onSelect={selectInvoiceTemplate}
            />
          ))}
        </div>
      </section>
    </div>
  );
};

export default Settings;
