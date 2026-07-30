import {
  ArrowDownLeft,
  ArrowUpRight,
  BookText,
  RefreshCw,
  SlidersHorizontal,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";

import AppButton from "../../../components/common/AppButton";
import PageHeader from "../../../components/common/PageHeader";
import { RojmelCategoryType } from "../../../constants/rojmelEnums";
import { userService } from "../../../services/rbac/userService";
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
  cancelRojmelTransaction,
  createRojmelAdjustment,
  createRojmelExpense,
  createRojmelIncome,
  fetchRojmelTransactionById,
  fetchRojmelTransactions,
  setRojmelTransactionFilters,
  setRojmelTransactionPage,
  setRojmelTransactionPageSize,
} from "../../../store/slices/rojmel/transactionSlice";
import {
  fetchRojmelWalletBalance,
  fetchRojmelWallets,
} from "../../../store/slices/rojmel/walletSlice";
import { getApiErrorMessage } from "../../../utils/apiError";
import ReversalModal from "../components/ReversalModal";
import RojmelDetailModal from "../components/RojmelDetailModal";
import RojmelFilterBar from "../components/RojmelFilterBar";
import TransactionEntryModal from "../components/TransactionEntryModal";
import TransactionTable from "../components/TransactionTable";
import {
  buildRojmelQuery,
  formatRojmelCurrency,
  formatRojmelDate,
  getRojmelCollection,
  getRojmelMonthRange,
  getRojmelSuccessMessage,
} from "../rojmelHelpers";
import useRojmelCapabilities from "../useRojmelCapabilities";

