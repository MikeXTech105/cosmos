import { REPORTS } from "../../api/endpoints";
import { runReport } from "./reportsService";

export const getPartyLedger = (params, options) =>
  runReport(REPORTS.parties.ledger, params, options);

export const getCustomerStatement = (params, options) =>
  runReport(REPORTS.parties.customerStatement, params, options);

export const getSupplierStatement = (params, options) =>
  runReport(REPORTS.parties.supplierStatement, params, options);

export const getReceivableAging = (params, options) =>
  runReport(REPORTS.parties.receivableAging, params, options);

export const getPayableAging = (params, options) =>
  runReport(REPORTS.parties.payableAging, params, options);

export const partyReportsService = {
  getCustomerStatement,
  getPartyLedger,
  getPayableAging,
  getReceivableAging,
  getSupplierStatement,
};
