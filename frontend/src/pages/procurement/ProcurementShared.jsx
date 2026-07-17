import {
  AlertCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Info,
  PackageSearch,
  RefreshCw,
  Search,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import AppButton from "../../components/common/AppButton";
import AppInput from "../../components/common/AppInput";
import AppSelect from "../../components/common/AppSelect";
import {
  ProcurementItemClassification,
  PROCUREMENT_ITEM_CLASSIFICATION_LABELS,
} from "../../constants/procurementEnums";
import { itemService } from "../../services/inventory/itemService";
import {
  formatProcurementInteger,
  getChannelLabel,
  getCollection,
  getInclusiveDayCount,
  getItemLabel,
  getProcurementError,
  getRecordId,
  INVENTORY_BASIS_MESSAGE,
  PROCUREMENT_PAGE_SIZE_OPTIONS,
} from "./procurementHelpers";
import useLatestRequest from "./useLatestRequest";

export const ProcurementSectionCard = ({
  actions,
  children,
  className = "",
  description,
  title,
}) => (
  <section
    className={`min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}
  >
    {(title || description || actions) && (
      <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          {title && (
            <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          )}
          {description && (
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    )}
    {children}
  </section>
);

export const ProcurementStatTile = ({
  active = false,
  icon: Icon,
  label,
  onClick,
  tone = "brand",
  value,
}) => {
  const tones = {
    amber: "bg-amber-50 text-amber-700",
    brand: "bg-brand-light text-brand",
    emerald: "bg-emerald-50 text-emerald-700",
    red: "bg-red-50 text-red-700",
    slate: "bg-slate-100 text-slate-600",
  };
  const content = (
    <>
      <div className={`rounded-xl p-2.5 ${tones[tone] ?? tones.brand}`}>
        {Icon && <Icon className="h-5 w-5" />}
      </div>
      <div className="min-w-0 text-left">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="mt-1 text-xl font-semibold text-slate-900">
          {formatProcurementInteger(value, "0")}
        </p>
      </div>
    </>
  );
  const classes = [
    "flex w-full items-center gap-3 rounded-xl border bg-white p-4 shadow-sm transition-all",
    active ? "border-brand ring-2 ring-brand/10" : "border-slate-200",
    onClick ? "hover:border-brand/40 hover:shadow-md" : "",
  ].join(" ");

  return onClick ? (
    <button type="button" className={classes} onClick={onClick}>
      {content}
    </button>
  ) : (
    <div className={classes}>{content}</div>
  );
};

const pillTones = {
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
  blue: "bg-blue-50 text-blue-700 ring-blue-200",
  brand: "bg-brand-light text-brand ring-brand/20",
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  red: "bg-red-50 text-red-700 ring-red-200",
  slate: "bg-slate-50 text-slate-600 ring-slate-200",
  violet: "bg-violet-50 text-violet-700 ring-violet-200",
};

export const ProcurementPill = ({ children, className = "", tone = "slate" }) => (
  <span
    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${pillTones[tone] ?? pillTones.slate} ${className}`}
  >
    {children}
  </span>
);

export const InventoryBasisNote = ({ message = INVENTORY_BASIS_MESSAGE }) => (
  <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
    <Info className="mt-0.5 h-4 w-4 shrink-0" />
    <div>
      <p className="font-semibold">Inventory basis</p>
      <p className="mt-0.5 text-xs leading-5 text-blue-700">{message}</p>
    </div>
  </div>
);

export const ProcurementInlineError = ({ message, title = "Unable to continue" }) => {
  if (!message) {
    return null;
  }

  return (
    <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0">
        <p className="font-semibold">{title}</p>
        <p className="mt-0.5 whitespace-pre-line text-xs leading-5">{message}</p>
      </div>
    </div>
  );
};

export const ProcurementEmptyState = ({
  action,
  description = "There is nothing to show for the current filters.",
  icon: Icon = PackageSearch,
  title = "No records found",
}) => (
  <div className="flex min-h-56 flex-col items-center justify-center px-6 py-10 text-center">
    <div className="rounded-2xl bg-slate-100 p-3 text-slate-400">
      <Icon className="h-6 w-6" />
    </div>
    <h3 className="mt-4 text-sm font-semibold text-slate-800">{title}</h3>
    <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">
      {description}
    </p>
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export const ProcurementLoadingRows = ({ columns = 5, rows = 6 }) => (
  <div className="animate-pulse p-4">
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div
        key={rowIndex}
        className="flex gap-3 border-b border-slate-100 py-4 last:border-0"
      >
        {Array.from({ length: columns }).map((__, columnIndex) => (
          <div
            key={columnIndex}
            className="h-3 min-w-0 flex-1 rounded-full bg-slate-100"
          />
        ))}
      </div>
    ))}
  </div>
);

