import { Link } from "react-router-dom";
import { Hash } from "lucide-react";
import AppButton from "../../../components/common/AppButton";
import AppInput from "../../../components/common/AppInput";
import { isOrderStatus } from "../orders/orderHelpers";
import { OrderStatus } from "../orders/OrderShared";
import { deskText as t } from "./deskText";

export default function DailyProductionGrid({ rows, drafts, selected, labels, canApprove, locked, onChange, onSelect, onReview, onRelease, onPaste, onClear }) {
  const move = (event, row, column) => {
    if (!["Enter", "ArrowDown", "ArrowUp"].includes(event.key)) return;
    event.preventDefault();
    const direction = event.key === "ArrowUp" || event.key === "Enter" && event.shiftKey ? -1 : 1;
    const table = event.currentTarget.closest("table");
    for (let next = row + direction; next >= 0 && next < rows.length; next += direction) {
      const input = table.querySelector(`[data-entry-row="${next}"][data-entry-col="${column}"] input`);
      if (input && !input.disabled) { input.focus(); input.select(); break; }
    }
  };
  return <div className="production-grid-scroll" role="region" aria-label={t("Daily production entries")} tabIndex={0}><table className="production-grid"><thead><tr>{["Select for review", "Item / order", "Status", "Unit", "Remaining", "Accepted today", "Rejected today", "Action"].map((label, index) => <th key={label} scope="col">{index === 0 ? <span className="sr-only">{t(label)}</span> : t(label)}</th>)}</tr></thead><tbody>{rows.map((row, index) => {
    const editable = canApprove && isOrderStatus(row, "Released", "InProgress");
    const draft = drafts[row.id] ?? {};
    const changed = Boolean(draft.version && draft.version !== row.version);
    return <tr key={row.id} data-selected={selected.has(String(row.id))}>
      <td><input type="checkbox" aria-label={`${t("Select for review")} ${row.orderNumber}`} checked={selected.has(String(row.id))} disabled={!editable || locked || changed} onChange={event => onSelect(row, event.target.checked)} className="h-4 w-4 accent-brand" /></td>
      <td className="production-grid-item"><Link to={`/manufacturing/orders/${row.id}`}>{labels(row.itemId)}</Link><div className="production-grid-order"><Hash size={11} aria-hidden="true" />{row.orderNumber}</div><div className="production-grid-date">{t("Due")} {row.dueDate}</div></td>
      <td><OrderStatus status={row.status} /></td><td>{labels.unitLabel?.(row.itemId, row.unitId) ?? "—"}</td><td className="tabular-nums font-semibold">{row.remainingQuantity ?? "—"}</td>
      {["goodOutput", "rejectedOutput"].map((key, column) => <td key={key} className={`production-grid-quantity ${column === 0 ? "accepted" : "rejected"}`}><div data-entry-row={index} data-entry-col={column} onKeyDown={event => move(event, index, column)}><AppInput aria-label={`${t(column === 0 ? "Accepted today" : "Rejected today")} ${row.orderNumber}`} inputMode="decimal" autoComplete="off" placeholder={editable ? "0" : "—"} value={draft[key] ?? (column === 1 ? "0" : "")} disabled={!editable || locked || changed} onChange={event => onChange(row, key, event.target.value)} onPaste={event => onPaste(event, index, column)} /></div></td>)}
      <td className="production-grid-action"><div className="flex flex-wrap gap-2">{editable ? <AppButton disabled={locked || changed} onClick={() => onReview(row)}>{t("Review entry")}</AppButton> : canApprove && isOrderStatus(row, "Draft") ? <AppButton variant="secondary" disabled={locked} onClick={() => onRelease(row)}>{t("Approve release")}</AppButton> : <Link to={`/manufacturing/orders/${row.id}`}>{t("Open order")}</Link>}{draft.version && <AppButton variant="ghost" disabled={locked} onClick={() => onClear(row)}>{t("Clear row")}</AppButton>}</div>{changed && <p role="alert" className="mt-2 max-w-56 text-xs text-amber-800">This order changed. Review its latest remainder and clear this row before entering a new quantity.</p>}</td>
    </tr>;
  })}</tbody></table></div>;
}
