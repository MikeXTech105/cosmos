import { Link } from "react-router-dom";
import AppButton from "../../../components/common/AppButton";
import AppInput from "../../../components/common/AppInput";
import { isOrderStatus } from "../orders/orderHelpers";
import { OrderStatus, TableWrap } from "../orders/OrderShared";
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
  return <TableWrap><thead><tr>{["Select for review", "Item / order", "Status", "Unit", "Remaining", "Accepted today", "Rejected today", "Action"].map(label => <th key={label}>{t(label)}</th>)}</tr></thead><tbody>{rows.map((row, index) => {
    const editable = canApprove && isOrderStatus(row, "Released", "InProgress");
    const draft = drafts[row.id] ?? {};
    const changed = Boolean(draft.version && draft.version !== row.version);
    return <tr key={row.id} className={selected.has(String(row.id)) ? "bg-brand/5" : "hover:bg-slate-50/60"}>
      <td><input type="checkbox" aria-label={`${t("Select for review")} ${row.orderNumber}`} checked={selected.has(String(row.id))} disabled={!editable || locked || changed} onChange={event => onSelect(row, event.target.checked)} className="h-4 w-4 accent-brand" /></td>
      <td><Link className="font-semibold text-brand underline-offset-4 hover:underline" to={`/manufacturing/orders/${row.id}`}>{labels(row.itemId)}</Link><div className="mt-1 text-xs text-slate-500">{row.orderNumber} · {t("Due")} {row.dueDate}</div></td>
      <td><OrderStatus status={row.status} /></td><td>{labels.unitLabel?.(row.itemId, row.unitId) ?? "—"}</td><td className="tabular-nums font-semibold">{row.remainingQuantity ?? "—"}</td>
      {["goodOutput", "rejectedOutput"].map((key, column) => <td key={key} className="min-w-40"><div data-entry-row={index} data-entry-col={column} onKeyDown={event => move(event, index, column)}><AppInput aria-label={`${t(column === 0 ? "Accepted today" : "Rejected today")} ${row.orderNumber}`} inputMode="decimal" autoComplete="off" value={draft[key] ?? (column === 1 ? "0" : "")} disabled={!editable || locked || changed} onChange={event => onChange(row, key, event.target.value)} onPaste={event => onPaste(event, index, column)} /></div></td>)}
      <td className="min-w-44"><div className="flex flex-wrap gap-2">{editable ? <AppButton disabled={locked || changed} onClick={() => onReview(row)}>{t("Review entry")}</AppButton> : canApprove && isOrderStatus(row, "Draft") ? <AppButton variant="secondary" disabled={locked} onClick={() => onRelease(row)}>{t("Approve release")}</AppButton> : <Link className="text-brand underline" to={`/manufacturing/orders/${row.id}`}>{t("Open order")}</Link>}{draft.version && <AppButton variant="ghost" disabled={locked} onClick={() => onClear(row)}>{t("Clear row")}</AppButton>}</div>{changed && <p role="alert" className="mt-2 max-w-56 text-xs text-amber-800">This order changed. Review its latest remainder and clear this row before entering a new quantity.</p>}</td>
    </tr>;
  })}</tbody></TableWrap>;
}
