import { BellRing, CheckCircle2, RefreshCw } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import AppButton from "../../components/common/AppButton";
import PageHeader from "../../components/common/PageHeader";
import messages from "../../i18n/locales/en/actionCentre.json";
import { getApiErrorMessage } from "../../utils/apiError";
import useCapabilities from "../../hooks/useCapabilities";
import useDispatchCapabilities from "../dispatch/useDispatchCapabilities";
import useProcurementCapabilities from "../procurement/useProcurementCapabilities";
import useSupplyChainCapabilities from "../supplyChain/useSupplyChainCapabilities";
import {
  actionSignals,
  fetchActionSignals,
  getPermittedActionSignals,
} from "./actionSignals";

const GROUPS = Object.freeze([
  {
    id: "blocking",
    iconClassName: "bg-red-50 text-red-600",
    label: messages.groups.blocking,
  },
  {
    id: "waiting",
    iconClassName: "bg-amber-50 text-amber-600",
    label: messages.groups.waiting,
  },
  {
    id: "watch",
    iconClassName: "bg-slate-50 text-slate-400",
    label: messages.groups.watch,
  },
]);

const FILTERS = Object.freeze([
  { id: "all", label: messages.filters.all },
  { id: "blocking", label: messages.filters.blocking },
  { id: "waiting", label: messages.filters.waiting },
]);

const SignalSkeleton = ({ signal, tone }) => {
  const Icon = signal.icon;

  return (
    <div className="flex items-center gap-3 px-4 py-4 sm:px-5">
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tone}`}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="h-4 w-40 animate-pulse rounded bg-slate-100" />
        <div className="mt-2 h-3 w-64 max-w-full animate-pulse rounded bg-slate-100" />
      </div>
      <div className="h-6 w-10 animate-pulse rounded bg-slate-100" />
      <div className="h-8 w-14 animate-pulse rounded-lg bg-slate-100" />
    </div>
  );
};

const SignalRow = ({ onFix, onRetry, signal, state, tone }) => {
  const Icon = signal.icon;

  if (!state || state.status === "loading") {
    return <SignalSkeleton signal={signal} tone={tone} />;
  }

  const failed = state?.status === "error";

  return (
    <div className="flex items-center gap-3 px-4 py-4 sm:px-5">
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tone}`}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-900">{signal.label}</p>
        <p className="mt-0.5 text-xs leading-5 text-slate-500">
          {signal.hint}
        </p>
      </div>
      {failed ? (
        <span
          className="min-w-24 text-right text-xs font-medium text-slate-400"
          title={state.message}
        >
          {messages.states.couldntLoad}
        </span>
      ) : (
        <span className="min-w-16 text-right text-xl font-semibold tabular-nums text-slate-900">
          {state.count}
        </span>
      )}
      <AppButton
        className="h-8 rounded-lg px-3"
        variant="secondary"
        onClick={failed ? onRetry : onFix}
      >
        {failed ? messages.actions.retry : messages.actions.fix}
      </AppButton>
    </div>
  );
};

