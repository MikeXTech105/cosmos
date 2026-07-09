import {
  CompanyBlock,
  CustomerBlock,
  ItemsTable,
  MetaGrid,
  NotesAndTerms,
  TemplatePage,
  TotalsBlock,
} from "./InvoiceTemplateShared";

const MinimalTemplate = ({ invoice }) => {
  return (
    <TemplatePage className="shadow-none">
      <div className="flex items-start justify-between gap-10 border-b border-slate-200 pb-8">
        <CompanyBlock />
        <div className="text-right">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
            Invoice
          </h1>
          <p className="mt-2 text-sm font-medium text-slate-500">
            {invoice.invoiceNumber}
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-8 sm:grid-cols-2">
        <CustomerBlock invoice={invoice} />
        <MetaGrid invoice={invoice} />
      </div>

      <div className="mt-10">
        <ItemsTable
          invoice={invoice}
          accentClass="border-b border-slate-300 bg-white text-slate-500"
          bordered={false}
        />
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-[1fr_300px]">
        <div className="text-xs leading-5 text-slate-500">
          <p className="font-semibold uppercase tracking-[0.16em] text-slate-400">
            Amount In Words
          </p>
          <p className="mt-2">{invoice.amountInWords}</p>
        </div>
        <TotalsBlock invoice={invoice} accent="text-slate-950" />
      </div>

      <div className="mt-10 border-t border-slate-200 pt-6">
        <NotesAndTerms invoice={invoice} />
      </div>
    </TemplatePage>
  );
};

export default MinimalTemplate;
