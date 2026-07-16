import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, Plus } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { twMerge } from "tailwind-merge";

const normalizeOptions = (options) => {
  return options.map((option) => {
    if (typeof option === "string" || typeof option === "number") {
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
  const optionRefs = useRef([]);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [highlightedValueKey, setHighlightedValueKey] = useState("");
  const normalizedOptions = useMemo(
    () => normalizeOptions(options),
    [options],
  );
  const createIndex = normalizedOptions.length;
  const canCreate = Boolean(creatable && onCreateClick);
  const navigableIndexes = useMemo(() => {
    const indexes = normalizedOptions.reduce((result, option, index) => {
      if (!option.disabled) {
        result.push(index);
      }

      return result;
    }, []);

    if (canCreate) {
      indexes.push(normalizedOptions.length);
    }

    return indexes;
  }, [canCreate, normalizedOptions]);
  const selectedIndex = normalizedOptions.findIndex((option) => {
    return String(option.value) === String(value);
  });
  const selectedOption = selectedIndex >= 0 ? normalizedOptions[selectedIndex] : null;
  const currentValueKey = String(value ?? "");
  const activeHighlightedIndex =
    highlightedValueKey === currentValueKey &&
    navigableIndexes.includes(highlightedIndex)
      ? highlightedIndex
      : navigableIndexes.includes(selectedIndex)
        ? selectedIndex
        : (navigableIndexes[0] ?? -1);
  const highlightedOptionId =
    isOpen && activeHighlightedIndex >= 0
      ? activeHighlightedIndex === createIndex
        ? `${listboxId}-create`
        : `${listboxId}-option-${activeHighlightedIndex}`
      : undefined;

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleMouseDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
        onBlur?.();
      }
    };

    document.addEventListener("mousedown", handleMouseDown);

    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, [isOpen, onBlur]);

  useEffect(() => {
    if (!isOpen || activeHighlightedIndex < 0) {
      return;
    }

    optionRefs.current[activeHighlightedIndex]?.scrollIntoView?.({
      block: "nearest",
    });
  }, [activeHighlightedIndex, isOpen]);

  const closeDropdown = () => {
    setIsOpen(false);
    setHighlightedIndex(-1);
    triggerRef.current?.focus();
    onBlur?.();
  };

  const handleSelect = (optionValue) => {
    onChange?.(optionValue);
    closeDropdown();
  };

  const handleCreateClick = () => {
    setIsOpen(false);
    setHighlightedIndex(-1);
    onCreateClick?.();
    onBlur?.();
  };

  const moveHighlight = (direction) => {
    if (navigableIndexes.length === 0) {
      return;
    }

    const currentPosition = navigableIndexes.indexOf(activeHighlightedIndex);
    const fallbackPosition = direction > 0 ? -1 : 0;
    const nextPosition =
      (Math.max(currentPosition, fallbackPosition) +
        direction +
        navigableIndexes.length) %
      navigableIndexes.length;

    setHighlightedValueKey(currentValueKey);
    setHighlightedIndex(navigableIndexes[nextPosition]);
  };

  const selectHighlighted = () => {
    if (activeHighlightedIndex === createIndex && canCreate) {
      handleCreateClick();
      return;
    }

    const option = normalizedOptions[activeHighlightedIndex];

    if (option && !option.disabled) {
      handleSelect(option.value);
    }
  };

  const handleTriggerKeyDown = (event) => {
    if (event.key === "Escape" && isOpen) {
      event.preventDefault();
      closeDropdown();
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();

      if (!isOpen) {
        setIsOpen(true);
        setHighlightedValueKey(currentValueKey);
        setHighlightedIndex(
          event.key === "ArrowDown"
            ? (navigableIndexes[0] ?? -1)
            : (navigableIndexes.at(-1) ?? -1),
        );
      } else {
        moveHighlight(event.key === "ArrowDown" ? 1 : -1);
      }

      return;
    }

    if ((event.key === "Home" || event.key === "End") && isOpen) {
      event.preventDefault();
      setHighlightedValueKey(currentValueKey);
      setHighlightedIndex(
        event.key === "Home"
          ? (navigableIndexes[0] ?? -1)
          : (navigableIndexes.at(-1) ?? -1),
      );
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();

      if (isOpen) {
        selectHighlighted();
      } else {
        setHighlightedValueKey(currentValueKey);
        setHighlightedIndex(
          navigableIndexes.includes(selectedIndex)
            ? selectedIndex
            : (navigableIndexes[0] ?? -1),
        );
        setIsOpen(true);
      }
    }
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
        role="combobox"
        disabled={disabled}
        aria-activedescendant={highlightedOptionId}
        aria-controls={listboxId}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={label ? undefined : ariaLabel}
        aria-labelledby={label ? `${selectId}-label` : undefined}
        onClick={() => {
          if (isOpen) {
            closeDropdown();
          } else {
            setHighlightedValueKey(currentValueKey);
            setHighlightedIndex(
              navigableIndexes.includes(selectedIndex)
                ? selectedIndex
                : (navigableIndexes[0] ?? -1),
            );
            setIsOpen(true);
          }
        }}
        onKeyDown={handleTriggerKeyDown}
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
            aria-label={label ? undefined : ariaLabel}
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
                normalizedOptions.map((option, index) => {
                  const isSelected = String(option.value) === String(value);
                  const isHighlighted = activeHighlightedIndex === index;

                  return (
                    <button
                      key={String(option.value)}
                      ref={(element) => {
                        optionRefs.current[index] = element;
                      }}
                      id={`${listboxId}-option-${index}`}
                      type="button"
                      role="option"
                      tabIndex={-1}
                      disabled={option.disabled}
                      aria-disabled={option.disabled || undefined}
                      aria-selected={isSelected}
                      onClick={() => handleSelect(option.value)}
                      onMouseEnter={() => {
                        if (!option.disabled) {
                          setHighlightedValueKey(currentValueKey);
                          setHighlightedIndex(index);
                        }
                      }}
                      className={[
                        "flex h-9 w-full cursor-pointer items-center justify-between gap-3 rounded-lg px-2.5 text-left text-sm transition-colors",
                        isSelected || isHighlighted
                          ? "bg-brand-light text-slate-900"
                          : "text-slate-600 hover:bg-slate-50",
                        option.disabled
                          ? "cursor-not-allowed opacity-45 hover:bg-transparent"
                          : "",
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

            {canCreate && (
              <button
                ref={(element) => {
                  optionRefs.current[createIndex] = element;
                }}
                id={`${listboxId}-create`}
                type="button"
                role="option"
                tabIndex={-1}
                aria-selected="false"
                className={[
                  "flex h-10 w-full items-center gap-2 border-t border-slate-100 px-3 text-left text-sm font-semibold text-brand transition-colors",
                  activeHighlightedIndex === createIndex
                    ? "bg-brand-light"
                    : "bg-white hover:bg-brand-light",
                ].join(" ")}
                onClick={handleCreateClick}
                onMouseEnter={() => {
                  setHighlightedValueKey(currentValueKey);
                  setHighlightedIndex(createIndex);
                }}
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
