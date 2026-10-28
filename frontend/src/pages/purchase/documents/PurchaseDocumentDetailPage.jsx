import useFormReturnContext from "../../../hooks/useFormReturnContext";
import { ArrowLeft, Ban, CheckCircle2, Pencil, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import AppButton from "../../../components/common/AppButton";

import { quantityText } from "../../../utils/productionValues";
import GstDocumentLinks from "../../gst/GstDocumentLinks";
import PageHeader from "../../../components/common/PageHeader";
import useCapabilities from "../../../hooks/useCapabilities";



import {
  extractItems,
  formatCurrency,
  formatDate,
  getActionError,
  getBalanceAmount,
  getDocumentNumber,
  getDocumentTotals,
  getLineCalculations,
  getPaidAmount,
  getPaymentStatusMeta,
  getPaymentTypeLabel,
  getRecordTotal,
  getPurchaseStatusMeta,
  getSuccessMessage,
  getSupplierName,
} from "../purchaseHelpers";
import {
  PurchaseConfirmDialog,
  PurchaseStatusPill,
} from "../PurchaseShared";

import { purchaseDocumentActions } from "./purchaseLifecycle";
import PurchasePhysicalPanel from "../../manufacturing/integrations/PurchasePhysicalPanel";
import PurchaseBillReceiptPanel from "../../manufacturing/integrations/PurchaseBillReceiptPanel";

const PurchaseDocumentDetailPage = ({ config }) => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { returnState, savedState, returnToList } = useFormReturnContext(config.listPath);
  const state = useSelector((store) => store[config.selectorKey]);
  const capabilities = useCapabilities({
    actions: ["view", "update", "confirm", "cancel"],
    label: config.pageName ?? config.label,
    resource: [config.selectorKey, config.singularLabel, config.pluralLabel],
    route: config.routeBase,
  });
  const record =
    String(state.selected?.id ?? "") === String(id) ? state.selected : null;
  const allowedActions = purchaseDocumentActions(record, config.pluralLabel);
  const returnCapabilities = useCapabilities({ actions: ["create"], pageName: "PurchaseExpense.PurchaseReturn", route: "/purchase/returns", resource: "purchaseReturns" });
  const [confirmation, setConfirmation] = useState({
    action: "confirm",
    isLoading: false,
    isOpen: false,
  });

  const loadRecord = useCallback(async () => {
    try {
      await dispatch(config.detailThunk(id)).unwrap();
      return true;
    } catch (error) {
      toast.error(getActionError(error, "Unable to load details."));
      return false;
    }
  }, [config, dispatch, id]);

  useEffect(() => {
    void Promise.resolve().then(loadRecord);
  }, [loadRecord]);

  const lineItems = useMemo(() => (record ? extractItems(record) : []), [record]);
  const totals = useMemo(
    () =>
      getDocumentTotals({
        discountAmount: record?.discountAmount,
        items: lineItems,
        paidAmount: record?.paidAmount,
        roundOff: record?.roundOff,
      }),
    [lineItems, record],
  );

  const runAction = async () => {
    const permissionMap = {
      cancel: capabilities.canCancel,
      confirm: capabilities.canConfirm,
    };

    if (!record || !permissionMap[confirmation.action] || !allowedActions[confirmation.action]) {
      return;
    }

    setConfirmation((current) => ({ ...current, isLoading: true }));

    try {
      const actionMap = {
        cancel: config.cancelThunk,
        confirm: config.confirmThunk,
      };
      const response = await dispatch(actionMap[confirmation.action](id)).unwrap();

      savedState(record.id);
      toast.success(getSuccessMessage(response, "Action completed"));
      setConfirmation({ action: "confirm", isLoading: false, isOpen: false });
      await loadRecord();
    } catch (error) {
      toast.error(getActionError(error, "Unable to complete action."));
      setConfirmation((current) => ({ ...current, isLoading: false }));
    }
  };

  const Icon = config.icon;

  const openEdit = () => {
    if (!capabilities.canUpdate || !record || !allowedActions.edit) {
      return;
    }

    navigate(`${config.routeBase}/${record.id}/edit`,{state:returnState()});
  };

  const openAction = (action) => {
    const permissionMap = {
      cancel: capabilities.canCancel,
      confirm: capabilities.canConfirm,
    };

    if (!permissionMap[action] || !allowedActions[action]) {
      return;
    }

    setConfirmation({
      action,
      isLoading: false,
      isOpen: true,
    });
  };

  if (state.detailLoading && !record) {
    return (
      <section className="space-y-5">
        <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
        <div className="h-[560px] animate-pulse rounded-2xl bg-slate-100" />
      </section>
    );
  }

  if (state.detailError && !record) {
    return (
      <section className="space-y-5">
        <PageHeader
          title={`${config.singularLabel} Not Available`}
          description={state.detailError}
          actions={
            <AppButton
              variant="secondary"
              className="h-10"
              onClick={() => returnToList()}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </AppButton>
          }
        />
      </section>
    );
  }

  return (
    <section className="min-w-0 space-y-5">
      <PageHeader
        badge={
          <>
            <Icon className="h-3.5 w-3.5" />
            Purchase & Expense
          </>
        }
        title={record ? getDocumentNumber(record, config.fallbackPrefix) : config.singularLabel}
        description={`${config.singularLabel} detail and preview.`}
        actions={
          <>
            <AppButton
              variant="secondary"
              className="h-10"
              onClick={() => returnToList()}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </AppButton>
            <AppButton
              variant="secondary"
              className="h-10"
              disabled={state.detailLoading}
              onClick={loadRecord}
            >
              <RefreshCw
                className={`h-4 w-4 ${state.detailLoading ? "animate-spin" : ""}`}
              />
              Refresh
            </AppButton>
          </>
        }
      />

      {record && config.selectorKey === "purchaseBills" && <GstDocumentLinks id={record.id} purchase />}
      {record && config.selectorKey === "purchaseOrders" && <PurchasePhysicalPanel record={record} onSaved={loadRecord} />}
      {record && config.selectorKey === "purchaseBills" && <PurchaseBillReceiptPanel record={record} onSaved={loadRecord} />}
      {record && (
        <>
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Supplier
                  </p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {getSupplierName(record)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Date
                  </p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {formatDate(record[config.dateField])}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Total
                  </p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {formatCurrency(getRecordTotal(record) || totals.grandTotal)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Status
                  </p>
                  <div className="mt-1">
                    <PurchaseStatusPill meta={getPurchaseStatusMeta(record.status, config.statusKind)} />
                  </div>
                </div>
                {config.selectorKey === "purchaseBills" && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Payment
                    </p>
                    <div className="mt-1">
                      <PurchaseStatusPill meta={getPaymentStatusMeta(record.paymentStatus)} />
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap gap-2">
                {capabilities.canUpdate && allowedActions.edit && (
                  <AppButton
                    variant="secondary"
                    className="h-10 rounded-lg px-3"
                    onClick={openEdit}
                  >
                    <Pencil className="h-4 w-4" />
                    Edit
                  </AppButton>
                )}
                {config.supportsConfirm && capabilities.canConfirm && allowedActions.confirm && (
                  <AppButton
                    className="h-10 rounded-lg px-3"
                    onClick={() => openAction("confirm")}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Confirm
                  </AppButton>
                )}
                {config.supportsCancel && capabilities.canCancel && allowedActions.cancel && (
                  <AppButton
                    variant="danger"
                    className="h-10 rounded-lg px-3"
                    onClick={() => openAction("cancel")}
                  >
                    <Ban className="h-4 w-4" />
                    Cancel
                  </AppButton>
                )}
                {allowedActions.return && returnCapabilities.canCreate && <AppButton variant="secondary" onClick={() => navigate(`/purchase/returns/new?purchaseBillId=${record.id}`,{state:returnState()})}>Return against this bill</AppButton>}
              </div>
              {!allowedActions.edit && <p className="mt-3 text-xs text-slate-500">This document's posted or linked lines are protected. Use the linked receipt, return or approved correction workflow.</p>}
            </section>
          </div>

          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-900">
                Line Items
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] table-fixed text-left text-sm">
                <thead className="bg-white text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-3 font-semibold">Item</th>
                    <th className="px-3 py-3 text-right font-semibold">Qty</th>
                    <th className="px-3 py-3 text-right font-semibold">Price</th>
                    <th className="px-3 py-3 text-right font-semibold">Discount</th>
                    <th className="px-3 py-3 text-right font-semibold">Tax</th>
                    <th className="px-3 py-3 text-right font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((line, index) => {
                    const calc = getLineCalculations(line);

                    return (
                      <tr key={`${line.itemId}-${index}`} className="border-t border-slate-100">
                        <td className="px-3 py-3 font-semibold text-slate-900">
                          {line.itemName || `Item ${index + 1}`}
                        </td>
                        <td className="px-3 py-3 text-right text-slate-600">
                          {quantityText(line.quantity, { scale: 6 })}
                        </td>
                        <td className="px-3 py-3 text-right text-slate-600">
                          {formatCurrency(line.purchasePrice)}
                        </td>
                        <td className="px-3 py-3 text-right text-slate-600">
                          {formatCurrency(calc.discountAmount)}
                        </td>
                        <td className="px-3 py-3 text-right text-slate-600">
                          {formatCurrency(calc.taxAmount)}
                        </td>
                        <td className="px-3 py-3 text-right font-semibold text-slate-900">
                          {formatCurrency(calc.lineTotal)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">Notes</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {record.notes || record.termsAndConditions || record.reason || "No notes added."}
              </p>
            </section>
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">Totals</h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-500">Subtotal</dt>
                  <dd className="font-semibold text-slate-900">
                    {formatCurrency(totals.subTotal)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Discount</dt>
                  <dd className="font-semibold text-slate-900">
                    {formatCurrency(totals.totalDiscount)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Tax</dt>
                  <dd className="font-semibold text-slate-900">
                    {formatCurrency(totals.taxAmount)}
                  </dd>
                </div>
                {config.supportsPaymentType && (
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Payment Type</dt>
                    <dd className="font-semibold text-slate-900">
                      {getPaymentTypeLabel(record.paymentType)}
                    </dd>
                  </div>
                )}
                <div className="flex justify-between border-t border-slate-200 pt-3">
                  <dt className="font-semibold text-slate-900">Grand Total</dt>
                  <dd className="text-lg font-bold text-brand">
                    {formatCurrency(getRecordTotal(record) || totals.grandTotal)}
                  </dd>
                </div>
                {config.supportsPaidAmount && (
                  <>
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Paid</dt>
                      <dd className="font-semibold text-emerald-700">
                        {formatCurrency(getPaidAmount(record))}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="font-semibold text-slate-900">Balance</dt>
                      <dd className="font-bold text-red-600">
                        {formatCurrency(getBalanceAmount(record) || totals.balanceAmount)}
                      </dd>
                    </div>
                  </>
                )}
              </dl>
            </section>
          </div>

          <PurchaseConfirmDialog
            confirmLabel={confirmation.action === "cancel" ? "Cancel" : "Confirm"}
            description={`${getDocumentNumber(record, config.fallbackPrefix)} will be ${confirmation.action}ed.`}
            isLoading={confirmation.isLoading}
            isOpen={confirmation.isOpen}
            title={`${confirmation.action === "cancel" ? "Cancel" : "Confirm"} ${config.singularLabel}?`}
            tone={confirmation.action === "cancel" ? "danger" : "primary"}
            onCancel={() =>
              setConfirmation({
                action: "confirm",
                isLoading: false,
                isOpen: false,
              })
            }
            onConfirm={runAction}
          />
        </>
      )}
    </section>
  );
};

export default PurchaseDocumentDetailPage;
