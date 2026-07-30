import {
  CompanyBlock,
  CustomerBlock,
  ItemsTable,
  MetaGrid,
  NotesAndTerms,
  TaxBreakup,
  TemplatePage,
  TotalsBlock,
} from "./InvoiceTemplateShared";

const ClassicTemplate = ({ invoice }) => {
  return (
    <TemplatePage className="font-serif">
      <div className="border-2 border-slate-900 p-6">
        <div className="flex items-start justify-between gap-8 border-b-2 border-slate-900 pb-5">
          <CompanyBlock />
          <div className="min-w-60">
            <MetaGrid invoice={invoice} />
          </div>
        </div>

        <div className="grid gap-8 border-b border-slate-300 py-5 sm:grid-cols-2">
          <CustomerBlock invoice={invoice} />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Amount In Words
            </p>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-800">
              {invoice.amountInWords}
            </p>
          </div>
        </div>

        <div className="mt-5">
          <ItemsTable
            invoice={invoice}
            accentClass="bg-slate-900 text-white"
          />
        </div>

        <div className="mt-6 grid gap-6 sm:grid-cols-[1fr_300px]">
          <TaxBreakup invoice={invoice} />
          <TotalsBlock invoice={invoice} accent="text-slate-950" />
        </div>

        <div className="mt-8 border-t border-slate-300 pt-5">
          <NotesAndTerms invoice={invoice} />
        </div>
      </div>
    </TemplatePage>
  );
};

export default ClassicTemplate;
