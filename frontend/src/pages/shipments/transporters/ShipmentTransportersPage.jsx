import {
  ExternalLink,
  RefreshCw,
  Search,
  Truck,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import AppButton from "../../../components/common/AppButton";
import AppInput from "../../../components/common/AppInput";
import AppTooltip from "../../../components/common/AppTooltip";
import DataTableShell, {
  DATA_TABLE_HEADER_CLASS,
  DATA_TABLE_ROW_ACTION_CLASS,
} from "../../../components/common/DataTableShell";
import PageHeader from "../../../components/common/PageHeader";
import StatCards from "../../../components/common/StatCards";
import { shipmentTransporterService } from "../../../services/shipments";
import {
  getApiErrorMessage,
  isConflictError,
} from "../../../utils/apiError";
import {
  SupplyChainFilterBar,
  SupplyChainInlineError,
} from "../../supplyChain/SupplyChainShared";
import {
  ShipmentConflict,
  ShipmentPill,
} from "../ShipmentShared";
import { getShipmentMutationMessage } from "../shipmentDisplay";
import useShipmentCapabilities from "../useShipmentCapabilities";

const ShipmentTransportersPage = () => {
  const navigate = useNavigate();
  const capabilities = useShipmentCapabilities();
  const [search, setSearch] = useState("");
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState("");
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await shipmentTransporterService.list({ search });
      setRecords(
        Array.isArray(response.data)
          ? response.data
          : Array.isArray(response.data?.items)
            ? response.data.items
            : [],
      );
    } catch (requestError) {
      setRecords([]);
      setError(
        getApiErrorMessage(
          requestError,
          "Unable to load transporter party roles.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 180);
    return () => window.clearTimeout(timeout);
  }, [load]);

  const toggle = async (party) => {
    const partyId = String(party.partyId);
    setWorkingId(partyId);
    setConflict(null);
    try {
      const response = await shipmentTransporterService.setRole(
        partyId,
        !party.isTransporter,
      );
      toast.success(response.message || "Transporter role updated.");
      await load();
    } catch (requestError) {
      if (isConflictError(requestError)) setConflict(requestError);
      toast.error(
        getShipmentMutationMessage(
          requestError,
          "Unable to update this transporter role.",
        ),
      );
    } finally {
      setWorkingId("");
    }
  };

  const transporterCount = records.filter(
    (record) => record.isTransporter,
  ).length;

  return (
    <section className="min-w-0 space-y-5">
      <PageHeader
        badge="Shipment Operations"
        description="Marks an existing party as a transporter. Manage party details in Party Master."
        title="Transporters"
        actions={
          <>
            <AppButton
              disabled={loading}
              variant="secondary"
              onClick={() => void load()}
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </AppButton>
            <AppButton onClick={() => navigate("/party")}>
              <ExternalLink className="h-4 w-4" />
              Open Party Master
            </AppButton>
          </>
        }
      />

      <StatCards
        loading={loading}
        cards={[
          {
            icon: Users,
            label: "Matching parties",
            value: records.length,
          },
          {
            icon: Truck,
            label: "Transporters",
            value: transporterCount,
          },
        ]}
      />

      <SupplyChainFilterBar
        activeFilterCount={search ? 1 : 0}
        onClear={() => setSearch("")}
      >
        <div className="relative w-72">
          <Search className="pointer-events-none absolute bottom-3 left-3 h-4 w-4 text-slate-400" />
          <AppInput
            className="pl-9"
            label="Search parties"
            placeholder="Code, name, mobile or email"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </SupplyChainFilterBar>

      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600">
        This is a role toggle over Party Master, not a separate transporter
        master. Create and edit party records in Party Master.
      </div>

      <SupplyChainInlineError
        message={error}
        title="Transporter roles unavailable"
        onRetry={load}
      />
      <ShipmentConflict
        error={conflict}
        title="This party role changed on the server"
        onRefresh={() => {
          setConflict(null);
          void load();
        }}
      />

      <DataTableShell
        colGroup={
          <colgroup>
            <col className="w-[56px]" />
            <col className="w-36" />
            <col className="w-64" />
            <col className="w-40" />
            <col className="w-64" />
            <col className="w-36" />
            <col className="w-24" />
          </colgroup>
        }
        columnCount={7}
        emptyHint="Adjust the search or manage the party in Party Master."
        emptyTitle={
          !loading && records.length === 0
            ? "No parties match this transporter search"
            : undefined
        }
        head={
          <>
            <th className={DATA_TABLE_HEADER_CLASS}>#</th>
            <th className={DATA_TABLE_HEADER_CLASS}>Party code</th>
            <th className={DATA_TABLE_HEADER_CLASS}>Party name</th>
            <th className={DATA_TABLE_HEADER_CLASS}>Mobile</th>
            <th className={DATA_TABLE_HEADER_CLASS}>Email</th>
            <th className={DATA_TABLE_HEADER_CLASS}>Transporter</th>
            <th className={`${DATA_TABLE_HEADER_CLASS} text-right`}>
              Actions
            </th>
          </>
        }
        loading={loading}
        minWidth="min-w-[1120px]"
      >
        {records.map((party, index) => {
          const partyId = String(party.partyId);
          const disabled =
            workingId === partyId || !capabilities.shipments.canUpdate;
          const toggleControl = (
            <label className="inline-flex items-center gap-2">
              <input
                checked={Boolean(party.isTransporter)}
                className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand/20"
                disabled={disabled}
                type="checkbox"
                onChange={() => void toggle(party)}
              />
              <ShipmentPill
                tone={party.isTransporter ? "emerald" : "slate"}
              >
                {party.isTransporter ? "Yes" : "No"}
              </ShipmentPill>
            </label>
          );

          return (
            <tr key={partyId}>
              <td className="px-4 py-3.5 text-xs font-semibold tabular-nums text-slate-400">
                {index + 1}
              </td>
              <td className="font-medium text-slate-900">
                {party.partyCode || "—"}
              </td>
              <td>{party.partyName || "—"}</td>
              <td>{party.mobileNo || "—"}</td>
              <td>{party.email || "—"}</td>
              <td>
                {disabled ? (
                  <AppTooltip
                    label={
                      workingId === partyId
                        ? "Wait for the server to finish updating this party."
                        : "Changing transporter roles requires Shipment Operations Shipments update permission."
                    }
                  >
                    <span>{toggleControl}</span>
                  </AppTooltip>
                ) : (
                  toggleControl
                )}
              </td>
              <td>
                <div className="flex items-center justify-end">
                  <AppTooltip label="Open in Party Master">
                    <Link
                      aria-label={`Open ${party.partyName} in Party Master`}
                      className={DATA_TABLE_ROW_ACTION_CLASS}
                      to={`/party?search=${encodeURIComponent(party.partyCode || party.partyName || "")}`}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </AppTooltip>
                </div>
              </td>
            </tr>
          );
        })}
      </DataTableShell>
    </section>
  );
};

export default ShipmentTransportersPage;
