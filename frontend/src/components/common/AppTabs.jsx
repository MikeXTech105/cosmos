import clsx from "clsx";
import { useRef } from "react";
import { twMerge } from "tailwind-merge";

const getTabId = (id, tabId) => `${id}-tab-${tabId}`;
const getTabPanelId = (id, tabId) => `${id}-panel-${tabId}`;

const AppTabs = ({
  active,
  activeClassName = "bg-brand text-white shadow-sm",
  "aria-label": ariaLabel = "Sections",
  className = "",
  id,
  inactiveClassName = "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
  onChange,
  tabClassName = "",
  tabs,
}) => {
  const tabRefs = useRef([]);
  const activeIndex = Math.max(
    0,
    tabs.findIndex((tab) => tab.id === active),
  );

  const activateTab = (
    index,
    direction = index >= activeIndex ? 1 : -1,
  ) => {
    let nextIndex = (index + tabs.length) % tabs.length;
    let attempts = 0;

    while (tabs[nextIndex]?.disabled && attempts < tabs.length) {
      nextIndex = (nextIndex + direction + tabs.length) % tabs.length;
      attempts += 1;
    }

    const nextTab = tabs[nextIndex];

    if (!nextTab || nextTab.disabled) {
      return;
    }

    onChange(nextTab.id);
    window.requestAnimationFrame(() => tabRefs.current[nextIndex]?.focus());
  };

  const handleKeyDown = (event, index) => {
    let nextIndex;

    if (event.key === "ArrowRight") {
      nextIndex = index + 1;
    } else if (event.key === "ArrowLeft") {
      nextIndex = index - 1;
    } else if (event.key === "Home") {
      event.preventDefault();
      activateTab(0, 1);
      return;
    } else if (event.key === "End") {
      event.preventDefault();
      activateTab(tabs.length - 1, -1);
      return;
    } else {
      return;
    }

    event.preventDefault();
    activateTab(nextIndex);
  };

  return (
    <div className="max-w-full overflow-x-auto">
      <div
        id={id}
        role="tablist"
        aria-label={ariaLabel}
        className={twMerge("flex gap-1", className)}
      >
        {tabs.map((tab, index) => {
          const Icon = tab.icon;
          const selected = active === tab.id;

          return (
            <button
              key={tab.id}
              ref={(element) => {
                tabRefs.current[index] = element;
              }}
              id={getTabId(id, tab.id)}
              type="button"
              role="tab"
              aria-controls={getTabPanelId(id, tab.id)}
              aria-selected={selected}
              disabled={tab.disabled}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(tab.id)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              className={clsx(
                "shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30",
                tabClassName,
                selected ? activeClassName : inactiveClassName,
              )}
            >
              {Icon ? <Icon aria-hidden="true" className="h-4 w-4" /> : null}
              <span>{tab.label}</span>
              {tab.count !== undefined ? (
                <span
                  aria-label={`${tab.count} records`}
                  className={clsx(
                    "rounded-full px-1.5 py-0.5 text-[10px]",
                    selected
                      ? "bg-brand-dark text-white"
                      : "bg-slate-100 text-slate-600",
                  )}
                >
                  {tab.count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default AppTabs;
