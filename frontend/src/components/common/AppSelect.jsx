import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, Plus } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { twMerge } from "tailwind-merge";

const normalizeOptions = (options) => {
  return options.map((option) => {
    if (
      typeof option === "string" ||
      typeof option === "number"
    ) {
      return {
        label: String(option),
        value: option,
      };
    }

    return option;
  });
};

const AppSelect = ({
  "aria-label": ariaLabel,
  className = "",
  creatable = false,
  createLabel = "Create new",
  disabled = false,
  emptyMessage = "No options available",
  error,
  id,
  label,
  name,
  onBlur,
  onChange,
  onCreateClick,
  options = [],
  placeholder = "Select an option",
  required = false,
  value,
}) => {
  const generatedId = useId();
  const selectId = id ?? `app-select-${generatedId}`;
  const listboxId = `${selectId}-listbox`;
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const normalizedOptions = useMemo(
    () => normalizeOptions(options),
    [options],
  );
  const selectedOption = normalizedOptions.find((option) => {
    return String(option.value) === String(value);
  });

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleMouseDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setIsOpen(false);
        onBlur?.();
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
        onBlur?.();
      }
    };

    document.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onBlur]);

  const handleSelect = (optionValue) => {
    onChange?.(optionValue);
    setIsOpen(false);
    triggerRef.current?.focus();
    onBlur?.();
  };

  const handleCreateClick = () => {
    setIsOpen(false);
    onCreateClick?.();
    onBlur?.();
  };

  return (
    <div
      ref={rootRef}
      className={twMerge(
        "relative min-w-0",
        isOpen ? "z-30" : "",
        className,
      )}
    >
      {label && (
        <label
          id={`${selectId}-label`}
          htmlFor={selectId}
          className="mb-1.5 block text-xs font-semibold text-slate-700"
        >
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </label>
      )}

      <button
        ref={triggerRef}
        id={selectId}
        name={name}
        type="button"
        disabled={disabled}
        aria-controls={listboxId}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        aria-labelledby={label ? `${selectId}-label` : undefined}
        onClick={() => setIsOpen((current) => !current)}
        className={[
          "flex h-10 w-full items-center justify-between gap-3 rounded-lg border bg-white px-3 text-left text-sm text-slate-700 outline-none transition-all",
          isOpen
            ? "border-brand/40 ring-2 ring-brand/15"
            : error
              ? "border-red-400"
              : "border-slate-200 hover:border-slate-300",
          disabled
            ? "cursor-not-allowed bg-slate-50 text-slate-400 opacity-60"
            : "",
        ].join(" ")}
      >
        <span
          className={[
            "min-w-0 flex-1 truncate",
            selectedOption ? "" : "text-slate-400",
          ].join(" ")}
        >
          {selectedOption?.label ?? placeholder}
        </span>
        <ChevronDown
          className={[
            "h-4 w-4 shrink-0 text-slate-400 transition-transform",
            isOpen ? "rotate-180" : "",
          ].join(" ")}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            id={listboxId}
            role="listbox"
            aria-labelledby={label ? `${selectId}-label` : undefined}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
            className="absolute z-20 mt-1.5 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
          >
            <div className="max-h-60 overflow-y-auto p-1.5">
              {normalizedOptions.length === 0 ? (
                <p className="px-2.5 py-2 text-sm leading-5 text-slate-500">
                  {emptyMessage}
                </p>
              ) : (
                normalizedOptions.map((option) => {
                  const isSelected = String(option.value) === String(value);

                  return (
                    <button
                      key={String(option.value)}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handleSelect(option.value)}
                      className={[
                        "flex h-9 w-full cursor-pointer items-center justify-between gap-3 rounded-lg px-2.5 text-left text-sm transition-colors",
                        isSelected
                          ? "bg-brand-light text-slate-900"
                          : "text-slate-600 hover:bg-slate-50",
                      ].join(" ")}
                    >
                      <span className="min-w-0 flex-1 truncate">
                        {option.label}
                      </span>
                      {isSelected && (
                        <Check className="h-4 w-4 shrink-0 text-brand" />
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {creatable && onCreateClick && (
              <button
                type="button"
                className="flex h-10 w-full items-center gap-2 border-t border-slate-100 bg-white px-3 text-left text-sm font-semibold text-brand transition-colors hover:bg-brand-light"
                onClick={handleCreateClick}
              >
                <Plus className="h-4 w-4 shrink-0" />
                <span className="min-w-0 flex-1 truncate">{createLabel}</span>
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <p className="mt-1.5 text-xs font-medium text-red-600">{error}</p>
      )}
    </div>
  );
};

export default AppSelect;
