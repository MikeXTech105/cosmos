import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import UserModal from "./UserModal";

const renderModal = (overrides = {}) =>
  renderToStaticMarkup(
    <UserModal
      isLoading={false}
      isOpen
      isRolesLoading={false}
      mode="create"
      onClose={vi.fn()}
      onRetryRoles={vi.fn()}
      onSubmit={vi.fn()}
      roleOptions={[]}
      rolesError={null}
      user={null}
      {...overrides}
    />,
  );

const getSubmitButtonAttributes = (markup) => {
  const match = markup.match(/<button type="submit"([^>]*)>/);

  expect(match).not.toBeNull();
  return match[1];
};

const hasDisabledAttribute = (attributes) =>
  /(?:^|\s)disabled(?:=""|(?=\s|$))/.test(attributes);

describe("UserModal role availability", () => {
  it("keeps Create User enabled while cached roles refresh", () => {
    const markup = renderModal({
      isRolesLoading: true,
      roleOptions: [{ id: 1, name: "SuperAdmin" }],
    });

    expect(hasDisabledAttribute(getSubmitButtonAttributes(markup))).toBe(false);
  });

  it("keeps Create User disabled until at least one role is available", () => {
    const markup = renderModal({ isRolesLoading: true });

    expect(hasDisabledAttribute(getSubmitButtonAttributes(markup))).toBe(true);
  });
});
