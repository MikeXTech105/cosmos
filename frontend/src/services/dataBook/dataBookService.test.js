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
});