const ActionCentrePage = () => {
  const navigate = useNavigate();
  const requestSequenceRef = useRef(0);
  const signalRequestIdsRef = useRef({});
  const [activeFilter, setActiveFilter] = useState("all");
  const [states, setStates] = useState({});
  const supplyChainMappings = useSupplyChainCapabilities({
    label: "SupplyChain.ItemMappings",
    resource: "SupplyChain.ItemMappings",
    route: "/supply-chain/item-mappings",
  });
  const procurementBom = useProcurementCapabilities({
    label: "ProcurementPlanning.BomMapping",
    resource: "ProcurementPlanning.BomMapping",
    route: "/procurement/bom-mapping",
  });
  const procurementSettings = useProcurementCapabilities({
    label: "ProcurementPlanning.Settings",
    resource: "ProcurementPlanning.Settings",
    route: "/procurement/settings",
  });
  const procurementPlanningHistory = useProcurementCapabilities({
    label: "ProcurementPlanning.PlanningHistory",
    resource: "ProcurementPlanning.PlanningHistory",
    route: "/procurement/planning-history",
  });
  const dispatchSettings = useDispatchCapabilities({
    label: "DispatchPlanning.SkuSettings",
    resource: "DispatchPlanning.SkuSettings",
    route: "/dispatch/settings",
  });
  const inventoryItems = useCapabilities({
    actions: ["view"],
    label: "Items",
    resource: "Items",
    route: "/items",
  });
  const permissions = useMemo(
    () => ({
      dispatchSettings: dispatchSettings.canView,
      inventoryItems: inventoryItems.canView,
      procurementBom: procurementBom.canView,
      procurementPlanningHistory: procurementPlanningHistory.canView,
      procurementSettings: procurementSettings.canView,
      supplyChainMappings: supplyChainMappings.canView,
    }),
    [
      dispatchSettings.canView,
      inventoryItems.canView,
      procurementBom.canView,
      procurementPlanningHistory.canView,
      procurementSettings.canView,
      supplyChainMappings.canView,
    ],
  );
  const permittedSignals = useMemo(
    () => getPermittedActionSignals(actionSignals, permissions),
    [permissions],
  );

  const loadSignals = useCallback(async (signals) => {
    if (signals.length === 0) {
      setStates({});
      return;
    }

    const requestId = ++requestSequenceRef.current;

    signals.forEach((signal) => {
      signalRequestIdsRef.current[signal.id] = requestId;
    });
    setStates((current) => ({
      ...current,
      ...Object.fromEntries(
        signals.map((signal) => [
          signal.id,
          { status: "loading" },
        ]),
      ),
    }));

    const results = await fetchActionSignals(signals);
    const activeResults = results.filter(
      (result) => signalRequestIdsRef.current[result.id] === requestId,
    );

    activeResults
      .filter((result) => result.status === "error")
      .forEach((result) => {
        const signal = signals.find((candidate) => candidate.id === result.id);
        const message = getApiErrorMessage(
          result.error,
          `Unable to load ${signal?.label ?? "this signal"}.`,
        );

        toast.error(message, { id: `action-centre-${result.id}` });
        result.message = message;
      });

    setStates((current) => ({
      ...current,
      ...Object.fromEntries(
        activeResults.map((result) => [result.id, result]),
      ),
    }));
  }, []);

  useEffect(() => {
    const requestIds = signalRequestIdsRef.current;
    const sequence = requestSequenceRef;
    const timeoutId = window.setTimeout(
      () => void loadSignals(permittedSignals),
      0,
    );

    return () => {
      window.clearTimeout(timeoutId);
      const invalidRequestId = ++sequence.current;

      permittedSignals.forEach((signal) => {
        requestIds[signal.id] = invalidRequestId;
      });
    };
  }, [loadSignals, permittedSignals]);

  const isLoading = permittedSignals.some(
    (signal) =>
      !states[signal.id] || states[signal.id].status === "loading",
  );
  const totalCount = permittedSignals.reduce((total, signal) => {
    const state = states[signal.id];

    return state?.status === "success" ? total + state.count : total;
  }, 0);
  const groups = GROUPS
    .filter(
      (group) => activeFilter === "all" || group.id === activeFilter,
    )
    .map((group) => ({
      ...group,
      signals: permittedSignals.filter((signal) => {
        if (signal.group !== group.id) {
          return false;
        }

        const state = states[signal.id];

        return (
          !state ||
          state?.status === "loading" ||
          state?.status === "error" ||
          (state?.status === "success" && state.count > 0)
        );
      }),
    }))
    .filter((group) => group.signals.length > 0);

  return (
    <section className="min-w-0 space-y-5">
      <PageHeader
        badge={
          <>
            <BellRing className="h-3.5 w-3.5" />
            {messages.page.badge}
          </>
        }
        description={messages.page.description}
        title={messages.page.title}
        actions={
          <AppButton
            variant="secondary"
            onClick={() => void loadSignals(permittedSignals)}
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
            {messages.actions.refresh}
          </AppButton>
        }
      />

      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm">
        <p className="text-sm text-slate-500">
          {messages.page.attentionLabel}
        </p>
        {isLoading ? (
          <div className="mt-2 h-9 w-20 animate-pulse rounded bg-slate-100" />
        ) : (
          <p className="mt-1 text-3xl font-semibold tabular-nums text-slate-900">
            {totalCount}
          </p>
        )}
      </div>

      <div
        className="flex flex-wrap items-center gap-1"
        aria-label={messages.filters.label}
      >
        {FILTERS.map((filter) => (
          <button
            key={filter.id}
            type="button"
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              activeFilter === filter.id
                ? "bg-slate-100 text-slate-900"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
            }`}
            onClick={() => setActiveFilter(filter.id)}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {groups.length > 0 ? (
        <div className="space-y-4">
          {groups.map((group) => (
            <section
              key={group.id}
              className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
            >
              <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
                <h2 className="text-sm font-semibold text-slate-900">
                  {group.label}
                </h2>
              </div>
              <div className="divide-y divide-slate-100">
                {group.signals.map((signal) => (
                  <SignalRow
                    key={signal.id}
                    signal={signal}
                    state={states[signal.id]}
                    tone={group.iconClassName}
                    onFix={() => navigate(signal.route)}
                    onRetry={() => void loadSignals([signal])}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center shadow-sm">
          <CheckCircle2 className="mx-auto h-8 w-8 text-slate-300" />
          <h2 className="mt-3 text-base font-semibold text-slate-900">
            {messages.states.allClearTitle}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {messages.states.allClearHint}
          </p>
        </div>
      )}
    </section>
  );
};

export default ActionCentrePage;
