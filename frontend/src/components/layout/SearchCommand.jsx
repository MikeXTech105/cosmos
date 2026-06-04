import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Command, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useSidebar } from "../../hooks/useSidebar";

const SearchCommand = () => {
  const navigate = useNavigate();
  const { closeCommand, commandOpen, flatMenuItems, openCommand } = useSidebar();
  const [query, setQuery] = useState("");

  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openCommand();
      }

      if (event.key === "Escape") {
        closeCommand();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeCommand, openCommand]);

  const results = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return flatMenuItems.slice(0, 8);
    }

    return flatMenuItems
      .filter((item) =>
        [item.label, item.route, item.modulePath]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery),
      )
      .slice(0, 10);
  }, [flatMenuItems, query]);

  const handleNavigate = (route) => {
    navigate(route);
    setQuery("");
    closeCommand();
  };

  const handleClose = () => {
    setQuery("");
    closeCommand();
  };

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
            className="flex max-h-[calc(100dvh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_30px_100px_rgba(15,23,42,0.24)] sm:max-h-[calc(100dvh-6rem)]"
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex h-14 shrink-0 items-center gap-3 border-b border-slate-100 px-4">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                autoFocus
                placeholder="Search pages, modules, and menu items..."
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

            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {results.map((item) => {
                const Icon = item.Icon;

                return (
                  <button
                    key={`${item.id}-${item.route}`}
                    type="button"
                    onClick={() => handleNavigate(item.route)}
                    className="group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
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
                <div className="px-4 py-10 text-center">
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

            <div className="hidden shrink-0 items-center justify-between border-t border-slate-100 bg-slate-50 px-4 py-2 text-[11px] text-slate-500 sm:flex">
              <span>Press Enter after selecting a result</span>
              <span>Esc to close</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SearchCommand;
