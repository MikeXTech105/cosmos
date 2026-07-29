import clsx from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import { twMerge } from "tailwind-merge";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

const getFocusableElements = (container) => {
  return Array.from(container?.querySelectorAll(FOCUSABLE_SELECTOR) ?? []).filter(
    (element) => !element.closest("[aria-hidden='true']"),
  );
};

const AppModal = ({
  children,
  className = "",
  closeOnBackdrop = true,
  closeOnEscape = true,
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

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

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
      if (
        event.key === "Escape" &&
        closeOnEscape &&
        !isBusy &&
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

      if (previouslyFocused instanceof HTMLElement && previouslyFocused.isConnected) {
        previouslyFocused.focus();
      }
    };
  }, [closeOnEscape, isBusy, isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 py-4 backdrop-blur-sm sm:py-6"
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
            className={twMerge(
              clsx(
                "flex max-h-[calc(100dvh-2rem)] w-full flex-col overflow-visible rounded-2xl border border-slate-200 bg-white shadow-xl outline-none sm:max-h-[calc(100dvh-3rem)]",
                maxWidth,
              ),
              className,
            )}
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="min-h-0 overflow-y-auto p-6">
              {(title || onClose) && (
                <div className="mb-5 flex items-start justify-between gap-4">
                  {title && (
                    <h2 id={titleId} className="text-base font-semibold text-slate-900">
                      {title}
                    </h2>
                  )}
                  {onClose && (
                    <button
                      type="button"
                      onClick={onClose}
                      disabled={isBusy}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
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
