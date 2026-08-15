import { beforeEach, describe, expect, it, vi } from "vitest";

import axiosInstance from "../../api/axios";
import { activityLogService } from "./activityLogService";

vi.mock("../../api/axios", () => ({
  default: {
    get: vi.fn(),
  },
}));

const successResponse = { data: { data: { items: [] } } };

describe("activity log service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    axiosInstance.get.mockResolvedValue(successResponse);
  });

  it("keeps an int64 identifier as supplied", async () => {
    const id = "9223372036854775807";

    await activityLogService.getLogById(id);

    expect(axiosInstance.get).toHaveBeenCalledWith(
      `/api/v1/activity-logs/${id}`,
      {},
    );
  });

  it("requests a blob export with lowercase format and no paging", async () => {
    await activityLogService.exportLogs({
      Module: "Inventory",
      PageNumber: 8,
      PageSize: 200,
      SortBy: "TimestampUtc",
      SortDirection: "desc",
    });

    expect(axiosInstance.get).toHaveBeenCalledWith(
      "/api/v1/activity-logs/export",
      {
        params: {
          Module: "Inventory",
          SortBy: "TimestampUtc",
          SortDirection: "desc",
          format: "csv",
        },
        responseType: "blob",
      },
    );
  });
});

