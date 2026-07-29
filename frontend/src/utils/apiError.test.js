import { describe, expect, it } from "vitest";

import {
  getApiCorrelationId,
  getApiErrorMessage,
  getApiFieldErrors,
  getApiStatus,
  isConflictError,
  isNotFoundError,
  isValidationError,
} from "./apiError";

describe("API error metadata", () => {
  it("normalizes field paths and joins messages", () => {
    const error = {
      response: {
        data: {
          errors: {
            "Model.FullName": ["Required", "Too short"],
            "payload.Email": "Invalid",
            "components[0].itemId": ["Choose an item"],
          },
        },
        status: 422,
      },
    };

    expect(getApiFieldErrors(error)).toEqual({
      fullName: "Required Too short",
      email: "Invalid",
      "components.0.itemId": "Choose an item",
    });
    expect(getApiStatus(error)).toBe(422);
    expect(isValidationError(error)).toBe(true);
  });

  it("reads nested error maps and rejects global arrays", () => {
    expect(
      getApiFieldErrors({ response: { data: { data: { errors: { Name: ["Required"] } } } } }),
    ).toEqual({ name: "Required" });
    expect(getApiFieldErrors({ response: { data: { errors: ["Global"] } } })).toEqual({});
  });

  it("classifies common statuses and reads correlation IDs", () => {
    expect(isConflictError({ status: 409 })).toBe(true);
    expect(isNotFoundError({ response: { status: 404 } })).toBe(true);
    expect(
      getApiCorrelationId({ apiError: { data: { traceId: "trace-1" } } }),
    ).toBe("trace-1");
  });

  it("surfaces a copyable correlation reference on business conflicts", () => {
    expect(
      getApiErrorMessage({
        response: {
          data: {
            correlationId: "corr-409",
            message: "This record is already in use.",
          },
          status: 409,
        },
      }),
    ).toBe("This record is already in use.\nReference: corr-409");
  });
});
