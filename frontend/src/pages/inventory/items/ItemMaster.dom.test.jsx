// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ItemTable from "./ItemTable";
import ItemDetailsPanel from "./ItemDetailsPanel";
afterEach(cleanup);
const item = { id: "91", name: "Clip product", itemCode: "FG-91", itemType: 1, isActive: true, currentStock: "5", reservedStock: "0", minimumStock: "0", salesPrice: "0", purchasePrice: "10", openingStockValue: "1200", gstRate: 0, unitShortName: "PCS" };
const table = { items: [item], pageNumber: 1, pageSize: 20, totalCount: 1, totalPages: 1, onPageChange: vi.fn(), onPageSizeChange: vi.fn() };
describe("Item Master inspection", () => {
  it("opens a row with the keyboard while keeping edit keys separate", () => {
    const select = vi.fn(), edit = vi.fn();
    render(<ItemTable {...table} actions={{ canView: true, canEdit: true, onEdit: edit, onView: select }} onSelect={select} />);
    const row = screen.getByRole("row", { name: "View Clip product" });
    fireEvent.keyDown(row, { key: "Enter" });
    expect(select).toHaveBeenCalledWith(item);
    select.mockClear();
    fireEvent.keyDown(screen.getByRole("button", { name: "Edit Item" }), { key: "Enter" });
    expect(select).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Edit Item" }));
    expect(edit).toHaveBeenCalledWith(item);
  });
  it("keeps read-only row actions within the granted permissions", () => {
    const select = vi.fn();
    render(<ItemTable {...table} actions={{ canView: false, canEdit: false, canDelete: false }} onSelect={select} />);
    const row = screen.getByRole("row", { name: "View Clip product" });
    fireEvent.click(row);
    fireEvent.keyDown(row, { key: "Enter" });
    expect(select).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Edit Item" })).toBeNull();
    expect(row.getAttribute("tabindex")).toBe("-1");
  });
  it("labels opening valuation truthfully and retains zero stock and tax values", () => {
    render(<ItemDetailsPanel item={item} />);
    expect(screen.getByText("Opening stock value").parentElement.textContent).toContain("₹1,200");
    expect(screen.getByText("Reserved stock").parentElement.textContent).toContain("0 PCS");
    expect(screen.getByText("GST rate").parentElement.textContent).toContain("0%");
    expect(screen.queryByText("Stock value")).toBeNull();
    expect(screen.queryByRole("button", { name: "Adjust / Edit Item" })).toBeNull();
  });
  it("shows a retry instead of stale list details after a failed canonical read", () => {
    const retry = vi.fn();
    render(<ItemDetailsPanel item={item} error="Read unavailable" canEdit onRetry={retry} />);
    expect(screen.getByRole("alert").textContent).toContain("Read unavailable");
    expect(screen.queryByText(item.name)).toBeNull();
    expect(screen.queryByRole("button", { name: "Adjust / Edit Item" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Retry details" }));
    expect(retry).toHaveBeenCalledOnce();
  });
});
