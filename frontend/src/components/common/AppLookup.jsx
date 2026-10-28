import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, LoaderCircle, Plus, Search } from "lucide-react";
import { createPortal } from "react-dom";

const defaultValue = (item) => item.value ?? item.id;
const defaultLabel = (item) => item.label ?? item.name ?? String(defaultValue(item));
const mergeItems = (first, next, getValue) => [...new Map([...first, ...next].map((item) => [String(getValue(item)), item])).values()];

/** Server lookup: loadPage returns {items, hasMore}; IDs remain exact strings. */
export default function AppLookup(props) {
  return <LookupInput key={props.scopeKey ?? ""} {...props} />;
}

function LookupInput({
  value, onChange, loadPage, loadById, getOptionValue = defaultValue,
  getOptionLabel = defaultLabel, label, "aria-label": ariaLabel, id, name,
  placeholder = "Search and select", disabled = false, required = false,
  error, className = "", onCreate, createLabel = "Create new", initialOptions = [],
  pageSize = 40, scopeKey = "", onBlur,
}) {
  const generatedId = useId();
  const inputId = id ?? `lookup-${generatedId}`;
  const root = useRef(null);
  const input = useRef(null);
  const menu = useRef(null);
  const api = useRef({ loadPage, loadById, getOptionValue, getOptionLabel });
  useEffect(() => { api.current = { loadPage, loadById, getOptionValue, getOptionLabel }; });
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState(null);
  const [search, setSearch] = useState("");
  const [items, setItems] = useState([]);
  const [cache, setCache] = useState(initialOptions);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [hydrationError, setHydrationError] = useState("");
  const [retry, setRetry] = useState(0);
  const [active, setActive] = useState(0);
  const [creating, setCreating] = useState(false);
  const [focusRequest, setFocusRequest] = useState(0);
  const restoreAfterCreate = useRef(false);
  const suppressFocusSearch = useRef(false);
  const requestId = useRef(0);
  const currentValue = useRef(value);
  useEffect(() => { currentValue.current = value; }, [value]);
  const selected = [...initialOptions, ...cache, ...items].find((item) => String(getOptionValue(item)) === String(value));
  const options = mergeItems(search ? [] : initialOptions, items, getOptionValue);
  useEffect(() => {
    if (!creating && restoreAfterCreate.current) {
      restoreAfterCreate.current = false;
      suppressFocusSearch.current = true;
      input.current?.focus();
    }
  }, [creating, focusRequest]);

  useEffect(() => {
    const close = (event) => { if (!root.current?.contains(event.target) && !menu.current?.contains(event.target)) setOpen(false); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);
  const menuPosition = () => {
    const rect = input.current?.getBoundingClientRect();
    if (!rect) return null;
    const below = window.innerHeight - rect.bottom, above = rect.top;
    const width = Math.min(Math.max(rect.width, 220), window.innerWidth - 16);
    return { position: "fixed", width, left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)), ...(below >= 200 || below >= above ? { top: rect.bottom + 4, maxHeight: Math.max(80, Math.min(288, below - 12)) } : { bottom: window.innerHeight - rect.top + 4, maxHeight: Math.max(80, Math.min(288, above - 12)) }) };
  };
  useEffect(() => {
    if (!open) return;
    const reposition = () => setPosition(menuPosition());
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => { window.removeEventListener("scroll", reposition, true); window.removeEventListener("resize", reposition); };
  }, [open]);
  useEffect(() => {
    if (open) document.getElementById(`${inputId}-option-${active}`)?.scrollIntoView?.({ block: "nearest" });
  }, [active, inputId, open]);

  useEffect(() => {
    if (value === undefined || value === null || value === "" || selected || !api.current.loadById) return;
    const controller = new AbortController();
    const requestedValue = String(value);
    api.current.loadById(value, { signal: controller.signal }).then((item) => {
      if (item && !controller.signal.aborted && String(currentValue.current) === requestedValue) {
        setCache((existing) => mergeItems(existing, [item], api.current.getOptionValue));
        setHydrationError("");
      }
    }).catch((failure) => {
      if (!controller.signal.aborted) setHydrationError(failure?.response?.status === 403 ? "You cannot view the selected record. Your selection is retained." : "Unable to load the selected record. Your selection is retained.");
    });
    return () => controller.abort();
  }, [retry, scopeKey, selected, value]);

  useEffect(() => {
    if (!open || disabled) return;
    const controller = new AbortController();
    const sequence = ++requestId.current;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setRequestError("");
      try {
        const result = await api.current.loadPage({ search, page, pageSize, signal: controller.signal });
        if (controller.signal.aborted || sequence !== requestId.current) return;
        const rows = result?.items ?? [];
        setItems((previous) => page === 1 ? rows : mergeItems(previous, rows, api.current.getOptionValue));
        setCache((previous) => mergeItems(previous, rows, api.current.getOptionValue));
        setHasMore(Boolean(result?.hasMore));
      } catch (failure) {
        if (!controller.signal.aborted && sequence === requestId.current) setRequestError(failure?.response?.status === 403 ? "You do not have permission to search these records." : "Search failed. Your selection has been kept. Try again.");
      } finally {
        if (!controller.signal.aborted && sequence === requestId.current) setLoading(false);
      }
    }, search ? 250 : 0);
    return () => { controller.abort(); clearTimeout(timer); };
  }, [disabled, open, page, pageSize, retry, scopeKey, search]);

  const choose = (item) => {
    if (item.disabled || item.isActive === false) return;
    onChange?.(getOptionValue(item), item);
    setOpen(false);
    setSearch("");
    setPage(1);
    suppressFocusSearch.current = true;
    input.current?.focus();
  };
  const startSearch = () => { if (!open) { setPosition(menuPosition()); setOpen(true); setSearch(""); setPage(1); setActive(0); setRequestError(""); } };
  return <div ref={root} className={`relative min-w-0 ${className}`}>
    {label && <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-slate-700">{label}{required ? " *" : ""}</label>}
    <div className="relative">
      <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
      <input ref={input} id={inputId} name={name} role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={`${inputId}-list`} aria-activedescendant={open && options[active] ? `${inputId}-option-${active}` : undefined}
        aria-label={ariaLabel ?? label ?? placeholder} aria-required={required} aria-invalid={Boolean(error)} aria-describedby={[error || hydrationError ? `${inputId}-error` : null, requestError ? `${inputId}-request-error` : null].filter(Boolean).join(" ") || undefined}
        value={open ? search : selected ? getOptionLabel(selected) : value ? "Selected record" : ""} disabled={disabled || creating} placeholder={placeholder}
        onFocus={() => { if (!suppressFocusSearch.current) startSearch(); }} onClick={() => { suppressFocusSearch.current = false; startSearch(); }} onBlur={onBlur}
        onChange={(event) => { suppressFocusSearch.current = false; if (!open) { setPosition(menuPosition()); setOpen(true); } ++requestId.current; setSearch(event.target.value); setPage(1); setActive(0); setItems([]); setLoading(true); setRequestError(""); }}
        onKeyDown={(event) => {
          if (event.key === "Escape") { event.preventDefault(); setOpen(false); }
          if (event.key === "PageDown" && open && hasMore && !loading) { event.preventDefault(); setPage((number) => number + 1); }
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault(); suppressFocusSearch.current = false; startSearch();
            if (event.key === "ArrowDown" && open && (options.length === 0 || active >= options.length - 1) && menu.current?.querySelector("button")) menu.current.querySelector("button").focus();
            else setActive((index) => Math.max(0, Math.min(options.length - 1, index + (event.key === "ArrowDown" ? 1 : -1))));
          }
          if (event.key === "Enter" && open) { event.preventDefault(); if (options[active]) choose(options[active]); }
          if (event.key === "Tab") setOpen(false);
        }}
        className={`h-10 w-full rounded-lg border bg-white pl-9 pr-8 text-sm text-slate-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:bg-slate-100 ${error ? "border-rose-400" : "border-slate-200"}`} />
      {loading || creating ? <LoaderCircle aria-hidden="true" className="absolute right-3 top-3 h-4 w-4 animate-spin text-slate-400" /> : <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-400" />}
    </div>
    {open && !disabled && !creating && position && createPortal(<div ref={menu} style={position} onKeyDown={(event) => { if (event.key === "Escape" || event.key === "Tab") { event.preventDefault(); suppressFocusSearch.current = true; setOpen(false); input.current?.focus(); } }} className="z-[9999] overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
      <ul id={`${inputId}-list`} role="listbox" aria-label={ariaLabel ?? label ?? placeholder} aria-busy={loading}>
        {options.map((item, index) => <li key={String(getOptionValue(item))} id={`${inputId}-option-${index}`} role="option" aria-disabled={item.disabled || item.isActive === false || undefined} aria-selected={String(getOptionValue(item)) === String(value)} onPointerDown={(event) => event.preventDefault()} onClick={() => choose(item)} onMouseEnter={() => setActive(index)} className={`cursor-pointer rounded-lg px-3 py-2 text-sm ${item.disabled || item.isActive === false ? "cursor-not-allowed text-slate-400" : active === index ? "bg-brand-light text-brand" : "text-slate-700 hover:bg-slate-50"}`}>{getOptionLabel(item)}</li>)}
      </ul>
      {!loading && !requestError && options.length === 0 && <p role="status" className="p-3 text-sm text-slate-500">No matching records.</p>}
      {loading && <p role="status" className="p-2 text-sm text-slate-500">Searching…</p>}
      {requestError && <p id={`${inputId}-request-error`} role="alert" className="p-2 text-sm text-rose-700">{requestError}</p>}
      {requestError && <button type="button" onClick={() => setRetry((number) => number + 1)} className="p-2 text-sm font-semibold text-brand">Retry search</button>}
      {hasMore && !loading && !requestError && <button type="button" onClick={() => setPage((number) => number + 1)} className="w-full rounded-lg p-2 text-sm font-semibold text-brand">Load more results</button>}
      {onCreate && <button type="button" disabled={creating} onClick={async () => {
        let saved = false;
        setOpen(false);
        suppressFocusSearch.current = true;
        input.current?.focus();
        try {
          const outcome = onCreate(search);
          if (outcome?.then) setCreating(true);
          const created = await outcome;
          if (created) { saved = true; setCache((previous) => mergeItems(previous, [created], getOptionValue)); choose(created); }
        }
        catch { setRequestError("The record could not be created. Keep your entry and try again."); setPosition(menuPosition()); setOpen(true); }
        finally { restoreAfterCreate.current = saved; setCreating(false); if (saved) setFocusRequest((number) => number + 1); }
      }} className="flex w-full items-center gap-2 border-t border-slate-100 p-2 text-sm font-semibold text-brand"><Plus className="h-4 w-4" />{createLabel}</button>}
    </div>, document.body)}
    {!open && requestError && <p id={`${inputId}-request-error`} role="alert" className="mt-1 text-xs text-rose-700">{requestError}</p>}
    {(error || hydrationError) && <p id={`${inputId}-error`} role="alert" className="mt-1 text-xs text-rose-700">{error || hydrationError}{hydrationError && <button type="button" onClick={() => setRetry((number) => number + 1)} className="ml-2 underline">Retry</button>}</p>}
  </div>;
}
