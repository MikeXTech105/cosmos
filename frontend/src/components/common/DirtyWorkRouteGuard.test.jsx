// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createMemoryRouter, Outlet, RouterProvider } from "react-router-dom";
import useUnsavedChanges from "../../hooks/useUnsavedChanges";
import DirtyWorkRouteGuard from "./DirtyWorkRouteGuard";

function Editor() { useUnsavedChanges({ when: true }); return <p>Editing unsaved work</p>; }
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
describe("dirty route navigation", () => {
  it("protects browser Back and continues only after an explicit discard decision", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const router = createMemoryRouter([{ element: <><DirtyWorkRouteGuard /><Outlet /></>, children: [{ path: "/previous", element: <p>Previous screen</p> }, { path: "/edit", element: <Editor /> }] }], { initialEntries: ["/previous", "/edit"], initialIndex: 1 });
    render(<RouterProvider router={router} />);
    await act(async () => { await router.navigate(-1); });
    await waitFor(() => expect(confirm).toHaveBeenCalledOnce());
    expect(screen.getByText("Editing unsaved work")).toBeTruthy();
    confirm.mockReturnValue(true);
    await act(async () => { await router.navigate(-1); });
    expect(await screen.findByText("Previous screen")).toBeTruthy();
  });
});
