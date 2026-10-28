import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useId, useRef } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

const getFocusableElements = (container) => {
  return Array.from(
    container?.querySelectorAll(FOCUSABLE_SELECTOR) ?? [],
  ).filter((element) => !element.closest("[aria-hidden='true']"));
};

const AppModal = ({
  children,
  closeOnBackdrop = true,
  closeOnEscape = true,
  hideHeader = false,
  isBusy = false,
  isOpen,
  maxWidth = "max-w-lg",
  onClose,
  title,
}) => {
  const generatedTitleId = useId();
  const titleId = title ? `app-modal-title-${generatedTitleId}` : undefined;
  const dialogRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const keyboardOptionsRef = useRef({ isBusy, closeOnEscape });

  useEffect(() => {
    onCloseRef.current = onClose;
    keyboardOptionsRef.current = { isBusy, closeOnEscape };
  }, [onClose, isBusy, closeOnEscape]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const previouslyFocused = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusFrame = window.requestAnimationFrame(() => {
      const focusTarget =
        dialogRef.current?.querySelector("[autofocus]") ??
        getFocusableElements(dialogRef.current)[0] ??
        dialogRef.current;

      focusTarget?.focus();
    });

    const handleKeyDown = (event) => {
      if (event.defaultPrevented) return;
      const dialogs = document.querySelectorAll('[role="dialog"][aria-modal="true"]');
      if (dialogs[dialogs.length - 1] !== dialogRef.current) return;
      if (
        event.key === "Escape" &&
        keyboardOptionsRef.current.closeOnEscape &&
        !keyboardOptionsRef.current.isBusy &&
        onCloseRef.current
      ) {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusableElements = getFocusableElements(dialogRef.current);

      if (focusableElements.length === 0) {
        event.preventDefault();
        dialogRef.current?.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (!dialogRef.current?.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? lastElement : firstElement).focus();
        return;
      }

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;

      if (
        previouslyFocused instanceof HTMLElement &&
        previouslyFocused.isConnected
      ) {
        previouslyFocused.focus();
      }
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-2 py-3 backdrop-blur-md sm:px-4 sm:py-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={() => {
            if (closeOnBackdrop && !isBusy) {
              onClose?.();
            }
          }}
        >
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-label={title ? undefined : "Dialog"}
            aria-labelledby={titleId}
            aria-modal="true"
            aria-busy={isBusy || undefined}
            tabIndex={-1}
            className={[
              "flex max-h-[calc(100dvh-1.5rem)] w-full flex-col overflow-visible rounded-3xl border border-white/70 bg-white shadow-[0_32px_90px_-24px_rgba(15,23,42,0.55)] ring-1 ring-slate-950/10 outline-none sm:max-h-[calc(100dvh-3rem)]",
              maxWidth,
            ].join(" ")}
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="min-h-0 overflow-y-auto p-5 sm:p-6">
              {!hideHeader && (title || onClose) && (
                <div className="mb-6 flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
                  {title && (
                    <h2
                      id={titleId}
                      className="text-base font-semibold text-slate-900"
                    >
                      {title}
                    </h2>
                  )}
                  {onClose && (
                    <button
                      type="button"
                      onClick={onClose}
                      disabled={isBusy}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-transparent text-slate-400 transition-all hover:border-slate-200 hover:bg-slate-50 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label="Close"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              )}
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AppModal;
