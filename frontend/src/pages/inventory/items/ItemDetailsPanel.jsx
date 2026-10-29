import { AlertTriangle, Boxes, CalendarDays, Factory, Pencil, RefreshCw, Tag } from "lucide-react";
import AppButton from "../../../components/common/AppButton";
import MaterialTypePill from "../../../components/common/MaterialTypePill";
import { InventoryStatusPill } from "../InventoryShared";
import { formatDate } from "../inventoryHelpers";
import { formatCurrency, formatStockWithUnit, formatUnitDisplay, getItemTypeLabel, isLowStock } from "./itemHelpers";
import ItemImageThumbnail from "./ItemImageThumbnail";

const DetailRow = ({ label, value, low = false }) => <div className="item-master-detail-row"><dt>{label}</dt><dd className={low ? "is-low" : undefined}>{value === null || value === undefined || value === "" ? "—" : value}</dd></div>;
const price = value => value === null || value === undefined ? "—" : formatCurrency(value);
const stock = (value, unit) => value === null || value === undefined ? "—" : formatStockWithUnit(value, unit);

const ItemDetailsPanel = ({ canEdit = false, item, isLoading, error, onEdit, onRetry }) => {
  if (isLoading) return <div className="min-h-[350px] space-y-4 p-5" role="status" aria-label="Loading item details"><div className="h-20 animate-pulse rounded-xl bg-slate-100" />{Array.from({ length: 6 }, (_, index) => <div key={index} className="h-10 animate-pulse rounded-lg bg-slate-100" />)}</div>;
  if (error) return <div className="item-master-detail-error" role="alert"><AlertTriangle size={25} className="mx-auto mb-3 text-amber-500" /><h3>Item details could not be loaded</h3><p>{typeof error === "string" ? error : error.message || "Retry to review the saved item details."}</p>{onRetry && <AppButton variant="secondary" onClick={onRetry}><RefreshCw size={14} />Retry details</AppButton>}</div>;
  if (!item) return <div className="item-master-detail-error"><Boxes size={28} className="mx-auto mb-3 text-slate-300" /><h3>Select an item</h3><p>Choose a product or service to review its stock and pricing.</p></div>;
  const lowStock = isLowStock(item), itemType = getItemTypeLabel(item.itemType);
  return <div className="item-master-detail">
    <div className="item-master-detail-identity"><ItemImageThumbnail src={item.imageUrl} alt={item.name} className="h-16 w-16 rounded-xl" iconClassName="h-6 w-6" /><div className="min-w-0"><h2>{item.name}</h2><p className="item-master-detail-code">{item.itemCode || "No item code"}</p></div></div>
    <div className="item-master-detail-badges"><InventoryStatusPill isActive={item.isActive} /><span className="item-master-detail-classification"><Tag size={12} />{itemType}</span>{item.isManufactured && <span className="item-master-detail-classification"><Factory size={12} />Manufactured</span>}{lowStock && <span className="rounded-md bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-700">Low stock</span>}</div>
    <dl className="item-master-detail-prices"><div><dt>Sale price</dt><dd>{price(item.salesPrice)}</dd></div><div><dt>Purchase price</dt><dd>{price(item.purchasePrice)}</dd></div></dl>
    {itemType !== "Service" && <section className="item-master-detail-section"><h3><Boxes size={14} />Inventory</h3><dl><DetailRow label="Current stock" value={stock(item.currentStock, item.unitShortName)} low={lowStock} /><DetailRow label="Reserved stock" value={stock(item.reservedStock, item.unitShortName)} /><DetailRow label="Minimum stock" value={stock(item.minimumStock, item.unitShortName)} /><DetailRow label="Opening stock value" value={price(item.openingStockValue)} /><DetailRow label="Inventory tracking" value={item.trackInventory === false ? "Off" : "On"} /></dl></section>}
    <section className="item-master-detail-section"><h3><Tag size={14} />Classification & tax</h3><dl><DetailRow label="Category" value={item.categoryName} /><DetailRow label="Material type" value={<MaterialTypePill value={item.procurementClassification} />} /><DetailRow label="Unit" value={formatUnitDisplay(item.unitName, item.unitShortName)} /><DetailRow label="Barcode" value={item.barcode} /><DetailRow label="HSN code" value={item.hsnCode} /><DetailRow label="GST rate" value={item.gstRate == null ? "—" : `${item.gstRate}%`} /><DetailRow label="Manufacturing" value={item.isManufactured ? "Enabled" : "Not enabled"} /></dl></section>
    {item.description && <section className="item-master-detail-section"><h3>Description</h3><p className="item-master-detail-description mt-3">{item.description}</p></section>}
    {item.createdAt && <p className="item-master-detail-footer"><CalendarDays size={13} />Created {formatDate(item.createdAt)}</p>}
    {canEdit && <div className="item-master-detail-edit"><AppButton onClick={() => onEdit(item)}><Pencil size={15} />Adjust / Edit Item</AppButton></div>}
  </div>;
};
export default ItemDetailsPanel;
