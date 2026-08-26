import { beforeEach, describe, expect, it, vi } from "vitest";

import axiosInstance from "../../api/axios";
import { dataBookService } from "./dataBookService";

vi.mock("../../api/axios", () => ({
  default: {
    delete: vi.fn(),
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

const success = { data: { data: {} } };

describe("Data Book service contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends the exact rowVersion in the DELETE JSON body", async () => {
    axiosInstance.delete.mockResolvedValue(success);
    const rowVersion = "AAECAwQFBgcICQ==";

    await dataBookService.deleteEntry("9223372036854775807", rowVersion);

    expect(axiosInstance.delete).toHaveBeenCalledWith(
      "/api/v1/data-book/entries/9223372036854775807",
      { data: { rowVersion } },
    );
  });

  it("round-trips the exact rowVersion on update", async () => {
    axiosInstance.put.mockResolvedValue(success);
    const rowVersion = "  exact+/==  ";
    const payload = {
      category: "",
      description: "",
      isPrivate: true,
      name: "Portal",
      rowVersion,
      value: "account",
    };

    await dataBookService.updateEntry(19, payload);

    expect(axiosInstance.put.mock.calls[0][1].rowVersion).toBe(rowVersion);
  });

  it("normalizes canonical and legacy history records at the API boundary", async () => {
    axiosInstance.get.mockResolvedValue({
      data: {
        data: [
          {
            actionType: "Updated",
            changedFields: ["Value"],
            newData: { Value: "canonical-new" },
            oldData: { Value: "canonical-old" },
          },
          {
            actionType: "Updated",
            changedFieldsJson: '[{"FieldName":"Value"}]',
            newDataJson: '{"Value":"legacy-new"}',
            oldDataJson: '{"Value":"legacy-old"}',
          },
        ],
      },
    });

    const result = await dataBookService.getEntryHistory(5);

    expect(axiosInstance.get).toHaveBeenCalledWith(
      "/api/v1/data-book/entries/5/history",
    );
    expect(result.data).toEqual([
      expect.objectContaining({
        changedFields: ["Value"],
        newData: { Value: "canonical-new" },
        oldData: { Value: "canonical-old" },
      }),
      expect.objectContaining({
        changedFields: ["Value"],
        newData: { Value: "legacy-new" },
        oldData: { Value: "legacy-old" },
      }),
    ]);
    expect(result.data[1]).not.toHaveProperty("changedFieldsJson");
  });
});
