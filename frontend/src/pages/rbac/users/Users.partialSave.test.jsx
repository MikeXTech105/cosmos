// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ createUser: vi.fn(), assignRoles: vi.fn(), getUsers: vi.fn(), getRoles: vi.fn() }));
vi.mock("../../../services/rbac/userService", () => ({ userService: mocks }));
vi.mock("../../../services/rbac/roleService", () => ({ roleService: { getRoles: mocks.getRoles } }));
vi.mock("../../../hooks/useCapabilities", () => ({ default: () => ({ canView: true, canCreate: true, canUpdate: true, canAssignRole: true }) }));
vi.mock("./UserModal", () => ({ default: ({ isOpen, onSubmit }) => isOpen ? <button onClick={() => onSubmit({ username: "fixture-user", fullName: "Fixture user", email: "fixture@example.test", password: "fixture-only-password", isActive: true, roleId: "7" })}>Submit user fixture</button> : null }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
import Users from "./Users";

describe("user creation followed by role assignment", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.getUsers.mockResolvedValue({ data: [] }); mocks.getRoles.mockResolvedValue({ data: [{ id: "7", name: "Operator", isActive: true }] }); mocks.createUser.mockResolvedValue({ data: { id: "42", username: "fixture-user", fullName: "Fixture user" } }); });
  afterEach(cleanup);
  it("retains the created account and retries only the failed role request", async () => {
    mocks.assignRoles.mockRejectedValueOnce(new Error("Role unavailable")).mockResolvedValueOnce({ data: {} });
    render(<Users />);
    await waitFor(() => expect(mocks.getRoles).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: "Add User" }));
    fireEvent.click(await screen.findByRole("button", { name: "Submit user fixture" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Fixture user was saved");
    await screen.findByText(/Their role has not been assigned/);
    fireEvent.click(screen.getByRole("button", { name: "Retry role assignment" }));
    await waitFor(() => expect(mocks.assignRoles).toHaveBeenCalledTimes(2));
    expect(mocks.createUser).toHaveBeenCalledTimes(1);
    expect(mocks.assignRoles.mock.calls).toEqual([["42", ["7"]], ["42", ["7"]]]);
  });
});
