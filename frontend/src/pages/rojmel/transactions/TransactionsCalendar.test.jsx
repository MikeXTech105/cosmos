// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { submissionMonthRange, submissionToday } from "../../../utils/submissionCalendar";

const f = vi.hoisted(() => ({ state: {}, admin: true, canView: true, dispatch: vi.fn(), transactions: vi.fn(), ledger: vi.fn() }));
vi.mock("../../../utils/submissionCalendar", async original => ({ ...(await original()), submissionToday: () => "2026-10-29" }));
vi.mock("react-redux", () => ({ useDispatch: () => f.dispatch, useSelector: selector => selector(f.state) }));
vi.mock("../useRojmelCapabilities", () => ({ default: () => ({ isAdmin: f.admin, canView: f.canView, canCreate: false }) }));
vi.mock("../../../utils/userScope", () => ({ getUserScope: () => "calendar-test-user" }));
vi.mock("../../../services/rojmel/transactionService", () => ({ transactionService: { getTransactions: f.transactions } }));
vi.mock("../../../services/rojmel/myWalletService", () => ({ myWalletService: { getLedger: f.ledger } }));
vi.mock("../../../services/rbac/userService", () => ({ userService: { getUsers: async () => ({ data: [] }) } }));
vi.mock("../components/RojmelFilterBar", () => ({ default: () => null }));
vi.mock("../components/TransactionTable", () => ({ default: () => null }));
vi.mock("../components/TransactionEntryModal", () => ({ default: () => null }));
vi.mock("../components/ReversalModal", () => ({ default: () => null }));
vi.mock("../components/RojmelDetailModal", () => ({ default: () => null }));
import TransactionsPage from "./TransactionsPage";

const month = submissionToday().slice(0, 7);
const dayLabel = (day, suffix) => `${new Date(`${month}-${day}T12:00:00Z`).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}: ${suffix}`;
const page = (items, pageNumber = 1, totalCount = items.length, pageSize = 200) => ({ data: { items, totalCount, pageNumber, pageSize, totalPages: Math.ceil(totalCount / pageSize) } });

beforeEach(() => {
  f.admin = true;
  f.canView = true;
  f.dispatch.mockReset().mockImplementation(() => Promise.resolve({}));
  f.transactions.mockReset().mockResolvedValue(page([]));
  f.ledger.mockReset().mockResolvedValue(page([]));
  const filters = { CategoryId: "9", FromDate: `${month}-05`, ToDate: `${month}-05`, Search: "table search", Status: "Cancelled", TransactionType: "Expense", WalletId: "11", LinkedUserId: "22" };
  const state = { filters, list: [], pageNumber: 3, pageSize: 20, loading: false, totalCount: 0, totalPages: 1 };
  f.state = { rojmelTransactions: state, myRojmelWallet: { ledger: { ...state, filters: { ...filters } }, categoriesByType: {} }, rojmelWallets: { list: [] } };
});
afterEach(cleanup);

describe("ledger calendar integration", () => {
  it("verifies every month page in wallet/user scope without applying table search or category filters", async () => {
    f.transactions.mockImplementation(async params => page([{ id: params.PageNumber, transactionDate: `${month}-0${params.PageNumber}` }], params.PageNumber, 2, 1));
    render(<TransactionsPage />);
    await screen.findByRole("button", { name: dayLabel("02", "1 transaction") });
    expect(f.transactions).toHaveBeenCalledTimes(2);
    expect(f.transactions.mock.calls[0][0]).toEqual({
      FromDate: submissionMonthRange(month).fromDate, ToDate: submissionMonthRange(month).toDate,
      WalletId: "11", LinkedUserId: "22", PageNumber: 1, PageSize: 200, SortBy: "transactionDate", SortDirection: "asc",
    });
    fireEvent.click(screen.getByRole("button", { name: dayLabel("02", "1 transaction") }));
    expect(f.dispatch).toHaveBeenCalledWith({ type: "rojmelTransactions/setRojmelTransactionFilters", payload: { FromDate: `${month}-02`, ToDate: `${month}-02` } });
  });

  it("uses only the own-wallet ledger for a non-admin and invalidates admin calendar data on a role switch", async () => {
    f.transactions.mockResolvedValue(page([{ id: 1, transactionDate: `${month}-01` }]));
    const mounted = render(<TransactionsPage />);
    await screen.findByRole("button", { name: dayLabel("01", "1 transaction") });
    f.admin = false;
    mounted.rerender(<TransactionsPage />);
    expect(screen.queryByRole("button", { name: dayLabel("01", "1 transaction") })).toBeNull();
    await waitFor(() => expect(f.ledger).toHaveBeenCalledTimes(1));
    expect(f.ledger.mock.calls[0][0]).toMatchObject({ WalletId: undefined, LinkedUserId: undefined, FromDate: `${month}-01` });
    await screen.findByRole("button", { name: dayLabel("01", "No records") });
  });

  it("does not request month data without view access and never reports unverified dates as empty", async () => {
    f.canView = false;
    render(<TransactionsPage />);
    await waitFor(() => expect(screen.getByText("Month coverage is unavailable. Empty dates have not been checked.")).toBeTruthy());
    expect(f.transactions).not.toHaveBeenCalled();
    expect(f.ledger).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: dayLabel("01", "No records") })).toBeNull();
  });
});
