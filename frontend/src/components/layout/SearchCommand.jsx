import clsx from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Command,
  LoaderCircle,
  Search,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

import { useSidebar } from "../../hooks/useSidebar";
import {
  clampCommandHighlight,
  filterCommandItems,
} from "../../utils/searchCommand";
import {
  restoreFocus,
  trapFocus,
} from "../../utils/focus";
import {
  getPermittedGlobalSearchEntities,
  globalSearchEntities,
  searchRecordEntities,
} from "./globalSearch";

const MIN_RECORD_QUERY_LENGTH = 2;
const RECORD_SEARCH_DEBOUNCE_MS = 300;

const SearchCommand = () => {
  const navigate = useNavigate();
  const auth = useSelector((state) => state.auth);
  const { closeCommand, commandOpen, flatMenuItems, openCommand } = useSidebar();
  const [query, setQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [recordGroups, setRecordGroups] = useState([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const inputRef = useRef(null);
  const dialogRef = useRef(null);
  const optionRefs = useRef([]);
  const previousFocusRef = useRef(null);
  const requestIdRef = useRef(0);
  const abortControllerRef = useRef(null);
  const normalizedQuery = query.trim();
  const navigationResults = useMemo(
    () => filterCommandItems(flatMenuItems, query),
    [flatMenuItems, query],
  );
  const permittedEntities = useMemo(
    () =>
      getPermittedGlobalSearchEntities(globalSearchEntities, {
        pages: auth.pages ?? [],
        roles: auth.roles ?? [],
        user: auth.user,
      }),
    [auth.pages, auth.roles, auth.user],
  );
  const resultGroups = useMemo(() => {
    const groups = [];

    if (navigationResults.length > 0) {
      groups.push({
        id: "navigation",
        items: navigationResults.map((item) => ({
          badge: "Page",
          Icon: item.Icon,
          id: item.id,
          primary: item.label,
          route: item.route,
          secondary: item.modulePath || item.route,
        })),
        label: "Navigation",
      });
    }

    recordGroups.forEach((group) => {
      groups.push({
        ...group,
        items: group.items.map((item) => ({
          ...item,
          badge: group.label,
          Icon: group.icon,
        })),
      });
    });

    return groups;
  }, [navigationResults, recordGroups]);
  const results = useMemo(
    () => resultGroups.flatMap((group) => group.items),
    [resultGroups],
  );

  const handleClose = useCallback(() => {
    requestIdRef.current += 1;
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setQuery("");
    setRecordGroups([]);
    setRecordsLoading(false);
    setHighlightedIndex(-1);
    closeCommand();
  }, [closeCommand]);

  const handleNavigate = useCallback(
    (route) => {
      navigate(route);
      handleClose();
    },
    [handleClose, navigate],
  );

  useEffect(() => {
    const handleShortcut = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();

        if (commandOpen) {
          handleClose();
        } else {
          openCommand();
        }
      }
    };

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [commandOpen, handleClose, openCommand]);

  useEffect(() => {
    if (!commandOpen) {
      return undefined;
    }

    previousFocusRef.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frameId = window.requestAnimationFrame(() => inputRef.current?.focus());
    const releaseFocusTrap = trapFocus(dialogRef.current);

    return () => {
      window.cancelAnimationFrame(frameId);
      releaseFocusTrap();
      document.body.style.overflow = previousOverflow;
      restoreFocus(previousFocusRef.current);
    };
  }, [commandOpen]);

  useEffect(() => {
    const requestId = ++requestIdRef.current;

    abortControllerRef.current?.abort();
    abortControllerRef.current = null;

    if (
      !commandOpen ||
      normalizedQuery.length < MIN_RECORD_QUERY_LENGTH
    ) {
      return undefined;
    }

    const timeoutId = window.setTimeout(async () => {
      const controller = new AbortController();
      abortControllerRef.current = controller;
      setRecordsLoading(true);
      const result = await searchRecordEntities({
        entities: permittedEntities,
        isCurrent: (candidateId) =>
          requestIdRef.current === candidateId,
        query: normalizedQuery,
        requestId,
        signal: controller.signal,
      });

      if (!result.stale) {
        setRecordGroups(result.groups);
        setRecordsLoading(false);
      }
    }, RECORD_SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, [commandOpen, normalizedQuery, permittedEntities]);

  useEffect(() => {
    const activeIndex = clampCommandHighlight(
      highlightedIndex,
      results.length,
    );

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
        const activeIndex = clampCommandHighlight(
          highlightedIndex,
          results.length,
        );
        const nextIndex =
          activeIndex < 0
            ? direction > 0
              ? 0
              : results.length - 1
            : (activeIndex + direction + results.length) % results.length;
        setHighlightedIndex(nextIndex);
      }
      return;
    }

    const activeIndex = clampCommandHighlight(
      highlightedIndex,
      results.length,
    );

    if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      const route = results[activeIndex]?.route;

      if (route) {
        handleNavigate(route);
      }
    }
  };

  const activeHighlightedIndex = clampCommandHighlight(
    highlightedIndex,
    results.length,
  );
  const activeOptionId =
    activeHighlightedIndex >= 0
      ? `command-option-${activeHighlightedIndex}`
      : undefined;
  let optionIndex = -1;

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
              Search pages and records
            </h2>
            <div className="flex h-14 shrink-0 items-center gap-3 border-b border-slate-100 px-4">
              <Search aria-hidden="true" className="h-4 w-4 text-slate-500" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => {
                  const nextQuery = event.target.value;

                  setQuery(nextQuery);
                  setRecordsLoading(
                    nextQuery.trim().length >= MIN_RECORD_QUERY_LENGTH,
                  );
                  if (
                    nextQuery.trim().length <
                    MIN_RECORD_QUERY_LENGTH
                  ) {
                    setRecordGroups([]);
                  }
                  setHighlightedIndex(0);
                }}
                role="combobox"
                aria-autocomplete="list"
                aria-controls="command-results"
                aria-expanded="true"
                aria-activedescendant={activeOptionId}
                aria-label="Search pages and records"
                placeholder="Search pages and records..."
                className="h-full flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-500"
              />
              <button
                type="button"
                onClick={handleClose}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
                aria-label="Close command palette"
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>

            <div
              id="command-results"
              role="listbox"
              aria-label="Global search results"
              className="min-h-0 flex-1 overflow-y-auto p-2"
            >
              <p
                className="sr-only"
                aria-live="polite"
                aria-atomic="true"
              >
                {recordsLoading
                  ? "Searching records"
                  : normalizedQuery
                    ? `${results.length} search ${results.length === 1 ? "result" : "results"}`
                    : `${results.length} available ${results.length === 1 ? "page" : "pages"}`}
              </p>
              {recordsLoading && (
                <div
                  className="flex items-center gap-2 px-3 py-2 text-xs text-slate-500"
                  role="status"
                >
                  <LoaderCircle aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
                  Searching records
                </div>
              )}

              {resultGroups.map((group) => (
                <section key={group.id} aria-label={group.label}>
                  <div className="flex items-center gap-1 px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    <span>{group.label}</span>
                    <span aria-hidden="true">·</span>
                    <span>{group.items.length}</span>
                  </div>
                  {group.items.map((item) => {
                    optionIndex += 1;
                    const index = optionIndex;
                    const Icon = item.Icon;
                    const isHighlighted =
                      activeHighlightedIndex === index;

                    return (
                      <button
                        key={`${group.id}-${item.id}-${item.route}`}
                        ref={(element) => {
                          optionRefs.current[index] = element;
                        }}
                        id={`command-option-${index}`}
                        type="button"
                        role="option"
                        aria-selected={isHighlighted}
                        tabIndex={-1}
                        onClick={() => handleNavigate(item.route)}
                        onMouseEnter={() => setHighlightedIndex(index)}
                        className={clsx(
                          "group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/20",
                          isHighlighted
                            ? "bg-slate-100"
                            : "hover:bg-slate-100",
                        )}
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand">
                          <Icon aria-hidden="true" className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-slate-900">
                            {item.primary}
                          </span>
                          {item.secondary ? (
                            <span className="block truncate text-xs text-slate-500">
                              {item.secondary}
                            </span>
                          ) : null}
                        </span>
                        <span className="max-w-28 truncate rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500">
                          {item.badge}
                        </span>
                        <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-500" />
                      </button>
                    );
                  })}
                </section>
              ))}

              {!recordsLoading && results.length === 0 && (
                <div className="px-4 py-10 text-center" role="status">
                  <Command aria-hidden="true" className="mx-auto h-5 w-5 text-slate-300" />
                  <p className="mt-3 text-sm font-medium text-slate-700">
                    {normalizedQuery
                      ? `No matches for '${normalizedQuery}'`
                      : "No recent pages are available"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {normalizedQuery
                      ? "Try fewer words or a different record identifier."
                      : "Pages appear here when you have access to them."}
                  </p>
                </div>
              )}
            </div>

            <div className="hidden shrink-0 items-center justify-center border-t border-slate-100 bg-slate-50 px-4 py-2 text-[11px] text-slate-500 sm:flex">
              Up/Down Navigate&nbsp;&nbsp; Enter Open&nbsp;&nbsp; Esc Close
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SearchCommand;
