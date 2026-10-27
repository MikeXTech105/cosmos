import { formatCurrency, formatDate, formatNumber } from "../invoices/invoiceHelpers";
import { addDecimal, quantityText } from "../../../utils/productionValues";
import { COMPANY_PROFILE } from "./companyProfile";
import "./wewelInvoice.css";

const Cell = ({ label, value }) => <div className="wewel-meta"><span>{label}</span><strong>{value ?? "—"}</strong></div>;
const Party = ({ title, party }) => <div className="wewel-party"><p>{title}</p><strong>{party.name || "—"}</strong>{party.address && <p>{party.address}</p>}{party.gstin && <p>GSTIN: {party.gstin}</p>}</div>;

const ClassicTemplate = ({ invoice }) => {
  const taxes = Object.values(invoice.items.reduce((groups, item) => {
    const key = `${item.hsn}-${item.taxPercentage}`;
    const group = groups[key] ||= { hsn: item.hsn, rate: item.taxPercentage, taxable: 0, tax: 0 };
    group.taxable += item.taxableAmount;
    group.tax += item.taxAmount;
    return groups;
  }, {}));
  return <article className="invoice-template wewel-invoice">
    <h1>{invoice.documentTitle || "TAX INVOICE"}</h1>
    <div className="wewel-frame">
      <div className="wewel-two-columns">
        <div className="wewel-party"><h2>{COMPANY_PROFILE.name}</h2>{COMPANY_PROFILE.address && <p>{COMPANY_PROFILE.address}</p>}{COMPANY_PROFILE.gstin && <p>GSTIN: {COMPANY_PROFILE.gstin}</p>}{invoice.purposeOfTransfer && <p>Purpose of transfer: {invoice.purposeOfTransfer}</p>}</div>
        <div className="wewel-meta-grid"><Cell label="Invoice No." value={invoice.invoiceNumber} /><Cell label="Date" value={formatDate(invoice.invoiceDate)} /><Cell label="e-Way Bill number" value={invoice.eWayBillNumber} /><Cell label="Place of supply" value={invoice.placeOfSupply} /><Cell label="PO No." value={invoice.purchaseOrderNumber} /><Cell label="Number of boxes" value={invoice.numberOfBoxes} /></div>
      </div>
      <div className="wewel-two-columns"><Party title="Bill To" party={invoice.customer} /><Party title="Ship To" party={invoice.shipTo || invoice.customer} /></div>
      <table className="wewel-items"><thead><tr>{["#", "Product Description", "HSN / SAC", "Quantity", "Unit", "Price / unit", "Taxable Value (INR)", "GST", "Amount"].map(label => <th key={label}>{label}</th>)}</tr></thead>
        <tbody>{invoice.items.map(item => <tr key={item.id}><td>{item.serial}</td><td><strong>{item.name}</strong></td><td>{item.hsn || "—"}</td><td className="wewel-number">{quantityText(item.quantity, { scale: 6 })}</td><td>{item.unit || "—"}</td><td className="wewel-number">{formatCurrency(item.rate)}</td><td className="wewel-number">{formatCurrency(item.taxableAmount)}</td><td className="wewel-number">{formatCurrency(item.taxAmount)}<br /><small>({formatNumber(item.taxPercentage)}%)</small></td><td className="wewel-number">{formatCurrency(item.lineTotal)}</td></tr>)}</tbody>
        <tfoot><tr><th colSpan={3}>Total</th><th className="wewel-number">{quantityText(invoice.items.reduce((sum, item) => addDecimal(sum, item.quantity ?? "0"), "0"), { scale: 6 })}</th><td colSpan={2}></td><th className="wewel-number">{formatCurrency(taxes.reduce((sum, tax) => sum + tax.taxable, 0))}</th><th className="wewel-number">{formatCurrency(invoice.taxAmount)}</th><th className="wewel-number">{formatCurrency(invoice.grandTotal)}</th></tr></tfoot>
      </table>
      <div className="wewel-two-columns"><div className="wewel-party"><p>Invoice Amount in Words</p><strong>{invoice.amountInWords}</strong>{invoice.notes && <><p>Description</p><p>{invoice.notes}</p></>}{invoice.termsAndConditions && <p>{invoice.termsAndConditions}</p>}</div><div className="wewel-totals">{[["Subtotal", invoice.subTotal], ["Discount", invoice.discountAmount], ["Tax", invoice.taxAmount], ["Total", invoice.grandTotal]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{formatCurrency(value)}</strong></div>)}</div></div>
      <table><thead><tr><th>HSN / SAC</th><th>Total Taxable Value (INR)</th><th>GST Rate</th><th>Tax Amount</th></tr></thead><tbody>{taxes.map(tax => <tr key={`${tax.hsn}-${tax.rate}`}><td>{tax.hsn || "—"}</td><td className="wewel-number">{formatCurrency(tax.taxable)}</td><td className="wewel-number">{formatNumber(tax.rate)}%</td><td className="wewel-number">{formatCurrency(tax.tax)}</td></tr>)}</tbody><tfoot><tr><th>Total</th><th className="wewel-number">{formatCurrency(taxes.reduce((sum, tax) => sum + tax.taxable, 0))}</th><td></td><th className="wewel-number">{formatCurrency(invoice.taxAmount)}</th></tr></tfoot></table>
      <div className="wewel-signature"><p>For: {COMPANY_PROFILE.name}</p><strong>Authorized Signatory</strong></div>
    </div>
    {invoice.irn && <div className="wewel-irn"><strong>e-Invoice</strong><p>IRN: {invoice.irn}</p></div>}
  </article>;
};
export default ClassicTemplate;

