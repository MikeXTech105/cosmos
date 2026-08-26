import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Command, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useSidebar } from "../../hooks/useSidebar";
import {
  clampCommandHighlight,
  filterCommandItems,
} from "../../utils/searchCommand";

const FOCUSABLE_SELECTOR =
  "button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex='-1'])";

const SearchCommand = () => {
  const navigate = useNavigate();
  const { closeCommand, commandOpen, flatMenuItems, openCommand } = useSidebar();
  const [query, setQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const dialogRef = useRef(null);
  const inputRef = useRef(null);
  const optionRefs = useRef([]);
  const previousFocusRef = useRef(null);
  const results = useMemo(
    () => filterCommandItems(flatMenuItems, query),
    [flatMenuItems, query],
  );

  const handleClose = () => {
    setQuery("");
    setHighlightedIndex(-1);
    closeCommand();
  };

  const handleNavigate = (route) => {
    navigate(route);
    handleClose();
  };

  useEffect(() => {
    const handleShortcut = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();

        if (commandOpen) {
          inputRef.current?.focus();
        } else {
          openCommand();
        }
      }
    };

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [commandOpen, openCommand]);

  useEffect(() => {
    if (!commandOpen) {
      return undefined;
    }

    previousFocusRef.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frameId = window.requestAnimationFrame(() => inputRef.current?.focus());

    return () => {
      window.cancelAnimationFrame(frameId);
      document.body.style.overflow = previousOverflow;

      const previousFocus = previousFocusRef.current;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus();
      }
    };
  }, [commandOpen]);

  useEffect(() => {
    const activeIndex = clampCommandHighlight(highlightedIndex, results.length);

    if (activeIndex >= 0) {
      optionRefs.current[activeIndex]?.scrollIntoView?.({ block: "nearest" });
    }
  }, [highlightedIndex, results.length]);

  const handleDialogKeyDown = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      handleClose();
      return;
    }

    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();

      if (!results.length) {
        setHighlightedIndex(-1);
      } else if (event.key === "Home") {
        setHighlightedIndex(0);
      } else if (event.key === "End") {
        setHighlightedIndex(results.length - 1);
      } else {
        const direction = event.key === "ArrowDown" ? 1 : -1;
        const activeIndex = clampCommandHighlight(highlightedIndex, results.length);
        const nextIndex = activeIndex < 0
          ? direction > 0 ? 0 : results.length - 1
          : (activeIndex + direction + results.length) % results.length;
        setHighlightedIndex(nextIndex);
      }
      return;
    }

    const activeIndex = clampCommandHighlight(highlightedIndex, results.length);

    if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      const route = results[activeIndex]?.route;
      if (route) {
        handleNavigate(route);
      }
      return;
    }

    if (event.key !== "Tab") {
      return;
    }

    const focusable = Array.from(
      dialogRef.current?.querySelectorAll(FOCUSABLE_SELECTOR) ?? [],
    );
    const first = focusable[0];
    const last = focusable.at(-1);

    if (!first || !last) {
      event.preventDefault();
      dialogRef.current?.focus();
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const activeHighlightedIndex = clampCommandHighlight(
    highlightedIndex,
    results.length,
  );
  const activeOptionId = activeHighlightedIndex >= 0
    ? `command-option-${activeHighlightedIndex}`
    : undefined;

  return (
    <AnimatePresence>
      {commandOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/30 px-3 pt-4 backdrop-blur-sm sm:px-4 sm:pt-20"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={handleClose}
        >
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="command-palette-title"
            tabIndex={-1}
            className="flex max-h-[calc(100dvh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl outline-none sm:max-h-[calc(100dvh-6rem)]"
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            onMouseDown={(event) => event.stopPropagation()}
            onKeyDown={handleDialogKeyDown}
          >
            <h2 id="command-palette-title" className="sr-only">
              Search pages, modules, and reports
            </h2>
            <div className="flex h-14 shrink-0 items-center gap-3 border-b border-slate-100 px-4">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setHighlightedIndex(0);
                }}
                role="combobox"
                aria-label="Search pages, modules, and reports"
                aria-autocomplete="list"
                aria-controls="command-results"
                aria-expanded="true"
                aria-activedescendant={activeOptionId}
                placeholder="Search pages, modules, and reports..."
                className="h-full flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
              />
              <button
                type="button"
                onClick={handleClose}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-800"
                aria-label="Close command palette"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div
              id="command-results"
              role="listbox"
              aria-label="Navigation results"
              className="min-h-0 flex-1 overflow-y-auto p-2"
            >
              {results.map((item, index) => {
                const Icon = item.Icon;
                const isHighlighted = activeHighlightedIndex === index;

                return (
                  <button
                    key={`${item.id}-${item.route}`}
                    ref={(element) => {
                      optionRefs.current[index] = element;
                    }}
                    id={`command-option-${index}`}
                    type="button"
                    role="option"
                    aria-selected={isHighlighted}
                    tabIndex={-1}
                    onClick={() => handleNavigate(item.route)}
                    onMouseEnter={() =>
                      setHighlightedIndex(clampCommandHighlight(index, results.length))
                    }
                    className={[
                      "group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/20",
                      isHighlighted ? "bg-slate-100" : "hover:bg-slate-100",
                    ].join(" ")}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-slate-900">
                        {item.label}
                      </span>
                      <span className="block truncate text-xs text-slate-500">
                        {item.modulePath || item.route}
                      </span>
                    </span>
                    <ArrowRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-500" />
                  </button>
                );
              })}

              {results.length === 0 && (
                <div className="px-4 py-10 text-center" role="status">
                  <Command className="mx-auto h-5 w-5 text-slate-300" />
                  <p className="mt-3 text-sm font-medium text-slate-700">
                    No results found
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Try searching another page, module, or route.
                  </p>
                </div>
              )}
            </div>

            <div className="hidden shrink-0 items-center justify-center border-t border-slate-100 bg-slate-50 px-4 py-2 text-[11px] text-slate-500 sm:flex">
              ↑↓ Navigate&nbsp;&nbsp; Enter Open&nbsp;&nbsp; Esc Close
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SearchCommand;