export const ProcurementErrorState = ({ error, onRetry }) => (
  <div className="flex min-h-56 flex-col items-center justify-center px-6 py-10 text-center">
    <div className="rounded-2xl bg-red-50 p-3 text-red-500">
      <AlertCircle className="h-6 w-6" />
    </div>
    <h3 className="mt-4 text-sm font-semibold text-slate-800">
      We could not load this view
    </h3>
    <p className="mt-1 max-w-md whitespace-pre-line text-xs leading-5 text-slate-500">
      {getProcurementError(error, "Please try again.")}
    </p>
    {onRetry && (
      <AppButton className="mt-4" variant="secondary" onClick={onRetry}>
        <RefreshCw className="h-4 w-4" />
        Retry
      </AppButton>
    )}
  </div>
);

export const ProcurementTabs = ({ active, onChange, tabs }) => (
  <div className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
    {tabs.map((tab) => (
      <button
        key={tab.id}
        type="button"
        onClick={() => onChange(tab.id)}
        className={`flex h-9 shrink-0 items-center gap-2 rounded-lg px-3.5 text-sm font-medium transition-colors ${
          active === tab.id
            ? "bg-brand text-white shadow-sm"
            : "text-slate-600 hover:bg-slate-50"
        }`}
      >
        {tab.icon && <tab.icon className="h-4 w-4" />}
        {tab.label}
        {tab.count !== undefined && (
          <span
            className={`rounded-full px-1.5 py-0.5 text-[10px] ${
              active === tab.id
                ? "bg-white/20 text-white"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            {formatProcurementInteger(tab.count, "0")}
          </span>
        )}
      </button>
    ))}
  </div>
);

export const ProcurementDateRangeFields = ({
  error,
  fromDate,
  max,
  onChange,
  toDate,
}) => {
  const days = getInclusiveDayCount(fromDate, toDate);

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2">
        <AppInput
          id="procurement-from-date"
          label="From date"
          max={toDate || max}
          type="date"
          value={fromDate}
          onChange={(event) => onChange({ fromDate: event.target.value })}
        />
        <AppInput
          id="procurement-to-date"
          label="To date"
          min={fromDate}
          max={max}
          type="date"
          value={toDate}
          onChange={(event) => onChange({ toDate: event.target.value })}
        />
      </div>
      <div className="mt-2 flex items-center justify-between gap-3 text-xs">
        <span className={error ? "text-red-600" : "text-slate-500"}>
          {error || "Both dates are included in the planning range."}
        </span>
        <ProcurementPill tone={error ? "red" : "brand"}>
          {days} {days === 1 ? "day" : "days"}
        </ProcurementPill>
      </div>
    </div>
  );
};

export const ProcurementPagination = ({
  disabled,
  onPageChange,
  onPageSizeChange,
  pageNumber,
  pageSize,
  totalCount,
  totalPages,
}) => (
  <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
    <p className="text-xs text-slate-500">
      {formatProcurementInteger(totalCount, "0")} total records
    </p>
    <div className="flex items-center gap-2">
      <AppSelect
        aria-label="Rows per page"
        className="w-24"
        disabled={disabled}
        options={PROCUREMENT_PAGE_SIZE_OPTIONS.map((value) => ({
          label: `${value} / page`,
          value,
        }))}
        value={pageSize}
        onChange={onPageSizeChange}
      />
      <AppButton
        className="h-10 px-3"
        disabled={disabled || pageNumber <= 1}
        variant="secondary"
        onClick={() => onPageChange(pageNumber - 1)}
      >
        <ChevronLeft className="h-4 w-4" />
      </AppButton>
      <span className="min-w-20 text-center text-xs font-medium text-slate-600">
        {pageNumber} / {Math.max(1, totalPages)}
      </span>
      <AppButton
        className="h-10 px-3"
        disabled={disabled || pageNumber >= totalPages}
        variant="secondary"
        onClick={() => onPageChange(pageNumber + 1)}
      >
        <ChevronRight className="h-4 w-4" />
      </AppButton>
    </div>
  </div>
);

export const ProcurementMessageGroup = ({ messages, severity }) => {
  const meta = {
    blocking: {
      icon: AlertCircle,
      title: "Blocking errors",
      wrapper: "border-red-200 bg-red-50",
      iconClass: "text-red-600",
      text: "text-red-800",
    },
    information: {
      icon: Info,
      title: "Information",
      wrapper: "border-blue-200 bg-blue-50",
      iconClass: "text-blue-600",
      text: "text-blue-800",
    },
    warning: {
      icon: AlertTriangle,
      title: "Warnings",
      wrapper: "border-amber-200 bg-amber-50",
      iconClass: "text-amber-600",
      text: "text-amber-800",
    },
  }[severity];

  if (!meta || messages.length === 0) {
    return null;
  }

  const Icon = meta.icon;

  return (
    <div className={`rounded-xl border p-4 ${meta.wrapper}`}>
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${meta.iconClass}`} />
        <p className={`text-sm font-semibold ${meta.text}`}>
          {meta.title} ({messages.length})
        </p>
      </div>
      <div className="mt-3 space-y-2">
        {messages.map((message, index) => (
          <div
            key={message.id ?? message.code ?? index}
            className="rounded-lg bg-white/70 px-3 py-2"
          >
            <p className={`text-xs font-semibold ${meta.text}`}>
              {message.title ?? message.code ?? meta.title}
            </p>
            <p className={`mt-0.5 text-xs leading-5 ${meta.text}`}>
              {message.message ?? message.description ?? String(message)}
            </p>
            {message.action}
          </div>
        ))}
      </div>
    </div>
  );
};

export const ProcurementSuccessBanner = ({ children, title }) => (
  <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800">
    <CircleCheck className="mt-0.5 h-4 w-4 shrink-0" />
    <div>
      <p className="text-sm font-semibold">{title}</p>
      {children && <div className="mt-1 text-xs leading-5">{children}</div>}
    </div>
  </div>
);

const getClassification = (item) =>
  item?.procurementClassification ?? item?.classification ?? null;

const mergeItems = (...collections) => {
  const map = new Map();

  collections.flat().forEach((item) => {
    const id = getRecordId(item, ["itemId"]);
    if (id !== null) {
      map.set(String(id), item);
    }
  });

  return Array.from(map.values());
};

export const ProcurementItemAutocomplete = ({
  disabled = false,
  error,
  excludeItemId,
  includeLegacy = false,
  label = "Item",
  mode = "any",
  onChange,
  placeholder = "Search by item code or name",
  required = false,
  value,
}) => {
  const rootRef = useRef(null);
  const [query, setQuery] = useState(value ? getItemLabel(value) : "");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [searchError, setSearchError] = useState("");
  const { beginRequest, cancelRequest, isLatestRequest } = useLatestRequest();

  useEffect(() => {
    if (value) {
      const timeout = window.setTimeout(() => {
        setQuery(getItemLabel(value));
      }, 0);

      return () => window.clearTimeout(timeout);
    }

    return undefined;
  }, [value]);

  useEffect(() => {
    const requestId = beginRequest();

    if (!open || disabled) {
      return () => cancelRequest(requestId);
    }

    const timeout = window.setTimeout(async () => {
      setLoading(true);
      setSearchError("");
      try {
        const baseParams = {
          IsActive: true,
          PageNumber: 1,
          PageSize: 100,
          Search: query.trim() || undefined,
        };
        const primaryRequest = itemService.getItems({
          ...baseParams,
          procurementClassification:
            mode === "finished"
              ? ProcurementItemClassification.FinishedProduct
              : undefined,
        });
        const legacyRequest =
          mode === "finished" && includeLegacy
            ? itemService.getItems(baseParams)
            : Promise.resolve({ data: [] });
        const [primary, legacy] = await Promise.all([
          primaryRequest,
          legacyRequest,
        ]);
        let nextItems = mergeItems(
          getCollection(primary.data),
          getCollection(legacy.data).filter(
            (item) => getClassification(item) === null,
          ),
        );

        if (mode === "component") {
          nextItems = nextItems.filter(
            (item) =>
              Number(getClassification(item)) !==
              ProcurementItemClassification.FinishedProduct,
          );
        }
        if (excludeItemId !== undefined && excludeItemId !== null) {
          nextItems = nextItems.filter(
            (item) =>
              String(getRecordId(item, ["itemId"])) !== String(excludeItemId),
          );
        }
        if (isLatestRequest(requestId)) {
          setItems(nextItems);
        }
      } catch (error) {
        if (isLatestRequest(requestId)) {
          setItems([]);
          setSearchError(
            getProcurementError(error, "Unable to search the item master."),
          );
        }
      } finally {
        if (isLatestRequest(requestId)) {
          setLoading(false);
        }
      }
    }, 250);

    return () => {
      window.clearTimeout(timeout);
      cancelRequest(requestId);
    };
  }, [beginRequest, cancelRequest, disabled, excludeItemId, includeLegacy, isLatestRequest, mode, open, query, retryKey]);

  useEffect(() => {
    const handlePointer = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointer);
    return () => document.removeEventListener("mousedown", handlePointer);
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <div className="relative">
        <AppInput
          error={error}
          label={label}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            onChange(null);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
        />
        <Search className="pointer-events-none absolute bottom-3.5 right-3 h-4 w-4 text-slate-400" />
      </div>
      {open && !disabled && (
        <div className="absolute z-40 mt-1.5 max-h-72 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
          {loading ? (
            <p className="px-3 py-3 text-xs text-slate-500">Searching items…</p>
          ) : searchError ? (
            <div className="px-3 py-3 text-xs text-red-600">
              <p>{searchError}</p>
              <button
                type="button"
                className="mt-2 font-semibold text-brand hover:underline"
                onClick={() => setRetryKey((current) => current + 1)}
              >
                Retry search
              </button>
            </div>
          ) : items.length === 0 ? (
            <p className="px-3 py-3 text-xs text-slate-500">
              No matching active items.
            </p>
          ) : (
            items.map((item) => {
              const id = getRecordId(item, ["itemId"]);
              const classification = getClassification(item);
              const isLegacy = classification === null;
              const isActive = item?.isActive !== false;

              return (
                <button
                  key={id}
                  type="button"
                  className="flex w-full items-start justify-between gap-3 rounded-lg px-3 py-2 text-left hover:bg-brand-light"
                  onClick={() => {
                    onChange(item);
                    setQuery(getItemLabel(item));
                    setOpen(false);
                  }}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-slate-800">
                      {getItemLabel(item)}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-slate-500">
                      {PROCUREMENT_ITEM_CLASSIFICATION_LABELS[classification] ??
                        "Legacy / unclassified"}
                      {" · "}
                      {isActive ? "Active" : "Inactive"}
                      {" · "}
                      {item?.unitName ?? item?.unit?.name ?? "Unit not supplied"}
                    </span>
                  </span>
                  {isLegacy && (
                    <ProcurementPill tone="amber">Legacy classification</ProcurementPill>
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export const ProcurementChannelSelect = ({ channels, ...props }) => (
  <AppSelect
    {...props}
    options={channels.map((channel) => ({
      label: getChannelLabel(channel),
      value: getRecordId(channel, ["salesChannelId", "channelId"]),
    }))}
  />
);

export const ProcurementToggle = ({
  checked,
  description,
  disabled,
  label,
  onChange,
}) => (
  <label
    className={`flex items-start justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 ${
      disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
    }`}
  >
    <span>
      <span className="block text-sm font-medium text-slate-800">{label}</span>
      {description && (
        <span className="mt-0.5 block text-xs leading-5 text-slate-500">
          {description}
        </span>
      )}
    </span>
    <input
      type="checkbox"
      className="mt-1 h-4 w-4 rounded border-slate-300 text-brand accent-brand focus:ring-brand"
      checked={checked}
      disabled={disabled}
      onChange={(event) => onChange(event.target.checked)}
    />
  </label>
);
