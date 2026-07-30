import clsx from "clsx";
import { MoreVertical, X } from "lucide-react";
import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useRef,
  useState,
} from "react";

const useActionMenuKeyboard = ({
  menuRef,
  open,
  rootRef,
  setOpen,
  triggerRef,
}) => {
  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const frameId = window.requestAnimationFrame(() => {
      menuRef.current
        ?.querySelector('[role="menuitem"]:not([disabled])')
        ?.focus();
    });
    const handleKeyDown = (event) => {
      if (!rootRef.current?.contains(document.activeElement)) {
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        window.requestAnimationFrame(() => triggerRef.current?.focus());
        return;
      }

      if (
        !["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)
      ) {
        return;
      }

      const items = Array.from(
        menuRef.current?.querySelectorAll(
          '[role="menuitem"]:not([disabled])',
        ) ?? [],
      );

      if (items.length === 0) {
        return;
      }

      event.preventDefault();
      const currentIndex = items.indexOf(document.activeElement);
      const nextIndex =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? items.length - 1
            : event.key === "ArrowUp"
              ? (Math.max(0, currentIndex) - 1 + items.length) % items.length
              : (currentIndex + 1) % items.length;

      items[nextIndex]?.focus();
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.cancelAnimationFrame(frameId);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuRef, open, rootRef, setOpen, triggerRef]);
};

const collectLegacyActions = (nodes, inheritedLabel) => {
  return Children.toArray(nodes).flatMap((node) => {
    if (!isValidElement(node)) {
      return [];
    }

    const label =
      node.props["aria-label"] ??
      node.props.title ??
      node.props.label ??
      inheritedLabel;
    const isAction =
      node.type === "button" ||
      node.type === "a" ||
      Boolean(node.props.to) ||
      Boolean(node.props.href);

    if (isAction) {
      return [{ element: node, label: label ?? "Record action" }];
    }

    return collectLegacyActions(node.props.children, label);
  });
};

