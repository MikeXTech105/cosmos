export const NotesField = ({ disabled, error, id, label, onChange, value }) => (
  <div>
    <label className="mb-1.5 block text-[13px] font-medium text-slate-700" htmlFor={id}>
      {label}
    </label>
    <textarea
      className={[
        "min-h-24 w-full rounded-lg border bg-white px-4 py-3 text-sm text-slate-800 outline-none transition",
        error ? "border-red-400 bg-red-50" : "border-slate-200 focus:border-brand focus:ring-2 focus:ring-brand/20",
      ].join(" ")}
      disabled={disabled}
      id={id}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
    {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
  </div>
);

export const MasterDataNotice = ({ children }) => (
  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600">
    {children}
  </div>
);
