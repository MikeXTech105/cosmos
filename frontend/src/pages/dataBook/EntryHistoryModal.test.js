import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import EntryHistoryModal from "./EntryHistoryModal";

const renderHistory = (history, entry = {}) =>
  renderToStaticMarkup(
    createElement(EntryHistoryModal, {
      entry: { history, name: "werw", ...entry },
      error: "",
      isLoading: false,
      isOpen: true,
      onClose: vi.fn(),
      onCopy: vi.fn(),
      onRetry: vi.fn(),
    }),
  );

describe("EntryHistoryModal", () => {
  it("renders the canonical Updated Value example with user and timestamp", () => {
    const markup = renderHistory([
      {
        actionType: "Updated",
        changedAtUtc: "2026-08-10T05:19:14.307Z",
        changedByName: "System Owner",
        changedFields: ["Value"],
        id: 15,
        newData: { Value: "erwewefdsasasas" },
        oldData: { Value: "erwewef" },
      },
    ]);

    expect(markup).toContain("Updated");
    expect(markup).toContain("System Owner");
    expect(markup).toContain("Value");
    expect(markup).toContain("erwewef");
    expect(markup).toContain("erwewefdsasasas");
    expect(markup).toContain("→");
    expect(markup).toContain("2026");
    expect(markup).not.toContain("[object Object]");
  });

  it("renders legacy FieldName objects as field labels and values", () => {
    const markup = renderHistory([
      {
        actionType: "Updated",
        changedFieldsJson: '[{"FieldName":"Value"}]',
        newDataJson: '{"Value":"new"}',
        oldDataJson: '{"Value":"old"}',
      },
    ]);

    expect(markup).toContain("Value");
    expect(markup).toContain(">old<");
    expect(markup).toContain(">new<");
    expect(markup).not.toContain("[object Object]");
  });

  it("renders Created business values without a fake old-to-new arrow", () => {
    const markup = renderHistory([
      {
        actionType: "Created",
        changedByName: "Cosmos ERP Administrator",
        newData: {
          Category: "sd",
          CreatedBy: 3,
          Description: "rwer",
          IsPrivate: false,
          Name: "werw",
          Value: "erwe",
        },
      },
    ]);

    expect(markup).toContain("Created");
    expect(markup).toContain("Cosmos ERP Administrator");
    expect(markup).toContain("Privacy");
    expect(markup).toContain("Public");
    expect(markup).not.toContain("CreatedBy");
    expect(markup).not.toContain("→");
  });

  it("renders Deleted records as a previous snapshot", () => {
    const markup = renderHistory([
      {
        actionType: "Deleted",
        oldData: { Name: "Portal", Value: "account" },
      },
    ]);

    expect(markup).toContain("Deleted");
    expect(markup).toContain("Portal");
    expect(markup).toContain("account");
    expect(markup).not.toContain("→");
  });

  it("keeps correlation metadata and long values safely wrapped", () => {
    const correlationId = "fbc56953eee64d22ac7e8e29574a1ffd";
    const longValue = "long-value-".repeat(100);
    const markup = renderHistory([
      {
        ...{
          actionType: "Updated",
          changedFields: ["Value"],
          newData: { Value: longValue },
          oldData: { Value: "old" },
        },
        correlationId,
      },
    ]);

    expect(markup).toContain(correlationId);
    expect(markup).toContain(longValue);
    expect(markup).toContain("overflow-wrap:anywhere");
  });

  it("does not crash or render raw objects for malformed and unknown records", () => {
    expect(() =>
      renderHistory([
        {
          actionType: { unexpected: true },
          changedByName: { unexpected: true },
          changedFieldsJson: "[{",
          newDataJson: "{",
          oldDataJson: "{",
        },
      ]),
    ).not.toThrow();

    const markup = renderHistory([
      {
        actionType: "Archived",
        changedFields: [],
      },
    ]);
    expect(markup).toContain("Archived");
    expect(markup).toContain(
      "No business field details were recorded for this change.",
    );
    expect(markup).not.toContain("[object Object]");
  });
});
