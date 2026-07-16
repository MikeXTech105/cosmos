import { Check } from "lucide-react";

const InvoiceTemplateOption = ({ isSelected, onSelect, template }) => {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={isSelected}
      className={[
        "overflow-hidden rounded-2xl border-2 bg-white text-left shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/25 focus-visible:ring-offset-2",
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

export default InvoiceTemplateOption;
