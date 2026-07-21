import { describe, expect, it, vi } from "vitest";

import { applyApiErrorsToForm } from "./formApiErrors";

const apiError = (status, data) => ({ response: { data, status } });

describe("applyApiErrorsToForm", () => {
  it("binds PascalCase backend fields to existing camelCase form fields", () => {
    const setError = vi.fn();
    const result = applyApiErrorsToForm({
      error: apiError(422, { errors: { Name: ["Name is required."] } }),
      formFieldNames: ["name"],
      setError,
    });

    expect(setError).toHaveBeenCalledWith(
      "name",
      { message: "Name is required.", type: "server" },
      { shouldFocus: true },
    );
    expect(result).toMatchObject({
      boundFields: ["name"],
      status: 422,
      wasValidation: true,
    });
  });

  it("supports aliases and reports fields absent from the form", () => {
    const setError = vi.fn();
    const result = applyApiErrorsToForm({
      error: apiError(400, {
        errors: {
          DisplayName: "Already used.",
          ServerOnly: "Cannot be changed.",
        },
      }),
      fieldAliases: { name: "displayName" },
      formFieldNames: ["name"],
      setError,
    });

    expect(result.boundFields).toEqual(["name"]);
    expect(result.unboundMessages).toEqual(["Cannot be changed."]);
    expect(setError).toHaveBeenCalledWith(
      "root.server",
      { message: "Cannot be changed.", type: "server" },
    );
  });

  it("renders a conflict globally and binds its field when provided", () => {
    const setError = vi.fn();
    const result = applyApiErrorsToForm({
      error: apiError(409, { field: "ShortName", message: "Short name exists." }),
      formFieldNames: ["shortName"],
      setError,
    });

    expect(result.wasConflict).toBe(true);
    expect(setError).toHaveBeenCalledWith(
      "shortName",
      { message: "Short name exists.", type: "server" },
      { shouldFocus: true },
    );
    expect(setError).toHaveBeenCalledWith(
      "root.server",
      { message: "Short name exists.", type: "server" },
    );
  });
});
