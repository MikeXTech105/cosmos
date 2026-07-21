import AppModal from "../../../components/common/AppModal";

const RojmelDetailModal = ({ fields, isLoading, isOpen, onClose, title }) => (
  <AppModal isOpen={isOpen} maxWidth="max-w-2xl" onClose={onClose} title={title}>
    {isLoading ? (
      <div className="space-y-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="h-11 animate-pulse rounded-xl bg-slate-100" />
        ))}
      </div>
    ) : (
      <dl className="grid gap-3 sm:grid-cols-2">
        {fields.map((field) => (
          <div key={field.label} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {field.label}
            </dt>
            <dd className="mt-1 break-words text-sm font-medium text-slate-800">
              {field.value ?? "-"}
            </dd>
          </div>
        ))}
      </dl>
    )}
  </AppModal>
);

export default RojmelDetailModal;