const TransactionsPage = () => {
  const dispatch = useDispatch();
  const adminState = useSelector((root) => root.rojmelTransactions);
  const myState = useSelector((root) => root.myRojmelWallet);
  const walletState = useSelector((root) => root.rojmelWallets);
  const capabilities = useRojmelCapabilities({
    label: "Rojmel.Transactions",
    resource: "rojmel.transactions",
    route: "/rojmel/transactions",
  });
  const initialized = useRef(false);
  const [entryMode, setEntryMode] = useState(null);
  const [reversal, setReversal] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const activeState = capabilities.isAdmin ? adminState : myState.ledger;
  const [searchInput, setSearchInput] = useState(activeState.filters.Search);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const dates = getRojmelMonthRange();
    dispatch(setRojmelTransactionFilters(dates));
    dispatch(setMyRojmelLedgerFilters(dates));
    void dispatch(fetchMyRojmelCategories(RojmelCategoryType.Both));
  }, [dispatch]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (capabilities.isAdmin) {
        dispatch(setRojmelTransactionFilters({ Search: searchInput }));
        dispatch(setRojmelTransactionPage(1));
      } else {
        dispatch(setMyRojmelLedgerFilters({ Search: searchInput }));
        dispatch(setMyRojmelLedgerPage(1));
      }
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [capabilities.isAdmin, dispatch, searchInput]);

  useEffect(() => {
    if (!capabilities.isAdmin) return undefined;
    const controller = new AbortController();
    void dispatch(
      fetchRojmelWallets({
        IsActive: true,
        PageNumber: 1,
        PageSize: 200,
        SortBy: "walletName",
        SortDirection: "asc",
      }),
    );
    userService
      .getUsers({ IsActive: true, PageNumber: 1, PageSize: 200 })
      .then((response) => setUsers(getRojmelCollection(response.data)))
      .catch((error) =>
        toast.error(getApiErrorMessage(error, "Unable to load linked users.")),
      );
    return () => controller.abort();
  }, [capabilities.isAdmin, dispatch]);

  const query = useMemo(
    () =>
      buildRojmelQuery({
        filters: activeState.filters,
        pageNumber: activeState.pageNumber,
        pageSize: activeState.pageSize,
      }),
    [activeState.filters, activeState.pageNumber, activeState.pageSize],
  );
  const loadTransactions = useCallback(
    () =>
      capabilities.isAdmin
        ? dispatch(fetchRojmelTransactions(query))
        : dispatch(fetchMyRojmelLedger(query)),
    [capabilities.isAdmin, dispatch, query],
  );

  useEffect(() => {
    void Promise.resolve().then(loadTransactions);
  }, [loadTransactions]);

  const walletOptions = useMemo(
    () =>
      walletState.list.map((wallet) => ({
        label: `${wallet.walletName} · ${wallet.walletCode || "No code"}`,
        value: wallet.id,
      })),
    [walletState.list],
  );
  const userOptions = useMemo(
    () =>
      users.map((user) => ({
        label: user.fullName ?? user.name ?? user.userName ?? user.email ?? `User ${user.id}`,
        value: user.id,
      })),
    [users],
  );
  const categories = myState.categoriesByType[RojmelCategoryType.Both] ?? [];
  const categoryOptions = categories.map((category) => ({
    label: category.name,
    value: category.id,
  }));

  const refreshAfterMovement = async (walletId) => {
    if (capabilities.isAdmin) {
      await Promise.all([
        loadTransactions(),
        walletId ? dispatch(fetchRojmelWalletBalance(walletId)) : Promise.resolve(),
      ]);
    } else {
      await Promise.all([loadTransactions(), dispatch(fetchMyRojmelWallet())]);
    }
  };

  const openEntry = (mode) => {
    setEntryMode(mode);
    if (mode !== "adjustment") {
      void dispatch(
        fetchMyRojmelCategories(
          mode === "income"
            ? RojmelCategoryType.Income
            : RojmelCategoryType.Expense,
        ),
      );
    }
  };

  const submitEntry = async (payload) => {
    let thunk;
    if (capabilities.isAdmin) {
      thunk =
        entryMode === "income"
          ? createRojmelIncome
          : entryMode === "expense"
            ? createRojmelExpense
            : createRojmelAdjustment;
    } else {
      thunk = entryMode === "income" ? createMyRojmelIncome : createMyRojmelExpense;
    }
    const response = await dispatch(thunk(payload)).unwrap();
    toast.success(getRojmelSuccessMessage(response, "Entry posted"));
    setEntryMode(null);
    await refreshAfterMovement(payload.walletId);
  };

  const viewTransaction = async (transaction) => {
    setDetailOpen(true);
    try {
      await dispatch(fetchRojmelTransactionById(transaction.id)).unwrap();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Unable to load transaction details."));
    }
  };

  const reverseTransaction = async (reason) => {
    const response = await dispatch(
      cancelRojmelTransaction({ id: reversal.id, reason }),
    ).unwrap();
    toast.success(getRojmelSuccessMessage(response, "Transaction reversed"));
    const walletId = reversal.walletId;
    setReversal(null);
    await refreshAfterMovement(walletId);
  };

  const updateFilters = (patch) => {
    if (Object.hasOwn(patch, "Search")) {
      setSearchInput(patch.Search);
      return;
    }
    dispatch(
      capabilities.isAdmin
        ? setRojmelTransactionFilters(patch)
        : setMyRojmelLedgerFilters(patch),
    );
    dispatch(
      capabilities.isAdmin ? setRojmelTransactionPage(1) : setMyRojmelLedgerPage(1),
    );
  };

  const selected = adminState.selected;
  const detailFields = selected
    ? [
        ["Transaction No", selected.transactionNo],
        ["Date", formatRojmelDate(selected.transactionDate)],
        ["Wallet", selected.walletName],
        ["Category", selected.categoryName],
        ["Amount", formatRojmelCurrency(selected.amount)],
        ["Balance Before", formatRojmelCurrency(selected.balanceBefore)],
        ["Balance After", formatRojmelCurrency(selected.balanceAfter)],
        ["Payment Mode", selected.paymentMode],
        ["Reference No", selected.referenceNo],
        ["Description", selected.description],
        ["Related Transfer ID", selected.relatedTransferId],
        ["Created At", formatRojmelDate(selected.createdAt)],
      ].map(([label, value]) => ({ label, value }))
    : [];
  const formCategoryType =
    entryMode === "income" ? RojmelCategoryType.Income : RojmelCategoryType.Expense;
  const formCategories = myState.categoriesByType[formCategoryType] ?? [];
  const filterControls = { ...activeState.filters, Search: searchInput };
  const defaultRange = getRojmelMonthRange();
  const isFiltered = Boolean(
    searchInput.trim() ||
    activeState.filters.CategoryId !== "all" ||
    activeState.filters.TransactionType !== "all" ||
    activeState.filters.FromDate !== defaultRange.FromDate ||
    activeState.filters.ToDate !== defaultRange.ToDate ||
    (capabilities.isAdmin &&
      (activeState.filters.LinkedUserId !== "all" ||
        activeState.filters.Status !== "all" ||
        activeState.filters.WalletId !== "all")),
  );
  const clearFilters = () => {
    setSearchInput("");
    const clearedFilters = {
      ...defaultRange,
      CategoryId: "all",
      LinkedUserId: "all",
      Search: "",
      Status: "all",
      TransactionType: "all",
      WalletId: "all",
    };
    dispatch(
      capabilities.isAdmin
        ? setRojmelTransactionFilters(clearedFilters)
        : setMyRojmelLedgerFilters(clearedFilters),
    );
    dispatch(
      capabilities.isAdmin
        ? setRojmelTransactionPage(1)
        : setMyRojmelLedgerPage(1),
    );
  };

  return (
    <section className="min-w-0 space-y-5">
      <PageHeader
        badge={
          <>
            <BookText aria-hidden="true" className="h-3.5 w-3.5" />
            Rojmel / Ledger
          </>
        }
        title="Transactions"
        description={
          capabilities.isAdmin
            ? "All accessible wallets with running balances and a complete reversal trail."
            : "Your wallet ledger only. Other wallets are never exposed here."
        }
        actions={
          <>
            <AppButton className="h-10" disabled={activeState.loading} variant="secondary" onClick={loadTransactions}>
              <RefreshCw aria-hidden="true" className={`h-4 w-4 ${activeState.loading ? "animate-spin" : ""}`} />
              Refresh
            </AppButton>
            {capabilities.canCreate && (
              <>
                <AppButton className="h-10 bg-emerald-600 hover:bg-emerald-700" onClick={() => openEntry("income")}>
                  <ArrowDownLeft aria-hidden="true" className="h-4 w-4" /> Income
                </AppButton>
                <AppButton className="h-10 bg-red-600 hover:bg-red-700" onClick={() => openEntry("expense")}>
                  <ArrowUpRight aria-hidden="true" className="h-4 w-4" /> Expense
                </AppButton>
                {capabilities.isAdmin && (
                  <AppButton className="h-10" variant="secondary" onClick={() => openEntry("adjustment")}>
                    <SlidersHorizontal aria-hidden="true" className="h-4 w-4" /> Adjustment
                  </AppButton>
                )}
              </>
            )}
          </>
        }
      />

      <RojmelFilterBar
        categoryOptions={categoryOptions}
        filters={filterControls}
        linkedUserOptions={userOptions}
        resultCount={activeState.list.length}
        showCategory
        showDates
        showLinkedUser={capabilities.isAdmin}
        showStatus={capabilities.isAdmin}
        showTransactionType
        showWallet={capabilities.isAdmin}
        walletOptions={walletOptions}
        onChange={updateFilters}
        onClear={clearFilters}
      />

      <TransactionTable
        canCancel={capabilities.isAdmin && capabilities.canCancel}
        canView={capabilities.isAdmin && capabilities.canView}
        createLabel="Add income"
        emptyContext="The ledger records wallet income, expenses and reversals with a running balance."
        error={activeState.error}
        isFiltered={isFiltered}
        isLoading={activeState.loading}
        onCancel={setReversal}
        onClear={clearFilters}
        onCreate={capabilities.canCreate ? () => openEntry("income") : undefined}
        onPageChange={(value) =>
          dispatch(
            capabilities.isAdmin
              ? setRojmelTransactionPage(value)
              : setMyRojmelLedgerPage(value),
          )
        }
        onPageSizeChange={(value) =>
          dispatch(
            capabilities.isAdmin
              ? setRojmelTransactionPageSize(value)
              : setMyRojmelLedgerPageSize(value),
          )
        }
        onRetry={loadTransactions}
        onView={viewTransaction}
        pageNumber={activeState.pageNumber}
        pageSize={activeState.pageSize}
        rows={activeState.list}
        showActions={capabilities.isAdmin}
        showWallet={capabilities.isAdmin}
        totalCount={activeState.totalCount}
        totalPages={activeState.totalPages}
      />

      <TransactionEntryModal
        categories={formCategories}
        categoriesLoading={myState.categoriesLoading}
        isAdmin={capabilities.isAdmin}
        isOpen={Boolean(entryMode)}
        mode={entryMode}
        wallets={walletState.list}
        onClose={() => setEntryMode(null)}
        onSubmit={submitEntry}
      />
      <ReversalModal
        isOpen={Boolean(reversal)}
        noun="transaction"
        onClose={() => setReversal(null)}
        onConfirm={reverseTransaction}
      />
      <RojmelDetailModal
        fields={detailFields}
        isLoading={adminState.detailLoading}
        isOpen={detailOpen}
        title="Transaction Details"
        onClose={() => setDetailOpen(false)}
      />
    </section>
  );
};

export default TransactionsPage;
