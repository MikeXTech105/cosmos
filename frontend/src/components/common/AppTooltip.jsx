import { AnimatePresence, motion } from "framer-motion";
import {
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

const AppTooltip = ({ children, label }) => {
  const id = useId();
  const triggerRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({
    below: false,
    left: 0,
    top: 0,
  });

  const closeTooltip = useCallback(() => {
    setOpen((current) => (current ? false : current));
  }, []);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    window.addEventListener("resize", closeTooltip);
    window.addEventListener("scroll", closeTooltip, true);

    return () => {
      window.removeEventListener("resize", closeTooltip);
      window.removeEventListener("scroll", closeTooltip, true);
    };
  }, [closeTooltip, open]);

  const showTooltip = () => {
    const rect = triggerRef.current?.getBoundingClientRect();

    if (!rect) {
      return;
    }

    const below = rect.top < 48;

    setPosition({
      below,
      left: Math.min(
        Math.max(rect.left + rect.width / 2, 72),
        window.innerWidth - 72,
      ),
      top: below ? rect.bottom + 8 : rect.top - 8,
    });
    setOpen((current) => (current ? current : true));
  };

  const tooltip = (
    <AnimatePresence>
      {open && (
        <motion.span
          id={id}
          role="tooltip"
          className="pointer-events-none fixed z-[100] whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-md"
          style={{
            left: position.left,
            top: position.top,
            transform: position.below
              ? "translate(-50%, 0)"
              : "translate(-50%, -100%)",
          }}
          initial={{ opacity: 0, scale: 0.96, y: position.below ? -3 : 3 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: position.below ? -3 : 3 }}
          transition={{ duration: 0.12, ease: [0.22, 1, 0.36, 1] }}
        >
          {label}
        </motion.span>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <span
        ref={triggerRef}
        className="inline-flex"
        onMouseEnter={showTooltip}
        onMouseLeave={closeTooltip}
        onFocusCapture={showTooltip}
        onBlurCapture={closeTooltip}
      >
        {isValidElement(children)
          ? cloneElement(children, {
              "aria-describedby": open ? id : undefined,
            })
          : children}
      </span>

      {createPortal(tooltip, document.body)}
    </>
  );
};

export default AppTooltip;
