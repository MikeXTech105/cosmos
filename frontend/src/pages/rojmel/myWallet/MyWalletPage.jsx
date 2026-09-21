import { ArrowDownLeft, ArrowUpRight, RefreshCw, Wallet } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";

import AppButton from "../../../components/common/AppButton";
import PageHeader from "../../../components/common/PageHeader";
import { RojmelCategoryType } from "../../../constants/rojmelEnums";
import {
  createMyRojmelExpense,
  createMyRojmelIncome,
  fetchMyRojmelCategories,
  fetchMyRojmelLedger,
  fetchMyRojmelWallet,
  setMyRojmelLedgerFilters,
  setMyRojmelLedgerPage,
  setMyRojmelLedgerPageSize,
} from "../../../store/slices/rojmel/myWalletSlice";
import {
  buildRojmelQuery,
  formatRojmelCurrency,
  getRojmelMonthRange,
  getRojmelSuccessMessage,
} from "../rojmelHelpers";
import useRojmelCapabilities from "../useRojmelCapabilities";
import RojmelFilterBar from "../components/RojmelFilterBar";
import TransactionEntryModal from "../components/TransactionEntryModal";
import TransactionTable from "../components/TransactionTable";

const MyWalletPage = () => {
  const dispatch = useDispatch();
  const state = useSelector((root) => root.myRojmelWallet);
  const capabilities = useRojmelCapabilities({
    label: "Rojmel.MyWallet",
    resource: "rojmel.mywallet",
    route: "/rojmel/my-wallet",
  });
  const initializedDates = useRef(false);
  const [entryMode, setEntryMode] = useState(null);
  const [searchInput, setSearchInput] = useState(state.ledger.filters.Search);

  useEffect(() => {
    if (!initializedDates.current) {
      initializedDates.current = true;
      dispatch(setMyRojmelLedgerFilters(getRojmelMonthRange()));
      void dispatch(fetchMyRojmelCategories(RojmelCategoryType.Both));
    }
  }, [dispatch]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      dispatch(setMyRojmelLedgerFilters({ Search: searchInput }));
      dispatch(setMyRojmelLedgerPage(1));
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [dispatch, searchInput]);

  const query = useMemo(
    () =>
      buildRojmelQuery({
        filters: state.ledger.filters,
        pageNumber: state.ledger.pageNumber,
        pageSize: state.ledger.pageSize,
      }),
    [state.ledger.filters, state.ledger.pageNumber, state.ledger.pageSize],
  );

  const loadLedger = useCallback(
    () => dispatch(fetchMyRojmelLedger(query)),
    [dispatch, query],
  );
  const refreshAll = useCallback(
    () => Promise.all([dispatch(fetchMyRojmelWallet()), loadLedger()]),
    [dispatch, loadLedger],
  );

  useEffect(() => {
    void Promise.resolve().then(refreshAll);
  }, [refreshAll]);

  const openEntry = (mode) => {
    if (!capabilities.canCreate) return;
    const categoryType =
      mode === "income"
        ? RojmelCategoryType.Income
        : RojmelCategoryType.Expense;
    setEntryMode(mode);
    void dispatch(fetchMyRojmelCategories(categoryType));
  };

  const submitEntry = async (payload) => {
    const thunk =
      entryMode === "income" ? createMyRojmelIncome : createMyRojmelExpense;
    const response = await dispatch(thunk(payload)).unwrap();
    toast.success(
      getRojmelSuccessMessage(
        response,
        entryMode === "income" ? "Income posted" : "Expense posted",
      ),
    );
    setEntryMode(null);
    await refreshAll();
  };

  const activeCategoryType =
    entryMode === "income"
      ? RojmelCategoryType.Income
      : RojmelCategoryType.Expense;
  const ledgerCategories = state.categoriesByType[RojmelCategoryType.Both] ?? [];
  const entryCategories = state.categoriesByType[activeCategoryType] ?? [];
  const filterControls = { ...state.ledger.filters, Search: searchInput };

  return (
    <section className="min-w-0 space-y-5">
      <PageHeader
        badge={
          <>
            <Wallet className="h-3.5 w-3.5" />
            Rojmel / My Wallet
          </>
        }
        title="My Wallet"
        description="Your private daily cash book. No other wallet is visible or selectable here."
        actions={
          <AppButton
            className="h-10"
            disabled={state.walletLoading || state.ledger.loading}
            variant="secondary"
            onClick={refreshAll}
          >
            <RefreshCw className={`h-4 w-4 ${state.walletLoading || state.ledger.loading ? "animate-spin" : ""}`} />
            Refresh
          </AppButton>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px_220px]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-light text-brand">
              <Wallet className="h-7 w-7" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">
                Current Balance
              </p>
              <p className="mt-1 text-4xl font-bold tabular-nums text-slate-900">
                {state.walletLoading
                  ? "—"
                  : formatRojmelCurrency(state.wallet?.currentBalance)}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {state.wallet?.walletName ?? "Your cash in hand"}
              </p>
            </div>
          </div>
          {state.walletError && (
            <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {state.walletError}
            </p>
          )}
        </div>

        {capabilities.canCreate && (
          <>
            <button
              type="button"
              className="flex min-h-32 items-center justify-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-6 text-lg font-bold text-emerald-700 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
              onClick={() => openEntry("income")}
            >
              <ArrowDownLeft className="h-6 w-6" />
              + Income
            </button>
            <button
              type="button"
              className="flex min-h-32 items-center justify-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-6 text-lg font-bold text-red-700 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
              onClick={() => openEntry("expense")}
            >
              <ArrowUpRight className="h-6 w-6" />
              − Expense
            </button>
          </>
        )}
      </div>

      <RojmelFilterBar
        categoryOptions={ledgerCategories.map((category) => ({
          label: category.name,
          value: category.id,
        }))}
        filters={filterControls}
        resultCount={state.ledger.list.length}
        showCategory
        showDates
        showTransactionType
        showStatus
        onChange={(patch) => {
          if (Object.hasOwn(patch, "Search")) {
            setSearchInput(patch.Search);
          } else {
            dispatch(setMyRojmelLedgerFilters(patch));
            dispatch(setMyRojmelLedgerPage(1));
          }
        }}
        onClear={() => {
          setSearchInput("");
          dispatch(
            setMyRojmelLedgerFilters({
              ...getRojmelMonthRange(),
              CategoryId: "all",
              Search: "",
              TransactionType: "all",
              Status: "all",
            }),
          );
          dispatch(setMyRojmelLedgerPage(1));
        }}
      />

      <TransactionTable
        error={state.ledger.error}
        isLoading={state.ledger.loading}
        onPageChange={(value) => dispatch(setMyRojmelLedgerPage(value))}
        onPageSizeChange={(value) => dispatch(setMyRojmelLedgerPageSize(value))}
        onRetry={loadLedger}
        pageNumber={state.ledger.pageNumber}
        pageSize={state.ledger.pageSize}
        rows={state.ledger.list}
        totalCount={state.ledger.totalCount}
        totalPages={state.ledger.totalPages}
      />

      <TransactionEntryModal
        categories={entryCategories}
        categoriesLoading={state.categoriesLoading}
        isAdmin={false}
        isOpen={Boolean(entryMode)}
        mode={entryMode}
        wallets={[]}
        onClose={() => setEntryMode(null)}
        onSubmit={submitEntry}
      />
    </section>
  );
};

export default MyWalletPage;
