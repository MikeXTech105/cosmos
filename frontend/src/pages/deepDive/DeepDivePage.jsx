import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, Layers3, RefreshCw, Search } from "lucide-react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import AppButton from "../../components/common/AppButton";
import AppDateRangeFilter from "../../components/common/AppDateRangeFilter";
import AppModal from "../../components/common/AppModal";
import PageHeader from "../../components/common/PageHeader";
import { insightPreset } from "../oee/insights/productionInsights";
import { DEEP_PAGES, DEEP_SOURCES } from "./deepDiveConfig";
import { validRange } from "./deepDiveData";
import useDeepDive, { useDebounced, useFreshnessClock } from "./useDeepDive";
import { Notice, Panel, Pill, RecordTable } from "./DeepDiveShared";
import {
  CashflowSection,
  DispatchSection,
  ExecutiveStats,
  FinanceSection,
  Findings,
  GstSection,
  JournalPreview,
  ModulePulse,
  PlanningSection,
  ProductionSection,
} from "./DeepDiveSections";
import "./deepDive.css";

const timestamp = (value) =>
  new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });

export default function DeepDivePage({ pageId = "executive" }) {
  const pageRef = useRef(null);
  useEffect(() => { pageRef.current?.scrollIntoView({ block: "start" }); }, [pageId]);
  const page = DEEP_PAGES.find((item) => item.id === pageId) || DEEP_PAGES[0];
  const [params, setParams] = useSearchParams();
  const defaults = useMemo(() => insightPreset("last30"), []);
  const range = {
    fromDate: params.get("from") ?? defaults.fromDate,
    toDate: params.get("to") ?? defaults.toDate,
  };
  const [revision, setRevision] = useState(0);
  const [detail, setDetail] = useState(null);
  const query = useDebounced(params.get("q") || "");
  const now = useFreshnessClock();
  const { sources, access, exports, authorized } = useDeepDive(
    page,
    range,
    revision,
  );
  const valid = validRange(range);
  const available = Object.values(sources).filter(
    (source) => source.status === "ready",
  ).length;
  const permitted = page.sources.filter((key) => access[key]).length;
  const loading = Object.values(sources).some(
    (source) => source.status === "loading",
  );
  const latest = Math.max(
    0,
    ...Object.values(sources).map((source) => source.fetchedAt || 0),
  );
  const failed = Object.values(sources).some(
    (source) => source.status === "error",
  );
  const updateRange = (next) => {
    const updated = new URLSearchParams(params);
    updated.set("from", next.fromDate);
    updated.set("to", next.toDate);
    setParams(updated);
  };
  const link = (id) => {
    const destination = DEEP_PAGES.find((item) => item.id === id);
    const search = new URLSearchParams(params);
    search.set("from", range.fromDate);
    search.set("to", range.toDate);
    return `${destination.route}?${search}`;
  };
  const detailScope = `${range.fromDate}:${range.toDate}:${revision}`;
  const open = (title, rows, columns, source) =>
    setDetail({
      title,
      rows,
      columns,
      source,
      scope: detailScope,
      sourceData: sources[source]?.data,
    });
  if (!authorized) return <Navigate to="/403" replace />;
  return (
    <div className="deep-dive" ref={pageRef}>
      <PageHeader
        badge="COSMOS / DEEP DIVE ANALYTICS"
        title={page.label}
        description={page.description}
        icon={Layers3}
        actions={
          <AppButton
            variant="secondary"
            disabled={loading || !valid}
            onClick={() => setRevision((value) => value + 1)}
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            {loading ? "Reading sources…" : "Refresh sources"}
          </AppButton>
        }
      />
      <nav className="deep-navigation" aria-label="Deep Dive pages">
        {DEEP_PAGES.filter((item) =>
          item.sources.some((key) => access[key]),
        ).map((item) => (
          <Link
            key={item.id}
            to={link(item.id)}
            aria-current={page.id === item.id ? "page" : undefined}
          >
            {item.short}
          </Link>
        ))}
      </nav>
      <div className="deep-toolbar">
        <div className="deep-date">
          <span className="deep-label">
            Analysis period · India Standard Time
          </span>
          <AppDateRangeFilter
            fromDate={range.fromDate}
            toDate={range.toDate}
            onChange={updateRange}
            allowLifetime={false}
            label="Analysis period"
          />
        </div>
        <label className="deep-search deep-main-search">
          <Search size={17} />
          <input
            type="search"
            aria-label="Search Deep Dive records"
            placeholder="Search loaded records, machines, runs…"
            value={params.get("q") || ""}
            onChange={(event) => {
              const next = new URLSearchParams(params);
              event.target.value
                ? next.set("q", event.target.value)
                : next.delete("q");
              setParams(next, { replace: true });
            }}
          />
        </label>
        <div className="deep-freshness">
          <Pill tone={failed ? "warn" : loading ? "muted" : "good"}>
            <Activity size={12} />
            {loading
              ? "Loading"
              : failed
                ? "Partial availability"
                : "Snapshot loaded"}
          </Pill>
          <small>
            {latest
              ? `Fetched ${timestamp(latest)} IST`
              : "Waiting for source responses"}
          </small>
        </div>
      </div>
      <div className="deep-scope-line">
        <span>
          {range.fromDate} → {range.toDate} · {available}/{permitted} permitted
          sources ready
        </span>
        <span>Search filters record tables; KPIs use the complete period.</span>
      </div>
      {!valid ? (
        <Notice tone="warn">
          Choose a valid start and end date, up to 366 days apart. No data is
          requested for an invalid period.
        </Notice>
      ) : (
        <>
          {failed && (
            <Notice tone="warn">
              Some sources could not be read. Available panels remain usable;
              unavailable data is excluded from metrics and findings.
            </Notice>
          )}
          {latest > 0 && now - latest > 600000 && (
            <Notice tone="warn">
              This snapshot is more than 10 minutes old. Refresh before making
              operational decisions.
            </Notice>
          )}
          {(page.id === "executive" || page.id === "cross") && (
            <>
              <ExecutiveStats sources={sources} open={open} />
              <ModulePulse sources={sources} link={link} />
              {page.id === "executive" ? (
                <>
                  <DispatchSection
                    source={sources.dispatch}
                    query={query}
                    canExport={exports.dispatch}
                  />
                  <div className="deep-grid deep-overview-grid">
                    <div>
                      <ProductionSection
                        source={sources.production}
                        range={range}
                        query={query}
                        canExport={exports.production}
                      />
                    </div>
                    <CashflowSection
                      source={sources.cashflow}
                      query={query}
                      canExport={exports.cashflow}
                    />
                  </div>
                  <JournalPreview
                    source={sources.transactions}
                    query={query}
                    canExport={exports.transactions}
                    href={link("finance")}
                  />
                  <Findings sources={sources} open={open} />
                </>
              ) : (
                <>
                  <Notice>
                    Signals are shown side by side. The available records do not
                    provide a verified order → material → machine → dispatch →
                    payment chain. No causal or financial impact is inferred
                    from matching dates or names.
                  </Notice>
                  <Findings sources={sources} open={open} />
                  <PlanningSection
                    source={sources.planning}
                    query={query}
                    canExport={exports.planning}
                  />
                  <DispatchSection
                    source={sources.dispatch}
                    query={query}
                    canExport={exports.dispatch}
                  />
                </>
              )}
            </>
          )}
          {page.id === "oee" && (
            <ProductionSection
              key={`${range.fromDate}-${range.toDate}`}
              source={sources.production}
              priorSource={sources.productionPrior}
              range={range}
              query={query}
              canExport={exports.production}
              detailed
            />
          )}
          {page.id === "finance" && (
            <FinanceSection sources={sources} query={query} exports={exports} />
          )}
          {page.id === "gst" && (
            <GstSection sources={sources} query={query} exports={exports} />
          )}
          <Panel
            title="Source transparency"
            detail="Permission-aware reads from existing modules · manually refreshed snapshots"
          >
            <div className="deep-source-list">
              {page.sources.map((key) => {
                const source = sources[key];
                return (
                  <div key={key}>
                    <div>
                      <strong>{DEEP_SOURCES[key].label}</strong>
                      <small>
                        {source.status === "ready"
                          ? `Fetched ${timestamp(source.fetchedAt)} IST`
                          : source.status === "error"
                            ? source.error
                            : source.status === "denied"
                              ? "No access under your current role"
                              : "Waiting for response"}
                      </small>
                    </div>
                    <Pill
                      tone={
                        source.status === "ready"
                          ? "good"
                          : source.status === "error"
                            ? "bad"
                            : "muted"
                      }
                    >
                      {source.status === "ready"
                        ? "Available"
                        : source.status === "error"
                          ? "Unavailable"
                          : source.status === "denied"
                            ? "Restricted"
                            : "Loading"}
                    </Pill>
                    {access[key] && (
                      <Link className="deep-link" to={DEEP_SOURCES[key].route}>
                        Source module
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          </Panel>
          <p className="deep-footer">
            COSMOS · Evidence-led operations{" "}
            <span>
              Saved records and current snapshots. No simulated telemetry.
            </span>
          </p>
        </>
      )}
      {detail &&
        detail.scope === detailScope &&
        sources[detail.source]?.status === "ready" &&
        sources[detail.source]?.data === detail.sourceData && (
          <AppModal
            isOpen
            title={detail.title}
            maxWidth="max-w-6xl"
            onClose={() => setDetail(null)}
          >
            <RecordTable
              title={detail.title}
              rows={detail.rows}
              columns={detail.columns}
              canExport={exports[detail.source]}
              filename={`deep-dive-${detail.source}-${range.fromDate}-${range.toDate}`}
            />
          </AppModal>
        )}
    </div>
  );
}
