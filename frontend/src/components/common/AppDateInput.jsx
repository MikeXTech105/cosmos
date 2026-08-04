import clsx from "clsx";
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
} from "lucide-react";
import {
  forwardRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import {
  clampCalendarView,
  formatDatePickerValue,
  getCalendarDays,
  getTimeFromDateTimeValue,
  isDateWithinBounds,
  parseIsoDate,
  toIsoDate,
} from "./datePickerUtils";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

const getCurrentTime = () => {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
};

const getYearRange = (min, max, selectedDate) => {
  const currentYear = new Date().getFullYear();
  const selectedYear = selectedDate?.getFullYear() ?? currentYear;
  const minYear = parseIsoDate(min)?.getFullYear() ?? Math.min(currentYear - 100, selectedYear - 10);
  const maxYear = parseIsoDate(max)?.getFullYear() ?? Math.max(currentYear + 20, selectedYear + 10);

  return Array.from(
    { length: Math.max(1, maxYear - minYear + 1) },
    (_, index) => minYear + index,
  );
};

const getMonthBoundary = (date, direction) => {
  return direction < 0
    ? new Date(date.getFullYear(), date.getMonth(), 0, 12)
    : new Date(date.getFullYear(), date.getMonth() + 1, 1, 12);
};

const normalizeDateTimeBound = (value, endOfDay = false) => {
  if (!value) return "";
  const bound = String(value);
  return bound.includes("T")
    ? bound.slice(0, 16)
    : `${bound.slice(0, 10)}T${endOfDay ? "23:59" : "00:00"}`;
};

const AppDateInput = forwardRef(({
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  "aria-label": ariaLabel,
  "aria-required": ariaRequired,
  autoFocus,
  className,
  defaultValue = "",
  disabled,
  form,
  id,
  max,
  min,
  name,
  onBlur,
  onChange,
  onFocus,
  onKeyDown,
  placeholder,
  readOnly,
  required,
  type = "date",
  value,
  ...buttonProps
}, forwardedRef) => {
  const isDateTime = type === "datetime-local";
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(String(defaultValue ?? ""));
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() =>
    clampCalendarView(parseIsoDate(value ?? defaultValue) ?? new Date(), min, max),
  );
  const [draftDate, setDraftDate] = useState(() =>
    parseIsoDate(value ?? defaultValue) ?? new Date(),
  );
  const [draftTime, setDraftTime] = useState(() =>
    getTimeFromDateTimeValue(value ?? defaultValue, getCurrentTime()),
  );
  const [popupStyle, setPopupStyle] = useState({ left: 8, top: 8, width: 304 });
  const anchorRef = useRef(null);
  const hiddenInputRef = useRef(null);
  const popupRef = useRef(null);
  const controlledRef = useRef(isControlled);
  const currentValue = String(isControlled ? value ?? "" : internalValue);
  const selectedDate = parseIsoDate(currentValue);

  controlledRef.current = isControlled;

  const assignInputRef = useCallback((node) => {
    hiddenInputRef.current = node;

    if (node && !node.dataset.appDateValueBridge) {
      const descriptor = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      );

      if (descriptor?.get && descriptor?.set) {
        Object.defineProperty(node, "value", {
          configurable: true,
          get: () => descriptor.get.call(node),
          set: (nextValue) => {
            descriptor.set.call(node, nextValue);
            if (!controlledRef.current) {
              setInternalValue(String(nextValue ?? ""));
            }
          },
        });
        node.dataset.appDateValueBridge = "true";
      }

      node.focus = () => anchorRef.current?.focus();
    }

    if (typeof forwardedRef === "function") {
      forwardedRef(node);
    } else if (forwardedRef) {
      forwardedRef.current = node;
    }
  }, [forwardedRef]);

  useLayoutEffect(() => {
    const input = hiddenInputRef.current;
    if (!input) return;

    if (isControlled) {
      if (input.value !== currentValue) input.value = currentValue;
      return;
    }

    if (input.value !== internalValue) setInternalValue(input.value ?? "");
  }, [currentValue, internalValue, isControlled]);

  const updatePopupPosition = useCallback(() => {
    if (!anchorRef.current) return;

    const rect = anchorRef.current.getBoundingClientRect();
    const width = Math.min(isDateTime ? 328 : 304, window.innerWidth - 16);
    const estimatedHeight = isDateTime ? 442 : 386;
    const roomBelow = window.innerHeight - rect.bottom;
    const top = roomBelow >= estimatedHeight || rect.top < estimatedHeight
      ? Math.min(rect.bottom + 8, window.innerHeight - estimatedHeight - 8)
      : Math.max(8, rect.top - estimatedHeight - 8);
    const left = Math.min(
      Math.max(8, rect.left),
      Math.max(8, window.innerWidth - width - 8),
    );

    setPopupStyle({ left, top: Math.max(8, top), width });
  }, [isDateTime]);

  const openPicker = useCallback(() => {
    if (disabled || readOnly) return;

    const initialDate = parseIsoDate(currentValue) ?? new Date();
    setDraftDate(initialDate);
    setDraftTime(getTimeFromDateTimeValue(currentValue, getCurrentTime()));
    setViewDate(clampCalendarView(initialDate, min, max));
    setIsOpen(true);
  }, [currentValue, disabled, max, min, readOnly]);

  const closePicker = useCallback((shouldFocus = false) => {
    setIsOpen(false);
    onBlur?.({
      currentTarget: hiddenInputRef.current,
      target: hiddenInputRef.current,
      type: "blur",
    });
    if (shouldFocus) window.requestAnimationFrame(() => anchorRef.current?.focus());
  }, [onBlur]);

  const handleButtonBlur = (event) => {
    if (isOpen || popupRef.current?.contains(event.relatedTarget)) return;
    onBlur?.({
      currentTarget: hiddenInputRef.current,
      target: hiddenInputRef.current,
      type: "blur",
    });
  };

  const handleButtonKeyDown = (event) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;

    if ((event.key === "ArrowDown" || event.key === "Enter") && !isOpen) {
      event.preventDefault();
      openPicker();
    }
  };

  const commitValue = useCallback((nextValue, shouldClose = true) => {
    const input = hiddenInputRef.current;
    if (!input) return;

    input.value = nextValue;
    if (!isControlled) setInternalValue(nextValue);
    onChange?.({
      currentTarget: input,
      target: input,
      type: "change",
    });

    if (shouldClose) closePicker(true);
  }, [closePicker, isControlled, onChange]);

  useEffect(() => {
    if (!isOpen) return undefined;

    updatePopupPosition();
    const handlePointerDown = (event) => {
      if (
        !anchorRef.current?.contains(event.target) &&
        !popupRef.current?.contains(event.target)
      ) {
        closePicker();
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closePicker(true);
      }
    };
    const handleViewportChange = () => updatePopupPosition();

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [closePicker, isOpen, updatePopupPosition]);

  useEffect(() => {
    if (!isOpen) return;
    const parsedValue = parseIsoDate(currentValue);
    if (parsedValue) setDraftDate(parsedValue);
  }, [currentValue, isOpen]);

  const calendarDays = useMemo(() => getCalendarDays(viewDate), [viewDate]);
  const yearOptions = useMemo(
    () => getYearRange(min, max, selectedDate ?? draftDate),
    [draftDate, max, min, selectedDate],
  );
  const todayValue = toIsoDate(new Date());
  const selectedValue = toIsoDate(isDateTime ? draftDate : selectedDate);
  const previousBoundary = getMonthBoundary(viewDate, -1);
  const nextBoundary = getMonthBoundary(viewDate, 1);
  const previousDisabled = Boolean(min && toIsoDate(previousBoundary) < String(min).slice(0, 10));
  const nextDisabled = Boolean(max && toIsoDate(nextBoundary) > String(max).slice(0, 10));
  const displayValue = formatDatePickerValue(currentValue, type);
  const popupId = `${id}-calendar-popup`;

  const changeMonth = (month) => {
    setViewDate((current) => clampCalendarView(
      new Date(current.getFullYear(), month, 1, 12),
      min,
      max,
    ));
  };

  const changeYear = (year) => {
    setViewDate((current) => clampCalendarView(
      new Date(year, current.getMonth(), 1, 12),
      min,
      max,
    ));
  };

  const selectDate = (date) => {
    if (!isDateWithinBounds(date, min, max)) return;

    setDraftDate(date);
    setViewDate(new Date(date.getFullYear(), date.getMonth(), 1, 12));
    if (!isDateTime) commitValue(toIsoDate(date));
  };

  const selectToday = () => {
    const now = new Date();
    if (!isDateWithinBounds(now, min, max)) return;

    if (isDateTime) {
      setDraftDate(now);
      setDraftTime(getCurrentTime());
      setViewDate(new Date(now.getFullYear(), now.getMonth(), 1, 12));
    } else {
      commitValue(toIsoDate(now));
    }
  };

  const applyDateTime = () => {
    const nextValue = `${toIsoDate(draftDate)}T${draftTime || "00:00"}`;
    const minimumValue = normalizeDateTimeBound(min);
    const maximumValue = normalizeDateTimeBound(max, true);
    if (
      (minimumValue && nextValue < minimumValue) ||
      (maximumValue && nextValue > maximumValue)
    ) return;
    commitValue(nextValue);
  };

  const timeMin = isDateTime && min && toIsoDate(draftDate) === String(min).slice(0, 10)
    ? getTimeFromDateTimeValue(min, "00:00")
    : undefined;
  const timeMax = isDateTime && max && toIsoDate(draftDate) === String(max).slice(0, 10)
    ? getTimeFromDateTimeValue(max, "23:59")
    : undefined;

  return (
    <>
      <input
        defaultValue={defaultValue}
        form={form}
        name={name}
        ref={assignInputRef}
        type="hidden"
      />
      <button
        {...buttonProps}
        ref={anchorRef}
        id={id}
        type="button"
        autoFocus={autoFocus}
        disabled={disabled}
        aria-controls={isOpen ? popupId : undefined}
        aria-describedby={ariaDescribedBy}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-invalid={ariaInvalid}
        aria-label={ariaLabel}
        aria-required={(ariaRequired ?? required) || undefined}
        className={clsx(
          "relative flex items-center text-left disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400",
          className,
        )}
        onBlur={handleButtonBlur}
        onClick={() => (isOpen ? closePicker() : openPicker())}
        onFocus={onFocus}
        onKeyDown={handleButtonKeyDown}
      >
        <span className={clsx("min-w-0 flex-1 truncate", !displayValue && "text-slate-400")}>
          {displayValue || placeholder || (isDateTime ? "DD-MM-YYYY, HH:mm" : "DD-MM-YYYY")}
        </span>
        {isDateTime ? (
          <Clock3 className="ml-2 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
        ) : (
          <CalendarDays className="ml-2 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
        )}
      </button>

      {isOpen && typeof document !== "undefined" ? createPortal(
        <div
          ref={popupRef}
          id={popupId}
          role="dialog"
          aria-label={isDateTime ? "Choose date and time" : "Choose date"}
          className="fixed max-h-[calc(100vh-1rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-[0_20px_55px_-15px_rgba(15,23,42,0.32)]"
          style={{ ...popupStyle, zIndex: 10000 }}
        >
          <div className="border-b border-slate-100 bg-slate-50/80 px-3 py-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={previousDisabled}
                aria-label="Previous month"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white hover:text-brand hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-30"
                onClick={() => setViewDate((current) => clampCalendarView(
                  new Date(current.getFullYear(), current.getMonth() - 1, 1, 12),
                  min,
                  max,
                ))}
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </button>
              <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_88px] gap-2">
                <div className="relative min-w-0">
                  <select
                    aria-label="Month"
                    className="h-8 w-full appearance-none rounded-lg border border-slate-200 bg-white py-0 pl-3 pr-9 text-xs font-semibold text-slate-800 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                    value={viewDate.getMonth()}
                    onChange={(event) => changeMonth(Number(event.target.value))}
                  >
                    {MONTHS.map((month, index) => (
                      <option key={month} value={index}>{month}</option>
                    ))}
                  </select>
                  <ChevronDown
                    className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
                    aria-hidden="true"
                  />
                </div>
                <div className="relative min-w-0">
                  <select
                    aria-label="Year"
                    className="h-8 w-full appearance-none rounded-lg border border-slate-200 bg-white py-0 pl-3 pr-8 text-xs font-semibold text-slate-800 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                    value={viewDate.getFullYear()}
                    onChange={(event) => changeYear(Number(event.target.value))}
                  >
                    {yearOptions.map((year) => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                  <ChevronDown
                    className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
                    aria-hidden="true"
                  />
                </div>
              </div>
              <button
                type="button"
                disabled={nextDisabled}
                aria-label="Next month"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white hover:text-brand hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-30"
                onClick={() => setViewDate((current) => clampCalendarView(
                  new Date(current.getFullYear(), current.getMonth() + 1, 1, 12),
                  min,
                  max,
                ))}
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="p-3">
            <div className="grid grid-cols-7 gap-1" aria-hidden="true">
              {WEEKDAYS.map((weekday) => (
                <span
                  key={weekday}
                  className="flex h-7 items-center justify-center text-[10px] font-bold uppercase tracking-wide text-slate-400"
                >
                  {weekday}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1" role="grid">
              {calendarDays.map((date) => {
                const dateValue = toIsoDate(date);
                const isCurrentMonth = date.getMonth() === viewDate.getMonth();
                const isSelected = dateValue === selectedValue;
                const isToday = dateValue === todayValue;
                const isDisabled = !isDateWithinBounds(date, min, max);

                return (
                  <button
                    key={dateValue}
                    type="button"
                    role="gridcell"
                    disabled={isDisabled}
                    aria-current={isToday ? "date" : undefined}
                    aria-label={date.toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                    aria-selected={isSelected}
                    className={clsx(
                      "relative flex h-8 items-center justify-center rounded-lg text-xs font-medium outline-none transition",
                      "focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1",
                      isSelected
                        ? "bg-brand font-semibold text-white shadow-sm shadow-brand/25"
                        : isCurrentMonth
                          ? "text-slate-700 hover:bg-brand-light hover:text-brand"
                          : "text-slate-300 hover:bg-slate-50 hover:text-slate-500",
                      isToday && !isSelected && "ring-1 ring-inset ring-brand text-brand",
                      isDisabled && "cursor-not-allowed opacity-25 hover:bg-transparent hover:text-slate-400",
                    )}
                    onClick={() => selectDate(date)}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>

            {isDateTime ? (
              <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                <label htmlFor={`${id}-time`} className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                  <Clock3 className="h-4 w-4 text-brand" aria-hidden="true" />
                  Time
                </label>
                <input
                  id={`${id}-time`}
                  type="time"
                  min={timeMin}
                  max={timeMax}
                  value={draftTime}
                  className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-800 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                  onInput={(event) => setDraftTime(event.currentTarget.value)}
                  onChange={(event) => setDraftTime(event.target.value)}
                />
              </div>
            ) : null}
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/70 px-3 py-2.5">
            <button
              type="button"
              className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-white hover:text-slate-800"
              onClick={() => commitValue("")}
            >
              Clear
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={!isDateWithinBounds(new Date(), min, max)}
                className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-brand transition hover:bg-brand-light disabled:cursor-not-allowed disabled:opacity-40"
                onClick={selectToday}
              >
                Today
              </button>
              {isDateTime ? (
                <button
                  type="button"
                  className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-brand/30 focus:ring-offset-1"
                  onClick={applyDateTime}
                >
                  Apply
                </button>
              ) : null}
            </div>
          </div>
        </div>,
        document.body,
      ) : null}
    </>
  );
});

AppDateInput.displayName = "AppDateInput";

export default AppDateInput;
