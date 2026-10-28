// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
const reset = vi.hoisted(() => vi.fn());
vi.mock("../../services/authService", () => ({ resetPassword: reset }));
vi.mock("../../hooks/useAuthTheme", () => ({ default: () => ({ authTheme: "light" }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));
import ResetPassword from "./ResetPassword";
afterEach(cleanup);
describe("password reset context", () => {
  it("requires the reset link and hides technical token entry", () => {
    const { container } = render(<MemoryRouter initialEntries={["/reset-password"]}><ResetPassword /></MemoryRouter>);
    expect(container.querySelector('input[name="resetToken"]').type).toBe("hidden");
    expect(screen.getByRole("alert").textContent).toContain("complete reset link");
    expect(screen.getByRole("button", { name: /reset password/i }).disabled).toBe(true);
  });
  it("retains the link token and shows a persistent failed-reset message", async () => {
    reset.mockRejectedValue(new Error("Reset link expired"));
    render(<MemoryRouter initialEntries={["/reset-password?email=fixture%40example.test&token=fixture-token"]}><ResetPassword /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText("New Password"), { target: { value: "FixtureStrong7!" } });
    fireEvent.change(screen.getByLabelText("Confirm Password"), { target: { value: "FixtureStrong7!" } });
    fireEvent.click(screen.getByRole("button", { name: /reset password/i }));
    expect((await screen.findByRole("alert")).textContent).toContain("Reset link expired");
    expect(reset.mock.calls[0][0].resetToken).toBe("fixture-token");
  });
});
