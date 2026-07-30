import { AnimatePresence, motion } from "framer-motion";
import { Filter, RotateCcw, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  focusFirstIn,
  restoreFocus,
  trapFocus,
} from "../../utils/focus";
import AppButton from "./AppButton";

const MobileFilterSheet = ({
  activeCount = 0,
  children,
  onClear,
  title = "Filters",
}) => {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    const triggerElement = triggerRef.current;
    document.body.style.overflow = "hidden";
    const frameId = window.requestAnimationFrame(() => {
      focusFirstIn(dialogRef.current);
    });
    const releaseFocusTrap = trapFocus(dialogRef.current);
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.cancelAnimationFrame(frameId);
      releaseFocusTrap();
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      restoreFocus(triggerElement);
    };
  }, [open]);

  return (
    <>
      <div className="hidden md:block">{children}</div>

      <div className="md:hidden">
        <button
          ref={triggerRef}
          type="button"
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm"
          onClick={() => setOpen(true)}
        >
          <Filter aria-hidden="true" className="h-4 w-4" />
          Filters{activeCount > 0 ? ` (${activeCount})` : ""}
        </button>
      </div>

      <AnimatePresence>
        {open ? (
          <div className="fixed inset-0 z-[80] md:hidden">
            <motion.button
              type="button"
              aria-hidden="true"
              tabIndex={-1}
              className="absolute inset-0 bg-slate-950/45"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.section
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-label={title}
              tabIndex={-1}
              className="absolute inset-x-0 bottom-0 flex max-h-[92dvh] flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl outline-none"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              <header className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    {title}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {activeCount} active{" "}
                    {activeCount === 1 ? "filter" : "filters"}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Close filters"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"
                  onClick={() => setOpen(false)}
                >
                  <X aria-hidden="true" className="h-5 w-5" />
                </button>
              </header>

              <div className="min-h-0 flex-1 overflow-y-auto p-4 [&_.grid]:gap-4">
                {children}
              </div>

              <footer className="grid shrink-0 grid-cols-2 gap-2 border-t border-slate-200 bg-white p-4">
                <AppButton
                  variant="secondary"
                  disabled={activeCount === 0}
                  onClick={onClear}
                >
                  <RotateCcw aria-hidden="true" className="h-4 w-4" />
                  Clear
                </AppButton>
                <AppButton onClick={() => setOpen(false)}>Apply</AppButton>
              </footer>
            </motion.section>
          </div>
        ) : null}
      </AnimatePresence>
    </>
  );
};

export default MobileFilterSheet;
