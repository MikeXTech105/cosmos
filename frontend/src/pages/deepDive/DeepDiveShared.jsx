import { useMemo, useState } from "react";
import {
  ArrowDownUp,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Download,
  Info,
  LockKeyhole,
  Search,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import AppButton from "../../components/common/AppButton";
import AppModal from "../../components/common/AppModal";
import MetricCard from "../../components/common/MetricCard";
import { downloadCsv } from "../../utils/csv";
import { formatNumber, number } from "./deepDiveData";

export function Panel({ title, detail, action, children, className = "" }) {
  return (
    <section className={`deep-panel ${className}`}>
      <header>
        <div>
          <h2>{title}</h2>
          {detail && <p>{detail}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}
export function Notice({ children, tone = "muted" }) {
  return (
    <div className={`deep-notice ${tone}`}>
      <Info size={17} aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}
export function Source({ source, children }) {
  if (!source || source.status === "denied")
    return (
      <div className="deep-empty">
        <LockKeyhole size={20} />
        <strong>Access restricted</strong>
        <p>Your role does not include this data source.</p>
      </div>
    );
  if (source.status === "loading")
    return (
      <div className="deep-empty deep-loading" role="status">
        <span className="deep-loader" />
        <strong>Reading source records…</strong>
        <p>Calculating from the complete selected period.</p>
      </div>
    );
  if (source.status === "error")
    return (
      <div className="deep-empty deep-error" role="alert">
        <strong>Source unavailable</strong>
        <p>{source.error}</p>
        <small>Use Refresh sources above to retry.</small>
      </div>
    );
  return children(source.data);
}
export function Stat({ label, value, hint, icon, tone = "brand", onClick }) {
  const card = (
    <MetricCard
      label={label}
      value={value}
      hint={hint}
      icon={icon}
      tone={tone}
      labelClassName="min-h-[60px] whitespace-normal text-[11px] leading-5"
      metaClassName="whitespace-normal leading-5"
      valueClassName="text-2xl font-semibold"
      footer={
        onClick ? (
          <span className="deep-stat-link">
            Explore records <ArrowUpRight size={13} />
          </span>
        ) : undefined
      }
    />
  );
  return onClick ? (
    <button
      type="button"
      className="deep-stat-button"
      onClick={onClick}
      aria-label={`Explore ${label}`}
    >
      {card}
    </button>
  ) : (
    card
  );
}
export function Pill({ children, tone = "muted" }) {
  return <span className={`deep-pill ${tone}`}>{children}</span>;
}
export function RecordLink({ to, children }) {
  return (
    <Link className="deep-link" to={to}>
      {children}
      <ArrowUpRight size={14} />
    </Link>
  );
}
const cellValue = (row, column) =>
  column.value ? column.value(row) : row[column.key];

export function RecordTable({
  rows,
  columns,
  title,
  query = "",
  canExport = false,
  onInspect,
  filename = "deep-dive-records",
  snapshot = false,
}) {
  const [sort, setSort] = useState({ key: "", direction: 1 });
  const [page, setPage] = useState(0);
  const [local, setLocal] = useState("");
  const [exportError, setExportError] = useState("");
  const filtered = useMemo(() => {
    const words = `${query} ${local}`
      .toLowerCase()
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    const matching = rows.filter((row) => {
      const text = columns
        .map((col) => cellValue(row, col))
        .join(" ")
        .toLowerCase();
      return words.every((word) => text.includes(word));
    });
    const column = columns.find((col) => col.key === sort.key);
    if (column)
      matching.sort((a, b) => {
        const av = cellValue(a, column),
          bv = cellValue(b, column);
        return (
          (typeof av === "number" && typeof bv === "number"
            ? av - bv
            : String(av ?? "").localeCompare(String(bv ?? ""), undefined, {
                numeric: true,
              })) * sort.direction
        );
      });
    return matching;
  }, [rows, columns, query, local, sort]);
  const count = Math.max(1, Math.ceil(filtered.length / 8));
  const current = Math.min(page, count - 1);
  const visible = filtered.slice(current * 8, current * 8 + 8);
  const exportRows = async () => {
    setExportError("");
    try {
      await downloadCsv({
        filename: `${filename}.csv`,
        rows: filtered,
        columns: columns.map((col) => ({
          header: col.label,
          getValue: (row) => cellValue(row, col),
        })),
      });
    } catch {
      setExportError("Export could not be downloaded. Please try again.");
    }
  };
  return (
    <div className="deep-records">
      <div className="deep-table-tools">
        <label className="deep-search">
          <Search size={15} />
          <input
            aria-label={`Search ${title}`}
            placeholder="Filter these records…"
            value={local}
            onChange={(event) => {
              setLocal(event.target.value);
              setPage(0);
            }}
          />
        </label>
        <span>{formatNumber(filtered.length)} records</span>
        {canExport && (
          <AppButton
            variant="secondary"
            disabled={!filtered.length}
            onClick={exportRows}
          >
            <Download size={14} />
            CSV
          </AppButton>
        )}
      </div>
      {exportError && <p role="alert">{exportError}</p>}
      <div
        className="deep-table-scroll"
        tabIndex={0}
        role="region"
        aria-label={`${title} table`}
      >
        <table>
          <caption className="sr-only">
            {title}. Column headers sort the records.
          </caption>
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  aria-sort={
                    sort.key === col.key
                      ? sort.direction === 1
                        ? "ascending"
                        : "descending"
                      : "none"
                  }
                >
                  <button
                    onClick={() => {
                      setSort({
                        key: col.key,
                        direction: sort.key === col.key ? -sort.direction : 1,
                      });
                      setPage(0);
                    }}
                  >
                    {col.label}
                    <ArrowDownUp size={12} />
                  </button>
                </th>
              ))}
              {onInspect && <th>Detail</th>}
            </tr>
          </thead>
          <tbody>
            {visible.map((row, index) => (
              <tr key={row.id ?? `${current}-${index}`}>
                {columns.map((col) => (
                  <td key={col.key}>
                    {col.render
                      ? col.render(row)
                      : String(cellValue(row, col) ?? "—")}
                  </td>
                ))}
                {onInspect && (
                  <td>
                    <button
                      className="deep-link"
                      onClick={() => onInspect(row)}
                      aria-label={`Inspect ${cellValue(row, columns[0])}`}
                    >
                      Inspect <ArrowUpRight size={13} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!filtered.length && (
        <div className="deep-empty">
          <strong>
            {rows.length ? "No matching records" : snapshot ? "No records available" : "No records in this period"}
          </strong>
          <p>
            {rows.length
              ? "Change your search to see more results."
              : snapshot ? "Check the source module for current records." : "Try a different date range or check the source module."}
          </p>
        </div>
      )}
      {filtered.length > 8 && (
        <div className="deep-pager">
          <span>
            Page {current + 1} of {count}
          </span>
          <AppButton
            variant="secondary"
            disabled={current === 0}
            onClick={() => setPage(current - 1)}
            aria-label={`Previous ${title} page`}
          >
            <ChevronLeft size={15} />
          </AppButton>
          <AppButton
            variant="secondary"
            disabled={current + 1 >= count}
            onClick={() => setPage(current + 1)}
            aria-label={`Next ${title} page`}
          >
            <ChevronRight size={15} />
          </AppButton>
        </div>
      )}
    </div>
  );
}
export function RecordDetails({ record, columns, title, onClose }) {
  return (
    <AppModal isOpen title={title} onClose={onClose} maxWidth="max-w-3xl">
      <dl className="deep-detail-list">
        {columns.map((col) => (
          <div key={col.key}>
            <dt>{col.label}</dt>
            <dd>
              {col.render
                ? col.render(record)
                : String(cellValue(record, col) ?? "—")}
            </dd>
          </div>
        ))}
      </dl>
    </AppModal>
  );
}
export function Trend({ rows, xKey, series, title, format = formatNumber }) {
  if (!rows.length)
    return (
      <div className="deep-empty">
        <strong>No trend records</strong>
        <p>Choose a period with saved activity.</p>
      </div>
    );
  return (
    <div className="deep-trend">
      <div
        className="deep-chart"
        role="img"
        aria-label={`${title}. An accessible data table follows.`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={rows}
            margin={{ top: 15, right: 18, bottom: 0, left: 5 }}
            accessibilityLayer
          >
            <CartesianGrid
              strokeDasharray="3 5"
              vertical={false}
              stroke="var(--color-border)"
            />
            <XAxis
              dataKey={xKey}
              tick={{ fontSize: 10, fill: "#64748b" }}
              tickFormatter={(value) => String(value).slice(5, 10)}
              minTickGap={25}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#64748b" }}
              tickFormatter={(value) => formatNumber(value)}
              width={65}
            />
            <Tooltip
              formatter={(value, name) => [format(value), name]}
              contentStyle={{
                borderRadius: 10,
                border: "1px solid #e2e8f0",
                fontSize: 12,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {series.map((line) => (
              <Line
                key={line.key}
                dataKey={line.key}
                name={line.label}
                stroke={line.color}
                strokeWidth={2.5}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
                connectNulls={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <details className="deep-chart-table">
        <summary>View chart data</summary>
        <RecordTable
          title={title}
          rows={rows}
          columns={[
            { key: xKey, label: "Date" },
            ...series.map((line) => ({
              key: line.key,
              label: line.label,
              render: (row) => format(row[line.key]),
            })),
          ]}
        />
      </details>
    </div>
  );
}
export function Gauge({ value, label, detail, color = "var(--app-accent)" }) {
  const valid = number(value) !== null;
  return (
    <div className="deep-gauge">
      <div
        className="deep-gauge-ring"
        style={{
          "--gauge-color": color,
          "--gauge-value": `${valid ? Math.min(100, Math.max(0, value)) : 0}%`,
        }}
      >
        <strong>{valid ? `${formatNumber(value, 1)}%` : "—"}</strong>
      </div>
      <strong>{label}</strong>
      <p>{detail}</p>
    </div>
  );
}
