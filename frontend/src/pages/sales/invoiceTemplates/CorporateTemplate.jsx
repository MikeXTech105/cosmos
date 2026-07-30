import {
  CustomerBlock,
  ItemsTable,
  MetaGrid,
  NotesAndTerms,
  TaxBreakup,
  TemplatePage,
  TotalsBlock,
} from "./InvoiceTemplateShared";
import { COMPANY_PROFILE } from "./companyProfile";

const CorporateTemplate = ({ invoice }) => {
  return (
    <TemplatePage>
      <div className="grid gap-8 sm:grid-cols-[220px_1fr]">
        <aside
          aria-label="Company information"
          className="rounded-2xl bg-slate-950 p-6 text-white"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl font-bold text-slate-950">
            C
          </div>
          <h2 className="mt-6 text-xl font-bold">{COMPANY_PROFILE.name}</h2>
          <p className="mt-3 text-xs leading-5 text-white/65">
            {COMPANY_PROFILE.address}
          </p>
          <p className="mt-4 text-xs text-white/65">
            {COMPANY_PROFILE.phone}
          </p>
          <p className="mt-1 text-xs text-white/65">
            {COMPANY_PROFILE.email}
          </p>
          <p className="mt-4 text-xs font-semibold text-white/80">
            {COMPANY_PROFILE.gstin}
          </p>
        </aside>

        <section aria-label="Invoice summary">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
                Corporate Invoice
              </p>
              <h1 className="mt-2 text-3xl font-bold text-slate-950">
                {invoice.invoiceNumber}
              </h1>
            </div>
            <div className="min-w-64">
              <MetaGrid invoice={invoice} boxed />
            </div>
          </div>

          <div className="mt-8 grid gap-6 rounded-2xl border border-slate-200 p-6 sm:grid-cols-2">
            <CustomerBlock invoice={invoice} />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Bank / Terms
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {COMPANY_PROFILE.bank}
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                {invoice.amountInWords}
              </p>
            </div>
          </div>
        </section>
      </div>

      <div className="mt-8">
        <ItemsTable invoice={invoice} accentClass="bg-slate-800 text-white" />
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-[1fr_320px]">
        <TaxBreakup invoice={invoice} />
        <TotalsBlock invoice={invoice} accent="text-brand" />
      </div>

      <div className="mt-8">
        <NotesAndTerms invoice={invoice} />
      </div>
    </TemplatePage>
  );
};

export default CorporateTemplate;
