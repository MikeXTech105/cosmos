import { ArrowLeftRight, Eye, Plus, RefreshCw, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";

import AppButton from "../../../components/common/AppButton";
import { sumRojmelMoney } from "../../../utils/rojmelTotals";
import AppTooltip from "../../../components/common/AppTooltip";
import PageHeader from "../../../components/common/PageHeader";
import {
  cancelRojmelTransfer,
  createRojmelTransfer,
  fetchRojmelTransferById,
  fetchRojmelTransfers,
  setRojmelTransferFilters,
  setRojmelTransferPage,
  setRojmelTransferPageSize,
} from "../../../store/slices/rojmel/transferSlice";
import {
  fetchRojmelWalletBalance,
  fetchRojmelWallets,
} from "../../../store/slices/rojmel/walletSlice";
import { getApiErrorMessage } from "../../../utils/apiError";
import ReversalModal from "../components/ReversalModal";
import RojmelDetailModal from "../components/RojmelDetailModal";
import RojmelFilterBar from "../components/RojmelFilterBar";
import TransferFormModal from "../components/TransferFormModal";
import {
  buildRojmelQuery,
  formatRojmelCurrency,
  formatRojmelDate,
  getRojmelMonthRange,
  getRojmelSuccessMessage,
} from "../rojmelHelpers";
import {
  RojmelPagination,
  RojmelState,
  RojmelStatusPill,
} from "../RojmelShared";
import useRojmelCapabilities from "../useRojmelCapabilities";

const Action = ({ icon: Icon, label, onClick, warning }) => (
  <AppTooltip label={label}>
    <button
      type="button"
      aria-label={label}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 ${warning ? "hover:bg-amber-50 hover:text-amber-700" : "hover:bg-slate-100 hover:text-brand"}`}
      onClick={onClick}
    >
      <Icon className="h-4 w-4" />
    </button>
  </AppTooltip>
);

const TransfersPage = () => {
  const dispatch = useDispatch();
  const state = useSelector((root) => root.rojmelTransfers);
  const walletState = useSelector((root) => root.rojmelWallets);
  const capabilities = useRojmelCapabilities({
    label: "Rojmel.Transfers",
    resource: "rojmel.transfers",
    route: "/rojmel/transfers",
  });
  const initialized = useRef(false);
  const [formOpen, setFormOpen] = useState(false);
  const [reversal, setReversal] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [searchInput, setSearchInput] = useState(state.filters.Search);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    dispatch(setRojmelTransferFilters(getRojmelMonthRange()));
  }, [dispatch]);

  useEffect(() => {
    if (capabilities.isAdmin) {
      void dispatch(
        fetchRojmelWallets({
          IsActive: true,
          PageNumber: 1,
          PageSize: 200,
          SortBy: "walletName",
          SortDirection: "asc",
        }),
      );
    }
  }, [capabilities.isAdmin, dispatch]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      dispatch(setRojmelTransferFilters({ Search: searchInput }));
      dispatch(setRojmelTransferPage(1));
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [dispatch, searchInput]);

  const query = useMemo(
    () =>
      buildRojmelQuery({
        filters: state.filters,
        pageNumber: state.pageNumber,
        pageSize: state.pageSize,
      }),
    [state.filters, state.pageNumber, state.pageSize],
  );
  const loadTransfers = useCallback(
    () => dispatch(fetchRojmelTransfers(query)),
    [dispatch, query],
  );

  useEffect(() => {
    void Promise.resolve().then(loadTransfers);
  }, [loadTransfers]);

  const walletOptions = walletState.list.map((wallet) => ({
    label: `${wallet.walletName} · ${wallet.walletCode || "No code"}`,
    value: wallet.id,
  }));

  const refreshWalletsAndList = async (...walletIds) => {
    await Promise.all([
      loadTransfers(),
      ...walletIds.filter(Boolean).map((id) => dispatch(fetchRojmelWalletBalance(id))),
    ]);
  };

  const submitTransfer = async (payload) => {
    const response = await dispatch(createRojmelTransfer(payload)).unwrap();
    toast.success(getRojmelSuccessMessage(response, "Transfer posted"));
    setFormOpen(false);
    await refreshWalletsAndList(payload.fromWalletId, payload.toWalletId);
  };

  const reverseTransfer = async (reason) => {
    const response = await dispatch(
      cancelRojmelTransfer({ id: reversal.id, reason }),
    ).unwrap();
    toast.success(getRojmelSuccessMessage(response, "Transfer reversed"));
    const { fromWalletId, toWalletId } = reversal;
    setReversal(null);
    await refreshWalletsAndList(fromWalletId, toWalletId);
  };

  const viewTransfer = async (transfer) => {
    setDetailOpen(true);
    try {
      await dispatch(fetchRojmelTransferById(transfer.id)).unwrap();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Unable to load transfer details."));
    }
  };

  const selected = state.selected;
  const detailFields = selected
    ? [
        ["Transfer No", selected.transferNo],
        ["Date", formatRojmelDate(selected.transferDate)],
        ["From Wallet", selected.fromWalletName],
        ["To Wallet", selected.toWalletName],
        ["Amount", formatRojmelCurrency(selected.amount)],
        ["Reference No", selected.referenceNo],
        ["Description", selected.description],
        ["Transfer Out Txn ID", selected.transferOutTransactionId],
        ["Transfer In Txn ID", selected.transferInTransactionId],
        ["Cancel Reason", selected.cancelReason],
        ["Cancelled At", formatRojmelDate(selected.cancelledAt)],
        ["Created At", formatRojmelDate(selected.createdAt)],
      ].map(([label, value]) => ({ label, value }))
    : [];
  const filterControls = { ...state.filters, Search: searchInput };

  return (
    <section className="min-w-0 space-y-5">
      <PageHeader
        badge={
          <>
            <ArrowLeftRight className="h-3.5 w-3.5" />
            Rojmel / Transfers
          </>
        }
        title="Wallet Transfers"
        description="Money movement between wallets—always neutral, never income or expense."
        actions={
          <>
            <AppButton className="h-10" disabled={state.loading} variant="secondary" onClick={loadTransfers}>
              <RefreshCw className={`h-4 w-4 ${state.loading ? "animate-spin" : ""}`} />
              Refresh
            </AppButton>
            {capabilities.isAdmin && capabilities.canCreate && (
              <AppButton className="h-10" onClick={() => setFormOpen(true)}>
                <Plus className="h-4 w-4" /> New Transfer
              </AppButton>
            )}
          </>
        }
      />

      {!capabilities.isAdmin && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          Only transfers explicitly granted to your account are shown. Other wallets and wallet selectors remain hidden.
        </div>
      )}

      <RojmelFilterBar
        filters={filterControls}
        resultCount={state.list.length}
        showDates
        showStatus
        showWallet={capabilities.isAdmin}
        walletOptions={walletOptions}
        onChange={(patch) => {
          if (Object.hasOwn(patch, "Search")) setSearchInput(patch.Search);
          else {
            dispatch(setRojmelTransferFilters(patch));
            dispatch(setRojmelTransferPage(1));
          }
        }}
        onClear={() => {
          setSearchInput("");
          dispatch(
            setRojmelTransferFilters({
              ...getRojmelMonthRange(),
              Search: "",
              Status: "all",
              WalletId: "all",
            }),
          );
          dispatch(setRojmelTransferPage(1));
        }}
      />

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {state.loading || state.error || state.list.length === 0 ? (
          <RojmelState error={state.error} isLoading={state.loading} noun="transfers" onRetry={loadTransfers} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] table-fixed text-left">
              <thead className="bg-slate-50">
                <tr>
                  {["#", "Transfer No", "Date", "From Wallet → To Wallet", "Amount", "Status", "Actions"].map((heading) => (
                    <th key={heading} className={`border-b border-slate-200 px-3 py-3.5 text-xs font-medium uppercase tracking-wide text-slate-500 ${["Amount", "Actions"].includes(heading) ? "text-right" : ""}`}>
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {state.list.map((transfer, index) => {
                  const active = Number(transfer.status) === 1;
                  return (
                    <tr key={transfer.id} className="hover:bg-slate-50">
                      <td className="border-b border-slate-100 px-3 py-3.5 text-xs font-semibold tabular-nums text-slate-400">{(state.pageNumber - 1) * state.pageSize + index + 1}</td>
                      <td className="border-b border-slate-100 px-3 py-3.5 text-sm font-semibold text-slate-800">{transfer.transferNo || "-"}</td>
                      <td className="border-b border-slate-100 px-3 py-3.5 text-sm text-slate-600">{formatRojmelDate(transfer.transferDate)}</td>
                      <td className="border-b border-slate-100 px-3 py-3.5 text-sm font-medium text-slate-800">
                        <span className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-2.5 py-1.5 text-blue-800">
                          {transfer.fromWalletName} <ArrowLeftRight className="h-3.5 w-3.5" /> {transfer.toWalletName}
                        </span>
                      </td>
                      <td className="border-b border-slate-100 px-3 py-3.5 text-right text-sm font-semibold tabular-nums text-slate-900">{formatRojmelCurrency(transfer.amount)}</td>
                      <td className="border-b border-slate-100 px-3 py-3.5"><RojmelStatusPill value={transfer.status} /></td>
                      <td className="border-b border-slate-100 px-3 py-3.5">
                        <div className="flex items-center justify-end gap-0.5">
                          {capabilities.canView && <Action icon={Eye} label="View transfer" onClick={() => viewTransfer(transfer)} />}
                          {capabilities.isAdmin && capabilities.canCancel && active && (
                            <Action warning icon={RotateCcw} label="Reverse transfer" onClick={() => setReversal(transfer)} />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t border-slate-200 bg-slate-50 text-sm font-semibold text-slate-900">
                <tr>
                  <th scope="row" colSpan={4} className="px-3 py-4">Page total · cancelled excluded</th>
                  <td className="px-3 py-4 text-right tabular-nums">{formatRojmelCurrency(sumRojmelMoney(state.list, "amount", { excludeCancelled: true }))}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
        {!state.loading && !state.error && state.list.length > 0 && (
          <RojmelPagination
            disabled={state.loading}
            itemCount={state.list.length}
            itemLabel="transfers"
            onPageChange={(value) => dispatch(setRojmelTransferPage(value))}
            onPageSizeChange={(value) => dispatch(setRojmelTransferPageSize(value))}
            pageNumber={state.pageNumber}
            pageSize={state.pageSize}
            totalCount={state.totalCount}
            totalPages={state.totalPages}
          />
        )}
      </div>

      <TransferFormModal
        isOpen={formOpen}
        wallets={walletState.list}
        onClose={() => setFormOpen(false)}
        onSubmit={submitTransfer}
      />
      <ReversalModal
        isOpen={Boolean(reversal)}
        noun="transfer"
        onClose={() => setReversal(null)}
        onConfirm={reverseTransfer}
      />
      <RojmelDetailModal
        fields={detailFields}
        isLoading={state.detailLoading}
        isOpen={detailOpen}
        title="Transfer Details"
        onClose={() => setDetailOpen(false)}
      />
    </section>
  );
};

export default TransfersPage;
