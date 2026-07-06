import {
  CustomerBlock,
  ItemsTable,
  MetaGrid,
  NotesAndTerms,
  TemplatePage,
  TotalsBlock,
} from "./InvoiceTemplateShared";
import { COMPANY_PROFILE } from "./companyProfile";

const CompactTemplate = ({ invoice }) => {
  return (
    <TemplatePage className="p-5">
      <div className="flex items-start justify-between gap-6 border-b border-slate-300 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-950">
            {COMPANY_PROFILE.name}
          </h1>
          <p className="mt-1 max-w-md text-[11px] leading-4 text-slate-500">
            {COMPANY_PROFILE.address} | {COMPANY_PROFILE.phone} |{" "}
            {COMPANY_PROFILE.email}
          </p>
          <p className="mt-1 text-[11px] font-semibold text-slate-600">
            {COMPANY_PROFILE.gstin}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            Sale Invoice
          </p>
          <p className="mt-1 text-lg font-bold text-slate-950">
            {invoice.invoiceNumber}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_260px]">
        <CustomerBlock invoice={invoice} />
        <MetaGrid invoice={invoice} />
      </div>

      <div className="mt-5">
        <ItemsTable
          invoice={invoice}
          accentClass="bg-slate-100 text-slate-700"
          dense
        />
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-[1fr_290px]">
        <div className="text-[11px] leading-5 text-slate-500">
          <p className="font-semibold uppercase tracking-[0.16em] text-slate-400">
            Amount In Words
          </p>
          <p className="mt-1 font-medium text-slate-700">
            {invoice.amountInWords}
          </p>
        </div>
        <TotalsBlock invoice={invoice} accent="text-slate-950" />
      </div>

      <div className="mt-5">
        <NotesAndTerms invoice={invoice} />
      </div>
    </TemplatePage>
  );
};

export default CompactTemplate;
