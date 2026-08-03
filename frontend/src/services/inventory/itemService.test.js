import { beforeEach, describe, expect, it, vi } from "vitest";

import axiosInstance from "../../api/axios";
import { itemService } from "./itemService";

vi.mock("../../api/axios", () => ({
  default: {
    delete: vi.fn(),
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

const successResponse = {
  data: {
    data: {},
  },
};

describe("item service procurement classification contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses the PascalCase multipart key and omits it when unclassified", async () => {
    axiosInstance.post.mockResolvedValue(successResponse);

    await itemService.createItem({
      name: "Raw material",
      procurementClassification: 2,
    });

    let formData = axiosInstance.post.mock.calls[0][1];

    expect(formData.get("ProcurementClassification")).toBe("2");

    await itemService.createItem({
      name: "Legacy item",
      procurementClassification: null,
    });

    formData = axiosInstance.post.mock.calls[1][1];

    expect(formData.has("ProcurementClassification")).toBe(false);
  });

  it("sends an explicit camelCase null when classification is cleared", async () => {
    axiosInstance.put.mockResolvedValue(successResponse);

    await itemService.updateItem(7, {
      imageFile: new Blob(["image"]),
      name: "Updated item",
      procurementClassification: null,
    });

    const commandBody = axiosInstance.put.mock.calls[0][1];

    expect(commandBody).toMatchObject({
      name: "Updated item",
      procurementClassification: null,
    });
    expect(Object.hasOwn(commandBody, "procurementClassification")).toBe(
      true,
    );
    expect(Object.hasOwn(commandBody, "imageFile")).toBe(false);
  });

  it("forwards the supported list filter and keeps list params sanitized", async () => {
    axiosInstance.get.mockResolvedValue(successResponse);

    await itemService.getItems({
      PageNumber: 1,
      PageSize: 500,
      ProcurementClassification: 3,
      SortBy: "",
      SortDirection: "",
    });

    const requestConfig = axiosInstance.get.mock.calls[0][1];

    expect(requestConfig.params).toMatchObject({
      PageNumber: 1,
      PageSize: 200,
      ProcurementClassification: 3,
    });
    expect(Object.hasOwn(requestConfig.params, "SortBy")).toBe(false);
    expect(Object.hasOwn(requestConfig.params, "SortDirection")).toBe(
      false,
    );
  });

  it("omits the material type list filter when it is all", async () => {
    axiosInstance.get.mockResolvedValue(successResponse);

    await itemService.getItems({
      PageNumber: 1,
      PageSize: 20,
      ProcurementClassification: "all",
    });

    const requestConfig = axiosInstance.get.mock.calls[0][1];

    expect(
      Object.hasOwn(
        requestConfig.params,
        "ProcurementClassification",
      ),
    ).toBe(false);
  });
});
