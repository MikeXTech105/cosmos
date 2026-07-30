import clsx from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import { twMerge } from "tailwind-merge";

import {
  focusFirstIn,
  getFocusableElements,
  restoreFocus,
  trapFocus,
} from "../../utils/focus";

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
    const outsideFocusable = getFocusableElements(document.body).filter(
      (element) => !dialogRef.current?.contains(element),
    );
    const previousIndex = outsideFocusable.indexOf(previouslyFocused);
    const fallbackCandidates =
      previousIndex >= 0
        ? [
            outsideFocusable[previousIndex + 1],
            outsideFocusable[previousIndex - 1],
          ]
        : [];
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusFrame = window.requestAnimationFrame(() => {
      focusFirstIn(dialogRef.current, { avoidDestructive: true });
    });
    const releaseFocusTrap = trapFocus(dialogRef.current);
    let knownInvalidFields = new Set(
      dialogRef.current?.querySelectorAll("[aria-invalid='true']") ?? [],
    );
    let invalidFocusFrame = null;
    const invalidFieldObserver = new MutationObserver(() => {
      const invalidFields = Array.from(
        dialogRef.current?.querySelectorAll("[aria-invalid='true']") ?? [],
      );
      const newInvalidField = invalidFields.find(
        (field) => !knownInvalidFields.has(field),
      );

      knownInvalidFields = new Set(invalidFields);
      if (newInvalidField) {
        window.cancelAnimationFrame(invalidFocusFrame);
        invalidFocusFrame = window.requestAnimationFrame(() => {
          dialogRef.current
            ?.querySelector("[aria-invalid='true']:not([disabled])")
            ?.focus({ preventScroll: false });
        });
      }
    });
    invalidFieldObserver.observe(dialogRef.current, {
      attributeFilter: ["aria-invalid"],
      attributes: true,
      childList: true,
      subtree: true,
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

    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      window.cancelAnimationFrame(invalidFocusFrame);
      releaseFocusTrap();
      invalidFieldObserver.disconnect();
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      restoreFocus(previouslyFocused, fallbackCandidates);
    };
  }, [closeOnEscape, isBusy, isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-0 backdrop-blur-sm md:p-4 lg:py-6"
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
                "flex h-dvh max-h-dvh w-full flex-col overflow-hidden rounded-none border-0 bg-white shadow-xl outline-none md:h-auto md:max-h-[calc(100dvh-2rem)] md:rounded-2xl md:border md:border-slate-200 lg:max-h-[calc(100dvh-3rem)]",
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
            {(title || onClose) && (
              <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 p-4 md:border-0 md:px-6 md:pb-0 md:pt-6">
                {title && (
                  <h2
                    id={titleId}
                    tabIndex={-1}
                    className="text-base font-semibold text-slate-900 outline-none"
                  >
                    {title}
                  </h2>
                )}
                {onClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isBusy}
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 md:h-8 md:w-8"
                    aria-label="Close"
                  >
                    <X aria-hidden="true" className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}
            <div
              className={clsx(
                "min-h-0 flex-1 overflow-y-auto p-4 md:p-6",
                (title || onClose) && "md:pt-5",
              )}
            >
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AppModal;
