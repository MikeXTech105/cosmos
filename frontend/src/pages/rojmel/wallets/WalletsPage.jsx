import {
  Eye,
  LockKeyhole,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  WalletCards,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import { formatNumber } from "../../../utils/format";

import AppButton from "../../../components/common/AppButton";
import AppTooltip from "../../../components/common/AppTooltip";
import PageHeader from "../../../components/common/PageHeader";
import { userService } from "../../../services/rbac/userService";
import {
  changeRojmelWalletStatus,
  createRojmelWallet,
  fetchRojmelWalletById,
  fetchRojmelWallets,
  setRojmelWalletFilters,
  setRojmelWalletPage,
  setRojmelWalletPageSize,
  updateRojmelWallet,
} from "../../../store/slices/rojmel/walletSlice";
import { getApiErrorMessage } from "../../../utils/apiError";
import RojmelFilterBar from "../components/RojmelFilterBar";
import WalletFormModal from "../components/WalletFormModal";
import {
  buildRojmelQuery,
  formatRojmelCurrency,
  getRojmelCollection,
  getRojmelSuccessMessage,
} from "../rojmelHelpers";
import {
  RojmelPagination,
  RojmelState,
  RojmelWalletStatusPill,
  RojmelWalletTypeBadge,
} from "../RojmelShared";
import useRojmelCapabilities from "../useRojmelCapabilities";

const WalletAction = ({ disabled, icon: Icon, label, onClick, tone = "default" }) => (
  <AppTooltip label={disabled ? `${label} is unavailable for this wallet` : label}>
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 disabled:cursor-not-allowed disabled:opacity-40 ${
        tone === "warning"
          ? "hover:bg-amber-50 hover:text-amber-700"
          : "hover:bg-slate-100 hover:text-brand"
      }`}
      onClick={onClick}
    >
      <Icon className="h-4 w-4" />
    </button>
  </AppTooltip>
);

const WalletsPage = () => {
  const dispatch = useDispatch();
  const state = useSelector((root) => root.rojmelWallets);
  const capabilities = useRojmelCapabilities({
    label: "Rojmel.Wallets",
    resource: "rojmel.wallets",
    route: "/rojmel/wallets",
  });
  const [modal, setModal] = useState({ entity: null, mode: "create", open: false });
  const [searchInput, setSearchInput] = useState(state.filters.Search);
  const [users, setUsers] = useState([]);

  const query = useMemo(
    () =>
      buildRojmelQuery({
        filters: state.filters,
        pageNumber: state.pageNumber,
        pageSize: state.pageSize,
      }),
    [state.filters, state.pageNumber, state.pageSize],
  );
  const loadWallets = useCallback(
    () => dispatch(fetchRojmelWallets(query)),
    [dispatch, query],
  );

  useEffect(() => {
    void Promise.resolve().then(loadWallets);
  }, [loadWallets]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      dispatch(setRojmelWalletFilters({ Search: searchInput }));
      dispatch(setRojmelWalletPage(1));
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [dispatch, searchInput]);

  useEffect(() => {
    const controller = new AbortController();
    userService
      .getUsers({ IsActive: true, PageNumber: 1, PageSize: 200 }, { signal: controller.signal })
      .then((response) => setUsers(getRojmelCollection(response.data)))
      .catch((error) => {
        if (error?.name !== "CanceledError") {
          toast.error(getApiErrorMessage(error, "Unable to load linked users."));
        }
      });
    return () => controller.abort();
  }, []);

  const userOptions = useMemo(
    () =>
      users.map((user) => ({
        label: user.fullName ?? user.name ?? user.userName ?? user.email ?? `User ${user.id}`,
        value: user.id,
      })),
    [users],
  );
  const stats = useMemo(() => {
    const summary = state.summary ?? {};
    const companyWallet = state.list.find((wallet) => wallet.isCompanyWallet);
    return {
      active: summary.activeCount ?? state.list.filter((wallet) => wallet.isActive).length,
      companyBalance: summary.companyWalletBalance ?? companyWallet?.currentBalance,
      total: summary.totalCount ?? state.totalCount,
    };
  }, [state.list, state.summary, state.totalCount]);

  const openWallet = async (mode, wallet) => {
    setModal({ entity: wallet ?? null, mode, open: true });
    if (!wallet?.id) return;
    try {
      const response = await dispatch(fetchRojmelWalletById(wallet.id)).unwrap();
      setModal((current) =>
        current.open && String(current.entity?.id) === String(wallet.id)
          ? { ...current, entity: response.data?.wallet ?? response.data }
          : current,
      );
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Unable to load wallet details."));
    }
  };

  const saveWallet = async (payload) => {
    const response =
      modal.mode === "edit"
        ? await dispatch(updateRojmelWallet({ id: modal.entity.id, payload })).unwrap()
        : await dispatch(createRojmelWallet(payload)).unwrap();
    toast.success(
      getRojmelSuccessMessage(
        response,
        modal.mode === "edit" ? "Wallet updated" : "Wallet created",
      ),
    );
    setModal({ entity: null, mode: "create", open: false });
    await loadWallets();
  };

  const toggleStatus = async (wallet) => {
    if (wallet.isCompanyWallet || !capabilities.canEdit) return;
    try {
      const response = await dispatch(
        changeRojmelWalletStatus({ id: wallet.id, isActive: !wallet.isActive }),
      ).unwrap();
      toast.success(
        getRojmelSuccessMessage(
          response.response,
          wallet.isActive ? "Wallet deactivated" : "Wallet activated",
        ),
      );
      await loadWallets();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Unable to change wallet status."));
    }
  };

  const filterControls = { ...state.filters, Search: searchInput };

  return (
    <section className="min-w-0 space-y-5">
      <PageHeader
        badge={
          <>
            <WalletCards className="h-3.5 w-3.5" />
            Rojmel / Wallet Master
          </>
        }
        title="Wallets"
        description="Manage company, user and external wallets. The company wallet is always protected."
        actions={
          <>
            <AppButton className="h-10" disabled={state.loading} variant="secondary" onClick={loadWallets}>
              <RefreshCw className={`h-4 w-4 ${state.loading ? "animate-spin" : ""}`} />
              Refresh
            </AppButton>
            {capabilities.canCreate && (
              <AppButton className="h-10" onClick={() => openWallet("create")}>
                <Plus className="h-4 w-4" />
                Create Wallet
              </AppButton>
            )}
          </>
        }
      />

      <div className="grid gap-3 md:grid-cols-3">
        {[
          ["Total Wallets", stats.total],
          ["Active Wallets", stats.active],
          ["Company Balance", formatRojmelCurrency(stats.companyBalance)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{value}</p>
          </div>
        ))}
      </div>

      <RojmelFilterBar
        filters={filterControls}
        linkedUserOptions={userOptions}
        resultCount={state.list.length}
        showLinkedUser
        showWalletStatus
        showWalletType
        onChange={(patch) => {
          if (Object.hasOwn(patch, "Search")) setSearchInput(patch.Search);
          else {
            dispatch(setRojmelWalletFilters(patch));
            dispatch(setRojmelWalletPage(1));
          }
        }}
        onClear={() => {
          setSearchInput("");
          dispatch(
            setRojmelWalletFilters({
              IsActive: "all",
              LinkedUserId: "all",
              Search: "",
              WalletType: "all",
            }),
          );
          dispatch(setRojmelWalletPage(1));
        }}
      />

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {state.loading || state.error || state.list.length === 0 ? (
          <RojmelState error={state.error} isLoading={state.loading} noun="wallets" onRetry={loadWallets} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] table-fixed text-left">
              <thead className="bg-slate-50">
                <tr>
                  {["#", "Wallet Code", "Wallet Name", "Type", "Linked User", "Current Balance (₹)", "Default", "Status", "Actions"].map((heading) => (
                    <th key={heading} className={`border-b border-slate-200 px-3 py-3.5 text-xs font-medium uppercase tracking-wide text-slate-500 ${["Current Balance (₹)", "Actions"].includes(heading) ? "text-right" : ""}`}>
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {state.list.map((wallet, index) => (
                  <tr key={wallet.id} className="hover:bg-slate-50">
                    <td className="border-b border-slate-100 px-3 py-3.5 text-xs font-semibold tabular-nums text-slate-400">{(state.pageNumber - 1) * state.pageSize + index + 1}</td>
                    <td className="border-b border-slate-100 px-3 py-3.5 text-sm font-semibold text-slate-800">{wallet.walletCode || "-"}</td>
                    <td className="border-b border-slate-100 px-3 py-3.5 text-sm text-slate-800">
                      <div className="flex items-center gap-2">
                        {wallet.walletName}
                        {wallet.isCompanyWallet && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                            <LockKeyhole className="h-3 w-3" /> Protected
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="border-b border-slate-100 px-3 py-3.5"><RojmelWalletTypeBadge value={wallet.walletType} /></td>
                    <td className="border-b border-slate-100 px-3 py-3.5 text-sm text-slate-600">{wallet.linkedUserName || "-"}</td>
                    <td className="border-b border-slate-100 px-3 py-3.5 text-right text-sm font-semibold tabular-nums text-slate-900">{formatNumber(wallet.currentBalance)}</td>
                    <td className="border-b border-slate-100 px-3 py-3.5 text-sm text-slate-600">{wallet.isDefault ? "Yes" : "No"}</td>
                    <td className="border-b border-slate-100 px-3 py-3.5"><RojmelWalletStatusPill isActive={wallet.isActive} /></td>
                    <td className="border-b border-slate-100 px-3 py-3.5">
                      <div className="flex items-center justify-end gap-0.5">
                        {capabilities.canView && <WalletAction icon={Eye} label="View wallet" onClick={() => openWallet("view", wallet)} />}
                        {capabilities.canEdit && <WalletAction icon={Pencil} label="Edit wallet" onClick={() => openWallet("edit", wallet)} />}
                        {capabilities.canEdit && (
                          <WalletAction
                            disabled={wallet.isCompanyWallet}
                            icon={wallet.isCompanyWallet ? LockKeyhole : Power}
                            label={wallet.isCompanyWallet ? "Company wallet is protected" : wallet.isActive ? "Deactivate wallet" : "Activate wallet"}
                            tone="warning"
                            onClick={() => toggleStatus(wallet)}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!state.loading && !state.error && state.list.length > 0 && (
          <RojmelPagination
            disabled={state.loading}
            itemCount={state.list.length}
            itemLabel="wallets"
            onPageChange={(value) => dispatch(setRojmelWalletPage(value))}
            onPageSizeChange={(value) => dispatch(setRojmelWalletPageSize(value))}
            pageNumber={state.pageNumber}
            pageSize={state.pageSize}
            totalCount={state.totalCount}
            totalPages={state.totalPages}
          />
        )}
      </div>

      <WalletFormModal
        isOpen={modal.open}
        mode={modal.mode}
        users={users}
        wallet={modal.entity}
        onClose={() => setModal({ entity: null, mode: "create", open: false })}
        onSubmit={saveWallet}
      />
    </section>
  );
};

export default WalletsPage;
