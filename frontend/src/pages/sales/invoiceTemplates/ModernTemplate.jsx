import {
  CompanyBlock,
  CustomerBlock,
  ItemsTable,
  MetaGrid,
  NotesAndTerms,
  TemplatePage,
  TotalsBlock,
} from "./InvoiceTemplateShared";

const ModernTemplate = ({ invoice }) => {
  return (
    <TemplatePage>
      <div className="-mx-8 -mt-8 bg-brand px-8 py-7 text-white">
        <div className="flex items-start justify-between gap-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
              Invoice
            </p>
            <h1 className="mt-2 text-4xl font-bold">
              {invoice.invoiceNumber}
            </h1>
          </div>
          <div className="text-right text-sm">
            <p className="text-lg font-bold">COSMOS ERP</p>
            <p className="mt-1 text-white/75">Professional billing document</p>
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-8 sm:grid-cols-[1fr_280px]">
        <CompanyBlock />
        <MetaGrid invoice={invoice} boxed />
      </div>

      <div className="mt-8 rounded-2xl bg-slate-50 p-5">
        <CustomerBlock invoice={invoice} />
      </div>

      <div className="mt-8">
        <ItemsTable invoice={invoice} accentClass="bg-brand text-white" />
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-[1fr_320px]">
        <div className="rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            Amount In Words
          </p>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-800">
            {invoice.amountInWords}
          </p>
        </div>
        <TotalsBlock invoice={invoice} />
      </div>

      <div className="mt-8">
        <NotesAndTerms invoice={invoice} />
      </div>
    </TemplatePage>
  );
};

export default ModernTemplate;