const MobileActionMenu = ({ actions }) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);

  useActionMenuKeyboard({
    menuRef,
    open,
    rootRef,
    setOpen,
    triggerRef,
  });

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={open ? "Close record actions" : "Open record actions"}
        className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
        onClick={() => setOpen((current) => !current)}
      >
        {open ? <X aria-hidden="true" className="h-4 w-4" /> : <MoreVertical aria-hidden="true" className="h-4 w-4" />}
      </button>

      {open ? (
        <div
          ref={menuRef}
          role="menu"
          className="absolute bottom-12 right-0 z-30 min-w-48 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl"
        >
          {actions.map((action) => {
            const Icon = action.icon;

            return (
              <button
                key={action.id ?? action.label}
                type="button"
                role="menuitem"
                tabIndex={-1}
                disabled={action.disabled}
                title={action.disabled ? action.disabledReason : undefined}
                className={clsx(
                  "flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 disabled:cursor-not-allowed disabled:opacity-50",
                  action.tone === "danger"
                    ? "text-red-600 hover:bg-red-50"
                    : "text-slate-700 hover:bg-slate-50",
                )}
                onClick={() => {
                  action.onClick?.();
                  setOpen(false);
                }}
              >
                {Icon ? <Icon aria-hidden="true" className="h-4 w-4 shrink-0" /> : null}
                <span>{action.label}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
};

const MobileActionButtons = ({ actions }) => (
  <div className="flex flex-wrap items-center justify-end gap-2">
    {actions.map((action) => {
      const Icon = action.icon;

      return (
        <button
          key={action.id ?? action.label}
          type="button"
          disabled={action.disabled}
          title={action.disabled ? action.disabledReason : undefined}
          aria-label={action.label}
          className={clsx(
            "inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 disabled:cursor-not-allowed disabled:opacity-50",
            action.tone === "danger"
              ? "border-red-100 bg-white text-red-600 hover:bg-red-50"
              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-brand",
          )}
          onClick={action.onClick}
        >
          {Icon ? <Icon aria-hidden="true" className="h-4 w-4 shrink-0" /> : null}
          <span className={actions.length > 1 ? "sr-only" : ""}>
            {action.label}
          </span>
        </button>
      );
    })}
  </div>
);

const MobileLegacyActionMenu = ({ children }) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const actions = collectLegacyActions(children);

  useActionMenuKeyboard({
    menuRef,
    open,
    rootRef,
    setOpen,
    triggerRef,
  });

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    menuRef.current
      ?.querySelectorAll("button, a[href]")
      .forEach((element) => {
        element.setAttribute("role", "menuitem");
        element.setAttribute("tabindex", "-1");
      });

    const handleAction = (event) => {
      if (event.target.closest("button, a[href]")) {
        setOpen(false);
      }
    };
    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    const rootElement = rootRef.current;

    rootElement?.addEventListener("click", handleAction);
    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      rootElement?.removeEventListener("click", handleAction);
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={open ? "Close record actions" : "Open record actions"}
        className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
        onClick={() => setOpen((current) => !current)}
      >
        {open ? <X aria-hidden="true" className="h-4 w-4" /> : <MoreVertical aria-hidden="true" className="h-4 w-4" />}
      </button>

      {open ? (
        <div
          ref={menuRef}
          role="menu"
          className="absolute bottom-12 right-0 z-30 min-w-48 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl"
        >
          {actions.length > 0 ? (
            actions.map(({ element, label }, index) => {
              const originalOnClick = element.props.onClick;
              const danger =
                String(element.props.className ?? "").includes("red") ||
                /delete|remove|reverse|cancel/i.test(label);

              return cloneElement(element, {
                key: element.key ?? `${label}-${index}`,
                "aria-label": label,
                role: "menuitem",
                tabIndex: -1,
                className: clsx(
                  "flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 disabled:cursor-not-allowed disabled:opacity-50",
                  danger
                    ? "text-red-600 hover:bg-red-50"
                    : "text-slate-700 hover:bg-slate-50",
                ),
                onClick: (event) => {
                  originalOnClick?.(event);
                  setOpen(false);
                },
                title: element.props.disabled
                  ? element.props.title ?? label
                  : undefined,
              });
            })
          ) : (
            <div
              role="none"
              className="mobile-record-actions flex items-center gap-2"
            >
              {children}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};

const MobileRecordCard = ({
  actionItems = [],
  actions,
  fields = [],
  footer,
  serial,
  status,
  subtitle,
  title,
}) => {
  const visibleFields = fields.filter(
    (field) =>
      field &&
      field.value !== undefined &&
      field.value !== null &&
      field.value !== "",
  );

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            {serial !== undefined && serial !== null ? (
              <span className="shrink-0 text-xs tabular-nums text-slate-500">
                #{serial}
              </span>
            ) : null}
            <h3 className="min-w-0 truncate text-sm font-medium text-slate-900">
              {title}
            </h3>
          </div>
          {subtitle ? (
            <p className="mt-1 break-words text-xs leading-5 text-slate-500">
              {subtitle}
            </p>
          ) : null}
        </div>
        {status ? <div className="shrink-0">{status}</div> : null}
      </header>

      {visibleFields.length > 0 ? (
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
          {visibleFields.slice(0, 4).map((field) => (
            <div
              key={field.key ?? field.label}
              className={clsx("min-w-0", field.fullWidth && "col-span-2")}
            >
              <dt className="text-xs text-slate-500">{field.label}</dt>
              <dd
                className={clsx(
                  "mt-1 min-w-0 break-words text-sm text-slate-800",
                  field.className,
                )}
              >
                {field.value}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      {footer || actions || actionItems.length > 0 ? (
        <footer className="mt-4 flex min-h-11 items-center justify-between gap-3 border-t border-slate-100 pt-3">
          <div className="min-w-0 flex-1">{footer}</div>
          {actionItems.length >= 3 ? (
            <MobileActionMenu actions={actionItems} />
          ) : actionItems.length > 0 ? (
            <MobileActionButtons actions={actionItems} />
          ) : actions ? (
            <MobileLegacyActionMenu>{actions}</MobileLegacyActionMenu>
          ) : null}
        </footer>
      ) : null}
    </article>
  );
};

export const MobileRecordCardSkeleton = ({ fields = 4 }) => (
  <div
    aria-hidden="true"
    className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
  >
    <div className="flex items-center gap-3">
      <div className="h-4 w-8 animate-pulse rounded bg-slate-100" />
      <div className="h-4 flex-1 animate-pulse rounded bg-slate-100" />
      <div className="h-6 w-16 animate-pulse rounded-full bg-slate-100" />
    </div>
    <div className="mt-4 grid grid-cols-2 gap-4">
      {Array.from({ length: fields }, (_, index) => (
        <div key={index}>
          <div className="h-3 w-14 animate-pulse rounded bg-slate-100" />
          <div className="mt-2 h-4 animate-pulse rounded bg-slate-100" />
        </div>
      ))}
    </div>
  </div>
);

export default MobileRecordCard;
