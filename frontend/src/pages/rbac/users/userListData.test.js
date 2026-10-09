import { describe, expect, it } from "vitest";

import { unwrapResponse } from "../../../services/apiServiceUtils";
import {
  extractCollection,
  filterUsers,
  getRolesLoadErrorMessage,
  getUsersLoadErrorMessage,
  MALFORMED_COLLECTION_MESSAGE,
  normalizeRoles,
  normalizeUsers,
  paginate,
} from "./userListData";

const backendUsersEnvelope = {
  succeeded: true,
  message: "Success",
  data: [
    {
      id: 11,
      username: "alex",
      email: "alex@example.test",
      fullName: "Alex Example",
      isActive: true,
      roles: [{ id: 2, name: "Manager" }],
    },
    {
      id: 12,
      username: "sam",
      email: "sam@example.test",
      fullName: "Sam Example",
      isActive: false,
      roles: [{ id: 3, name: "Operator" }],
    },
  ],
  errors: [],
};

describe("Users list response handling", () => {
  it("normalizes a populated backend users response without passing map indexes as role options", () => {
    const response = unwrapResponse({ data: backendUsersEnvelope });
    const collection = extractCollection(response.data, response.meta);

    expect(normalizeUsers(collection.items)).toMatchObject([
      { id: 11, username: "alex", roles: [{ id: 2, name: "Manager" }] },
      { id: 12, username: "sam", roles: [{ id: 3, name: "Operator" }] },
    ]);
  });

  it("keeps a valid empty backend users response as an empty collection", () => {
    const response = unwrapResponse({
      data: { ...backendUsersEnvelope, data: [] },
    });

    expect(normalizeUsers(extractCollection(response.data).items)).toEqual([]);
  });

  it("accepts supported collection envelopes and rejects a missing users collection", () => {
    expect(extractCollection({ users: backendUsersEnvelope.data }).items).toHaveLength(2);
    expect(() => extractCollection({ total: 2 })).toThrow(MALFORMED_COLLECTION_MESSAGE);
  });

  it("handles a failed roles lookup shape without treating it as a users list", () => {
    expect(normalizeRoles(extractCollection({ roles: [{ id: 2, name: "Manager" }] }).items))
      .toEqual([{ id: 2, name: "Manager", description: "Role access profile" }]);
    expect(() => extractCollection({ roles: { id: 2 } })).toThrow(MALFORMED_COLLECTION_MESSAGE);
    expect(getRolesLoadErrorMessage(new Error("Roles service unavailable")))
      .toBe("Roles service unavailable");
  });

  it("filters and paginates normalized users for searches, role filters, and retry-safe reprocessing", () => {
    const users = normalizeUsers(backendUsersEnvelope.data);
    const filtered = filterUsers(users, {
      search: "sam",
      status: "inactive",
      roleId: "3",
    });

    expect(filtered.map((user) => user.id)).toEqual([12]);
    expect(paginate(users, 1, 1).map((user) => user.id)).toEqual([11]);
    expect(paginate(users, 2, 1).map((user) => user.id)).toEqual([12]);
    expect(normalizeUsers(backendUsersEnvelope.data)).toEqual(users);
  });

  it("replaces internal JavaScript errors and malformed responses with a user-friendly message", () => {
    expect(getUsersLoadErrorMessage(new TypeError("t.find is not a function")))
      .toBe("We couldn't load users. Please try again.");
    expect(getUsersLoadErrorMessage(new Error(MALFORMED_COLLECTION_MESSAGE)))
      .toBe("We couldn't load users. Please try again.");
    expect(getUsersLoadErrorMessage({ response: { status: 500, data: {} } }))
      .toBe("Server error - please try again.");
  });
});
